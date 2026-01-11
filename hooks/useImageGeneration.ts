/**
 * [INPUT]: 依赖 services/geminiService, services/historyService
 * [OUTPUT]: 导出 useImageGeneration hook
 * [POS]: Hooks 模块
 * [PROTOCOL]: 变更时更新此头部
 */

import { useEffect } from 'react';
import { AppState, HistoryItem, GenerationTask } from '../types';
import { generateImageFromPrompt } from '../services/geminiService';
import { generateThumbnail } from '../utils/thumbnailUtils';
import { saveHistoryItem } from '../services/historyService';

/** Maximum number of concurrent image generation tasks */
const CONCURRENCY_LIMIT = 3;

interface UseImageGenerationProps {
    state: AppState;
    setState: React.Dispatch<React.SetStateAction<AppState>>;
    selectedAspectRatio: string;
    is4K: boolean;
    t: (key: string, options?: Record<string, unknown>) => string;
    showToast: (message: string, type: 'success' | 'error' | 'info', duration?: number) => void;
}

export const useImageGeneration = ({
    state,
    setState,
    selectedAspectRatio,
    is4K,
    t,
    showToast
}: UseImageGenerationProps) => {

    // Task Queue Manager: Processes pending tasks respecting concurrency limit
    useEffect(() => {
        const processQueue = async () => {
            const pendingTasks = state.tasks.filter(task => task.status === 'pending');
            const processingCount = state.tasks.filter(task => task.status === 'processing').length;

            if (pendingTasks.length === 0 || processingCount >= CONCURRENCY_LIMIT) return;

            const nextTask = pendingTasks[0];

            // Mark as Processing
            setState(prev => ({
                ...prev,
                isGeneratingImage: true,
                tasks: prev.tasks.map(task =>
                    task.id === nextTask.id ? { ...task, status: 'processing' } : task
                )
            }));

            try {
                const img = await generateImageFromPrompt(
                    nextTask.prompt,
                    nextTask.aspectRatio,
                    nextTask.is4K,
                    nextTask.referenceImage,
                    nextTask.mimeType
                );

                if (!img) {
                    throw new Error("No image data returned");
                }

                // Generate thumbnail (non-blocking failure)
                let thumbBase64: string | undefined;
                try {
                    thumbBase64 = await generateThumbnail(img, 'image/png');
                } catch (thumbErr) {
                    console.warn('Thumbnail generation failed:', thumbErr);
                }

                const completedItem: HistoryItem = {
                    id: nextTask.id,
                    groupId: state.currentGroupId,
                    timestamp: Date.now(),
                    originalImage: state.image ?? '',
                    mimeType: state.mimeType,
                    prompt: nextTask.prompt,
                    generatedImage: img,
                    generatedImageThumb: thumbBase64,
                    referenceImages: state.referenceImages?.length ? [...state.referenceImages] : undefined,
                    status: 'success'
                };

                await saveHistoryItem(completedItem);

                setState(prev => {
                    const updatedHistory = prev.history.map(item =>
                        item.id === nextTask.id ? completedItem : item
                    );
                    const imageForGallery = thumbBase64 || img;

                    return {
                        ...prev,
                        generatedImage: img,
                        generatedImages: [imageForGallery, ...prev.generatedImages].slice(0, 50),
                        history: updatedHistory,
                        tasks: prev.tasks.map(task =>
                            task.id === nextTask.id
                                ? { ...task, status: 'completed', resultImage: img, completedAt: Date.now() }
                                : task
                        )
                    };
                });

                showToast(t('toast.successGenerated', { count: 1, total: 1 }), 'success');
            } catch (err: unknown) {
                const errorMsg = err instanceof Error ? err.message : 'Generation failed';
                console.error(`Task ${nextTask.id} failed:`, err);

                setState(prev => ({
                    ...prev,
                    history: prev.history.map(item =>
                        item.id === nextTask.id ? { ...item, status: 'error' } : item
                    ),
                    tasks: prev.tasks.map(task =>
                        task.id === nextTask.id
                            ? { ...task, status: 'failed', error: errorMsg, completedAt: Date.now() }
                            : task
                    )
                }));
                showToast(`Task failed: ${errorMsg}`, 'error');
            }
        };

        processQueue();
    }, [state.tasks]);


    /** Adds generation tasks to the queue and creates history placeholders */
    function handleGenerateImage(customPrompt?: string, count: number = 1): void {
        const prompt = customPrompt || state.editablePrompt;
        if (!prompt) return;

        // Determine reference image and settings
        let refImage: string | null = null;
        let targetMimeType = state.mimeType || 'image/jpeg';
        let detectedRatio = selectedAspectRatio || state.detectedAspectRatio;

        if (state.referenceImages?.length) {
            const firstRef = state.referenceImages[0];
            refImage = firstRef.url;
            targetMimeType = firstRef.mimeType;
            if (!selectedAspectRatio && firstRef.aspectRatio) {
                detectedRatio = firstRef.aspectRatio;
            }
        } else if (state.useReferenceImage && state.image) {
            refImage = state.image;
            targetMimeType = state.mimeType;
        }

        const now = Date.now();
        const newTasks: GenerationTask[] = [];
        const newHistoryPlaceholders: HistoryItem[] = [];

        for (let i = 0; i < count; i++) {
            const taskId = crypto.randomUUID();

            newTasks.push({
                id: taskId,
                status: 'pending',
                prompt,
                aspectRatio: detectedRatio,
                is4K,
                referenceImage: refImage,
                mimeType: targetMimeType,
                createdAt: now + i
            });

            newHistoryPlaceholders.push({
                id: taskId,
                groupId: state.currentGroupId,
                timestamp: now + i,
                originalImage: state.image || '',
                prompt,
                mimeType: targetMimeType,
                referenceImages: state.referenceImages?.length ? [...state.referenceImages] : undefined,
                status: 'pending'
            });
        }

        setState(prev => ({
            ...prev,
            tasks: [...prev.tasks, ...newTasks],
            history: [...newHistoryPlaceholders, ...prev.history],
            selectedHistoryIndex: 0
        }));

        // showToast(t('toast.generatingImages', { count }), 'info');
    }

    return { handleGenerateImage };
};
