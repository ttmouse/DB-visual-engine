
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
import { ToastContainer } from './components/Toast';
import { useToast } from './hooks/useToast';
import { StorageIndicator } from './components/StorageIndicator';
import { Icons } from './components/Icons';
import { streamAgentAnalysis, generateImageFromPrompt, streamConsistencyCheck, refinePromptWithFeedback, detectLayout, translatePrompt, executeSmartAnalysis, configureClient, configureModels, getModeDefaultModels } from './services/geminiService';
import { saveHistoryItem, getHistory, deleteHistoryItemById } from './services/historyService';
import { detectSkillIntent, createUserMessage, createAssistantMessage, createSkillResultMessage, executeQualityCheck, executeRefineSkill, executeReverseSkill } from './services/chatService';
import { promptManager, PromptVersion } from './services/promptManager';
import { saveCurrentTask, loadCurrentTask, clearCurrentTask } from './services/cacheService';
import { runLazyMigration } from './services/migrationService';
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
import { DocumentationModal } from './components/DocumentationModal';
import { ApiKeyModal } from './components/ApiKeyModal';
import { PromptLabModal } from './components/PromptLabModal';
import { GalleryModal } from './components/GalleryModal';
import { PromptStudio } from './components/PromptStudio';
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




const App: React.FC = () => {
  const { language, t, setLanguage } = useI18n();
  const [isPending, startTransition] = useTransition(); // 用于非阻塞状态更新
  const [showLanding, setShowLanding] = useState(false);

  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [displayImage, setDisplayImage] = useState<string | null>(null);
  const [uploaderKey, setUploaderKey] = useState(0); // Key to force ImageUploader remount
  const { toasts, showToast, removeToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('STUDIO');

  /* Existing state declarations */
  // ...
  const { apiMode, setApiMode, activeModelName, setActiveModelName, hasKey, setHasKey, switchApiMode } = useApiConfig();

  // App Initialization (History, Cache)
  useAppInitialization(setState, setDisplayImage, setShowLanding);

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
  const [isPromptLabOpen, setIsPromptLabOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState<'CN' | 'EN'>('CN');

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatProcessing, setIsChatProcessing] = useState(false);
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);

  // History Dropdown state
  const [isHistoryDropdownOpen, setIsHistoryDropdownOpen] = useState(false);
  const [hoveredHistoryIndex, setHoveredHistoryIndex] = useState<number | null>(null);



  // State for Reverse Mode selection (4 options)


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

  // Resizable left panel
  const {
    width: leftPanelWidth,
    isDragging: isDraggingDivider,
    setIsDragging: setIsDraggingDivider
  } = useResizablePanel(mainRef, {
    storageKey: 'unimage_left_panel_width',
    defaultValue: 50,
    min: 25,
    max: 75,
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
    defaultValue: 320,
    min: 200,
    max: 500,
    isPercentage: false,
    direction: 'right'
  });
  // Removed isGlobalDragging state as we use localized drop zones now
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const analyzeAbortRef = useRef<AbortController | null>(null);

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
  const [reverseMode, setReverseMode] = useState<'full' | 'quick'>('quick'); // 'full' = 完整4步骤, 'quick' = 单步快速逆向
  /* State migrated to PromptStudio */

  const [selectedAspectRatio, setSelectedAspectRatio] = useState('1:1'); // 选择的比例

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
  useEffect(() => {
    if (!state.image) return;

    const timeoutId = setTimeout(() => {
      try {
        saveCurrentTask({
          image: state.image,
          mimeType: state.mimeType,
          displayImage: displayImage,
          detectedAspectRatio: state.detectedAspectRatio,
          videoAnalysisDuration: state.videoAnalysisDuration,
          results: state.results,
          editablePrompt: state.editablePrompt,
          generatedImage: state.generatedImage,
          generatedImages: state.generatedImages,
          layoutData: state.layoutData,
          promptCache: state.promptCache,
          selectedHistoryIndex: state.selectedHistoryIndex,
          referenceImages: state.referenceImages
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
    state.editablePrompt, state.generatedImage, state.generatedImages.length,
    state.selectedHistoryIndex, displayImage
  ]);

  // Helper to load history item
  // Helper to load history item
  const loadHistoryItem = useCallback((index: number) => {
    // 1. Check if index is valid
    if (index < 0 || index >= historyRef.current.length) return;

    const historyItem = historyRef.current[index];
    if (!historyItem) return;

    // 2. Set selected index & Display Image (High Priority UI Update)
    // 优先更新 UI，让用户感觉到操作立即响应
    setSelectedHistoryIndex(index);
    // 在对比模式下，不更新 displayImage（左侧图），实现“锁定左侧，右侧切换”的扫描体验
    // 用户反馈：左键点击应总是还原该记录的“原图 vs 生成图”对比
    // Remove "Lock Left" logic to restore standard behavior
    if (historyItem.originalImage) {
      setDisplayImage(getImageSrc(historyItem.originalImage, historyItem.mimeType));
    } else {
      setDisplayImage(null);
    }

    // 3. Restore state (Deferred Update using startTransition)
    // 使用 startTransition 标记为低优先级更新，确保 UI 响应流畅
    startTransition(() => {
      setState(prev => ({
        ...prev,
        editablePrompt: historyItem.prompt,
        promptCache: { ...prev.promptCache, CN: historyItem.prompt },
        image: historyItem.originalImage,
        mimeType: historyItem.mimeType || 'image/png',
        detectedAspectRatio: historyItem.detectedAspectRatio || '1:1',
        generatedImage: historyItem.generatedImage
      }));
    });
  }, [isComparisonMode]); // 依赖 isComparisonMode，其他依赖使用 ref 或 setter 消除

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
  useKeyboardShortcuts({
    setIsGalleryOpen,
    setIsHelpOpen,
    handleReset,
    setIsComparisonMode,
    setIsPromptLabOpen,
    showProgressView,
    setShowProgressView,
    areModalsOpen: isGalleryOpen || isHelpOpen || isKeyModalOpen || !!fullscreenImg
  });

  // Sync displayImage when exiting comparison mode (恢复显示当前选中的图片的原始图)
  useEffect(() => {
    if (!isComparisonMode && state.history.length > 0) {
      const item = state.history[state.selectedHistoryIndex];
      if (item) setDisplayImage(getImageSrc(item.originalImage, item.mimeType));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isComparisonMode]); // 仅在模式切换时执行，避免普通切换时的冗余更新





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
  const executeReverseAction = (mode: ReverseModeConfig) => {
    if (mode === 'quick-auto') {
      handleQuickReverse(true);
    } else if (mode === 'quick-prompt') {
      handleQuickReverse(false);
    } else {
      // Full Reverse Modes
      const autoGenerate = mode === 'full-auto';

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



  const setSelectedHistoryIndex = useCallback((index: number) => {
    setState(prev => ({ ...prev, selectedHistoryIndex: index }));
  }, []);

  // Handler to delete a history item by index
  const handleDeleteHistoryItem = useCallback(async (index: number) => {
    const historyItem = historyRef.current[index];

    // Delete from IndexedDB if it exists
    if (historyItem?.id) {
      try {
        await deleteHistoryItemById(historyItem.id);
      } catch (e) {
        console.error('Failed to delete from DB:', e);
      }
    }

    // Remove from local state
    setState(prev => {
      const newGeneratedImages = [...prev.generatedImages];
      const newHistory = [...prev.history];

      newGeneratedImages.splice(index, 1);
      newHistory.splice(index, 1);

      // Adjust selected index if necessary
      let newSelectedIndex = prev.selectedHistoryIndex;
      if (index <= newSelectedIndex) {
        newSelectedIndex = Math.max(0, newSelectedIndex - 1);
      }
      if (newGeneratedImages.length === 0) {
        newSelectedIndex = 0;
      }

      return {
        ...prev,
        generatedImages: newGeneratedImages,
        history: newHistory,
        selectedHistoryIndex: newSelectedIndex,
        image: newHistory[newSelectedIndex]?.originalImage || null,
        generatedImage: newGeneratedImages[newSelectedIndex] || null
      };
    });

    showToast(t('toast.deleted'), 'success');
  }, [showToast, t]);

  const handleHistoryContextMenu = useCallback((e: React.MouseEvent, index: number) => {
    e.preventDefault();
    const item = historyRef.current[index];
    // User expects the clicked image (Thumbnail/Result) to be the comparison source
    // So prioritize Generated Image, fallback to Original Image
    const targetImage = item?.generatedImage || item?.originalImage;

    if (targetImage) {
      setDisplayImage(getImageSrc(targetImage, item?.mimeType || 'image/png'));
      setIsComparisonMode(true);
    }
  }, []);

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

  const handleSwitchApiMode = () => {
    switchApiMode();
    // Toast is handled in the hook or we can add one here
    // showToast(`Switched API Mode`, 'success');
  };

  const renderTabContent = () => {
    if (activeTab === 'STUDIO') {
      return (
        <PromptStudio
          state={state}
          setState={setState}
          pipelineProgress={pipelineProgress}
          showProgressView={showProgressView}
          isPipelineRunning={isPipelineRunning.current}
          handleFileSelected={handleFileSelected}
          handleAnalyzeLayout={handleAnalyzeLayout}
          handleTranslatePrompt={handleTranslatePrompt}
          handleGenerateImage={handleGenerateImage}
          handleStartPipeline={handleStartPipeline}
          executeReverseAction={executeReverseAction}
          handleChatSendMessage={handleChatSendMessage}
          setIsChatDrawerOpen={setIsChatDrawerOpen}
          isChatDrawerOpen={isChatDrawerOpen}
          isChatProcessing={isChatProcessing}
          setFullscreenImg={setFullscreenImg}
          handleStopGeneration={handleStopGeneration}
          activeModelName={activeModelName}
          apiMode={apiMode}
          handleSetApiMode={(mode) => {
            setApiMode(mode);
            showToast(`已切换到 ${mode} 模式`, 'success');
          }}
          is4K={is4K}
          setIs4K={setIs4K}
          selectedAspectRatio={selectedAspectRatio}
          setSelectedAspectRatio={setSelectedAspectRatio}
          resetPipeline={resetPipeline}
          setShowProgressView={setShowProgressView}
          showToast={showToast}
        />
      );
    }
    // Agent tabs (AUDITOR, DESCRIPTOR, ARCHITECT)
    return (
      <div className="h-full overflow-y-auto p-4 custom-scrollbar">
        <AgentCard
          config={AGENTS[activeTab as AgentRole]}
          result={state.results[activeTab as AgentRole]}
          isActive={state.activeRole === activeTab}
          isPending={!state.results[activeTab as AgentRole]?.content}
          onRegenerate={() => handleRegenerateAgent(activeTab as AgentRole)}
          onContentChange={(content) => setState(prev => ({
            ...prev,
            results: { ...prev.results, [activeTab]: { ...prev.results[activeTab as AgentRole], content } }
          }))}
          onCopy={() => {
            const content = state.results[activeTab as AgentRole]?.content;
            if (content) {
              navigator.clipboard.writeText(content);
              showToast('已复制', 'success');
            }
          }}
          onStartPipeline={activeTab === AgentRole.AUDITOR ? handleStartPipeline : undefined}
        />
      </div>
    );
  };

  const handleGalleryEdit = (index: number) => {
    loadHistoryItem(index);
    setIsGalleryOpen(false);
    setActiveTab('STUDIO');
  };

  if (showLanding) return <LandingPage onEnterApp={() => setShowLanding(false)} hasKey={hasKey} onSelectKey={handleSelectKey} />;

  return (
    <div className="min-h-screen bg-black text-stone-200 font-sans selection:bg-stone-700 overflow-hidden">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <DocumentationModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      <ApiKeyModal isOpen={isKeyModalOpen} onClose={() => setIsKeyModalOpen(false)} />
      <PromptLabModal isOpen={isPromptLabOpen} onClose={() => setIsPromptLabOpen(false)} />

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

      <ApiKeyModal isOpen={isKeyModalOpen} onClose={() => setIsKeyModalOpen(false)} />
      <PromptLabModal isOpen={isPromptLabOpen} onClose={() => setIsPromptLabOpen(false)} />
      <GalleryModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        images={state.generatedImages}
        history={state.history}
        prompts={state.history.map(h => h.prompt)}
        onDownload={handleDownloadHD}
        onEdit={handleGalleryEdit}
        onDelete={handleDeleteHistoryItem}
        onAddToComparison={(index) => {
          const imgUrl = getOriginalFromHistory(state.history, index);
          setDisplayImage(imgUrl);
          setIsComparisonMode(true);
          // showToast(t('gallery.addedToComparisonLeft'), 'success'); // 不需要提示，避免遮挡
        }}
      />

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
                : apiMode === 'volcengine'
                  ? 'border-blue-600/30 text-blue-500'
                  : 'border-blue-500/30 text-blue-500'
                }`}
            >
              {apiMode === 'official' ? t('api.official') : (apiMode === 'volcengine' ? '火山引擎' : t('api.custom'))}
            </button>
          </div>
          <button onClick={handleSelectKey} className={`p-2.5 rounded-full hover:bg-stone-800 ${hasKey ? 'text-emerald-500' : 'text-stone-500'}`} title={t('api.keyStatus')}><Icons.Key size={20} /></button>
        </div>
      </nav>

      <main ref={mainRef} className={`fixed top-24 bottom-28 left-8 right-8 max-w-[1920px] mx-auto flex gap-0 z-0 ${(isDraggingDivider || isDraggingRightDivider) ? 'select-none' : ''}`}>
        {/* Left Panel: Assets & References */}
        <div style={{ width: `${leftPanelWidth}%` }} className="flex flex-col h-full bg-stone-900 rounded-xl border border-stone-800 overflow-hidden shadow-sm">
          <PanelHeader title={t('panel.visualAssets')}>
            <div className="flex items-center gap-2">
              {state.generatedImages.length > 0 && (
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
                    onClick={() => handleDownloadHD(state.selectedHistoryIndex)}
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
            onDrop={(e) => {
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
            }}
          >
            {/* Drag overlay */}
            {isDraggingNewImage && displayImage && (
              <div className="absolute inset-0 z-50 bg-orange-500/20 backdrop-blur-sm flex items-center justify-center pointer-events-none">
                <div className="bg-orange-500 text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 shadow-xl">
                  <Icons.Upload size={18} />
                  拖放以开始新的逆向
                </div>
              </div>
            )}

            {!displayImage && !(state.generatedImages.length > 0 && state.selectedHistoryIndex >= 0) ? (
              <ImageUploader key={uploaderKey} onImageSelected={handleFileSelected} disabled={state.isProcessing} />
            ) : (
              <div className="w-full h-full flex flex-col animate-in fade-in duration-500">
                {state.generatedImages.length > 0 && state.selectedHistoryIndex >= 0 ? (
                  displayImage && isComparisonMode ? (
                    <ImageComparisonSlider
                      beforeImage={displayImage}
                      afterImage={getOriginalFromHistory(state.history, state.selectedHistoryIndex)}
                      beforeLabel={displayImage === getImageSrc(state.history[state.selectedHistoryIndex]?.originalImage, state.history[state.selectedHistoryIndex]?.mimeType) ? t('comparison.original') : t('comparison.selected')}
                      afterLabel={t('comparison.generated')}
                      className="w-full h-full border-0 rounded-none bg-stone-950/50"
                      layoutData={state.layoutData}
                      isAnalyzingLayout={state.isAnalyzingLayout}
                      onFullscreen={() => { setFullscreenImg(displayImage); setIsFullscreenComparison(true); }}
                      zoom={imageZoom}
                      onZoomChange={handleZoomChange}
                    />
                  ) : (
                    <ImageViewer
                      src={getOriginalFromHistory(state.history, state.selectedHistoryIndex)}
                      alt="Generated Result"
                      className="w-full h-full border-0 rounded-none bg-stone-950/50"
                      layoutData={state.layoutData}
                      isAnalyzingLayout={state.isAnalyzingLayout}
                      onFullscreen={() => setFullscreenImg(getOriginalFromHistory(state.history, state.selectedHistoryIndex))}
                      zoom={imageZoom}
                      onZoomChange={handleZoomChange}
                    />
                  )
                ) : displayImage ? (
                  <ImageViewer
                    src={displayImage}
                    alt="Source"
                    className="w-full h-full border-0 rounded-none bg-stone-950/50"
                    layoutData={state.layoutData}
                    isAnalyzingLayout={state.isAnalyzingLayout}
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
          onMouseDown={() => setIsDraggingDivider(true)}
          className={`w-2 cursor-col-resize flex items-center justify-center group hover:bg-stone-700/50 transition-colors ${isDraggingDivider ? 'bg-orange-500/30' : ''}`}
        >
          <div className={`w-0.5 h-12 rounded-full transition-colors ${isDraggingDivider ? 'bg-orange-500' : 'bg-stone-700 group-hover:bg-stone-500'}`} />
        </div>

        {/* Right Panel: Agent Workbench */}
        <div className="flex-1 flex flex-col h-full bg-stone-900 rounded-xl border border-stone-800 shadow-sm overflow-hidden relative">
          <PanelHeader title="Workbench">
            <div className="flex items-center bg-stone-800 p-0.5 rounded-lg">
              {['STUDIO', 'AUDITOR', 'DESCRIPTOR', 'ARCHITECT'].map((tid) => {
                const isStudio = tid === 'STUDIO';
                const roleKey = isStudio ? AgentRole.SYNTHESIZER : tid as AgentRole;
                const iconName = isStudio ? 'PenTool' : AGENTS[roleKey]?.icon;
                const IconComponent = Icons[iconName as keyof typeof Icons];
                const result = state.results[roleKey];
                const currentStepIndex = pipelineProgress?.currentStepIndex ?? -1;
                const isCurrentStep = pipelineProgress?.steps[currentStepIndex]?.role === roleKey && pipelineProgress.isRunning;

                // Short tab labels
                const tabLabels: Record<string, string> = {
                  'STUDIO': 'Studio',
                  'AUDITOR': '场景',
                  'DESCRIPTOR': '材质',
                  'ARCHITECT': '构图'
                };

                return (
                  <button
                    key={tid}
                    onClick={() => setActiveTab(tid as any)}
                    className={`relative px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 ${activeTab === tid ? 'bg-stone-600 shadow-sm text-stone-100' : 'text-stone-500 hover:text-stone-300'}`}
                  >
                    <div className={isCurrentStep ? 'text-blue-400 animate-pulse' : ''}>
                      {result?.isStreaming ? <Icons.RefreshCw size={12} className="animate-spin" /> : IconComponent && <IconComponent size={12} />}
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-tight">{tabLabels[tid]}</span>
                    {result?.isComplete && <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-emerald-500 rounded-full border border-stone-800" />}
                  </button>
                );
              })}
            </div>
          </PanelHeader>

          <div className="flex-1 min-h-0 bg-stone-900 relative">
            {!state.image && activeTab !== 'STUDIO' ? (
              <div className="h-full flex flex-col items-center justify-center text-stone-700 space-y-4">
                <Icons.Compass size={48} strokeWidth={1} className="animate-spin duration-10000 opacity-20" />
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-50">{t('chat.uploadImageFirst')}</p>
              </div>
            ) : renderTabContent()}
          </div>
        </div>


        {/* Third Column: Chat Panel (inline, not overlay) */}
        {isChatDrawerOpen && (
          <>
            {/* Draggable Divider for right panel */}
            <div
              onMouseDown={() => setIsDraggingRightDivider(true)}
              className={`w-2 cursor-col-resize flex items-center justify-center group hover:bg-stone-700/50 transition-colors ${isDraggingRightDivider ? 'bg-orange-500/30' : ''}`}
            >
              <div className={`w-0.5 h-12 rounded-full transition-colors ${isDraggingRightDivider ? 'bg-orange-500' : 'bg-stone-700 group-hover:bg-stone-500'}`} />
            </div>

            {/* Chat Column */}
            <div style={{ width: `${rightPanelWidth}px` }} className="flex-shrink-0 flex flex-col h-full bg-stone-900 rounded-xl border border-stone-800 overflow-hidden shadow-sm">
              <PanelHeader title="AI 助手">
                <button
                  onClick={() => setIsChatDrawerOpen(false)}
                  className="p-1.5 text-stone-500 hover:text-stone-300 transition-colors rounded-lg hover:bg-stone-800"
                  title="关闭"
                >
                  <Icons.X size={14} />
                </button>
              </PanelHeader>

              <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                {chatMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-stone-600 space-y-3">
                    <Icons.Sparkles size={32} strokeWidth={1} />
                    <p className="text-xs">暂无对话记录</p>
                  </div>
                ) : (
                  chatMessages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[90%] rounded-xl px-3 py-2 text-xs ${msg.role === 'user' ? 'bg-stone-700 text-white' : 'bg-stone-800 border border-stone-700 text-stone-200'}`}>
                        {msg.content}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </main>

      {/* Persistence History Bottom Bar */}
      {/* Persistence History Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 h-24 bg-stone-950/90 backdrop-blur-md border-t border-stone-800 z-40 transform transition-transform duration-300 ease-in-out flex items-center shadow-[0_-4px_20px_rgba(0,0,0,0.2)]">
        {/* History List - Full Width */}
        {state.generatedImages.length === 0 ? (
          <div className="w-full flex items-center justify-center text-stone-600 gap-2">
            <Icons.Image size={24} strokeWidth={1.5} />
            <span className="text-xs font-medium">No history records</span>
          </div>
        ) : (
          <div className="flex-1 flex items-center gap-1 overflow-x-auto overflow-y-hidden w-full h-full py-2 custom-scrollbar px-6">
            {state.generatedImages.map((img, index) => (
              <div key={index} className="flex-shrink-0 w-20 h-20 relative">
                <HistoryThumbnail
                  imageUrl={`data:image/png;base64,${img}`}
                  index={index}
                  isActive={index === state.selectedHistoryIndex}
                  onClick={loadHistoryItem}
                  onDelete={handleDeleteHistoryItem}
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