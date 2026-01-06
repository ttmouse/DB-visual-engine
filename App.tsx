
import React, { useState, useEffect, useRef } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { AgentCard } from './components/AgentCard';
import { ImageViewer } from './components/ImageViewer';
import { ImageComparisonSlider } from './components/ImageComparisonSlider';
import { HistoryThumbnail } from './components/HistoryThumbnail';
import { ReferenceImageList } from './components/ReferenceImageList';
import { ToastContainer, ToastMessage, ToastType } from './components/Toast';
import { StorageIndicator } from './components/StorageIndicator';
import { Icons } from './components/Icons';
import { streamAgentAnalysis, generateImageFromPrompt, streamConsistencyCheck, refinePromptWithFeedback, detectLayout, translatePrompt, executeSmartAnalysis } from './services/geminiService';
import { saveHistoryItem, getHistory, deleteHistoryItemById } from './services/historyService';
import { detectSkillIntent, createUserMessage, createAssistantMessage, createSkillResultMessage, executeQualityCheck, executeRefineSkill, executeReverseSkill } from './services/chatService';
import { promptManager, PromptVersion } from './services/promptManager';
import { saveCurrentTask, loadCurrentTask, clearCurrentTask } from './services/cacheService';
import { soundService } from './services/soundService';
import { usePipelineProgress } from './hooks/usePipelineProgress';
import { PipelineProgressView } from './components/PipelineProgressView';
import { AGENTS, PIPELINE_ORDER } from './constants';
import { AgentRole, AppState, HistoryItem, ChatMessage, PipelineStepStatus, ReferenceImage } from './types';
import { ChatPanel } from './components/ChatPanel';
import { ChatDrawer } from './components/ChatDrawer';
import { PanelHeader } from './components/PanelHeader';
import { LandingPage } from './components/LandingPage';
import { DocumentationModal } from './components/DocumentationModal';
import { ApiKeyModal } from './components/ApiKeyModal';
import { PromptLabModal } from './components/PromptLabModal';
import ReactMarkdown from 'react-markdown';

const INITIAL_RESULTS = {
  [AgentRole.AUDITOR]: { role: AgentRole.AUDITOR, content: '', isStreaming: false, isComplete: false },
  [AgentRole.DESCRIPTOR]: { role: AgentRole.DESCRIPTOR, content: '', isStreaming: false, isComplete: false },
  [AgentRole.ARCHITECT]: { role: AgentRole.ARCHITECT, content: '', isStreaming: false, isComplete: false },
  [AgentRole.SYNTHESIZER]: { role: AgentRole.SYNTHESIZER, content: '', isStreaming: false, isComplete: false },
  [AgentRole.CRITIC]: { role: AgentRole.CRITIC, content: '', isStreaming: false, isComplete: false },
  [AgentRole.SORA_VIDEOGRAPHER]: { role: AgentRole.SORA_VIDEOGRAPHER, content: '', isStreaming: false, isComplete: false },
};



import { ImageZoomState } from './utils/zoom';
// ... other imports

const INITIAL_STATE: AppState = {
  image: null, mimeType: '', isProcessing: false, activeRole: null, results: INITIAL_RESULTS,
  generatedImage: null, generatedImages: [], isGeneratingImage: false,
  editablePrompt: '', promptHistory: [], currentPromptIndex: 0, isRefiningPrompt: false,
  useReferenceImage: false, isTemplatizing: false, detectedAspectRatio: "1:1",
  videoAnalysisDuration: null, isRefining: false, history: [], isHistoryOpen: false,
  isVersionDropdownOpen: false,
  layoutData: null, isAnalyzingLayout: false,
  suggestions: [], selectedSuggestionIndices: [],
  promptCache: { CN: '', EN: '' },
  selectedHistoryIndex: 0,
  referenceImages: [],
  isComparing: false,
  activeTab: 'STUDIO'
};

type TabType = AgentRole.AUDITOR | AgentRole.DESCRIPTOR | AgentRole.ARCHITECT | 'STUDIO';

// Helper to determine image source (Base64 or URL)
const getImageSrc = (data: string | null | undefined, mimeType: string = 'image/png') => {
  if (!data) return '';
  if (data.startsWith('http')) return data;
  if (data.startsWith('data:')) return data;
  return `data:${mimeType};base64,${data}`;
};

const App: React.FC = () => {
  const [showLanding, setShowLanding] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [displayImage, setDisplayImage] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('STUDIO');

  /* Existing state declarations */
  // ...
  const [apiMode, setApiMode] = useState<'official' | 'custom'>('custom');
  const [activeModelName, setActiveModelName] = useState('Gemini 2.0 Flash'); // Default display

  // Consolidate initialization logic
  useEffect(() => {
    const init = async () => {
      // Load API Mode
      const storedMode = (localStorage.getItem('berryxia_api_mode') || 'custom') as 'official' | 'custom';
      setApiMode(storedMode);

      // Load specific model name for display (prefer 'fast' model as it's used for chat)
      const storedFastModel = localStorage.getItem('berryxia_model_fast');
      if (storedFastModel) setActiveModelName(storedFastModel);

      // Check for environment variable injection
      const envKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
      if (envKey && envKey.length > 10) {
        setHasKey(true);
      }

      // Check localStorage for key presence to update indicator color
      const storedKey = storedMode === 'official'
        ? (localStorage.getItem('berryxia_api_key_official') || localStorage.getItem('berryxia_api_key'))
        : (localStorage.getItem('berryxia_api_key_custom') || localStorage.getItem('berryxia_api_key'));

      if (storedKey) setHasKey(true);

      try {
        const [hist, cached] = await Promise.all([
          getHistory(),
          loadCurrentTask()
        ]);

        let generatedImages: string[] = [];
        let mergedState: Partial<AppState> = { history: hist };

        if (cached) {
          // Rebuild generated images from history if needed
          const imagesFromHistory = hist
            .filter(item => item.generatedImage)
            .map(item => item.generatedImage as string);

          generatedImages = imagesFromHistory.length > 0 ? imagesFromHistory : cached.generatedImages;

          mergedState = {
            ...mergedState,
            image: cached.image,
            mimeType: cached.mimeType,
            detectedAspectRatio: cached.detectedAspectRatio,
            videoAnalysisDuration: cached.videoAnalysisDuration,
            results: cached.results,
            editablePrompt: cached.editablePrompt,
            generatedImage: cached.generatedImage || (hist.length > 0 ? hist[0].generatedImage : null),
            generatedImages: generatedImages,
            layoutData: cached.layoutData,
            promptCache: cached.promptCache,
            selectedHistoryIndex: cached.selectedHistoryIndex || 0,
            referenceImages: cached.referenceImages || []
          };

          // Restore display image
          if (cached.displayImage) {
            setDisplayImage(cached.displayImage);
          }
        } else {
          // Fallback if no cache but history exists
          if (hist.length > 0) {
            mergedState.generatedImage = hist[0].generatedImage;
            // generatedImages can be rebuilt from history even without cache
            const imagesFromHistory = hist
              .filter(item => item.generatedImage)
              .map(item => item.generatedImage as string);
            mergedState.generatedImages = imagesFromHistory;
          }
        }

        if (cached || hist.length > 0) {
          setShowLanding(false);
        }

        setState(prev => ({ ...prev, ...mergedState }));

      } catch (e) {
        console.error("Initialization failed", e);
      }
    };
    init();
  }, []);

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
  const [isPromptLabOpen, setIsPromptLabOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState<'CN' | 'EN'>('CN');
  const [isHistoryDropdownOpen, setIsHistoryDropdownOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatProcessing, setIsChatProcessing] = useState(false);
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);
  const [aiInput, setAiInput] = useState('');

  // Resizable panel state (percentage, stored in localStorage)
  const [leftPanelWidth, setLeftPanelWidth] = useState(() => {
    const saved = localStorage.getItem('unimage_left_panel_width');
    return saved ? parseFloat(saved) : 50;
  });
  const [isDraggingDivider, setIsDraggingDivider] = useState(false);

  // Right panel (Chat/History) resizable state
  const [rightPanelWidth, setRightPanelWidth] = useState(() => {
    const saved = localStorage.getItem('unimage_right_panel_width');
    return saved ? parseInt(saved) : 320;
  });
  const [isDraggingRightDivider, setIsDraggingRightDivider] = useState(false);
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

  const isPipelineRunning = useRef(false);

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
  const [soundEnabled, setSoundEnabled] = useState(soundService.isEnabled());
  const [reverseMode, setReverseMode] = useState<'full' | 'quick'>('quick'); // 'full' = 完整4步骤, 'quick' = 单步快速逆向
  const [generateCount, setGenerateCount] = useState(1); // 生成图片数量
  const [isGenerateMenuOpen, setIsGenerateMenuOpen] = useState(false); // 生成菜单开关
  const mainRef = useRef<HTMLElement>(null);

  // Save panel width to localStorage
  useEffect(() => {
    localStorage.setItem('unimage_left_panel_width', leftPanelWidth.toString());
  }, [leftPanelWidth]);

  // Handle divider drag
  useEffect(() => {
    if (!isDraggingDivider) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!mainRef.current) return;
      const rect = mainRef.current.getBoundingClientRect();
      const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
      // Clamp between 25% and 75%
      setLeftPanelWidth(Math.min(75, Math.max(25, newWidth)));
    };

    const handleMouseUp = () => {
      setIsDraggingDivider(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingDivider]);

  // Handle right panel divider drag (for Chat/History column)
  useEffect(() => {
    if (!isDraggingRightDivider) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!mainRef.current) return;
      const rect = mainRef.current.getBoundingClientRect();
      const newWidth = rect.right - e.clientX;
      // Clamp between 200px and 500px
      const clampedWidth = Math.min(500, Math.max(200, newWidth));
      setRightPanelWidth(clampedWidth);
      // Save immediately during drag for persistence
      localStorage.setItem('unimage_right_panel_width', clampedWidth.toString());
    };

    const handleMouseUp = () => {
      setIsDraggingRightDivider(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingRightDivider]);

  // Handle image zoom update
  const handleZoomChange = (newZoom: ImageZoomState) => {
    setImageZoom(newZoom);
  };

  // Reset zoom when image changes
  useEffect(() => {
    setImageZoom({ scale: 1, panX: 0, panY: 0 });
  }, [displayImage, state.generatedImage]);

  // Auto-save current task to cache whenever relevant state changes
  useEffect(() => {
    if (state.image) {
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
          showToast('本地存储已满，请及时清理历史记录', 'error');
        }
      }
    }
  }, [state, displayImage]);

  // Helper to load history item
  const loadHistoryItem = (index: number) => {
    // 1. Check if index is valid
    if (index < 0 || index >= state.history.length) return;

    const historyItem = state.history[index];
    if (!historyItem) return;

    // 2. Set selected index
    setSelectedHistoryIndex(index);

    // 3. Restore state
    setDisplayImage(getImageSrc(historyItem.originalImage, historyItem.mimeType));
    setState(prev => ({
      ...prev,
      editablePrompt: historyItem.prompt,
      promptCache: { ...prev.promptCache, CN: historyItem.prompt },
      image: historyItem.originalImage,
      mimeType: historyItem.mimeType || 'image/png',
      detectedAspectRatio: historyItem.detectedAspectRatio || '1:1',
      generatedImage: historyItem.generatedImage
    }));
  };

  // Keyboard Shortcuts for History and Fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC to close fullscreen
      if (e.key === 'Escape' && fullscreenImg) {
        setFullscreenImg(null);
        setIsFullscreenComparison(false);
        return;
      }

      if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      if (state.generatedImages.length === 0) return;

      if (e.key === 'ArrowLeft') {
        const newIndex = Math.max(0, state.selectedHistoryIndex - 1);
        if (newIndex !== state.selectedHistoryIndex) {
          loadHistoryItem(newIndex);
          // Update fullscreen image if in fullscreen mode
          if (fullscreenImg && state.generatedImages[newIndex]) {
            if (isFullscreenComparison) {
              // For comparison mode, keep the current mode but update the index
              // The image will be updated via selectedHistoryIndex
            } else {
              setFullscreenImg(getImageSrc(state.generatedImages[newIndex]));
            }
          }
        }
      } else if (e.key === 'ArrowRight') {
        const newIndex = Math.min(state.generatedImages.length - 1, state.selectedHistoryIndex + 1);
        if (newIndex !== state.selectedHistoryIndex) {
          loadHistoryItem(newIndex);
          // Update fullscreen image if in fullscreen mode
          if (fullscreenImg && state.generatedImages[newIndex]) {
            if (isFullscreenComparison) {
              // For comparison mode, keep the current mode but update the index
              // The image will be updated via selectedHistoryIndex
            } else {
              setFullscreenImg(getImageSrc(state.generatedImages[newIndex]));
            }
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.generatedImages.length, state.selectedHistoryIndex, state.history, fullscreenImg, isFullscreenComparison]);


  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (showProgressView && e.key === 'Escape') {
        setShowProgressView(false); // ESC 隐藏进度视图
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showProgressView]);

  const showToast = (message: string, type: ToastType = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  // Helper: Push a new prompt to history (max 20 entries)
  const pushPromptHistory = (newPrompt: string, source: string) => {
    if (!newPrompt.trim()) return;
    const entry = `[${source}] ${new Date().toLocaleTimeString('zh-CN')}\n${newPrompt}`;
    setState(prev => {
      const history = [entry, ...prev.promptHistory.filter(h => h !== entry)].slice(0, 20);
      return { ...prev, promptHistory: history, currentPromptIndex: 0 };
    });
  };

  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));



  const handleSelectKey = async () => {
    setIsKeyModalOpen(true);
  };

  const handleFileSelected = (base64Data: string, aspectRatio: string, mimeType: string, duration?: number) => {
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
      detectedAspectRatio: aspectRatio
    }));
    setActiveTab('STUDIO');
    isPipelineRunning.current = false;
  };

  const handleStartPipeline = () => {
    setState(prev => ({ ...prev, isProcessing: true }));
  };

  const handleReset = () => {
    setDisplayImage(null);
    // 新建任务：只清空提示词和分析结果，保留历史记录和生成的图片
    setState(prev => ({
      ...INITIAL_STATE,
      history: prev.history,
      generatedImages: prev.generatedImages,
      generatedImage: prev.generatedImage,
      selectedHistoryIndex: prev.selectedHistoryIndex
    }));
    clearCurrentTask(); // Clear cache when starting new task
  };

  const handleAnalyzeLayout = async () => {
    if (!state.image || state.isAnalyzingLayout) return;
    setState(prev => ({ ...prev, isAnalyzingLayout: true }));
    try {
      const boxes = await detectLayout(state.image);
      setState(prev => ({ ...prev, layoutData: boxes, isAnalyzingLayout: false }));
      showToast("蓝图解构完成", "success");
    } catch (e) {
      setState(prev => ({ ...prev, isAnalyzingLayout: false }));
      showToast("布局分析失败", "error");
    }
  };

  const handleToggleLanguage = async () => {
    const target = currentLang === 'CN' ? 'EN' : 'CN';
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
      pushPromptHistory(translated, target === 'EN' ? '英文翻译' : '中文翻译');
      setCurrentLang(target);
    } catch (e) { showToast("翻译失败", "error"); }
  };

  const parseSuggestions = (content: string) => {
    // Find the optimization section using multiple possible markers
    const markers = ["调优建议", "调优指令", "Optimization Suggestions", "Optimization"];
    let sectionText = "";

    for (const marker of markers) {
      const idx = content.lastIndexOf(marker);
      if (idx !== -1) {
        sectionText = content.slice(idx);
        break;
      }
    }

    if (!sectionText) return [];

    // Extract lines that start with numbers like "1." "2." "3."
    const suggestions: string[] = [];
    const lines = sectionText.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      // Match lines starting with 1. 2. 3. etc., possibly with markers like * -
      const match = trimmed.match(/^[\*\-]?\s*([1-3])[.\)、]\s*(.+)/);
      if (match && match[2]) {
        // Clean up the suggestion text: remove leading ** and trailing **
        let suggestion = match[2]
          .replace(/^\*\*/, '')
          .replace(/\*\*$/, '')
          .replace(/^\*\*(.+?)\*\*:?\s*/, '$1: ')
          .trim();
        if (suggestion.length > 5) {
          suggestions.push(suggestion);
        }
      }
    }

    return suggestions.slice(0, 3);
  };

  const processImagePipeline = async () => {
    if (!state.image || isPipelineRunning.current) return;
    isPipelineRunning.current = true;

    // 初始化进度
    initPipeline();
    setShowProgressView(true);
    setActiveTab('STUDIO');

    // 播放开始音效
    soundService.playStart();

    let accumulatedContext = `[Ratio: ${state.detectedAspectRatio}]`;

    try {
      for (let i = 0; i < PIPELINE_ORDER.length; i++) {
        const role = PIPELINE_ORDER[i];

        // 开始步骤
        startStep(i);
        if (role !== AgentRole.SYNTHESIZER) setActiveTab(role as TabType);

        setState(prev => ({
          ...prev, activeRole: role,
          results: { ...prev.results, [role]: { ...prev.results[role], content: '', isStreaming: true, isComplete: false } }
        }));

        let agentContent = "";
        const stream = streamAgentAnalysis(role, state.image!, accumulatedContext, state.mimeType);

        // 流式更新
        for await (const chunk of stream) {
          agentContent += chunk;
          updateStepContent(i, agentContent); // 更新进度视图
          setState(prev => ({ ...prev, results: { ...prev.results, [role]: { ...prev.results[role], content: agentContent } } }));
        }

        accumulatedContext += `\n\n--- ${role} ---\n${agentContent}\n`;

        // 完成步骤
        completeStep(i, agentContent);
        soundService.playStepComplete();

        setState(prev => ({ ...prev, results: { ...prev.results, [role]: { ...prev.results[role], isStreaming: false, isComplete: true } } }));

        if (role === AgentRole.SYNTHESIZER) {
          setState(prev => ({
            ...prev,
            editablePrompt: agentContent,
            promptCache: { ...prev.promptCache, CN: agentContent }
          }));
          pushPromptHistory(agentContent, '初始生成');
        }

        // Halt pipeline if error occurred
        if (agentContent.includes("[错误]") || agentContent.includes("[⚠️ 配额限制]")) {
          errorStep(i, "API 错误或配额限制");
          soundService.playError();
          break;
        }
      }

      // 完成流水线
      completePipeline();
      soundService.playComplete();

      // 延迟隐藏进度视图，显示打字机效果
      setTimeout(() => {
        setShowProgressView(false);
        setActiveTab('STUDIO');
        showToast("✨ 提示词生成完成！", "success");
      }, 2000);

    } catch (error) {
      soundService.playError();
      errorStep(pipelineProgress?.currentStepIndex || 0, String(error));
    } finally {
      setState(prev => ({ ...prev, isProcessing: false }));
      isPipelineRunning.current = false;
    }
  };

  useEffect(() => {
    if (state.isProcessing && !isPipelineRunning.current) processImagePipeline();
  }, [state.isProcessing]);

  // 单步快速逆向
  const handleQuickReverse = async () => {
    if (!state.image || isPipelineRunning.current) return;
    isPipelineRunning.current = true;
    setState(prev => ({ ...prev, isProcessing: true }));

    // 初始化单步骤进度
    setShowProgressView(true);
    setActiveTab('STUDIO');
    soundService.playStart();

    // 创建单步骤进度
    setProgressDirect({
      isRunning: true,
      currentStepIndex: 0,
      steps: [{
        role: AgentRole.SYNTHESIZER,
        name: AGENTS[AgentRole.SYNTHESIZER].name,
        description: '单步快速逆向分析',
        status: PipelineStepStatus.RUNNING,
        progress: 0,
        streamingContent: '',
        finalContent: '',
        startTime: Date.now(),
        endTime: null,
        error: null
      }],
      totalProgress: 0,
      estimatedTimeRemaining: null,
      startTime: Date.now()
    });

    try {
      const { content, suggestions } = await executeReverseSkill(state.image, state.mimeType);

      // 模拟流式更新
      let displayedContent = '';
      const chunks = content.match(/.{1,20}/g) || []; // 每20字符一个chunk

      for (let i = 0; i < chunks.length; i++) {
        displayedContent += chunks[i];
        const progress = Math.round(((i + 1) / chunks.length) * 100);

        const currentProgress = pipelineProgress;
        if (currentProgress) {
          const newSteps = [...currentProgress.steps];
          newSteps[0] = {
            ...newSteps[0],
            streamingContent: displayedContent,
            progress,
            finalContent: displayedContent
          };
          setProgressDirect({
            ...currentProgress,
            steps: newSteps,
            totalProgress: progress
          });
        }

        await new Promise(resolve => setTimeout(resolve, 30)); // 模拟流式效果
      }

      // 完成
      const currentProgress = pipelineProgress;
      if (currentProgress) {
        const newSteps = [...currentProgress.steps];
        newSteps[0] = {
          ...newSteps[0],
          status: PipelineStepStatus.COMPLETED,
          progress: 100,
          streamingContent: content,
          finalContent: content,
          endTime: Date.now()
        };
        setProgressDirect({
          ...currentProgress,
          isRunning: false,
          steps: newSteps,
          totalProgress: 100
        });
      }

      // 使用建议作为提示词
      const selectedSuggestion = suggestions && suggestions.length > 0 ? suggestions[0] : content;

      setState(prev => ({
        ...prev,
        editablePrompt: selectedSuggestion,
        promptCache: { ...prev.promptCache, CN: selectedSuggestion }
      }));

      pushPromptHistory(selectedSuggestion, '快速逆向');

      soundService.playComplete();

      // 延迟隐藏进度视图
      setTimeout(() => {
        setShowProgressView(false);
        setActiveTab('STUDIO');
        showToast("✨ 逆向完成！", "success");
      }, 2000);

    } catch (error) {
      soundService.playError();

      const currentProgress = pipelineProgress;
      if (currentProgress) {
        const newSteps = [...currentProgress.steps];
        newSteps[0] = {
          ...newSteps[0],
          status: PipelineStepStatus.ERROR,
          error: String(error),
          endTime: Date.now()
        };
        setProgressDirect({
          ...currentProgress,
          steps: newSteps,
          isRunning: false
        });
      }

      showToast("逆向失败", "error");
    } finally {
      setState(prev => ({ ...prev, isProcessing: false }));
      isPipelineRunning.current = false;
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
      showToast("质检失败", "error");
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
      pushPromptHistory(newPrompt, '应用修订');
      showToast("已应用修订，请查看 Prompt Studio", "success");
    } catch (e) {
      setState(prev => ({ ...prev, isRefiningPrompt: false }));
      showToast("应用修订失败", "error");
    }
  };

  const handleGenerateImage = async (customPrompt?: string, count: number = 1) => {
    const p = customPrompt || state.editablePrompt;
    if (state.isGeneratingImage || !p) return;
    setState(prev => ({ ...prev, isGeneratingImage: true }));

    const totalCount = count;
    let successCount = 0;

    try {
      // Submit to Gemini for generation
      let refImage: string | null = null;
      let targetMimeType = state.mimeType || 'image/jpeg';
      let detectedRatio = state.detectedAspectRatio;

      // Logic: Prioritize dragged reference images (User explicit intent)
      if (state.referenceImages && state.referenceImages.length > 0) {
        refImage = state.referenceImages[0].url;
        targetMimeType = state.referenceImages[0].mimeType;
        // Logic: Use reference image's aspect ratio
        if (state.referenceImages[0].aspectRatio) {
          detectedRatio = state.referenceImages[0].aspectRatio;
        }
        showToast("已启用参考图生成", "info");
      } else if (state.useReferenceImage && state.image) {
        // Fallback to Main Image if toggle is ON
        refImage = state.image;
        targetMimeType = state.mimeType;
        showToast("已启用主图参考生成", "info");
      }

      if (totalCount > 1) {
        showToast(`正在生成 ${totalCount} 张图片...`, 'info');
      }

      // Generate images sequentially
      for (let i = 0; i < totalCount; i++) {
        try {
          const img = await generateImageFromPrompt(p, detectedRatio, refImage, targetMimeType);

          if (img) {
            const newItem: HistoryItem = {
              id: (Date.now() + i).toString(),
              timestamp: Date.now() + i,
              originalImage: state.image!,
              mimeType: state.mimeType,
              prompt: p,
              generatedImage: img,
              referenceImages: state.referenceImages?.length ? [...state.referenceImages] : undefined
            };
            await saveHistoryItem(newItem);
            successCount++;

            // Update state immediately for each successful generation
            setState(prev => ({
              ...prev,
              generatedImage: img,
              generatedImages: [img, ...prev.generatedImages],
              history: [newItem, ...prev.history],
              selectedHistoryIndex: 0
            }));
          }
        } catch (err) {
          console.error(`Failed to generate image ${i + 1}:`, err);
        }
      }

      setState(prev => ({ ...prev, isGeneratingImage: false }));

      if (successCount > 0) {
        if (totalCount === 1) {
          setTimeout(() => handleRunQA(), 500);
        } else {
          showToast(`成功生成 ${successCount}/${totalCount} 张图片`, 'success');
        }
      } else {
        showToast("生成失败，模型未返回有效图片", "error");
      }
    } catch (e) {
      showToast("生成失败", 'error');
      setState(prev => ({ ...prev, isGeneratingImage: false }));
    }
  };

  const setSelectedHistoryIndex = (index: number) => {
    setState(prev => ({ ...prev, selectedHistoryIndex: index }));
  };

  // Handler to delete a history item by index
  const handleDeleteHistoryItem = async (index: number) => {
    const historyItem = state.history[index];

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
        generatedImage: newGeneratedImages.length > 0 ? newGeneratedImages[newSelectedIndex] : null
      };
    });

    showToast('已删除记录', 'info');
  };

  // Handler to download original image
  const handleDownloadHD = async (index: number) => {
    const imageBase64 = state.generatedImages[index];
    if (!imageBase64) return;

    // Create download link
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${imageBase64}`;
    link.download = `generated-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('✨ 图片已下载', 'success');
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
  const handleChatSendMessage = async (message: string) => {
    // Add user message
    const userMsg = createUserMessage(message);
    setChatMessages(prev => [...prev, userMsg]);
    setIsChatProcessing(true);

    try {
      const skillType = detectSkillIntent(message);

      if (skillType === 'quality-check') {
        // Execute quality check skill
        if (!state.image || !state.generatedImage) {
          setChatMessages(prev => [...prev, createAssistantMessage('请先生成图片后再进行质检')]);
        } else {
          const streamingMsg = createAssistantMessage('正在执行质检分析...', true);
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
            return [...filtered, createSkillResultMessage('quality-check', '', suggestions)];
          });
        }
      } else if (skillType === 'reverse') {
        // Reverse engineering skill
        if (!state.image) {
          setChatMessages(prev => [...prev, createAssistantMessage('请先上传图片再进行逆向分析')]);
        } else {
          const streamingMsg = createAssistantMessage('正在分析画面...', true);
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
      } else if (skillType === 'generate') {
        setChatMessages(prev => [...prev, createAssistantMessage('正在生成图片...')]);
        handleGenerateImage();
      } else if (skillType === 'translate') {
        setChatMessages(prev => [...prev, createAssistantMessage('正在翻译...')]);
        handleToggleLanguage();
      } else {
        setChatMessages(prev => [...prev, createAssistantMessage('我可以帮你：\n- 质检分析\n- 修改提示词\n- 翻译\n- 生成图片\n\n请告诉我你想要做什么？')]);
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

  const renderTabContent = () => {
    if (activeTab === 'STUDIO') {
      return (
        <div className="flex flex-col h-full bg-stone-900 relative">
          {/* Header */}
          <div className="px-6 pt-5 pb-3 border-b border-stone-800 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-stone-300 text-base font-serif">Prompt Studio</h3>
                <p className="text-[10px] text-stone-500 font-medium uppercase mt-0.5">提示词编辑器</p>
              </div>

              {/* 模式切换器 */}
              <div className="flex items-center gap-1 bg-stone-800 rounded-lg p-1">
                <button
                  onClick={() => setReverseMode('full')}
                  className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${reverseMode === 'full' ? 'bg-stone-600 text-white shadow-sm' : 'text-stone-500 hover:text-stone-300'}`}
                >
                  完整分析
                </button>
                <button
                  onClick={() => setReverseMode('quick')}
                  className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${reverseMode === 'quick' ? 'bg-stone-600 text-white shadow-sm' : 'text-stone-500 hover:text-stone-300'}`}
                >
                  快速逆向
                </button>
              </div>
              {/* Version Selector - Custom Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setState(prev => ({ ...prev, isVersionDropdownOpen: !prev.isVersionDropdownOpen }))}
                  className="flex items-center gap-2 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 rounded-lg text-xs font-bold text-stone-300 transition-colors"
                >
                  <span>{promptManager.getVersions(AgentRole.SYNTHESIZER).find(v => v.id === promptManager.getActiveVersionId(AgentRole.SYNTHESIZER))?.name || '选择版本'}</span>
                  <Icons.ChevronDown size={12} className={`transition-transform ${state.isVersionDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {state.isVersionDropdownOpen && (
                  <>
                    {/* Backdrop to close dropdown */}
                    <div className="fixed inset-0 z-40" onClick={() => setState(prev => ({ ...prev, isVersionDropdownOpen: false }))} />
                    <div className="absolute top-full left-0 mt-1 w-48 bg-stone-800 border border-stone-700 rounded-lg shadow-xl z-50 overflow-hidden">
                      {promptManager.getVersions(AgentRole.SYNTHESIZER).map(v => (
                        <div
                          key={v.id}
                          onClick={() => {
                            promptManager.setActiveVersionId(AgentRole.SYNTHESIZER, v.id);
                            setState(prev => ({ ...prev, isVersionDropdownOpen: false }));
                          }}
                          className={`px-3 py-2 hover:bg-stone-700 cursor-pointer text-xs transition-colors flex items-center gap-2 ${v.id === promptManager.getActiveVersionId(AgentRole.SYNTHESIZER)
                            ? 'bg-stone-700 text-orange-400'
                            : 'text-stone-300'
                            }`}
                        >
                          {v.id === promptManager.getActiveVersionId(AgentRole.SYNTHESIZER) && <Icons.Check size={12} />}
                          <span>{v.name}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {state.promptHistory.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => setIsHistoryDropdownOpen(!isHistoryDropdownOpen)}
                      className="flex items-center gap-1 px-3 py-2 bg-amber-900/20 text-amber-500 hover:bg-amber-900/40 rounded-lg text-[9px] font-bold transition-colors"
                    >
                      <Icons.History size={10} />
                      {state.promptHistory.length}
                    </button>
                    {isHistoryDropdownOpen && (
                      <div className="absolute top-full right-0 mt-1 w-64 bg-stone-800 border border-stone-700 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                        {state.promptHistory.map((entry, idx) => {
                          const lines = entry.split('\n');
                          const header = lines[0];
                          return (
                            <div
                              key={idx}
                              onClick={() => {
                                const content = lines.slice(1).join('\n');
                                setState(prev => ({ ...prev, editablePrompt: content }));
                                setIsHistoryDropdownOpen(false);
                              }}
                              className="px-3 py-2 hover:bg-stone-700 cursor-pointer text-[10px] border-b border-stone-700 last:border-b-0"
                            >
                              <span className="font-bold text-amber-500">{header}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
                <button onClick={handleToggleLanguage} className="p-1.5 bg-stone-800 hover:bg-stone-700 text-stone-400 rounded-lg transition-colors" title="翻译">
                  <Icons.Languages size={12} />
                </button>
              </div>
            </div>
          </div>

          {/* Textarea */}
          <div className="flex-1 min-h-0 p-4 flex flex-col relative group">
            <div
              className={`absolute inset-0 rounded-xl pointer-events-none transition-all duration-200 z-10 
                  ${isDraggingReference ? 'border-2 border-emerald-500 bg-emerald-500/10' : 'border border-transparent'}`}
            >
              {isDraggingReference && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center text-emerald-500">
                  <Icons.Download size={32} />
                  <span className="text-xs font-bold mt-2">添加参考图</span>
                </div>
              )}
            </div>

            <textarea
              value={state.editablePrompt}
              onChange={(e) => setState(prev => ({ ...prev, editablePrompt: e.target.value }))}
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
              placeholder="输入提示词，或上传图片逆向生成..."
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
          <div className="p-4 border-t border-stone-800 flex-shrink-0 space-y-3">
            {/* Button Row */}
            <div className="flex items-center gap-2">
              {/* Scrollable Tags Area */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar flex-shrink-0 max-w-[40%]">
                {/* Reference Tags */}
                {state.image && (
                  <button
                    onClick={() => {
                      const tag = '@原图';
                      setAiInput(prev => {
                        if (prev.includes(tag)) {
                          return prev.replace(tag, '').replace(/\s{2,}/g, ' ').trim();
                        }
                        return (prev + ' ' + tag).trim();
                      });
                    }}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all text-xs font-bold flex-shrink-0 whitespace-nowrap border ${aiInput.includes('@原图')
                      ? 'bg-orange-900/30 text-orange-400 border-orange-500/30'
                      : 'bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-orange-400 border-transparent'
                      }`}
                    title={aiInput.includes('@原图') ? "取消引用原图" : "引用原图"}
                  >
                    <Icons.Image size={14} />
                    @原图
                  </button>
                )}
                {state.generatedImage && (
                  <button
                    onClick={() => {
                      const tag = '@生成图';
                      setAiInput(prev => {
                        if (prev.includes(tag)) {
                          return prev.replace(tag, '').replace(/\s{2,}/g, ' ').trim();
                        }
                        return (prev + ' ' + tag).trim();
                      });
                    }}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all text-xs font-bold flex-shrink-0 whitespace-nowrap border ${aiInput.includes('@生成图')
                      ? 'bg-emerald-900/30 text-emerald-400 border-emerald-500/30'
                      : 'bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-emerald-400 border-transparent'
                      }`}
                    title={aiInput.includes('@生成图') ? "取消引用生成图" : "引用生成图"}
                  >
                    <Icons.Image size={14} />
                    @生成图
                  </button>
                )}
              </div>

              {/* Main Actions Area (No overflow to allow dropdowns) */}
              {/* Main Actions Area (No overflow to allow dropdowns) */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <button
                  onClick={() => {
                    if (reverseMode === 'quick') {
                      handleQuickReverse();
                    } else {
                      const hasAuditorContent = state.results[AgentRole.AUDITOR]?.content?.trim();
                      const hasDescriptorContent = state.results[AgentRole.DESCRIPTOR]?.content?.trim();
                      const hasArchitectContent = state.results[AgentRole.ARCHITECT]?.content?.trim();

                      if (!hasAuditorContent && !hasDescriptorContent && !hasArchitectContent) {
                        if (state.image) {
                          handleStartPipeline();
                        } else {
                          showToast('请先上传图片', 'error');
                        }
                      } else {
                        handleRegenerateAgent(AgentRole.SYNTHESIZER);
                      }
                    }
                  }}
                  disabled={!state.image || state.isProcessing}
                  className="flex-1 py-2 bg-stone-800 text-stone-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-40 hover:bg-stone-700 transition-all border border-stone-700 whitespace-nowrap px-3 min-w-fit"
                  title={reverseMode === 'quick' ? '快速单步逆向' : '完整4步分析'}
                >
                  <Icons.Sparkles size={14} />
                  逆向
                </button>
                {/* 生成图片按钮组 - 带数量选择菜单 */}
                <div className="relative flex-1 flex min-w-fit">
                  <button
                    onClick={() => handleGenerateImage(undefined, generateCount)}
                    disabled={state.isGeneratingImage || !state.editablePrompt}
                    className="flex-1 px-3 py-2 bg-stone-100 text-black rounded-l-xl text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-40 hover:bg-white transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] whitespace-nowrap"
                  >
                    {state.isGeneratingImage ? <Icons.RefreshCw size={14} className="animate-spin" /> : <Icons.Play size={14} />}
                    生成{generateCount > 1 ? ` ${generateCount}` : ''}
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
                onClick={() => { navigator.clipboard.writeText(state.editablePrompt); showToast('已复制', 'success'); }}
                disabled={!state.editablePrompt}
                className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 transition-all flex-shrink-0"
                title="复制提示词"
              >
                <Icons.Copy size={14} />
                复制
              </button>
              <button
                onClick={() => setIsChatDrawerOpen(!isChatDrawerOpen)}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all flex-shrink-0 ${isChatDrawerOpen ? 'bg-amber-900/30 text-amber-400' : 'bg-stone-800 text-stone-500 hover:text-stone-300'}`}
                title="历史记录"
              >
                <Icons.MessageSquare size={14} />
                历史
              </button>
            </div>

            {/* AI Input Area - Two Row Layout */}
            <div className="bg-stone-800 rounded-xl border border-stone-700 overflow-hidden">
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
                      handleChatSendMessage(aiInput.trim());
                      setAiInput('');
                      setIsChatDrawerOpen(true);
                    }
                  }}
                  placeholder={isAnalyzing ? "正在分析差异..." : "输入 AI 指令..."}
                  className={`w-full bg-transparent border-none text-sm outline-none text-stone-200 placeholder:text-stone-500 resize-none min-h-[20px] max-h-[100px] leading-snug ${isAnalyzing ? 'placeholder:animate-pulse' : ''}`}
                  disabled={isChatProcessing || isAnalyzing}
                  rows={1}
                />
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
                  <span className="text-[10px] text-stone-500 font-medium">{activeModelName}</span>
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
                  <button
                    onClick={() => {
                      if (aiInput.trim()) {
                        handleChatSendMessage(aiInput.trim());
                        setAiInput('');
                        setIsChatDrawerOpen(true);
                      }
                    }}
                    disabled={!aiInput.trim() || isChatProcessing}
                    className="p-1.5 bg-stone-700 text-white rounded-lg disabled:opacity-40 transition-all hover:bg-stone-600"
                    title="发送"
                  >
                    {isChatProcessing ? (
                      <Icons.RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Icons.ArrowUp size={14} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 进度视图覆盖层 */}
          {showProgressView && pipelineProgress && (
            <PipelineProgressView
              progress={pipelineProgress}
              onHide={() => setShowProgressView(false)}
              onCancel={() => {
                // 取消流水线逻辑
                resetPipeline();
                setShowProgressView(false);
                setState(prev => ({ ...prev, isProcessing: false }));
                isPipelineRunning.current = false;
              }}
            />
          )}
        </div>
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

  if (showLanding) return <LandingPage onEnterApp={() => setShowLanding(false)} hasKey={hasKey} onSelectKey={handleSelectKey} />;

  return (
    <div className="min-h-screen bg-black text-stone-200 font-sans selection:bg-stone-700 overflow-hidden">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <DocumentationModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      <ApiKeyModal isOpen={isKeyModalOpen} onClose={() => setIsKeyModalOpen(false)} />
      <PromptLabModal isOpen={isPromptLabOpen} onClose={() => setIsPromptLabOpen(false)} />

      <ApiKeyModal isOpen={isKeyModalOpen} onClose={() => setIsKeyModalOpen(false)} />
      <PromptLabModal isOpen={isPromptLabOpen} onClose={() => setIsPromptLabOpen(false)} />

      {/* Global Drag Overlay Removed */}

      {/* Fullscreen Overlay */}
      {fullscreenImg && (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-md animate-in fade-in duration-300" onClick={() => { setFullscreenImg(null); setIsFullscreenComparison(false); }}>
          <button
            onClick={(e) => { e.stopPropagation(); setFullscreenImg(null); setIsFullscreenComparison(false); }}
            className="absolute top-10 right-10 text-white/50 hover:text-white transition-colors z-[210] p-4"
          >
            <Icons.X size={32} />
          </button>
          {isFullscreenComparison ? (
            <div className="w-full h-full flex items-center justify-center gap-8 p-20">
              <div className="flex-1 h-full flex flex-col items-center justify-center">
                <div className="text-white/50 text-sm mb-4 font-medium">ORIGINAL</div>
                <img
                  src={displayImage}
                  alt="Original"
                  className="max-w-full max-h-[85vh] object-contain shadow-[0_0_100px_rgba(0,0,0,0.5)] rounded-lg cursor-default"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div className="flex-1 h-full flex flex-col items-center justify-center">
                <div className="text-white/50 text-sm mb-4 font-medium">GENERATED</div>
                <img
                  src={getImageSrc(state.generatedImages[state.selectedHistoryIndex])}
                  alt="Generated"
                  className="max-w-full max-h-[85vh] object-contain shadow-[0_0_100px_rgba(0,0,0,0.5)] rounded-lg cursor-default"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center p-10">
              <img
                src={fullscreenImg}
                alt="Fullscreen View"
                className="max-w-[95%] max-h-[95%] object-contain shadow-[0_0_100px_rgba(0,0,0,0.5)] rounded-lg cursor-default"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
        </div>
      )}

      <nav className="fixed top-0 left-0 right-0 z-50 bg-stone-950/90 backdrop-blur-md border-b border-stone-800 h-16 flex items-center justify-between px-10">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setShowLanding(true)}>
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
          <button onClick={() => setIsHelpOpen(true)} className="p-2.5 rounded-full hover:bg-stone-800 text-stone-400 hover:text-orange-500 transition-all" title="帮助文档"><Icons.Help size={20} /></button>
          <button onClick={() => setState(prev => ({ ...prev, isHistoryOpen: true }))} className="p-2.5 rounded-full hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition-all" title="历史记录"><Icons.History size={20} /></button>
          <button
            onClick={() => {
              const newState = !soundEnabled;
              setSoundEnabled(newState);
              soundService.setEnabled(newState);
            }}
            className={`p-2.5 rounded-full hover:bg-stone-800 transition-all ${soundEnabled ? 'text-blue-500' : 'text-stone-500'}`}
            title={soundEnabled ? '音效已启用' : '音效已关闭'}
          >
            {soundEnabled ? <Icons.Volume2 size={20} /> : <Icons.VolumeX size={20} />}
          </button>
          <div className="w-px h-6 bg-stone-800 mx-1" />
          <div className="flex items-center gap-2 mr-2">
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${apiMode === 'official' ? 'border-orange-500/30 text-orange-500' : 'border-blue-500/30 text-blue-500'}`}>
              {apiMode === 'official' ? 'OFFICIAL' : 'CUSTOM'}
            </span>
          </div>
          <button onClick={handleSelectKey} className={`p-2.5 rounded-full hover:bg-stone-800 ${hasKey ? 'text-emerald-500' : 'text-stone-500'}`} title="API Key 状态"><Icons.Key size={20} /></button>
        </div>
      </nav>

      <main ref={mainRef} className={`fixed top-24 bottom-28 left-8 right-8 max-w-[1920px] mx-auto flex gap-0 z-0 ${(isDraggingDivider || isDraggingRightDivider) ? 'select-none' : ''}`}>
        {/* Left Panel: Assets & References */}
        <div style={{ width: `${leftPanelWidth}%` }} className="flex flex-col h-full bg-stone-900 rounded-xl border border-stone-800 overflow-hidden shadow-sm">
          <PanelHeader title="Visual Assets">
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
                showToast('文件过大 (最大 20MB)', 'error');
                return;
              }

              const reader = new FileReader();
              reader.onload = (ev) => {
                const base64String = ev.target?.result as string;
                const cleanBase64 = base64String.split(',')[1];
                const mimeType = file.type;

                // Calculate aspect ratio
                if (file.type.startsWith('image/')) {
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
                    handleFileSelected(cleanBase64, closest.id, mimeType);
                    showToast('已加载新图片', 'success');
                  };
                  img.src = base64String;
                } else {
                  handleFileSelected(cleanBase64, '16:9', mimeType);
                  showToast('已加载新视频', 'success');
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

            {!displayImage ? (
              <ImageUploader onImageSelected={handleFileSelected} disabled={state.isProcessing} />
            ) : (
              <div className="w-full h-full flex flex-col animate-in fade-in duration-500">
                {state.generatedImages.length > 0 && state.selectedHistoryIndex !== -1 ? (
                  isComparisonMode ? (
                    <ImageComparisonSlider
                      beforeImage={displayImage}
                      afterImage={getImageSrc(state.generatedImages[state.selectedHistoryIndex])}
                      className="w-full h-full border-0 rounded-none bg-stone-950/50"
                      layoutData={state.layoutData}
                      isAnalyzingLayout={state.isAnalyzingLayout}
                      onFullscreen={() => { setFullscreenImg(displayImage); setIsFullscreenComparison(true); }}
                      zoom={imageZoom}
                      onZoomChange={handleZoomChange}
                    />
                  ) : (
                    <ImageViewer
                      src={getImageSrc(state.generatedImages[state.selectedHistoryIndex])}
                      alt="Generated Result"
                      className="w-full h-full border-0 rounded-none bg-stone-950/50"
                      layoutData={state.layoutData}
                      isAnalyzingLayout={state.isAnalyzingLayout}
                      onFullscreen={() => setFullscreenImg(getImageSrc(state.generatedImages[state.selectedHistoryIndex]))}
                      zoom={imageZoom}
                      onZoomChange={handleZoomChange}
                    />
                  )
                ) : (
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
                )}
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
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-50">请先上传图片以使用分析功能</p>
              </div>
            ) : renderTabContent()}
          </div>
        </div>

        {/* Third Column: History Panel (inline, not overlay) */}
        {state.isHistoryOpen && (
          <>
            {/* Draggable Divider for right panel */}
            <div
              onMouseDown={() => setIsDraggingRightDivider(true)}
              className={`w-2 cursor-col-resize flex items-center justify-center group hover:bg-stone-700/50 transition-colors ${isDraggingRightDivider ? 'bg-orange-500/30' : ''}`}
            >
              <div className={`w-0.5 h-12 rounded-full transition-colors ${isDraggingRightDivider ? 'bg-orange-500' : 'bg-stone-700 group-hover:bg-stone-500'}`} />
            </div>

            {/* History Column */}
            <div style={{ width: `${rightPanelWidth}px` }} className="flex-shrink-0 flex flex-col h-full bg-stone-900 rounded-xl border border-stone-800 overflow-hidden shadow-sm">
              <PanelHeader title="历史记录">
                <button
                  onClick={() => setState(prev => ({ ...prev, isHistoryOpen: false }))}
                  className="p-1.5 text-stone-500 hover:text-stone-300 transition-colors rounded-lg hover:bg-stone-800"
                  title="关闭"
                >
                  <Icons.X size={14} />
                </button>
              </PanelHeader>

              <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                {state.history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-stone-600 space-y-3">
                    <Icons.Image size={40} strokeWidth={1} />
                    <p className="text-xs">暂无生成记录</p>
                  </div>
                ) : (
                  state.history.map((item) => (
                    <div
                      key={item.id}
                      className="bg-stone-950 rounded-xl p-3 space-y-2 hover:bg-stone-800 transition-colors cursor-pointer group border border-stone-800"
                      onClick={() => {
                        setState(prev => ({
                          ...prev,
                          editablePrompt: item.prompt,
                          promptCache: { ...prev.promptCache, CN: item.prompt }
                        }));
                        setActiveTab('STUDIO');
                        if (item.generatedImage) {
                          setFullscreenImg(getImageSrc(item.generatedImage));
                        }
                      }}
                    >
                      {/* Images Row */}
                      <div className="flex gap-2">
                        <div className="w-12 h-12 rounded-lg overflow-hidden border border-stone-700 flex-shrink-0">
                          <img
                            src={getImageSrc(item.originalImage, item.mimeType)}
                            alt="Original"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex items-center text-stone-600">
                          <Icons.ArrowRight size={12} />
                        </div>
                        <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-orange-900/50 flex-shrink-0">
                          {item.generatedImage ? (
                            <img
                              src={getImageSrc(item.generatedImage)}
                              alt="Generated"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full bg-stone-800 flex items-center justify-center text-stone-600">
                              <Icons.Image size={16} />
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-[10px] text-stone-400 line-clamp-2 leading-relaxed">{item.prompt}</p>
                      <div className="flex items-center gap-1 text-[9px] text-stone-600">
                        <Icons.Clock size={8} />
                        {new Date(item.timestamp).toLocaleString('zh-CN')}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
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
                  onClick={() => loadHistoryItem(index)}
                  onDelete={() => handleDeleteHistoryItem(index)}
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