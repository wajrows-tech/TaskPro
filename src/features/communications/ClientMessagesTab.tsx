import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Tag, Phone, Mail, MessageSquare, StickyNote, MoreVertical, X, Plus } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useUI } from '../../contexts/UIContext';
import { api } from '../../services/api.ts';
import type { Communication } from '../../types.ts';
import { Button } from '../../shared/Button';
import { Badge } from '../../shared/Badge';
import { cn, timeAgo } from '../../utils.ts';

interface ClientMessagesTabProps {
    contactId?: number;
    jobId?: number;
}

export function ClientMessagesTab({ contactId, jobId }: ClientMessagesTabProps) {
    const { addToast } = useUI();
    const [messages, setMessages] = useState<Communication[]>([]);
    const [loading, setLoading] = useState(true);
    const [text, setText] = useState('');
    const [channel, setChannel] = useState<'note' | 'email' | 'text' | 'call'>('note');
    const scrollRef = useRef<HTMLDivElement>(null);

    const [tagInput, setTagInput] = useState('');
    const [currentTags, setCurrentTags] = useState<string[]>([]);
    const [showTagEditor, setShowTagEditor] = useState(false);

    const fetchMessages = async () => {
        try {
            const allComms = await api.getCommunications();
            const filtered = allComms.filter(c =>
                (contactId && c.contactId === contactId) ||
                (jobId && c.jobId === jobId)
            ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

            setMessages(filtered);
        } catch (err: any) {
            console.error('Failed to fetch communications', err);
        } finally {
            setLoading(false);
            setTimeout(() => {
                if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }, 100);
        }
    };

    useEffect(() => {
        fetchMessages();
    }, [contactId, jobId]);

    const handleSend = async () => {
        if (!text.trim()) return;
        try {
            await api.createCommunication({
                jobId: jobId || null,
                contactId: contactId || null,
                channel,
                direction: 'outbound',
                body: text,
                subject: channel === 'email' ? 'Follow up' : '',
                tags: JSON.stringify(currentTags),
            });
            setText('');
            setCurrentTags([]);
            setShowTagEditor(false);
            await fetchMessages();
            addToast('Message posted', 'success');
        } catch (err: any) {
            addToast('Failed to post message', 'error');
        }
    };

    const handlePin = async (id: number, currentPin: boolean) => {
        try {
            await api.updateCommunication(id, { isPinned: !currentPin });
            fetchMessages();
            addToast(currentPin ? 'Unpinned' : 'Pinned to top', 'success');
        } catch { addToast('Action failed', 'error'); }
    };

    const addTag = () => {
        if (!tagInput.trim()) return;
        if (!currentTags.includes(tagInput.trim())) {
            setCurrentTags([...currentTags, tagInput.trim()]);
        }
        setTagInput('');
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading messages...</div>;

    const pinnedMessages = messages.filter(m => m.isPinned);
    const unpinnedMessages = messages.filter(m => !m.isPinned);

    const renderMessage = (msg: Communication) => {
        const isSystemOrNote = msg.channel === 'note';
        const isInbound = msg.direction === 'inbound';

        let Icon = StickyNote;
        if (msg.channel === 'email') Icon = Mail;
        if (msg.channel === 'call') Icon = Phone;
        if (msg.channel === 'text') Icon = MessageSquare;

        let parsedTags: string[] = [];
        let parsedAttachments: string[] = [];
        try { if (msg.tags && typeof msg.tags === 'string') parsedTags = JSON.parse(msg.tags); } catch { }
        try { if (msg.attachments && typeof msg.attachments === 'string') parsedAttachments = JSON.parse(msg.attachments); } catch { }

        return (
            <div key={msg.id} className={cn("flex flex-col group/msg max-w-[85%]",
                isSystemOrNote ? "mx-auto w-full max-w-[95%]" :
                    isInbound ? "self-start" : "self-end"
            )}>
                {!isSystemOrNote && (
                    <div className={cn("text-[10px] text-gray-500 mb-1 flex items-center gap-1.5", isInbound ? "ml-1" : "justify-end mr-1")}>
                        <Icon size={10} />
                        <span className="uppercase tracking-wider">{msg.channel}</span>
                        {msg.isPinned && <span className="text-amber-500 flex items-center gap-0.5"><StickyNote size={8} className="fill-current" /> PINNED</span>}
                        <span>•</span>
                        <span>{timeAgo(msg.createdAt)}</span>
                    </div>
                )}

                <div className={cn(
                    "p-3.5 rounded-2xl relative",
                    isSystemOrNote ? "bg-amber-500/10 border border-amber-500/20 rounded-xl" :
                        isInbound ? "bg-gray-800 border border-white/5 rounded-tl-none" : "bg-blue-600 text-white rounded-tr-none",
                    msg.isPinned && "ring-1 ring-amber-500/30"
                )}>
                    {/* Pin Action toggle */}
                    <button
                        onClick={() => handlePin(msg.id, !!msg.isPinned)}
                        className={cn(
                            "absolute top-2 right-2 p-1 rounded-full opacity-0 group-hover/msg:opacity-100 transition-opacity z-10",
                            msg.isPinned ? "text-amber-500 bg-amber-500/10 opacity-100" : "text-gray-500 hover:text-white hover:bg-white/10"
                        )}
                    >
                        <StickyNote size={14} className={msg.isPinned ? "fill-current" : ""} />
                    </button>

                    {isSystemOrNote && (
                        <div className="flex items-center gap-2 mb-2">
                            <Badge color="#F59E0B" size="sm"><StickyNote size={10} className="mr-1 inline" />Internal Note</Badge>
                            <span className="text-[10px] text-gray-500">{timeAgo(msg.createdAt)}</span>
                        </div>
                    )}

                    {msg.subject && !isSystemOrNote && (
                        <p className="font-bold text-sm mb-1">{msg.subject}</p>
                    )}

                    <div className={cn("text-sm whitespace-pre-wrap leading-relaxed", !isInbound && !isSystemOrNote && "text-blue-50")}>
                        {msg.body}
                    </div>

                    {/* Render Attachments */}
                    {parsedAttachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                            {parsedAttachments.map((att, i) => (
                                <div key={i} className="flex items-center gap-1.5 bg-black/20 px-2 py-1.5 rounded-lg border border-white/10 text-xs text-blue-200">
                                    <Paperclip size={12} />
                                    <span className="truncate max-w-[150px]">{att}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Render Tags */}
                    {parsedTags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                            {parsedTags.map((tag, i) => (
                                <Badge key={i} color="#636E72" size="sm" className="bg-black/30 border-none">{tag}</Badge>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-[600px] bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/20">
                <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-white">Communications Log</h3>
                    <Badge color="#4CD137" size="sm" className="px-2 py-0.5">{messages.length} messages</Badge>
                </div>
            </div>

            {/* Scrollable Messages Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {messages.length === 0 ? (
                    <div className="m-auto text-center text-gray-500 flex flex-col items-center">
                        <MessageSquare size={40} className="mb-3 opacity-20" />
                        <p>No communications yet.</p>
                        <p className="text-xs mt-1">Send an email, text, or add an internal note.</p>
                    </div>
                ) : (
                    <>
                        {pinnedMessages.length > 0 && (
                            <div className="flex flex-col gap-3 mb-4 pb-4 border-b border-white/5">
                                <div className="flex items-center gap-2 text-[10px] font-bold text-amber-500 uppercase tracking-widest pl-1">
                                    <StickyNote size={10} className="fill-current" /> Pinned Items
                                </div>
                                {pinnedMessages.map(renderMessage)}
                            </div>
                        )}
                        {unpinnedMessages.map(renderMessage)}
                    </>
                )}
            </div>

            {/* Composer Input Area */}
            <div className="flex flex-col border-t border-white/10 bg-black/20">
                {/* Active Tags Bar */}
                {currentTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 p-2 px-3 border-b border-white/5">
                        {currentTags.map(t => (
                            <Badge key={t} color="#3498db" size="sm" className="flex items-center gap-1 pr-1">
                                {t}
                                <button onClick={() => setCurrentTags(currentTags.filter(x => x !== t))} className="hover:text-white"><X size={10} /></button>
                            </Badge>
                        ))}
                    </div>
                )}

                <div className="p-3">
                    <div className="flex items-center gap-2 mb-2 px-1 text-xs font-semibold text-gray-400">
                        <button onClick={() => setChannel('note')} className={cn("px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors", channel === 'note' ? "bg-amber-500/20 text-amber-500" : "hover:bg-white/5")}><StickyNote size={12} /> Note</button>
                        <button onClick={() => setChannel('email')} className={cn("px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors", channel === 'email' ? "bg-blue-500/20 text-blue-400" : "hover:bg-white/5")}><Mail size={12} /> Email</button>
                        <button onClick={() => setChannel('text')} className={cn("px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors", channel === 'text' ? "bg-emerald-500/20 text-emerald-400" : "hover:bg-white/5")}><MessageSquare size={12} /> Text</button>
                        <button onClick={() => setChannel('call')} className={cn("px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors", channel === 'call' ? "bg-purple-500/20 text-purple-400" : "hover:bg-white/5")}><Phone size={12} /> Log Call</button>
                    </div>

                    <div className="relative flex items-end gap-2 bg-gray-900 border border-white/10 rounded-xl p-1 shadow-inner focus-within:border-blue-500/50 transition-colors">
                        <div className="flex flex-col gap-1 p-1">
                            <button className="p-1.5 text-gray-500 hover:text-white rounded-md hover:bg-white/5 transition-colors" title="Attach file"><Paperclip size={16} /></button>
                            <button
                                className={cn("p-1.5 rounded-md transition-colors", showTagEditor ? "bg-blue-500/20 text-blue-400" : "text-gray-500 hover:text-white hover:bg-white/5")}
                                title="Add tag"
                                onClick={() => setShowTagEditor(!showTagEditor)}
                            >
                                <Tag size={16} />
                            </button>
                        </div>

                        <div className="flex-1 flex flex-col pt-2 pb-1">
                            {showTagEditor && (
                                <div className="flex items-center gap-2 px-1 mb-2">
                                    <input
                                        type="text"
                                        placeholder="Add tag..."
                                        value={tagInput}
                                        onChange={e => setTagInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                                        className="bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none focus:border-blue-500/50"
                                        autoFocus
                                    />
                                    <button onClick={addTag} className="text-gray-400 hover:text-white"><Plus size={14} /></button>
                                </div>
                            )}
                            <textarea
                                value={text}
                                onChange={e => setText(e.target.value)}
                                placeholder={`Type a ${channel}...`}
                                className="bg-transparent border-none text-white text-sm resize-none focus:outline-none py-1 px-1 min-h-[44px] max-h-[200px]"
                                rows={text.split('\n').length > 1 ? Math.min(text.split('\n').length, 8) : 1}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                            />
                        </div>

                        <Button
                            variant="primary"
                            className="m-1 rouned-lg w-10 h-10 flex items-center justify-center p-0 shrink-0 shadow-lg shrink-0"
                            onClick={handleSend}
                        >
                            <Send size={16} className={text.trim() ? "translate-x-0.5" : "opacity-50"} />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
 
 
