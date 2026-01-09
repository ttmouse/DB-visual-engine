/**
 * [INPUT]: 依赖 services/geminiService, services/historyService
 * [OUTPUT]: 导出 useImageGeneration hook
 * [POS]: Hooks 模块
 * [PROTOCOL]: 变更时更新此头部
 */

import { useState } from 'react';
import { AppState, HistoryItem } from '../types';
import { generateImageFromPrompt } from '../services/geminiService';
import { generateThumbnail } from '../utils/thumbnailUtils';
import { saveHistoryItem } from '../services/historyService';
import { updateRecentCache } from '../services/recentCacheService';

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

    async function handleGenerateImage(customPrompt?: string, count: number = 1) {
        const p = customPrompt || state.editablePrompt;
        if (state.isGeneratingImage || !p) return;
        setState(prev => ({ ...prev, isGeneratingImage: true }));

        const totalCount = count;
        let successCount = 0;

        try {
            // Submit to Gemini for generation
            let refImage: string | null = null;
            let targetMimeType = state.mimeType || 'image/jpeg';
            // Use user-selected aspect ratio if set, otherwise fallback to detected
            let detectedRatio = selectedAspectRatio || state.detectedAspectRatio;

            // Logic: Prioritize dragged reference images (User explicit intent)
            if (state.referenceImages && state.referenceImages.length > 0) {
                refImage = state.referenceImages[0].url;
                targetMimeType = state.referenceImages[0].mimeType;
                // Logic: Use reference image's aspect ratio only if user hasn't manually selected
                if (!selectedAspectRatio && state.referenceImages[0].aspectRatio) {
                    detectedRatio = state.referenceImages[0].aspectRatio;
                }
                showToast(t('toast.referenceEnabled'), "info");
            } else if (state.useReferenceImage && state.image) {
                // Fallback to Main Image if toggle is ON
                refImage = state.image;
                targetMimeType = state.mimeType;
                showToast(t('toast.referenceMainEnabled'), "info");
            }

            if (totalCount > 1) {
                showToast(t('toast.generatingImages', { count: totalCount }), 'info');
            }

            // Generate images sequentially
            let lastError: string | null = null;
            for (let i = 0; i < totalCount; i++) {
                try {
                    const img = await generateImageFromPrompt(p, detectedRatio, is4K, refImage, targetMimeType);

                    if (img) {
                        // Generate thumbnail for gallery (lightweight)
                        let thumbBase64: string | undefined;
                        try {
                            thumbBase64 = await generateThumbnail(img, 'image/png');
                        } catch (thumbErr) {
                            console.warn('Thumbnail generation failed, using original:', thumbErr);
                        }

                        const newItem: HistoryItem = {
                            id: (Date.now() + i).toString(),
                            groupId: state.currentGroupId,
                            timestamp: Date.now() + i,
                            originalImage: state.image!,
                            mimeType: state.mimeType,
                            prompt: p,
                            generatedImage: img,
                            generatedImageThumb: thumbBase64,
                            referenceImages: state.referenceImages?.length ? [...state.referenceImages] : undefined
                        };
                        await saveHistoryItem(newItem);
                        updateRecentCache(newItem); // Sync localStorage fast cache
                        successCount++;

                        // Update state: use thumbnail for generatedImages array (gallery)
                        const imageForGallery = thumbBase64 || img;
                        setState(prev => ({
                            ...prev,
                            generatedImage: img, // Full image for current editing
                            generatedImages: [imageForGallery, ...prev.generatedImages].slice(0, 50), // Thumbs for gallery
                            history: [newItem, ...prev.history].slice(0, 50),
                            selectedHistoryIndex: 0
                        }));
                    }
                } catch (err: any) {
                    console.error(`Failed to generate image ${i + 1}:`, err);
                    const errorMsg = err?.message || "生成失败";
                    lastError = errorMsg;

                    // Check for sensitive content error
                    if (errorMsg.includes("敏感信息") || errorMsg.includes("Sensitive Content")) {
                        setState(prev => ({
                            ...prev,
                            isGeneratingImage: false,
                            promptError: "提示词包含敏感信息，请修改后重试"
                        }));
                        showToast(t('toast.generateFailed'), "error", 6000);
                        return; // Stop generation immediately
                    }

                    // Check for Quota/429 errors
                    if (errorMsg.includes("429") || errorMsg.includes("exhausted") || errorMsg.includes("quota") || errorMsg.includes("额度")) {
                        setState(prev => ({
                            ...prev,
                            isGeneratingImage: false,
                            // promptError: "今日额度已达上限" // Optional prompt error
                        }));
                        showToast("API 额度已耗尽 (Daily Quota Exceeded)", "error", 6000);
                        return;
                    }

                    // Stop the loop for quota/rate limit errors - no point retrying
                    if (lastError.includes("429") || lastError.includes("额度") || lastError.includes("配额")) {
                        showToast(lastError, 'error');
                        break;
                    }
                }
            }

            setState(prev => ({ ...prev, isGeneratingImage: false }));

            if (successCount > 0) {
                showToast(t('toast.successGenerated', { count: successCount, total: totalCount }), 'success');
            } else {
                showToast(t('toast.generateFailed'), "error");
            }
        } catch (e: any) {
            // Show specific error message from geminiService
            const errorMsg = e?.message || "生成失败";
            showToast(errorMsg, 'error');
            setState(prev => ({ ...prev, isGeneratingImage: false }));
        }
    }

    return { handleGenerateImage };
};
