import { AppState } from '../types';
import { INITIAL_STATE } from '../constants/appState';

const CHECKPOINT_KEY = 'imaginai_snapshot_v1';

export interface SnapshotState {
    image: string | null;
    mimeType: string;
    detectedAspectRatio: string;
    editablePrompt: string;
    generatedImage: string | null;
    selectedHistoryIndex: number;
    // We only store minimal fields needed to restore the visual state
}

/**
 * [SYNC] Load only the last active view state immediately
 */
export const loadSnapshot = (): Partial<AppState> | null => {
    try {
        const raw = localStorage.getItem(CHECKPOINT_KEY);
        if (!raw) return null;

        const snapshot = JSON.parse(raw) as SnapshotState;

        // Validate basic integrity
        if (!snapshot.image && !snapshot.generatedImage) return null;

        console.log('[Snapshot] Loaded fast state');

        // HYDRATION FIX: Construct a temporary history item so MainVisualizer renders immediately
        // The component checks for (generatedImages.length > 0 && selectedHistoryIndex >= 0)
        const tempItem: any = {
            id: 'snapshot-temp', // Temporary ID
            timestamp: Date.now(),
            generatedImage: snapshot.generatedImage,
            originalImage: snapshot.image || '',
            mimeType: snapshot.mimeType,
            prompt: snapshot.editablePrompt,
            detectedAspectRatio: snapshot.detectedAspectRatio
        };

        const activeIndex = snapshot.selectedHistoryIndex >= 0 ? snapshot.selectedHistoryIndex : 0;

        return {
            image: snapshot.image,
            mimeType: snapshot.mimeType,
            detectedAspectRatio: snapshot.detectedAspectRatio,
            editablePrompt: snapshot.editablePrompt,
            generatedImage: snapshot.generatedImage,
            selectedHistoryIndex: activeIndex,
            // Mock the list with the single snapshot item to pass render gates
            history: [tempItem],
            generatedImages: [snapshot.generatedImage || snapshot.image || '']
        };
    } catch (e) {
        console.warn('Failed to load snapshot', e);
        return null;
    }
};

/**
 * [ASYNC/Debounced] Save the current active view
 * Note: Throttle/Debounce should be handled by the caller (useEffect)
 */
export const saveSnapshot = (state: AppState) => {
    try {
        // Only save if we have meaningful content
        if (!state.image && !state.generatedImage && !state.editablePrompt) return;

        // Optimization: Avoid saving huge 4K images (blocking synchronous IO)
        // Limit: 2MB (Safe for localStorage)
        let safeImage = state.image;
        if (safeImage && safeImage.length > 2_000_000) {
            safeImage = null; // Too big for instant snapshot
        }

        let safeGeneratedImage = state.generatedImage;
        if (safeGeneratedImage && safeGeneratedImage.length > 2_000_000) {
            // Try to fallback to thumbnail from the list
            const idx = state.selectedHistoryIndex;
            if (state.generatedImages[idx] && state.generatedImages[idx].length < 2_000_000) {
                // Use the thumbnail stored in the gallery list
                safeGeneratedImage = state.generatedImages[idx];
                console.log('[Snapshot] Downgraded to thumbnail for performance');
            } else {
                safeGeneratedImage = null;
            }
        }

        const snapshot: SnapshotState = {
            image: safeImage,
            mimeType: state.mimeType,
            detectedAspectRatio: state.detectedAspectRatio,
            editablePrompt: state.editablePrompt,
            generatedImage: safeGeneratedImage,
            selectedHistoryIndex: state.selectedHistoryIndex
        };

        localStorage.setItem(CHECKPOINT_KEY, JSON.stringify(snapshot));
    } catch (e) {
        // Quota exceeded is common for large images in localStorage
        // We can just ignore it for the snapshot; it's an enhancement, not critical data
        // console.warn('Snapshot save failed', e);
    }
};

export const clearSnapshot = () => {
    try {
        localStorage.removeItem(CHECKPOINT_KEY);
    } catch (e) {
        // ignore
    }
};
