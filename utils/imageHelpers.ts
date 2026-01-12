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

/**
 * Valid Aspect Ratios with IDs and numeric values
 */
export const ASPECT_RATIOS = [
    { id: "1:1", value: 1.0 },
    { id: "3:4", value: 0.75 },
    { id: "4:3", value: 1.333 },
    { id: "9:16", value: 0.5625 },
    { id: "16:9", value: 1.777 }
];

/**
 * Calculate closest aspect ratio ID from dimensions
 */
export const calculateClosestAspectRatio = (width: number, height: number): string => {
    const ratio = width / height;
    const closest = ASPECT_RATIOS.reduce((prev, curr) =>
        Math.abs(curr.value - ratio) < Math.abs(prev.value - ratio) ? curr : prev
    );
    return closest.id;
};

/**
 * Fetch URL, convert to Base64, and extract metadata (dimensions, ratio)
 */
export const processRemoteImage = async (url: string): Promise<{ base64: string, aspectRatioId: string, width: number, height: number }> => {
    // 1. Fetch & Blob
    const response = await fetch(url);
    const blob = await response.blob();

    // 2. Convert to Base64
    const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });

    // 3. Load Image for Dimensions
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const ratioId = calculateClosestAspectRatio(img.width, img.height);
            resolve({
                base64,
                aspectRatioId: ratioId,
                width: img.width,
                height: img.height
            });
        };
        img.onerror = (e) => reject(new Error(`Failed to load image for dimensions: ${e}`));
        img.src = base64;
    });
};
