/**
 * [INPUT]: 依赖 AppState, ImageUploader, ImageViewer, ImageComparisonSlider
 * [OUTPUT]: 渲染 MainVisualizer 组件 (左侧可视化区域)
 * [POS]: components/MainVisualizer, 核心布局左栏, 负责图片展示与对比
 * [PROTOCOL]: 变更时更新此头部, 然后检查 CLAUDE.md
 */

import React from 'react';
import { PanelHeader } from './PanelHeader';
import { Icons } from './Icons';
import { ImageUploader } from './ImageUploader';
import { ImageComparisonSlider } from './ImageComparisonSlider';
import { ImageViewer } from './ImageViewer';
import { AppState, HistoryItem, LayoutElement } from '../types'; // Keep AppState import for type reference if needed, but remove from props
import { ImageZoomState } from '../utils/zoom';
import { extractPromptFromPng } from '../utils/pngMetadata';
import { getImageSrc, getOriginalFromHistory } from '../utils/imageHelpers';
import { useI18n } from '../hooks/useI18n';


interface MainVisualizerProps {
    width: number;
    isDraggingDivider: boolean;
    onResizeStart: () => void;
    // Granular props to prevent DevTools OOM on large state objects
    generatedImages: string[];
    selectedHistoryIndex: number;
    history: HistoryItem[];
    currentGeneratedImage: string | null; // NEW PROP: Full resolution image
    layoutData: LayoutElement[] | null;
    isAnalyzingLayout: boolean;
    isProcessing: boolean;

    displayImage: string | null;
    isComparisonMode: boolean;
    setIsComparisonMode: (v: boolean) => void;
    imageZoom: ImageZoomState;
    handleZoomChange: (newZoom: ImageZoomState) => void;
    setFullscreenImg: (src: string | null) => void;
    setIsFullscreenComparison: (v: boolean) => void;
    isDraggingNewImage: boolean;
    setIsDraggingNewImage: (v: boolean) => void;
    uploaderKey: number;
    handleFileSelected: (base64Data: string, aspectRatio: string, mimeType: string, duration?: number, extractedPrompt?: string) => void;
    handleReset: () => void;
    handleDownloadHD: (index: number) => void;
    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const MainVisualizer: React.FC<MainVisualizerProps> = ({
    width,
    isDraggingDivider,
    onResizeStart,
    generatedImages = [], // FIX: Default to empty array to prevent undefined.length crash
    selectedHistoryIndex = 0,
    history = [],
    currentGeneratedImage,
    layoutData,
    isAnalyzingLayout,
    isProcessing,
    displayImage,
    isComparisonMode,
    setIsComparisonMode,
    imageZoom,
    handleZoomChange,
    setFullscreenImg,
    setIsFullscreenComparison,
    isDraggingNewImage,
    setIsDraggingNewImage,
    uploaderKey,
    handleFileSelected,
    handleReset,
    handleDownloadHD,
    showToast
}) => {
    const { t } = useI18n();

    // Helper for drop logic
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingNewImage(false);

        if (!displayImage) return;

        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
        if (files.length === 0) return;

        const file = files[0];
        if (file.size > 20 * 1024 * 1024) {
            showToast(t('toast.fileTooLarge'), 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (ev) => {
            const base64String = ev.target?.result as string;
            const cleanBase64 = base64String.split(',')[1];
            const mimeType = file.type;

            // Calculate aspect ratio
            if (file.type.startsWith('image/')) {
                // Try to extract prompt regardless of file type (since browser mime detection can be tricky)
                const extracted = extractPromptFromPng(cleanBase64);

                const img = new Image();
                img.onload = () => {
                    const ratio = img.naturalWidth / img.naturalHeight;
                    const ratios = [
                        { id: "1:1", value: 1.0 },
                        { id: "3:4", value: 0.75 },
                        { id: "4:3", value: 1.333 },
                        { id: "9:16", value: 0.5625 },
                        { id: "16:9", value: 1.777 }
                    ];
                    const closest = ratios.reduce((prev, curr) =>
                        Math.abs(curr.value - ratio) < Math.abs(prev.value - ratio) ? curr : prev
                    );
                    handleFileSelected(cleanBase64, closest.id, mimeType, undefined, extracted || undefined);
                    showToast(t('toast.newImageLoaded'), 'success');
                };
                img.src = base64String;
            } else {
                handleFileSelected(cleanBase64, '16:9', mimeType);
                showToast(t('toast.newVideoLoaded'), 'success');
            }
        };
        reader.readAsDataURL(file);
    };

    // Determine the active generated image source. prefer prop, fallback to history helper
    const activeGeneratedImage = currentGeneratedImage
        ? getImageSrc(currentGeneratedImage, 'image/png')
        : getOriginalFromHistory(history, selectedHistoryIndex);

    return (
        <>
            {/* Left Panel: Image Display */}
            <div style={{ width: `${width}%` }} className="flex-shrink-0 flex flex-col h-full bg-stone-900 rounded-xl border border-stone-800 overflow-hidden shadow-sm">
                <PanelHeader title={t('panel.visualAssets')}>
                    <div className="flex items-center gap-2">
                        {generatedImages.length > 0 && (
                            <>
                                <div className="flex items-center gap-2 mr-2 border-r border-stone-800 pr-3">
                                    <span className={`text-[9px] font-bold uppercase transition-colors ${isComparisonMode ? 'text-orange-500' : 'text-stone-500'}`}>Compare</span>
                                    <button
                                        onClick={() => setIsComparisonMode(!isComparisonMode)}
                                        className={`w-7 h-4 rounded-full transition-colors flex items-center p-0.5 ${isComparisonMode ? 'bg-orange-500' : 'bg-stone-800 hover:bg-stone-700'}`}
                                    >
                                        <div className={`w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${isComparisonMode ? 'translate-x-3' : 'translate-x-0'}`} />
                                    </button>
                                </div>

                                <button
                                    onClick={() => handleDownloadHD(selectedHistoryIndex)}
                                    className="p-1.5 text-stone-500 hover:text-emerald-400 transition-colors rounded-lg hover:bg-emerald-900/20"
                                    title="Download HD"
                                >
                                    <Icons.Download size={14} />
                                </button>
                            </>
                        )}
                        <button
                            onClick={handleReset}
                            className="p-1.5 text-stone-500 hover:text-rose-400 transition-colors rounded-lg hover:bg-rose-900/20"
                            title="New Task"
                        >
                            <Icons.Plus size={14} />
                        </button>
                    </div>
                </PanelHeader>

                <div
                    className={`flex-1 min-h-0 relative flex flex-col ${isDraggingNewImage ? 'ring-2 ring-orange-500 ring-inset' : ''}`}
                    onDragOver={(e) => {
                        if (displayImage) {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsDraggingNewImage(true);
                        }
                    }}
                    onDragLeave={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDraggingNewImage(false);
                    }}
                    onDrop={handleDrop}
                >
                    {/* Drag overlay */}
                    {isDraggingNewImage && displayImage && (
                        <div className="absolute inset-0 z-50 bg-orange-500/20 backdrop-blur-sm flex items-center justify-center pointer-events-none">
                            <div className="bg-orange-500 text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 shadow-xl">
                                <Icons.Upload size={18} />
                                <Icons.Upload size={18} />
                                拖放以开始新的逆向
                            </div>
                        </div>
                    )}

                    {!displayImage && !(generatedImages.length > 0 && selectedHistoryIndex >= 0) ? (
                        <ImageUploader key={uploaderKey} onImageSelected={handleFileSelected} disabled={isProcessing} />
                    ) : (
                        <div className="w-full h-full flex flex-col animate-in fade-in duration-500">
                            {generatedImages.length > 0 && selectedHistoryIndex >= 0 ? (
                                displayImage && isComparisonMode ? (
                                    <ImageComparisonSlider
                                        beforeImage={displayImage}
                                        afterImage={activeGeneratedImage}
                                        beforeLabel={displayImage === getImageSrc(history[selectedHistoryIndex]?.originalImage, history[selectedHistoryIndex]?.mimeType) ? t('comparison.original') : t('comparison.selected')}
                                        afterLabel={t('comparison.generated')}
                                        className="w-full h-full border-0 rounded-none bg-stone-950/50"
                                        layoutData={layoutData}
                                        isAnalyzingLayout={isAnalyzingLayout}
                                        onFullscreen={() => { setFullscreenImg(displayImage); setIsFullscreenComparison(true); }}
                                        zoom={imageZoom}
                                        onZoomChange={handleZoomChange}
                                    />
                                ) : (
                                    <ImageViewer
                                        src={activeGeneratedImage}
                                        alt="Generated Result"
                                        className="w-full h-full border-0 rounded-none bg-stone-950/50"
                                        layoutData={layoutData}
                                        isAnalyzingLayout={isAnalyzingLayout}
                                        onFullscreen={() => setFullscreenImg(activeGeneratedImage)}
                                        zoom={imageZoom}
                                        onZoomChange={handleZoomChange}
                                    />
                                )
                            ) : displayImage ? (
                                <ImageViewer
                                    src={displayImage}
                                    alt="Source"
                                    className="w-full h-full border-0 rounded-none bg-stone-950/50"
                                    layoutData={layoutData}
                                    isAnalyzingLayout={isAnalyzingLayout}
                                    onFullscreen={() => setFullscreenImg(displayImage)}
                                    zoom={imageZoom}
                                    onZoomChange={handleZoomChange}
                                />
                            ) : null}
                        </div>
                    )}
                </div>
            </div>

            {/* Draggable Divider */}
            <div
                onMouseDown={onResizeStart}
                className={`w-2 flex-shrink-0 cursor-col-resize flex items-center justify-center group hover:bg-stone-700/50 transition-colors ${isDraggingDivider ? 'bg-orange-500/30' : ''}`}
            >
                <div className={`w-0.5 h-12 rounded-full transition-colors ${isDraggingDivider ? 'bg-orange-500' : 'bg-stone-700 group-hover:bg-stone-500'}`} />
            </div>
        </>
    );
};
