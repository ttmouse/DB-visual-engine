/**
 * [INPUT]: HistoryItem[], generateThumbnail function
 * [OUTPUT]: Migrated history items with thumbnails
 * [POS]: Background migration service for legacy data
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { HistoryItem } from '../types';
import { getHistory, saveHistoryItem } from './historyService';
import { generateThumbnail } from '../utils/thumbnailUtils';

// Version key: increment this when thumbnail size changes to force re-migration
const MIGRATION_VERSION = '3'; // v1=200px max, v2=400px max, v3=400px min
const MIGRATION_FLAG_KEY = `unimage_thumb_migration_v${MIGRATION_VERSION}`;
const BATCH_SIZE = 3; // Process 3 items per batch to avoid blocking
const BATCH_DELAY_MS = 500; // Wait between batches

/**
 * Check if migration has been completed for current version
 */
export const isMigrationComplete = (): boolean => {
    return localStorage.getItem(MIGRATION_FLAG_KEY) === 'true';
};

/**
 * Mark migration as complete
 */
export const markMigrationComplete = (): void => {
    localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
};

/**
 * Migrate a single history item: regenerate thumbnail
 * Force regeneration for all items that have generatedImage
 */
const migrateItem = async (item: HistoryItem): Promise<boolean> => {
    if (!item.generatedImage) {
        return false; // No image to generate thumbnail from
    }

    try {
        const thumb = await generateThumbnail(item.generatedImage, 'image/png');
        item.generatedImageThumb = thumb;
        await saveHistoryItem(item);
        console.log(`[Migration v${MIGRATION_VERSION}] Generated thumbnail for ${item.id}`);
        return true;
    } catch (e) {
        console.warn(`[Migration v${MIGRATION_VERSION}] Failed for ${item.id}:`, e);
        return false;
    }
};

/**
 * Run lazy background migration for all history items.
 * Uses requestIdleCallback (or setTimeout fallback) to avoid blocking UI.
 * @param onProgress Optional callback for progress updates
 * @returns Promise that resolves when migration is complete
 */
export const runLazyMigration = async (
    onProgress?: (migrated: number, total: number) => void
): Promise<void> => {
    if (isMigrationComplete()) {
        console.log(`[Migration v${MIGRATION_VERSION}] Already complete, skipping`);
        return;
    }

    const history = await getHistory();
    // Migrate ALL items with generatedImage (force regeneration for new size)
    const itemsToMigrate = history.filter(item => item.generatedImage);

    if (itemsToMigrate.length === 0) {
        console.log(`[Migration v${MIGRATION_VERSION}] No items need migration`);
        markMigrationComplete();
        return;
    }

    console.log(`[Migration v${MIGRATION_VERSION}] Starting: ${itemsToMigrate.length} items to migrate`);

    let migrated = 0;

    // Process in batches using idle callback or setTimeout
    const processBatch = async (startIndex: number): Promise<void> => {
        const batch = itemsToMigrate.slice(startIndex, startIndex + BATCH_SIZE);

        for (const item of batch) {
            const success = await migrateItem(item);
            if (success) migrated++;
            onProgress?.(migrated, itemsToMigrate.length);
        }

        const nextIndex = startIndex + BATCH_SIZE;
        if (nextIndex < itemsToMigrate.length) {
            // Schedule next batch with delay
            await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
            await processBatch(nextIndex);
        }
    };

    // Start migration using requestIdleCallback if available
    const scheduleStart = (): Promise<void> => {
        return new Promise(resolve => {
            if ('requestIdleCallback' in window) {
                (window as any).requestIdleCallback(async () => {
                    await processBatch(0);
                    resolve();
                }, { timeout: 2000 });
            } else {
                setTimeout(async () => {
                    await processBatch(0);
                    resolve();
                }, 100);
            }
        });
    };

    await scheduleStart();
    markMigrationComplete();
    console.log(`[Migration v${MIGRATION_VERSION}] Complete: ${migrated}/${itemsToMigrate.length} items migrated`);
};
