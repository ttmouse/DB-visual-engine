/**
 * [INPUT]: 依赖 Icons, PanelHeader, ChatMessage (Types)
 * [OUTPUT]: 渲染 ChatSidebar 组件 (右侧聊天记录抽屉)
 * [POS]: components/ChatSidebar, 右侧辅助面板, 用于显示历史对话
 * [PROTOCOL]: 变更时更新此头部, 然后检查 CLAUDE.md
 */

import React from 'react';
import { PanelHeader } from './PanelHeader';
import { Icons } from './Icons';
import { ChatMessage } from '../types';

interface ChatSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    messages: ChatMessage[];
    width: number;
    onResizeStart?: () => void;
    isResizing?: boolean;
    resizable?: boolean;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
    isOpen,
    onClose,
    messages,
    width,
    onResizeStart,
    isResizing,
    resizable = true
}) => {
    if (!isOpen) return null;

    return (
        <>
            {/* Draggable Divider for right panel (Only if resizable) */}
            {resizable && onResizeStart && (
                <div
                    onMouseDown={onResizeStart}
                    className={`w-2 flex-shrink-0 cursor-col-resize flex items-center justify-center group hover:bg-stone-700/50 transition-colors ${isResizing ? 'bg-orange-500/30' : ''}`}
                >
                    <div className={`w-0.5 h-12 rounded-full transition-colors ${isResizing ? 'bg-orange-500' : 'bg-stone-700 group-hover:bg-stone-500'}`} />
                </div>
            )}

            {/* Chat Column */}
            <div style={{ width: `${width}px` }} className="flex-shrink-0 flex flex-col h-full bg-stone-900 rounded-xl border border-stone-800 overflow-hidden shadow-sm">
                <PanelHeader title="AI 助手">
                    <button
                        onClick={onClose}
                        className="p-1.5 text-stone-500 hover:text-stone-300 transition-colors rounded-lg hover:bg-stone-800"
                        title="关闭"
                    >
                        <Icons.X size={14} />
                    </button>
                </PanelHeader>

                <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-stone-600 space-y-3">
                            <Icons.Sparkles size={32} strokeWidth={1} />
                            <p className="text-xs">暂无对话记录</p>
                        </div>
                    ) : (
                        messages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[90%] rounded-xl px-3 py-2 text-xs ${msg.role === 'user' ? 'bg-stone-700 text-white' : 'bg-stone-800 border border-stone-700 text-stone-200'}`}>
                                    {msg.content}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </>
    );
};
