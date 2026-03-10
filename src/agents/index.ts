// ── Agent Registry & Bootstrap ──────────────────────────────────────────────
// Registers all 7 agents with the orchestrator and initializes the system.
// This is the entry point — called once from server.ts during startup.
//
// Platform pillars:
//   ⚖️ ClaimSync           → Claims Strategist, Estimation Analyst
//   📸 Rapid Photo Report  → Photo Inspector
//   ⚡ TaskPro Core           → Operations Monitor, Comms Director,
//                             Scheduling Optimizer, Personal Assistant

import { orchestrator } from './orchestrator.ts';
import { ClaimsStrategistAgent } from './claims/index.ts';
import { PhotoInspectorAgent } from './photo/index.ts';
import { OperationsMonitorAgent } from './operations/index.ts';
import { CommunicationsDirectorAgent } from './communications/index.ts';
import { SchedulingOptimizerAgent } from './scheduling/index.ts';
import { EstimationAnalystAgent } from './estimation/index.ts';
import { PersonalAssistantAgent } from './personal/index.ts';
import { PLATFORM_NAME } from '../platform/platformIdentity.ts';

/**
 * Bootstrap the entire agent system.
 * Call once during server startup, after DB migrations have run.
 */
export function bootstrapAgents(): void {
    console.log('\n══════════════════════════════════════════════════════════════');
    console.log('  🚀 Agentic Platform Bootstrap');
    console.log(`  Platform: ${PLATFORM_NAME}`);
    console.log('  Pillars: TaskPro Core | Rapid Photo Report | ClaimSync');
    console.log('══════════════════════════════════════════════════════════════\n');

    // ── ClaimSync ──
    orchestrator.register(new ClaimsStrategistAgent());
    orchestrator.register(new EstimationAnalystAgent());

    // ── Rapid Photo Report ──
    orchestrator.register(new PhotoInspectorAgent());

    // ── TaskPro Core ──
    orchestrator.register(new OperationsMonitorAgent());
    orchestrator.register(new CommunicationsDirectorAgent());
    orchestrator.register(new SchedulingOptimizerAgent());
    orchestrator.register(new PersonalAssistantAgent());

    // Initialize all agents (subscribe to events, load memory)
    orchestrator.initializeAll();

    console.log('\n══════════════════════════════════════════════════════════════');
    console.log('  ✅ All 7 agents online');
    console.log('══════════════════════════════════════════════════════════════\n');
}

// Re-export for convenience
export { orchestrator } from './orchestrator.ts';
export { eventBus } from './eventBus.ts';
export { agentMemory } from './memory.ts';
export type { ThinkingStep, AgentId, AgentRequest, AgentResponse, CRMEvent } from './protocol.ts';
export { AGENT_MANIFESTS } from './protocol.ts';
 
