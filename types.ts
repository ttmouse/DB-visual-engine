
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

export interface ReferenceImage {
  id: string;
  url: string;
  name: string;
  mimeType: string;
  aspectRatio: string;
}

export interface HistoryItem {
  id: string;
  groupId?: string; // New field for grouping related generations
  prompt: string;
  timestamp: number;
  originalImage: string; // base64
  generatedImage?: string; // base64 (full resolution)
  generatedImageThumb?: string; // base64 (thumbnail for gallery, ~200px)
  mimeType?: string;
  referenceImages?: ReferenceImage[];
  detectedAspectRatio?: string;
  hasOriginalImage?: boolean; // Transient flag: Indicates if originalImage exists but was stripped for performance
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
  generatedImage: string | null;
  editablePrompt: string;
  activeRole: AgentRole | null;
  results: Record<AgentRole, AnalysisResult>;
  history: HistoryItem[];
  promptHistory: string[];
  selectedHistoryIndex: number | null;
  currentGroupId: string;


  // Missing properties added to fix lint errors
  isGeneratingImage: boolean;
  isRefiningPrompt: boolean;
  isTemplatizing: boolean;
  isRefining: boolean;
  videoAnalysisDuration: number | null;
  detectedAspectRatio: string;
  currentPromptIndex?: number;

  // Settings
  layoutData: LayoutElement[] | null;
  isAnalyzingLayout: boolean;

  // UI States
  isComparing: boolean;
  activeTab: string;

  // Prompt Studio
  useReferenceImage: boolean; // Toggle for "Text to Image" vs "Image to Image" using the main input image
  referenceImages: ReferenceImage[]; // Dragged reference images for the prompt
  promptCache: Record<string, string>; // Cache prompts by language (CN/EN)

  // Global History
  generatedImages: string[];

  isVersionDropdownOpen: boolean;

  // Chat/Suggestions
  suggestions: string[];
  selectedSuggestionIndices: number[];

  // Error handling
  promptError: string | null;
}

export type AgentPromptGenerator = (previousContext: string) => string;

// Image generation quality options
export type ImageQuality = 'standard' | '4k';

// Chat/Skill System Types
export type SkillType = 'quality-check' | 'reverse' | 'translate' | 'refine' | 'generate';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'skill-result';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
  // Skill result specific
  skillType?: SkillType;
  suggestions?: string[];
  selectedIndices?: number[];
  applied?: boolean;
}

// Pipeline Progress Types
export enum PipelineStepStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  ERROR = 'error'
}

export interface PipelineStep {
  role: AgentRole;
  name: string;
  description: string;
  status: PipelineStepStatus;
  progress: number;
  streamingContent: string;
  finalContent: string;
  startTime: number | null;
  endTime: number | null;
  error: string | null;
}

export interface PipelineProgress {
  isRunning: boolean;
  currentStepIndex: number;
  steps: PipelineStep[];
  totalProgress: number;
  estimatedTimeRemaining: number | null;
  startTime: number | null;
}

// UI Tab Types (moved from App.tsx)
export type TabType = AgentRole.AUDITOR | AgentRole.DESCRIPTOR | AgentRole.ARCHITECT | 'STUDIO';

// Refine Mode Config (moved from App.tsx)
export type RefineModeConfig = 'optimize-auto' | 'optimize-prompt';

// Reverse Mode Config (moved from App.tsx)
export type ReverseModeConfig = 'quick-auto' | 'quick-prompt' | 'full-auto' | 'full-prompt';

