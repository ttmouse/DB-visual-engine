
export interface TweetData {
    text: string;
    media_extended: {
        type: 'image' | 'video';
        url: string;
        thumbnail_url?: string;
    }[];
}

export const twitterService = {
    // Extract Tweet ID from URL
    parseTwitterUrl(url: string): string | null {
        // Matches x.com or twitter.com status URLs
        const regex = /(?:twitter|x)\.com\/\w+\/status\/(\d+)/;
        const match = url.match(regex);
        return match ? match[1] : null;
    },

    // Get the start index of the Prompt content
    getPromptStartIndex(rawText: string): number {
        if (!rawText) return 0;
        // Case insensitive match for "Prompt" followed by optional emojis/punctuation
        const headerMatch = rawText.match(/(?:Prompt|prompt|PROMPT|提示词(?:见)?)(?:\s*[:👇-]\s*|\s*\n)/u);

        if (headerMatch) {
            // Return the index right after the match
            return (headerMatch.index || 0) + headerMatch[0].length;
        }
        return 0;
    },

    // Clean text utility
    cleanTweetText(rawText: string): string {
        const startIndex = this.getPromptStartIndex(rawText);
        return rawText.substring(startIndex).trim();
    },

    // Fetch tweet data using vxtwitter API (via local proxy)
    async fetchTweetData(tweetId: string): Promise<TweetData> {
        try {
            // Use the proxy configured in vite.config.ts
            // /api/twitter -> https://api.vxtwitter.com
            const response = await fetch(`/api/twitter/Twitter/status/${tweetId}`);

            if (!response.ok) {
                throw new Error(`Twitter API error: ${response.status} ${response.statusText}`);
            }

            const text = await response.text();

            // Allow debugging

            if (text.trim().startsWith('<')) {
                throw new Error('Received HTML instead of JSON. This usually means the proxy is not running. Please restart your dev server.');
            }

            try {
                const data = JSON.parse(text);
                // Return RAW text so UI can handle display/highlighting
                // The cleaning will happen at import time or be handled by the UI helper

                return {
                    text: data.text || '',
                    media_extended: data.media_extended || []
                };
            } catch (jsonError) {
                throw new Error(`Failed to parse Twitter API JSON: ${jsonError}`);
            }

        } catch (error) {
            console.error('Failed to fetch tweet data:', error);
            throw error;
        }
    }
};
