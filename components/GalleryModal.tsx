/**
 * [INPUT]: 依赖 Icons, App state (generatedImages, history)
 * [OUTPUT]: 导出 GalleryModal 组件
 * [POS]: UI Component, 全屏相册浏览器
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import React, { useState } from 'react';
import { Icons } from './Icons';

interface GalleryModalProps {
    isOpen: boolean;
    onClose: () => void;
    images: string[];
    prompts?: string[];
    onSelectImage?: (index: number) => void;
    onDownload?: (index: number) => void;
}

// ============================================================================
//  GalleryModal - 全屏相册浏览器
// ============================================================================
export const GalleryModal: React.FC<GalleryModalProps> = ({
    isOpen,
    onClose,
    images,
    prompts = [],
    onSelectImage,
    onDownload
}) => {
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

    if (!isOpen) return null;

    // 单图全屏模式
    if (selectedIndex !== null) {
        const handlePrev = () => setSelectedIndex(prev => prev !== null && prev > 0 ? prev - 1 : prev);
        const handleNext = () => setSelectedIndex(prev => prev !== null && prev < images.length - 1 ? prev + 1 : prev);

        return (
            <div
                className="fixed inset-0 z-[300] bg-black animate-in fade-in duration-300 flex flex-col"
                onClick={() => setSelectedIndex(null)}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-4 border-b border-stone-800/50">
                    <button
                        onClick={(e) => { e.stopPropagation(); setSelectedIndex(null); }}
                        className="flex items-center gap-2 text-stone-400 hover:text-white transition-colors"
                    >
                        <Icons.ArrowLeft size={20} />
                        <span className="text-sm font-medium">返回相册</span>
                    </button>
                    <span className="text-stone-500 text-sm font-mono">{selectedIndex + 1} / {images.length}</span>
                    <div className="flex items-center gap-2">
                        {onDownload && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onDownload(selectedIndex); }}
                                className="p-2 text-stone-400 hover:text-emerald-400 transition-colors"
                                title="下载"
                            >
                                <Icons.Download size={20} />
                            </button>
                        )}
                        <button
                            onClick={(e) => { e.stopPropagation(); onClose(); }}
                            className="p-2 text-stone-400 hover:text-white transition-colors"
                        >
                            <Icons.X size={20} />
                        </button>
                    </div>
                </div>

                {/* Image View */}
                <div className="flex-1 flex items-center justify-center p-8 relative" onClick={(e) => e.stopPropagation()}>
                    {/* Prev Button */}
                    <button
                        onClick={handlePrev}
                        disabled={selectedIndex === 0}
                        className="absolute left-4 p-3 bg-stone-900/80 rounded-full text-stone-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:bg-stone-800"
                    >
                        <Icons.ArrowLeft size={24} />
                    </button>

                    {/* Image */}
                    <img
                        src={images[selectedIndex]?.startsWith('http') || images[selectedIndex]?.startsWith('data:')
                            ? images[selectedIndex]
                            : `data:image/png;base64,${images[selectedIndex]}`}
                        alt={`Generated ${selectedIndex + 1}`}
                        className="max-w-[90%] max-h-[80vh] object-contain rounded-lg shadow-2xl"
                    />

                    {/* Next Button */}
                    <button
                        onClick={handleNext}
                        disabled={selectedIndex === images.length - 1}
                        className="absolute right-4 p-3 bg-stone-900/80 rounded-full text-stone-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:bg-stone-800"
                    >
                        <Icons.ArrowRight size={24} />
                    </button>
                </div>

                {/* Prompt Preview */}
                {prompts[selectedIndex] && (
                    <div className="px-8 py-4 border-t border-stone-800/50 max-h-32 overflow-y-auto">
                        <p className="text-stone-500 text-xs font-mono line-clamp-3">{prompts[selectedIndex]}</p>
                    </div>
                )}
            </div>
        );
    }

    // 相册 Grid 模式
    return (
        <div
            className="fixed inset-0 z-[300] bg-black animate-in fade-in duration-300 flex flex-col"
            onClick={onClose}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-5 border-b border-stone-800/50" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-stone-900 rounded-xl">
                        <Icons.LayoutGrid size={20} className="text-orange-500" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-stone-200">相册</h2>
                        <p className="text-[10px] text-stone-500 font-medium uppercase">Gallery · {images.length} Images</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-2.5 rounded-full hover:bg-stone-800 text-stone-400 hover:text-white transition-all"
                >
                    <Icons.X size={24} />
                </button>
            </div>

            {/* Grid */}
            <div
                className="flex-1 overflow-y-auto p-6 custom-scrollbar"
                onClick={(e) => e.stopPropagation()}
            >
                {images.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-stone-600">
                        <Icons.Image size={48} className="mb-4 opacity-50" />
                        <p className="text-sm">暂无生成记录</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-7 gap-[5px]">
                        {images.map((img, idx) => (
                            <div
                                key={idx}
                                onClick={() => setSelectedIndex(idx)}
                                className="aspect-square rounded-lg overflow-hidden cursor-pointer relative bg-stone-900 border border-stone-800 hover:border-orange-500/50 transition-colors"
                            >
                                <img
                                    src={img.startsWith('http') || img.startsWith('data:') ? img : `data:image/png;base64,${img}`}
                                    alt={`Generated ${idx + 1}`}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="px-8 py-3 border-t border-stone-800/50 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                <span className="text-[10px] text-stone-600 font-mono">点击图片查看大图 · ESC 退出</span>
                <span className="text-[10px] text-stone-600 font-mono">← → 切换</span>
            </div>
        </div>
    );
};
