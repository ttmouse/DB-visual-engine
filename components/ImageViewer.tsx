
import React, { useRef } from 'react';
import { Icons } from './Icons';
import { LayoutOverlay } from './LayoutOverlay';
import { LayoutElement } from '../types';
import { ImageZoomState, calculateNewZoom } from '../utils/zoom';

interface ImageViewerProps {
  src: string;
  alt: string;
  className?: string;
  layoutData?: LayoutElement[] | null;
  onToggleLayout?: () => void;
  isAnalyzingLayout?: boolean;
  onFullscreen?: () => void;
  zoom?: ImageZoomState;
  onZoomChange?: (newZoom: ImageZoomState) => void;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
  src,
  alt,
  className,
  layoutData,
  onToggleLayout,
  isAnalyzingLayout,
  onFullscreen,
  zoom = { scale: 1, panX: 0, panY: 0 },
  onZoomChange
}) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!onZoomChange || !containerRef.current) return;

    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();

    // Mouse relative to container center
    const mouseX = e.clientX - rect.left - rect.width / 2;
    const mouseY = e.clientY - rect.top - rect.height / 2;

    const newZoom = calculateNewZoom(zoom, mouseX, mouseY, e.deltaY);
    onZoomChange(newZoom);
  };

  const transformStyle = zoom.scale > 1
    ? {
      transform: `translate(${zoom.panX}px, ${zoom.panY}px) scale(${zoom.scale})`,
      transformOrigin: 'center center'
    }
    : {};

  return (
    <div
      ref={containerRef}
      className={`relative group overflow-hidden rounded-xl border border-stone-700 bg-stone-950 transition-all h-full w-full ${className}`}
      onWheel={handleWheel}
    >
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className="w-full h-full object-contain block transition-transform duration-100"
        style={transformStyle}
        draggable={false}
      />

      {layoutData && <LayoutOverlay data={layoutData} show={true} />}

      {/* Zoom indicator */}
      {zoom.scale > 1 && (
        <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 backdrop-blur rounded-lg text-[10px] font-bold text-white">
          {Math.round(zoom.scale * 100)}%
        </div>
      )}

      {/* 浮动工具栏：全屏按钮修复 */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300">
        {onFullscreen && (
          <button
            onClick={(e) => { e.stopPropagation(); onFullscreen(); }}
            className="p-2.5 bg-white/90 backdrop-blur rounded-xl shadow-xl hover:bg-white text-stone-600 transition-all hover:scale-110 active:scale-95 flex items-center justify-center"
            title="查看大图"
          >
            <Icons.Maximize size={16} />
          </button>
        )}
      </div>

      {/* 蓝图切换按钮 */}
      {onToggleLayout && (
        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleLayout(); }}
            disabled={isAnalyzingLayout}
            className="px-3 py-1.5 bg-white/90 backdrop-blur rounded-xl text-[10px] font-bold text-stone-600 border border-stone-200 hover:bg-white transition-all flex items-center gap-1.5 shadow-lg active:scale-95"
          >
            {isAnalyzingLayout ? <Icons.RefreshCw size={12} className="animate-spin" /> : <Icons.Compass size={12} />}
            BLUEPRINT
          </button>
        </div>
      )}
    </div>
  );
};
