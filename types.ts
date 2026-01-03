
export enum AgentRole {
  AUDITOR = 'AUDITOR',
  DESCRIPTOR = 'DESCRIPTOR',
  ARCHITECT = 'ARCHITECT',
  SYNTHESIZER = 'SYNTHESIZER',
  CRITIC = 'CRITIC',
  SORA_VIDEOGRAPHER = 'SORA_VIDEOGRAPHER'
}

export interface AgentConfig {
  id: AgentRole;
  name: string;
  icon: string;
  description: string;
  color: string;
  systemInstruction: string;
}

export interface AnalysisResult {
  role: AgentRole;
  content: string;
  isStreaming: boolean;
  isComplete: boolean;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  originalImage: string;
  mimeType?: string;
  detectedAspectRatio: string;
  prompt: string;
  generatedImage: string | null;
  criticFeedback: string | null;
}

export interface LayoutElement {
  label: string;
  box_2d: [number, number, number, number];
  hierarchy: 'Primary' | 'Secondary' | 'Tertiary' | 'Graphic';
}

export interface AppState {
  image: string | null;
  mimeType: string;
  isProcessing: boolean;
  activeRole: AgentRole | null;
  results: Record<AgentRole, AnalysisResult>;
  generatedImage: string | null;
  generatedImages: string[];
  isGeneratingImage: boolean;
  
  // Prompt Studio State
  editablePrompt: string;
  promptHistory: string[];
  currentPromptIndex: number;
  isRefiningPrompt: boolean;
  useReferenceImage: boolean;
  
  // Translation Cache
  promptCache: {
    CN: string;
    EN: string;
  };
  
  isTemplatizing: boolean;
  detectedAspectRatio: string;
  videoAnalysisDuration: number | null;
  isRefining: boolean;
  history: HistoryItem[];
  isHistoryOpen: boolean;
  layoutData: LayoutElement[] | null;
  isAnalyzingLayout: boolean;

  // Fix: Added missing properties used in App.tsx for QA and prompt refinement
  suggestions: string[];
  selectedSuggestionIndices: number[];
}

export type AgentPromptGenerator = (previousContext: string) => string;
