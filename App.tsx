
/**
 * [INPUT]: 依赖 services (gemini/history/chat) 和 components (ChatPanel/ImageUploader/Results)
 * [OUTPUT]: 导出 App 根组件，作为应用入口
 * [POS]: Application 根容器，协调全局状态与路由
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import React, { useState, useEffect, useRef, useTransition, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { ImageUploader } from './components/ImageUploader';
import { AgentCard } from './components/AgentCard';
import { ImageViewer } from './components/ImageViewer';
import { ImageComparisonSlider } from './components/ImageComparisonSlider';
import { HistoryThumbnail } from './components/HistoryThumbnail';
import { ReferenceImageList } from './components/ReferenceImageList';
import { ToastContainer } from './components/Toast';
import { useToast } from './hooks/useToast';
import { StorageIndicator } from './components/StorageIndicator';
import { Icons } from './components/Icons';
import { streamAgentAnalysis, generateImageFromPrompt, streamConsistencyCheck, refinePromptWithFeedback, detectLayout, translatePrompt, executeSmartAnalysis, configureClient, configureModels, getModeDefaultModels } from './services/geminiService';
import { saveHistoryItem, getHistory, deleteHistoryItemById, getHistoryItemById } from './services/historyService';
import { detectSkillIntent, createUserMessage, createAssistantMessage, createSkillResultMessage, executeQualityCheck, executeRefineSkill, executeReverseSkill } from './services/chatService';
import { promptManager, PromptVersion } from './services/promptManager';
import { saveCurrentTask, loadCurrentTask, clearCurrentTask } from './services/cacheService';
import { runLazyMigration } from './services/migrationService';
import { saveSnapshot, loadSnapshot, clearSnapshot } from './services/snapshotService';
import { usePromptHistory } from './hooks/usePromptHistory';
import { useSoundEffects } from './hooks/useSoundEffects';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useHistoryNavigation } from './hooks/useHistoryNavigation';
import { usePipelineProgress } from './hooks/usePipelineProgress';
import { useApiConfig } from './hooks/useApiConfig';
import { useAppInitialization } from './hooks/useAppInitialization';
import { useImagePipeline } from './hooks/useImagePipeline';
import { useImageGeneration } from './hooks/useImageGeneration';
import { I18nProvider, useI18n } from './hooks/useI18n';
import { useResizablePanel } from './hooks/useResizablePanel';
import { PipelineProgressView } from './components/PipelineProgressView';
import { AGENTS, PIPELINE_ORDER } from './constants';
import { AgentRole, AppState, HistoryItem, ChatMessage, PipelineStepStatus, ReferenceImage, TabType, RefineModeConfig, ReverseModeConfig } from './types';
import { ChatPanel } from './components/ChatPanel';
import { ChatDrawer } from './components/ChatDrawer';
import { PanelHeader } from './components/PanelHeader';
import { LandingPage } from './components/LandingPage';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';


// Lazy load heavy modal components for better initial load performance
const DocumentationModal = React.lazy(() => import('./components/DocumentationModal').then(m => ({ default: m.DocumentationModal })));
const ApiKeyModal = React.lazy(() => import('./components/ApiKeyModal').then(m => ({ default: m.ApiKeyModal })));
const PromptLabModal = React.lazy(() => import('./components/PromptLabModal').then(m => ({ default: m.PromptLabModal })));
const GalleryModal = React.lazy(() => import('./components/GalleryModal').then(m => ({ default: m.GalleryModal })));
import { AspectRatioSelector } from './components/AspectRatioSelector';
import ReactMarkdown from 'react-markdown';
import { extractPromptFromPng, embedPromptInPng } from './utils/pngMetadata';
import { generateThumbnail } from './utils/thumbnailUtils';
import { PromptDiffView } from './components/PromptDiffView';
import { hasSignificantDiff } from './utils/promptDiff';
import { ImageDetailViewer } from './components/ImageDetailViewer';
import { INITIAL_STATE, INITIAL_RESULTS } from './constants/appState';
import { getImageSrc, getOriginalFromHistory } from './utils/imageHelpers';
import { parseSuggestions } from './utils/parseSuggestions';
import { ImageZoomState } from './utils/zoom';
import { PromptStudio } from './components/PromptStudio';
import { AgentWorkbench } from './components/AgentWorkbench';
import { ChatSidebar } from './components/ChatSidebar';
import { MainVisualizer } from './components/MainVisualizer';




const App: React.FC = () => {
  const { language, t, setLanguage } = useI18n();
  const [isPending, startTransition] = useTransition(); // 用于非阻塞状态更新
  const [showLanding, setShowLanding] = useState(false);

  const [state, setState] = useState<AppState>(() => {
    // [SNAPSHOT] Instant load last view state (0ms)
    const snap = loadSnapshot();
    return snap ? { ...INITIAL_STATE, ...snap } : INITIAL_STATE;
  });
  const [displayImage, setDisplayImage] = useState<string | null>(null);
  const [uploaderKey, setUploaderKey] = useState(0); // Key to force ImageUploader remount
  const { toasts, showToast, removeToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('STUDIO');

  /* Existing state declarations */
  // ...
  const { apiMode, setApiMode, activeModelName, setActiveModelName, hasKey, setHasKey, switchApiMode } = useApiConfig();

  // App Initialization (History, Cache)
  useAppInitialization(setState, setDisplayImage, setShowLanding);

  // const [isApiDropdownOpen, setIsApiDropdownOpen] = useState(false); // MOVED TO PROMPT STUDIO
  // const [isMentionMenuOpen, setIsMentionMenuOpen] = useState(false); // MOVED TO PROMPT STUDIO
  const [hoveredHistoryIndex, setHoveredHistoryIndex] = useState<number | null>(null);

  const setSelectedHistoryIndex = useCallback((index: number) => {
    setState(prev => ({ ...prev, selectedHistoryIndex: index }));
  }, []);

  const handleSetApiMode = (targetMode: 'official' | 'custom' | 'volcengine') => {
    setApiMode(targetMode);
    const modeLabels: Record<string, string> = {
      official: '官方 API',
      custom: '自定义',
      volcengine: '火山引擎'
    };
    showToast(`已切换到 ${modeLabels[targetMode] || targetMode} 模式`, 'success');
    // setIsApiDropdownOpen(false); // MOVED
  };

  const handleSwitchApiMode = () => {
    const nextMode = switchApiMode();
    const modeLabels: Record<string, string> = {
      official: '官方 API',
      custom: '自定义',
      volcengine: '火山引擎 SEA',
      'volcengine-cn': '火山引擎 CN'
    };
    showToast(`已切换到 ${modeLabels[nextMode] || nextMode} 模式`, 'success');
    // setIsApiDropdownOpen(false); // MOVED
  };



  const [refinementInput, setRefinementInput] = useState('');
  const [fullscreenImg, setFullscreenImg] = useState<string | null>(null);
  const [isFullscreenComparison, setIsFullscreenComparison] = useState(false);
  const [isComparisonMode, setIsComparisonMode] = useState(() => {
    const saved = localStorage.getItem('unimage_comparison_mode');
    return saved !== null ? JSON.parse(saved) : false;
  });

  // Save comparison mode preference
  useEffect(() => {
    localStorage.setItem('unimage_comparison_mode', JSON.stringify(isComparisonMode));
  }, [isComparisonMode]);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteTargetIndex, setDeleteTargetIndex] = useState<number>(-1);
  const [isPromptLabOpen, setIsPromptLabOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState<'CN' | 'EN'>('CN');
  const [isHistoryDropdownOpen, setIsHistoryDropdownOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatProcessing, setIsChatProcessing] = useState(false);
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);
  // const [aiInput, setAiInput] = useState(''); // MOVED
  // const [isReverseMenuOpen, setIsReverseMenuOpen] = useState(false); // MOVED

  // Refine Mode State MOVED TO PROMPT STUDIO
  // const [selectedRefineMode, setSelectedRefineMode] = useState<RefineModeConfig>('optimize-auto');
  // const [isRefineMenuOpen, setIsRefineMenuOpen] = useState(false);

  // const [refineMenuPosition, setRefineMenuPosition] = useState({ top: 0, left: 0 });
  // const refineButtonRef = useRef<HTMLButtonElement>(null);

  // Update Refine menu position MOVED

  // State for Reverse Mode selection (4 options) - MOVED TO PROMPT STUDIO
  const [selectedReverseMode, setSelectedReverseMode] = useState<ReverseModeConfig>('quick-auto');

  // Ref to track auto-generation for Full Pipeline
  const autoGenerateAfterPipeline = useRef(false);

  // Monitor Pipeline Completion for Auto-Generation
  useEffect(() => {
    if (autoGenerateAfterPipeline.current) {
      // Check if Synthesizer (final step) is complete
      const synthesizerResult = state.results[AgentRole.SYNTHESIZER];
      if (synthesizerResult?.content && !synthesizerResult.isStreaming && !state.isProcessing) {
        autoGenerateAfterPipeline.current = false; // Reset
        handleGenerateImage();
      }
    }
  }, [state.results, state.isProcessing]);

  const [is4K, setIs4K] = useState(false); // 是否启用 4K 画质
  const mainRef = useRef<HTMLElement>(null);
  const historyRef = useRef(state.history); // 用于 useEffect 回调中访问最新 history
  const isKeyboardNav = useRef(false); // Track navigation source for scroll behavior
  const scrollContainerRef = useRef<HTMLDivElement>(null); // For custom history scrolling

  // Resizable left panel
  const {
    width: leftPanelWidth,
    isDragging: isDraggingDivider,
    setIsDragging: setIsDraggingDivider
  } = useResizablePanel(mainRef, {
    storageKey: 'unimage_left_panel_width',
    defaultValue: 50,
    min: 15,
    max: 80,
    isPercentage: true,
    direction: 'left'
  });

  // Resizable right panel
  const {
    width: rightPanelWidth,
    isDragging: isDraggingRightDivider,
    setIsDragging: setIsDraggingRightDivider
  } = useResizablePanel(mainRef, {
    storageKey: 'unimage_right_panel_width',
    defaultValue: 500,
    min: 500,
    max: 800,
    isPercentage: false,
    direction: 'right',
    // Dynamic max calculates: Container - Left Panel - Middle Panel Min Width (500)
    dynamicMax: (containerWidth) => {
      // Calculate Left Panel Width in Pixels
      const leftPx = (containerWidth * leftPanelWidth) / 100;
      // Remaining space needed for Middle Panel
      const middleMin = 500;
      return Math.max(300, containerWidth - leftPx - middleMin);
    }
  });
  // Removed isGlobalDragging state as we use localized drop zones now
  // const [isAnalyzing, setIsAnalyzing] = useState(false); // MOVED - unused here
  // const analyzeAbortRef = useRef<AbortController | null>(null); // MOVED - unused here

  // Synchronized image zoom state
  const [imageZoom, setImageZoom] = useState({ scale: 1, panX: 0, panY: 0 });
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Reference Image Drag Dnd State
  const [isDraggingReference, setIsDraggingReference] = useState(false);

  // New Image Drag State for left panel
  const [isDraggingNewImage, setIsDraggingNewImage] = useState(false);


  const abortControllerRef = useRef<AbortController | null>(null);

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState(prev => ({
      ...prev,
      isProcessing: false,
      isGeneratingImage: false,
      results: Object.entries(prev.results).reduce((acc, [key, val]) => ({
        ...acc,
        [key]: { ...(val as object), isStreaming: false }
      }), {} as typeof prev.results)
    }));
    isPipelineRunning.current = false;
    showToast(t('toast.operationStopped'), "info");
  };

  // 流水线进度管理
  const {
    progress: pipelineProgress,
    initPipeline,
    startStep,
    updateStepContent,
    completeStep,
    errorStep,
    completePipeline,
    resetPipeline,
    setProgressDirect
  } = usePipelineProgress();

  const [showProgressView, setShowProgressView] = useState(false);
  const { soundEnabled, toggleSound, soundService } = useSoundEffects();
  const { promptHistory, pushPromptHistory, clearPromptHistory } = usePromptHistory();
  // const [reverseMode, setReverseMode] = useState<'full' | 'quick'>('quick'); // Deprecated/Moved
  // const [generateCount, setGenerateCount] = useState(1); // MOVED
  // const [isGenerateMenuOpen, setIsGenerateMenuOpen] = useState(false); // MOVED
  const [selectedAspectRatio, setSelectedAspectRatio] = useState('9:16'); // 选择的比例

  const { handleGenerateImage } = useImageGeneration({
    state,
    setState,
    selectedAspectRatio,
    is4K,
    t,
    showToast
  });

  const { handleQuickReverse, isPipelineRunning } = useImagePipeline({
    state,
    setState,
    pipelineProgress,
    initPipeline,
    startStep,
    updateStep: updateStepContent,
    completeStep,
    errorStep,
    setProgressDirect,
    soundService,
    pushPromptHistory,
    setActiveTab,
    setShowProgressView,
    t,
    completePipeline,
    showToast,
    onGenerateImage: (prompt) => handleGenerateImage(prompt)
  });


  // 保持 historyRef 同步
  useEffect(() => {
    historyRef.current = state.history;
  }, [state.history]);



  // Handle image zoom update
  const handleZoomChange = (newZoom: ImageZoomState) => {
    setImageZoom(newZoom);
  };

  // Reset zoom when image changes
  useEffect(() => {
    setImageZoom({ scale: 1, panX: 0, panY: 0 });
  }, [displayImage, state.generatedImage]);

  // Auto-save current task to cache with debounce (避免频繁保存)
  // NOTE: Only save essential state, NOT large arrays like generatedImages (they're in IndexedDB)
  useEffect(() => {
    if (!state.image) return;

    const timeoutId = setTimeout(() => {
      try {
        saveCurrentTask({
          image: state.image,
          mimeType: state.mimeType,
          displayImage: null, // Skip saving displayImage - it's reconstructed from history
          detectedAspectRatio: state.detectedAspectRatio,
          videoAnalysisDuration: state.videoAnalysisDuration,
          results: state.results,
          editablePrompt: state.editablePrompt,
          generatedImage: state.generatedImage,
          generatedImages: [], // Skip saving array - images are in IndexedDB history
          layoutData: state.layoutData,
          promptCache: state.promptCache,
          selectedHistoryIndex: state.selectedHistoryIndex,
          referenceImages: state.referenceImages?.slice(0, 3) || [] // Limit reference images
        });
      } catch (e: any) {
        if (e.name === 'QuotaExceededError') {
          showToast(t('toast.storageFull'), 'error');
        }
      }
    }, 500); // 500ms 防抖

    return () => clearTimeout(timeoutId);
  }, [
    state.image, state.mimeType, state.detectedAspectRatio,
    state.editablePrompt, state.generatedImage,
    state.selectedHistoryIndex
  ]);

  // [SNAPSHOT] Auto-save "Last Active View" to fast storage
  useEffect(() => {
    // Only save if content exists
    if (state.image || state.generatedImage || state.editablePrompt) {
      const timeout = setTimeout(() => {
        saveSnapshot(state);
      }, 1000); // 1s debounce
      return () => clearTimeout(timeout);
    }
  }, [state.image, state.generatedImage, state.editablePrompt, state.detectedAspectRatio, state.selectedHistoryIndex]);

  // Helper to load history item
  // Helper to load history item
  // Helper to load history item
  const loadHistoryItem = useCallback(async (index: number) => {
    // 1. Check if index is valid
    if (index < 0 || index >= historyRef.current.length) return;

    const historyItem = historyRef.current[index];
    if (!historyItem) return;

    // 2. Instant Feedback & Optimistic UI Update
    // We already have index and lightweight historyItem.
    setSelectedHistoryIndex(index);

    // Immediately show the prompt and the thumbnail (as a placeholder)
    const thumbSrc = historyItem.generatedImageThumb || historyItem.generatedImage || '';
    // We do NOT fallback to thumbSrc for the reference image (originalImage)
    const initialOriginalSrc = historyItem.originalImage || null;

    setState(prev => ({
      ...prev,
      editablePrompt: historyItem.prompt,
      promptCache: { ...prev.promptCache, CN: historyItem.prompt },
      image: initialOriginalSrc,
      mimeType: historyItem.mimeType || 'image/png',
      detectedAspectRatio: historyItem.detectedAspectRatio || '1:1',
      generatedImage: historyItem.generatedImage || thumbSrc || null
    }));

    if (initialOriginalSrc) {
      setDisplayImage(getImageSrc(initialOriginalSrc, historyItem.mimeType));
    } else {
      // No original image in the lightweight item.
      // CHECK: Does it actually HAVE one that we are about to fetch?
      // If yes (hasOriginalImage is true), don't clear displayImage yet to avoid flickering.
      // If no (hasOriginalImage is false/undefined), clear it immediately.
      // Fallback: If hasOriginalImage is undefined (old data), assume false to be safe (might flicker but correct).
      if (!historyItem.hasOriginalImage) {
        setDisplayImage(null);
      }
    }

    // 3. Background Fetch for Full Details (Non-blocking for previous update)
    // If it's a lightweight item, fetch the full res version.
    if (!historyItem.originalImage && historyItem.id) {
      try {
        const fullItem = await getHistoryItemById(historyItem.id);

        // Double check: ensure user is STILL looking at the same item after async fetch
        if (fullItem && historyRef.current[index]?.id === historyItem.id) {
          // Atomic update for high-res data if still on this item
          setState(prev => {
            if (prev.selectedHistoryIndex !== index) return prev;
            return {
              ...prev,
              image: fullItem.originalImage,
              generatedImage: fullItem.generatedImage
            };
          });

          if (fullItem.originalImage) {
            setDisplayImage(getImageSrc(fullItem.originalImage, fullItem.mimeType));
          } else {
            // If we waited because we thought there was an image, but there isn't, clear it now.
            setDisplayImage(null);
          }
        }
      } catch (e) {
        console.error("Failed to fetch full history item in background", e);
        // We already have the thumbnail shown, so no need to toast here unless critical
      }
    }
  }, [isComparisonMode, t, showToast, setSelectedHistoryIndex]); // Updated deps

  // Keyboard Shortcuts for History and Fullscreen
  // Keyboard Shortcuts for History and Fullscreen
  useHistoryNavigation({
    generatedImagesLength: state.generatedImages.length,
    selectedHistoryIndex: state.selectedHistoryIndex,
    history: state.history,
    loadHistoryItem,
    fullscreenImg,
    setFullscreenImg,
    isFullscreenComparison,
    setIsFullscreenComparison
  });


  // Keyboard shortcuts
  // Keyboard shortcuts
  // Keyboard shortcuts moved to bottom to access handlers

  // Sync displayImage when exiting comparison mode (恢复显示当前选中的图片的原始图)
  // Sync displayImage logic:
  // 1. When Exiting Comparison Mode: Restore original image to displayImage (if valid)
  // 2. When Entering/Refreshing in Comparison Mode: Ensure displayImage is set (so slider works)
  useEffect(() => {
    // Ensure displayImage is synchronized with current state
    if (!displayImage && state.image) {
      // If displayImage is missing (e.g. refresh), restore from state.image
      setDisplayImage(getImageSrc(state.image, state.mimeType));
    } else if (!isComparisonMode && state.image) {
      // If NOT in comparison mode, always sync displayImage to current original image
      const currentSrc = getImageSrc(state.image, state.mimeType);
      if (displayImage !== currentSrc) {
        setDisplayImage(currentSrc);
      }
    } else if (isComparisonMode && !displayImage && state.history.length > 0) {
      // Fallback: Try to recover from history if for some reason state.image is empty but history exists
      const item = state.history[state.selectedHistoryIndex];
      if (item) {
        setDisplayImage(getImageSrc(item.originalImage, item.mimeType));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isComparisonMode, state.image, state.mimeType, state.history, state.selectedHistoryIndex]);





  const handleSelectKey = async () => {
    setIsKeyModalOpen(true);
  };



  const handleFileSelected = (base64Data: string, aspectRatio: string, mimeType: string, duration?: number, extractedPrompt?: string) => {
    setDisplayImage(`data:${mimeType};base64,${base64Data}`);
    setState(prev => ({
      ...INITIAL_STATE,
      history: prev.history,
      generatedImages: prev.generatedImages, // Keep history images
      selectedHistoryIndex: -1, // Reset selection to show source image by default
      image: base64Data,
      mimeType: mimeType,
      videoAnalysisDuration: duration || null,
      isProcessing: false,
      activeRole: null,
      detectedAspectRatio: aspectRatio,
      // Auto-populate prompt if extracted from PNG metadata
      editablePrompt: extractedPrompt || ''
    }));
    setActiveTab('STUDIO');
    isPipelineRunning.current = false;

    // Notify user if prompt was extracted
    if (extractedPrompt) {
      showToast(t('toast.promptExtracted'), 'success');
    }
  };

  const handleStartPipeline = () => {
    setState(prev => ({ ...prev, isProcessing: true }));
  };

  function handleReset() {
    setDisplayImage(null);
    setUploaderKey(prev => prev + 1); // Force ImageUploader to remount
    // 新建任务：只清空提示词和分析结果，保留历史记录和生成的图片
    setState(prev => ({
      ...INITIAL_STATE,
      history: prev.history,
      generatedImages: prev.generatedImages,
      generatedImage: null,
      selectedHistoryIndex: -1,
      currentGroupId: crypto.randomUUID()
    }));
    clearCurrentTask(); // Clear cache when starting new task
    clearSnapshot(); // Clear snapshot for fresh start
  };

  const handleAnalyzeLayout = async () => {
    if (!state.image || state.isAnalyzingLayout) return;
    setState(prev => ({ ...prev, isAnalyzingLayout: true }));
    try {
      const boxes = await detectLayout(state.image);
      setState(prev => ({ ...prev, layoutData: boxes, isAnalyzingLayout: false }));
      showToast(t('toast.layoutComplete'), "success");
    } catch (e) {
      setState(prev => ({ ...prev, isAnalyzingLayout: false }));
      showToast(t('toast.layoutFailed'), "error");
    }
  };

  const handleTranslatePrompt = async (target: 'CN' | 'EN') => {
    if (state.promptCache[target]) {
      setState(prev => ({ ...prev, editablePrompt: prev.promptCache[target] }));
      setCurrentLang(target);
      return;
    }
    showToast(`正在切换至 ${target === 'EN' ? '英文 MJ 模式' : '中文工程模式'}...`);
    try {
      const translated = await translatePrompt(state.editablePrompt, target);
      setState(prev => ({
        ...prev,
        editablePrompt: translated,
        promptCache: { ...prev.promptCache, [target]: translated }
      }));
      pushPromptHistory(translated, target === 'EN' ? t('history.reverse') : t('history.reverse'));
      setCurrentLang(target);
    } catch (e) { showToast(t('toast.translateFailed'), "error"); }
  };



  // Helper to execute the currently selected Reverse Mode
  const executeReverseAction = () => {
    if (selectedReverseMode === 'quick-auto') {
      handleQuickReverse(true);
    } else if (selectedReverseMode === 'quick-prompt') {
      handleQuickReverse(false);
    } else {
      // Full Reverse Modes
      const autoGenerate = selectedReverseMode === 'full-auto';

      const hasContent = state.results[AgentRole.AUDITOR]?.content?.trim() ||
        state.results[AgentRole.DESCRIPTOR]?.content?.trim() ||
        state.results[AgentRole.ARCHITECT]?.content?.trim();

      if (!hasContent) {
        if (state.image) {
          autoGenerateAfterPipeline.current = autoGenerate; // Set flag
          handleStartPipeline();
        } else {
          showToast(t('toast.pleaseUploadImage'), 'error');
        }
      } else {
        // If content exists, regenerate Synthesizer
        autoGenerateAfterPipeline.current = autoGenerate; // Set flag
        handleRegenerateAgent(AgentRole.SYNTHESIZER);
      }
    }
  };

  // Helper to get button label
  const getReverseButtonLabel = () => {
    switch (selectedReverseMode) {
      case 'quick-prompt': return '快速逆向-提示词';
      case 'full-prompt': return '完整逆向-提示词';
      case 'full-auto': return '完整逆向';
      case 'quick-auto': return '快速逆向';
      default: return 'Reverse';
    }
  };

  const handleRunQA = async () => {
    if (!state.image || !state.generatedImage || state.isRefining) return;
    setState(prev => ({ ...prev, isRefining: true, suggestions: [], selectedSuggestionIndices: [] }));
    let qaContent = "";
    try {
      const stream = streamConsistencyCheck(state.image, state.generatedImage);
      for await (const chunk of stream) {
        qaContent += chunk;
        setState(prev => ({ ...prev, results: { ...prev.results, [AgentRole.CRITIC]: { ...prev.results[AgentRole.CRITIC], content: qaContent } } }));
      }
      const parsed = parseSuggestions(qaContent);
      setState(prev => ({
        ...prev, isRefining: false, suggestions: parsed, selectedSuggestionIndices: parsed.map((_, i) => i),
        results: { ...prev.results, [AgentRole.CRITIC]: { ...prev.results[AgentRole.CRITIC], isStreaming: false, isComplete: true } }
      }));
    } catch (e) {
      setState(prev => ({ ...prev, isRefining: false }));
      showToast(t('toast.qaFailed'), "error");
    }
  };

  const handleAutoFix = async () => {
    const selectedText = state.suggestions.filter((_, i) => state.selectedSuggestionIndices.includes(i)).join('; ');
    if (!selectedText || state.isRefiningPrompt) return;
    setState(prev => ({ ...prev, isRefiningPrompt: true }));
    try {
      const refImg = state.useReferenceImage ? state.image : null;
      const newPrompt = await refinePromptWithFeedback(state.editablePrompt, selectedText, refImg, state.mimeType);
      setState(prev => ({
        ...prev, editablePrompt: newPrompt, isRefiningPrompt: false,
        promptCache: { CN: '', EN: '' }
      }));
      pushPromptHistory(newPrompt, t('history.applyRefinement'));
      showToast(t('toast.appliedRefinement'), "success");
    } catch (e) {
      setState(prev => ({ ...prev, isRefiningPrompt: false }));
      showToast(t('toast.applyRefinementFailed'), "error");
    }
  };





  // Handler to delete a history item by index
  const handleDeleteHistoryItem = useCallback(async (index: number) => {
    // 1. Get the item to delete
    const itemToDelete = state.history[index];
    if (!itemToDelete) return;

    // 2. EDGE CASE: Temporary Snapshot Item
    if (itemToDelete.id === 'snapshot-temp') {
      clearSnapshot();
      setState(prev => ({ ...prev, history: [], generatedImages: [], generatedImage: null, image: null, selectedHistoryIndex: 0 }));
      return;
    }

    // 3. Fire-and-forget DB deletion
    if (itemToDelete.id) {
      deleteHistoryItemById(itemToDelete.id).catch(e => console.error('Failed to delete history item:', e));
    }

    // 4. Calculate New State & Fetch Next Data
    const prevHistory = state.history;
    const newHistory = [...prevHistory];
    newHistory.splice(index, 1);

    // Determine new index
    // Determine new index (Prefer Next)
    let newIndex = state.selectedHistoryIndex;
    if (index < state.selectedHistoryIndex) {
      newIndex = Math.max(0, state.selectedHistoryIndex - 1);
    } else if (index === state.selectedHistoryIndex) {
      // Stay at index (next item), but fallback if we were last
      newIndex = Math.min(index, newHistory.length - 1);
      newIndex = Math.max(0, newIndex);
    }

    // 5. Fetch Full Data for the *New* Selected Item (if safe)
    let nextFullItem: HistoryItem | null | undefined = newHistory[newIndex];
    if (nextFullItem && (!nextFullItem.generatedImage) && nextFullItem.id) {
      try {
        // Show ephemeral loading state if needed, or just wait
        const fetched = await getHistoryItemById(nextFullItem.id);
        if (fetched) nextFullItem = fetched;
      } catch (e) {
        console.warn('Failed to fetch next item after delete', e);
      }
    }

    // 6. Atomic State Update
    setState(prev => {
      // Re-clone to be safe against intervening updates (though usually fine in callback)
      const currentHistory = [...prev.history];
      const currentImages = [...prev.generatedImages];

      // Double check bounds in case state changed
      if (index < currentHistory.length) {
        currentHistory.splice(index, 1);
        currentImages.splice(index, 1);
      }

      return {
        ...prev,
        history: currentHistory,
        generatedImages: currentImages,
        selectedHistoryIndex: newIndex,
        // Use the fetched full item
        image: nextFullItem?.originalImage || null,
        generatedImage: nextFullItem?.generatedImage || null,
        mimeType: nextFullItem?.mimeType || 'image/png'
      };
    });

    showToast(t('toast.deleted'), 'success');
  }, [state.history, state.selectedHistoryIndex, showToast, t]);

  const handleHistoryContextMenu = useCallback(async (e: React.MouseEvent, index: number) => {
    e.preventDefault();

    let item = state.history[index];
    if (!item) return;

    // Lightweight check: If image is missing but ID exists, fetch full item
    if ((!item.generatedImage && !item.originalImage) && item.id) {
      // showToast(t('toast.loading'), 'info', 500);
      const fetched = await getHistoryItemById(item.id);
      if (fetched) {
        item = fetched;
      }
    }

    const targetImage = item.generatedImage || item.originalImage;

    if (targetImage) {
      setDisplayImage(getImageSrc(targetImage, item.mimeType || 'image/png'));
      setIsComparisonMode(true);
      // showToast(t('toast.addedToComparison'), 'success');
    }
  }, [state.history, t, showToast]);

  // Handler to download original image
  const handleDownloadHD = async (index: number) => {
    // Get original image from history (not from generatedImages which now contains thumbnails)
    const historyItem = state.history[index];
    if (!historyItem?.generatedImage) {
      showToast(t('toast.noValidImage'), 'error');
      return;
    }

    let imageBase64 = historyItem.generatedImage;

    // Convert to PNG if it's a JPEG (starts with /9j/ in base64)
    if (imageBase64.startsWith('/9j/')) {
      try {
        const img = new Image();
        img.src = `data:image/jpeg;base64,${imageBase64}`;
        await new Promise((resolve) => { img.onload = resolve; });

        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          // Convert to PNG base64 (remove prefix)
          const pngDataUrl = canvas.toDataURL('image/png');
          imageBase64 = pngDataUrl.split(',')[1];
          console.log('[Download] Converted JPEG to PNG for metadata embedding');
        }
      } catch (e) {
        console.error('Failed to convert JPEG to PNG:', e);
      }
    }

    // Get prompt from history item or current editable prompt
    const prompt = historyItem?.prompt || state.editablePrompt;

    // Embed prompt in PNG metadata for SD/Eagle compatibility
    if (prompt) {
      try {
        imageBase64 = embedPromptInPng(imageBase64, prompt);
      } catch (e) {
        console.warn('Failed to embed prompt metadata:', e);
      }
    }

    // Create download link
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${imageBase64}`;
    link.download = `generated-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(t('toast.imageDownloaded'), 'success');
  };

  // Handler to regenerate a single agent
  const handleRegenerateAgent = async (role: AgentRole) => {
    if (!state.image || state.isProcessing) return;

    // Build context from previous agents
    let accumulatedContext = `[Ratio: ${state.detectedAspectRatio}]`;
    for (const r of PIPELINE_ORDER) {
      if (r === role) break;
      if (state.results[r]?.content) {
        accumulatedContext += `\n\n--- ${r} ---\n${state.results[r].content}\n`;
      }
    }

    setState(prev => ({
      ...prev,
      activeRole: role,
      results: { ...prev.results, [role]: { ...prev.results[role], content: '', isStreaming: true, isComplete: false } }
    }));

    try {
      let agentContent = "";
      const stream = streamAgentAnalysis(role, state.image, accumulatedContext, state.mimeType);
      for await (const chunk of stream) {
        agentContent += chunk;
        setState(prev => ({ ...prev, results: { ...prev.results, [role]: { ...prev.results[role], content: agentContent } } }));
      }
      setState(prev => ({ ...prev, activeRole: null, results: { ...prev.results, [role]: { ...prev.results[role], isStreaming: false, isComplete: true } } }));

      // If regenerating SYNTHESIZER, update the editable prompt
      if (role === AgentRole.SYNTHESIZER) {
        setState(prev => ({
          ...prev,
          editablePrompt: agentContent,
          promptCache: { ...prev.promptCache, CN: agentContent }
        }));
        pushPromptHistory(agentContent, '重新生成');
      }
      showToast(`${AGENTS[role].name.split(' ')[0]} 重新生成完成`, 'success');
    } catch (e) {
      setState(prev => ({ ...prev, activeRole: null, results: { ...prev.results, [role]: { ...prev.results[role], isStreaming: false } } }));
      showToast('重新生成失败', 'error');
    }
  };



  // Chat handlers
  const handleChatSendMessage = async (message: string, options?: { autoGenerate?: boolean }) => {
    // Add user message
    const userMsg = createUserMessage(message);
    setChatMessages(prev => [...prev, userMsg]);
    setIsChatProcessing(true);

    try {
      const skillType = detectSkillIntent(message);

      if (skillType === 'quality-check') {
        // Execute quality check skill
        if (!state.image || !state.generatedImage) {
          setChatMessages(prev => [...prev, createAssistantMessage(t('chat.pleaseGenerateFirst'))]);
        } else {
          const streamingMsg = createAssistantMessage(t('chat.executingQA'), true);
          setChatMessages(prev => [...prev, streamingMsg]);

          const { content, suggestions } = await executeQualityCheck(
            state.image,
            state.generatedImage,
            (streamContent) => {
              setChatMessages(prev => prev.map(m =>
                m.id === streamingMsg.id ? { ...m, content: streamContent } : m
              ));
            }
          );

          // Replace streaming message with skill result
          setChatMessages(prev => {
            const filtered = prev.filter(m => m.id !== streamingMsg.id);
            return [...filtered, createSkillResultMessage('quality-check', content, suggestions)];
          });
        }
      } else if (skillType === 'reverse') {
        // Reverse engineering skill
        if (!state.image) {
          setChatMessages(prev => [...prev, createAssistantMessage(t('chat.uploadImageFirst'))]);
        } else {
          const streamingMsg = createAssistantMessage(t('chat.generatingImages'), true);
          setChatMessages(prev => [...prev, streamingMsg]);

          try {
            const { content, suggestions } = await executeReverseSkill(state.image, state.mimeType);

            setChatMessages(prev => {
              const filtered = prev.filter(m => m.id !== streamingMsg.id);
              return [...filtered, createSkillResultMessage('reverse', content, suggestions)];
            });
          } catch (e) {
            setChatMessages(prev => [...prev.filter(m => m.id !== streamingMsg.id), createAssistantMessage('分析失败，请重试。')]);
          }
        }
      } else if (skillType === 'refine') {
        // Treat as refinement request
        const streamingMsg = createAssistantMessage('正在修改提示词...', true);
        setChatMessages(prev => [...prev, streamingMsg]);

        const newPrompt = await executeRefineSkill(state.editablePrompt, message, null, state.mimeType);

        setState(prev => ({ ...prev, editablePrompt: newPrompt, promptCache: { CN: '', EN: '' } }));
        pushPromptHistory(newPrompt, '对话修订');

        setChatMessages(prev => prev.map(m =>
          m.id === streamingMsg.id ? { ...m, content: '已根据你的建议修改了提示词，请查看左侧编辑器。', isStreaming: false } : m
        ));

        // Auto Generate if requested via options
        if (options?.autoGenerate) {
          handleGenerateImage(newPrompt);
        }

      } else if (skillType === 'generate') {
        setChatMessages(prev => [...prev, createAssistantMessage(t('chat.generatingImages'))]);
        handleGenerateImage();
      } else if (skillType === 'translate') {
        setChatMessages(prev => [...prev, createAssistantMessage(t('chat.translating'))]);
        handleTranslatePrompt(currentLang === 'CN' ? 'EN' : 'CN');
      } else {
        setChatMessages(prev => [...prev, createAssistantMessage(t('chat.help'))]);
      }
    } catch (e) {
      setChatMessages(prev => [...prev, createAssistantMessage('抱歉，处理出错了。请重试。')]);
    }

    setIsChatProcessing(false);
  };

  const handleApplySuggestions = async (messageId: string, indices: number[]) => {
    const msg = chatMessages.find(m => m.id === messageId);
    if (!msg || !msg.suggestions) return;

    const selectedText = msg.suggestions.filter((_, i) => indices.includes(i)).join('; ');
    if (!selectedText) return;

    // Special handling for Reverse skill: Replace prompt directly
    if (msg.skillType === 'reverse') {
      setState(prev => ({ ...prev, editablePrompt: selectedText }));
      pushPromptHistory(selectedText, '逆向生成');
      setChatMessages(prev => prev.map(m => m.id === messageId ? { ...m, applied: true } : m));
      showToast('已应用生成的提示词', 'success');
      return;
    }

    const refImg = state.useReferenceImage ? state.image : null;
    const newPrompt = await refinePromptWithFeedback(state.editablePrompt, selectedText, refImg, state.mimeType);

    setState(prev => ({ ...prev, editablePrompt: newPrompt, promptCache: { CN: '', EN: '' } }));
    pushPromptHistory(newPrompt, '应用建议');

    // Mark message as applied
    setChatMessages(prev => prev.map(m =>
      m.id === messageId ? { ...m, applied: true } : m
    ));

    showToast('已应用所选建议', 'success');
  };

  const handleToggleSuggestion = (messageId: string, index: number) => {
    setChatMessages(prev => prev.map(m => {
      if (m.id !== messageId) return m;
      const current = m.selectedIndices || [];
      const newIndices = current.includes(index)
        ? current.filter(i => i !== index)
        : [...current, index];
      return { ...m, selectedIndices: newIndices };
    }));
  };

  const handleGalleryEdit = (index: number) => {
    loadHistoryItem(index);
    setIsGalleryOpen(false);
    setActiveTab('STUDIO');
  };

  if (showLanding) return <LandingPage onEnterApp={() => setShowLanding(false)} hasKey={hasKey} onSelectKey={handleSelectKey} />;

  // Keyboard shortcuts
  useKeyboardShortcuts({
    setIsGalleryOpen,
    setIsHelpOpen,
    handleReset,
    toggleComparison: () => {
      const next = !isComparisonMode;
      setIsComparisonMode(next);
      // Ensure display image is set for comparison
      if (next && !displayImage && state.image) {
        setDisplayImage(getImageSrc(state.image, state.mimeType));
      }
    },
    setIsPromptLabOpen,
    showProgressView,
    setShowProgressView,
    areModalsOpen: isGalleryOpen || isHelpOpen || isKeyModalOpen || !!fullscreenImg || isDeleteConfirmOpen,
    handleDelete: () => {
      // Global shortcut always targets the currently selected background item
      // BUT if Gallery is open, the gallery handles its own shortcuts via event capturing.
      // However, useKeyboardShortcuts checks areModalsOpen.
      // Since isGalleryOpen makes areModalsOpen true, this block is actually NOT reached when Gallery is open.
      // So this ONLY handles the main view deletion.
      if (state.history.length > 0 && state.selectedHistoryIndex >= 0) {
        setDeleteTargetIndex(state.selectedHistoryIndex);
        setIsDeleteConfirmOpen(true);
      }
    }
  });

  const requestDelete = (index: number) => {
    setDeleteTargetIndex(index);
    setIsDeleteConfirmOpen(true);
  };

  // Scroll selected history item into view
  useEffect(() => {
    if (state.generatedImages.length > 0) {
      const el = document.getElementById(`history-item-${state.selectedHistoryIndex}`);
      const container = scrollContainerRef.current;

      if (el && container) {
        const itemRect = el.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        const distRight = itemRect.right - containerRect.right;
        const distLeft = containerRect.left - itemRect.left;
        const width = container.clientWidth;

        // Simplified Logic: Always ensure visibility with context
        if (distRight > 2 || distLeft > 2) {
          // If the jump is large (more than 2 pages), snap instantly to avoid disorientation
          const isDeepJump = distRight > width * 2 || distLeft > width * 2;

          el.scrollIntoView({
            behavior: isDeepJump ? 'auto' : 'smooth',
            block: 'nearest',
            inline: 'center'
          });
        }
      }
    }
  }, [state.selectedHistoryIndex, state.generatedImages.length]);

  return (
    <div className="min-h-screen bg-black text-stone-200 font-sans selection:bg-stone-700 overflow-hidden">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      {/* Lazy-loaded modals with Suspense fallback */}
      <React.Suspense fallback={null}>
        <DeleteConfirmModal
          isOpen={isDeleteConfirmOpen}
          onClose={() => setIsDeleteConfirmOpen(false)}
          onConfirm={() => {
            if (deleteTargetIndex >= 0) {
              handleDeleteHistoryItem(deleteTargetIndex);
            }
          }}
        />
        <DocumentationModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
        <ApiKeyModal isOpen={isKeyModalOpen} onClose={() => setIsKeyModalOpen(false)} />
        <PromptLabModal isOpen={isPromptLabOpen} onClose={() => setIsPromptLabOpen(false)} />
      </React.Suspense>

      {/* Hidden file input for A shortcut (add reference image) */}
      <input
        type="file"
        id="reference-image-input"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = e.target.files;
          if (files && files.length > 0) {
            Promise.all(Array.from(files).filter(f => f.type.startsWith('image/')).map(file =>
              new Promise<ReferenceImage>((resolve) => {
                const reader = new FileReader();
                reader.onload = (ev) => {
                  const image = new Image();
                  image.onload = () => {
                    const ratio = image.naturalWidth / image.naturalHeight;
                    resolve({
                      id: crypto.randomUUID(),
                      url: ev.target?.result as string,
                      name: file.name,
                      mimeType: file.type,
                      aspectRatio: ratio >= 1.7 ? '16:9' : ratio <= 0.6 ? '9:16' : ratio >= 1.3 ? '4:3' : ratio <= 0.8 ? '3:4' : '1:1'
                    });
                  };
                  image.src = ev.target?.result as string;
                };
                reader.readAsDataURL(file);
              })
            )).then(newImages => {
              setState(prev => ({
                ...prev,
                referenceImages: [...prev.referenceImages, ...newImages]
              }));
            });
          }
          e.target.value = ''; // Reset for subsequent uploads
        }}
      />

      <React.Suspense fallback={null}>
        <GalleryModal
          isOpen={isGalleryOpen}
          onClose={() => setIsGalleryOpen(false)}
          images={state.generatedImages}
          history={state.history}
          prompts={state.history.map(h => h.prompt)}
          onDownload={handleDownloadHD}
          onEdit={handleGalleryEdit}
          onDelete={requestDelete}
          onAddToComparison={(index) => {
            const imgUrl = getOriginalFromHistory(state.history, index);
            setDisplayImage(imgUrl);
            setIsComparisonMode(true);
          }}
        />
      </React.Suspense>

      {/* Global Drag Overlay Removed */}

      {/* Fullscreen Detail Viewer - 条件渲染避免不必要的hook执行 */}
      {fullscreenImg && (
        <ImageDetailViewer
          isOpen={true}
          onClose={() => { setFullscreenImg(null); setIsFullscreenComparison(false); }}
          mode={isFullscreenComparison ? 'comparison' : 'single'}
          currentImage={isFullscreenComparison
            ? getOriginalFromHistory(state.history, state.selectedHistoryIndex)
            : fullscreenImg}
          comparisonImage={displayImage || undefined}
          images={[]} // 临时移除导航功能以排查性能问题
          currentIndex={state.selectedHistoryIndex}
        />
      )}

      <nav className="fixed top-0 left-0 right-0 z-50 bg-stone-950/90 backdrop-blur-md border-b border-stone-800 h-16 flex items-center justify-between px-10">
        <div className="flex items-center gap-3">
          <span className="font-serif font-bold text-xl tracking-tight text-stone-200">UnImage <span className="text-orange-500 text-sm align-top">PRO</span></span>
        </div>

        {/* 全局进度条 */}
        {pipelineProgress?.isRunning && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-emerald-500 z-50 transition-all duration-300"
            style={{ width: `${pipelineProgress.totalProgress}%` }}
          />
        )}
        <div className="flex items-center gap-2">
          <StorageIndicator />
          <button onClick={() => setIsPromptLabOpen(true)} className="p-2.5 rounded-full hover:bg-stone-800 text-stone-400 hover:text-amber-500 transition-all" title="Prompt Lab"><Icons.Wand2 size={20} /></button>
          <button
            onClick={() => {
              const newLang = language === 'CN' ? 'EN' : 'CN';
              setLanguage(newLang);
            }}
            className="p-2.5 rounded-full hover:bg-stone-800 text-stone-400 hover:text-orange-500 transition-all group"
            title={language === 'CN' ? 'Switch Language' : '切换语言'}
          >
            <div className="relative">
              <Icons.Languages size={20} />
              <span className="absolute -top-1.5 -right-1.5 bg-orange-500 text-white text-[7px] font-black px-0.5 rounded-[2px] uppercase leading-none border border-stone-950 group-hover:bg-orange-600 transition-colors">
                {language}
              </span>
            </div>
          </button>
          <button onClick={() => setIsGalleryOpen(true)} className="p-2.5 rounded-full hover:bg-stone-800 text-stone-400 hover:text-violet-500 transition-all" title="相册"><Icons.LayoutGrid size={20} /></button>
          <button onClick={() => setIsHelpOpen(true)} className="p-2.5 rounded-full hover:bg-stone-800 text-stone-400 hover:text-orange-500 transition-all" title="帮助文档"><Icons.Help size={20} /></button>
          <button
            onClick={() => {
              const newState = toggleSound();
              showToast(newState ? t('nav.sound.enabled') : t('nav.sound.disabled'));
            }}
            className={`p-2.5 rounded-full hover:bg-stone-800 transition-all ${soundEnabled ? 'text-blue-500' : 'text-stone-500'}`}
            title={soundEnabled ? t('nav.sound.enabled') : t('nav.sound.disabled')}
          >
            {soundEnabled ? <Icons.Volume2 size={20} /> : <Icons.VolumeX size={20} />}
          </button>
          <div className="w-px h-6 bg-stone-800 mx-1" />
          <div className="flex items-center gap-2 mr-2">
            <button
              onClick={handleSwitchApiMode}
              title="点击切换 API 模式 (Click to Switch)"
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border cursor-pointer hover:bg-stone-800 active:scale-95 transition-all ${apiMode === 'official'
                ? 'border-orange-500/30 text-orange-500'
                : apiMode === 'volcengine-cn'
                  ? 'border-cyan-500/30 text-cyan-400'
                  : apiMode === 'volcengine'
                    ? 'border-blue-600/30 text-blue-500'
                    : 'border-blue-500/30 text-blue-500'
                }`}
            >
              {apiMode === 'official' ? t('api.official') : (apiMode === 'volcengine-cn' ? '火山引擎 CN' : (apiMode === 'volcengine' ? '海外火山' : t('api.custom')))}
            </button>
          </div>
          <button onClick={handleSelectKey} className={`p-2.5 rounded-full hover:bg-stone-800 ${hasKey ? 'text-emerald-500' : 'text-stone-500'}`} title={t('api.keyStatus')}><Icons.Key size={20} /></button>
        </div>
      </nav>

      <main ref={mainRef} className={`fixed top-20 bottom-28 left-4 right-4 flex gap-0 z-0 overflow-hidden ${(isDraggingDivider || isDraggingRightDivider) ? 'select-none' : ''}`}>
        {/* Left Panel: Image Display & Divider */}
        <MainVisualizer
          width={leftPanelWidth}
          isDraggingDivider={isDraggingDivider}
          onResizeStart={() => setIsDraggingDivider(true)}
          generatedImages={state.generatedImages || []} // FIX: Ensure array
          selectedHistoryIndex={state.selectedHistoryIndex}
          history={state.history || []} // FIX: Ensure array
          currentGeneratedImage={state.generatedImage} // PASS FULL RES IMAGE HERE
          layoutData={state.layoutData}
          isAnalyzingLayout={state.isAnalyzingLayout}
          isProcessing={state.isProcessing}
          displayImage={displayImage}
          isComparisonMode={isComparisonMode}
          setIsComparisonMode={setIsComparisonMode}
          imageZoom={imageZoom}
          handleZoomChange={handleZoomChange}
          setFullscreenImg={setFullscreenImg}
          setIsFullscreenComparison={setIsFullscreenComparison}
          isDraggingNewImage={isDraggingNewImage}
          setIsDraggingNewImage={setIsDraggingNewImage}
          uploaderKey={uploaderKey}
          handleFileSelected={handleFileSelected}
          handleReset={handleReset}
          handleDownloadHD={handleDownloadHD}
          showToast={showToast}
        />

        {/* Right Panel: Agent Workbench */}
        <AgentWorkbench
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          state={state}
          setState={setState}
          pipelineProgress={pipelineProgress}
          handleRegenerateAgent={handleRegenerateAgent}
          studioContent={
            <PromptStudio
              state={state}
              setState={setState}
              pipelineProgress={pipelineProgress}
              showProgressView={showProgressView}
              isPipelineRunning={isPipelineRunning}
              promptHistory={promptHistory}
              handleFileSelected={handleFileSelected}
              handleAnalyzeLayout={handleAnalyzeLayout}
              handleTranslatePrompt={handleTranslatePrompt}
              handleGenerateImage={handleGenerateImage}
              handleStartPipeline={handleStartPipeline}
              handleQuickReverse={handleQuickReverse}
              handleRegenerateAgent={handleRegenerateAgent}
              autoGenerateAfterPipelineRef={autoGenerateAfterPipeline}
              handleChatSendMessage={handleChatSendMessage}
              handleSetApiMode={handleSetApiMode}
              setIsChatDrawerOpen={setIsChatDrawerOpen}
              isChatDrawerOpen={isChatDrawerOpen}
              isChatProcessing={isChatProcessing}
              chatMessages={chatMessages} // Added prop
              setFullscreenImg={setFullscreenImg}
              handleStopGeneration={handleStopGeneration}
              activeModelName={activeModelName}
              apiMode={apiMode}
              is4K={is4K}
              setIs4K={setIs4K}
              selectedAspectRatio={selectedAspectRatio}
              setSelectedAspectRatio={setSelectedAspectRatio}
              resetPipeline={resetPipeline}
              setShowProgressView={setShowProgressView}
              showToast={showToast}
              isHistoryDropdownOpen={isHistoryDropdownOpen}
              setIsHistoryDropdownOpen={setIsHistoryDropdownOpen}
              hoveredHistoryIndex={hoveredHistoryIndex}
              setHoveredHistoryIndex={setHoveredHistoryIndex}
            />
          }
        />


      </main>



      {/* Persistence History Bottom Bar */}
      {/* Persistence History Bottom Bar */}
      <div className="group/historybar fixed bottom-0 left-0 right-0 h-24 bg-stone-950/90 backdrop-blur-md border-t border-stone-800 z-40 transform transition-transform duration-300 ease-in-out flex items-center shadow-[0_-4px_20px_rgba(0,0,0,0.2)]">
        {/* Hover Reveal Tab (The "Ear") */}
        <div
          onClick={() => setIsGalleryOpen(true)}
          className="absolute left-1/2 -translate-x-1/2 top-0 h-6 w-32 bg-stone-950/95 border-x border-t border-stone-800 rounded-t-2xl flex items-center justify-center cursor-pointer transition-all duration-300 ease-out opacity-0 translate-y-0 group-hover/historybar:-translate-y-full group-hover/historybar:opacity-100 z-[-1]"
          title={t('gallery.openHoverTab')}
        >
          <Icons.ChevronUp size={16} className="text-stone-500 animate-pulse" />
        </div>
        {/* History List - Full Width */}
        {state.generatedImages.length === 0 ? (
          <div className="w-full flex items-center justify-center text-stone-600 gap-2">
            <Icons.Image size={24} strokeWidth={1.5} />
            <span className="text-xs font-medium">{t('history.noRecords')}</span>
          </div>
        ) : (
          <div ref={scrollContainerRef} className="flex-1 flex items-center gap-1 overflow-x-auto overflow-y-hidden w-full h-full py-2 custom-scrollbar px-6">
            {state.history.map((item, index) => (
              <div key={index} id={`history-item-${index}`} className="flex-shrink-0 w-20 h-20 relative">
                <HistoryThumbnail
                  imageUrl={item.generatedImageThumb ? `data:image/png;base64,${item.generatedImageThumb}` : (item.generatedImage ? `data:image/png;base64,${item.generatedImage}` : '')}
                  index={index}
                  isActive={index === state.selectedHistoryIndex}
                  onClick={loadHistoryItem}
                  onDelete={handleDeleteHistoryItem}
                  status={item.status}
                  onContextMenu={handleHistoryContextMenu}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;