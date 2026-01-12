import React, { useState } from 'react';
import { Icons } from './Icons';
import { TweetData, twitterService } from '../services/twitterService';
import { useI18n } from '../hooks/useI18n';

interface TwitterParseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (selectedText: string, selectedImages: string[], importMode: 'reference' | 'main') => void;
    tweetData: TweetData;
}

export const TwitterParseModal: React.FC<TwitterParseModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    tweetData
}) => {
    const { t } = useI18n();
    // Default to 'main' (Reverse Engineer) mode to save a click
    const [importMode, setImportMode] = useState<'reference' | 'main' | null>('main');
    const [includeText, setIncludeText] = useState(false); // Default false for main mode
    const [selectedImageIndices, setSelectedImageIndices] = useState<number[]>([]); // Default empty for main mode

    if (!isOpen) return null;

    const images = tweetData.media_extended.filter(m => m.type === 'image');

    const handleConfirm = () => {
        if (!importMode) return;
        const selectedImages = selectedImageIndices.map(i => images[i].url);
        // Clean text before importing
        const finalText = includeText ? twitterService.cleanTweetText(tweetData.text) : '';
        onConfirm(finalText, selectedImages, importMode);
        onClose();
    };

    const toggleImageSelection = (index: number) => {
        if (importMode === 'main') {
            // Main mode: Immediate Import
            // We just call onConfirm with this single image immediately
            const selectedUrl = images[index].url;
            onConfirm('', [selectedUrl], 'main');
            onClose();
        } else {
            // Reference mode: multiple selection
            setSelectedImageIndices(prev =>
                prev.includes(index)
                    ? prev.filter(i => i !== index)
                    : [...prev, index]
            );
        }
    };

    const selectMode = (mode: 'reference' | 'main') => {
        setImportMode(mode);
        // Auto-configure text inclusion and image selection based on mode
        if (mode === 'main') {
            setIncludeText(false);
            setSelectedImageIndices([]); // Reset selection for main mode (default empty)
        } else {
            setIncludeText(true);
            // Default Select All for reference mode
            setSelectedImageIndices(tweetData.media_extended.filter(m => m.type === 'image').map((_, i) => i));
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-stone-900 border border-stone-700 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-stone-800">
                    <h2 className="text-lg font-bold text-stone-200 flex items-center gap-2">
                        <Icons.Twitter size={20} className="text-blue-400" />
                        Twitter Import
                    </h2>
                    <button onClick={onClose} className="text-stone-500 hover:text-stone-300 transition-colors">
                        <Icons.X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* Step 1: Scenario Selection */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-stone-300">Choose Import Goal</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => selectMode('main')}
                                className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${importMode === 'main'
                                    ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10'
                                    : 'border-stone-800 bg-stone-900 hover:bg-stone-800 hover:border-stone-600'
                                    }`}
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${importMode === 'main' ? 'bg-blue-500 text-white' : 'bg-stone-800 text-stone-400'}`}>
                                    <Icons.Wand2 size={20} />
                                </div>
                                <div className="text-center">
                                    <div className={`font-bold ${importMode === 'main' ? 'text-blue-400' : 'text-stone-300'}`}>Reverse Engineer</div>
                                    <div className="text-xs text-stone-500 mt-1">Select one image to analyze directly</div>
                                </div>
                            </button>

                            <button
                                onClick={() => selectMode('reference')}
                                className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${importMode === 'reference'
                                    ? 'border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/10'
                                    : 'border-stone-800 bg-stone-900 hover:bg-stone-800 hover:border-stone-600'
                                    }`}
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${importMode === 'reference' ? 'bg-emerald-500 text-white' : 'bg-stone-800 text-stone-400'}`}>
                                    <Icons.Image size={20} />
                                </div>
                                <div className="text-center">
                                    <div className={`font-bold ${importMode === 'reference' ? 'text-emerald-400' : 'text-stone-300'}`}>Add Reference</div>
                                    <div className="text-xs text-stone-500 mt-1">Add to Gallery as Reference or ControlNet</div>
                                </div>
                            </button>
                        </div>
                    </div>

                    {importMode && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                            <div className="w-full h-px bg-stone-800" />

                            {/* Images Section */}
                            {images.length > 0 && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-medium text-stone-300">
                                            {importMode === 'main' ? 'Select Image (Click to Import)' : `Select Images (${selectedImageIndices.length}/${images.length})`}
                                        </h3>
                                    </div>

                                    {importMode === 'main' && (
                                        <div className="text-xs text-blue-400 bg-blue-500/10 px-3 py-2 rounded border border-blue-500/20 flex items-center gap-2">
                                            <Icons.Info size={14} />
                                            Click any image below to instantly import it as the Main Image and start a new task.
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                        {images.map((img, index) => {
                                            const isSelected = selectedImageIndices.includes(index);
                                            // In Main mode, we don't disable others, everything is clickable
                                            const isDisabled = false;

                                            return (
                                                <div
                                                    key={index}
                                                    onClick={() => toggleImageSelection(index)}
                                                    className={`group relative aspect-square rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${isSelected
                                                        ? (importMode === 'main' ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-emerald-500 ring-2 ring-emerald-500/20')
                                                        : 'border-stone-800 hover:border-stone-600 hover:scale-[1.02]'
                                                        }`}
                                                >
                                                    <img
                                                        src={img.url}
                                                        alt={`Tweet media ${index + 1}`}
                                                        className={`w-full h-full object-cover transition-transform duration-300 ${isSelected ? 'scale-100 opacity-100' : 'scale-105 opacity-60 group-hover:opacity-100 group-hover:scale-100'}`}
                                                    />
                                                    {/* In Reference mode, verify checkmarks. In Main mode, hover effect is enough since click is instant */}
                                                    {importMode === 'reference' && (
                                                        <div className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${isSelected
                                                            ? 'bg-emerald-500 text-white'
                                                            : 'bg-black/50 text-white/50 border border-white/20'
                                                            }`}>
                                                            {isSelected && <Icons.Check size={14} />}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Text Section - HIDE in Main Mode */}
                            {tweetData.text && importMode !== 'main' && (
                                <div className="space-y-2 transition-opacity duration-200 opacity-100">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="include-text"
                                            checked={includeText}
                                            onChange={(e) => setIncludeText(e.target.checked)}
                                            className="rounded border-stone-700 bg-stone-800 text-emerald-500 focus:ring-emerald-500/50"
                                        />
                                        <label htmlFor="include-text" className="text-sm font-medium text-stone-300 cursor-pointer select-none">
                                            Include Text <span className="text-stone-500 font-normal ml-2 text-xs">(Grey content will be excluded)</span>
                                        </label>
                                    </div>
                                    <div className={`p-4 rounded-lg border transition-colors ${includeText ? 'bg-stone-800 border-stone-700' : 'bg-stone-900 border-stone-800'}`}>
                                        <p className="text-sm whitespace-pre-wrap font-mono leading-relaxed">
                                            {(() => {
                                                const startIndex = twitterService.getPromptStartIndex(tweetData.text);
                                                if (startIndex > 0) {
                                                    const discarded = tweetData.text.substring(0, startIndex);
                                                    const kept = tweetData.text.substring(startIndex);
                                                    return (
                                                        <>
                                                            <span className="text-stone-600 select-none transition-colors duration-300 hover:text-stone-500">{discarded}</span>
                                                            <span className={includeText ? 'text-stone-200' : 'text-stone-500'}>{kept}</span>
                                                        </>
                                                    );
                                                }
                                                // No separator found
                                                return <span className={includeText ? 'text-stone-200' : 'text-stone-500'}>{tweetData.text}</span>;
                                            })()}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {!importMode && (
                        <div className="text-center text-stone-500 py-10">
                            Select an import goal to continue
                        </div>
                    )}
                </div>

                {/* Footer - HIDE in Main Mode */}
                {importMode !== 'main' && (
                    <div className="p-4 border-t border-stone-800 bg-stone-900/50 flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-sm font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={!importMode || (!includeText && selectedImageIndices.length === 0)}
                            className={`px-4 py-2 rounded-lg text-white text-sm font-bold transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-emerald-600 hover:bg-emerald-500`}
                        >
                            <Icons.Download size={16} />
                            Import References
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
