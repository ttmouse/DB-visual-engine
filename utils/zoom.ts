
export interface ImageZoomState {
    scale: number;
    panX: number;
    panY: number;
}

export const calculateNewZoom = (
    currentZoom: ImageZoomState,
    mouseX: number, // relative to image center
    mouseY: number, // relative to image center
    deltaY: number
): ImageZoomState => {
    const zoomFactor = deltaY > 0 ? 0.9 : 1.1;
    const oldScale = currentZoom.scale;
    const newScale = Math.max(1, Math.min(8, oldScale * zoomFactor)); // Max 8x for better detail

    if (newScale === oldScale) return currentZoom;

    const scaleRatio = newScale / oldScale;
    const newPanX = mouseX - (mouseX - currentZoom.panX) * scaleRatio;
    const newPanY = mouseY - (mouseY - currentZoom.panY) * scaleRatio;

    if (newScale === 1) {
        return { scale: 1, panX: 0, panY: 0 };
    }

    return {
        scale: newScale,
        panX: newPanX,
        panY: newPanY
    };
};
