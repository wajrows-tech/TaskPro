import React, { useState, useEffect } from 'react';
import { Zap, Shield, Activity, Plus, Play, Pause, Trash2, Edit2, Clock, CheckCircle2, XCircle, Search } from 'lucide-react';
import { cn } from '../utils.ts';

export function AutomationsPage() {
    const [activeTab, setActiveTab] = useState<'rules' | 'runs' | 'audit'>('rules');
    const [rules, setRules] = useState<any[]>([]);
    const [runs, setRuns] = useState<any[]>([]);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('taskpro_token');
            const headers = { 'Authorization': `Bearer ${token}` };

            if (activeTab === 'rules') {
                const res = await fetch('/api/automations', { headers });
                if (res.ok) setRules(await res.json());
            } else if (activeTab === 'runs') {
                const res = await fetch('/api/automation-runs', { headers });
                if (res.ok) setRuns(await res.json());
            } else {
                const res = await fetch('/api/audit-logs', { headers });
                if (res.ok) setAuditLogs(await res.json());
            }
        } catch (e) {
            console.error('Failed to load automation data', e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center">
                        <Zap className="w-8 h-8 mr-3 text-yellow-500" />
                        Automation Engine
                    </h1>
                    <p className="text-gray-400 mt-2">Design workflows, monitor executions, and audit systemic changes.</p>
                </div>
                {activeTab === 'rules' && (
                    <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center shadow-lg shadow-blue-500/20">
                        <Plus className="w-4 h-4 mr-2" />
                        New Automation
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex space-x-2 mb-6 bg-gray-900 p-1.5 rounded-xl border border-white/5 w-fit">
                <TabButton active={activeTab === 'rules'} onClick={() => setActiveTab('rules')} icon={<Zap size={16} />} label="Workflows" />
                <TabButton active={activeTab === 'runs'} onClick={() => setActiveTab('runs')} icon={<Activity size={16} />} label="Execution Logs" />
                <TabButton active={activeTab === 'audit'} onClick={() => setActiveTab('audit')} icon={<Shield size={16} />} label="Audit Trail" />
            </div>

            {/* Content Area */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
                {loading ? (
                    <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                        Loading data...
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        {activeTab === 'rules' && <RulesTable rules={rules} />}
                        {activeTab === 'runs' && <RunsTable runs={runs} />}
                        {activeTab === 'audit' && <AuditTable logs={auditLogs} />}
                    </div>
                )}
            </div>
        </div>
    );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                active ? "bg-gray-800 text-white shadow-sm" : "text-gray-400 hover:text-white hover:bg-white/5"
            )}
        >
            {icon}
            <span>{label}</span>
        </button>
    );
}

function RulesTable({ rules }: { rules: any[] }) {
    if (rules.length === 0) return <div className="p-12 text-center text-gray-500">No automation rules configured.</div>;
    return (
        <table className="w-full text-left border-collapse">
            <thead>
                <tr className="bg-gray-950/50 border-b border-gray-800 text-gray-400 text-sm">
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Name</th>
                    <th className="px-6 py-4 font-medium">Trigger</th>
                    <th className="px-6 py-4 font-medium">Actions</th>
                    <th className="px-6 py-4 font-medium">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
                {rules.map(rule => (
                    <tr key={rule.id} className="hover:bg-gray-800/30 transition-colors">
                        <td className="px-6 py-4">
                            {rule.isActive ? (
                                <span className="flex items-center text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full w-fit"><Play className="w-3 h-3 mr-1" /> Active</span>
                            ) : (
                                <span className="flex items-center text-xs font-medium text-gray-400 bg-gray-400/10 px-2.5 py-1 rounded-full w-fit"><Pause className="w-3 h-3 mr-1" /> Paused</span>
                            )}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-white">{rule.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-400 font-mono">{rule.triggerEvent}</td>
                        <td className="px-6 py-4 text-sm text-gray-400">
                            {JSON.parse(rule.actions || '[]').length} Action(s)
                        </td>
                        <td className="px-6 py-4 text-gray-500 flex space-x-2">
                            <button className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" title="Edit"><Edit2 size={16} /></button>
                            <button className="p-1.5 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors" title="Delete"><Trash2 size={16} /></button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function RunsTable({ runs }: { runs: any[] }) {
    if (runs.length === 0) return <div className="p-12 text-center text-gray-500">No automation executions recorded.</div>;
    return (
        <table className="w-full text-left border-collapse">
            <thead>
                <tr className="bg-gray-950/50 border-b border-gray-800 text-gray-400 text-sm">
                    <th className="px-6 py-4 font-medium">Time (Local)</th>
                    <th className="px-6 py-4 font-medium">Rule Executed</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
                {runs.map(run => (
                    <tr key={run.id} className="hover:bg-gray-800/30 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-400 whitespace-nowrap">
                            {new Date(run.executedAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-white">{run.ruleName}</td>
                        <td className="px-6 py-4">
                            {run.status === 'success' ? (
                                <span className="flex items-center text-xs font-medium text-emerald-400"><CheckCircle2 className="w-4 h-4 mr-1.5" /> Success</span>
                            ) : run.status === 'pending' ? (
                                <span className="flex items-center text-xs font-medium text-yellow-400"><Clock className="w-4 h-4 mr-1.5 animate-pulse" /> Pending</span>
                            ) : (
                                <span className="flex items-center text-xs font-medium text-red-400" title={run.error}><XCircle className="w-4 h-4 mr-1.5" /> Failed</span>
                            )}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function AuditTable({ logs }: { logs: any[] }) {
    if (logs.length === 0) return <div className="p-12 text-center text-gray-500">No system audit logs found.</div>;
    return (
        <table className="w-full text-left border-collapse">
            <thead>
                <tr className="bg-gray-950/50 border-b border-gray-800 text-gray-400 text-sm">
                    <th className="px-6 py-4 font-medium">Time (Local)</th>
                    <th className="px-6 py-4 font-medium">Actor</th>
                    <th className="px-6 py-4 font-medium">Entity</th>
                    <th className="px-6 py-4 font-medium">Action</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
                {logs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-800/30 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-400 whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm">
                            {log.actorId ? (
                                <div className="flex items-center justify-between">
                                    <span className="text-white font-medium">{log.firstName} {log.lastName}</span>
                                    <span className="text-gray-500 text-xs ml-2">{log.email}</span>
                                </div>
                            ) : (
                                <span className="text-gray-500 flex items-center"><Zap className="w-3 h-3 mr-1 text-yellow-500" /> System</span>
                            )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400 uppercase tracking-wider text-[11px] font-bold">
                            {log.entityType} #{log.entityId}
                        </td>
                        <td className="px-6 py-4 text-sm text-blue-400 font-mono">
                            {log.action}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
