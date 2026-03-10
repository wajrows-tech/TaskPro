import React, { useEffect, useState } from 'react';
import { ShieldAlert, CheckCircle, Clock } from 'lucide-react';
import { api } from '../../services/api.ts';
import { useUI } from '../../contexts/UIContext';
import { Card } from '../../shared/Card';
import { Button } from '../../shared/Button';

export function AgentApprovalsPanel() {
    const { addToast } = useUI();
    const [pending, setPending] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const loadPending = async () => {
        setLoading(true);
        try {
            const data = await api.getPendingApprovals();
            // Data has action, params, agentId, createdAt
            setPending(data);
        } catch (e: any) {
            addToast('Failed to load pending approvals: ' + e.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPending();
        const interval = setInterval(loadPending, 30000); // refresh every 30s
        return () => clearInterval(interval);
    }, []);

    const handleApprove = async (id: number) => {
        try {
            await api.approveAgentAction(id);
            addToast('Action approved and executed by Agent', 'success');
            loadPending();
        } catch (e: any) {
            addToast('Failed to approve action: ' + e.message, 'error');
        }
    };

    return (
        <div className="w-[350px] border-l border-white/5 bg-[#12121A] flex flex-col shrink-0 h-full">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ShieldAlert className="text-yellow-500" size={18} />
                    <h3 className="font-semibold text-white">Pending Approvals</h3>
                </div>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-500">
                    {pending.length} Action{pending.length !== 1 ? 's' : ''}
                </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loading && pending.length === 0 ? (
                    <div className="text-center text-gray-500 text-sm py-8">Loading...</div>
                ) : pending.length === 0 ? (
                    <div className="text-center py-12">
                        <CheckCircle size={32} className="text-green-500/50 mx-auto mb-3" />
                        <p className="text-gray-400 text-sm">All caught up!</p>
                        <p className="text-gray-500 text-xs mt-1">No agent actions require review</p>
                    </div>
                ) : (
                    pending.map(item => {
                        const params = JSON.parse(item.params || '{}');
                        return (
                            <Card key={item.id} className="p-4 bg-white/5 border border-white/10 hover:border-yellow-500/50 transition-colors">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-6 h-6 rounded bg-blue-500/20 flex items-center justify-center text-xs">
                                        🤖
                                    </div>
                                    <span className="text-sm font-medium text-gray-200 capitalize">{item.agentId.replace('_', ' ')}</span>
                                    <span className="text-xs text-gray-500 ml-auto flex items-center gap-1">
                                        <Clock size={12} />
                                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>

                                <h4 className="text-white text-sm font-medium mb-1">
                                    {item.action === 'create_task' ? 'Create Task' :
                                        item.action === 'update_job' ? 'Update Job' :
                                            item.action === 'send_sms' ? 'Send SMS' : item.action}
                                </h4>

                                <div className="bg-black/20 rounded p-2 mb-4">
                                    <p className="text-sm text-gray-300 break-words">
                                        {params.taskName || params.message || JSON.stringify(params)}
                                    </p>
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        variant="primary"
                                        className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white"
                                        size="sm"
                                        onClick={() => handleApprove(item.id)}
                                    >
                                        Approve
                                    </Button>
                                    <Button variant="danger" className="flex-1" size="sm">
                                        Reject
                                    </Button>
                                </div>
                            </Card>
                        );
                    })
                )}
            </div>
        </div>
    );
}
 
