/**
 * [INPUT]: 质检结果文本
 * [OUTPUT]: 解析出的优化建议数组
 * [POS]: Utils 模块
 * [PROTOCOL]: 变更时更新此头部
 */

/**
 * Parse optimization suggestions from QA/analysis result content
 * Looks for markers like "调优建议", "Optimization Suggestions" etc.
 * Extracts numbered items (1. 2. 3.)
 */
export const parseSuggestions = (content: string): string[] => {
    // Find the optimization section using multiple possible markers
    const markers = ["调优建议", "调优指令", "Optimization Suggestions", "Optimization"];
    let sectionText = "";

    for (const marker of markers) {
        const idx = content.lastIndexOf(marker);
        if (idx !== -1) {
            sectionText = content.slice(idx);
            break;
        }
    }

    if (!sectionText) return [];

    // Extract lines that start with numbers like "1." "2." "3."
    const suggestions: string[] = [];
    const lines = sectionText.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();
        // Match lines starting with 1. 2. 3. etc., possibly with markers like * -
        const match = trimmed.match(/^[\*\-]?\s*([1-3])[.\)、]\s*(.+)/);
        if (match && match[2]) {
            // Clean up the suggestion text: remove leading ** and trailing **
            let suggestion = match[2]
                .replace(/^\*\*/, '')
                .replace(/\*\*$/, '')
                .replace(/^\*\*(.+?)\*\*:?\s*/, '$1: ')
                .trim();
            if (suggestion.length > 5) {
                suggestions.push(suggestion);
            }
        }
    }

    return suggestions.slice(0, 3);
};
