
import React from 'react';
import { AgentConfig, AnalysisResult } from '../types';
import { Icons } from './Icons';

interface AgentCardProps {
  config: AgentConfig;
  result: AnalysisResult | undefined;
  isActive: boolean;
  isPending: boolean;
  onRegenerate?: () => void;
  onContentChange?: (content: string) => void;
  onCopy?: () => void;
  onStartPipeline?: () => void;
}

export const AgentCard: React.FC<AgentCardProps> = ({ config, result, isActive, isPending, onRegenerate, onContentChange, onCopy, onStartPipeline }) => {
  const isComplete = result?.isComplete;
  const content = result?.content || '';

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-stone-800 flex-shrink-0">
        <div>
          <h2 className="text-base font-serif font-bold text-stone-200">{config.name}</h2>
          <p className="text-[10px] text-stone-500 font-medium tracking-wide uppercase mt-0.5">{config.description}</p>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Status Indicators */}
          {isComplete && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold">
              <Icons.CheckCircle2 size={12} /> 已完成
            </div>
          )}
          {isActive && !isComplete && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-stone-800 text-stone-400 text-[10px] font-bold">
              <Icons.RefreshCw className="animate-spin" size={12} />
              分析中
            </div>
          )}
        </div>
      </div>

      {/* Editable Content */}
      <div className="flex-1 min-h-0 pt-4 pb-16 relative">
        {content ? (
          <textarea
            value={content}
            onChange={(e) => onContentChange?.(e.target.value)}
            className="w-full h-full bg-stone-950 rounded-xl border border-stone-800 p-4 text-[12px] font-mono leading-relaxed focus:ring-2 focus:ring-stone-700 outline-none resize-none overflow-y-auto custom-scrollbar text-stone-300 placeholder:text-stone-600"
            placeholder="等待分析结果..."
            spellCheck={false}
          />
        ) : (
          <div className="absolute inset-0 top-4 flex flex-col items-center justify-center text-stone-300 space-y-4">
            {isActive ? (
              <div className="flex gap-2">
                <div className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                <div className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '400ms' }} />
              </div>
            ) : (
              <>
                <Icons.Clock size={32} strokeWidth={1} className="text-stone-700" />
                {onRegenerate ? (
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-xs text-stone-500 font-medium">准备就绪</p>
                    <button
                      onClick={onRegenerate}
                      className="px-4 py-2 bg-stone-100 hover:bg-white text-stone-900 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg hover:scale-105 active:scale-95"
                    >
                      <Icons.Play size={14} className="fill-stone-900" />
                      运行分析
                    </button>
                  </div>
                ) : (
                  <p className="text-sm italic text-stone-600">等待流水线信号...</p>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      {content && (
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-stone-800 bg-stone-900 z-10">
          <div className="flex items-center gap-2">
            {/* Regenerate Button */}
            {onRegenerate && (
              <button
                onClick={onRegenerate}
                disabled={isActive}
                className="flex-1 py-2 bg-stone-100 text-stone-900 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-40 hover:bg-white transition-all relative z-10 shadow-[0_0_15px_rgba(255,255,255,0.05)]"
              >
                {isActive ? <Icons.RefreshCw size={14} className="animate-spin" /> : <Icons.RefreshCw size={14} />}
                重新生成
              </button>
            )}

            {/* Copy Button */}
            <button
              onClick={onCopy || (() => { navigator.clipboard.writeText(content); })}
              disabled={isActive}
              className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-400 rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 transition-all flex-shrink-0 relative z-10"
              title="复制内容"
            >
              <Icons.CheckSquare size={14} />
              复制
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
