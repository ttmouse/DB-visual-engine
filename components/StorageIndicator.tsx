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

export const StorageIndicator: React.FC = () => {
    const [stats, setStats] = useState<StorageStats>({
        itemCount: 0,
        totalBytes: 0,
        quotaBytes: null,
        percent: 0
    });
    const [isHovered, setIsHovered] = useState(false);

    const calculateUsage = async () => {
        try {
            // Get history items and estimate their size
            const history = await getHistory();

            let totalBytes = 0;
            for (const item of history) {
                // Estimate size: base64 string length ≈ bytes
                if (item.originalImage) totalBytes += item.originalImage.length;
                if (item.generatedImage) totalBytes += item.generatedImage.length;
                if (item.generatedImageThumb) totalBytes += item.generatedImageThumb.length;
                if (item.prompt) totalBytes += item.prompt.length * 2;
            }

            // Try to get quota using Storage API
            let quotaBytes: number | null = null;
            let percent = 0;

            if ('storage' in navigator && 'estimate' in navigator.storage) {
                const estimate = await navigator.storage.estimate();
                if (estimate.quota) {
                    quotaBytes = estimate.quota;
                    percent = estimate.usage ? (estimate.usage / estimate.quota) * 100 : 0;
                }
                // Use actual usage from Storage API if available (more accurate)
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

    useEffect(() => {
        calculateUsage();
        // Recalculate every 5 seconds
        const interval = setInterval(calculateUsage, 5000);
        return () => clearInterval(interval);
    }, []);

    const formatBytes = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
        return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
    };

    const getColor = (p: number) => {
        if (p > 90) return 'bg-red-500';
        if (p > 70) return 'bg-orange-500';
        return 'bg-emerald-500';
    };

    return (
        <div
            className="flex items-center gap-2 px-2 py-1 rounded bg-stone-800/50 hover:bg-stone-800 transition-colors cursor-help relative group"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="flex flex-col gap-0.5 w-24">
                <div className="flex justify-between text-[10px] text-stone-400 font-mono leading-none">
                    <span>STORAGE</span>
                    <span>{stats.percent > 0 ? `${stats.percent.toFixed(1)}%` : `${stats.itemCount}张`}</span>
                </div>
                <div className="h-1.5 w-full bg-stone-700 rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all duration-500 ease-out ${getColor(stats.percent)}`}
                        style={{ width: stats.percent > 0 ? `${Math.max(2, stats.percent)}%` : '100%' }}
                    />
                </div>
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
