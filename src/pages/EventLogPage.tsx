import React, { useState, useEffect } from 'react';
import { Activity, ArrowDownLeft, ArrowUpRight, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { UIContext } from '../contexts/UIContext';

interface EventLogEntry {
    id: number;
    integrationId: string;
    eventType: string;
    direction: 'inbound' | 'outbound';
    entityType: string | null;
    entityId: number | null;
    payload: string;
    status: 'success' | 'failed' | 'pending';
    errorMessage: string | null;
    createdAt: string;
}

export function EventLogPage() {
    const [events, setEvents] = useState<EventLogEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const res = await fetch('/api/integrations/events?limit=50');
                if (res.ok) {
                    const data = await res.json();
                    setEvents(data);
                }
            } catch (err) {
                console.error('Failed to load events:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchEvents();
        // Poll every 10 seconds for new events
        const intv = setInterval(fetchEvents, 10000);
        return () => clearInterval(intv);
    }, []);

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center">
                        <Activity className="w-8 h-8 mr-3 text-blue-500" />
                        Integration Event Log
                    </h1>
                    <p className="text-gray-400 mt-2">Live traffic monitor for all incoming and outgoing data syncs.</p>
                </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-950/50 border-b border-gray-800 text-gray-400 text-sm">
                                <th className="px-6 py-4 font-medium">Time (Local)</th>
                                <th className="px-6 py-4 font-medium">Direction</th>
                                <th className="px-6 py-4 font-medium">Module</th>
                                <th className="px-6 py-4 font-medium">Event</th>
                                <th className="px-6 py-4 font-medium">Entity</th>
                                <th className="px-6 py-4 font-medium">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/50">
                            {loading && events.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        Loading network traffic...
                                    </td>
                                </tr>
                            ) : events.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        No integration traffic recorded yet.
                                    </td>
                                </tr>
                            ) : (
                                events.map((ev) => (
                                    <tr key={ev.id} className="hover:bg-gray-800/30 transition-colors group cursor-pointer">
                                        <td className="px-6 py-4 text-sm text-gray-400 whitespace-nowrap">
                                            {new Date(ev.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </td>
                                        <td className="px-6 py-4">
                                            {ev.direction === 'outbound' ? (
                                                <span className="flex items-center text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full w-fit">
                                                    <ArrowUpRight className="w-3.5 h-3.5 mr-1" /> OUT
                                                </span>
                                            ) : (
                                                <span className="flex items-center text-xs font-medium text-blue-400 bg-blue-400/10 px-2.5 py-1 rounded-full w-fit">
                                                    <ArrowDownLeft className="w-3.5 h-3.5 mr-1" /> IN
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-white capitalize">
                                            {ev.integrationId.replace('_', ' ')}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-300 font-mono">
                                            {ev.eventType}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-400">
                                            {ev.entityType ? `${ev.entityType} #${ev.entityId}` : '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            {ev.status === 'success' ? (
                                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                            ) : ev.status === 'pending' ? (
                                                <Clock className="w-5 h-5 text-yellow-500 animate-pulse" />
                                            ) : (
                                                <div className="flex items-center text-red-400" title={ev.errorMessage || 'Failed'}>
                                                    <XCircle className="w-5 h-5 mr-2" />
                                                    <span className="text-xs truncate max-w-[120px]">{ev.errorMessage || 'Error'}</span>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
 
 
