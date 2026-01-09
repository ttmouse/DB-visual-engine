import { useState, useCallback } from 'react';
import { PipelineProgress, PipelineStep, PipelineStepStatus, AgentRole } from '../types';
import { PIPELINE_ORDER, AGENTS } from '../constants';

export const usePipelineProgress = () => {
  const [progress, setProgress] = useState<PipelineProgress | null>(null);

  // 初始化流水线
  const initPipeline = useCallback(() => {
    const steps: PipelineStep[] = PIPELINE_ORDER.map(role => ({
      role,
      name: AGENTS[role].name,
      description: AGENTS[role].description,
      status: PipelineStepStatus.PENDING,
      progress: 0,
      streamingContent: '',
      finalContent: '',
      startTime: null,
      endTime: null,
      error: null
    }));

    setProgress({
      isRunning: true,
      currentStepIndex: 0,
      steps,
      totalProgress: 0,
      estimatedTimeRemaining: null,
      startTime: Date.now()
    });
  }, []);

  // 开始某个步骤
  const startStep = useCallback((stepIndex: number) => {
    setProgress(prev => {
      if (!prev) return null;
      const newSteps = [...prev.steps];
      newSteps[stepIndex] = {
        ...newSteps[stepIndex],
        status: PipelineStepStatus.RUNNING,
        startTime: Date.now()
      };
      return {
        ...prev,
        currentStepIndex: stepIndex,
        steps: newSteps
      };
    });
  }, []);

  // 更新步骤的流式内容
  const updateStepContent = useCallback((stepIndex: number, content: string) => {
    setProgress(prev => {
      if (!prev) return null;
      const newSteps = [...prev.steps];
      newSteps[stepIndex] = {
        ...newSteps[stepIndex],
        streamingContent: content,
        progress: Math.min(95, (content.length / 500) * 100) // 估算进度
      };

      // 计算总体进度
      const totalProgress = newSteps.reduce((sum, step, idx) => {
        if (idx < stepIndex) return sum + 25; // 已完成的步骤
        if (idx === stepIndex) return sum + (step.progress * 0.25); // 当前步骤
        return sum;
      }, 0);

      return {
        ...prev,
        steps: newSteps,
        totalProgress: Math.round(totalProgress)
      };
    });
  }, []);

  // 完成某个步骤
  const completeStep = useCallback((stepIndex: number, finalContent: string) => {
    setProgress(prev => {
      if (!prev) return null;
      const newSteps = [...prev.steps];
      newSteps[stepIndex] = {
        ...newSteps[stepIndex],
        status: PipelineStepStatus.COMPLETED,
        progress: 100,
        finalContent,
        endTime: Date.now()
      };

      // 计算预计剩余时间
      const completedSteps = newSteps.filter(s => s.status === PipelineStepStatus.COMPLETED);
      let estimatedTimeRemaining = null;

      if (completedSteps.length > 0) {
        const avgTime = completedSteps.reduce((sum, s) => {
          return sum + ((s.endTime! - s.startTime!) / 1000);
        }, 0) / completedSteps.length;

        const remainingSteps = newSteps.length - completedSteps.length;
        estimatedTimeRemaining = Math.round(avgTime * remainingSteps);
      }

      return {
        ...prev,
        steps: newSteps,
        estimatedTimeRemaining
      };
    });
  }, []);

  // 标记步骤错误
  const errorStep = useCallback((stepIndex: number, error: string) => {
    setProgress(prev => {
      if (!prev) return null;
      const newSteps = [...prev.steps];
      newSteps[stepIndex] = {
        ...newSteps[stepIndex],
        status: PipelineStepStatus.ERROR,
        error,
        endTime: Date.now()
      };
      return {
        ...prev,
        steps: newSteps,
        isRunning: false
      };
    });
  }, []);

  // 完成整个流水线
  const completePipeline = useCallback(() => {
    setProgress(prev => {
      if (!prev) return null;
      return {
        ...prev,
        isRunning: false,
        totalProgress: 100
      };
    });
  }, []);

  // 重置流水线
  const resetPipeline = useCallback(() => {
    setProgress(null);
  }, []);

  // 直接设置进度（用于单步逆向等特殊场景）
  const setProgressDirect = useCallback((newProgress: PipelineProgress) => {
    setProgress(newProgress);
  }, []);

  return {
    progress,
    initPipeline,
    startStep,
    updateStepContent,
    completeStep,
    errorStep,
    completePipeline,
    resetPipeline,
    setProgressDirect
  };
};
