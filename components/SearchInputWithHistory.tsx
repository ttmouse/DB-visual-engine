import React, { useState, useEffect, useRef } from 'react';
import { Icons } from './Icons';
import { useI18n } from '../hooks/useI18n';

interface SearchInputWithHistoryProps {
    value: string;
    onChange: (value: string) => void;
    onSearch: (value: string) => void;
    placeholder?: string;
    className?: string;
    inputClassName?: string;
    theme?: 'dark' | 'glass';
}

const HISTORY_KEY = 'unimage_search_history';
const MAX_HISTORY = 10;

export const SearchInputWithHistory: React.FC<SearchInputWithHistoryProps> = ({
    value,
    onChange,
    onSearch,
    placeholder,
    className = '',
    inputClassName = '',
    theme = 'dark'
}) => {
    const { t } = useI18n();
    const [history, setHistory] = useState<string[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Load history
    useEffect(() => {
        try {
            const saved = localStorage.getItem(HISTORY_KEY);
            if (saved) {
                setHistory(JSON.parse(saved));
            }
        } catch (e) {
            console.error('Failed to load search history', e);
        }
    }, []);

    // Save history
    const saveToHistory = (term: string) => {
        if (!term.trim()) return;
        const newHistory = [term, ...history.filter(h => h !== term)].slice(0, MAX_HISTORY);
        setHistory(newHistory);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
    };

    const handleSearch = () => {
        if (value.trim()) {
            saveToHistory(value.trim());
            onSearch(value);
            setShowHistory(false);
            inputRef.current?.blur();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        } else if (e.key === 'Escape') {
            setShowHistory(false);
            inputRef.current?.blur();
        }
    };

    const deleteHistoryItem = (e: React.MouseEvent, term: string) => {
        e.stopPropagation();
        const newHistory = history.filter(h => h !== term);
        setHistory(newHistory);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
    };

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowHistory(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const baseInputClass = theme === 'dark'
        ? "w-full pl-9 pr-8 py-1.5 bg-stone-900 border border-stone-800 rounded-lg text-xs text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/50 transition-colors"
        : "w-full pl-9 pr-8 py-1.5 bg-stone-800/80 hover:bg-stone-700 rounded-lg backdrop-blur-sm border border-stone-700/50 text-xs text-stone-200 placeholder:text-stone-500 focus:outline-none focus:border-amber-500/50 transition-all";

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            <div className="relative">
                <Icons.Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none" />
                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setShowHistory(true)}
                    placeholder={placeholder || t('gallery.search.placeholder')}
                    className={`${baseInputClass} ${inputClassName}`}
                />

                {value && (
                    <button
                        onClick={() => {
                            onChange('');
                            setShowHistory(true);
                            inputRef.current?.focus();
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 p-1 rounded-full hover:bg-stone-800"
                    >
                        <Icons.X size={12} />
                    </button>
                )}
            </div>

            {/* History Dropdown */}
            {showHistory && history.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-stone-800 rounded-lg shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
                        {history.map((term, index) => (
                            <div
                                key={`${term}-${index}`}
                                className="flex items-center justify-between px-3 py-2 text-xs text-stone-300 hover:bg-stone-800 rounded-md cursor-pointer group"
                                onClick={() => {
                                    onChange(term);
                                    saveToHistory(term);
                                    onSearch(term);
                                    setShowHistory(false);
                                }}
                            >
                                <div className="flex items-center gap-2 truncate">
                                    <Icons.History size={12} className="text-stone-500" />
                                    <span>{term}</span>
                                </div>
                                <button
                                    onClick={(e) => deleteHistoryItem(e, term)}
                                    className="p-1 text-stone-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Icons.X size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
