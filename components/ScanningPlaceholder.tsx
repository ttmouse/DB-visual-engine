/**
 * [INPUT]: 依赖 React, Icons, CSS Animations
 * [OUTPUT]: 渲染 ScanningPlaceholder 组件 (图片处理时的加载态)
 * [POS]: components/ScanningPlaceholder, 视觉等待反馈, 被 ImageViewer 消费
 * [PROTOCOL]: 变更时更新此头部, 然后检查 CLAUDE.md
 */

import React from 'react';
import { Icons } from './Icons';

export const ScanningPlaceholder: React.FC = () => {
    return (
        <div className="absolute inset-0 z-50 bg-stone-950 flex flex-col items-center justify-center overflow-hidden">
            {/* Grid Background */}
            <div className="absolute inset-0 opacity-20"
                style={{
                    backgroundImage: `linear-gradient(to right, #333 1px, transparent 1px), linear-gradient(to bottom, #333 1px, transparent 1px)`,
                    backgroundSize: '40px 40px'
                }}
            />

            {/* Scanning Beam */}
            <div className="absolute inset-0 z-10 animate-scan pointer-events-none">
                <div className="w-full h-[2px] bg-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.8)]" />
            </div>

            {/* Central Pulse */}
            <div className="relative z-20 flex flex-col items-center gap-4">
                <div className="relative">
                    <div className="absolute inset-0 bg-orange-500/20 blur-xl rounded-full animate-pulse" />
                    <div className="relative w-16 h-16 rounded-2xl bg-stone-900 border border-orange-500/30 flex items-center justify-center shadow-2xl">
                        <Icons.Compass size={32} className="text-orange-500 animate-spin duration-[3000ms]" strokeWidth={1.5} />
                    </div>
                </div>

                <div className="flex flex-col items-center gap-1">
                    <span className="text-orange-500 font-mono text-xs tracking-[0.2em] font-bold animate-pulse">
                        PROCESSING
                    </span>
                    <span className="text-stone-600 text-[10px] font-mono">
                        AI VISUAL ENGINE
                    </span>
                </div>
            </div>

            {/* Corner Brackets */}
            <div className="absolute top-4 left-4 w-4 h-4 border-l-2 border-t-2 border-orange-500/30" />
            <div className="absolute top-4 right-4 w-4 h-4 border-r-2 border-t-2 border-orange-500/30" />
            <div className="absolute bottom-4 left-4 w-4 h-4 border-l-2 border-b-2 border-orange-500/30" />
            <div className="absolute bottom-4 right-4 w-4 h-4 border-r-2 border-b-2 border-orange-500/30" />

            <style>{`
                @keyframes scan {
                    0% { transform: translateY(-100%); opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { transform: translateY(100%); opacity: 0; }
                }
                .animate-scan {
                    animation: scan 3s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};
