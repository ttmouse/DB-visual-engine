/**
 * [INPUT]: 依赖 services/geminiService, services/historyService
 * [OUTPUT]: 导出 useImageGeneration hook
 * [POS]: Hooks 模块
 * [PROTOCOL]: 变更时更新此头部
 */

import { useEffect, useRef } from 'react';
import { AppState, HistoryItem, GenerationTask } from '../types';
import { generateImageFromPrompt } from '../services/geminiService';
import { generateThumbnail } from '../utils/thumbnailUtils';
import { saveHistoryItem } from '../services/historyService';

const CONCURRENCY_LIMIT = 3; // Allow 3 parallel generations

interface UseImageGenerationProps {
    state: AppState;
    setState: React.Dispatch<React.SetStateAction<AppState>>;
    selectedAspectRatio: string;
    is4K: boolean;
    t: (key: string, options?: any) => string;
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

    // --- Task Queue Manager ---
    // Watches state.tasks and picks up pending tasks if concurrency limit allows
    useEffect(() => {
        const processQueue = async () => {
            const pendingTasks = state.tasks.filter(t => t.status === 'pending');
            const processingTasks = state.tasks.filter(t => t.status === 'processing');

            if (pendingTasks.length === 0) return;
            if (processingTasks.length >= CONCURRENCY_LIMIT) return;

            // Pick next task
            const nextTask = pendingTasks[0];

            // Mark as Processing in Task Queue
            setState(prev => ({
                ...prev,
                isGeneratingImage: true,
                tasks: prev.tasks.map(t => t.id === nextTask.id ? { ...t, status: 'processing' } : t)
            }));

            try {
                // Execute Generation
                const img = await generateImageFromPrompt(
                    nextTask.prompt,
                    nextTask.aspectRatio,
                    nextTask.is4K,
                    nextTask.referenceImage,
                    nextTask.mimeType
                );

                if (img) {
                    // Success Handling
                    let thumbBase64: string | undefined;
                    try {
                        thumbBase64 = await generateThumbnail(img, 'image/png');
                    } catch (thumbErr) {
                        console.warn('Thumbnail generation failed:', thumbErr);
                    }

                    // Create final history item (completing the placeholder)
                    const completedItem: HistoryItem = {
                        id: nextTask.id, // Match the ID used for the placeholder
                        groupId: state.currentGroupId,
                        timestamp: Date.now(),
                        originalImage: state.image!,
                        mimeType: state.mimeType,
                        prompt: nextTask.prompt,
                        generatedImage: img,
                        generatedImageThumb: thumbBase64,
                        referenceImages: state.referenceImages?.length ? [...state.referenceImages] : undefined,
                        status: 'success'
                    };

                    // Persist to DB
                    await saveHistoryItem(completedItem);

                    // Update state: Replace pending placeholder with completed item
                    setState(prev => {
                        // Find and update the specific history item
                        const updatedHistory = prev.history.map(item =>
                            item.id === nextTask.id ? completedItem : item
                        );

                        // Update gallery thumbnails
                        const imageForGallery = thumbBase64 || img;

                        return {
                            ...prev,
                            // Set the active generated image if it's the most recent one (or user intent?)
                            // For multi-threading, we might not want to snap the view away if they are editing something else.
                            // But usually, latest generation is shown. Let's start with showing it.
                            generatedImage: img,
                            generatedImages: [imageForGallery, ...prev.generatedImages].slice(0, 50),
                            history: updatedHistory,
                            tasks: prev.tasks.map(t => t.id === nextTask.id ? { ...t, status: 'completed', resultImage: img, completedAt: Date.now() } : t)
                        };
                    });

                    showToast(t('toast.successGenerated', { count: 1, total: 1 }), 'success');
                } else {
                    throw new Error("No image data returned");
                }
            } catch (err: any) {
                console.error(`Task ${nextTask.id} failed:`, err);
                const errorMsg = err?.message || "Generation failed";

                setState(prev => ({
                    ...prev,
                    // Update history item to show error state? Or just remove it?
                    // Let's mark it as error so user knows.
                    history: prev.history.map(item =>
                        item.id === nextTask.id ? { ...item, status: 'error' } : item
                    ),
                    tasks: prev.tasks.map(t => t.id === nextTask.id ? { ...t, status: 'failed', error: errorMsg, completedAt: Date.now() } : t)
                }));
                showToast(`Task failed: ${errorMsg}`, 'error');
            }
        };

        processQueue();
    }, [state.tasks]); // Re-run whenever tasks change


    // Original handler now just adds to queue and creates placeholders
    async function handleGenerateImage(customPrompt?: string, count: number = 1) {
        const p = customPrompt || state.editablePrompt;
        if (!p) return;

        // Prepare task parameters (snapshot current settings)
        let refImage: string | null = null;
        let targetMimeType = state.mimeType || 'image/jpeg';
        let detectedRatio = selectedAspectRatio || state.detectedAspectRatio;

        if (state.referenceImages && state.referenceImages.length > 0) {
            refImage = state.referenceImages[0].url;
            targetMimeType = state.referenceImages[0].mimeType;
            if (!selectedAspectRatio && state.referenceImages[0].aspectRatio) {
                detectedRatio = state.referenceImages[0].aspectRatio;
            }
        } else if (state.useReferenceImage && state.image) {
            refImage = state.image;
            targetMimeType = state.mimeType;
        }

        const newTasks: GenerationTask[] = [];
        const newHistoryPlaceholders: HistoryItem[] = [];
        const now = Date.now();

        for (let i = 0; i < count; i++) {
            const taskId = crypto.randomUUID();

            // Create Task
            newTasks.push({
                id: taskId,
                status: 'pending',
                prompt: p,
                aspectRatio: detectedRatio,
                is4K: is4K,
                referenceImage: refImage,
                mimeType: targetMimeType,
                createdAt: now + i
            });

            // Create History Placeholder
            newHistoryPlaceholders.push({
                id: taskId, // Same ID to link them
                groupId: state.currentGroupId,
                timestamp: now + i,
                originalImage: state.image || '', // Might be empty if pure text-to-image
                prompt: p,
                mimeType: targetMimeType,
                referenceImages: state.referenceImages?.length ? [...state.referenceImages] : undefined,
                status: 'pending' // Flag for UI to show loading
            });
        }

        // Add both to state instantly
        // NOTE: We prepend newHistoryPlaceholders to state.history to ensure they appear on the LEFT (start of list).
        setState(prev => ({
            ...prev,
            tasks: [...prev.tasks, ...newTasks],
            history: [...newHistoryPlaceholders, ...prev.history],
            selectedHistoryIndex: 0 // Optional: Auto-select the first new placeholder? Let's leave it to user or auto-select first.
        }));

        showToast(t('toast.generatingImages', { count }), 'info');
    }

    return { handleGenerateImage };
};
