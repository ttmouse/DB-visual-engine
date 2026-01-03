import React, { useEffect } from 'react';
import { Icons } from './Icons';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  removeToast: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 items-center pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onRemove: () => void }> = ({ toast, onRemove }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onRemove]);

  const styles = {
    success: 'bg-stone-900 text-white border-stone-800',
    error: 'bg-rose-500 text-white border-rose-600',
    info: 'bg-white text-stone-800 border-stone-200 shadow-xl'
  };

  const icons = {
    success: <Icons.CheckCircle2 size={16} className="text-emerald-400" />,
    error: <Icons.X size={16} className="text-white" />,
    info: <Icons.Sparkles size={16} className="text-orange-500" />
  };

  return (
    <div className={`
      pointer-events-auto
      flex items-center gap-3 px-6 py-3 rounded-full shadow-2xl border
      animate-in fade-in slide-in-from-bottom-5 duration-300
      ${styles[toast.type]}
    `}>
      {icons[toast.type]}
      <span className="text-sm font-medium tracking-wide">{toast.message}</span>
    </div>
  );
};