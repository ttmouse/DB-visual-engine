/**
 * [INPUT]: Base64 image string
 * [OUTPUT]: Resized thumbnail as Base64
 * [POS]: Utility for generating lightweight thumbnails for gallery
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

const THUMB_SIZE = 400; // Minimum dimension (shorter side) in pixels

/**
 * Generate a thumbnail from a base64 image string.
 * Uses Canvas to resize so the shorter side equals THUMB_SIZE pixels.
 * Returns a smaller base64 string suitable for in-memory storage.
 */
export const generateThumbnail = (
    base64Data: string,
    mimeType: string = 'image/png'
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();

        img.onload = () => {
            try {
                // Calculate new dimensions: THUMB_SIZE = minimum dimension (shorter side)
                let width = img.naturalWidth;
                let height = img.naturalHeight;

                // For horizontal images: height is shorter, set height = THUMB_SIZE
                // For vertical images: width is shorter, set width = THUMB_SIZE
                if (width > height) {
                    // Horizontal: scale by height (shorter side)
                    width = Math.round((width * THUMB_SIZE) / height);
                    height = THUMB_SIZE;
                } else {
                    // Vertical or square: scale by width (shorter side)
                    height = Math.round((height * THUMB_SIZE) / width);
                    width = THUMB_SIZE;
                }

                // Create canvas and draw resized image
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Failed to get canvas context'));
                    return;
                }

                // Use high-quality image smoothing
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';

                ctx.drawImage(img, 0, 0, width, height);

                // Export as JPEG for smaller file size (quality 0.7)
                const thumbBase64 = canvas.toDataURL('image/jpeg', 0.7);

                // Return just the base64 part without prefix
                const base64Only = thumbBase64.split(',')[1];
                resolve(base64Only);
            } catch (e) {
                reject(e);
            }
        };

        img.onerror = () => {
            reject(new Error('Failed to load image for thumbnail generation'));
        };

        // Set source - handle both with and without data: prefix
        if (base64Data.startsWith('data:')) {
            img.src = base64Data;
        } else if (base64Data.startsWith('http')) {
            img.crossOrigin = 'anonymous';
            img.src = base64Data;
        } else {
            img.src = `data:${mimeType};base64,${base64Data}`;
        }
    });
};

/**
 * Get the full data URL from a base64 string
 */
export const toDataUrl = (base64: string, mimeType: string = 'image/jpeg'): string => {
    if (base64.startsWith('data:') || base64.startsWith('http')) {
        return base64;
    }
    return `data:${mimeType};base64,${base64}`;
};
