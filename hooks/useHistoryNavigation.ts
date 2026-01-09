/**
 * [INPUT]: None
 * [OUTPUT]: 导出 useHistoryNavigation hook
 * [POS]: Hooks 模块
 * [PROTOCOL]: 变更时更新此头部
 */

import { useEffect } from 'react';
import { HistoryItem } from '../types';
import { getOriginalFromHistory } from '../utils/imageHelpers';

interface UseHistoryNavigationProps {
    generatedImagesLength: number;
    selectedHistoryIndex: number;
    history: HistoryItem[];
    loadHistoryItem: (index: number) => void;
    fullscreenImg: string | null;
    setFullscreenImg: (img: string | null) => void;
    isFullscreenComparison: boolean;
    setIsFullscreenComparison: (is: boolean) => void;
}

export const useHistoryNavigation = ({
    generatedImagesLength,
    selectedHistoryIndex,
    history,
    loadHistoryItem,
    fullscreenImg,
    setFullscreenImg,
    isFullscreenComparison,
    setIsFullscreenComparison
}: UseHistoryNavigationProps) => {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // ESC to close fullscreen
            if (e.key === 'Escape' && fullscreenImg) {
                setFullscreenImg(null);
                setIsFullscreenComparison(false);
                return;
            }

            if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

            if (generatedImagesLength === 0) return;

            if (e.key === 'ArrowLeft') {
                const newIndex = Math.max(0, selectedHistoryIndex - 1);
                if (newIndex !== selectedHistoryIndex) {
                    loadHistoryItem(newIndex);
                    // Update fullscreen image if in fullscreen mode
                    if (fullscreenImg && history[newIndex]) {
                        if (isFullscreenComparison) {
                            // For comparison mode, keep the current mode but update the index
                            // The image will be updated via selectedHistoryIndex
                        } else {
                            setFullscreenImg(getOriginalFromHistory(history, newIndex));
                        }
                    }
                }
            } else if (e.key === 'ArrowRight') {
                const newIndex = Math.min(generatedImagesLength - 1, selectedHistoryIndex + 1);
                if (newIndex !== selectedHistoryIndex) {
                    loadHistoryItem(newIndex);
                    // Update fullscreen image if in fullscreen mode
                    if (fullscreenImg && history[newIndex]) {
                        if (isFullscreenComparison) {
                            // For comparison mode, keep the current mode but update the index
                            // The image will be updated via selectedHistoryIndex
                        } else {
                            setFullscreenImg(getOriginalFromHistory(history, newIndex));
                        }
                    }
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [
        generatedImagesLength,
        selectedHistoryIndex,
        fullscreenImg,
        isFullscreenComparison,
        history,
        loadHistoryItem,
        setFullscreenImg,
        setIsFullscreenComparison
    ]);
};
