/**
 * [INPUT]: 依赖 services/soundService
 * [OUTPUT]: 导出 useSoundEffects hook
 * [POS]: Hooks 模块
 * [PROTOCOL]: 变更时更新此头部
 */

import { useState, useCallback } from 'react';
import { soundService } from '../services/soundService';

export const useSoundEffects = () => {
    const [soundEnabled, setSoundEnabled] = useState(soundService.isEnabled());

    const toggleSound = useCallback(() => {
        const currentState = soundService.isEnabled();
        const newState = !currentState;
        soundService.setEnabled(newState);
        setSoundEnabled(newState);
        return newState;
    }, []);

    return {
        soundEnabled,
        toggleSound,
        // Expose methods directly for convenience
        playStart: () => soundService.playStart(),
        playComplete: () => soundService.playComplete(),
        playError: () => soundService.playError(),
        playStepComplete: () => soundService.playStepComplete(),
        soundService
    };
};
