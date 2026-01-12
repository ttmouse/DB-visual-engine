import { useState, useEffect, useCallback } from 'react';
import { twitterService } from '../services/twitterService';

interface ClipboardDetectionResult {
    detectedLink: string | null;
    dismissLink: () => void;
    ignoreLink: (link: string) => void;
}

export const useClipboardDetection = (): ClipboardDetectionResult => {
    const [detectedLink, setDetectedLink] = useState<string | null>(null);
    const [ignoredLinks, setIgnoredLinks] = useState<Set<string>>(new Set());

    // Dismiss current link and ignore it permanently for this session
    const dismissLink = useCallback(() => {
        if (detectedLink) {
            setIgnoredLinks(prev => new Set(prev).add(detectedLink));
        }
        setDetectedLink(null);
    }, [detectedLink]);

    // Permalink ignore (for this session)
    const ignoreLink = useCallback((link: string) => {
        setIgnoredLinks(prev => new Set(prev).add(link));
        setDetectedLink(null);
    }, []);

    const checkClipboard = useCallback(async () => {
        try {
            // Check if document is focused
            if (!document.hasFocus()) return;

            // Read clipboard
            const text = await navigator.clipboard.readText();
            if (!text) return;

            const trimmed = text.trim();

            // Check if it's a Twitter URL
            const tweetId = twitterService.parseTwitterUrl(trimmed);
            if (tweetId) {
                // Check if ignored
                if (ignoredLinks.has(trimmed)) return;

                // If distinct from current detected link, update
                setDetectedLink(prev => {
                    if (prev === trimmed) return prev;
                    return trimmed;
                });
            }
        } catch (err) {
            // Permission denied or other error
        }
    }, [ignoredLinks]);

    useEffect(() => {
        // Check on window focus
        window.addEventListener('focus', checkClipboard);
        // Check on visibility change (e.g. switching tabs)
        document.addEventListener('visibilitychange', checkClipboard);

        return () => {
            window.removeEventListener('focus', checkClipboard);
            document.removeEventListener('visibilitychange', checkClipboard);
        };
    }, [checkClipboard]);

    // Auto-dismiss after 5 seconds and add to ignored list
    useEffect(() => {
        if (detectedLink) {
            const timer = setTimeout(() => {
                setIgnoredLinks(prev => new Set(prev).add(detectedLink));
                setDetectedLink(null);
            }, 5000); // 5 seconds

            return () => clearTimeout(timer);
        }
    }, [detectedLink]);

    return { detectedLink, dismissLink, ignoreLink };
};
