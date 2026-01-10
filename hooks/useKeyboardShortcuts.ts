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
    toggleComparison: () => void;
    setIsPromptLabOpen: Dispatch<SetStateAction<boolean>>;
    handleDelete: () => void;

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
    toggleComparison,
    setIsPromptLabOpen,
    handleDelete,
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
            if ((document.activeElement as HTMLElement).isContentEditable) return;
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
                toggleComparison();
            } else if (key === 'a') {
                e.preventDefault();
                document.getElementById('reference-image-input')?.click();
            } else if (key === 'p') {
                e.preventDefault();
                setIsPromptLabOpen(prev => !prev);
            } else if (e.key === 'Delete' || e.key === 'Backspace') {
                // Delete
                e.preventDefault();
                handleDelete();
            }
        };

        window.addEventListener('keydown', handleGlobalShortcuts);
        return () => window.removeEventListener('keydown', handleGlobalShortcuts);
    }, [
        areModalsOpen,
        setIsGalleryOpen,
        setIsHelpOpen,
        handleReset,
        toggleComparison,
        setIsPromptLabOpen,
        handleDelete
    ]);
};
