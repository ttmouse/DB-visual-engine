
import React, { useState, useEffect, useRef } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { AgentCard } from './components/AgentCard';
import { ImageViewer } from './components/ImageViewer';
import { ToastContainer, ToastMessage, ToastType } from './components/Toast';
import { Icons } from './components/Icons';
import { streamAgentAnalysis, generateImageFromPrompt, streamConsistencyCheck, refinePromptWithFeedback, detectLayout, translatePrompt } from './services/geminiService';
import { saveHistoryItem, getHistory } from './services/historyService';
import { AGENTS, PIPELINE_ORDER } from './constants';
import { AgentRole, AppState, HistoryItem } from './types';
import { LandingPage } from './components/LandingPage';
import { DocumentationModal } from './components/DocumentationModal';
import { ApiKeyModal } from './components/ApiKeyModal';
import ReactMarkdown from 'react-markdown';

const INITIAL_RESULTS = {
  [AgentRole.AUDITOR]: { role: AgentRole.AUDITOR, content: '', isStreaming: false, isComplete: false },
  [AgentRole.DESCRIPTOR]: { role: AgentRole.DESCRIPTOR, content: '', isStreaming: false, isComplete: false },
  [AgentRole.ARCHITECT]: { role: AgentRole.ARCHITECT, content: '', isStreaming: false, isComplete: false },
  [AgentRole.SYNTHESIZER]: { role: AgentRole.SYNTHESIZER, content: '', isStreaming: false, isComplete: false },
  [AgentRole.CRITIC]: { role: AgentRole.CRITIC, content: '', isStreaming: false, isComplete: false },
  [AgentRole.SORA_VIDEOGRAPHER]: { role: AgentRole.SORA_VIDEOGRAPHER, content: '', isStreaming: false, isComplete: false },
};

const INITIAL_STATE: AppState = {
  image: null, mimeType: '', isProcessing: false, activeRole: null, results: INITIAL_RESULTS,
  generatedImage: null, generatedImages: [], isGeneratingImage: false,
  editablePrompt: '', promptHistory: [], currentPromptIndex: 0, isRefiningPrompt: false,
  useReferenceImage: false, isTemplatizing: false, detectedAspectRatio: "1:1",
  videoAnalysisDuration: null, isRefining: false, history: [], isHistoryOpen: false,
  layoutData: null, isAnalyzingLayout: false,
  suggestions: [], selectedSuggestionIndices: [],
  promptCache: { CN: '', EN: '' }
};

type TabType = AgentRole.AUDITOR | AgentRole.DESCRIPTOR | AgentRole.ARCHITECT | 'STUDIO';

const App: React.FC = () => {
  const [showLanding, setShowLanding] = useState(true);
  const [hasKey, setHasKey] = useState(false);
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [displayImage, setDisplayImage] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>(AgentRole.AUDITOR);
  const [refinementInput, setRefinementInput] = useState('');
  const [fullscreenImg, setFullscreenImg] = useState<string | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState<'CN' | 'EN'>('CN');

  const isPipelineRunning = useRef(false);

  const showToast = (message: string, type: ToastType = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
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
      setState(prev => ({ ...prev, history: hist }));
    };
    init();
  }, []);

  const handleSelectKey = async () => {
    setIsKeyModalOpen(true);
  };

  const handleFileSelected = (base64Data: string, aspectRatio: string, mimeType: string, duration?: number) => {
    setDisplayImage(`data:${mimeType};base64,${base64Data}`);
    setState(prev => ({
      ...INITIAL_STATE, history: prev.history, image: base64Data, mimeType: mimeType,
      videoAnalysisDuration: duration || null, isProcessing: true,
      activeRole: AgentRole.AUDITOR, detectedAspectRatio: aspectRatio
    }));
    setActiveTab(AgentRole.AUDITOR);
    isPipelineRunning.current = false;
  };

  const handleReset = () => {
    setDisplayImage(null);
    setState(prev => ({ ...INITIAL_STATE, history: prev.history }));
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
      setCurrentLang(target);
    } catch (e) { showToast("翻译失败", "error"); }
  };

  const parseSuggestions = (content: string) => {
    const markers = ["调优建议", "调优指令", "Optimization", "Optimization Suggestions"];
    let sectionText = "";

    for (const marker of markers) {
      const parts = content.split(marker);
      if (parts.length > 1) {
        sectionText = parts[parts.length - 1];
        break;
      }
    }

    if (!sectionText) return [];

    return sectionText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 3)
      .map(line => line.replace(/^[^\w\u4e00-\u9fa5]+/, '').trim())
      .filter(line => line.length > 5)
      .slice(0, 3);
  };

  const processImagePipeline = async () => {
    if (!state.image || isPipelineRunning.current) return;
    isPipelineRunning.current = true;
    let accumulatedContext = `[Ratio: ${state.detectedAspectRatio}]`;
    try {
      for (const role of PIPELINE_ORDER) {
        if (role !== AgentRole.SYNTHESIZER) setActiveTab(role as TabType);
        setState(prev => ({
          ...prev, activeRole: role,
          results: { ...prev.results, [role]: { ...prev.results[role], content: '', isStreaming: true, isComplete: false } }
        }));

        let agentContent = "";
        const stream = streamAgentAnalysis(role, state.image!, accumulatedContext);
        for await (const chunk of stream) {
          agentContent += chunk;
          setState(prev => ({ ...prev, results: { ...prev.results, [role]: { ...prev.results[role], content: agentContent } } }));
        }
        accumulatedContext += `\n\n--- ${role} ---\n${agentContent}\n`;
        setState(prev => ({ ...prev, results: { ...prev.results, [role]: { ...prev.results[role], isStreaming: false, isComplete: true } } }));

        if (role === AgentRole.SYNTHESIZER) {
          setState(prev => ({
            ...prev,
            editablePrompt: agentContent,
            promptCache: { ...prev.promptCache, CN: agentContent }
          }));
          setActiveTab('STUDIO');
        }
      }
    } finally {
      setState(prev => ({ ...prev, isProcessing: false }));
      isPipelineRunning.current = false;
    }
  };

  useEffect(() => {
    if (state.isProcessing && !isPipelineRunning.current) processImagePipeline();
  }, [state.isProcessing]);

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
      const newPrompt = await refinePromptWithFeedback(state.editablePrompt, selectedText);
      setState(prev => ({
        ...prev, editablePrompt: newPrompt, isRefiningPrompt: false,
        promptCache: { CN: '', EN: '' }
      }));
      handleGenerateImage(newPrompt);
      showToast("已应用修订并重绘", "success");
    } catch (e) {
      setState(prev => ({ ...prev, isRefiningPrompt: false }));
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
          history: [newItem, ...prev.history]
        }));
        setTimeout(() => handleRunQA(), 500);
      }
    } catch (e) { showToast("生成失败", 'error'); setState(prev => ({ ...prev, isGeneratingImage: false })); }
  };

  const renderTabContent = () => {
    if (activeTab === 'STUDIO') {
      return (
        <div className="flex flex-col h-full bg-white relative">
          <div className="px-8 pt-6 pb-2 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-black rounded text-white shadow-sm"><Icons.PenTool size={10} /></div>
              <h3 className="font-bold text-stone-800 text-[10px] tracking-widest uppercase font-mono">Prompt Studio</h3>
            </div>
            <button
              onClick={handleToggleLanguage}
              className="flex items-center gap-2 px-3 py-1 bg-stone-100 rounded-full text-[9px] font-bold text-stone-500 hover:bg-stone-200 transition-all"
            >
              <Icons.Languages size={12} />
              {currentLang === 'CN' ? '切换 MJ 英文模式' : '切换中文工程模式'}
            </button>
          </div>
          <div className="flex-1 min-h-0 px-8 py-4 mb-24 overflow-hidden">
            <textarea
              value={state.editablePrompt}
              onChange={(e) => setState(prev => ({ ...prev, editablePrompt: e.target.value }))}
              className="w-full h-full bg-transparent border-none p-0 text-[13px] font-sans leading-relaxed focus:ring-0 outline-none transition-all resize-none overflow-y-auto custom-scrollbar"
              placeholder="正在逆向推导物理协议..."
              spellCheck={false}
            />
          </div>
          <div className="absolute bottom-6 left-8 right-8 z-30">
            <div className="bg-white border border-stone-200 rounded-2xl shadow-xl p-2.5 flex items-center gap-3">
              <button onClick={() => setState(prev => ({ ...prev, useReferenceImage: !prev.useReferenceImage }))} title="启用图生图参考" className={`p-2.5 rounded-xl transition-all ${state.useReferenceImage ? 'bg-orange-50 text-orange-600 animate-pulse-orange shadow-inner' : 'bg-stone-50 text-stone-400'}`}><Icons.Image size={18} /></button>
              <input type="text" value={refinementInput} onChange={(e) => setRefinementInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleGenerateImage()} placeholder="输入指令微调或直接重绘..." className="flex-1 bg-transparent border-none text-xs outline-none font-medium placeholder:text-stone-300" />
              <button onClick={() => handleGenerateImage()} disabled={state.isGeneratingImage || !state.editablePrompt} className="px-6 py-2.5 bg-black text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg active:scale-95 transition-all">
                {state.isGeneratingImage ? <Icons.RefreshCw size={14} className="animate-spin" /> : <Icons.Play size={14} fill="currentColor" />}
                复刻资产
              </button>
            </div>
          </div>
        </div>
      );
    }
    return <div className="h-full overflow-y-auto p-8 pr-2 custom-scrollbar"><AgentCard config={AGENTS[activeTab as AgentRole]} result={state.results[activeTab as AgentRole]} isActive={state.activeRole === activeTab} isPending={!state.results[activeTab as AgentRole]?.content} /></div>;
  };

  if (showLanding) return <LandingPage onEnterApp={() => setShowLanding(false)} hasKey={hasKey} onSelectKey={handleSelectKey} />;

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans selection:bg-stone-200 overflow-hidden">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <DocumentationModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      <ApiKeyModal isOpen={isKeyModalOpen} onClose={() => setIsKeyModalOpen(false)} />

      {/* Fullscreen Overlay */}
      {fullscreenImg && (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-md flex items-center justify-center p-10 animate-in fade-in duration-300" onClick={() => setFullscreenImg(null)}>
          <button className="absolute top-10 right-10 text-white/50 hover:text-white transition-colors z-[210] p-4"><Icons.X size={32} /></button>
          <div className="w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <img src={fullscreenImg} alt="Fullscreen View" className="max-w-[95%] max-h-[95%] object-contain shadow-[0_0_100px_rgba(0,0,0,0.5)] rounded-lg pointer-events-none" />
          </div>
        </div>
      )}

      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-stone-200 h-16 flex items-center justify-between px-10">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setShowLanding(true)}>
          <div className="w-8 h-8 bg-black rounded flex items-center justify-center text-white shadow-xl"><Icons.Compass size={18} /></div>
          <span className="font-serif font-bold text-xl tracking-tight text-stone-800">DB</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsHelpOpen(true)} className="p-2.5 rounded-full hover:bg-stone-100 text-stone-400 hover:text-orange-500 transition-all" title="帮助文档"><Icons.Help size={20} /></button>
          <button onClick={() => setState(prev => ({ ...prev, isHistoryOpen: true }))} className="p-2.5 rounded-full hover:bg-stone-100 text-stone-400 hover:text-black transition-all" title="历史记录"><Icons.History size={20} /></button>
          <div className="w-px h-6 bg-stone-200 mx-1" />
          <button onClick={handleSelectKey} className={`p-2.5 rounded-full hover:bg-stone-100 ${hasKey ? 'text-emerald-500' : 'text-stone-300'}`} title="API Key 状态"><Icons.Key size={20} /></button>
        </div>
      </nav>

      <main className="pt-24 px-8 max-w-[1920px] mx-auto grid grid-cols-12 gap-8 h-[calc(100vh-6rem)]">
        {/* Left Sidebar: Assets & References - Fixed Scrolling */}
        <div className="col-span-4 flex flex-col min-h-0 h-full pb-10">
          {!displayImage ? (
            <ImageUploader onImageSelected={handleFileSelected} disabled={state.isProcessing} />
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-4 space-y-6 animate-in slide-in-from-left duration-700">
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Source Reference</h2>
                  <button onClick={handleReset} className="flex items-center gap-1.5 text-[9px] font-bold text-stone-400 hover:text-rose-500 transition-colors uppercase"><Icons.Plus size={10} /> New Task</button>
                </div>
                <ImageViewer
                  src={displayImage}
                  alt="Source"
                  layoutData={state.layoutData}
                  onToggleLayout={handleAnalyzeLayout}
                  isAnalyzingLayout={state.isAnalyzingLayout}
                  onFullscreen={() => setFullscreenImg(displayImage)}
                />
              </div>
              {state.generatedImage && (
                <div className="space-y-2 animate-in slide-in-from-top duration-500">
                  <h2 className="text-[10px] font-bold text-orange-500 uppercase tracking-widest px-1 flex items-center gap-2">
                    <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" /> Latest Replica
                  </h2>
                  <ImageViewer src={`data:image/png;base64,${state.generatedImage}`} alt="Latest" className="border-orange-200 shadow-2xl ring-4 ring-orange-50" onFullscreen={() => setFullscreenImg(`data:image/png;base64,${state.generatedImage}`)} />
                </div>
              )}
              {state.generatedImages.length > 1 && (
                <div className="space-y-2">
                  <h2 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest px-1">Iteration History</h2>
                  <div className="grid grid-cols-2 gap-3 pb-8">
                    {state.generatedImages.slice(1).map((img, idx) => (
                      <ImageViewer key={idx} src={`data:image/png;base64,${img}`} alt="Gen" onFullscreen={() => setFullscreenImg(`data:image/png;base64,${img}`)} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Center: Agent Workbench */}
        <div className="col-span-5 flex flex-col min-h-0 h-full bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden relative">
          <div className="flex border-b border-stone-100 bg-stone-50 flex-shrink-0">
            {['AUDITOR', 'DESCRIPTOR', 'ARCHITECT', 'STUDIO'].map((tid) => {
              const isStudio = tid === 'STUDIO';
              const roleKey = isStudio ? AgentRole.SYNTHESIZER : tid as AgentRole;
              const iconName = isStudio ? 'PenTool' : AGENTS[roleKey]?.icon;
              const IconComponent = Icons[iconName as keyof typeof Icons];
              return (
                <button key={tid} onClick={() => setActiveTab(tid as any)} className={`flex-1 px-4 py-4 flex flex-col items-center gap-1.5 relative border-r border-stone-100 last:border-r-0 transition-all ${activeTab === tid ? 'bg-white' : 'text-stone-400 hover:bg-stone-100/50'}`}>
                  <div className="relative">
                    <div className={`p-1.5 rounded-lg transition-all ${activeTab === tid ? 'bg-black text-white scale-110 shadow-lg' : 'bg-stone-200'}`}>
                      {state.results[roleKey]?.isStreaming ? <Icons.RefreshCw size={12} className="animate-spin" /> : IconComponent && <IconComponent size={12} />}
                    </div>
                    {state.results[roleKey]?.isComplete && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />}
                  </div>
                  <span className={`text-[8px] font-bold uppercase tracking-tight ${activeTab === tid ? 'text-black' : 'text-stone-500'}`}>{isStudio ? '工作室' : AGENTS[roleKey]?.name.split(' ')[0]}</span>
                  {activeTab === tid && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />}
                </button>
              );
            })}
          </div>
          <div className="flex-1 min-h-0 bg-white relative">
            {!state.image ? (
              <div className="h-full flex flex-col items-center justify-center text-stone-200 space-y-4">
                <Icons.Compass size={48} strokeWidth={1} className="animate-spin duration-10000" />
                <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Visual Decoding Standby</p>
              </div>
            ) : renderTabContent()}
          </div>
        </div>

        {/* Right Sidebar: Precision Review (QA) - Fixed Layout */}
        <div className="col-span-3 h-full flex flex-col bg-white border border-stone-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-stone-100 bg-stone-50 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-rose-50 rounded text-rose-500"><Icons.ScanEye size={14} /></div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-stone-600">Precision Review</span>
            </div>
            {state.generatedImage && !state.isRefining && (
              <button onClick={handleRunQA} className="p-2 hover:bg-stone-200 rounded-lg text-stone-400 hover:text-stone-800 transition-colors" title="重新分析"><Icons.RefreshCw size={14} /></button>
            )}
          </div>
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col relative">
            {!state.generatedImage ? (
              <div className="flex-1 flex flex-col items-center justify-center text-stone-200 text-center space-y-3 opacity-60">
                <Icons.Image size={40} strokeWidth={1} />
                <p className="text-[11px] font-medium leading-relaxed">等待资产生成...</p>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar pb-10">
                  <div className="prose prose-stone max-w-none text-[12px] leading-relaxed text-stone-600">
                    <ReactMarkdown>{state.results[AgentRole.CRITIC].content.split(/(?:调优建议|调优指令|Optimization)/i)[0]}</ReactMarkdown>
                  </div>

                  {state.isRefining && (
                    <div className="flex flex-col items-center gap-3 py-10 animate-pulse bg-stone-50/50 rounded-2xl border border-dashed border-stone-200 mt-4">
                      <Icons.RefreshCw size={24} className="animate-spin text-orange-500" />
                      <p className="text-[9px] font-bold text-stone-400 tracking-[0.2em] uppercase text-center">像素级差异捕获中...</p>
                    </div>
                  )}

                  {state.suggestions.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-stone-100 space-y-4 animate-in slide-in-from-bottom duration-500 pb-24">
                      <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">可勾选的修订协议</h4>
                      <div className="space-y-2">
                        {state.suggestions.map((sug, idx) => {
                          const isSelected = state.selectedSuggestionIndices.includes(idx);
                          return (
                            <div key={idx} onClick={() => {
                              const s = [...state.selectedSuggestionIndices];
                              if (isSelected) setState(p => ({ ...p, selectedSuggestionIndices: s.filter(i => i !== idx) }));
                              else setState(p => ({ ...p, selectedSuggestionIndices: [...s, idx] }));
                            }}
                              className={`group flex items-start gap-3 p-3 rounded-2xl cursor-pointer transition-all border ${isSelected ? 'bg-emerald-50 border-emerald-100 text-emerald-900 shadow-sm' : 'hover:bg-stone-50 border-stone-100 text-stone-500 bg-white'}`}
                            >
                              <div className={`mt-0.5 w-4 h-4 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all ${isSelected ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-stone-200 bg-white'}`}>
                                {isSelected && <Icons.CheckSquare size={10} />}
                              </div>
                              <span className="text-[11px] leading-snug font-medium">{sug}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Action Area */}
                {state.suggestions.length > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent pt-10">
                    <button onClick={handleAutoFix} disabled={state.selectedSuggestionIndices.length === 0 || state.isRefiningPrompt}
                      className="w-full py-4 bg-black text-white rounded-2xl text-[11px] font-bold uppercase shadow-2xl disabled:opacity-30 transition-all flex items-center justify-center gap-2 hover:bg-stone-800 active:scale-[0.98]"
                    >
                      {state.isRefiningPrompt ? <Icons.RefreshCw size={14} className="animate-spin" /> : <Icons.Wand2 size={14} />}
                      应用所选修订并重绘
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
