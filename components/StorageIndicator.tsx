/**
 * [INPUT]: IndexedDB usage data
 * [OUTPUT]: Storage usage indicator component
 * [POS]: UI Component showing real storage consumption
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import React, { useState, useEffect } from 'react';
import { getHistory } from '../services/historyService';

interface StorageStats {
    itemCount: number;
    totalBytes: number;
    quotaBytes: number | null;
    percent: number;
}

const INITIAL_STATS: StorageStats = {
    itemCount: 0,
    totalBytes: 0,
    quotaBytes: null,
    percent: 0
};

/** Formats bytes into human-readable string (B, KB, MB, GB) */
function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

/** Estimates storage usage from history items */
function estimateHistorySize(history: Array<{ originalImage?: string; generatedImage?: string; generatedImageThumb?: string; prompt?: string }>): number {
    let totalBytes = 0;
    for (const item of history) {
        if (item.originalImage) totalBytes += item.originalImage.length;
        if (item.generatedImage) totalBytes += item.generatedImage.length;
        if (item.generatedImageThumb) totalBytes += item.generatedImageThumb.length;
        if (item.prompt) totalBytes += item.prompt.length * 2;
    }
    return totalBytes;
}

export const StorageIndicator: React.FC = () => {
    const [stats, setStats] = useState<StorageStats>(INITIAL_STATS);
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        const calculateUsage = async () => {
            try {
                const history = await getHistory();
                let totalBytes = estimateHistorySize(history);
                let quotaBytes: number | null = null;
                let percent = 0;

                // Use Storage API for more accurate data if available
                if ('storage' in navigator && 'estimate' in navigator.storage) {
                    const estimate = await navigator.storage.estimate();
                    if (estimate.quota) {
                        quotaBytes = estimate.quota;
                        percent = estimate.usage ? (estimate.usage / estimate.quota) * 100 : 0;
                    }
                    if (estimate.usage) {
                        totalBytes = estimate.usage;
                    }
                }

                setStats({
                    itemCount: history.length,
                    totalBytes,
                    quotaBytes,
                    percent: Math.min(100, percent)
                });
            } catch (e) {
                console.warn('Failed to calculate storage usage:', e);
            }
        };

        calculateUsage();
        const interval = setInterval(calculateUsage, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div
            className="flex items-center gap-2 px-2 py-1 rounded bg-stone-800/50 hover:bg-stone-800 transition-colors cursor-help relative group"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="flex items-center gap-2 text-[10px] font-mono">
                <span className="text-stone-400">STORAGE</span>
                <span className="text-white font-bold">{stats.itemCount}张</span>
                <span className="text-stone-600">·</span>
                <span className="text-emerald-400 font-bold">{formatBytes(stats.totalBytes)}</span>
            </div>

            {/* Tooltip */}
            <div className={`absolute top-full right-0 mt-2 p-3 bg-stone-900 border border-stone-700 rounded-lg shadow-xl z-50 text-xs text-stone-300 w-52 pointer-events-none transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                <div className="flex justify-between mb-1">
                    <span>图片数量:</span>
                    <span className="font-mono text-white">{stats.itemCount} 张</span>
                </div>
                <div className="flex justify-between mb-1">
                    <span>已用空间:</span>
                    <span className="font-mono text-white">{formatBytes(stats.totalBytes)}</span>
                </div>
                {stats.quotaBytes && (
                    <div className="flex justify-between mb-2">
                        <span>可用配额:</span>
                        <span className="font-mono text-white">{formatBytes(stats.quotaBytes)}</span>
                    </div>
                )}
                <p className="text-[10px] text-stone-500 leading-tight mt-2 pt-2 border-t border-stone-700">
                    *数据存储于浏览器 IndexedDB，无 5MB 限制。
                </p>
            </div>
        </div>
    );
};
