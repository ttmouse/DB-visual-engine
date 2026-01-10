/**
 * [INPUT]: 依赖 services/geminiService
 * [OUTPUT]: 导出 useApiConfig hook
 * [POS]: Hooks 模块
 * [PROTOCOL]: 变更时更新此头部
 */

import { useState, useEffect, useCallback } from 'react';
import { configureClient, getModeDefaultModels, configureModels } from '../services/geminiService';

export const useApiConfig = () => {
    const [apiMode, setApiModeState] = useState<'official' | 'custom' | 'volcengine' | 'volcengine-cn'>('custom');
    const [activeModelName, setActiveModelName] = useState('Gemini 3.0 Flash');
    const [hasKey, setHasKey] = useState(false);

    // Helper to update state and side effects
    const setApiMode = useCallback((mode: 'official' | 'custom' | 'volcengine' | 'volcengine-cn') => {
        setApiModeState(mode);
        localStorage.setItem('unimage_api_mode', mode);

        // Update active model name based on mode defaults or stored values
        const modeDefaults = getModeDefaultModels(mode);

        // CRITICAL FIX: Also update the global modelConfig in geminiService
        // Otherwise useImageGeneration will use the stale model ID (e.g. seedream) with the new client
        const storedModels = {
            reasoning: localStorage.getItem(`unimage_model_reasoning_${mode}`) || localStorage.getItem('unimage_model_reasoning') || modeDefaults.reasoning,
            fast: localStorage.getItem(`unimage_model_fast_${mode}`) || localStorage.getItem('unimage_model_fast') || modeDefaults.fast,
            image: localStorage.getItem(`unimage_model_image_${mode}`) || localStorage.getItem('unimage_model_image') || modeDefaults.image
        };

        // Sanitize logic: If we are in Volcengine, force Volcengine defaults if stored is Google
        if (mode === 'volcengine' || mode === 'volcengine-cn') {
            if (storedModels.image?.includes('gemini') || storedModels.image?.includes('imagen')) {
                storedModels.image = modeDefaults.image;
            }
            // For UI display
            const storedVision = localStorage.getItem('unimage_model_vision') || 'seed-1-6-250915';
            setActiveModelName(storedVision);
        } else {
            // If in Google/Custom, ensure we don't use Seedream
            if (storedModels.image?.includes('seedream') || storedModels.image?.includes('seededit')) {
                storedModels.image = modeDefaults.image;
            }
            if (storedModels.fast?.includes('seed')) {
                storedModels.fast = modeDefaults.fast;
            }
            setActiveModelName(storedModels.fast || modeDefaults.fast);
        }

        // Apply to backend service
        configureModels(storedModels);

        // Update Key Status
        let storedKey = '';
        if (mode === 'official') storedKey = localStorage.getItem('unimage_api_key_official') || localStorage.getItem('unimage_api_key') || '';
        else if (mode === 'volcengine') storedKey = localStorage.getItem('unimage_api_key_volcengine') || '';
        else if (mode === 'volcengine-cn') storedKey = localStorage.getItem('unimage_api_key_volcengine_cn') || '';
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
        const storedMode = (localStorage.getItem('unimage_api_mode') || 'custom') as 'official' | 'custom' | 'volcengine' | 'volcengine-cn';

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
        const modes: ('official' | 'custom' | 'volcengine' | 'volcengine-cn')[] = ['official', 'custom', 'volcengine', 'volcengine-cn'];
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
