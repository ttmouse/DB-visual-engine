
import React, { useState, useEffect, useRef } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { AgentCard } from './components/AgentCard';
import { ImageViewer } from './components/ImageViewer';
import { ImageComparisonSlider } from './components/ImageComparisonSlider';
import { HistoryThumbnail } from './components/HistoryThumbnail';
import { ToastContainer, ToastMessage, ToastType } from './components/Toast';
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
import { AgentRole, AppState, HistoryItem, ChatMessage, PipelineStepStatus } from './types';
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
  layoutData: null, isAnalyzingLayout: false,
  suggestions: [], selectedSuggestionIndices: [],
  promptCache: { CN: '', EN: '' },
  selectedHistoryIndex: 0
};

type TabType = AgentRole.AUDITOR | AgentRole.DESCRIPTOR | AgentRole.ARCHITECT | 'STUDIO';

const App: React.FC = () => {
  const [showLanding, setShowLanding] = useState(true);
  const [hasKey, setHasKey] = useState(false);
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [displayImage, setDisplayImage] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('STUDIO');
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
  const [isGlobalDragging, setIsGlobalDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const analyzeAbortRef = useRef<AbortController | null>(null);

  // Synchronized image zoom state
  const [imageZoom, setImageZoom] = useState({ scale: 1, panX: 0, panY: 0 });
  const imageContainerRef = useRef<HTMLDivElement>(null);

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

  // Global drag-drop for image replacement
  useEffect(() => {
    let dragCounter = 0;

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounter++;
      if (e.dataTransfer?.types.includes('Files')) {
        setIsGlobalDragging(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter === 0) {
        setIsGlobalDragging(false);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounter = 0;
      setIsGlobalDragging(false);

      const file = e.dataTransfer?.files?.[0];
      if (file && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
        if (file.size > 20 * 1024 * 1024) {
          showToast('文件过大 (最大 20MB)', 'error');
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          const cleanBase64 = base64String.split(',')[1];

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
              handleFileSelected(cleanBase64, closest.id, file.type);
            };
            img.src = base64String;
          }
        };
        reader.readAsDataURL(file);
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);

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
        selectedHistoryIndex: state.selectedHistoryIndex
      });
    }
  }, [
    state.image,
    state.mimeType,
    displayImage,
    state.detectedAspectRatio,
    state.videoAnalysisDuration,
    state.results,
    state.editablePrompt,
    state.generatedImage,
    state.generatedImages,
    state.layoutData,
    state.promptCache,
    state.selectedHistoryIndex
  ]);

  // Helper to load history item
  const loadHistoryItem = (index: number) => {
    // 1. Check if index is valid
    if (index < 0 || index >= state.history.length) return;

    const historyItem = state.history[index];
    if (!historyItem) return;

    // 2. Set selected index
    setSelectedHistoryIndex(index);

    // 3. Restore state
    setDisplayImage(`data:${historyItem.mimeType || 'image/png'};base64,${historyItem.originalImage}`);
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

  // Keyboard Shortcuts for History
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      if (state.generatedImages.length === 0) return;

      if (e.key === 'ArrowLeft') {
        const newIndex = Math.max(0, state.selectedHistoryIndex - 1);
        if (newIndex !== state.selectedHistoryIndex) {
          loadHistoryItem(newIndex);
        }
      } else if (e.key === 'ArrowRight') {
        const newIndex = Math.min(state.generatedImages.length - 1, state.selectedHistoryIndex + 1);
        if (newIndex !== state.selectedHistoryIndex) {
          loadHistoryItem(newIndex);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.generatedImages.length, state.selectedHistoryIndex, state.history]);


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

  useEffect(() => {
    const init = async () => {
      // Check for environment variable injection
      const envKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
      if (envKey && envKey.length > 10) {
        setHasKey(true);
      }
      const hist = await getHistory();

      // Load cached task state
      const cached = loadCurrentTask();
      if (cached) {
        // 从 history 中提取所有 generatedImage，重建 generatedImages 数组
        const generatedImages = hist
          .filter(item => item.generatedImage)
          .map(item => item.generatedImage);

        setState(prev => ({
          ...prev,
          history: hist,
          image: cached.image,
          mimeType: cached.mimeType,
          detectedAspectRatio: cached.detectedAspectRatio,
          videoAnalysisDuration: cached.videoAnalysisDuration,
          results: cached.results,
          editablePrompt: cached.editablePrompt,
          generatedImage: cached.generatedImage || (hist.length > 0 && hist[0].generatedImage ? hist[0].generatedImage : null),
          generatedImages: generatedImages.length > 0 ? generatedImages : cached.generatedImages,
          layoutData: cached.layoutData,
          promptCache: cached.promptCache,
          selectedHistoryIndex: cached.selectedHistoryIndex || 0
        }));

        if (cached.displayImage) {
          setDisplayImage(cached.displayImage);
        }

        // 有缓存状态，跳过首页
        setShowLanding(false);
      } else {
        // 从 history 中生成 generatedImages
        const generatedImages = hist
          .filter(item => item.generatedImage)
          .map(item => item.generatedImage);

        // 如果有历史记录，从最新的历史项恢复原始图片
        if (hist.length > 0 && hist[0].originalImage) {
          const latestItem = hist[0];
          setDisplayImage(`data:${latestItem.mimeType || 'image/png'};base64,${latestItem.originalImage}`);
          setState(prev => ({
            ...prev,
            history: hist,
            image: latestItem.originalImage,
            mimeType: latestItem.mimeType || 'image/png',
            detectedAspectRatio: latestItem.detectedAspectRatio || '1:1',
            generatedImages: generatedImages,
            generatedImage: latestItem.generatedImage || null,
            editablePrompt: latestItem.prompt || ''
          }));

          // 有历史记录，跳过首页
          setShowLanding(false);
        } else {
          setState(prev => ({
            ...prev,
            history: hist,
            generatedImages: generatedImages
          }));
        }
      }
    };
    init();
  }, []);

  const handleSelectKey = async () => {
    setIsKeyModalOpen(true);
  };

  const handleFileSelected = (base64Data: string, aspectRatio: string, mimeType: string, duration?: number) => {
    setDisplayImage(`data:${mimeType};base64,${base64Data}`);
    setState(prev => ({
      ...INITIAL_STATE,
      history: prev.history,
      generatedImages: prev.generatedImages,
      selectedHistoryIndex: prev.selectedHistoryIndex,
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

  const handleGenerateImage = async (customPrompt?: string) => {
    const p = customPrompt || state.editablePrompt;
    if (state.isGeneratingImage || !p) return;
    setState(prev => ({ ...prev, isGeneratingImage: true }));
    try {
      const img = await generateImageFromPrompt(p, state.detectedAspectRatio, state.useReferenceImage ? state.image : null, state.mimeType);
      if (img) {
        const newItem: HistoryItem = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          originalImage: state.image!,
          mimeType: state.mimeType,
          detectedAspectRatio: state.detectedAspectRatio,
          prompt: p,
          generatedImage: img,
          criticFeedback: null
        };
        await saveHistoryItem(newItem);
        setState(prev => ({
          ...prev,
          generatedImage: img,
          generatedImages: [img, ...prev.generatedImages],
          isGeneratingImage: false,
          history: [newItem, ...prev.history],
          selectedHistoryIndex: 0
        }));
        setTimeout(() => handleRunQA(), 500);
      }
    } catch (e) { showToast("生成失败", 'error'); setState(prev => ({ ...prev, isGeneratingImage: false })); }
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
      setState(prev => ({ ...prev, results: { ...prev.results, [role]: { ...prev.results[role], isStreaming: false, isComplete: true } }, activeRole: null }));

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
              {/* Version Selector */}
              <div className="flex items-center gap-2">
                <select
                  className="text-xs bg-stone-800 border-0 rounded-lg px-2 py-1.5 text-stone-300 font-bold focus:ring-2 focus:ring-black/10 outline-none cursor-pointer hover:bg-stone-700 transition-colors"
                  value={promptManager.getActiveVersionId(AgentRole.SYNTHESIZER) || ''}
                  onChange={(e) => {
                    promptManager.setActiveVersionId(AgentRole.SYNTHESIZER, e.target.value);
                    // Force re-render
                    setState(prev => ({ ...prev }));
                  }}
                >
                  {promptManager.getVersions(AgentRole.SYNTHESIZER).map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1.5">
                {state.promptHistory.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => setIsHistoryDropdownOpen(!isHistoryDropdownOpen)}
                      className="flex items-center gap-1 px-2 py-1 bg-amber-900/20 text-amber-500 hover:bg-amber-900/40 rounded-lg text-[9px] font-bold transition-colors"
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
          <div className="flex-1 min-h-0 p-4 flex flex-col">
            <textarea
              value={state.editablePrompt}
              onChange={(e) => setState(prev => ({ ...prev, editablePrompt: e.target.value }))}
              className="flex-1 w-full bg-stone-950 rounded-xl border border-stone-800 p-4 text-[12px] font-mono leading-relaxed focus:ring-2 focus:ring-stone-600 outline-none resize-none overflow-y-auto custom-scrollbar text-stone-200 placeholder:text-stone-600"
              placeholder="正在等待提示词生成..."
              spellCheck={false}
            />
          </div>

          {/* Bottom Actions */}
          <div className="p-4 border-t border-stone-800 flex-shrink-0 space-y-3">
            {/* Button Row */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setState(prev => ({ ...prev, useReferenceImage: !prev.useReferenceImage }))}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all text-xs font-bold flex-shrink-0 ${state.useReferenceImage ? 'bg-orange-900/30 text-orange-400' : 'bg-stone-800 text-stone-500 hover:text-stone-300'}`}
                title="图生图参考"
              >
                <Icons.Image size={14} />
                {state.useReferenceImage ? '参考' : '文生'}
              </button>
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
                className="flex-1 py-2 bg-stone-800 text-stone-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-40 hover:bg-stone-700 transition-all border border-stone-700"
                title={reverseMode === 'quick' ? '快速单步逆向' : '完整4步分析'}
              >
                <Icons.Sparkles size={14} />
                生成提示词
              </button>
              <button
                onClick={() => handleGenerateImage()}
                disabled={state.isGeneratingImage || !state.editablePrompt}
                className="flex-1 py-2 bg-stone-100 text-black rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-40 hover:bg-white transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)]"
              >
                {state.isGeneratingImage ? <Icons.RefreshCw size={14} className="animate-spin" /> : <Icons.Play size={14} />}
                生成图片
              </button>
              {/* Quality Check Button Hidden
              <button
                onClick={() => {
                  handleChatSendMessage('帮我质检一下');
                  setIsChatDrawerOpen(true);
                }}
                disabled={!state.image || !state.generatedImage || isChatProcessing}
                className="px-3 py-2 bg-rose-900/20 hover:bg-rose-900/40 text-rose-400 rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 transition-all flex-shrink-0"
                title="质检"
              >
                <Icons.ScanEye size={14} />
                质检
              </button>
              */}
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

            {/* AI Input Row */}
            <div className="relative bg-stone-800 rounded-xl p-3 border border-stone-700">
              <textarea
                ref={(el) => {
                  if (el) {
                    el.style.height = 'auto';
                    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
                    el.style.overflowY = el.scrollHeight > 200 ? 'auto' : 'hidden';
                  }
                }}
                value={aiInput}
                onChange={(e) => {
                  setAiInput(e.target.value);
                  // Auto-resize
                  const target = e.target;
                  target.style.height = 'auto';
                  const newHeight = Math.min(target.scrollHeight, 200);
                  target.style.height = newHeight + 'px';
                  target.style.overflowY = target.scrollHeight > 200 ? 'auto' : 'hidden';
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
                className={`w-full bg-transparent border-none text-sm outline-none text-stone-200 placeholder:text-stone-500 resize-none min-h-[24px] max-h-[200px] leading-relaxed pr-24 ${isAnalyzing ? 'placeholder:animate-pulse' : ''}`}
                disabled={isChatProcessing || isAnalyzing}
                rows={1}
              />
              {/* Buttons fixed at bottom-right */}
              <div className="absolute bottom-2 right-2 flex items-center gap-2">
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

      {/* Global Drag Overlay */}
      {isGlobalDragging && (
        <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-center justify-center pointer-events-none animate-in fade-in duration-200">
          <div className="flex flex-col items-center gap-4 text-white">
            <div className="w-24 h-24 rounded-full bg-orange-500/20 flex items-center justify-center animate-pulse">
              <Icons.Upload size={48} className="text-orange-500" />
            </div>
            <p className="text-xl font-medium">拖放图片以替换</p>
            <p className="text-sm text-stone-400">支持图片和视频文件</p>
          </div>
        </div>
      )}

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
            <div className="w-full h-full flex items-center justify-center gap-8 p-20" onClick={(e) => e.stopPropagation()}>
              <div className="flex-1 h-full flex flex-col items-center justify-center">
                <div className="text-white/50 text-sm mb-4 font-medium">ORIGINAL</div>
                <img
                  src={displayImage}
                  alt="Original"
                  className="max-w-full max-h-[85vh] object-contain shadow-[0_0_100px_rgba(0,0,0,0.5)] rounded-lg"
                />
              </div>
              <div className="flex-1 h-full flex flex-col items-center justify-center">
                <div className="text-white/50 text-sm mb-4 font-medium">GENERATED</div>
                <img
                  src={`data:image/png;base64,${state.generatedImages[state.selectedHistoryIndex]}`}
                  alt="Generated"
                  className="max-w-full max-h-[85vh] object-contain shadow-[0_0_100px_rgba(0,0,0,0.5)] rounded-lg"
                />
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center p-10" onClick={(e) => e.stopPropagation()}>
              <img
                src={fullscreenImg}
                alt="Fullscreen View"
                className="max-w-[95%] max-h-[95%] object-contain shadow-[0_0_100px_rgba(0,0,0,0.5)] rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
        </div>
      )}

      {/* History Panel */}
      {state.isHistoryOpen && (
        <div className="fixed inset-0 z-[150] bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setState(prev => ({ ...prev, isHistoryOpen: false }))}>
          <div
            className="absolute right-0 top-0 bottom-0 w-[400px] bg-stone-900 shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col border-l border-stone-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-stone-800 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-stone-800 rounded-xl"><Icons.History size={18} className="text-stone-400" /></div>
                <h2 className="text-lg font-serif font-bold text-stone-200">历史记录</h2>
              </div>
              <button
                onClick={() => setState(prev => ({ ...prev, isHistoryOpen: false }))}
                className="p-2 hover:bg-stone-800 rounded-lg transition-colors"
              >
                <Icons.X size={20} className="text-stone-500" />
              </button>
            </div>

            {/* History List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {state.history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-stone-600 space-y-3">
                  <Icons.Image size={48} strokeWidth={1} />
                  <p className="text-sm">暂无生成记录</p>
                </div>
              ) : (
                state.history.map((item) => (
                  <div
                    key={item.id}
                    className="bg-stone-950 rounded-2xl p-4 space-y-3 hover:bg-stone-800 transition-colors cursor-pointer group border border-stone-800"
                    onClick={() => {
                      // 加载提示词到编辑器
                      setState(prev => ({
                        ...prev,
                        editablePrompt: item.prompt,
                        promptCache: { ...prev.promptCache, CN: item.prompt }
                      }));
                      setActiveTab('STUDIO');

                      // 显示大图
                      if (item.generatedImage) {
                        setFullscreenImg(`data:image/png;base64,${item.generatedImage}`);
                      }
                    }}
                  >
                    {/* Images Row */}
                    <div className="flex gap-3">
                      {/* Original Image */}
                      <div className="w-16 h-16 rounded-lg overflow-hidden border border-stone-700 flex-shrink-0">
                        <img
                          src={`data:${item.mimeType || 'image/png'};base64,${item.originalImage}`}
                          alt="Original"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {/* Arrow */}
                      <div className="flex items-center text-stone-600">
                        <Icons.ArrowRight size={16} />
                      </div>
                      {/* Generated Image */}
                      <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-orange-900/50 flex-shrink-0 shadow-sm">
                        {item.generatedImage ? (
                          <img
                            src={`data:image/png;base64,${item.generatedImage}`}
                            alt="Generated"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full bg-stone-800 flex items-center justify-center text-stone-600">
                            <Icons.Image size={20} />
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Prompt Preview */}
                    <p className="text-xs text-stone-400 line-clamp-2 leading-relaxed">{item.prompt}</p>
                    {/* Timestamp */}
                    <div className="flex items-center gap-2 text-[10px] text-stone-600">
                      <Icons.Clock size={10} />
                      {new Date(item.timestamp).toLocaleString('zh-CN')}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
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
          <button onClick={handleSelectKey} className={`p-2.5 rounded-full hover:bg-stone-800 ${hasKey ? 'text-emerald-500' : 'text-stone-500'}`} title="API Key 状态"><Icons.Key size={20} /></button>
        </div>
      </nav>

      <main ref={mainRef} className={`fixed top-24 bottom-28 left-8 right-8 max-w-[1920px] mx-auto flex gap-0 z-0 ${isDraggingDivider ? 'select-none' : ''}`}>
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

          <div className="flex-1 min-h-0 relative">
            {!displayImage ? (
              <ImageUploader onImageSelected={handleFileSelected} disabled={state.isProcessing} />
            ) : (
              <div className="w-full h-full flex flex-col animate-in fade-in duration-500">
                {state.generatedImages.length > 0 ? (
                  isComparisonMode ? (
                    <ImageComparisonSlider
                      beforeImage={displayImage}
                      afterImage={`data:image/png;base64,${state.generatedImages[state.selectedHistoryIndex]}`}
                      className="w-full h-full border-0 rounded-none bg-stone-950/50"
                      layoutData={state.layoutData}
                      onToggleLayout={handleAnalyzeLayout}
                      isAnalyzingLayout={state.isAnalyzingLayout}
                      onFullscreen={() => { setFullscreenImg(displayImage); setIsFullscreenComparison(true); }}
                      zoom={imageZoom}
                      onZoomChange={handleZoomChange}
                    />
                  ) : (
                    <ImageViewer
                      src={`data:image/png;base64,${state.generatedImages[state.selectedHistoryIndex]}`}
                      alt="Generated Result"
                      className="w-full h-full border-0 rounded-none bg-stone-950/50"
                      layoutData={state.layoutData}
                      onToggleLayout={handleAnalyzeLayout}
                      isAnalyzingLayout={state.isAnalyzingLayout}
                      onFullscreen={() => setFullscreenImg(`data:image/png;base64,${state.generatedImages[state.selectedHistoryIndex]}`)}
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
                    onToggleLayout={handleAnalyzeLayout}
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
            {!state.image ? (
              <div className="h-full flex flex-col items-center justify-center text-stone-700 space-y-4">
                <Icons.Compass size={48} strokeWidth={1} className="animate-spin duration-10000 opacity-20" />
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-50">Visual Decoding Standby</p>
              </div>
            ) : renderTabContent()}
          </div>
        </div>
      </main>

      {/* Chat Drawer */}
      <ChatDrawer
        isOpen={isChatDrawerOpen}
        onClose={() => setIsChatDrawerOpen(false)}
        messages={chatMessages}
        onApplySuggestions={handleApplySuggestions}
        onToggleSuggestion={handleToggleSuggestion}
      />

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