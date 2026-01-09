/**
 * [INPUT]: 依赖 services/historyService, services/cacheService, services/recentCacheService
 * [OUTPUT]: 导出 useAppInitialization hook
 * [POS]: Hooks 模块
 * [PROTOCOL]: 变更时更新此头部
 */

import { useEffect, useRef } from 'react';
import { getHistoryPaginated } from '../services/historyService';
import { loadCurrentTask } from '../services/cacheService';
import { runLazyMigration } from '../services/migrationService';
import { INITIAL_STATE } from '../constants/appState';
import { AppState, HistoryItem } from '../types';
import { getImageSrc } from '../utils/imageHelpers';
import { getRecentCache, cachedToHistoryItem, rebuildRecentCache, getViewState } from '../services/recentCacheService';

const FIRST_BATCH_SIZE = 20;  // Load first 20 items immediately
const BATCH_SIZE = 50;        // Load remaining in batches of 50

export const useAppInitialization = (
    setState: React.Dispatch<React.SetStateAction<AppState>>,
    setDisplayImage: (img: string | null) => void,
    setShowLanding: (show: boolean) => void
) => {
    const isLoadingMore = useRef(false);
    const hasLoadedFromCache = useRef(false);

    useEffect(() => {
        // STEP 1: Synchronous localStorage read - INSTANT (0ms)
        if (!hasLoadedFromCache.current) {
            hasLoadedFromCache.current = true;
            const recentCache = getRecentCache();
            const viewState = getViewState();

            if (recentCache.length > 0) {
                // Convert cached items to partial HistoryItem format
                const cachedHistory = recentCache.map(c => cachedToHistoryItem(c)) as HistoryItem[];
                const cachedImages = recentCache.map(c => c.thumbnail);

                // Use saved view state to restore the correct position
                let validIndex = 0;

                // Try to match by ID first (Robust)
                if (viewState?.currentItemId) {
                    const foundIndex = cachedHistory.findIndex(item => item.id === viewState.currentItemId);
                    if (foundIndex !== -1) {
                        validIndex = foundIndex;
                    }
                } else {
                    // Fallback to index if no ID saved (Legacy)
                    const savedIndex = viewState?.selectedIndex ?? 0;
                    validIndex = Math.min(savedIndex, cachedHistory.length - 1);
                }

                // Immediately show cached content at the CORRECT position
                setState(prev => ({
                    ...prev,
                    history: cachedHistory,
                    generatedImages: cachedImages,
                    generatedImage: cachedHistory[validIndex]?.generatedImage || null,
                    selectedHistoryIndex: validIndex
                }));
                setShowLanding(false);
                console.log('[Init] Loaded', recentCache.length, 'items from localStorage cache, restored index:', validIndex);
            }
        }

        // STEP 2: Async IndexedDB load - will merge with cache
        const init = async () => {
            try {
                // Load first batch from IndexedDB
                const [firstBatch, cached] = await Promise.all([
                    getHistoryPaginated(FIRST_BATCH_SIZE, 0),
                    loadCurrentTask()
                ]);

                const { items: firstItems, hasMore, total } = firstBatch;

                // Helper to extract images from history items
                const extractImages = (items: HistoryItem[]) =>
                    items.filter(item => item.generatedImage)
                        .map(item => item.generatedImageThumb || item.generatedImage as string);

                // CRITICAL: Ensure the currently viewed item (from localStorage cache) is preserved
                // if it's not in the first batch from IndexedDB (e.g. it's an old item)
                const viewState = getViewState();
                let effectiveItems = firstItems;

                if (viewState?.currentItemId) {
                    const isInBatch = firstItems.some(i => i.id === viewState.currentItemId);
                    if (!isInBatch) {
                        // Find it in the local cache or previous state
                        const recentCache = getRecentCache();
                        const cachedItem = recentCache.find(c => c.id === viewState.currentItemId);

                        if (cachedItem) {
                            // Prepend it to the list so it's visible
                            const restoredItem = cachedToHistoryItem(cachedItem) as HistoryItem;
                            effectiveItems = [restoredItem, ...firstItems];
                            console.log('[Init] Preserved current viewed item not in first batch:', restoredItem.id);
                        }
                    }
                }

                // Calculate the correct index first
                const correctedIndex = (() => {
                    const viewState = getViewState();
                    if (viewState?.currentItemId) {
                        const foundIndex = effectiveItems.findIndex(item => item.id === viewState.currentItemId);
                        if (foundIndex !== -1) return foundIndex;
                    }
                    return Math.min(cached?.selectedHistoryIndex || 0, effectiveItems.length - 1);
                })();

                let mergedState: Partial<AppState> = {
                    history: effectiveItems,
                    generatedImages: extractImages(effectiveItems)
                };

                if (cached) {
                    mergedState = {
                        ...mergedState,
                        image: cached.image,
                        mimeType: cached.mimeType,
                        detectedAspectRatio: cached.detectedAspectRatio,
                        videoAnalysisDuration: cached.videoAnalysisDuration,
                        results: cached.results,
                        editablePrompt: cached.editablePrompt,
                        // CRITICAL: Use the image from the corrected index, NOT the stale cached image
                        generatedImage: effectiveItems[correctedIndex]?.generatedImage || cached.generatedImage || null,
                        layoutData: cached.layoutData,
                        promptCache: cached.promptCache,
                        selectedHistoryIndex: correctedIndex,
                        referenceImages: cached.referenceImages || []
                    };

                    // Also correct displayImage for comparison mode
                    if (effectiveItems[correctedIndex]?.originalImage && !cached.displayImage) {
                        // If we match the item, we might want to ensure displayImage is correct too?
                        // But for now let's trust cache unless index changed significantly
                    }

                    if (cached.displayImage) {
                        setDisplayImage(cached.displayImage);
                    }
                } else if (effectiveItems.length > 0) {
                    mergedState.generatedImage = effectiveItems[correctedIndex]?.generatedImage || null;
                    mergedState.selectedHistoryIndex = correctedIndex;
                }

                if (cached || effectiveItems.length > 0) {
                    setShowLanding(false);
                }

                // Update state with first batch
                setState(prev => ({ ...prev, ...mergedState }));

                // Warm up localStorage cache if empty (for future instant loads)
                const existingCache = getRecentCache();
                if (existingCache.length === 0 && effectiveItems.length > 0) {
                    rebuildRecentCache(effectiveItems);
                }

                // Load remaining items in background
                if (hasMore && !isLoadingMore.current) {
                    isLoadingMore.current = true;
                    let offset = FIRST_BATCH_SIZE;

                    const loadMoreBatches = async () => {
                        while (offset < total) {
                            // Small delay to prevent blocking the main thread
                            await new Promise(resolve => setTimeout(resolve, 50));

                            const { items: moreItems } = await getHistoryPaginated(BATCH_SIZE, offset);

                            if (moreItems.length > 0) {
                                setState(prev => ({
                                    ...prev,
                                    history: [...prev.history, ...moreItems],
                                    generatedImages: [...prev.generatedImages, ...extractImages(moreItems)]
                                }));
                            }

                            offset += BATCH_SIZE;
                        }
                        isLoadingMore.current = false;
                    };

                    // Start background loading - non-blocking
                    loadMoreBatches().catch(e => console.warn('[Progressive Load] Error:', e));
                }

                // Run lazy thumbnail migration for old history items (non-blocking)
                runLazyMigration().catch(e => console.warn('[Migration] Failed:', e));

            } catch (e) {
                console.error("Initialization failed", e);
            }
        };
        init();
    }, [setState, setDisplayImage, setShowLanding]);
};

