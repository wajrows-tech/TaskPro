// ── Claims Strategist Agent ─────────────────────────────────────────────────
// Pillar: ClaimSync
//
// Insurance claim lifecycle management, supplement strategy, adjuster profiling,
// and carrier negotiation intelligence. Absorbs the CRC ops_estimator role.

import { BaseAgent } from '../baseAgent.ts';
import { AGENT_MANIFESTS, type AgentRequest, type AgentResponse, type CRMEvent } from '../protocol.ts';
import { orchestrator } from '../orchestrator.ts';

const manifest = AGENT_MANIFESTS.find(m => m.id === 'claims_strategist')!;

export class ClaimsStrategistAgent extends BaseAgent {
    constructor() {
        super(manifest);
    }

    initialize(): void {
        // Subscribe to claim-relevant events
        this.subscribe([
            'job.created',
            'job.stage_changed',
            'estimate.approved',
            'estimate.created',
            'document.uploaded',
        ]);

        // Load carrier profiles from memory
        const carriers = this.recallByType('profile');
        if (carriers.length > 0) {
            this.think(`Loaded ${carriers.length} carrier profiles from memory`, 'reasoning');
        }
    }

    async handleRequest(request: AgentRequest): Promise<AgentResponse> {
        const { action, params } = request;
        const requestId = request.id;

        switch (action) {
            case 'analyze_claim': {
                return this.analyzeClaim(requestId, params);
            }
            case 'supplement_strategy': {
                return this.buildSupplementStrategy(requestId, params);
            }
            case 'profile_adjuster': {
                return this.profileAdjuster(requestId, params);
            }
            case 'claim_status_update': {
                return this.updateClaimStatus(requestId, params);
            }
            default: {
                // Natural language fallback — handle any claim-related request
                return this.handleNaturalLanguage(requestId, action, params);
            }
        }
    }

    private async analyzeClaim(requestId: string, params: any): Promise<AgentResponse> {
        this.think('📋 Analyzing insurance claim details...', 'reasoning');

        const jobId = params.jobId;
        const claimNumber = params.claimNumber || 'Unknown';
        const carrier = params.carrier || 'Unknown';

        // Check memory for carrier patterns
        const carrierProfile = this.recall(`carrier_${carrier.toLowerCase()}`);
        if (carrierProfile) {
            this.think(`Found carrier profile: ${carrier} — avg approval rate: ${carrierProfile.approvalRate || 'unknown'}`, 'reasoning');
        } else {
            this.think(`No prior history with carrier: ${carrier}. Starting fresh profile.`, 'reasoning');
        }

        // Analyze claim components
        this.think('Checking for common supplement opportunities...', 'reasoning');
        const supplementOpportunities = [
            'Drip edge replacement',
            'Ice & water shield underlayment',
            'Ridge vent replacement',
            'Pipe collar/boot replacement',
            'Deck repair (if rotted)',
            'Gutter apron reinstallation',
        ];

        // Request Photo Inspector for evidence if photos exist
        if (params.hasPhotos) {
            this.think('📸 Delegating to Photo Inspector for damage evidence...', 'delegation');
            const photoResponse = await orchestrator.delegate(
                this.id, 'photo_inspector',
                'generate_evidence_package',
                { jobId },
                requestId,
            );
            this.think(`Photo evidence package: ${photoResponse.status}`, 'result');
        }

        const result = {
            claim: { claimNumber, carrier, jobId },
            carrierHistory: carrierProfile || { firstEncounter: true },
            supplementOpportunities,
            recommendation: carrierProfile?.approvalRate > 0.7
                ? 'Carrier has high approval rate — submit full supplement upfront.'
                : 'Start with strongest items, follow up with secondary supplements.',
        };

        // Learn from this analysis
        this.remember('pattern', `claim_analysis_${jobId}`, { carrier, claimNumber, analyzed: new Date().toISOString() }, 0.6);

        return {
            requestId,
            fromAgent: this.id,
            status: 'completed',
            result,
            thinkingSteps: this.flushThinkingSteps(),
            timeMs: 0,
            confidence: 0.7,
        };
    }

    private async buildSupplementStrategy(requestId: string, params: any): Promise<AgentResponse> {
        this.think('⚖️ Building supplement strategy...', 'reasoning');

        const carrier = params.carrier || 'Unknown';
        const damageType = params.damageType || 'wind/hail';
        const initialEstimate = params.initialEstimate || 0;

        // Recall past supplement success rates
        const pastSupplements = this.recallByType('playbook')
            .filter((p: any) => p.carrier?.toLowerCase() === carrier.toLowerCase());

        if (pastSupplements.length > 0) {
            this.think(`Found ${pastSupplements.length} past supplement records for ${carrier}`, 'reasoning');
            const avgSuccess = pastSupplements.filter((p: any) => p.approved).length / pastSupplements.length;
            this.think(`Historical approval rate: ${(avgSuccess * 100).toFixed(0)}%`, 'reasoning');
        }

        this.think('Analyzing common missed line items for this damage type...', 'reasoning');

        const strategy = {
            carrier,
            damageType,
            phases: [
                {
                    phase: 1,
                    name: 'Initial Supplement',
                    items: ['Underlayment upgrade', 'Starter strip', 'Drip edge'],
                    urgency: 'Submit within 48 hours of initial inspection',
                },
                {
                    phase: 2,
                    name: 'Secondary Supplement',
                    items: ['Decking replacement', 'Flashing', 'Valley metal'],
                    urgency: 'Submit after tearoff reveals hidden damage',
                },
                {
                    phase: 3,
                    name: 'Final Reconciliation',
                    items: ['Debris removal', 'Permit fees', 'Code upgrades'],
                    urgency: 'Submit with final invoice',
                },
            ],
            tips: [
                `Document EVERYTHING with timestamped photos`,
                `Reference ITEL codes for material upgrades`,
                `Keep adjuster communication professional and documented`,
            ],
        };

        return {
            requestId,
            fromAgent: this.id,
            status: 'completed',
            result: strategy,
            thinkingSteps: this.flushThinkingSteps(),
            timeMs: 0,
            confidence: 0.65,
        };
    }

    private async profileAdjuster(requestId: string, params: any): Promise<AgentResponse> {
        const adjusterName = params.name || 'Unknown';
        this.think(`📊 Building profile for adjuster: ${adjusterName}`, 'reasoning');

        // Check existing profile
        const existing = this.recall(`adjuster_${adjusterName.toLowerCase().replace(/\s/g, '_')}`);
        if (existing) {
            this.think(`Found existing profile with ${existing.encounters || 0} past encounters`, 'reasoning');
        }

        const profile = existing || {
            name: adjusterName,
            carrier: params.carrier || 'Unknown',
            encounters: 0,
            approvedSupplements: 0,
            deniedSupplements: 0,
            avgResponseDays: null,
            notes: [],
        };

        // Update encounter count
        profile.encounters++;
        if (params.supplementApproved !== undefined) {
            if (params.supplementApproved) profile.approvedSupplements++;
            else profile.deniedSupplements++;
        }

        // Save updated profile
        const confidence = Math.min(0.9, 0.3 + (profile.encounters * 0.1));
        this.remember('profile', `adjuster_${adjusterName.toLowerCase().replace(/\s/g, '_')}`, profile, confidence);

        this.think(`Profile updated: ${profile.encounters} encounters, ${profile.approvedSupplements}/${profile.approvedSupplements + profile.deniedSupplements} supplements approved`, 'result');

        return {
            requestId,
            fromAgent: this.id,
            status: 'completed',
            result: profile,
            thinkingSteps: this.flushThinkingSteps(),
            timeMs: 0,
            confidence,
        };
    }

    private async updateClaimStatus(requestId: string, params: any): Promise<AgentResponse> {
        this.think(`📝 Updating claim status for Job #${params.jobId}`, 'action');

        this.remember('pattern', `claim_status_${params.jobId}`, {
            status: params.status,
            updatedAt: new Date().toISOString(),
            notes: params.notes,
        }, 0.7);

        return {
            requestId,
            fromAgent: this.id,
            status: 'completed',
            result: { updated: true },
            thinkingSteps: this.flushThinkingSteps(),
            timeMs: 0,
            confidence: 0.9,
        };
    }

    private async handleNaturalLanguage(requestId: string, intent: string, params: any): Promise<AgentResponse> {
        this.think(`🧠 Interpreting claim-related request: "${intent}"`, 'reasoning');

        const memory = this.getMemoryContext(10);
        this.think(`Using ${memory === '(No accumulated knowledge yet.)' ? 'no prior' : 'accumulated'} knowledge`, 'reasoning');

        return {
            requestId,
            fromAgent: this.id,
            status: 'completed',
            result: {
                interpretation: intent,
                agentMemory: memory,
                suggestion: 'I can help with claim analysis, supplement strategies, and adjuster profiling. What specific claim information do you need?',
            },
            thinkingSteps: this.flushThinkingSteps(),
            timeMs: 0,
            confidence: 0.5,
        };
    }

    onEvent(event: CRMEvent): void {
        switch (event.type) {
            case 'job.stage_changed':
                if (event.data.newStage === 'supplement') {
                    this.think(`🔔 Job #${event.entityId} entered supplement stage — preparing strategy`, 'reasoning');
                    this.remember('pattern', `supplement_trigger_${event.entityId}`, {
                        jobId: event.entityId,
                        triggeredAt: event.timestamp,
                    }, 0.6);
                }
                break;

            case 'estimate.approved':
                this.think(`✅ Estimate approved for Job #${event.entityId} — updating carrier profile`, 'action');
                if (event.data.carrier) {
                    const key = `carrier_${event.data.carrier.toLowerCase()}`;
                    const profile = this.recall(key) || { approvalRate: 0, totalClaims: 0 };
                    profile.totalClaims++;
                    profile.approvalRate = ((profile.approvalRate * (profile.totalClaims - 1)) + 1) / profile.totalClaims;
                    this.remember('profile', key, profile, 0.7);
                }
                break;
        }
    }

    getStatus() {
        const profiles = this.recallByType('profile').length;
        const patterns = this.recallByType('pattern').length;
        return {
            summary: `${profiles} carrier/adjuster profiles, ${patterns} claim patterns tracked`,
            health: 'idle' as const,
        };
    }
}
 
 
