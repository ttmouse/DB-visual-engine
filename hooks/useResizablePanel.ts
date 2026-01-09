/**
 * [INPUT]: None
 * [OUTPUT]: 导出 useResizablePanel hook
 * [POS]: Hooks 模块
 * [PROTOCOL]: 变更时更新此头部
 */

import { useState, useEffect, useRef, RefObject } from 'react';

interface UseResizablePanelOptions {
    storageKey: string;
    defaultValue: number;
    min: number;
    max: number;
    /** If true, width is percentage of container. If false, width is in pixels */
    isPercentage?: boolean;
    /** Direction of resize: 'left' = resize from left edge, 'right' = resize from right edge */
    direction?: 'left' | 'right';
}

interface UseResizablePanelReturn {
    width: number;
    setWidth: (w: number) => void;
    isDragging: boolean;
    setIsDragging: (d: boolean) => void;
}

export const useResizablePanel = (
    containerRef: RefObject<HTMLElement>,
    options: UseResizablePanelOptions
): UseResizablePanelReturn => {
    const {
        storageKey,
        defaultValue,
        min,
        max,
        isPercentage = true,
        direction = 'left'
    } = options;

    const [width, setWidth] = useState(() => {
        const saved = localStorage.getItem(storageKey);
        return saved ? parseFloat(saved) : defaultValue;
    });
    const [isDragging, setIsDragging] = useState(false);

    // Save to localStorage when width changes
    useEffect(() => {
        localStorage.setItem(storageKey, width.toString());
    }, [width, storageKey]);

    // Handle drag
    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();

            let newWidth: number;
            if (direction === 'left') {
                if (isPercentage) {
                    newWidth = ((e.clientX - rect.left) / rect.width) * 100;
                } else {
                    newWidth = e.clientX - rect.left;
                }
            } else {
                // right direction
                newWidth = rect.right - e.clientX;
            }

            const clampedWidth = Math.min(max, Math.max(min, newWidth));
            setWidth(clampedWidth);
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, containerRef, min, max, isPercentage, direction]);

    return { width, setWidth, isDragging, setIsDragging };
};
