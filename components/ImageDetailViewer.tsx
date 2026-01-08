/**
 * [INPUT]: 图片数据、当前索引、模式配置
 * [OUTPUT]: 统一的全屏详情视图组件
 * [POS]: 替换 App.tsx 和 GalleryModal.tsx 中的详情视图
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import React, { useEffect, useCallback } from 'react';
import { Icons } from './Icons';

export type DetailViewMode = 'single' | 'comparison' | 'gallery';

export interface ImageMetadata {
    prompt?: string;
    timestamp?: number;
    originalImage?: string;
}

export interface ImageDetailViewerProps {
    /** 是否打开 */
    isOpen: boolean;
    /** 关闭回调 */
    onClose: () => void;
    /** 当前显示模式 */
    mode: DetailViewMode;

    // 图片数据
    /** 当前主图片 URL */
    currentImage: string;
    /** 对比图片 URL（用于 comparison 模式） */
    comparisonImage?: string;
    /** 图片列表（用于导航） */
    images?: string[];
    /** 当前索引 */
    currentIndex?: number;
    /** 导航回调 */
    onNavigate?: (index: number) => void;

    // 操作按钮
    /** 显示操作按钮 */
    showActions?: boolean;
    /** 下载回调 */
    onDownload?: () => void;
    /** 删除回调 */
    onDelete?: () => void;
    /** 添加到对比回调 */
    onAddToComparison?: () => void;
    /** 编辑回调 */
    onEdit?: () => void;

    // 侧边栏
    /** 显示侧边栏 */
    showSidebar?: boolean;
    /** 元信息 */
    metadata?: ImageMetadata;
}

export const ImageDetailViewer: React.FC<ImageDetailViewerProps> = ({
    isOpen,
    onClose,
    mode,
    currentImage,
    comparisonImage,
    images = [],
    currentIndex = 0,
    onNavigate,
    showActions = false,
    onDownload,
    onDelete,
    onAddToComparison,
    onEdit,
    showSidebar = false,
    metadata
}) => {
    // 键盘导航
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (!isOpen) return;

        if (e.key === 'Escape') {
            onClose();
            return;
        }

        if (mode !== 'comparison' && onNavigate && images.length > 1) {
            if (e.key === 'ArrowLeft' && currentIndex > 0) {
                onNavigate(currentIndex - 1);
            } else if (e.key === 'ArrowRight' && currentIndex < images.length - 1) {
                onNavigate(currentIndex + 1);
            }
        }
    }, [isOpen, mode, onNavigate, images.length, currentIndex, onClose]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    if (!isOpen) return null;

    const canNavigate = mode !== 'comparison' && onNavigate && images.length > 1;
    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex < images.length - 1;

    return (
        <div
            className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-md animate-in fade-in duration-300"
            onClick={onClose}
        >
            {/* 关闭按钮 */}
            <button
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="absolute top-6 right-6 p-3 text-white/50 hover:text-white transition-colors z-[310] hover:bg-white/10 rounded-full"
            >
                <Icons.X size={24} />
            </button>

            <div className="w-full h-full flex" onClick={(e) => e.stopPropagation()}>
                {/* 主内容区 */}
                <div className={`flex-1 relative flex items-center justify-center p-4 ${showSidebar ? '' : 'p-10'}`}>
                    {mode === 'comparison' && comparisonImage ? (
                        // 对比模式：左右并排
                        <div className="w-full h-full flex items-center justify-center gap-8">
                            <div className="flex-1 h-full flex flex-col items-center justify-center">
                                <div className="text-white/50 text-sm mb-4 font-medium uppercase tracking-wider">Original</div>
                                <img
                                    src={comparisonImage}
                                    alt="Original"
                                    className="max-w-full max-h-[85vh] object-contain shadow-[0_0_100px_rgba(0,0,0,0.5)] rounded-lg"
                                />
                            </div>
                            <div className="flex-1 h-full flex flex-col items-center justify-center">
                                <div className="text-white/50 text-sm mb-4 font-medium uppercase tracking-wider">Generated</div>
                                <img
                                    src={currentImage}
                                    alt="Generated"
                                    className="max-w-full max-h-[85vh] object-contain shadow-[0_0_100px_rgba(0,0,0,0.5)] rounded-lg"
                                />
                            </div>
                        </div>
                    ) : (
                        // 单图模式
                        <>
                            {/* 左导航按钮 */}
                            {canNavigate && (
                                <button
                                    onClick={() => hasPrev && onNavigate?.(currentIndex - 1)}
                                    disabled={!hasPrev}
                                    className="absolute left-6 top-1/2 -translate-y-1/2 p-4 bg-stone-900/50 hover:bg-stone-900/80 rounded-full text-stone-400 hover:text-white disabled:opacity-0 transition-all backdrop-blur-sm z-20"
                                >
                                    <Icons.ArrowLeft size={28} />
                                </button>
                            )}

                            <img
                                src={currentImage}
                                alt="Detail View"
                                className="max-w-full max-h-[95vh] object-contain shadow-[0_0_100px_rgba(0,0,0,0.5)] rounded-lg"
                            />

                            {/* 右导航按钮 */}
                            {canNavigate && (
                                <button
                                    onClick={() => hasNext && onNavigate?.(currentIndex + 1)}
                                    disabled={!hasNext}
                                    className="absolute right-6 top-1/2 -translate-y-1/2 p-4 bg-stone-900/50 hover:bg-stone-900/80 rounded-full text-stone-400 hover:text-white disabled:opacity-0 transition-all backdrop-blur-sm z-20"
                                >
                                    <Icons.ArrowRight size={28} />
                                </button>
                            )}

                            {/* 顶部信息栏 */}
                            {(canNavigate || showActions) && (
                                <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start bg-gradient-to-b from-black/60 to-transparent z-10">
                                    {/* 计数器 */}
                                    {canNavigate && (
                                        <div className="px-4 py-2 bg-black/20 backdrop-blur-md rounded-full text-white/50 text-xs font-mono">
                                            {currentIndex + 1} / {images.length}
                                        </div>
                                    )}

                                    {/* 操作按钮 */}
                                    {showActions && (
                                        <div className="flex gap-2 ml-auto">
                                            {onAddToComparison && (
                                                <button
                                                    onClick={onAddToComparison}
                                                    className="p-3 bg-stone-900/60 hover:bg-orange-900/80 rounded-xl text-stone-300 hover:text-orange-300 transition-all backdrop-blur-md"
                                                    title="添加到对比"
                                                >
                                                    <Icons.Columns size={18} />
                                                </button>
                                            )}
                                            {onEdit && (
                                                <button
                                                    onClick={onEdit}
                                                    className="p-3 bg-stone-900/60 hover:bg-stone-800/80 rounded-xl text-stone-300 hover:text-white transition-all backdrop-blur-md"
                                                    title="编辑"
                                                >
                                                    <Icons.Edit2 size={18} />
                                                </button>
                                            )}
                                            {onDownload && (
                                                <button
                                                    onClick={onDownload}
                                                    className="p-3 bg-stone-900/60 hover:bg-stone-800/80 rounded-xl text-stone-300 hover:text-white transition-all backdrop-blur-md"
                                                    title="下载"
                                                >
                                                    <Icons.Download size={18} />
                                                </button>
                                            )}
                                            {onDelete && (
                                                <button
                                                    onClick={onDelete}
                                                    className="p-3 bg-stone-900/60 hover:bg-rose-900/80 rounded-xl text-stone-300 hover:text-rose-300 transition-all backdrop-blur-md"
                                                    title="删除"
                                                >
                                                    <Icons.Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* 侧边栏 */}
                {showSidebar && metadata && (
                    <div className="w-96 border-l border-stone-800 bg-stone-950 flex flex-col shadow-xl">
                        <div className="p-6 border-b border-stone-800/50 flex items-center justify-between">
                            <h3 className="text-stone-200 font-bold">Details</h3>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                            {metadata.prompt && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Prompt</span>
                                        <button
                                            onClick={() => navigator.clipboard.writeText(metadata.prompt || '')}
                                            className="p-1.5 text-stone-500 hover:text-stone-300 hover:bg-stone-800 rounded-md transition-all"
                                            title="复制"
                                        >
                                            <Icons.Copy size={12} />
                                        </button>
                                    </div>
                                    <p className="text-sm text-stone-400 leading-relaxed whitespace-pre-wrap">
                                        {metadata.prompt}
                                    </p>
                                </div>
                            )}

                            {metadata.timestamp && (
                                <div className="space-y-2">
                                    <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Created</span>
                                    <p className="text-sm text-stone-400">
                                        {new Date(metadata.timestamp).toLocaleString()}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ImageDetailViewer;
