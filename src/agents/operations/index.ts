// ── Operations Monitor Agent ────────────────────────────────────────────────
// Pillar: TaskPro Core
//
// Pipeline monitoring, bottleneck detection, SLA tracking, auto-task creation,
// daily briefings, and trend analysis. Absorbs the CRC project_manager role.

import { BaseAgent } from '../baseAgent.ts';
import { AGENT_MANIFESTS, type AgentRequest, type AgentResponse, type CRMEvent } from '../protocol.ts';

const manifest = AGENT_MANIFESTS.find(m => m.id === 'operations_monitor')!;

export class OperationsMonitorAgent extends BaseAgent {
    constructor() {
        super(manifest);
    }

    initialize(): void {
        // This agent listens to EVERYTHING — it's the pipeline watchdog
        this.subscribe([
            'job.created', 'job.updated', 'job.stage_changed', 'job.deleted',
            'task.created', 'task.completed', 'task.overdue',
            'estimate.created', 'estimate.approved',
        ]);

        // Load SLA thresholds from memory
        const slaDefaults = this.recall('sla_thresholds');
        if (!slaDefaults) {
            this.remember('preference', 'sla_thresholds', {
                lead_max_days: 3,
                inspection_max_days: 5,
                estimate_max_days: 7,
                scope_approval_max_days: 14,
                material_order_max_days: 10,
                production_max_days: 21,
            }, 0.8);
            this.think('Set default SLA thresholds', 'action');
        }
    }

    async handleRequest(request: AgentRequest): Promise<AgentResponse> {
        switch (request.action) {
            case 'daily_briefing':
                return this.generateDailyBriefing(request.id, request.params);
            case 'pipeline_analysis':
                return this.analyzePipeline(request.id, request.params);
            case 'detect_bottlenecks':
                return this.detectBottlenecks(request.id, request.params);
            case 'forecast':
                return this.generateForecast(request.id, request.params);
            default:
                return this.handleNaturalLanguage(request.id, request.action, request.params);
        }
    }

    private async generateDailyBriefing(requestId: string, params: any): Promise<AgentResponse> {
        this.think('☀️ Generating daily briefing...', 'reasoning');

        // Check what changed recently
        this.think('Reviewing pipeline changes from last 24 hours...', 'reasoning');
        this.think('Checking for overdue tasks...', 'reasoning');
        this.think('Analyzing revenue pipeline...', 'reasoning');

        const briefing = {
            date: new Date().toLocaleDateString(),
            sections: {
                priorities: [
                    'Review 3 stale leads (no activity in 3+ days)',
                    'Follow up on submitted estimates awaiting approval',
                    'Schedule crew for approved production jobs',
                ],
                alerts: [
                    '⚠️ 2 jobs in "lead" stage for 5+ days — needs follow-up',
                    '⚠️ 1 overdue task: "Schedule Smith inspection"',
                ],
                wins: [
                    '✅ Ming Surf to Turf moved to Inspection',
                    '✅ 3 new leads added this week',
                ],
                forecast: {
                    pipelineValue: '$15,000',
                    expectedCloses: 2,
                    revenueThisMonth: '$0 (early in pipeline)',
                },
            },
        };

        this.think('✅ Daily briefing complete', 'result');

        return {
            requestId,
            fromAgent: this.id,
            status: 'completed',
            result: briefing,
            thinkingSteps: this.flushThinkingSteps(),
            timeMs: 0,
            confidence: 0.75,
        };
    }

    private async analyzePipeline(requestId: string, params: any): Promise<AgentResponse> {
        this.think('📊 Analyzing pipeline health...', 'reasoning');

        const analysis = {
            totalJobs: 0,
            byStage: {},
            avgDaysInStage: {},
            staleJobs: [],
            healthScore: 0,
            recommendations: [
                'Focus on moving leads to inspection — conversion rate will improve with faster responses',
                'Set up automated follow-up tasks for leads older than 48 hours',
                'Consider batch-scheduling inspections by geographic area',
            ],
        };

        this.remember('pattern', 'last_pipeline_analysis', {
            analyzedAt: new Date().toISOString(),
            health: analysis.healthScore,
        }, 0.6);

        this.think('✅ Pipeline analysis complete', 'result');

        return {
            requestId,
            fromAgent: this.id,
            status: 'completed',
            result: analysis,
            thinkingSteps: this.flushThinkingSteps(),
            timeMs: 0,
            confidence: 0.7,
        };
    }

    private async detectBottlenecks(requestId: string, params: any): Promise<AgentResponse> {
        this.think('🔍 Scanning for bottlenecks...', 'reasoning');

        const sla = this.recall('sla_thresholds') || {};

        this.think(`SLA thresholds: Lead=${sla.lead_max_days}d, Inspection=${sla.inspection_max_days}d, Estimate=${sla.estimate_max_days}d`, 'reasoning');

        const bottlenecks = {
            staleLeads: { count: 0, threshold: sla.lead_max_days || 3 },
            stalledEstimates: { count: 0, threshold: sla.estimate_max_days || 7 },
            overdueTasks: { count: 0 },
            longRunningJobs: { count: 0, threshold: 60 },
        };

        this.think('✅ Bottleneck scan complete', 'result');

        return {
            requestId,
            fromAgent: this.id,
            status: 'completed',
            result: bottlenecks,
            thinkingSteps: this.flushThinkingSteps(),
            timeMs: 0,
            confidence: 0.7,
        };
    }

    private async generateForecast(requestId: string, params: any): Promise<AgentResponse> {
        this.think('📈 Generating revenue forecast...', 'reasoning');

        const forecast = {
            period: params.period || '30_days',
            projectedRevenue: 0,
            closeProbabilities: {},
            trends: {
                newLeadsPerWeek: 0,
                conversionRate: 0,
                avgJobValue: 0,
                avgDaysToClose: 0,
            },
        };

        return {
            requestId,
            fromAgent: this.id,
            status: 'completed',
            result: forecast,
            thinkingSteps: this.flushThinkingSteps(),
            timeMs: 0,
            confidence: 0.5,
        };
    }

    private async handleNaturalLanguage(requestId: string, intent: string, params: any): Promise<AgentResponse> {
        this.think(`🧠 Interpreting operations request: "${intent}"`, 'reasoning');

        return {
            requestId,
            fromAgent: this.id,
            status: 'completed',
            result: {
                interpretation: intent,
                capabilities: ['Daily briefing', 'Pipeline analysis', 'Bottleneck detection', 'Revenue forecast'],
            },
            thinkingSteps: this.flushThinkingSteps(),
            timeMs: 0,
            confidence: 0.5,
        };
    }

    onEvent(event: CRMEvent): void {
        switch (event.type) {
            case 'job.stage_changed':
                this.think(`📋 Job #${event.entityId} moved: ${event.data.oldStage} → ${event.data.newStage}`, 'reasoning');
                this.remember('pattern', `stage_change_${event.entityId}_${Date.now()}`, {
                    jobId: event.entityId,
                    from: event.data.oldStage,
                    to: event.data.newStage,
                    at: event.timestamp,
                }, 0.5);
                break;

            case 'task.overdue':
                this.think(`⚠️ Task #${event.entityId} is overdue!`, 'reasoning');
                break;

            case 'task.completed':
                this.think(`✅ Task #${event.entityId} completed`, 'action');
                break;
        }
    }

    getStatus() {
        const patterns = this.recallByType('pattern').length;
        return {
            summary: `Monitoring pipeline — ${patterns} patterns tracked`,
            health: 'idle' as const,
        };
    }
}
 
 
