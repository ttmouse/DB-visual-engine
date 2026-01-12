
/**
 * [INPUT]: 依赖 Icons, utils/pngMetadata
 * [OUTPUT]: 导出 ImageUploader 组件
 * [POS]: UI Component, 核心交互入口，负责图片/视频输入处理
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import React, { useRef, useState, useEffect } from 'react';
import { Icons } from './Icons';
import { extractPromptFromPng } from '../utils/pngMetadata';

interface ImageUploaderProps {
  onImageSelected: (base64: string, aspectRatio: string, mimeType: string, duration?: number, extractedPrompt?: string) => void;
  disabled: boolean;
  onParseTwitterUrl: (url: string) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelected, disabled, onParseTwitterUrl }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [base64Data, setBase64Data] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<string>("16:9");
  const [mimeType, setMimeType] = useState<string>("");
  const [customDuration, setCustomDuration] = useState<string>("");
  const [extractedPrompt, setExtractedPrompt] = useState<string | null>(null);

  const calculateNearestRatio = (width: number, height: number): string => {
    const ratio = width / height;
    const ratios = [
      { id: "1:1", value: 1.0 },
      { id: "3:4", value: 0.75 },
      { id: "4:3", value: 1.333 },
      { id: "9:16", value: 0.5625 },
      { id: "16:9", value: 1.777 }
    ];
    const closest = ratios.reduce((prev, curr) => {
      return (Math.abs(curr.value - ratio) < Math.abs(prev.value - ratio) ? curr : prev);
    });
    return closest.id;
  };

  const handleFile = (file: File) => {
    if (!file) return;

    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      if (file.size > 20 * 1024 * 1024) {
        alert("文件过大 (最大 20MB)。");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setPreview(base64String);
        const cleanBase64 = base64String.split(',')[1];
        setBase64Data(cleanBase64);
        setMimeType(file.type);

        if (file.type.startsWith('image/')) {
          // Try to extract prompt from metadata for ALL images
          // (Our extractor safely handles non-PNGs by checking signatures)
          const prompt = extractPromptFromPng(cleanBase64);
          if (prompt) {
            setExtractedPrompt(prompt);
          }

          const img = new Image();
          img.onload = () => {
            const ratio = calculateNearestRatio(img.naturalWidth, img.naturalHeight);
            setAspectRatio(ratio);
          };
          img.src = base64String;
        } else if (file.type.startsWith('video/')) {
          const vid = document.createElement('video');
          vid.onloadedmetadata = () => {
            const ratio = calculateNearestRatio(vid.videoWidth, vid.videoHeight);
            setAspectRatio(ratio);
            if (vid.duration < 60) {
              setCustomDuration(Math.ceil(vid.duration).toString());
            }
          };
          vid.src = base64String;
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Auto-submit images when ready
  useEffect(() => {
    if (preview && base64Data && mimeType.startsWith('image/')) {
      // Short timeout to allow state to settle, then submit
      const timer = setTimeout(() => {
        onImageSelected(base64Data, aspectRatio, mimeType, undefined, extractedPrompt || undefined);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [preview, base64Data, mimeType, aspectRatio, extractedPrompt, onImageSelected]);

  // 粘贴功能实现
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      // Ignore if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (disabled || preview) return;

      // Check for text content (Twitter URL)
      const text = e.clipboardData?.getData('text');
      if (text && (text.includes('twitter.com') || text.includes('x.com'))) {
        onParseTwitterUrl(text);
        return;
      }

      const items = e.clipboardData?.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.startsWith('image/') || items[i].type.startsWith('video/')) {
            const file = items[i].getAsFile();
            if (file) handleFile(file);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [disabled, preview]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) handleFile(e.target.files[0]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (!disabled && e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    setBase64Data(null);
    setMimeType("");
    setCustomDuration("");
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleStartAnalysis = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (base64Data) {
      const duration = customDuration ? parseFloat(customDuration) : undefined;
      onImageSelected(base64Data, aspectRatio, mimeType, duration);
    }
  };

  if (preview) {
    const isVideo = mimeType.startsWith('video/');
    return (
      <div className="relative w-full flex-1 min-h-[400px] rounded-3xl overflow-hidden border border-stone-200 bg-stone-50 animate-in fade-in zoom-in-95 duration-500">
        {isVideo ? (
          <video src={preview} className="w-full h-full object-contain" muted loop autoPlay />
        ) : (
          <img src={preview} alt="Preview" className="w-full h-full object-contain" />
        )}
        <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-6 backdrop-blur-[2px]">
          {isVideo && (
            <div className="flex flex-col items-center gap-2">
              <span className="text-[10px] font-bold text-white uppercase tracking-widest">分析时长 (s)</span>
              <input
                type="number"
                value={customDuration}
                onChange={(e) => setCustomDuration(e.target.value)}
                className="bg-white/10 text-white text-center rounded-xl px-4 py-2 w-24 text-sm border border-white/20 outline-none focus:bg-white/20 transition-all"
              />
            </div>
          )}
          <button
            onClick={handleStartAnalysis}
            disabled={disabled}
            className="bg-white text-black px-10 py-4 rounded-2xl font-bold text-sm hover:bg-orange-500 hover:text-white flex items-center gap-3 shadow-2xl transition-all active:scale-95"
          >
            {isVideo ? <Icons.Film size={18} /> : <Icons.Sparkles size={18} />}
            {isVideo ? "开始视频流解析" : "启动资产扫描"}
          </button>
          <button
            onClick={handleClear}
            className="text-white/60 text-xs hover:text-white hover:underline flex items-center gap-1.5 font-medium transition-colors"
          >
            <Icons.X size={14} /> 更换参考文件 (或直接粘贴)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`
        relative group cursor-pointer transition-all duration-300 flex-1 flex items-center justify-center
        ${isDragging ? 'bg-orange-900/10' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      onClick={() => inputRef.current?.click()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input type="file" ref={inputRef} onChange={handleChange} accept="image/*,video/*" className="hidden" disabled={disabled} />

      <div className={`
        flex flex-col items-center justify-center p-12 rounded-2xl transition-all duration-300
        ${isDragging ? 'bg-orange-500/10 ring-2 ring-orange-500/50' : 'hover:bg-stone-800/50'}
      `}>
        <div className={`
          w-20 h-20 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300
          ${isDragging ? 'bg-orange-500/20 text-orange-400 scale-110' : 'bg-stone-800/80 text-stone-500 group-hover:bg-stone-700 group-hover:text-orange-400 group-hover:scale-105'}
        `}>
          <Icons.Upload size={32} />
        </div>
        <div className="text-center space-y-3">
          <h3 className="text-lg font-medium text-stone-200">拖入、点击或粘贴参考图片</h3>
          <p className="text-sm text-stone-500 leading-relaxed max-w-xs">
            支持高保真图像或 Sora 级短视频解析
            <span className="block text-stone-600 text-xs mt-2">MAX 20MB · Ctrl+V / Cmd+V 粘贴</span>
          </p>
        </div>
      </div>
    </div>
  );
};
