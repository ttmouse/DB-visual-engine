import React from 'react';
import { Icons } from './Icons';
import { PipelineProgress } from '../types';
import { PipelineStepCard } from './PipelineStepCard';

interface PipelineProgressViewProps {
  progress: PipelineProgress;
  onHide: () => void;  // 返回编辑器（后台继续）
  onCancel: () => void; // 取消流水线
}

export const PipelineProgressView: React.FC<PipelineProgressViewProps> = ({
  progress,
  onHide,
  onCancel
}) => {
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds} 秒`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins} 分 ${secs} 秒`;
  };

  return (
    <div className="absolute inset-0 bg-stone-900/98 backdrop-blur-md flex flex-col animate-in fade-in duration-300 z-50">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-stone-800 bg-stone-900 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-serif font-bold text-stone-200 flex items-center gap-2">
              <Icons.Sparkles size={20} className="text-amber-500" />
              AI 视觉解构流水线
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              实时分析进度 · 可切换到其他标签页
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onHide}
              className="px-3 py-1.5 text-xs font-bold text-stone-400 hover:bg-stone-800 rounded-lg transition-all flex items-center gap-1"
            >
              <Icons.ArrowLeft size={14} />
              返回编辑器
            </button>
            {progress.isRunning && (
              <button
                onClick={onCancel}
                className="px-3 py-1.5 text-xs font-bold text-rose-400 hover:bg-rose-900/30 rounded-lg transition-all flex items-center gap-1"
              >
                <Icons.X size={14} />
                取消
              </button>
            )}
          </div>
        </div>

        {/* Overall Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-400">
              总体进度
            </span>
            <div className="text-xs text-stone-500">
              {progress.totalProgress}%
              {progress.estimatedTimeRemaining && progress.estimatedTimeRemaining > 0 && (
                <span className="ml-2 text-blue-400">
                  预计剩余 {formatTime(progress.estimatedTimeRemaining)}
                </span>
              )}
            </div>
          </div>
          <div className="relative h-3 bg-stone-800 rounded-full overflow-hidden border border-stone-700">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500 ease-out"
              style={{ width: `${progress.totalProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Steps List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-stone-900/50">
        {progress.steps.length > 0 ? (
          progress.steps.map((step, index) => (
            <PipelineStepCard key={step.role} step={step} index={index} />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-stone-600 gap-3">
            <Icons.RefreshCw size={24} className="animate-spin text-orange-500" />
            <p className="text-sm font-medium">正在初始化分析流程...</p>
          </div>
        )}
      </div>

      {/* Completion Message */}
      {!progress.isRunning && progress.totalProgress === 100 && (
        <div className="flex-shrink-0 p-6 border-t border-stone-700 bg-gradient-to-r from-green-900/30 to-emerald-900/30">
          <div className="text-center">
            <div className="text-4xl mb-2">✨</div>
            <h3 className="text-lg font-bold text-stone-200">生成完成！</h3>
            <p className="text-sm text-stone-400 mt-1">
              提示词已准备就绪，即将为您呈现
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
