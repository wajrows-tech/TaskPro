import React, { useState, useEffect } from 'react';
import { MessageCircle, Mail, Phone, Plus, MessageSquare } from 'lucide-react';
import { cn, timeAgo } from '../../utils.ts';

export function ThreadedInbox() {
    const [threads, setThreads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadThreads();
    }, []);

    const loadThreads = async () => {
        try {
            const token = localStorage.getItem('taskpro_token');
            const res = await fetch('/api/threads', { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) setThreads(await res.json());
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500 animate-pulse">Loading threads...</div>;

    if (threads.length === 0) return (
        <div className="p-12 text-center bg-gray-900 border border-gray-800 rounded-xl">
            <MessageSquare className="w-8 h-8 mx-auto text-gray-600 mb-3" />
            <h3 className="text-white font-medium">No communication threads</h3>
            <p className="text-gray-500 text-sm mt-1">Start a new conversation to see it here.</p>
        </div>
    );

    return (
        <div className="space-y-4">
            {threads.map(thread => (
                <div key={thread.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-colors">
                    <div className="p-4 border-b border-gray-800/50 flex justify-between items-center bg-gray-900/50">
                        <div>
                            <h3 className="text-white font-medium text-lg flex items-center gap-2">
                                <MessageCircle className="w-4 h-4 text-blue-400" />
                                {thread.title}
                            </h3>
                            <div className="flex gap-3 text-xs text-gray-500 mt-1">
                                <span>Updated {timeAgo(thread.updatedAt)}</span>
                                {thread.status === 'open' ? (
                                    <span className="text-emerald-400">● Open</span>
                                ) : (
                                    <span className="text-gray-500">● Closed</span>
                                )}
                            </div>
                        </div>
                        <button className="text-sm bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg text-white transition-colors">
                            Reply
                        </button>
                    </div>
                    <div className="bg-gray-950 p-4 space-y-3">
                        {thread.messages && thread.messages.map((msg: any) => (
                            <div key={msg.id} className={cn("flex gap-3 max-w-[85%]", msg.direction === 'outbound' ? "ml-auto flex-row-reverse" : "")}>
                                <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center shrink-0">
                                    {msg.channel === 'email' ? <Mail size={14} className="text-blue-400" /> : <Phone size={14} className="text-emerald-400" />}
                                </div>
                                <div className={cn("p-3 rounded-2xl text-sm", msg.direction === 'outbound' ? "bg-blue-600 text-white rounded-tr-sm" : "bg-gray-800 text-gray-200 rounded-tl-sm")}>
                                    {msg.subject && <div className="font-semibold mb-1 text-xs opacity-80">{msg.subject}</div>}
                                    <p>{msg.body}</p>
                                    <div className="text-[10px] mt-2 opacity-60 text-right">{timeAgo(msg.createdAt)}</div>
                                </div>
                            </div>
                        ))}
                        {(!thread.messages || thread.messages.length === 0) && (
                            <div className="text-center text-xs text-gray-600 italic">No messages in this thread yet.</div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
