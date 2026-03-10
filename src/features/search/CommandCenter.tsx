import React, { useState, useEffect, useRef } from 'react';
import { Search, Briefcase, Users, CheckSquare, MessageSquare, X } from 'lucide-react';
import { api, SearchResults } from '../../services/api.ts';
import { useUI } from '../../contexts/UIContext';
import { cn } from '../../utils.ts';

export function CommandCenter() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResults>({ jobs: [], contacts: [], tasks: [], communications: [] });
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const { navigate } = useUI();

    // Toggle with Cmd+K or Ctrl+K
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        if (isOpen) {
            inputRef.current?.focus();
            setQuery('');
            setResults({ jobs: [], contacts: [], tasks: [], communications: [] });
            setSelectedIndex(0);
        }
    }, [isOpen]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.trim().length >= 2) {
                setLoading(true);
                try {
                    const res = await api.search(query);
                    setResults(res);
                } catch (e) {
                    console.error('Search failed', e);
                } finally {
                    setLoading(false);
                }
            } else {
                setResults({ jobs: [], contacts: [], tasks: [], communications: [] });
            }
            setSelectedIndex(0);
        }, 250);

        return () => clearTimeout(timer);
    }, [query]);

    // Flatten results for keyboard navigation
    const flatResults = [
        ...results.jobs.map(j => ({ type: 'job', id: j.id, title: j.name, subtitle: j.jobNumber || j.address })),
        ...results.contacts.map(c => ({ type: 'contact', id: c.id, title: c.firstName + ' ' + c.lastName, subtitle: c.email || c.phone })),
        ...results.tasks.map(t => ({ type: 'task', id: t.id, title: t.title, subtitle: t.jobName || 'No Job' })),
        ...results.communications.map(m => ({ type: 'communication', id: m.id, title: m.subject || m.channel, subtitle: m.jobName || '' }))
    ];

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => Math.min(prev + 1, flatResults.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter' && flatResults[selectedIndex]) {
            e.preventDefault();
            executeAction(flatResults[selectedIndex]);
        }
    };

    const executeAction = (item: any) => {
        setIsOpen(false);
        if (item.type === 'job') navigate('job-detail', { jobId: item.id });
        if (item.type === 'contact') navigate('contact-detail', { contactId: item.id });
        if (item.type === 'task') navigate('tasks'); // Assuming tasks page for now
        if (item.type === 'communication') navigate('communications');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 backdrop-blur-sm bg-black/60">
            {/* Click outside to close */}
            <div className="absolute inset-0" onClick={() => setIsOpen(false)} />

            <div className="relative w-full max-w-2xl bg-[#1A1A24] rounded-xl shadow-2xl border border-gray-800 overflow-hidden flex flex-col max-h-[70vh]">

                {/* Search Input */}
                <div className="flex items-center px-4 py-3 border-b border-gray-800 bg-[#1E1E2A]">
                    <Search size={20} className="text-gray-400 mr-3" />
                    <input
                        ref={inputRef}
                        type="text"
                        className="flex-1 bg-transparent text-white text-lg placeholder-gray-500 focus:outline-none"
                        placeholder="Search jobs, contacts, tasks... (Cmd+K to close)"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                    {loading && <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin ml-3" />}
                    <button onClick={() => setIsOpen(false)} className="ml-3 text-gray-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Results List */}
                <div className="flex-1 overflow-y-auto p-2">
                    {query.trim().length > 0 && query.trim().length < 2 && (
                        <div className="p-4 text-center text-gray-500 text-sm">Type at least 2 characters to search...</div>
                    )}

                    {query.trim().length >= 2 && flatResults.length === 0 && !loading && (
                        <div className="p-8 text-center text-gray-500 text-sm">No results found for "{query}"</div>
                    )}

                    {flatResults.length > 0 && (
                        <div className="space-y-1">
                            {flatResults.map((item, index) => {
                                const selected = index === selectedIndex;
                                let Icon = Briefcase;
                                let color = "text-blue-400";
                                if (item.type === 'contact') { Icon = Users; color = "text-emerald-400"; }
                                if (item.type === 'task') { Icon = CheckSquare; color = "text-amber-400"; }
                                if (item.type === 'communication') { Icon = MessageSquare; color = "text-purple-400"; }

                                return (
                                    <div
                                        key={item.type + '-' + item.id}
                                        onClick={() => executeAction(item)}
                                        onMouseEnter={() => setSelectedIndex(index)}
                                        className={cn(
                                            "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                                            selected ? "bg-blue-600/20 border border-blue-500/30" : "hover:bg-white/5 border border-transparent"
                                        )}
                                    >
                                        <div className={cn("p-2 rounded-md bg-gray-800", color)}>
                                            <Icon size={16} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-white">{item.title}</div>
                                            <div className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">
                                                {item.type} • {item.subtitle}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="py-2 px-4 border-t border-gray-800 bg-[#171720] text-[10px] text-gray-500 flex items-center justify-between">
                    <div><span className="font-semibold text-gray-400">↑↓</span> to navigate</div>
                    <div><span className="font-semibold text-gray-400">Enter</span> to select</div>
                    <div><span className="font-semibold text-gray-400">Esc</span> to close</div>
                </div>
            </div>
        </div>
    );
}
 
 
