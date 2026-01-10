import React, { useEffect, useRef } from 'react';
import { Icons } from './Icons';

interface DeleteConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const confirmButtonRef = useRef<HTMLButtonElement>(null);

    // Auto-focus on Confirm button when opened
    useEffect(() => {
        if (isOpen) {
            // Small timeout to ensure DOM is ready and transition started
            const timer = setTimeout(() => {
                confirmButtonRef.current?.focus();
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // Handle Escape key
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-stone-900 rounded-xl shadow-2xl w-full max-w-sm border border-stone-800 p-6 space-y-6 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <div className="flex flex-col items-center gap-4 text-center">
                    <div className="w-12 h-12 rounded-full bg-rose-900/30 flex items-center justify-center text-rose-500 ring-1 ring-rose-500/30">
                        <Icons.Trash2 size={24} />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-lg font-bold text-stone-200">确认删除？</h3>
                        <p className="text-xs text-stone-500 leading-relaxed">此操作将永久删除该图片及其生成记录，无法撤销。</p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg text-xs font-bold transition-all border border-stone-700 hover:border-stone-600"
                    >
                        取消
                    </button>
                    <button
                        ref={confirmButtonRef}
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-rose-900/20 ring-1 ring-rose-500/50 outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-2 focus:ring-offset-stone-900"
                    >
                        确认删除
                    </button>
                </div>
            </div>
        </div>
    );
};
