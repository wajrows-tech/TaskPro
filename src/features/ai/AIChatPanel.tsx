// ── AI Chat Panel ───────────────────────────────────────────────────────────
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Plus, Trash2, MessageSquare } from 'lucide-react';
import { api } from '../../services/api.ts';
import { useUI } from '../../contexts/UIContext';
import { Card } from '../../shared/Card';
import { Button } from '../../shared/Button';
import { cn } from '../../utils.ts';

interface Message {
    id: number;
    role: 'user' | 'assistant';
    content: string;
    createdAt: string;
}

interface Thread {
    id: number;
    title: string;
    updatedAt: string;
}

export function AIChatPanel() {
    const { addToast } = useUI();
    const [threads, setThreads] = useState<Thread[]>([]);
    const [activeThread, setActiveThread] = useState<number | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEnd = useRef<HTMLDivElement>(null);

    // Load threads on mount
    useEffect(() => {
        api.getAiThreads().then(t => {
            setThreads(t);
            if (t.length > 0) { setActiveThread(t[0].id); loadMessages(t[0].id); }
        });
    }, []);

    const loadMessages = async (threadId: number) => {
        try {
            const msgs = await api.getAiMessages(threadId);
            setMessages(msgs);
            setActiveThread(threadId);
        } catch { /* ignore */ }
    };

    const scrollToBottom = () => {
        setTimeout(() => messagesEnd.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    };

    const handleSend = async () => {
        if (!input.trim() || loading) return;
        const msg = input.trim();
        setInput('');

        let threadId = activeThread;
        if (!threadId) {
            const newThread = await api.createAiThread(msg.slice(0, 50));
            setThreads(prev => [newThread, ...prev]);
            threadId = newThread.id;
            setActiveThread(threadId);
        }

        // Add user message optimistically
        const userMsg: Message = { id: Date.now(), role: 'user', content: msg, createdAt: new Date().toISOString() };
        setMessages(prev => [...prev, userMsg]);
        scrollToBottom();
        await api.saveAiMessage({ role: 'user', content: msg, threadId });

        setLoading(true);
        try {
            const res = await fetch('/api/ai-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: msg, threadId }),
            });
            const data = await res.json();
            const assistantMsg: Message = { id: Date.now() + 1, role: 'assistant', content: data.response || data.error || 'No response', createdAt: new Date().toISOString() };
            setMessages(prev => [...prev, assistantMsg]);
            await api.saveAiMessage({ role: 'assistant', content: assistantMsg.content, threadId });
        } catch (err) {
            setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: 'Failed to get AI response. Check your API key.', createdAt: new Date().toISOString() }]);
        }
        setLoading(false);
        scrollToBottom();
    };

    const handleNewThread = async () => {
        const t = await api.createAiThread('New Chat');
        setThreads(prev => [t, ...prev]);
        setActiveThread(t.id);
        setMessages([]);
    };

    const handleDeleteThread = async (id: number) => {
        await api.deleteAiThread(id);
        setThreads(prev => prev.filter(t => t.id !== id));
        if (activeThread === id) { setActiveThread(null); setMessages([]); }
    };

    return (
        <div className="flex h-full">
            {/* Thread list */}
            <div className="w-[240px] border-r border-white/5 flex flex-col shrink-0">
                <div className="p-3 border-b border-white/5">
                    <Button variant="secondary" size="sm" icon={<Plus size={14} />} onClick={handleNewThread} className="w-full">
                        New Chat
                    </Button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
                    {threads.map(t => (
                        <div
                            key={t.id}
                            className={cn(
                                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors group',
                                activeThread === t.id ? 'bg-blue-600/20 text-blue-400' : 'text-gray-400 hover:bg-white/5'
                            )}
                            onClick={() => loadMessages(t.id)}
                        >
                            <MessageSquare size={14} className="shrink-0" />
                            <span className="truncate flex-1">{t.title}</span>
                            <button
                                onClick={e => { e.stopPropagation(); handleDeleteThread(t.id); }}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 cursor-pointer"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Chat area */}
            <div className="flex-1 flex flex-col">
                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
                    {messages.length === 0 && (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-4">
                                    <Bot size={28} className="text-blue-400" />
                                </div>
                                <div className="flex items-center justify-between">
                                    <p className="text-lg font-medium text-gray-300">TaskPro AI</p>
                                    <Bot className="w-5 h-5 text-gray-500" />
                                </div>
                                <p className="text-sm text-gray-500 mt-1">Ask me anything about your jobs, tasks, or contacts</p>
                            </div>
                        </div>
                    )}
                    {messages.map(msg => (
                        <div key={msg.id} className={cn('flex gap-3', msg.role === 'user' && 'flex-row-reverse')}>
                            <div className={cn(
                                'w-8 h-8 rounded-xl flex items-center justify-center shrink-0',
                                msg.role === 'user' ? 'bg-blue-600/20' : 'bg-purple-600/20'
                            )}>
                                {msg.role === 'user' ? <User size={14} className="text-blue-400" /> : <Bot size={14} className="text-purple-400" />}
                            </div>
                            <div className={cn(
                                'max-w-[70%] rounded-2xl px-4 py-3 text-sm',
                                msg.role === 'user' ? 'bg-blue-600/20 text-white' : 'bg-white/5 text-gray-300'
                            )}>
                                <p className="whitespace-pre-wrap">{msg.content}</p>
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-xl bg-purple-600/20 flex items-center justify-center">
                                <Loader2 size={14} className="text-purple-400 animate-spin" />
                            </div>
                            <div className="bg-white/5 rounded-2xl px-4 py-3">
                                <div className="flex gap-1">
                                    <span className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <span className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <span className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEnd} />
                </div>

                {/* Input */}
                <div className="p-4 border-t border-white/5">
                    <form onSubmit={e => { e.preventDefault(); handleSend(); }} className="flex gap-2">
                        <input
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            placeholder="Ask anything..."
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500/50"
                        />
                        <Button type="submit" disabled={loading || !input.trim()} icon={<Send size={16} />}>Send</Button>
                    </form>
                </div>
            </div>
        </div>
    );
}
 
 
