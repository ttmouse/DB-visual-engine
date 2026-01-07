/**
 * [INPUT]: 依赖 Icons, App state (generatedImages, history)
 * [OUTPUT]: 导出 GalleryModal 组件
 * [POS]: UI Component, 全屏相册浏览器
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Icons } from './Icons';
import { HistoryItem } from '../types';
import { useI18n } from '../hooks/useI18n';

interface GalleryModalProps {
    isOpen: boolean;
    onClose: () => void;
    images: string[]; // Thumbnails for grid
    history: HistoryItem[]; // Full history for fetching originals
    prompts?: string[];
    onDownload?: (index: number) => void;
    onEdit?: (index: number) => void;
}

interface ImageDimensions {
    width: number;
    height: number;
    aspectRatio: number;
}

interface JustifiedRow {
    images: { index: number; width: number; height: number }[];
    height: number;
}

// ============================================================================
//  GalleryModal - 全屏相册浏览器 (Eagle-style Selection)
// ============================================================================
export const GalleryModal: React.FC<GalleryModalProps> = ({
    isOpen,
    onClose,
    images,
    history,
    prompts = [],
    onDownload,
    onEdit
}) => {
    const { t } = useI18n();
    const [focusedIndex, setFocusedIndex] = useState<number>(0); // Grid 焦点
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null); // 大图模式
    const [fullImage, setFullImage] = useState<string | null>(null);
    const [imageDimensions, setImageDimensions] = useState<Map<number, ImageDimensions>>(new Map());
    const [containerWidth, setContainerWidth] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const imagesVersionRef = useRef(0);

    // Refs for stable keyboard handlers (避免频繁重新注册 listener)
    const focusedIndexRef = useRef(focusedIndex);
    const justifiedRowsRef = useRef<JustifiedRow[]>([]);
    const navigationMapRef = useRef<{ rowIndex: number; colIndex: number; centerX: number }[]>([]);

    const TARGET_ROW_HEIGHT = 200;
    const GAP = 8;

    // Helper to format image src
    const formatSrc = useCallback((img: string) => {
        if (img.startsWith('http') || img.startsWith('data:')) return img;
        return `data:image/jpeg;base64,${img}`;
    }, []);

    // Reset focus when gallery opens
    useEffect(() => {
        if (isOpen) {
            setFocusedIndex(0);
            setSelectedIndex(null);
        }
    }, [isOpen]);

    // Load image dimensions with race condition protection
    useEffect(() => {
        if (!isOpen || images.length === 0) return;

        imagesVersionRef.current += 1;
        const currentVersion = imagesVersionRef.current;

        const loadDimensions = async () => {
            const newDimensions = new Map<number, ImageDimensions>();

            await Promise.all(images.map((img, idx) => {
                return new Promise<void>((resolve) => {
                    const imgEl = new Image();
                    imgEl.onload = () => {
                        newDimensions.set(idx, {
                            width: imgEl.naturalWidth,
                            height: imgEl.naturalHeight,
                            aspectRatio: imgEl.naturalWidth / imgEl.naturalHeight
                        });
                        resolve();
                    };
                    imgEl.onerror = () => {
                        newDimensions.set(idx, { width: 512, height: 512, aspectRatio: 1 });
                        resolve();
                    };
                    imgEl.src = formatSrc(img);
                });
            }));

            if (currentVersion === imagesVersionRef.current) {
                setImageDimensions(newDimensions);
            }
        };

        loadDimensions();
    }, [isOpen, images, formatSrc]);

    // Track container width
    const isGridMode = selectedIndex === null;
    useEffect(() => {
        if (!containerRef.current || !isOpen || !isGridMode) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setContainerWidth(entry.contentRect.width);
            }
        });

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [isOpen, isGridMode]);

    // 返回 Grid 模式时，滚动到当前焦点图片确保可见
    useEffect(() => {
        if (isGridMode) {
            requestAnimationFrame(() => {
                const element = document.getElementById(`gallery-item-${focusedIndex}`);
                element?.scrollIntoView({ behavior: 'auto', block: 'nearest' });
            });
        }
    }, [isGridMode, focusedIndex]);

    // Calculate justified layout rows
    const justifiedRows = useMemo<JustifiedRow[]>(() => {
        if (containerWidth === 0 || imageDimensions.size === 0) return [];

        const rows: JustifiedRow[] = [];
        let currentRow: { index: number; aspectRatio: number }[] = [];
        let currentRowAspectSum = 0;

        const availableWidth = containerWidth;

        for (let i = 0; i < images.length; i++) {
            const dims = imageDimensions.get(i);
            const aspectRatio = dims?.aspectRatio || 1;

            currentRow.push({ index: i, aspectRatio });
            currentRowAspectSum += aspectRatio;

            const gapsWidth = (currentRow.length - 1) * GAP;
            const rowHeight = (availableWidth - gapsWidth) / currentRowAspectSum;

            if (rowHeight <= TARGET_ROW_HEIGHT) {
                rows.push({
                    height: rowHeight,
                    images: currentRow.map(item => ({
                        index: item.index,
                        width: rowHeight * item.aspectRatio,
                        height: rowHeight
                    }))
                });
                currentRow = [];
                currentRowAspectSum = 0;
            }
        }

        if (currentRow.length > 0) {
            const finalHeight = Math.min(TARGET_ROW_HEIGHT, (availableWidth - (currentRow.length - 1) * GAP) / currentRowAspectSum);
            rows.push({
                height: finalHeight,
                images: currentRow.map(item => ({
                    index: item.index,
                    width: finalHeight * item.aspectRatio,
                    height: finalHeight
                }))
            });
        }

        return rows;
    }, [containerWidth, imageDimensions, images.length]);

    // Build navigation map: for each image, find its row and X position
    const navigationMap = useMemo(() => {
        const map: { rowIndex: number; colIndex: number; centerX: number }[] = [];
        justifiedRows.forEach((row, rowIndex) => {
            let xOffset = 0;
            row.images.forEach((item, colIndex) => {
                const centerX = xOffset + item.width / 2;
                map[item.index] = { rowIndex, colIndex, centerX };
                xOffset += item.width + GAP;
            });
        });
        return map;
    }, [justifiedRows, GAP]);

    // Keep refs in sync with state
    useEffect(() => { focusedIndexRef.current = focusedIndex; }, [focusedIndex]);
    useEffect(() => { justifiedRowsRef.current = justifiedRows; }, [justifiedRows]);
    useEffect(() => { navigationMapRef.current = navigationMap; }, [navigationMap]);

    // Set full image when selectedIndex changes
    useEffect(() => {
        if (selectedIndex === null) {
            setFullImage(null);
            return;
        }

        const historyItem = history[selectedIndex];
        if (historyItem?.generatedImage) {
            setFullImage(historyItem.generatedImage);
        }
    }, [selectedIndex, history]);

    // Keyboard Navigation for Full View (大图模式)
    useEffect(() => {
        if (selectedIndex === null) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            const rows = justifiedRowsRef.current;
            const navMap = navigationMapRef.current;
            const currentPos = navMap[selectedIndex];

            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                e.stopImmediatePropagation();
                const newIndex = Math.max(0, selectedIndex - 1);
                setSelectedIndex(newIndex);
                setFocusedIndex(newIndex);
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                e.stopImmediatePropagation();
                const newIndex = Math.min(images.length - 1, selectedIndex + 1);
                setSelectedIndex(newIndex);
                setFocusedIndex(newIndex);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                e.stopImmediatePropagation();
                if (currentPos && currentPos.rowIndex > 0) {
                    const prevRow = rows[currentPos.rowIndex - 1];
                    let closestIndex = prevRow.images[0].index;
                    let minDistance = Infinity;
                    let xOffset = 0;
                    for (const img of prevRow.images) {
                        const imgCenterX = xOffset + img.width / 2;
                        const distance = Math.abs(imgCenterX - currentPos.centerX);
                        if (distance < minDistance) {
                            minDistance = distance;
                            closestIndex = img.index;
                        }
                        xOffset += img.width + 8;
                    }
                    setSelectedIndex(closestIndex);
                    setFocusedIndex(closestIndex);
                }
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                e.stopImmediatePropagation();
                if (currentPos && currentPos.rowIndex < rows.length - 1) {
                    const nextRow = rows[currentPos.rowIndex + 1];
                    let closestIndex = nextRow.images[0].index;
                    let minDistance = Infinity;
                    let xOffset = 0;
                    for (const img of nextRow.images) {
                        const imgCenterX = xOffset + img.width / 2;
                        const distance = Math.abs(imgCenterX - currentPos.centerX);
                        if (distance < minDistance) {
                            minDistance = distance;
                            closestIndex = img.index;
                        }
                        xOffset += img.width + 8;
                    }
                    setSelectedIndex(closestIndex);
                    setFocusedIndex(closestIndex);
                }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                e.stopImmediatePropagation();
                if (onEdit) {
                    onEdit(selectedIndex);
                }
            } else if (e.key === 'Escape' || e.key === ' ') {
                e.preventDefault();
                e.stopImmediatePropagation();
                setSelectedIndex(null);
            }
        };

        window.addEventListener('keydown', handleKeyDown, { capture: true });
        return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
    }, [selectedIndex, images.length]);

    // Keyboard Navigation for Grid View (Grid 模式 - Eagle style)
    // 使用 refs 读取最新值，避免频繁重新注册 listener
    useEffect(() => {
        if (!isOpen || selectedIndex !== null) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            const currentFocused = focusedIndexRef.current;
            const rows = justifiedRowsRef.current;
            const navMap = navigationMapRef.current;

            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopImmediatePropagation();
                onClose();
                return;
            }

            if (e.key === ' ') {
                e.preventDefault();
                e.stopImmediatePropagation();
                setSelectedIndex(currentFocused);
                return;
            }

            if (e.key === 'Enter') {
                e.preventDefault();
                e.stopImmediatePropagation();
                if (onEdit) {
                    onEdit(currentFocused);
                }
                return;
            }

            if (rows.length === 0) return;

            const currentPos = navMap[currentFocused];
            if (!currentPos) return;

            let newFocusedIndex = currentFocused;

            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                e.stopImmediatePropagation();
                newFocusedIndex = Math.max(0, currentFocused - 1);
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                e.stopImmediatePropagation();
                // 获取总图片数
                const totalImages = rows.reduce((sum, row) => sum + row.images.length, 0);
                newFocusedIndex = Math.min(totalImages - 1, currentFocused + 1);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                e.stopImmediatePropagation();
                const { rowIndex, centerX } = currentPos;
                if (rowIndex > 0) {
                    const prevRow = rows[rowIndex - 1];
                    // 找到上一行中 centerX 最接近的图片
                    let closestIndex = prevRow.images[0].index;
                    let minDistance = Infinity;
                    let xOffset = 0;
                    for (const img of prevRow.images) {
                        const imgCenterX = xOffset + img.width / 2;
                        const distance = Math.abs(imgCenterX - centerX);
                        if (distance < minDistance) {
                            minDistance = distance;
                            closestIndex = img.index;
                        }
                        xOffset += img.width + 8; // GAP
                    }
                    newFocusedIndex = closestIndex;
                }
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                e.stopImmediatePropagation();
                const { rowIndex, centerX } = currentPos;
                if (rowIndex < rows.length - 1) {
                    const nextRow = rows[rowIndex + 1];
                    // 找到下一行中 centerX 最接近的图片
                    let closestIndex = nextRow.images[0].index;
                    let minDistance = Infinity;
                    let xOffset = 0;
                    for (const img of nextRow.images) {
                        const imgCenterX = xOffset + img.width / 2;
                        const distance = Math.abs(imgCenterX - centerX);
                        if (distance < minDistance) {
                            minDistance = distance;
                            closestIndex = img.index;
                        }
                        xOffset += img.width + 8; // GAP
                    }
                    newFocusedIndex = closestIndex;
                }
            }

            if (newFocusedIndex !== currentFocused) {
                setFocusedIndex(newFocusedIndex);
                // 滚动到焦点元素，确保其可见
                requestAnimationFrame(() => {
                    const element = document.getElementById(`gallery-item-${newFocusedIndex}`);
                    element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                });
            }
        };

        // 使用 capture: true 在捕获阶段拦截事件，确保优先于 App.tsx 处理
        window.addEventListener('keydown', handleKeyDown, { capture: true });
        return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
    }, [isOpen, selectedIndex, onClose]); // 依赖大幅减少，listener 更稳定

    if (!isOpen) return null;

    // 单图全屏模式
    if (selectedIndex !== null) {
        const handlePrev = (e?: React.MouseEvent) => {
            e?.stopPropagation();
            const newIndex = Math.max(0, selectedIndex - 1);
            setSelectedIndex(newIndex);
            setFocusedIndex(newIndex);
        };
        const handleNext = (e?: React.MouseEvent) => {
            e?.stopPropagation();
            const newIndex = Math.min(images.length - 1, selectedIndex + 1);
            setSelectedIndex(newIndex);
            setFocusedIndex(newIndex);
        };

        const displayImage = fullImage || images[selectedIndex];

        return (
            <div
                className="fixed inset-0 z-[300] bg-black/95 animate-in fade-in duration-300 flex items-center justify-center overflow-hidden"
                onClick={() => setSelectedIndex(null)}
            >
                <div
                    className="w-full h-full flex bg-stone-900/50"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Left: Image View */}
                    <div className="flex-1 relative bg-black/50 flex items-center justify-center p-4 overflow-hidden group/nav">
                        <button
                            onClick={handlePrev}
                            disabled={selectedIndex === 0}
                            className="absolute left-6 top-1/2 -translate-y-1/2 p-4 bg-stone-900/50 hover:bg-stone-900/80 rounded-full text-stone-400 hover:text-white disabled:opacity-0 transition-all backdrop-blur-sm opacity-0 group-hover/nav:opacity-100 z-20"
                        >
                            <Icons.ArrowLeft size={32} />
                        </button>

                        <img
                            src={formatSrc(displayImage)}
                            alt={`Generated ${selectedIndex + 1}`}
                            className="w-full h-full object-contain pointer-events-none select-none"
                        />

                        <button
                            onClick={handleNext}
                            disabled={selectedIndex === images.length - 1}
                            className="absolute right-6 top-1/2 -translate-y-1/2 p-4 bg-stone-900/50 hover:bg-stone-900/80 rounded-full text-stone-400 hover:text-white disabled:opacity-0 transition-all backdrop-blur-sm opacity-0 group-hover/nav:opacity-100 z-20"
                        >
                            <Icons.ArrowRight size={32} />
                        </button>

                        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start bg-gradient-to-b from-black/60 to-transparent opacity-0 group-hover/nav:opacity-100 transition-opacity z-10">
                            <div className="px-4 py-2 bg-black/20 backdrop-blur-md rounded-full text-white/50 text-xs font-mono">
                                {selectedIndex + 1} / {images.length}
                            </div>
                            <div className="flex gap-2">
                                {onDownload && (
                                    <button
                                        onClick={() => onDownload(selectedIndex)}
                                        className="p-3 bg-stone-900/60 hover:bg-stone-800/80 rounded-xl text-stone-300 hover:text-white transition-all backdrop-blur-md"
                                        title="下载"
                                    >
                                        <Icons.Download size={20} />
                                    </button>
                                )}
                                <button
                                    onClick={() => setSelectedIndex(null)}
                                    className="p-3 bg-stone-900/60 hover:bg-stone-800/80 rounded-xl text-stone-300 hover:text-white transition-all backdrop-blur-md"
                                    title="关闭大图"
                                >
                                    <Icons.X size={20} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right: Sidebar */}
                    <div className="w-96 border-l border-stone-800 bg-stone-950 flex flex-col shadow-xl z-30">
                        <div className="p-6 border-b border-stone-800/50 flex items-center justify-between">
                            <h3 className="text-stone-200 font-bold">Details</h3>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                            {prompts[selectedIndex] && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Positive Prompt</span>
                                        <button
                                            onClick={() => navigator.clipboard.writeText(prompts[selectedIndex])}
                                            className="p-1.5 text-stone-500 hover:text-stone-300 hover:bg-stone-800 rounded-md transition-all"
                                            title="Copy"
                                        >
                                            <Icons.Copy size={14} />
                                        </button>
                                    </div>
                                    <div className="relative group">
                                        <p className="text-stone-300 text-sm leading-relaxed font-sans whitespace-pre-wrap select-text selection:bg-orange-900/30 selection:text-orange-200">
                                            {prompts[selectedIndex]}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-stone-800 bg-stone-900/50">
                            {onEdit && (
                                <button
                                    onClick={() => onEdit(selectedIndex)}
                                    className="w-full py-4 bg-stone-100 hover:bg-white text-black rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)] active:scale-[0.98]"
                                >
                                    <Icons.Edit2 size={18} />
                                    <span>编辑此图</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 相册 Grid 模式 - Justified Layout with Eagle-style Selection
    return (
        <div
            className="fixed inset-0 z-[300] bg-zinc-950 animate-in fade-in duration-300 flex flex-col"
            onClick={onClose}
        >
            {/* Header - 紧凑单行 */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-stone-900 bg-zinc-950" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Icons.LayoutGrid size={18} className="text-stone-400" />
                        <span className="text-sm font-medium text-stone-200">{t('gallery.title')}</span>
                        <span className="text-xs text-stone-500">({images.length})</span>
                    </div>
                    <span className="text-[10px] text-stone-600 font-mono">{t('gallery.keyboardHint')}</span>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 rounded-full hover:bg-stone-900 text-stone-500 hover:text-stone-200 transition-all"
                >
                    <Icons.X size={20} />
                </button>
            </div>

            {/* Grid - Justified Layout */}
            <div
                ref={containerRef}
                className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar bg-zinc-950"
                onClick={(e) => e.stopPropagation()}
            >
                {images.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-stone-600">
                        <Icons.Image size={48} className="mb-4 opacity-20" />
                        <p className="text-sm font-light">暂无生成记录</p>
                    </div>
                ) : imageDimensions.size === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-stone-600">
                        <Icons.RefreshCw size={24} className="mb-4 animate-spin opacity-50" />
                        <p className="text-sm font-light">加载中...</p>
                    </div>
                ) : (
                    <div className="flex flex-col" style={{ gap: `${GAP}px` }}>
                        {justifiedRows.map((row, rowIdx) => (
                            <div
                                key={rowIdx}
                                className="flex"
                                style={{ gap: `${GAP}px`, height: `${row.height}px` }}
                            >
                                {row.images.map((item) => {
                                    const isFocused = item.index === focusedIndex;
                                    return (
                                        <div
                                            id={`gallery-item-${item.index}`}
                                            key={item.index}
                                            onClick={() => {
                                                setFocusedIndex(item.index);
                                                setSelectedIndex(item.index);
                                            }}
                                            className={`relative group cursor-pointer overflow-hidden rounded-sm bg-stone-900 flex-shrink-0 transition-all duration-150 ${isFocused
                                                ? 'ring-[3px] ring-amber-400 ring-offset-1 ring-offset-black shadow-[0_0_12px_rgba(251,191,36,0.6)]'
                                                : ''
                                                }`}
                                            style={{ width: `${item.width}px`, height: `${item.height}px` }}
                                        >
                                            <img
                                                src={formatSrc(images[item.index])}
                                                alt={`Generated ${item.index + 1}`}
                                                className="w-full h-full object-cover transition-transform duration-300 will-change-transform group-hover:scale-105"
                                                loading="lazy"
                                            />

                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 pointer-events-none" />

                                            {onEdit && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onEdit(item.index); }}
                                                    className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/80 text-white/70 hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 backdrop-blur-md shadow-lg"
                                                    title="编辑"
                                                >
                                                    <Icons.Edit2 size={14} strokeWidth={2} />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                )}
            </div>

        </div>
    );
};
