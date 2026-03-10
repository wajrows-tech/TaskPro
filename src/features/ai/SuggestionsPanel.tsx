import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, AlertTriangle, Info, ClipboardList, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api.ts';
import { useUI, type Page } from '../../contexts/UIContext';
import { Card } from '../../shared/Card';
import { Button } from '../../shared/Button';
import { cn } from '../../utils.ts';

interface Suggestion {
    id: string;
    type: 'warning' | 'info' | 'task' | 'success';
    title: string;
    body: string;
    action?: { label: string; navigate: string; params?: any };
}

export function SuggestionsPanel() {
    const { navigate } = useUI();
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [loading, setLoading] = useState(true);

    const loadSuggestions = async () => {
        try {
            const data = await api.getAiSuggestions();
            setSuggestions(data);
        } catch (err) {
            console.error('Failed to load suggestions', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSuggestions();
    }, []);

    const getTypeStyles = (type: string) => {
        switch (type) {
            case 'warning': return { icon: <AlertTriangle size={16} />, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' };
            case 'task': return { icon: <ClipboardList size={16} />, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' };
            case 'success': return { icon: <CheckCircle2 size={16} />, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
            default: return { icon: <Info size={16} />, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' };
        }
    };

    if (loading) return null;
    if (suggestions.length === 0) return null;

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 px-1">
                <Sparkles size={18} className="text-blue-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-widest">Proactive Insights</h3>
                <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-bold">AI POWERED</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {suggestions.map(s => {
                    const style = getTypeStyles(s.type);
                    return (
                        <Card key={s.id} className={cn("relative overflow-hidden group border-none", style.bg)}>
                            <div className={cn("absolute inset-0 border-l-4", style.border)} style={{ borderColor: 'currentColor' }} />

                            <div className="flex flex-col h-full">
                                <div className="flex items-start justify-between mb-2">
                                    <div className={cn("flex items-center gap-2 font-bold text-xs uppercase tracking-wider", style.color)}>
                                        {style.icon} {s.title}
                                    </div>
                                </div>

                                <p className="text-sm text-gray-300 leading-relaxed flex-1">
                                    {s.body}
                                </p>

                                {s.action && (
                                    <button
                                        onClick={() => navigate(s.action!.navigate as Page, s.action!.params)}
                                        className="mt-4 flex items-center gap-2 text-xs font-bold text-white group-hover:text-blue-400 transition-colors"
                                    >
                                        {s.action.label} <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                    </button>
                                )}
                            </div>

                            {/* Decorative background element */}
                            <div className="absolute -bottom-4 -right-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                                {React.cloneElement(style.icon as React.ReactElement<any>, { size: 80 })}
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
 
