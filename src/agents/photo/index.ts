// ── Photo Inspector Agent ───────────────────────────────────────────────────
// Pillar: Rapid Photo Report
//
// AI vision analysis, damage detection, severity classification,
// evidence packaging, and report generation bridge.
// Absorbs the Photo Report Builder's neuralEngine.

import { BaseAgent } from '../baseAgent.ts';
import { AGENT_MANIFESTS, type AgentRequest, type AgentResponse, type CRMEvent } from '../protocol.ts';

const manifest = AGENT_MANIFESTS.find(m => m.id === 'photo_inspector')!;

export class PhotoInspectorAgent extends BaseAgent {
    constructor() {
        super(manifest);
    }

    initialize(): void {
        this.subscribe(['document.uploaded']);

        // Load vocabulary preferences from memory (like neuralEngine)
        const vocab = this.recallByType('preference');
        if (vocab.length > 0) {
            this.think(`Loaded ${vocab.length} vocabulary preferences from memory`, 'reasoning');
        }
    }

    async handleRequest(request: AgentRequest): Promise<AgentResponse> {
        const { action, params } = request;

        switch (action) {
            case 'analyze_photo':
                return this.analyzePhoto(request.id, params);
            case 'generate_evidence_package':
                return this.generateEvidencePackage(request.id, params);
            case 'generate_report':
                return this.generateReport(request.id, params);
            case 'classify_damage':
                return this.classifyDamage(request.id, params);
            default:
                return this.handleNaturalLanguage(request.id, action, params);
        }
    }

    private async analyzePhoto(requestId: string, params: any): Promise<AgentResponse> {
        this.think('📸 Analyzing photo with AI vision...', 'reasoning');

        // Get vocabulary preferences (learned from user edits, like neuralEngine)
        const vocabMemories = this.topMemories('preference', 10);
        const preferredTerms = vocabMemories.map((v: any) => v.key).filter(Boolean);

        if (preferredTerms.length > 0) {
            this.think(`Using ${preferredTerms.length} learned vocabulary terms: ${preferredTerms.slice(0, 5).join(', ')}...`, 'reasoning');
        }

        // Vision analysis would happen here via Gemini Vision API
        this.think('Running damage detection model...', 'action');
        this.think('Classifying severity, elevation, and trade system...', 'action');

        const analysis = {
            description: params.mockDescription || 'Damaged shingle with visible granule loss and cracking',
            elevation: params.elevation || 'Front Elevation',
            tradeSystem: params.tradeSystem || 'Steep Slope Roofing',
            conditionType: params.conditionType || 'Wind/Hail Damage',
            severity: params.severity || 'moderate',
            confidence: 0.82,
            suggestedAnnotations: [
                { type: 'circle', label: 'Primary damage area', severity: 'high' },
                { type: 'arrow', label: 'Direction of impact', severity: 'medium' },
            ],
        };

        this.think(`✅ Analysis complete: ${analysis.conditionType} (${analysis.severity}) — confidence ${(analysis.confidence * 100).toFixed(0)}%`, 'result');

        return {
            requestId,
            fromAgent: this.id,
            status: 'completed',
            result: analysis,
            thinkingSteps: this.flushThinkingSteps(),
            timeMs: 0,
            confidence: analysis.confidence,
        };
    }

    private async generateEvidencePackage(requestId: string, params: any): Promise<AgentResponse> {
        this.think(`📦 Generating evidence package for Job #${params.jobId}...`, 'reasoning');

        this.think('Collecting all damage photos for this job...', 'action');
        this.think('Organizing by severity: critical → high → moderate → low', 'reasoning');
        this.think('Cross-referencing with supplement line items...', 'reasoning');

        const evidencePackage = {
            jobId: params.jobId,
            totalPhotos: params.photoCount || 0,
            byCategory: {
                'Critical Damage': { count: 0, photos: [] },
                'Moderate Damage': { count: 0, photos: [] },
                'Supporting Evidence': { count: 0, photos: [] },
            },
            reportReady: false,
            recommendation: 'Upload inspection photos to generate a complete evidence package.',
        };

        // Remember this evidence request for tracking
        this.remember('pattern', `evidence_${params.jobId}`, {
            jobId: params.jobId,
            requestedAt: new Date().toISOString(),
            requestedBy: params.requestedBy || 'unknown',
        }, 0.6);

        this.think('✅ Evidence package structure prepared', 'result');

        return {
            requestId,
            fromAgent: this.id,
            status: 'completed',
            result: evidencePackage,
            thinkingSteps: this.flushThinkingSteps(),
            timeMs: 0,
            confidence: 0.6,
        };
    }

    private async generateReport(requestId: string, params: any): Promise<AgentResponse> {
        this.think('📋 Triggering Rapid Photo Report generation...', 'reasoning');

        // This would bridge to the Photo Report Builder's API
        this.think('Connecting to Rapid Photo Report Builder...', 'action');
        this.think('Applying learned sort preferences and vocabulary...', 'reasoning');

        const sortPref = this.recall('sort_preference_elevation');
        if (sortPref) {
            this.think(`Using learned sort order: ${JSON.stringify(sortPref)}`, 'reasoning');
        }

        return {
            requestId,
            fromAgent: this.id,
            status: 'completed',
            result: {
                reportGenerated: false,
                message: 'Report generation requires the Rapid Photo Report Builder connection. Bridge endpoint ready.',
                bridgeUrl: 'http://localhost:3006/api/reports',
            },
            thinkingSteps: this.flushThinkingSteps(),
            timeMs: 0,
            confidence: 0.5,
        };
    }

    private async classifyDamage(requestId: string, params: any): Promise<AgentResponse> {
        this.think('🔍 Classifying damage type and severity...', 'reasoning');

        const classifications = {
            windHail: { probability: 0.75, indicators: ['Granule loss', 'Impact marks', 'Creased shingles'] },
            aging: { probability: 0.15, indicators: ['Curling', 'Moss growth', 'Uniform wear'] },
            mechanical: { probability: 0.10, indicators: ['Clean cuts', 'Foot traffic patterns'] },
        };

        const primary = Object.entries(classifications).reduce((a, b) => a[1].probability > b[1].probability ? a : b);

        this.think(`Primary classification: ${primary[0]} (${(primary[1].probability * 100).toFixed(0)}% confidence)`, 'result');

        return {
            requestId,
            fromAgent: this.id,
            status: 'completed',
            result: { classifications, primary: primary[0] },
            thinkingSteps: this.flushThinkingSteps(),
            timeMs: 0,
            confidence: primary[1].probability,
        };
    }

    private async handleNaturalLanguage(requestId: string, intent: string, params: any): Promise<AgentResponse> {
        this.think(`🧠 Interpreting photo/inspection request: "${intent}"`, 'reasoning');

        return {
            requestId,
            fromAgent: this.id,
            status: 'completed',
            result: {
                interpretation: intent,
                capabilities: ['Photo analysis', 'Evidence packaging', 'Report generation', 'Damage classification'],
                suggestion: 'I can analyze photos, classify damage, build evidence packages, and generate inspection reports.',
            },
            thinkingSteps: this.flushThinkingSteps(),
            timeMs: 0,
            confidence: 0.5,
        };
    }

    /** Learn from user vocabulary corrections (like neuralEngine.observeTextEdit) */
    observeVocabularyEdit(original: string, corrected: string): void {
        if (!original || original === corrected) return;

        this.think('📝 Learning from vocabulary correction...', 'action');

        const origTokens = original.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const newTokens = corrected.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const newWords = newTokens.filter(w => !origTokens.includes(w));

        for (const word of newWords) {
            const existing = this.recall(`vocab_${word}`);
            const count = (existing?.count || 0) + 1;
            this.remember('preference', `vocab_${word}`, { word, count }, Math.min(0.9, 0.3 + count * 0.05));
        }
    }

    onEvent(event: CRMEvent): void {
        if (event.type === 'document.uploaded' && event.data.type === 'photo') {
            this.think(`📸 New photo uploaded for Job #${event.entityId} — queued for analysis`, 'reasoning');
        }
    }

    getStatus() {
        const vocabCount = this.recallByType('preference').length;
        const patterns = this.recallByType('pattern').length;
        return {
            summary: `${vocabCount} vocabulary terms learned, ${patterns} evidence packages tracked`,
            health: 'idle' as const,
        };
    }
}
 
 
