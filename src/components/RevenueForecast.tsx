// @ts-nocheck
import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, DollarSign, Zap } from 'lucide-react';
import { Client, Task } from '../types.ts';
import { cn } from '../utils.ts';

interface RevenueForecastProps {
    clients: Client[];
    tasks: Task[];
    onNavigate: (tab: string) => void;
}

// Stage probability weights (typical B2B close rates by stage)
const STAGE_PROBABILITY: Record<string, number> = {
    inspection: 0.20,
    claim_estimate: 0.35,
    scope_approval: 0.55,
    contract: 0.75,
    production: 0.90,
    supplement: 0.95,
    invoice: 0.98,
};

interface ForecastBar {
    stage: string;
    label: string;
    count: number;
    rawValue: number;
    weightedValue: number;
    probability: number;
    color: string;
}

const STAGE_META: Record<string, { label: string; color: string }> = {
    inspection: { label: 'Inspection', color: '#e879f9' },
    claim_estimate: { label: 'Claim Estimate', color: '#818cf8' },
    scope_approval: { label: 'Scope Approval', color: '#60a5fa' },
    contract: { label: 'Contract', color: '#34d399' },
    production: { label: 'Production', color: '#fbbf24' },
    supplement: { label: 'Supplement', color: '#fb923c' },
    invoice: { label: 'Invoice', color: '#22c55e' },
};

export function RevenueForecast({ clients, tasks, onNavigate }: RevenueForecastProps) {
    const { bars, totalWeighted, totalRaw, keyInsight } = useMemo(() => {
        const stageMap: Record<string, { clients: Client[]; raw: number }> = {};
        for (const c of clients) {
            if (!stageMap[c.stage]) stageMap[c.stage] = { clients: [], raw: 0 };
            stageMap[c.stage].clients.push(c);
            stageMap[c.stage].raw += c.estimatedValue || 0;
        }

        const bars: ForecastBar[] = Object.entries(stageMap)
            .map(([stage, { clients: stageCli, raw }]) => ({
                stage,
                label: STAGE_META[stage]?.label ?? stage,
                count: stageCli.length,
                rawValue: raw,
                probability: STAGE_PROBABILITY[stage] ?? 0.5,
                weightedValue: raw * (STAGE_PROBABILITY[stage] ?? 0.5),
                color: STAGE_META[stage]?.color ?? '#9ca3af',
            }))
            .sort((a, b) => Object.keys(STAGE_META).indexOf(a.stage) - Object.keys(STAGE_META).indexOf(b.stage));

        const totalWeighted = bars.reduce((s, b) => s + b.weightedValue, 0);
        const totalRaw = bars.reduce((s, b) => s + b.rawValue, 0);

        // Key insight: which stage task completions unlock the most value
        const contractClients = clients.filter(c => c.stage === 'contract');
        const contractValue = contractClients.reduce((s, c) => s + (c.estimatedValue || 0), 0);
        const contractTasks = tasks.filter(t =>
            contractClients.some(c => c.id === t.clientId) && t.status !== 'done'
        ).length;

        let keyInsight = '';
        if (contractValue > 0 && contractTasks > 0) {
            keyInsight = `Complete ${contractTasks} task${contractTasks > 1 ? 's' : ''} to unlock ~$${Math.round(contractValue * 0.75 / 1000)}k`;
        } else if (totalWeighted > 0) {
            const highStage = bars.find(b => b.stage === 'invoice' || b.stage === 'production');
            if (highStage) keyInsight = `$${Math.round(highStage.weightedValue / 1000)}k from ${highStage.label} stage`;
        }

        return { bars, totalWeighted, totalRaw, keyInsight };
    }, [clients, tasks]);

    const maxWeighted = Math.max(...bars.map(b => b.weightedValue), 1);

    if (clients.length === 0) {
        return (
            <div className="text-center py-4 text-gray-300 font-serif italic text-sm">
                Add clients to see your revenue forecast
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Totals */}
            <div className="flex gap-2">
                <div className="flex-1 bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                    <div className="font-mono text-[9px] uppercase text-emerald-600 opacity-60 mb-0.5">Weighted Forecast</div>
                    <div className="font-black text-lg text-emerald-700">${Math.round(totalWeighted).toLocaleString()}</div>
                </div>
                <div className="flex-1 bg-gray-50 border border-gray-100 rounded-xl p-3">
                    <div className="font-mono text-[9px] uppercase text-gray-400 mb-0.5">Pipeline Total</div>
                    <div className="font-black text-lg text-gray-700">${Math.round(totalRaw).toLocaleString()}</div>
                </div>
            </div>

            {/* Stage bars */}
            <div className="space-y-1.5">
                {bars.map(bar => (
                    <div key={bar.stage}>
                        <div className="flex items-center justify-between text-[9px] font-mono mb-0.5">
                            <span className="opacity-50">{bar.label}</span>
                            <span className="opacity-40">{Math.round(bar.probability * 100)}% Â· ${Math.round(bar.weightedValue).toLocaleString()}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full rounded-full"
                                style={{ backgroundColor: bar.color }}
                                initial={{ width: 0 }}
                                animate={{ width: `${(bar.weightedValue / maxWeighted) * 100}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut' }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            {/* Key insight */}
            {keyInsight && (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl p-2.5">
                    <Zap size={12} className="text-amber-500 shrink-0" />
                    <p className="text-[10px] font-mono text-amber-700">{keyInsight}</p>
                    <button onClick={() => onNavigate('tasks')}
                        className="ml-auto text-[9px] font-mono text-amber-600 hover:text-amber-800 underline whitespace-nowrap">
                        View Tasks â†’
                    </button>
                </div>
            )}
        </div>
    );
}
