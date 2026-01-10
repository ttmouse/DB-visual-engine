import React from 'react';
import { HistoryThumbnail } from './HistoryThumbnail';
import { AppState, HistoryItem } from '../types';
import { Icons } from './Icons';

interface HistoryFloatingPanelProps {
    state: AppState;
    loadHistoryItem: (index: number) => void;
    scrollContainerRef: React.RefObject<HTMLDivElement>;
    onContextMenu: (e: React.MouseEvent, index: number) => void;
}

export const HistoryFloatingPanel: React.FC<HistoryFloatingPanelProps> = ({
    state,
    loadHistoryItem,
    scrollContainerRef,
    onContextMenu
}) => {
    // If no history, maybe don't show the floating panel? Or show a dedicated "Empty" state?
    // User logic in App.tsx showed "No history records".

    if (state.history.length === 0) {
        return null; // Don't show floating panel if empty? Or show small dot?
        // Let's keep it simple: Hidden if empty to be unobtrusive.
    }

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-[90vw]">
            <div className="bg-stone-950/80 backdrop-blur-xl border border-stone-800 rounded-2xl shadow-2xl p-2 flex items-center gap-2">

                {/* Scrollable Container */}
                <div
                    ref={scrollContainerRef}
                    className="flex items-center gap-2 overflow-x-auto custom-scrollbar px-2 max-w-[800px] max-h-[100px]"
                    style={{ scrollBehavior: 'smooth' }}
                >
                    {state.history.map((item, index) => (
                        <div key={index} id={`history-item-${index}`} className="flex-shrink-0 w-16 h-16 relative">
                            <HistoryThumbnail
                                imageUrl={item.generatedImageThumb ? `data:image/png;base64,${item.generatedImageThumb}` : (item.generatedImage ? `data:image/png;base64,${item.generatedImage}` : '')}
                                index={index}
                                isActive={index === state.selectedHistoryIndex}
                                onClick={loadHistoryItem}
                                status={item.status}
                                onContextMenu={onContextMenu}
                            />
                        </div>
                    ))}
                </div>

                {/* Counter / Info */}
                <div className="h-8 w-px bg-stone-800 mx-1" />
                <div className="px-2 text-[10px] font-mono text-stone-500 flex flex-col items-center">
                    <span className="text-stone-300 font-bold">{state.selectedHistoryIndex + 1}</span>
                    <span className="opacity-50">/</span>
                    <span>{state.history.length}</span>
                </div>
            </div>
        </div>
    );
};
