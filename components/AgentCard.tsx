
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { AgentConfig, AnalysisResult, AgentRole } from '../types';
import { Icons } from './Icons';

interface AgentCardProps {
  config: AgentConfig;
  result: AnalysisResult | undefined;
  isActive: boolean;
  isPending: boolean;
}

export const AgentCard: React.FC<AgentCardProps> = ({ config, result, isActive, isPending }) => {
  const IconComponent = Icons[config.icon as keyof typeof Icons];
  const isComplete = result?.isComplete;
  const content = result?.content;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Visual Indicator of Phase */}
      <div className="flex items-center justify-between pb-6 border-b border-stone-100">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-2xl ${config.color} text-white shadow-lg`}>
            {IconComponent && <IconComponent size={20} />}
          </div>
          <div>
            <h2 className="text-xl font-serif font-bold text-stone-800">{config.name}</h2>
            <p className="text-xs text-stone-400 font-medium tracking-wide uppercase mt-1">{config.description}</p>
          </div>
        </div>
        
        <div className="flex items-center">
          {isComplete && (
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold">
              <Icons.CheckCircle2 size={14} /> 已完成
            </div>
          )}
          {isActive && !isComplete && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-stone-100 text-stone-500 text-xs font-bold">
              <Icons.RefreshCw className="animate-spin" size={12} />
              分析中
            </div>
          )}
        </div>
      </div>

      {/* Markdown Output */}
      <div className="prose prose-stone max-w-none prose-p:text-stone-600 prose-p:leading-relaxed prose-headings:font-serif prose-strong:text-stone-900">
        {content ? (
          <ReactMarkdown>{content}</ReactMarkdown>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-stone-300 space-y-4">
             {isActive ? (
               <div className="flex gap-2">
                 <div className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                 <div className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                 <div className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '400ms' }} />
               </div>
             ) : (
               <>
                <Icons.Clock size={32} strokeWidth={1} />
                <p className="text-sm italic">等待流水线信号...</p>
               </>
             )}
          </div>
        )}
      </div>
    </div>
  );
};
