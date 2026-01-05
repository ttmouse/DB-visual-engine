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
        relative aspect-square rounded-xl overflow-hidden border-2 cursor-pointer
        transition-all duration-200 group
        ${isActive
          ? 'border-orange-500 ring-4 ring-orange-50 shadow-lg'
          : 'border-stone-200 hover:border-stone-300 hover:shadow-md'
        }
      `}
    >
      <img
        src={imageUrl}
        alt={`Generated ${index + 1}`}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
      />

      {isActive && (
        <div className="absolute top-2 right-2 w-3 h-3 bg-orange-500 rounded-full ring-2 ring-white shadow-md animate-pulse" />
      )}

      {/* Delete button - appears on hover */}
      {onDelete && (
        <button
          onClick={handleDelete}
          className="absolute top-1 left-1 p-1 bg-black/60 hover:bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          title="删除此记录"
        >
          <Icons.X size={12} className="text-white" />
        </button>
      )}


    </div>
  );
};