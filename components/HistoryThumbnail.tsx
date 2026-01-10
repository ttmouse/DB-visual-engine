import React, { memo } from 'react';
import { Icons } from './Icons';

interface HistoryThumbnailProps {
  imageUrl: string;
  index: number;
  isActive: boolean;
  onClick: (index: number) => void;
  onDelete?: (index: number) => void;
  onDownloadHD?: (index: number) => void;
  onContextMenu?: (e: React.MouseEvent, index: number) => void;
  status?: 'pending' | 'success' | 'error';
}

export const HistoryThumbnail = memo(({
  imageUrl,
  index,
  isActive,
  onClick,
  onDelete,
  onDownloadHD,
  onContextMenu,
  status = 'success',
}: HistoryThumbnailProps) => {
  const handleClick = () => onClick(index);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(index);
  };

  const handleDownloadHD = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDownloadHD?.(index);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    onContextMenu?.(e, index);
  };

  return (
    <div
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      className={`
        relative w-full h-full rounded-lg overflow-hidden border cursor-pointer
        transition-all duration-200 group
        ${isActive
          ? 'border-white opacity-100'
          : 'border-transparent hover:border-stone-700 opacity-60 hover:opacity-100'
        }
      `}
    >

      {status === 'pending' ? (
        <div className="w-full h-full bg-stone-900 flex flex-col items-center justify-center gap-2">
          <Icons.Loader2 size={20} className="text-stone-500 animate-spin" />
        </div>
      ) : imageUrl && imageUrl !== 'data:image/png;base64,' ? (
        <img
          src={imageUrl}
          alt={`Generated ${index + 1}`}
          className={`w-full h-full object-cover transition-transform duration-200 ${status === 'error' ? 'grayscale opacity-50' : ''}`}
        />
      ) : (
        <div className="w-full h-full bg-stone-900 flex items-center justify-center">
          {status === 'error' ? (
            <Icons.AlertTriangle size={20} className="text-rose-500" />
          ) : (
            <Icons.Image size={24} className="text-stone-700" />
          )}
        </div>
      )}

      {/* Delete button - appears on hover */}
      {onDelete && (
        <button
          onClick={handleDelete}
          className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-rose-500/80 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 backdrop-blur-sm"
          title="删除此记录"
        >
          <Icons.X size={10} className="text-white" />
        </button>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // 自定义比较函数，确保只有相关属性变化时才重渲染
  return (
    prevProps.isActive === nextProps.isActive &&
    prevProps.imageUrl === nextProps.imageUrl &&
    prevProps.index === nextProps.index &&
    prevProps.status === nextProps.status &&
    // 函数引用通常不需要比较，因为我们假设父组件会传递稳定的引用，
    // 或者如果它们改变了，我们也应该重渲染。
    // 但为了极致性能，假如父组件还没完全优化好，这里可以激进一点：
    // 如果 isActive, imageUrl, index 没变，我们就不渲染。
    // 这假设回调函数的行为是不变的（这通常是真的，因为它们只是 loadHistoryItem 等）
    prevProps.onClick === nextProps.onClick // 最好还是比较一下引用
  );
});

HistoryThumbnail.displayName = 'HistoryThumbnail';