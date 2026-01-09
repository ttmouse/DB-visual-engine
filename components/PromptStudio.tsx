import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Icons } from './Icons';
import { AspectRatioSelector } from './AspectRatioSelector';
import { ReferenceImageList } from './ReferenceImageList';
import { AppState, RefineModeConfig, ReverseModeConfig, ReferenceImage, PipelineProgress } from '../types';
import { executeSmartAnalysis, translatePrompt } from '../services/geminiService';
import { useI18n } from '../hooks/useI18n';
import { useSoundEffects } from '../hooks/useSoundEffects';

interface PromptStudioProps {
    state: AppState;
    setState: React.Dispatch<React.SetStateAction<AppState>>;
    pipelineProgress: PipelineProgress | null;
    showProgressView: boolean;
    isPipelineRunning: boolean;
    handleFileSelected: (base64Data: string, aspectRatio: string, mimeType: string, duration?: number, extractedPrompt?: string) => void;
    handleAnalyzeLayout: () => void;
    handleTranslatePrompt: (target: 'CN' | 'EN') => void;
    handleGenerateImage: (customPrompt?: string, count?: number) => void;
    handleStartPipeline: () => void;
    executeReverseAction: (mode: ReverseModeConfig) => void;
    handleChatSendMessage: (message: string, options?: { autoGenerate?: boolean }) => void;
    setIsChatDrawerOpen: (isOpen: boolean) => void;
    isChatDrawerOpen: boolean;
    isChatProcessing: boolean;
    setFullscreenImg: (img: string | null) => void;
    handleStopGeneration: () => void;
    activeModelName: string;
    apiMode: 'official' | 'custom' | 'volcengine';
    handleSetApiMode: (mode: 'official' | 'custom' | 'volcengine') => void;
    is4K: boolean;
    setIs4K: (is4K: boolean) => void;
    selectedAspectRatio: string;
    setSelectedAspectRatio: (ratio: string) => void;
    resetPipeline: () => void;
    setShowProgressView: (show: boolean) => void;
    showToast: (message: string, type: 'success' | 'error' | 'info', duration?: number) => void;
}

export const PromptStudio: React.FC<PromptStudioProps> = ({
    state,
    setState,
    pipelineProgress,
    showProgressView,
    isPipelineRunning,
    handleFileSelected,
    handleAnalyzeLayout,
    handleTranslatePrompt,
    handleGenerateImage,
    handleStartPipeline,
    executeReverseAction,
    handleChatSendMessage,
    setIsChatDrawerOpen,
    isChatDrawerOpen,
    isChatProcessing,
    setFullscreenImg,
    handleStopGeneration,
    activeModelName,
    apiMode,
    handleSetApiMode,
    is4K,
    setIs4K,
    selectedAspectRatio,
    setSelectedAspectRatio,
    resetPipeline,
    setShowProgressView,
    showToast
}) => {
    const { t, language } = useI18n();

    // Local State moved from App.tsx
    const [isApiDropdownOpen, setIsApiDropdownOpen] = useState(false);
    const [isMentionMenuOpen, setIsMentionMenuOpen] = useState(false);
    const [isReverseMenuOpen, setIsReverseMenuOpen] = useState(false);
    const [selectedReverseMode, setSelectedReverseMode] = useState<ReverseModeConfig>('quick-auto');
    const [isRefineMenuOpen, setIsRefineMenuOpen] = useState(false);
    const [selectedRefineMode, setSelectedRefineMode] = useState<RefineModeConfig>('optimize-auto');
    const [refineMenuPosition, setRefineMenuPosition] = useState({ top: 0, left: 0 });
    const [aiInput, setAiInput] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isDraggingReference, setIsDraggingReference] = useState(false);
    const [generateCount, setGenerateCount] = useState(1);
    const [isGenerateMenuOpen, setIsGenerateMenuOpen] = useState(false);

    const refineButtonRef = useRef<HTMLButtonElement>(null);

    // Update Refine menu position
    useEffect(() => {
        if (isRefineMenuOpen && refineButtonRef.current) {
            const rect = refineButtonRef.current.getBoundingClientRect();
            setRefineMenuPosition({
                top: rect.top - 8,
                left: rect.left,
            });
        }
    }, [isRefineMenuOpen]);

    // Helper to get button label
    const getReverseButtonLabel = () => {
        switch (selectedReverseMode) {
            case 'quick-prompt': return '快速逆向-提示词';
            case 'full-prompt': return '完整逆向-提示词';
            case 'full-auto': return '完整逆向';
            case 'quick-auto': return '快速逆向';
            default: return '快速逆向';
        }
    };

    return (
        <div className="h-full flex flex-col min-h-0 bg-stone-950/50">
            {/* 顶部状态栏: Aspect Ratio, 4K, Analysis Status */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800/50 bg-stone-900/20 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">Source</span>
                        <div className={`h-1.5 w-1.5 rounded-full ${state.image ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-stone-700'}`} />
                    </div>
                    {state.detectedAspectRatio && (
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">Ratio</span>
                            <span className="text-xs font-mono text-stone-300 bg-stone-800/50 px-1.5 py-0.5 rounded">{state.detectedAspectRatio}</span>
                        </div>
                    )}
                    {state.videoAnalysisDuration && (
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">Duration</span>
                            <span className="text-xs font-mono text-stone-300 bg-stone-800/50 px-1.5 py-0.5 rounded">{state.videoAnalysisDuration}s</span>
                        </div>
                    )}
                </div>

                {/* Right Side Status */}
                <div className="flex items-center gap-3">
                    {state.isAnalyzingLayout ? (
                        <span className="text-xs text-amber-500 animate-pulse flex items-center gap-1.5">
                            <Icons.Loader2 size={12} className="animate-spin" />
                            Layout Analysis...
                        </span>
                    ) : state.layoutData ? (
                        <span className="text-xs text-emerald-500 flex items-center gap-1.5" title="点击查看布局详情">
                            <Icons.LayoutDashboard size={12} />
                            Layout Ready
                        </span>
                    ) : state.image ? (
                        <button
                            onClick={handleAnalyzeLayout}
                            className="text-[10px] font-bold text-stone-500 hover:text-indigo-400 transition-colors flex items-center gap-1.5 group"
                        >
                            <Icons.Scan size={12} className="group-hover:scale-110 transition-transform" />
                            ANALYZE LAYOUT
                        </button>
                    ) : null}
                </div>
            </div>

            {/* Prompt Editor Area */}
            <div className="flex-1 p-4 flex flex-col min-h-0 relative group/editor">
                {/* Editor Container */}
                <div className="flex-1 flex flex-col relative min-h-0">
                    {/* Drag Overlay for Reference Images */}
                    <div
                        className={`absolute inset-0 rounded-xl pointer-events-none transition-all duration-200 z-10 
                ${isDraggingReference ? 'border-2 border-emerald-500 bg-emerald-500/10' : 'border border-transparent'}`}
                    >
                        {isDraggingReference && (
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center text-emerald-500">
                                <Icons.Download size={32} />
                                <span className="text-xs font-bold mt-2">{t('panel.addReference')}</span>
                            </div>
                        )}
                    </div>

                    {/* Prompt Error Tooltip/Overlay */}
                    {state.promptError && (
                        <div className="absolute bottom-full left-0 mb-2 px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium rounded-lg backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2 z-20 flex items-center gap-2">
                            <Icons.AlertTriangle size={12} className="shrink-0" />
                            <span>{state.promptError}</span>
                        </div>
                    )}

                    <textarea
                        value={showProgressView && pipelineProgress?.steps?.[0]?.streamingContent ? pipelineProgress.steps[0].streamingContent : state.editablePrompt}
                        readOnly={showProgressView}
                        placeholder={showProgressView ? "AI 正在分析画面..." : "输入提示词，或上传图片逆向生成..."}
                        onChange={(e) => setState(prev => ({
                            ...prev,
                            editablePrompt: e.target.value,
                            promptError: null // Clear error on edit
                        }))}
                        onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsDraggingReference(true);
                        }}
                        onDragLeave={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsDraggingReference(false);
                        }}
                        onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsDraggingReference(false);

                            const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
                            if (files.length === 0) return;

                            Promise.all(files.map(file => new Promise<ReferenceImage>((resolve) => {
                                const reader = new FileReader();
                                reader.onload = (ev) => {
                                    resolve({
                                        id: crypto.randomUUID(),
                                        url: ev.target?.result as string,
                                        name: file.name,
                                        mimeType: file.type,
                                        // Calculate default aspect ratio (will be refined by Image load)
                                        aspectRatio: '1:1'
                                    });
                                };
                                reader.readAsDataURL(file);
                            }))).then(async (tempImages) => {
                                // Refine aspect ratios by loading images
                                const processedImages = await Promise.all(tempImages.map(async img => {
                                    return new Promise<ReferenceImage>(resolve => {
                                        const image = new Image();
                                        image.onload = () => {
                                            const ratio = image.naturalWidth / image.naturalHeight;
                                            // Allow flexible ratio, but map to standard ones for model compatibility if needed.
                                            // For simplicity using same logic as ImageUploader
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
                                            resolve({ ...img, aspectRatio: closest.id });
                                        };
                                        image.src = img.url;
                                    });
                                }));

                                setState(prev => ({
                                    ...prev,
                                    referenceImages: [...prev.referenceImages, ...processedImages]
                                }));
                                showToast(`已添加 ${processedImages.length} 张参考图`, 'success');
                            });
                        }}
                        className="flex-1 w-full bg-stone-950 rounded-xl border border-stone-800 p-4 text-[12px] font-mono leading-relaxed focus:ring-2 focus:ring-stone-600 outline-none resize-none overflow-y-auto custom-scrollbar text-stone-200 placeholder:text-stone-600 relative z-20"
                        spellCheck={false}
                    />

                    {/* Reference Image List (Red Box Area) */}
                    {state.referenceImages?.length > 0 && (
                        <div className="mt-2 border-t border-stone-800 pt-2 relative z-20">
                            <ReferenceImageList
                                images={state.referenceImages}
                                onRemove={(id) => {
                                    setState(prev => ({
                                        ...prev,
                                        referenceImages: prev.referenceImages.filter(img => img.id !== id)
                                    }));
                                }}
                                onPreview={(img) => setFullscreenImg(img.url)}
                            />
                        </div>
                    )}
                </div>

                {/* Bottom Actions */}
                <div className="p-4 border-t border-stone-800 flex-shrink-0 space-y-3 relative z-50">
                    {/* Button Row */}
                    <div className="flex items-center gap-2">
                        {/* @ Mention Button with Dropdown */}
                        <div className="relative flex-shrink-0">
                            <button
                                onClick={() => (state.image || state.generatedImage) && setIsMentionMenuOpen(!isMentionMenuOpen)}
                                disabled={!state.image && !state.generatedImage}
                                className={`flex items-center justify-center px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition-all ${!state.image && !state.generatedImage
                                    ? 'bg-stone-900 text-stone-600 border-stone-800 cursor-not-allowed opacity-50'
                                    : isMentionMenuOpen
                                        ? 'bg-amber-900/40 text-amber-400 border-amber-500/30'
                                        : 'bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-amber-400 border-transparent'
                                    }`}
                                title={state.image || state.generatedImage ? "引用图片" : "请先上传或生成图片"}
                            >
                                @
                            </button>
                            {isMentionMenuOpen && (state.image || state.generatedImage) && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsMentionMenuOpen(false)} />
                                    <div className="absolute bottom-full left-0 mb-1 bg-stone-900 border border-stone-700 rounded-lg shadow-xl z-50 overflow-hidden min-w-[120px]">
                                        <button
                                            onClick={() => {
                                                handleTranslatePrompt('CN');
                                                setIsMentionMenuOpen(false);
                                            }}
                                            className="w-full text-left px-3 py-2 hover:bg-stone-800 flex items-center gap-2 transition-colors text-stone-300 whitespace-nowrap"
                                        >
                                            <Icons.Languages size={14} />
                                            <span className="text-xs">{t('studio.translateToCN')}</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                handleTranslatePrompt('EN');
                                                setIsMentionMenuOpen(false);
                                            }}
                                            className="w-full text-left px-3 py-2 hover:bg-stone-800 flex items-center gap-2 transition-colors text-stone-300 whitespace-nowrap"
                                        >
                                            <Icons.Languages size={14} />
                                            <span className="text-xs">{t('studio.translateToEN')}</span>
                                        </button>
                                        <div className="h-px bg-stone-800 my-1 mx-2" />
                                        {state.image && (
                                            <button
                                                onClick={() => {
                                                    const tag = '@原图';
                                                    setAiInput(prev => prev.includes(tag) ? prev.replace(tag, '').trim() : (prev + ' ' + tag).trim());
                                                    setIsMentionMenuOpen(false);
                                                }}
                                                className={`w-full text-left px-3 py-2 hover:bg-stone-800 flex items-center gap-2 transition-colors whitespace-nowrap ${aiInput.includes('@原图') ? 'text-orange-400' : 'text-stone-300'}`}
                                            >
                                                <Icons.Image size={14} />
                                                <span className="text-xs">{t('studio.mention.original')}</span>
                                                {aiInput.includes('@原图') && <Icons.Check size={12} className="ml-auto" />}
                                            </button>
                                        )}
                                        {state.generatedImage && (
                                            <button
                                                onClick={() => {
                                                    const tag = '@生成图';
                                                    setAiInput(prev => prev.includes(tag) ? prev.replace(tag, '').trim() : (prev + ' ' + tag).trim());
                                                    setIsMentionMenuOpen(false);
                                                }}
                                                className={`w-full text-left px-3 py-2 hover:bg-stone-800 flex items-center gap-2 transition-colors whitespace-nowrap ${aiInput.includes('@生成图') ? 'text-emerald-400' : 'text-stone-300'}`}
                                            >
                                                <Icons.Image size={14} />
                                                <span className="text-xs">{t('studio.mention.generated')}</span>
                                                {aiInput.includes('@生成图') && <Icons.Check size={12} className="ml-auto" />}
                                            </button>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Main Actions Area (No overflow to allow dropdowns) */}
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className="relative flex-1 flex min-w-fit">
                                <button
                                    onClick={() => executeReverseAction(selectedReverseMode)}
                                    disabled={!state.image || state.isProcessing}
                                    className="flex-1 py-2 bg-stone-800 text-stone-300 rounded-l-xl text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-40 hover:bg-stone-700 transition-all border border-stone-700 border-r-0 whitespace-nowrap px-3 min-w-fit"
                                    title={getReverseButtonLabel()}
                                >
                                    <Icons.Sparkles size={14} />
                                    {getReverseButtonLabel()}
                                </button>
                                <button
                                    onClick={() => setIsReverseMenuOpen(!isReverseMenuOpen)}
                                    disabled={!state.image || state.isProcessing}
                                    className="px-2 py-2 bg-stone-800 text-stone-300 rounded-r-xl text-xs font-bold flex items-center justify-center disabled:opacity-40 hover:bg-stone-700 transition-all border border-stone-700 border-l border-l-stone-600"
                                >
                                    <Icons.ChevronDown size={12} className={`transition-transform ${isReverseMenuOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isReverseMenuOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setIsReverseMenuOpen(false)} />
                                        <div className="absolute bottom-full left-0 right-0 mb-1 bg-stone-800 border border-stone-700 rounded-lg shadow-xl z-50 overflow-hidden min-w-[160px]">
                                            {/* Option 1: Quick - Prompt Only */}
                                            <div
                                                onClick={() => { setSelectedReverseMode('quick-prompt'); setIsReverseMenuOpen(false); }}
                                                className={`px-3 py-2 hover:bg-stone-700 cursor-pointer text-xs transition-colors flex items-center gap-2 ${selectedReverseMode === 'quick-prompt' ? 'bg-stone-700 text-orange-400' : 'text-stone-300'}`}
                                            >
                                                {selectedReverseMode === 'quick-prompt' && <Icons.Check size={12} />}
                                                <span className={selectedReverseMode !== 'quick-prompt' ? 'pl-5' : ''}>快速逆向-提示词</span>
                                            </div>
                                            {/* Option 2: Full - Prompt Only */}
                                            <div
                                                onClick={() => { setSelectedReverseMode('full-prompt'); setIsReverseMenuOpen(false); }}
                                                className={`px-3 py-2 hover:bg-stone-700 cursor-pointer text-xs transition-colors flex items-center gap-2 ${selectedReverseMode === 'full-prompt' ? 'bg-stone-700 text-orange-400' : 'text-stone-300'}`}
                                            >
                                                {selectedReverseMode === 'full-prompt' && <Icons.Check size={12} />}
                                                <span className={selectedReverseMode !== 'full-prompt' ? 'pl-5' : ''}>完整逆向-提示词</span>
                                            </div>
                                            <div className="h-px bg-stone-600 my-1 mx-2 opacity-30" />
                                            {/* Option 3: Full - Auto */}
                                            <div
                                                onClick={() => { setSelectedReverseMode('full-auto'); setIsReverseMenuOpen(false); }}
                                                className={`px-3 py-2 hover:bg-stone-700 cursor-pointer text-xs transition-colors flex items-center gap-2 ${selectedReverseMode === 'full-auto' ? 'bg-stone-700 text-orange-400' : 'text-stone-300'}`}
                                            >
                                                {selectedReverseMode === 'full-auto' && <Icons.Check size={12} />}
                                                <span className={selectedReverseMode !== 'full-auto' ? 'pl-5' : ''}>完整逆向</span>
                                            </div>
                                            {/* Option 4: Quick - Auto (Default) */}
                                            <div
                                                onClick={() => { setSelectedReverseMode('quick-auto'); setIsReverseMenuOpen(false); }}
                                                className={`px-3 py-2 hover:bg-stone-700 cursor-pointer text-xs transition-colors flex items-center gap-2 ${selectedReverseMode === 'quick-auto' ? 'bg-stone-700 text-orange-400' : 'text-stone-300'}`}
                                            >
                                                {selectedReverseMode === 'quick-auto' && <Icons.Check size={12} />}
                                                <span className={selectedReverseMode !== 'quick-auto' ? 'pl-5' : ''}>快速逆向</span>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="relative flex-1 flex min-w-fit">
                                <button
                                    onClick={() => handleGenerateImage(undefined, generateCount)}
                                    disabled={state.isGeneratingImage || !state.editablePrompt}
                                    className="flex-1 px-3 py-2 bg-stone-100 text-black rounded-l-xl text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-40 hover:bg-white transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] whitespace-nowrap"
                                >
                                    {state.isGeneratingImage ? <Icons.RefreshCw size={14} className="animate-spin" /> : <Icons.Play size={14} />}
                                    {generateCount > 1 ? t('studio.generate.multiple', { count: generateCount }) : t('studio.generate')}
                                </button>
                                <button
                                    onClick={() => setIsGenerateMenuOpen(!isGenerateMenuOpen)}
                                    disabled={state.isGeneratingImage || !state.editablePrompt}
                                    className="px-2 py-2 bg-stone-100 text-black rounded-r-xl text-xs font-bold flex items-center justify-center disabled:opacity-40 hover:bg-white transition-all border-l border-stone-300"
                                >
                                    <Icons.ChevronDown size={12} className={`transition-transform ${isGenerateMenuOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isGenerateMenuOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setIsGenerateMenuOpen(false)} />
                                        <div className="absolute bottom-full left-0 right-0 mb-1 bg-stone-800 border border-stone-700 rounded-lg shadow-xl z-50 overflow-hidden min-w-[120px]">
                                            {[1, 2, 4].map(num => (
                                                <div
                                                    key={num}
                                                    onClick={() => {
                                                        setGenerateCount(num);
                                                        setIsGenerateMenuOpen(false);
                                                    }}
                                                    className={`px-3 py-2 hover:bg-stone-700 cursor-pointer text-xs transition-colors flex items-center gap-2 ${num === generateCount ? 'bg-stone-700 text-orange-400' : 'text-stone-300'}`}
                                                >
                                                    {num === generateCount && <Icons.Check size={12} />}
                                                    <span>生成 {num} 张</span>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={() => { navigator.clipboard.writeText(state.editablePrompt); showToast(t('toast.copied'), 'success'); }}
                            disabled={!state.editablePrompt}
                            className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 transition-all flex-shrink-0"
                            title={t('studio.copy')}
                        >
                            <Icons.Copy size={14} />
                            {t('studio.copy')}
                        </button>
                        <button
                            onClick={() => setIsChatDrawerOpen(!isChatDrawerOpen)}
                            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all flex-shrink-0 ${isChatDrawerOpen ? 'bg-amber-900/30 text-amber-400' : 'bg-stone-800 text-stone-500 hover:text-stone-300'}`}
                            title={t('studio.chat')}
                        >
                            <Icons.MessageSquare size={14} />
                            {t('studio.chat')}
                        </button>
                    </div>

                    {/* AI Input Area - Two Row Layout */}
                    <div className="bg-stone-800 rounded-xl border border-stone-700">
                        {/* Top Row: Text Input */}
                        <div className="px-3 pt-2.5 pb-0">
                            <textarea
                                ref={(el) => {
                                    if (el) {
                                        el.style.height = 'auto';
                                        el.style.height = Math.min(el.scrollHeight, 100) + 'px';
                                        el.style.overflowY = el.scrollHeight > 100 ? 'auto' : 'hidden';
                                    }
                                }}
                                value={aiInput}
                                onChange={(e) => {
                                    setAiInput(e.target.value);
                                    const target = e.target;
                                    target.style.height = 'auto';
                                    const newHeight = Math.min(target.scrollHeight, 100);
                                    target.style.height = newHeight + 'px';
                                    target.style.overflowY = target.scrollHeight > 100 ? 'auto' : 'hidden';
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey && aiInput.trim()) {
                                        e.preventDefault();
                                        handleChatSendMessage(aiInput.trim(), { autoGenerate: selectedRefineMode === 'optimize-auto' });
                                        setAiInput('');
                                        setIsChatDrawerOpen(true);
                                    }
                                }}
                                onPaste={(e) => {
                                    const items = e.clipboardData?.items;
                                    if (!items) return;

                                    const imageItems = Array.from(items).filter(item => item.type.startsWith('image/'));
                                    if (imageItems.length === 0) return;

                                    e.preventDefault(); // Prevent pasting the image as text

                                    imageItems.forEach(item => {
                                        const file = item.getAsFile();
                                        if (!file) return;

                                        const reader = new FileReader();
                                        reader.onload = (ev) => {
                                            const result = ev.target?.result as string;
                                            const mimeType = file.type || 'image/png';
                                            const img = new Image();
                                            img.onload = () => {
                                                const ratio = img.width / img.height;
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
                                                const newRef: ReferenceImage = {
                                                    id: `ref-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                                    url: result,
                                                    name: file.name || 'pasted-image.png',
                                                    mimeType: mimeType,
                                                    aspectRatio: closest.id
                                                };
                                                setState(prev => ({
                                                    ...prev,
                                                    referenceImages: [...prev.referenceImages, newRef]
                                                }));
                                                showToast(t('toast.imageAddedToReference'), 'success');
                                            };
                                            img.src = result;
                                        };
                                        reader.readAsDataURL(file);
                                    });
                                }}
                                // Style updates for error state
                                className={`w-full flex-1 bg-transparent border-none outline-none resize-none 
              ${state.promptError ? 'text-red-300 placeholder-red-300/30' : 'text-stone-300 placeholder-stone-600'} 
              text-sm leading-relaxed scrollbar-thin scrollbar-thumb-stone-800 scrollbar-track-transparent p-1 transition-colors`}
                                placeholder={t('studio.placeholder')}
                                spellCheck={false}
                                disabled={isChatProcessing || isAnalyzing}
                                rows={1}
                            />

                            {state.promptError && (
                                <div className="absolute inset-x-0 bottom-0 top-auto h-[1px] bg-red-500/50 shadow-[0_0_8px_rgba(239,68,68,0.4)] pointer-events-none" />
                            )}
                        </div>

                        {/* Bottom Row: Buttons & Model Info */}
                        <div className="px-2 py-1.5 flex items-center justify-between">
                            {/* Left: Upload + Model Info */}
                            <div className="flex items-center gap-3">
                                {/* Upload Button */}
                                <label className="p-1.5 rounded-lg hover:bg-stone-700 cursor-pointer transition-colors text-stone-500 hover:text-stone-300" title="上传图片">
                                    <Icons.Plus size={16} />
                                    <input
                                        type="file"
                                        accept="image/*,video/*"
                                        multiple
                                        className="hidden"
                                        onChange={(e) => {
                                            const files = e.target.files;
                                            if (files && files.length > 0) {
                                                Array.from(files).forEach(file => {
                                                    const reader = new FileReader();
                                                    reader.onload = (ev) => {
                                                        const result = ev.target?.result as string;
                                                        const mimeType = file.type || 'image/png';
                                                        const img = new Image();
                                                        img.onload = () => {
                                                            const ratio = img.width / img.height;
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
                                                            const newRef: ReferenceImage = {
                                                                id: `ref-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                                                url: result,
                                                                name: file.name,
                                                                mimeType: mimeType,
                                                                aspectRatio: closest.id
                                                            };
                                                            setState(prev => ({
                                                                ...prev,
                                                                referenceImages: [...prev.referenceImages, newRef]
                                                            }));
                                                        };
                                                        img.src = result;
                                                    };
                                                    reader.readAsDataURL(file);
                                                });
                                                showToast(`已添加 ${files.length} 张参考图`, 'success');
                                            }
                                            e.target.value = '';
                                        }}
                                    />
                                </label>

                                {/* Model Info */}
                                {/* Model Switcher Dropdown */}
                                <div className="relative">
                                    <button
                                        onClick={() => setIsApiDropdownOpen(!isApiDropdownOpen)}
                                        className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-stone-800 transition-colors group"
                                        title="切换 API 模式"
                                    >
                                        <span className={`text-[10px] font-medium transition-colors ${apiMode === 'official' ? 'text-orange-500' :
                                            apiMode === 'volcengine' ? 'text-blue-500' : 'text-stone-500'
                                            }`}>
                                            {activeModelName}
                                        </span>
                                        <Icons.ChevronUp size={10} className={`text-stone-600 group-hover:text-stone-400 transition-transform duration-200 ${isApiDropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {/* Dropdown Menu */}
                                    {isApiDropdownOpen && (
                                        <>
                                            <div className="fixed inset-0 z-10" onClick={() => setIsApiDropdownOpen(false)} />
                                            <div className="absolute bottom-full left-0 mb-2 w-56 bg-stone-900 border border-stone-800 rounded-xl shadow-2xl z-20 overflow-hidden flex flex-col p-1 animate-in fade-in zoom-in-95 slide-in-from-bottom-2">
                                                <div className="px-3 py-2 border-b border-stone-800/50 mb-1">
                                                    <div className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Select Provider</div>
                                                </div>

                                                <button
                                                    onClick={() => handleSetApiMode('official')}
                                                    className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between transition-colors ${apiMode === 'official' ? 'bg-orange-900/20' : 'hover:bg-stone-800'}`}
                                                >
                                                    <div className="flex flex-col gap-0.5">
                                                        <div className="flex items-center gap-1.5">
                                                            <Icons.Globe size={12} className={apiMode === 'official' ? 'text-orange-500' : 'text-stone-500'} />
                                                            <span className={`text-xs font-bold ${apiMode === 'official' ? 'text-orange-400' : 'text-stone-300'}`}>Official API</span>
                                                        </div>
                                                        <span className="text-[9px] text-stone-500 pl-4.5">Google Gemini Direct</span>
                                                    </div>
                                                    {apiMode === 'official' && <Icons.Check size={14} className="text-orange-500" />}
                                                </button>

                                                <button
                                                    onClick={() => handleSetApiMode('custom')}
                                                    className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between transition-colors ${apiMode === 'custom' ? 'bg-orange-900/20' : 'hover:bg-stone-800'}`}
                                                >
                                                    <div className="flex flex-col gap-0.5">
                                                        <div className="flex items-center gap-1.5">
                                                            <Icons.Server size={12} className={apiMode === 'custom' ? 'text-orange-500' : 'text-stone-500'} />
                                                            <span className={`text-xs font-bold ${apiMode === 'custom' ? 'text-orange-400' : 'text-stone-300'}`}>Custom Proxy</span>
                                                        </div>
                                                        <span className="text-[9px] text-stone-500 pl-4.5">Self-hosted / Forwarder</span>
                                                    </div>
                                                    {apiMode === 'custom' && <Icons.Check size={14} className="text-orange-500" />}
                                                </button>

                                                <button
                                                    onClick={() => handleSetApiMode('volcengine')}
                                                    className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between transition-colors ${apiMode === 'volcengine' ? 'bg-blue-900/20' : 'hover:bg-stone-800'}`}
                                                >
                                                    <div className="flex flex-col gap-0.5">
                                                        <div className="flex items-center gap-1.5">
                                                            <Icons.Zap size={12} className={apiMode === 'volcengine' ? 'text-blue-500' : 'text-stone-500'} />
                                                            <span className={`text-xs font-bold ${apiMode === 'volcengine' ? 'text-blue-400' : 'text-stone-300'}`}>Volcengine</span>
                                                        </div>
                                                        <span className="text-[9px] text-stone-500 pl-4.5">Doubao Vision</span>
                                                    </div>
                                                    {apiMode === 'volcengine' && <Icons.Check size={14} className="text-blue-500" />}
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Aspect Ratio Selector */}
                                <AspectRatioSelector
                                    selectedRatio={selectedAspectRatio}
                                    is4K={is4K}
                                    onRatioChange={setSelectedAspectRatio}
                                    on4KChange={setIs4K}
                                    disabled={state.isGeneratingImage}
                                    apiMode={apiMode}
                                    language={language}
                                />
                            </div>

                            {/* Right: Action Buttons */}
                            <div className="flex items-center gap-2">
                                {isAnalyzing ? (
                                    <button
                                        onClick={() => {
                                            setIsAnalyzing(false);
                                            setAiInput('');
                                        }}
                                        className="px-2 py-1 bg-rose-900/30 hover:bg-rose-900/50 text-rose-400 rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
                                        title="取消分析"
                                    >
                                        <Icons.X size={12} />
                                    </button>
                                ) : (
                                    <button
                                        onClick={async () => {
                                            if (!state.image || !state.generatedImage) return;
                                            setIsAnalyzing(true);
                                            setAiInput('');
                                            try {
                                                const suggestion = await executeSmartAnalysis(
                                                    state.image,
                                                    state.generatedImage,
                                                    state.editablePrompt
                                                );
                                                setAiInput(prev => prev === '' ? suggestion : prev);
                                            } catch (e) {
                                                setAiInput('分析失败，请重试');
                                            } finally {
                                                setIsAnalyzing(false);
                                            }
                                        }}
                                        disabled={!state.image || !state.generatedImage || isChatProcessing}
                                        className="p-1.5 bg-violet-900/30 hover:bg-violet-900/50 text-violet-400 rounded-lg disabled:opacity-40 transition-all"
                                        title="智能分析"
                                    >
                                        <Icons.Sparkles size={14} />
                                    </button>
                                )}
                                <div className="flex items-center gap-1">
                                    <div className="relative flex min-w-fit">
                                        <button
                                            onClick={() => {
                                                if (aiInput.trim()) {
                                                    // If auto-optimize is selected, we might want to manually trigger refine intent if the input is ambiguous?
                                                    // But usually "optimize prompt" implies refine.
                                                    // Let's assume input is the instruction.
                                                    handleChatSendMessage(aiInput.trim(), { autoGenerate: selectedRefineMode === 'optimize-auto' });
                                                    setAiInput('');
                                                    setIsChatDrawerOpen(true);
                                                }
                                            }}
                                            disabled={!aiInput.trim() || isChatProcessing}
                                            className="pl-3 pr-2 py-1.5 bg-stone-700 text-white rounded-l-lg text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-40 hover:bg-stone-600 transition-all"
                                            title={selectedRefineMode === 'optimize-auto' ? t('refine.optimizeAndGenerate') : t('refine.optimizePromptOnly')}
                                        >
                                            <Icons.Sparkles size={14} className={selectedRefineMode === 'optimize-auto' ? "text-amber-400" : ""} />
                                            {selectedRefineMode === 'optimize-auto' ? t('refine.optimize') : t('refine.optimizePrompt')}
                                        </button>
                                        <button
                                            ref={refineButtonRef}
                                            type="button"
                                            className="inline-flex items-center p-1.5 rounded-r-lg text-[10px] font-bold transition-all bg-stone-700 text-white hover:bg-stone-600 border-l border-stone-800 disabled:opacity-40"
                                            onClick={() => setIsRefineMenuOpen(!isRefineMenuOpen)}
                                            disabled={isChatProcessing}
                                        >
                                            <Icons.ChevronDown size={12} className={`transition-transform ${isRefineMenuOpen ? 'rotate-180' : ''}`} />
                                        </button>
                                    </div>
                                    {isRefineMenuOpen && ReactDOM.createPortal(
                                        <>
                                            <div className="fixed inset-0 z-[9998]" onClick={() => setIsRefineMenuOpen(false)} />
                                            <div
                                                className="fixed z-[9999] bg-stone-800 border border-stone-700 rounded-lg shadow-xl overflow-hidden min-w-[140px]"
                                                style={{
                                                    top: refineMenuPosition.top,
                                                    left: refineMenuPosition.left,
                                                    transform: 'translateY(-100%)', // Grow upwards
                                                }}
                                            >
                                                {/* Option 1: Optimize - Auto (Default) */}
                                                <div
                                                    onClick={() => { setSelectedRefineMode('optimize-auto'); setIsRefineMenuOpen(false); }}
                                                    className={`px-3 py-2 hover:bg-stone-700 cursor-pointer text-xs transition-colors flex items-center gap-2 ${selectedRefineMode === 'optimize-auto' ? 'bg-stone-700 text-orange-400' : 'text-stone-300'}`}
                                                >
                                                    {selectedRefineMode === 'optimize-auto' && <Icons.Check size={12} />}
                                                    <span className={selectedRefineMode !== 'optimize-auto' ? 'pl-5' : ''}>{t('refine.optimize')}</span>
                                                </div>

                                                {/* Option 2: Optimize - Prompt Only */}
                                                <div
                                                    onClick={() => { setSelectedRefineMode('optimize-prompt'); setIsRefineMenuOpen(false); }}
                                                    className={`px-3 py-2 hover:bg-stone-700 cursor-pointer text-xs transition-colors flex items-center gap-2 ${selectedRefineMode === 'optimize-prompt' ? 'bg-stone-700 text-orange-400' : 'text-stone-300'}`}
                                                >
                                                    {selectedRefineMode === 'optimize-prompt' && <Icons.Check size={12} />}
                                                    <span className={selectedRefineMode !== 'optimize-prompt' ? 'pl-5' : ''}>{t('refine.optimizePrompt')}</span>
                                                </div>
                                            </div>
                                        </>,
                                        document.body
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
