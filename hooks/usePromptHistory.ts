/**
 * [INPUT]: None
 * [OUTPUT]: 导出 usePromptHistory hook
 * [POS]: Hooks 模块
 * [PROTOCOL]: 变更时更新此头部
 */

import { useState, useCallback } from 'react';

/**
 * Manages the history of prompts submitted by the user.
 * This is currently an ephemeral history (resets on page reload).
 */
export const usePromptHistory = () => {
    const [promptHistory, setPromptHistory] = useState<string[]>([]);

    /**
     * Push a new prompt to history.
     * - Adds timestamp and source tag
     * - Deduplicates existing entries
     * - Limits to 20 entries
     * - Adds to the top of the list
     */
    const pushPromptHistory = useCallback((newPrompt: string, source: string) => {
        if (!newPrompt.trim()) return;

        const timestamp = new Date().toLocaleTimeString('zh-CN');
        const entry = `[${source}] ${timestamp}\n${newPrompt}`;

        setPromptHistory(prev => {
            // Filter out exact duplicate to move it to top
            const filtered = prev.filter(h => h !== entry);
            const newHistory = [entry, ...filtered].slice(0, 20);
            return newHistory;
        });
    }, []);

    const clearPromptHistory = useCallback(() => {
        setPromptHistory([]);
    }, []);

    return {
        promptHistory,
        pushPromptHistory,
        clearPromptHistory
    };
};
