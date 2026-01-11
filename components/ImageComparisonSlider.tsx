/**
 * [INPUT]: 依赖 React, Icons, LayoutOverlay
 * [OUTPUT]: 渲染 ImageComparisonSlider 组件 (图片对比/蓝图分析)
 * [POS]: components/ImageComparisonSlider, 图片对比滑块, 被 MainVisualizer 消费
 * [PROTOCOL]: 变更时更新此头部, 然后检查 CLAUDE.md
 */

import React, { useState, useRef, useEffect } from 'react';
import { Icons } from './Icons';
import { LayoutOverlay } from './LayoutOverlay';
import { LayoutElement } from '../types';
import { ImageZoomState, calculateNewZoom } from '../utils/zoom';
import { ScanningPlaceholder } from './ScanningPlaceholder';

interface ImageComparisonSliderProps {
  beforeImage: string | null;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
  layoutData?: LayoutElement[] | null;
  onToggleLayout?: () => void;
  isAnalyzingLayout?: boolean;
  onFullscreen?: () => void;
  zoom?: ImageZoomState;
  onZoomChange?: (newZoom: ImageZoomState) => void;
  isProcessing?: boolean;
}

export const ImageComparisonSlider: React.FC<ImageComparisonSliderProps> = ({
  beforeImage,
  afterImage,
  beforeLabel = 'Original',
  afterLabel = 'Generated',
  className = '',
  layoutData,
  onToggleLayout,
  isAnalyzingLayout,
  onFullscreen,
  zoom = { scale: 1, panX: 0, panY: 0 },
  onZoomChange,
  isProcessing = false
}) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Threshold for switching between side-by-side and slider mode
  const SIDE_BY_SIDE_THRESHOLD = 600;
  const useSideBySide = containerWidth >= SIDE_BY_SIDE_THRESHOLD;

  // Monitor container width
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  // 监听拖拽事件
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleMouseUp);
      };
    }
  }, [isDragging]);

  // Fix for "Unable to preventDefault inside passive event listener invocation"
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      if (!onZoomChange) return;
      e.preventDefault();

      const rect = container.getBoundingClientRect();
      const eventOffsetX = e.clientX - rect.left;
      const eventOffsetY = e.clientY - rect.top;

      let centerX = rect.width / 2;
      const centerY = rect.height / 2;

      if (useSideBySide) {
        if (eventOffsetX < rect.width / 2) {
          centerX = rect.width / 4;
        } else {
          centerX = (rect.width * 3) / 4;
        }
      }

      const mouseX = eventOffsetX - centerX;
      const mouseY = eventOffsetY - centerY;

      const newZoom = calculateNewZoom(zoom, mouseX, mouseY, e.deltaY);
      onZoomChange(newZoom);
    };

    container.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', onWheel);
    };
  }, [onZoomChange, useSideBySide, zoom]);

  const transformStyle = zoom.scale > 1
    ? {
      transform: `translate(${zoom.panX}px, ${zoom.panY}px) scale(${zoom.scale})`,
      transformOrigin: 'center center'
    }
    : {};

  // Side-by-side mode
  if (useSideBySide) {
    return (
      <div
        ref={containerRef}
        className={`relative rounded-xl border border-stone-700 bg-stone-950 overflow-hidden select-none group h-full w-full ${className}`}
      >
        <div className="absolute inset-0 flex">
          {/* Before Image */}
          <div className="flex-1 relative border-r border-stone-700 overflow-hidden">
            {beforeImage ? (
              <img
                src={beforeImage}
                alt={beforeLabel}
                className="w-full h-full object-contain transition-transform duration-100"
                style={transformStyle}
                draggable={false}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-stone-900 text-stone-600">
                <Icons.Slash size={32} />
              </div>
            )}
            <div className="absolute top-3 left-3 px-2 py-1 bg-black/40 backdrop-blur-sm rounded text-white/90 select-none flex items-center">
              <span className="text-[10px] font-medium uppercase tracking-wider leading-none pt-[1px]">{beforeLabel}</span>
            </div>
          </div>

          {/* After Image */}
          <div className="flex-1 relative overflow-hidden">
            {afterImage ? (
              <img
                src={afterImage}
                alt={afterLabel}
                className="w-full h-full object-contain transition-transform duration-100"
                style={transformStyle}
                draggable={false}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-stone-900 text-stone-600">
                <Icons.Slash size={32} />
              </div>
            )}

            {/* Show scanning placeholder on the 'After' side if processing */}
            {isProcessing && (
              <div className="absolute inset-0 z-10">
                <ScanningPlaceholder />
              </div>
            )}

            <div className="absolute top-3 right-3 px-2 py-1 bg-black/40 backdrop-blur-sm rounded text-white/90 select-none flex items-center z-20">
              <span className="text-[10px] font-medium uppercase tracking-wider leading-none pt-[1px]">{afterLabel}</span>
            </div>
          </div>
        </div>

        {/* Zoom indicator */}
        {zoom.scale > 1 && (
          <div className="absolute bottom-3 left-3 px-2 py-1 bg-black/60 backdrop-blur rounded-lg text-[10px] font-bold text-white z-30">
            {Math.round(zoom.scale * 100)}%
          </div>
        )}

        {layoutData && <LayoutOverlay data={layoutData} show={true} />}

        {/* Fullscreen button */}
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 z-20" style={{ right: '50%', transform: 'translateX(50%)' }}>
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

        {onToggleLayout && (
          <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 z-20">
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
  }

  // Slider mode (narrow container)
  return (
    <div
      ref={containerRef}
      className={`relative rounded-xl border border-stone-700 bg-stone-950 overflow-hidden select-none group h-full w-full ${className}`}
    >

      {afterImage ? (
        <img
          src={afterImage}
          alt={afterLabel}
          className="absolute inset-0 w-full h-full object-contain transition-transform duration-100"
          style={transformStyle}
          draggable={false}
        />
      ) : (
        <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-stone-900 text-stone-600">
          <Icons.Slash size={48} opacity={0.3} />
        </div>
      )}

      {/* Global Processing Overlay for Slider Mode - covers the whole area but maybe we want it only on the 'revealed' part? 
          Actually for slider mode, it's better to just show it generally or properly layered.
          If we are processing, the 'After' image is likely invalid or stale. 
          Let's put the placeholder BEHIND the before image? Or on top?
          Standard behavior: If processing, show placeholder ON TOP of everything to indicate busy state
          OR show it only where the 'After' image would be.
          
          Let's render it at the bottom layer but above the empty state.
      */}
      {isProcessing && <ScanningPlaceholder />}

      {beforeImage ? (
        <img
          src={beforeImage}
          alt={beforeLabel}
          className="absolute inset-0 w-full h-full object-contain transition-transform duration-100"
          style={{
            ...transformStyle,
            clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
          }}
          draggable={false}
        />
      ) : (
        <div
          className="absolute inset-0 w-full h-full flex items-center justify-center bg-stone-900 text-stone-600"
          style={{
            clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
          }}
        >
          <Icons.Slash size={48} opacity={0.3} />
        </div>
      )}

      {layoutData && <LayoutOverlay data={layoutData} show={true} />}

      <div className="absolute top-3 left-3 px-2 py-1 bg-black/40 backdrop-blur-sm rounded text-white/90 select-none flex items-center">
        <span className="text-[10px] font-medium uppercase tracking-wider leading-none pt-[1px]">{beforeLabel}</span>
      </div>

      <div className="absolute top-3 right-3 px-2 py-1 bg-black/40 backdrop-blur-sm rounded text-white/90 select-none flex items-center">
        <span className="text-[10px] font-medium uppercase tracking-wider leading-none pt-[1px]">{afterLabel}</span>
      </div>

      {/* Zoom indicator */}
      {
        zoom.scale > 1 && (
          <div className="absolute bottom-3 left-3 px-2 py-1 bg-black/60 backdrop-blur rounded-lg text-[10px] font-bold text-white z-30">
            {Math.round(zoom.scale * 100)}%
          </div>
        )
      }

      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 z-20" style={{ right: '3rem' }}>
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

      {
        onToggleLayout && (
          <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 z-20">
            <button
              onClick={(e) => { e.stopPropagation(); onToggleLayout(); }}
              disabled={isAnalyzingLayout}
              className="px-3 py-1.5 bg-white/90 backdrop-blur rounded-xl text-[10px] font-bold text-stone-600 border border-stone-200 hover:bg-white transition-all flex items-center gap-1.5 shadow-lg active:scale-95"
            >
              {isAnalyzingLayout ? <Icons.RefreshCw size={12} className="animate-spin" /> : <Icons.Compass size={12} />}
              BLUEPRINT
            </button>
          </div>
        )
      }

      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-10 cursor-ew-resize"
        style={{ left: `${sliderPosition}%` }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-xl flex items-center justify-center group-hover:scale-110 transition-transform">
          <Icons.ArrowLeftRight size={16} className="text-stone-600" />
        </div>
      </div>
    </div >
  );
};
