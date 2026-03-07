import React, { useState, useEffect } from 'react';
import { HardHat, Truck, FileCheck, Plus, Calendar, CheckSquare } from 'lucide-react';
import { Card } from '../../shared/Card';
import { Badge } from '../../shared/Badge';
import { Button } from '../../shared/Button';
import { type WorkOrder, type MaterialOrder, type Checklist } from '../../types.ts';
import { timeAgo } from '../../utils.ts';

interface ProductionTabProps {
    jobId: number;
}

export function ProductionTab({ jobId }: ProductionTabProps) {
    const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
    const [materialOrders, setMaterialOrders] = useState<MaterialOrder[]>([]);
    const [checklists, setChecklists] = useState<Checklist[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProductionData();
    }, [jobId]);

    const fetchProductionData = async () => {
        try {
            const token = localStorage.getItem('taskpro_token');
            const headers = { 'Authorization': `Bearer ${token}` };

            const [wRes, mRes, cRes] = await Promise.all([
                fetch(`/api/jobs/${jobId}/work-orders`, { headers }),
                fetch(`/api/jobs/${jobId}/material-orders`, { headers }),
                fetch(`/api/checklists/job/${jobId}`, { headers })
            ]);

            if (wRes.ok) setWorkOrders(await wRes.json());
            if (mRes.ok) setMaterialOrders(await mRes.json());
            if (cRes.ok) setChecklists(await cRes.json());
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500 animate-pulse">Loading production data...</div>;

    return (
        <div className="space-y-6">

            {/* ── Work Orders ── */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-white flex items-center gap-2">
                        <HardHat size={18} className="text-amber-500" />
                        Work Orders / Crews
                    </h3>
                    <Button size="sm" variant="secondary" icon={<Plus size={14} />}>Schedule Work</Button>
                </div>
                {workOrders.length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-gray-800 rounded-xl">
                        <p className="text-gray-500 text-sm">No work orders scheduled.</p>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {workOrders.map(order => (
                            <Card key={order.id} padding="md" className="flex items-start justify-between bg-gray-900/50">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <Badge color={
                                            order.status === 'completed' ? '#2ED573' :
                                                order.status === 'in_progress' ? '#74B9FF' : '#FDCB6E'
                                        }>{order.status}</Badge>
                                        <span className="text-white font-medium">Work Order #{order.id}</span>
                                    </div>
                                    <div className="text-sm text-gray-400 mt-2">
                                        {order.instructions || 'No special instructions provided.'}
                                    </div>
                                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                                        <span className="flex items-center gap-1">
                                            <Calendar size={12} />
                                            {order.scheduledDate ? new Date(order.scheduledDate).toLocaleDateString() : 'Unscheduled'}
                                        </span>
                                        {order.crew && (
                                            <span className="flex items-center gap-1">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: order.crew.color }} />
                                                Crew: {order.crew.name}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <Button size="sm" variant="ghost">Edit</Button>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Material Orders ── */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-white flex items-center gap-2">
                        <Truck size={18} className="text-blue-400" />
                        Material Orders
                    </h3>
                    <Button size="sm" variant="secondary" icon={<Plus size={14} />}>Order Materials</Button>
                </div>
                {materialOrders.length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-gray-800 rounded-xl">
                        <p className="text-gray-500 text-sm">No material orders placed.</p>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {materialOrders.map(order => (
                            <Card key={order.id} padding="md" className="flex items-center justify-between bg-gray-900/50">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <Badge color={
                                            order.status === 'delivered' ? '#2ED573' :
                                                order.status === 'partial' ? '#00CEC9' : '#A29BFE'
                                        }>{order.status}</Badge>
                                        <span className="text-white font-medium">Order #{order.id}</span>
                                    </div>
                                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                        <span className="flex items-center gap-1">
                                            <Calendar size={12} />
                                            Delivery: {order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString() : 'TBD'}
                                        </span>
                                    </div>
                                </div>
                                <Button size="sm" variant="ghost">Track</Button>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Checklists ── */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-white flex items-center gap-2">
                        <FileCheck size={18} className="text-emerald-400" />
                        Quality & Compliance Checklists
                    </h3>
                    <Button size="sm" variant="secondary" icon={<Plus size={14} />}>Add Checklist</Button>
                </div>
                {checklists.length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-gray-800 rounded-xl">
                        <p className="text-gray-500 text-sm">No checklists assigned to this job.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {checklists.map(list => {
                            let items = [];
                            try { items = JSON.parse(list.items || '[]'); } catch { }
                            const completed = items.filter((i: any) => i.isCompleted).length;
                            const total = items.length;
                            const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

                            return (
                                <Card key={list.id} padding="md" className="bg-gray-900/50">
                                    <div className="flex items-center gap-2 mb-3">
                                        <CheckSquare size={16} className={progress === 100 ? "text-emerald-400" : "text-gray-400"} />
                                        <h4 className="text-white font-medium">{list.name}</h4>
                                    </div>

                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                                        </div>
                                        <span className="text-[10px] text-gray-400">{completed}/{total}</span>
                                    </div>
                                    <div className="text-[10px] text-gray-500 mt-3 text-right">
                                        Updated {timeAgo(list.updatedAt)}
                                    </div>
                                </Card>
                            )
                        })}
                    </div>
                )}
            </div>

        </div>
    );
}
