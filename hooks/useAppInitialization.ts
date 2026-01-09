/**
 * [INPUT]: 依赖 services/historyService, services/cacheService
 * [OUTPUT]: 导出 useAppInitialization hook
 * [POS]: Hooks 模块
 * [PROTOCOL]: 变更时更新此头部
 */

import { useEffect } from 'react';
import { getHistory } from '../services/historyService';
import { loadCurrentTask } from '../services/cacheService';
import { runLazyMigration } from '../services/migrationService';
import { INITIAL_STATE } from '../constants/appState';
import { AppState } from '../types';
import { getImageSrc } from '../utils/imageHelpers';

export const useAppInitialization = (
    setState: React.Dispatch<React.SetStateAction<AppState>>,
    setDisplayImage: (img: string | null) => void,
    setShowLanding: (show: boolean) => void
) => {
    useEffect(() => {
        const init = async () => {
            try {
                const [hist, cached] = await Promise.all([
                    getHistory(),
                    loadCurrentTask()
                ]);

                // Limit history to prevent OOM
                const limitedHist = hist.slice(0, 50);
                let generatedImages: string[] = [];
                let mergedState: Partial<AppState> = { history: limitedHist };

                if (cached) {
                    // Rebuild generated images from history: prefer thumbnails for gallery
                    const imagesFromHistory = limitedHist
                        .filter(item => item.generatedImage)
                        .map(item => item.generatedImageThumb || item.generatedImage as string);

                    generatedImages = imagesFromHistory.length > 0 ? imagesFromHistory : (cached.generatedImages || []).slice(0, 50);

                    mergedState = {
                        ...mergedState,
                        image: cached.image,
                        mimeType: cached.mimeType,
                        detectedAspectRatio: cached.detectedAspectRatio,
                        videoAnalysisDuration: cached.videoAnalysisDuration,
                        results: cached.results,
                        editablePrompt: cached.editablePrompt,
                        generatedImage: cached.generatedImage || (limitedHist.length > 0 ? limitedHist[0].generatedImage : null),
                        generatedImages: generatedImages,
                        layoutData: cached.layoutData,
                        promptCache: cached.promptCache,
                        selectedHistoryIndex: cached.selectedHistoryIndex || 0,
                        referenceImages: cached.referenceImages || []
                    };

                    // Restore display image
                    if (cached.displayImage) {
                        setDisplayImage(cached.displayImage);
                    }
                } else {
                    // Fallback if no cache but history exists
                    if (limitedHist.length > 0) {
                        mergedState.generatedImage = limitedHist[0].generatedImage;
                        // generatedImages: prefer thumbnails for memory efficiency
                        const imagesFromHistory = limitedHist
                            .filter(item => item.generatedImage)
                            .map(item => item.generatedImageThumb || item.generatedImage as string);
                        mergedState.generatedImages = imagesFromHistory;
                    }
                }

                if (cached || hist.length > 0) {
                    setShowLanding(false);
                }

                setState(prev => ({ ...prev, ...mergedState }));

                // Run lazy thumbnail migration for old history items (non-blocking)
                runLazyMigration().catch(e => console.warn('[Migration] Failed:', e));

            } catch (e) {
                console.error("Initialization failed", e);
            }
        };
        init();
    }, [setState, setDisplayImage, setShowLanding]);
};
