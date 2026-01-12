import React, { useState, useRef, useEffect } from 'react';
import { Icons } from './Icons';
import { useI18n } from '../hooks/useI18n';
import { useSoundEffects } from '../hooks/useSoundEffects';

interface SettingsMenuProps {
    onOpenHelp: () => void;
    showToast: (message: string) => void;
    hasKey: boolean;
    onSelectKey: () => void;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({ onOpenHelp, showToast, hasKey, onSelectKey }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const { language, setLanguage, t } = useI18n();
    const { soundEnabled, toggleSound } = useSoundEffects();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLanguageSwitch = () => {
        const newLang = language === 'CN' ? 'EN' : 'CN';
        setLanguage(newLang);
        setIsOpen(false);
    };

    const handleSoundToggle = () => {
        const newState = toggleSound();
        showToast(newState ? t('nav.sound.enabled') : t('nav.sound.disabled'));
    };

    const handleHelp = () => {
        onOpenHelp();
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`p-2.5 rounded-full hover:bg-stone-800 transition-all ${isOpen ? 'text-stone-200 bg-stone-800' : 'text-stone-400 hover:text-stone-200'}`}
                title={t('settings.title') || "Settings"}
            >
                <Icons.Settings size={20} />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-stone-900 border border-stone-800 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="py-1">
                        <button
                            onClick={handleLanguageSwitch}
                            className="w-full px-4 py-2.5 text-left text-sm text-stone-300 hover:bg-stone-800 flex items-center justify-between group"
                        >
                            <div className="flex items-center gap-2">
                                <Icons.Languages size={16} className="text-stone-500 group-hover:text-stone-300" />
                                <span>{language === 'CN' ? 'English' : '简体中文'}</span>
                            </div>
                            <span className="text-[10px] font-bold bg-stone-800 px-1.5 py-0.5 rounded text-stone-500 border border-stone-700">
                                {language}
                            </span>
                        </button>

                        <button
                            onClick={handleSoundToggle}
                            className="w-full px-4 py-2.5 text-left text-sm text-stone-300 hover:bg-stone-800 flex items-center justify-between group"
                        >
                            <div className="flex items-center gap-2">
                                {soundEnabled ? (
                                    <Icons.Volume2 size={16} className="text-stone-500 group-hover:text-stone-300" />
                                ) : (
                                    <Icons.VolumeX size={16} className="text-stone-500 group-hover:text-stone-300" />
                                )}
                                <span>{t('nav.sound.title') || "Sound Effects"}</span>
                            </div>
                            <div className={`w-8 h-4 rounded-full relative transition-colors ${soundEnabled ? 'bg-orange-500' : 'bg-stone-700'}`}>
                                <div className={`absolute top-0.5 bottom-0.5 w-3 h-3 rounded-full bg-white transition-transform ${soundEnabled ? 'left-4.5 translate-x-0.5' : 'left-0.5'}`} />
                            </div>
                        </button>

                        <div className="h-px bg-stone-800 my-1" />

                        <button
                            onClick={handleHelp}
                            className="w-full px-4 py-2.5 text-left text-sm text-stone-300 hover:bg-stone-800 flex items-center gap-2 group"
                        >
                            <Icons.Help size={16} className="text-stone-500 group-hover:text-stone-300" />
                            <span>{t('nav.help') || "Help & Docs"}</span>
                        </button>

                        <div className="h-px bg-stone-800 my-1" />

                        <button
                            onClick={() => {
                                onSelectKey();
                                setIsOpen(false);
                            }}
                            className="w-full px-4 py-2.5 text-left text-sm text-stone-300 hover:bg-stone-800 flex items-center justify-between group"
                        >
                            <div className="flex items-center gap-2">
                                <Icons.Key size={16} className={`group-hover:text-stone-300 ${hasKey ? 'text-emerald-500' : 'text-stone-500'}`} />
                                <span>{t('api.keyStatus') || "API Key"}</span>
                            </div>
                            {hasKey && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
