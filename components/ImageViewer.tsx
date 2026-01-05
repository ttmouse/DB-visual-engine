
import React, { useRef } from 'react';
import { Icons } from './Icons';
import { LayoutOverlay } from './LayoutOverlay';
import { LayoutElement } from '../types';

interface ImageViewerProps {
  src: string;
  alt: string;
  className?: string;
  layoutData?: LayoutElement[] | null;
  onToggleLayout?: () => void;
  isAnalyzingLayout?: boolean;
  onFullscreen?: () => void;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
  src,
  alt,
  className,
  layoutData,
  onToggleLayout,
  isAnalyzingLayout,
  onFullscreen
}) => {
  const imgRef = useRef<HTMLImageElement>(null);

  return (
    <div className={`relative group overflow-hidden rounded-xl border border-stone-200 bg-stone-50 transition-all h-full w-full ${className}`}>
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className="w-full h-full object-contain block"
      />

      {layoutData && <LayoutOverlay data={layoutData} show={true} />}

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
