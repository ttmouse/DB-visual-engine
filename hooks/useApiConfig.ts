/**
 * [INPUT]: 依赖 services/geminiService
 * [OUTPUT]: 导出 useApiConfig hook
 * [POS]: Hooks 模块
 * [PROTOCOL]: 变更时更新此头部
 */

import { useState, useEffect, useCallback } from 'react';
import { configureClient, getModeDefaultModels } from '../services/geminiService';

export const useApiConfig = () => {
    const [apiMode, setApiModeState] = useState<'official' | 'custom' | 'volcengine'>('custom');
    const [activeModelName, setActiveModelName] = useState('Gemini 3.0 Flash');
    const [hasKey, setHasKey] = useState(false);

    // Helper to update state and side effects
    const setApiMode = useCallback((mode: 'official' | 'custom' | 'volcengine') => {
        setApiModeState(mode);
        localStorage.setItem('unimage_api_mode', mode);

        // Update active model name based on mode defaults or stored values
        const modeDefaults = getModeDefaultModels(mode);
        if (mode === 'volcengine') {
            const storedVision = localStorage.getItem('unimage_model_vision') || 'seed-1-6-250915';
            setActiveModelName(storedVision);
        } else {
            let f = localStorage.getItem('unimage_model_fast');
            if (!f || f.includes('seed')) {
                f = modeDefaults.fast;
            }
            setActiveModelName(f || modeDefaults.fast);
        }

        // Update Key Status
        let storedKey = '';
        if (mode === 'official') storedKey = localStorage.getItem('unimage_api_key_official') || localStorage.getItem('unimage_api_key') || '';
        else if (mode === 'volcengine') storedKey = localStorage.getItem('unimage_api_key_volcengine') || '';
        else storedKey = localStorage.getItem('unimage_api_key_custom') || localStorage.getItem('unimage_api_key') || '';

        setHasKey(!!storedKey && storedKey.length > 5);

        // Configure Client
        const baseUrl = localStorage.getItem('unimage_base_url') || '';
        if (storedKey) {
            configureClient(storedKey, baseUrl, mode);
        }
    }, []);

    // Initialize API Configuration
    useEffect(() => {
        // Load API Mode
        const storedMode = (localStorage.getItem('unimage_api_mode') || 'custom') as 'official' | 'custom' | 'volcengine';

        // We can call setApiMode(storedMode) to trigger all side effects (configureClient etc.)
        // But we need to be careful about initial render timing. 
        // App.tsx logic ran this on mount.
        setApiMode(storedMode);

        // Environment variable check (might override key status)
        const envKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
        if (envKey && envKey.length > 10) {
            setHasKey(true);
        }
    }, [setApiMode]);

    const switchApiMode = useCallback(() => {
        const modes: ('official' | 'custom' | 'volcengine')[] = ['official', 'custom', 'volcengine'];
        const nextMode = modes[(modes.indexOf(apiMode) + 1) % modes.length];
        setApiMode(nextMode); // Use the side-effect setter
        return nextMode;
    }, [apiMode, setApiMode]);

    return {
        apiMode,
        setApiMode, // Expose the side-effect setter
        activeModelName,
        setActiveModelName,
        hasKey,
        setHasKey,
        switchApiMode
    };
};
