// ── Estimation Analyst Agent ────────────────────────────────────────────────
// Pillar: ClaimSync
//
// AI-powered line item suggestions, pricing intelligence, margin analysis,
// Xactimate compatibility, and estimate version tracking.

import { BaseAgent } from '../baseAgent.ts';
import { AGENT_MANIFESTS, type AgentRequest, type AgentResponse, type CRMEvent } from '../protocol.ts';

const manifest = AGENT_MANIFESTS.find(m => m.id === 'estimation_analyst')!;

export class EstimationAnalystAgent extends BaseAgent {
    constructor() {
        super(manifest);
    }

    initialize(): void {
        this.subscribe(['estimate.created', 'estimate.updated', 'estimate.approved', 'job.stage_changed']);

        // Seed common roofing line items if first run
        const items = this.recall('common_line_items');
        if (!items) {
            this.remember('playbook', 'common_line_items', {
                'Architectural Shingles (per sq)': { unit: 'square', avgPrice: 350, category: 'material' },
                '3-Tab Shingles (per sq)': { unit: 'square', avgPrice: 250, category: 'material' },
                'Synthetic Underlayment': { unit: 'square', avgPrice: 65, category: 'material' },
                'Ice & Water Shield': { unit: 'linear_foot', avgPrice: 3.50, category: 'material' },
                'Drip Edge': { unit: 'linear_foot', avgPrice: 2.75, category: 'material' },
                'Ridge Cap Shingles': { unit: 'linear_foot', avgPrice: 6.50, category: 'material' },
                'Pipe Boot/Collar': { unit: 'each', avgPrice: 25, category: 'material' },
                'Step Flashing': { unit: 'linear_foot', avgPrice: 8, category: 'material' },
                'Tear-Off (1 layer)': { unit: 'square', avgPrice: 125, category: 'labor' },
                'Tear-Off (2 layers)': { unit: 'square', avgPrice: 175, category: 'labor' },
                'Install (per sq)': { unit: 'square', avgPrice: 200, category: 'labor' },
                'Dumpster/Debris Removal': { unit: 'each', avgPrice: 450, category: 'overhead' },
                'Permit Fee': { unit: 'each', avgPrice: 250, category: 'overhead' },
                'Deck Repair (per sheet)': { unit: 'each', avgPrice: 85, category: 'material' },
            }, 0.8);
            this.think('Seeded 14 common roofing line items with market prices', 'action');
        }

        const margins = this.recall('margin_targets');
        if (!margins) {
            this.remember('preference', 'margin_targets', {
                minimum: 0.20,
                target: 0.35,
                premium: 0.45,
                insuranceMarkup: 0.10,
            }, 0.7);
            this.think('Set default margin targets', 'action');
        }
    }

    async handleRequest(request: AgentRequest): Promise<AgentResponse> {
        switch (request.action) {
            case 'suggest_line_items':
                return this.suggestLineItems(request.id, request.params);
            case 'analyze_margins':
                return this.analyzeMargins(request.id, request.params);
            case 'price_check':
                return this.priceCheck(request.id, request.params);
            case 'compare_versions':
                return this.compareVersions(request.id, request.params);
            case 'generate_estimate':
                return this.generateEstimate(request.id, request.params);
            default:
                return this.handleNaturalLanguage(request.id, request.action, request.params);
        }
    }

    private async suggestLineItems(requestId: string, params: any): Promise<AgentResponse> {
        this.think('💰 Generating line item suggestions...', 'reasoning');

        const jobType = params.jobType || 'residential';
        const roofType = params.roofType || 'shingle';
        const squareFootage = params.squareFootage || 0;

        const commonItems = this.recall('common_line_items') || {};
        this.think(`Loaded ${Object.keys(commonItems).length} item templates`, 'reasoning');

        // Generate suggestions based on job type
        const suggestions = [];
        for (const [name, item] of Object.entries(commonItems) as any) {
            let quantity = 0;
            if (squareFootage > 0) {
                const squares = squareFootage / 100;
                if (item.unit === 'square') quantity = Math.ceil(squares);
                else if (item.unit === 'linear_foot') quantity = Math.ceil(Math.sqrt(squareFootage) * 4);
                else quantity = 1;
            }

            suggestions.push({
                description: name,
                unitPrice: item.avgPrice,
                unit: item.unit,
                suggestedQuantity: quantity,
                category: item.category,
                total: quantity * item.avgPrice,
            });
        }

        const subtotal = suggestions.reduce((sum, s) => sum + s.total, 0);
        this.think(`Suggested ${suggestions.length} line items — subtotal: $${subtotal.toLocaleString()}`, 'result');

        return {
            requestId,
            fromAgent: this.id,
            status: 'completed',
            result: { suggestions, subtotal, squareFootage },
            thinkingSteps: this.flushThinkingSteps(),
            timeMs: 0,
            confidence: squareFootage > 0 ? 0.7 : 0.4,
        };
    }

    private async analyzeMargins(requestId: string, params: any): Promise<AgentResponse> {
        this.think('📊 Analyzing estimate margins...', 'reasoning');

        const targets = this.recall('margin_targets') || { minimum: 0.20, target: 0.35 };
        const cost = params.cost || 0;
        const price = params.price || 0;

        const margin = price > 0 ? (price - cost) / price : 0;
        const marginPct = (margin * 100).toFixed(1);

        let assessment = 'healthy';
        if (margin < targets.minimum) {
            assessment = 'below_minimum';
            this.think(`⚠️ Margin at ${marginPct}% — BELOW minimum target of ${(targets.minimum * 100).toFixed(0)}%`, 'reasoning');
        } else if (margin < targets.target) {
            assessment = 'below_target';
            this.think(`Margin at ${marginPct}% — below target of ${(targets.target * 100).toFixed(0)}% but above minimum`, 'reasoning');
        } else {
            this.think(`✅ Margin at ${marginPct}% — healthy (target: ${(targets.target * 100).toFixed(0)}%)`, 'result');
        }

        return {
            requestId,
            fromAgent: this.id,
            status: 'completed',
            result: { margin, marginPct, assessment, targets, cost, price },
            thinkingSteps: this.flushThinkingSteps(),
            timeMs: 0,
            confidence: price > 0 ? 0.85 : 0.3,
        };
    }

    private async priceCheck(requestId: string, params: any): Promise<AgentResponse> {
        this.think(`💲 Price checking: "${params.item}"...`, 'reasoning');

        const commonItems = this.recall('common_line_items') || {};
        const match = Object.entries(commonItems).find(([name]) =>
            name.toLowerCase().includes((params.item || '').toLowerCase())
        ) as [string, any] | undefined;

        if (match) {
            this.think(`Found: ${match[0]} — $${match[1].avgPrice}/${match[1].unit}`, 'result');
        } else {
            this.think(`No match found in price book for "${params.item}"`, 'reasoning');
        }

        return {
            requestId,
            fromAgent: this.id,
            status: 'completed',
            result: match ? { item: match[0], ...match[1] } : { item: params.item, message: 'Not in price book' },
            thinkingSteps: this.flushThinkingSteps(),
            timeMs: 0,
            confidence: match ? 0.8 : 0.3,
        };
    }

    private async compareVersions(requestId: string, params: any): Promise<AgentResponse> {
        this.think('🔀 Comparing estimate versions...', 'reasoning');

        return {
            requestId,
            fromAgent: this.id,
            status: 'completed',
            result: { message: 'Provide two estimate IDs to compare versions.' },
            thinkingSteps: this.flushThinkingSteps(),
            timeMs: 0,
            confidence: 0.4,
        };
    }

    private async generateEstimate(requestId: string, params: any): Promise<AgentResponse> {
        this.think('📝 Generating full estimate...', 'reasoning');

        // Delegate line item suggestions to self
        const lineItemResponse = await this.suggestLineItems(requestId, params);

        return {
            requestId,
            fromAgent: this.id,
            status: 'completed',
            result: {
                ...lineItemResponse.result,
                status: 'draft',
                generatedBy: 'estimation_analyst',
            },
            thinkingSteps: this.flushThinkingSteps(),
            timeMs: 0,
            confidence: 0.6,
        };
    }

    private async handleNaturalLanguage(requestId: string, intent: string, params: any): Promise<AgentResponse> {
        this.think(`🧠 Interpreting estimation request: "${intent}"`, 'reasoning');

        return {
            requestId,
            fromAgent: this.id,
            status: 'completed',
            result: {
                interpretation: intent,
                capabilities: ['Line item suggestions', 'Margin analysis', 'Price checks', 'Version comparison', 'Full estimate generation'],
            },
            thinkingSteps: this.flushThinkingSteps(),
            timeMs: 0,
            confidence: 0.5,
        };
    }

    /** Learn from estimate approvals/rejections */
    learnFromOutcome(lineItems: any[], approved: boolean, carrier?: string): void {
        for (const item of lineItems) {
            const key = `item_success_${item.description?.toLowerCase()?.replace(/\s/g, '_')}`;
            const existing = this.recall(key) || { submitted: 0, approved: 0 };
            existing.submitted++;
            if (approved) existing.approved++;
            const confidence = Math.min(0.9, 0.3 + (existing.submitted * 0.03));
            this.remember('learning', key, existing, confidence);
        }
    }

    onEvent(event: CRMEvent): void {
        if (event.type === 'estimate.approved') {
            this.think(`✅ Estimate approved for Job #${event.entityId} — learning from outcome`, 'action');
            if (event.data.lineItems) {
                this.learnFromOutcome(event.data.lineItems, true, event.data.carrier);
            }
        }
    }

    getStatus() {
        const learnings = this.recallByType('learning').length;
        const playbooks = this.recallByType('playbook').length;
        return {
            summary: `${playbooks} price books, ${learnings} outcome learnings`,
            health: 'idle' as const,
        };
    }
}
 
