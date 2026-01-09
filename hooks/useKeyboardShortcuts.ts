/**
 * [INPUT]: None
 * [OUTPUT]: 导出 useKeyboardShortcuts hook
 * [POS]: Hooks 模块
 * [PROTOCOL]: 变更时更新此头部
 */

import { useEffect, Dispatch, SetStateAction } from 'react';

interface KeyboardShortcutsProps {
    // Global actions
    setIsGalleryOpen: (open: boolean) => void;
    setIsHelpOpen: (open: boolean) => void;
    handleReset: () => void;
    setIsComparisonMode: Dispatch<SetStateAction<boolean>>;
    setIsPromptLabOpen: Dispatch<SetStateAction<boolean>>;

    // Progress view
    showProgressView: boolean;
    setShowProgressView: (show: boolean) => void;

    // Conditions to block shortcuts
    areModalsOpen: boolean;
}

export const useKeyboardShortcuts = ({
    setIsGalleryOpen,
    setIsHelpOpen,
    handleReset,
    setIsComparisonMode,
    setIsPromptLabOpen,
    showProgressView,
    setShowProgressView,
    areModalsOpen
}: KeyboardShortcutsProps) => {

    // Progress View ESC
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (showProgressView && e.key === 'Escape') {
                setShowProgressView(false);
            }
        };
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [showProgressView, setShowProgressView]);

    // Global Shortcuts
    useEffect(() => {
        const handleGlobalShortcuts = (e: KeyboardEvent) => {
            // Skip if inputs focused
            if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
            // Skip if modals open
            if (areModalsOpen) return;

            const key = e.key.toLowerCase();

            if (key === 'g') {
                e.preventDefault();
                setIsGalleryOpen(true);
            } else if (key === 'h') {
                e.preventDefault();
                setIsHelpOpen(true);
            } else if (key === 'n') {
                e.preventDefault();
                handleReset();
            } else if (key === 'c') {
                e.preventDefault();
                setIsComparisonMode(prev => !prev);
            } else if (key === 'a') {
                e.preventDefault();
                document.getElementById('reference-image-input')?.click();
            } else if (key === 'p') {
                e.preventDefault();
                setIsPromptLabOpen(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleGlobalShortcuts);
        return () => window.removeEventListener('keydown', handleGlobalShortcuts);
    }, [
        areModalsOpen,
        setIsGalleryOpen,
        setIsHelpOpen,
        handleReset,
        setIsComparisonMode,
        setIsPromptLabOpen
    ]);
};
