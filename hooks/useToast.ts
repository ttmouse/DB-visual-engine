/**
 * [INPUT]: 依赖 components/Toast types
 * [OUTPUT]: 导出 useToast hook
 * [POS]: Hooks 模块
 * [PROTOCOL]: 变更时更新此头部
 */

import { useState, useCallback } from 'react';
import { ToastMessage, ToastType } from '../components/Toast';

export interface UseToastReturn {
    toasts: ToastMessage[];
    showToast: (message: string, type?: ToastType, duration?: number) => void;
    removeToast: (id: string) => void;
}

export const useToast = (): UseToastReturn => {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const showToast = useCallback((message: string, type: ToastType = 'info', duration?: number) => {
        setToasts(prev => [...prev, {
            id: crypto.randomUUID(),
            type,
            message,
            duration
        }]);
    }, []);

    return { toasts, showToast, removeToast };
};
