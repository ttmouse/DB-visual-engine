/**
 * [INPUT]: 依赖 services/geminiService
 * [OUTPUT]: 导出 useApiConfig hook
 * [POS]: Hooks 模块
 * [PROTOCOL]: 变更时更新此头部
 */

import { useState, useEffect, useCallback } from 'react';
import { configureClient, getModeDefaultModels, configureModels } from '../services/geminiService';

type ApiMode = 'official' | 'custom' | 'volcengine' | 'volcengine-cn';

const API_MODES: ApiMode[] = ['official', 'custom', 'volcengine', 'volcengine-cn'];

/** Gets the stored API key for a specific mode */
function getStoredKey(mode: ApiMode): string {
    switch (mode) {
        case 'official':
            return localStorage.getItem('unimage_api_key_official') || localStorage.getItem('unimage_api_key') || '';
        case 'volcengine':
            return localStorage.getItem('unimage_api_key_volcengine') || '';
        case 'volcengine-cn':
            return localStorage.getItem('unimage_api_key_volcengine_cn') || '';
        default:
            return localStorage.getItem('unimage_api_key_custom') || localStorage.getItem('unimage_api_key') || '';
    }
}

/** Gets stored model configuration for a mode, with sanitization */
function getStoredModels(mode: ApiMode): { reasoning: string; fast: string; image: string } {
    const defaults = getModeDefaultModels(mode);
    const isVolcengine = mode === 'volcengine' || mode === 'volcengine-cn';

    const models = {
        reasoning: localStorage.getItem(`unimage_model_reasoning_${mode}`) || localStorage.getItem('unimage_model_reasoning') || defaults.reasoning,
        fast: localStorage.getItem(`unimage_model_fast_${mode}`) || localStorage.getItem('unimage_model_fast') || defaults.fast,
        image: localStorage.getItem(`unimage_model_image_${mode}`) || localStorage.getItem('unimage_model_image') || defaults.image
    };

    // Sanitize: Ensure models match the current mode
    if (isVolcengine) {
        if (models.image?.includes('gemini') || models.image?.includes('imagen')) {
            models.image = defaults.image;
        }
    } else {
        if (models.image?.includes('seedream') || models.image?.includes('seededit')) {
            models.image = defaults.image;
        }
        if (models.fast?.includes('seed')) {
            models.fast = defaults.fast;
        }
    }

    return models;
}

export function useApiConfig() {
    const [apiMode, setApiModeState] = useState<ApiMode>('custom');
    const [activeModelName, setActiveModelName] = useState('Gemini 3.0 Flash');
    const [hasKey, setHasKey] = useState(false);

    const setApiMode = useCallback((mode: ApiMode) => {
        setApiModeState(mode);
        localStorage.setItem('unimage_api_mode', mode);

        const storedModels = getStoredModels(mode);
        configureModels(storedModels);

        // Update display model name
        const isVolcengine = mode === 'volcengine' || mode === 'volcengine-cn';
        if (isVolcengine) {
            setActiveModelName(localStorage.getItem('unimage_model_vision') || 'seed-1-6-250915');
        } else {
            setActiveModelName(storedModels.fast || getModeDefaultModels(mode).fast);
        }

        // Update key status and configure client
        const storedKey = getStoredKey(mode);
        setHasKey(storedKey.length > 5);

        if (storedKey) {
            const baseUrl = localStorage.getItem('unimage_base_url') || '';
            configureClient(storedKey, baseUrl, mode);
        }
    }, []);

    useEffect(() => {
        const storedMode = (localStorage.getItem('unimage_api_mode') || 'custom') as ApiMode;
        setApiMode(storedMode);

        // Check for environment variable override
        const envKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
        if (envKey && envKey.length > 10) {
            setHasKey(true);
        }
    }, [setApiMode]);

    const switchApiMode = useCallback(() => {
        const nextMode = API_MODES[(API_MODES.indexOf(apiMode) + 1) % API_MODES.length];
        setApiMode(nextMode);
        return nextMode;
    }, [apiMode, setApiMode]);

    return {
        apiMode,
        setApiMode,
        activeModelName,
        setActiveModelName,
        hasKey,
        setHasKey,
        switchApiMode
    };
}
