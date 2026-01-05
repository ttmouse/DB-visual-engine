import React from 'react';

interface PanelHeaderProps {
    title: string;
    icon?: React.ReactNode;
    children?: React.ReactNode; // For actions or tabs
    className?: string;
}

export const PanelHeader: React.FC<PanelHeaderProps> = ({
    title,
    icon,
    children,
    className = ''
}) => {
    return (
        <div className={`h-12 min-h-[3rem] px-4 border-b border-stone-800 bg-stone-900 flex items-center justify-between gap-4 flex-shrink-0 select-none ${className}`}>
            <div className="flex items-center gap-2 text-stone-400">
                {icon && <span className="opacity-70">{icon}</span>}
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-300">{title}</h3>
            </div>
            <div className="flex items-center gap-2">
                {children}
            </div>
        </div>
    );
};
