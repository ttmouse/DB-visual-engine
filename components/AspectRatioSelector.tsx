import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import * as Icons from 'lucide-react';

interface AspectRatioSelectorProps {
  selectedRatio: string;
  is4K: boolean;
  onRatioChange: (ratio: string) => void;
  on4KChange: (is4K: boolean) => void;
  disabled?: boolean;
  apiMode?: 'official' | 'custom' | 'volcengine';
  language?: 'CN' | 'EN';
}

interface RatioOption {
  id: string;
  label: string;
  labelEn: string;
  width: number;
  height: number;
}

// Custom mode: 3 ratios (matches your proxy models)
const CUSTOM_RATIO_OPTIONS: RatioOption[] = [
  { id: '1:1', label: '正方', labelEn: 'Square', width: 24, height: 24 },
  { id: '9:16', label: '竖屏', labelEn: 'Portrait', width: 18, height: 32 },
  { id: '16:9', label: '横屏', labelEn: 'Landscape', width: 32, height: 18 },
];

// Official mode: 5 ratios (all supported by Gemini API)
const OFFICIAL_RATIO_OPTIONS: RatioOption[] = [
  { id: '1:1', label: '正方', labelEn: 'Square', width: 20, height: 20 },
  { id: '3:4', label: '竖屏', labelEn: 'Portrait', width: 18, height: 24 },
  { id: '4:3', label: '横屏', labelEn: 'Landscape', width: 24, height: 18 },
  { id: '9:16', label: '长竖', labelEn: 'Tall', width: 14, height: 26 },
  { id: '16:9', label: '宽屏', labelEn: 'Wide', width: 26, height: 14 },
];

// Volcengine mode: 8 ratios (Seedream 4.5 supported)
const VOLCENGINE_RATIO_OPTIONS: RatioOption[] = [
  { id: '1:1', label: '正方', labelEn: 'Square', width: 20, height: 20 },
  { id: '3:4', label: '竖屏', labelEn: 'Portrait', width: 18, height: 24 },
  { id: '4:3', label: '横屏', labelEn: 'Landscape', width: 24, height: 18 },
  { id: '9:16', label: '长竖', labelEn: 'Tall', width: 14, height: 26 },
  { id: '16:9', label: '宽屏', labelEn: 'Wide', width: 26, height: 14 },
  { id: '2:3', label: '照片竖', labelEn: 'Photo V', width: 16, height: 24 },
  { id: '3:2', label: '照片横', labelEn: 'Photo H', width: 24, height: 16 },
  { id: '21:9', label: '影院', labelEn: 'Cinema', width: 28, height: 12 },
];

// i18n text
const TEXT = {
  CN: {
    selectRatio: '选择比例',
    qualityOfficial: '高清 (2K)',
    qualityCustom: '4K 高画质',
    infoOfficial4K: '2K 分辨率，需要更多生成时间',
    infoOfficial1K: '1K 标准分辨率，快速生成',
    infoCustom4K: '启用 4K 画质，生成更高分辨率图像',
    infoCustom1K: '标准画质，适合快速预览',
  },
  EN: {
    selectRatio: 'Select Ratio',
    qualityOfficial: 'HD (2K)',
    qualityCustom: '4K Quality',
    infoOfficial4K: '2K resolution, takes more time',
    infoOfficial1K: '1K standard resolution, fast generation',
    infoCustom4K: '4K quality enabled, higher resolution',
    infoCustom1K: 'Standard quality, quick preview',
  },
};

export const AspectRatioSelector: React.FC<AspectRatioSelectorProps> = ({
  selectedRatio,
  is4K,
  onRatioChange,
  on4KChange,
  disabled = false,
  apiMode = 'custom',
  language = 'CN',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const ratioOptions = apiMode === 'official'
    ? OFFICIAL_RATIO_OPTIONS
    : apiMode === 'volcengine'
      ? VOLCENGINE_RATIO_OPTIONS
      : CUSTOM_RATIO_OPTIONS;
  const t = TEXT[language];

  // Update menu position when opening
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const menuWidth = 320; // Matches w-[320px] in className
      setMenuPosition({
        top: rect.top - 8, // Keep it above the button with some gap
        left: rect.left + (rect.width / 2) - (menuWidth / 2), // Center horizontally
      });
    }
  }, [isOpen]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on scroll
  useEffect(() => {
    if (isOpen) {
      const handleScroll = () => setIsOpen(false);
      window.addEventListener('scroll', handleScroll, true);
      return () => window.removeEventListener('scroll', handleScroll, true);
    }
  }, [isOpen]);

  const currentOption = ratioOptions.find(r => r.id === selectedRatio) || ratioOptions[0];

  // Render a visual ratio indicator
  const RatioIcon: React.FC<{ option: RatioOption; size?: number; isSelected?: boolean }> = ({
    option,
    size = 1,
    isSelected = false
  }) => {
    return (
      <div
        className={`rounded-sm border transition-all ${isSelected
          ? 'border-orange-400 bg-orange-400/20'
          : 'border-stone-500 bg-stone-700/50'
          }`}
        style={{
          width: option.width * size,
          height: option.height * size,
        }}
      />
    );
  };

  // Quality label based on mode
  const qualityLabel = apiMode === 'official'
    ? (is4K ? '2K' : '1K')
    : (is4K ? '4K' : '');

  // Get label based on language
  const getLabel = (option: RatioOption) => language === 'EN' ? option.labelEn : option.label;

  // Dropdown menu content
  const menuContent = (
    <div
      ref={menuRef}
      className="fixed z-[9999] w-[320px] bg-[#1c1917] border border-stone-800 rounded-2xl shadow-2xl p-4 animate-in fade-in zoom-in-95 duration-100"
      style={{
        top: `${menuPosition.top}px`,
        left: `${menuPosition.left}px`,
        transform: 'translateY(-100%)', // Always open upwards
      }}
    >
      <div className="grid grid-cols-4 gap-2 mb-4">
        {ratioOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => {
              onRatioChange(option.id);
            }}
            className="group w-full h-full flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg hover:bg-stone-800 transition-colors"
          >
            <RatioIcon
              option={option}
              isSelected={selectedRatio === option.id}
            />
            <div className="flex flex-col items-center">
              <span className={`text-[10px] font-bold ${selectedRatio === option.id ? 'text-stone-200' : 'text-stone-400 group-hover:text-stone-300'}`}>
                {option.id}
              </span>
              <span className="text-[9px] text-stone-600 scale-90">
                {language === 'EN' ? option.labelEn : option.label}
              </span>
            </div>
          </button>
        ))}
      </div>

      <div className="h-px bg-stone-800 my-3" />

      <div className="space-y-3">
        {/* Quality Toggle */}
        <div
          onClick={() => {
            if (!disabled) on4KChange(!is4K);
          }}
          className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors ${is4K ? 'bg-orange-950/20' : 'hover:bg-stone-800/50'
            }`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-1.5 rounded-lg ${is4K ? 'bg-orange-500 text-white' : 'bg-stone-800 text-stone-500'}`}>
              <Icons.Sparkles size={14} />
            </div>
            <div>
              <div className={`text-xs font-bold ${is4K ? 'text-orange-400' : 'text-stone-400'}`}>
                {apiMode === 'official' ? t.qualityOfficial : t.qualityCustom}
              </div>
              <div className="text-[10px] text-stone-600 mt-0.5">
                {apiMode === 'official'
                  ? (is4K ? t.infoOfficial4K : t.infoOfficial1K)
                  : (is4K ? t.infoCustom4K : t.infoCustom1K)
                }
              </div>
            </div>
          </div>

          {/* Toggle Switch */}
          <div className={`w-9 h-5 rounded-full relative transition-colors duration-200 ease-in-out ${is4K ? 'bg-orange-600' : 'bg-stone-700'}`}>
            <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ease-in-out ${is4K ? 'translate-x-4' : 'translate-x-0'}`} />
          </div>
        </div>

        {/* Volcengine Tag */}
        {apiMode === 'volcengine' && (
          <div className="px-2">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#1d1b4b] text-[#818cf8] border border-[#312e81]">
              VOLCENGINE
            </span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all ${disabled
          ? 'opacity-40 cursor-not-allowed'
          : 'hover:bg-stone-700 cursor-pointer'
          } ${isOpen ? 'bg-stone-700' : ''}`}
        title={t.selectRatio}
      >
        <RatioIcon option={currentOption} size={0.5} isSelected={true} />
        <span className="text-[10px] text-stone-400 font-medium">
          {currentOption.id}
          {qualityLabel && <span className="ml-1 text-amber-400">{qualityLabel}</span>}
        </span>
        <Icons.ChevronDown size={10} className={`text-stone-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && ReactDOM.createPortal(menuContent, document.body)}
    </>
  );
};

export default AspectRatioSelector;
