/**
 * [INPUT]: 依赖 types (AppState, AgentRole)
 * [OUTPUT]: 导出 INITIAL_RESULTS, INITIAL_STATE
 * [POS]: Constants 配置模块
 * [PROTOCOL]: 变更时更新此头部
 */

import { AgentRole, AppState } from '../types';

export const INITIAL_RESULTS = {
    [AgentRole.AUDITOR]: { role: AgentRole.AUDITOR, content: '', isStreaming: false, isComplete: false },
    [AgentRole.DESCRIPTOR]: { role: AgentRole.DESCRIPTOR, content: '', isStreaming: false, isComplete: false },
    [AgentRole.ARCHITECT]: { role: AgentRole.ARCHITECT, content: '', isStreaming: false, isComplete: false },
    [AgentRole.SYNTHESIZER]: { role: AgentRole.SYNTHESIZER, content: '', isStreaming: false, isComplete: false },
    [AgentRole.CRITIC]: { role: AgentRole.CRITIC, content: '', isStreaming: false, isComplete: false },
    [AgentRole.SORA_VIDEOGRAPHER]: { role: AgentRole.SORA_VIDEOGRAPHER, content: '', isStreaming: false, isComplete: false },
};

export const createInitialState = (): AppState => ({
    image: null,
    mimeType: '',
    isProcessing: false,
    activeRole: null,
    results: INITIAL_RESULTS,
    currentGroupId: crypto.randomUUID(),
    generatedImage: null,
    generatedImages: [],
    isGeneratingImage: false,
    editablePrompt: '',
    promptHistory: [],
    currentPromptIndex: 0,
    isRefiningPrompt: false,
    useReferenceImage: false,
    isTemplatizing: false,
    detectedAspectRatio: "1:1",
    videoAnalysisDuration: null,
    isRefining: false,
    history: [],
    isVersionDropdownOpen: false,
    layoutData: null,
    isAnalyzingLayout: false,
    suggestions: [],
    selectedSuggestionIndices: [],
    promptCache: { CN: '', EN: '' },
    selectedHistoryIndex: 0,
    referenceImages: [],
    isComparing: false,
    activeTab: 'STUDIO',
    promptError: null,
    tasks: []
});

export const INITIAL_STATE: AppState = createInitialState();
