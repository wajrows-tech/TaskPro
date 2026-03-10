import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Plus, User, CheckSquare, CornerDownLeft } from 'lucide-react';
import { Task, Job } from '../types.ts';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface SmartCommandBarProps {
    tasks: Task[];
    jobs: Job[];
    onOpenTask: (task: Task) => void;
    onOpenClient: (Job: Job) => void;
    onCreateTask: (title: string, priority: 'low' | 'medium' | 'high') => void;
    onCreateClient: (name: string) => void;
    searchQuery: string;
    setSearchQuery: (q: string) => void;
}

export function SmartCommandBar({
    tasks,
    jobs,
    onOpenTask,
    onOpenClient,
    onCreateTask,
    onCreateClient,
    searchQuery,
    setSearchQuery
}: SmartCommandBarProps) {
    const [isFocused, setIsFocused] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsFocused(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Helper to guess type based on query
    const guessType = (query: string): 'task' | 'Job' | 'ambiguous' => {
        const q = query.trim();
        if (!q) return 'ambiguous';

        const actionVerbs = ['call', 'email', 'invoice', 'inspect', 'fix', 'do', 'write', 'send', 'review', 'update', 'check', 'follow up', 'schedule'];
        const startsWithVerb = actionVerbs.some(v => q.toLowerCase().startsWith(v));
        if (startsWithVerb) return 'task';

        // Check if it looks like a name (e.g., "John Doe", capitalized words)
        const words = q.split(' ');
        if (words.length >= 2 && words.length <= 4 && words.every(w => w.charAt(0) === w.charAt(0).toUpperCase() && w.length > 0)) {
            return 'Job';
        }

        // Default heuristic: longer things are usually tasks
        if (words.length > 3) return 'task';
        return 'ambiguous';
    };

    const results = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();

        // Return nothing if empty
        if (!q) return [];

        const matches = [];

        // 1. Exact or partial Job matches
        const clientMatches = jobs.filter(c => c.name.toLowerCase().includes(q)).slice(0, 3);
        clientMatches.forEach(c => matches.push({ type: 'client_match', item: c }));

        // 2. Exact or partial Task matches
        const taskMatches = tasks.filter(t => t.title.toLowerCase().includes(q)).slice(0, 3);
        taskMatches.forEach(t => matches.push({ type: 'task_match', item: t }));

        // 3. Create Actions
        const guess = guessType(q);
        if (guess === 'task') {
            matches.push({ type: 'create_task', label: `Create Task "${searchQuery}"` });
            matches.push({ type: 'create_client', label: `Create Job "${searchQuery}"` });
        } else if (guess === 'Job') {
            matches.push({ type: 'create_client', label: `Create Job "${searchQuery}"` });
            matches.push({ type: 'create_task', label: `Create Task "${searchQuery}"` });
        } else {
            // Ambiguous
            matches.push({ type: 'create_task', label: `Create Task "${searchQuery}"` });
            matches.push({ type: 'create_client', label: `Create Job "${searchQuery}"` });
        }

        return matches;
    }, [searchQuery, tasks, jobs]);

    // Reset selection when results change
    useEffect(() => {
        setSelectedIndex(0);
    }, [results.length, searchQuery]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isFocused || !searchQuery.trim()) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % results.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const selected = results[selectedIndex];
            if (selected) {
                executeAction(selected);
            }
        } else if (e.key === 'Escape') {
            setIsFocused(false);
            (e.currentTarget as HTMLElement).blur();
        }
    };

    const executeAction = (result: any) => {
        setIsFocused(false);
        if (result.type === 'client_match') {
            onOpenClient(result.item);
        } else if (result.type === 'task_match') {
            onOpenTask(result.item);
        } else if (result.type === 'create_task') {
            // Default to medium priority, no Job. They can edit later.
            onCreateTask(searchQuery.trim(), 'medium');
            setSearchQuery('');
        } else if (result.type === 'create_client') {
            onCreateClient(searchQuery.trim());
            setSearchQuery('');
        }
    };

    return (
        <div className="relative flex-1 max-w-xl z-50" ref={containerRef}>
            <div className="relative">
                <Search size={14} className={cn(
                    "absolute left-4 top-1/2 -translate-y-1/2 transition-opacity",
                    isFocused ? "opacity-100 text-amber-500" : "opacity-40"
                )} />
                <input
                    type="text"
                    placeholder="Search or Create (e.g., 'Call Bob', 'Smith Family')..."
                    className={cn(
                        "w-full border-none rounded-full py-2 pl-10 pr-4 font-mono text-xs transition-all outline-none",
                        isFocused ? "bg-white shadow-md ring-2 ring-amber-500/20" : "bg-[#1A1A2E]/5 hover:bg-[#1A1A2E]/10"
                    )}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onKeyDown={handleKeyDown}
                />

                {searchQuery && isFocused && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-40">
                        <CornerDownLeft size={10} />
                        <span className="text-[9px] font-mono">ENTER</span>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {isFocused && searchQuery.trim() && results.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden"
                    >
                        <div className="py-2">
                            {results.map((res, idx) => {
                                const isSelected = idx === selectedIndex;
                                return (
                                    <div
                                        key={idx}
                                        className={cn(
                                            "px-4 py-2.5 flex items-center gap-3 cursor-pointer transition-colors",
                                            isSelected ? "bg-amber-50" : "hover:bg-gray-50"
                                        )}
                                        onClick={() => executeAction(res)}
                                        onMouseEnter={() => setSelectedIndex(idx)}
                                    >
                                        {res.type === 'client_match' && (
                                            <>
                                                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                                    <User size={12} />
                                                </div>
                                                <div className="flex-1 overflow-hidden">
                                                    <div className="text-sm font-medium text-gray-900 truncate">{res.item.name}</div>
                                                    <div className="text-[10px] font-mono text-gray-400 capitalize">Job â€¢ {res.item.stage}</div>
                                                </div>
                                            </>
                                        )}
                                        {res.type === 'task_match' && (
                                            <>
                                                <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                                                    <CheckSquare size={12} />
                                                </div>
                                                <div className="flex-1 overflow-hidden">
                                                    <div className="text-sm font-medium text-gray-900 truncate">{res.item.title}</div>
                                                    <div className="text-[10px] font-mono text-gray-400 capitalize">Task â€¢ {res.item.status}</div>
                                                </div>
                                            </>
                                        )}
                                        {(res.type === 'create_task' || res.type === 'create_client') && (
                                            <>
                                                <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                                                    {res.type === 'create_task' ? <CheckSquare size={12} /> : <User size={12} />}
                                                </div>
                                                <div className="flex-1 overflow-hidden">
                                                    <div className="text-sm font-medium text-gray-900 truncate flex items-center gap-2">
                                                        <Plus size={12} className="opacity-50" />
                                                        {res.label}
                                                    </div>
                                                </div>
                                                {isSelected && (
                                                    <div className="text-[10px] font-mono text-amber-600 font-bold tracking-widest bg-amber-200/50 px-2 py-0.5 rounded">
                                                        ENTER
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
 
