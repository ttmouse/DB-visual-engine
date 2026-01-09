/**
 * [INPUT]: HistoryItem 从 types.ts
 * [OUTPUT]: 导出 localStorage 快速缓存函数
 * [POS]: Services 模块 - 双层缓存的快速层
 * [PROTOCOL]: 变更时更新此头部
 */

import { HistoryItem } from '../types';

const CACHE_KEY = 'unimage_recent_cache';
const VIEW_STATE_KEY = 'unimage_view_state';
const MAX_CACHED_ITEMS = 15; // 约 15 张缩略图，控制在 5MB 以内

// 缓存的精简版历史记录（只保留显示必需的字段）
interface CachedHistoryItem {
    id: string;
    timestamp: number;
    prompt: string;
    thumbnail: string;  // generatedImageThumb
    aspectRatio: string;
}

// 视图状态（用于即时恢复用户之前的位置）
interface ViewState {
    selectedIndex: number;
    currentItemId?: string; // Add ID for robust matching
}

/**
 * 保存当前视图状态（同步）
 * 同时将当前查看的图片添加到"最近查看"缓存
 */
export const saveViewState = (
    selectedIndex: number,
    currentItem?: { id: string; thumbnail?: string; prompt?: string; aspectRatio?: string }
): void => {
    try {
        // 保存当前位置和ID（用于校验）
        const tempState: ViewState = {
            selectedIndex,
            currentItemId: currentItem?.id
        };
        localStorage.setItem(VIEW_STATE_KEY, JSON.stringify(tempState));

        // 如果有当前图片，添加到"最近查看"缓存（按查看时间排序）
        if (currentItem?.thumbnail) {
            const existing = getRecentCache();
            const newItem: CachedHistoryItem = {
                id: currentItem.id,
                timestamp: Date.now(), // 使用查看时间而不是创建时间
                prompt: (currentItem.prompt || '').slice(0, 200),
                thumbnail: currentItem.thumbnail,
                aspectRatio: currentItem.aspectRatio || '1:1'
            };

            // 移除已存在的相同 id，添加到头部
            const filtered = existing.filter(c => c.id !== currentItem.id);
            const updated = [newItem, ...filtered].slice(0, MAX_CACHED_ITEMS);

            localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
        }
    } catch {
        // Ignore - might fail if thumbnail is too large
    }
};

/**
 * 读取视图状态（同步，即时）
 */
export const getViewState = (): ViewState | null => {
    try {
        const saved = localStorage.getItem(VIEW_STATE_KEY);
        if (!saved) return null;
        return JSON.parse(saved) as ViewState;
    } catch {
        return null;
    }
};

/**
 * 从 localStorage 读取最近的缓存（同步，即时）
 */
export const getRecentCache = (): CachedHistoryItem[] => {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (!cached) return [];
        return JSON.parse(cached) as CachedHistoryItem[];
    } catch (e) {
        console.warn('[RecentCache] Read error:', e);
        return [];
    }
};

/**
 * 更新 localStorage 缓存（添加新项到头部）
 * 重要：只缓存有缩略图的记录
 */
export const updateRecentCache = (item: HistoryItem): void => {
    try {
        // CRITICAL: Only cache if thumbnail exists (not full image)
        const thumbnail = item.generatedImageThumb;
        if (!thumbnail) return; // Skip items without thumbnails

        const cached = getRecentCache();

        // 创建精简版记录
        const newItem: CachedHistoryItem = {
            id: item.id,
            timestamp: item.timestamp,
            prompt: item.prompt.slice(0, 200), // 限制 prompt 长度
            thumbnail: thumbnail,
            aspectRatio: item.detectedAspectRatio || '1:1'
        };

        // 移除已存在的相同 id
        const filtered = cached.filter(c => c.id !== item.id);

        // 添加到头部，限制数量
        const updated = [newItem, ...filtered].slice(0, MAX_CACHED_ITEMS);

        localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
    } catch (e: any) {
        // QuotaExceededError - 清理旧数据重试
        if (e.name === 'QuotaExceededError') {
            try {
                const cached = getRecentCache();
                const reduced = cached.slice(0, Math.floor(MAX_CACHED_ITEMS / 2));
                localStorage.setItem(CACHE_KEY, JSON.stringify(reduced));
                console.warn('[RecentCache] Storage full, reduced cache size');
            } catch {
                // 放弃缓存
            }
        }
    }
};

/**
 * 清除 localStorage 缓存
 */
export const clearRecentCache = (): void => {
    try {
        localStorage.removeItem(CACHE_KEY);
    } catch {
        // Ignore
    }
};

/**
 * 从 IndexedDB 加载的历史记录重建缓存（用于初始化）
 * 重要：只缓存有缩略图的记录，避免存储完整大图导致内存溢出
 */
export const rebuildRecentCache = (items: HistoryItem[]): void => {
    try {
        // CRITICAL: Only cache items with thumbnails (small images)
        // Do NOT cache full-size images - they will cause memory overflow
        const cacheItems: CachedHistoryItem[] = items
            .slice(0, MAX_CACHED_ITEMS)
            .filter(item => item.generatedImageThumb) // ONLY items with thumbnails
            .map(item => ({
                id: item.id,
                timestamp: item.timestamp,
                prompt: (item.prompt || '').slice(0, 200),
                thumbnail: item.generatedImageThumb!, // Only use thumbnail
                aspectRatio: item.detectedAspectRatio || '1:1'
            }));

        if (cacheItems.length > 0) {
            localStorage.setItem(CACHE_KEY, JSON.stringify(cacheItems));
            console.log('[RecentCache] Rebuilt cache with', cacheItems.length, 'thumbnail items');
        }
    } catch (e: any) {
        if (e.name === 'QuotaExceededError') {
            // Try with fewer items
            try {
                const reduced = items.slice(0, 3).filter(i => i.generatedImageThumb).map(item => ({
                    id: item.id,
                    timestamp: item.timestamp,
                    prompt: (item.prompt || '').slice(0, 100),
                    thumbnail: item.generatedImageThumb!,
                    aspectRatio: item.detectedAspectRatio || '1:1'
                }));
                localStorage.setItem(CACHE_KEY, JSON.stringify(reduced));
            } catch {
                // Give up and clear cache
                clearRecentCache();
            }
        }
    }
};

/**
 * 将缓存项转换回 HistoryItem 格式（用于初始渲染）
 */
export const cachedToHistoryItem = (cached: CachedHistoryItem): Partial<HistoryItem> => ({
    id: cached.id,
    timestamp: cached.timestamp,
    prompt: cached.prompt,
    generatedImageThumb: cached.thumbnail,
    generatedImage: cached.thumbnail, // 临时使用缩略图，后续 IndexedDB 会更新
    detectedAspectRatio: cached.aspectRatio,
    mimeType: 'image/png'
});
