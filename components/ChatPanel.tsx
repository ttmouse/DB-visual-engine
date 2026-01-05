import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Icons } from './Icons';

// Skill types that AI can invoke
export type SkillType = 'quality-check' | 'reverse' | 'translate' | 'refine' | 'generate';

// Chat message structure
export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'skill-result';
    content: string;
    timestamp: number;
    isStreaming?: boolean;
    // Skill result specific
    skillType?: SkillType;
    suggestions?: string[];
    selectedIndices?: number[];
    applied?: boolean;
}

interface ChatPanelProps {
    messages: ChatMessage[];
    onSendMessage: (message: string) => void;
    onApplySuggestions: (messageId: string, indices: number[]) => void;
    onToggleSuggestion: (messageId: string, index: number) => void;
    isProcessing: boolean;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
    messages,
    onSendMessage,
    onApplySuggestions,
    onToggleSuggestion,
    isProcessing
}) => {
    const [input, setInput] = React.useState('');
    const messagesEndRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = () => {
        if (!input.trim() || isProcessing) return;
        onSendMessage(input.trim());
        setInput('');
    };

    return (
        <div className="flex flex-col h-full bg-stone-900">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-stone-600 space-y-3">
                        <Icons.Sparkles size={32} strokeWidth={1} />
                        <p className="text-sm">开始对话来优化你的提示词</p>
                        <div className="text-xs text-stone-500 space-y-1 text-center">
                            <p>试试说：</p>
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

            {/* Input Area */}
            <div className="p-4 border-t border-stone-800 bg-stone-900">
                {/* Quick Actions */}
                <div className="flex items-center gap-2 mb-3 pb-3 border-b border-stone-800">
                    <span className="text-[9px] font-bold text-stone-500 uppercase">快捷技能</span>
                    <button
                        onClick={() => onSendMessage('帮我质检一下')}
                        disabled={isProcessing}
                        className="px-2.5 py-1 bg-rose-900/20 text-rose-400 rounded-lg text-[10px] font-bold hover:bg-rose-900/40 transition-all disabled:opacity-40"
                    >
                        <Icons.ScanEye size={10} className="inline mr-1" />质检
                    </button>
                    <button
                        onClick={() => onSendMessage('生成图片')}
                        disabled={isProcessing}
                        className="px-2.5 py-1 bg-emerald-900/20 text-emerald-400 rounded-lg text-[10px] font-bold hover:bg-emerald-900/40 transition-all disabled:opacity-40"
                    >
                        <Icons.Play size={10} className="inline mr-1" />生成
                    </button>
                </div>
                <div className="flex items-center gap-2 bg-stone-800 rounded-xl p-2 border border-stone-700">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                        placeholder="输入消息或指令..."
                        className="flex-1 bg-transparent border-none text-sm outline-none text-stone-200 placeholder:text-stone-500"
                        disabled={isProcessing}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isProcessing}
                        className="p-2 bg-stone-700 text-white rounded-lg disabled:opacity-40 transition-all hover:bg-stone-600"
                    >
                        {isProcessing ? (
                            <Icons.RefreshCw size={16} className="animate-spin" />
                        ) : (
                            <Icons.ChevronRight size={16} />
                        )}
                    </button>
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
