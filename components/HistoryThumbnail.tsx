import React from 'react';
import { Icons } from './Icons';

interface HistoryThumbnailProps {
  imageUrl: string;
  index: number;
  isActive: boolean;
  onClick: () => void;
  onDelete?: () => void;
  onDownloadHD?: () => void;
}

export const HistoryThumbnail: React.FC<HistoryThumbnailProps> = ({
  imageUrl,
  index,
  isActive,
  onClick,
  onDelete,
  onDownloadHD,
}) => {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.();
  };

  const handleDownloadHD = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDownloadHD?.();
  };

  return (
    <div
      onClick={onClick}
      className={`
        relative w-full h-full rounded-lg overflow-hidden border cursor-pointer
        transition-all duration-200 group
        ${isActive
          ? 'border-white opacity-100'
          : 'border-transparent hover:border-stone-700 opacity-60 hover:opacity-100'
        }
      `}
    >
      <img
        src={imageUrl}
        alt={`Generated ${index + 1}`}
        className="w-full h-full object-cover transition-transform duration-200"
      />

      {/* Delete button - appears on hover */}
      {onDelete && (
        <button
          onClick={handleDelete}
          className="absolute top-1 left-1 p-1 bg-black/60 hover:bg-rose-500/80 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 backdrop-blur-sm"
          title="删除此记录"
        >
          <Icons.X size={10} className="text-white" />
        </button>
      )}
    </div>
  );
};