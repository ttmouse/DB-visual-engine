import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Icons } from './Icons';
import { ChatMessage, SkillType } from './ChatPanel';

interface ChatDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    messages: ChatMessage[];
    onApplySuggestions: (messageId: string, indices: number[]) => void;
    onToggleSuggestion: (messageId: string, index: number) => void;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
    isOpen,
    onClose,
    messages,
    onApplySuggestions,
    onToggleSuggestion
}) => {
    const messagesEndRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Handle ESC key to close
    React.useEffect(() => {
        if (!isOpen) return;
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[150] bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="absolute right-0 top-0 bottom-0 w-[380px] bg-stone-900 shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col border-l border-stone-800"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 border-b border-stone-800 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-stone-800 rounded-xl">
                            <Icons.MessageSquare size={16} className="text-stone-400" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-stone-200">AI 助手</h2>
                            <p className="text-[10px] text-stone-500">对话历史 & 质检结果</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-stone-800 rounded-lg transition-colors"
                    >
                        <Icons.X size={18} className="text-stone-500" />
                    </button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-stone-600 space-y-3">
                            <Icons.Sparkles size={32} strokeWidth={1} />
                            <p className="text-sm">暂无对话记录</p>
                            <div className="text-xs text-stone-500 space-y-1 text-center">
                                <p>在下方输入框中输入指令</p>
                                <p className="italic">"帮我质检一下"</p>
                                <p className="italic">"把光影描述改得更具体"</p>
                            </div>
                        </div>
                    ) : (
                        messages.map((msg) => (
                            <ChatMessageBubble
                                key={msg.id}
                                message={msg}
                                onApply={onApplySuggestions}
                                onToggle={onToggleSuggestion}
                            />
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>
        </div>
    );
};

// Individual message bubble component
interface ChatMessageBubbleProps {
    message: ChatMessage;
    onApply: (messageId: string, indices: number[]) => void;
    onToggle: (messageId: string, index: number) => void;
}

const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({ message, onApply, onToggle }) => {
    const [isApplying, setIsApplying] = React.useState(false);
    const isUser = message.role === 'user';
    const isSkillResult = message.role === 'skill-result';

    const handleApply = async () => {
        setIsApplying(true);
        await onApply(message.id, message.selectedIndices!);
        setIsApplying(false);
    };

    // Skill result card
    if (isSkillResult && message.suggestions) {
        return (
            <div className="bg-stone-800 border border-stone-700 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-amber-900/30 rounded-lg">
                        <Icons.Wand2 size={14} className="text-amber-500" />
                    </div>
                    <span className="text-xs font-bold text-stone-400 uppercase">
                        {message.skillType === 'quality-check' ? '质检结果' :
                            message.skillType === 'refine' ? '修改建议' : '技能结果'}
                    </span>
                    {message.applied && (
                        <span className="text-[10px] px-2 py-0.5 bg-emerald-900/30 text-emerald-400 rounded-full font-bold">已应用</span>
                    )}
                </div>

                {message.content && (
                    <div className="text-sm text-stone-300 mb-3 prose prose-sm max-w-none prose-invert">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                )}

                <div className="space-y-2">
                    {message.suggestions.map((suggestion, idx) => (
                        <label
                            key={idx}
                            className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-all ${message.selectedIndices?.includes(idx)
                                ? 'bg-amber-900/20 border border-amber-800/50'
                                : 'bg-stone-900 hover:bg-stone-700 border border-transparent'
                                } ${message.applied ? 'opacity-60 cursor-default' : ''}`}
                        >
                            <input
                                type="checkbox"
                                checked={message.selectedIndices?.includes(idx) || false}
                                onChange={() => !message.applied && onToggle(message.id, idx)}
                                disabled={message.applied}
                                className="mt-0.5 accent-amber-500"
                            />
                            <span className="text-xs text-stone-400">{suggestion}</span>
                        </label>
                    ))}
                </div>

                {!message.applied && message.selectedIndices && message.selectedIndices.length > 0 && (
                    <button
                        onClick={handleApply}
                        disabled={isApplying}
                        className="mt-3 w-full py-2 bg-stone-700 text-white rounded-xl text-xs font-bold hover:bg-stone-600 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                        {isApplying ? (
                            <>
                                <Icons.RefreshCw size={12} className="animate-spin" />
                                正在应用...
                            </>
                        ) : (
                            '应用所选修改'
                        )}
                    </button>
                )}
            </div>
        );
    }

    // Regular message
    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${isUser
                    ? 'bg-stone-700 text-white'
                    : 'bg-stone-800 border border-stone-700 text-stone-200'
                    }`}
            >
                {message.isStreaming ? (
                    <div className="flex items-center gap-2 text-sm">
                        <Icons.RefreshCw size={12} className="animate-spin" />
                        <span>思考中...</span>
                    </div>
                ) : (
                    <div className={`text-sm prose prose-sm max-w-none ${isUser ? 'prose-invert' : 'prose-invert'}`}>
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                )}
            </div>
        </div>
    );
};
