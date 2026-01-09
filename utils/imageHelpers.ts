/**
 * [INPUT]: 依赖 types (HistoryItem)
 * [OUTPUT]: 导出 getImageSrc, getOriginalFromHistory
 * [POS]: Utils 辅助模块
 * [PROTOCOL]: 变更时更新此头部
 */

import { HistoryItem } from '../types';

/**
 * Helper to determine image source (Base64 or URL)
 */
export const getImageSrc = (data: string | null | undefined, mimeType: string = 'image/png'): string => {
    if (!data) return '';
    if (data.startsWith('http')) return data;
    if (data.startsWith('data:')) return data;
    return `data:${mimeType};base64,${data}`;
};

/**
 * Helper to get original (full res) image from history by index
 */
export const getOriginalFromHistory = (history: HistoryItem[], index: number): string => {
    const item = history[index];
    if (!item?.generatedImage) return '';
    return getImageSrc(item.generatedImage, item.mimeType || 'image/png');
};
