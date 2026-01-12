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


const FIRST_BATCH_SIZE = 50;  // Load first 50 items immediately
const BATCH_SIZE = 50;        // Load remaining in batches of 50

export const useAppInitialization = (
    setState: React.Dispatch<React.SetStateAction<AppState>>,
    setDisplayImage: (img: string | null) => void,
    setShowLanding: (show: boolean) => void
) => {
    const isLoadingMore = useRef(false);
    const hasLoadedFromCache = useRef(false);

    useEffect(() => {
        // STEP 1: Synchronous localStorage read - MOVED TO APP.TSX LAZY INIT
        // Only mark as loaded
        if (!hasLoadedFromCache.current) {
            hasLoadedFromCache.current = true;
        }

        // STEP 2: Async IndexedDB load - will merge with cache
        const init = async () => {
            try {
                // Load cached state first to determine necessary initial batch size
                const cached = await loadCurrentTask();

                // If user was deep in history (e.g. index 100), ensure we load enough items to show it immediately
                const requiredCount = (cached?.selectedHistoryIndex || 0) + 20;
                const dynamicFirstBatchSize = Math.max(FIRST_BATCH_SIZE, requiredCount);

                const firstBatch = await getHistoryPaginated(dynamicFirstBatchSize, 0);
                const { items: firstItems, hasMore, total } = firstBatch;

                // Helper to extract images from history items (prefer thumbnail for lightweight mode)
                // IMPORTANT: Do NOT filter! Indices must match history array 1:1
                const extractImages = (items: HistoryItem[]) =>
                    items.map(item => item.generatedImageThumb || (item.generatedImage as string) || '');

                // Calculate the correct index
                const correctedIndex = Math.min(cached?.selectedHistoryIndex || 0, firstItems.length - 1);

                let mergedState: Partial<AppState> = {
                    history: firstItems,
                    generatedImages: extractImages(firstItems)
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
                        generatedImage: firstItems[correctedIndex]?.generatedImage || cached.generatedImage || null,
                        layoutData: cached.layoutData,
                        promptCache: cached.promptCache,
                        selectedHistoryIndex: correctedIndex,
                        referenceImages: cached.referenceImages || []
                    };

                    if (cached.displayImage) {
                        setDisplayImage(cached.displayImage);
                    }
                } else if (firstItems.length > 0) {
                    mergedState.generatedImage = firstItems[correctedIndex]?.generatedImage || null;
                    mergedState.selectedHistoryIndex = correctedIndex;
                }

                if (cached || firstItems.length > 0) {
                    setShowLanding(false);
                }

                // Update state with first batch
                setState(prev => ({ ...prev, ...mergedState }));

                // Load remaining items in background
                if (hasMore && !isLoadingMore.current) {
                    isLoadingMore.current = true;
                    // Start from where we left off
                    let offset = dynamicFirstBatchSize;

                    const loadMoreBatches = async () => {
                        try {
                            while (true) {
                                // Small delay to yield to main thread and ensure UI responsiveness
                                await new Promise(resolve => setTimeout(resolve, 100));

                                const { items: moreItems } = await getHistoryPaginated(BATCH_SIZE, offset);

                                if (!moreItems || moreItems.length === 0) {
                                    break;
                                }

                                setState(prev => ({
                                    ...prev,
                                    history: [...prev.history, ...moreItems],
                                    generatedImages: [...prev.generatedImages, ...extractImages(moreItems)]
                                }));

                                offset += moreItems.length;

                                // If we fetched fewer than requested, we reached the end
                                if (moreItems.length < BATCH_SIZE) {
                                    break;
                                }
                            }
                        } catch (err) {
                            console.error('[Progressive Load] Failed:', err);
                        } finally {
                            isLoadingMore.current = false;
                        }
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

