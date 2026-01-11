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

/** Renders the thumbnail content based on status and image availability */
function ThumbnailContent({
  status,
  imageUrl
}: {
  status: 'pending' | 'success' | 'error';
  imageUrl: string;
}): React.ReactElement {
  if (status === 'pending') {
    return (
      <div className="w-full h-full bg-stone-900 flex flex-col items-center justify-center gap-2">
        <Icons.Loader2 size={20} className="text-stone-500 animate-spin" />
      </div>
    );
  }

  const hasValidImage = imageUrl && imageUrl !== 'data:image/png;base64,';

  if (hasValidImage) {
    const imageClass = status === 'error'
      ? 'w-full h-full object-cover transition-transform duration-200 grayscale opacity-50'
      : 'w-full h-full object-cover transition-transform duration-200';

    return <img src={imageUrl} alt="Generated thumbnail" className={imageClass} />;
  }

  // No valid image - show placeholder
  const icon = status === 'error'
    ? <Icons.AlertTriangle size={20} className="text-rose-500" />
    : <Icons.Image size={24} className="text-stone-700" />;

  return (
    <div className="w-full h-full bg-stone-900 flex items-center justify-center">
      {icon}
    </div>
  );
}

export const HistoryThumbnail = memo(({
  imageUrl,
  index,
  isActive,
  onClick,
  onDelete,
  onContextMenu,
  status = 'success',
}: HistoryThumbnailProps) => {
  const handleClick = () => onClick(index);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(index);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    onContextMenu?.(e, index);
  };

  const borderClass = isActive
    ? 'border-white opacity-100'
    : 'border-transparent hover:border-stone-700 opacity-60 hover:opacity-100';

  return (
    <div
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      className={`relative w-full h-full rounded-lg overflow-hidden border cursor-pointer transition-all duration-200 group ${borderClass}`}
    >
      <ThumbnailContent status={status} imageUrl={imageUrl} />

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
  return (
    prevProps.isActive === nextProps.isActive &&
    prevProps.imageUrl === nextProps.imageUrl &&
    prevProps.index === nextProps.index &&
    prevProps.status === nextProps.status &&
    prevProps.onClick === nextProps.onClick
  );
});

HistoryThumbnail.displayName = 'HistoryThumbnail';