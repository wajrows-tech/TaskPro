import { GoogleGenAI, LiveServerMessage, Modality, Type } from "@google/genai";

export class LiveGeminiService {
  private ai: any;
  private session: any;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private audioQueue: Float32Array[] = [];
  private isPlaying = false;
  private tools: any[] = [];

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'AIzaSyCYIe1Y5JvLmnx7xych7xLdLuH4_gjzoWc' });
    this.tools = [
      {
        functionDeclarations: [
          // ── JOB TOOLS ──
          {
            name: "create_job",
            description: "Create a new Job record in the CRM. Always default stage to 'lead' unless specified.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: "Homeowner name or job name" },
                address: { type: Type.STRING, description: "Job site address" },
                city: { type: Type.STRING, description: "City" },
                state: { type: Type.STRING, description: "State" },
                zip: { type: Type.STRING, description: "ZIP code" },
                stage: { type: Type.STRING, description: "Pipeline stage (default: lead). Options: lead, inspection, estimate, scope_approval, contract_signed, material_order, production, supplement, final_invoice, complete, closed, canceled" },
                type: { type: Type.STRING, description: "Job type: residential, commercial, insurance, retail, other" },
                estimatedValue: { type: Type.NUMBER, description: "Estimated project value in dollars" },
                insuranceClaim: { type: Type.STRING, description: "Insurance claim number" },
                deductible: { type: Type.NUMBER, description: "Deductible amount" },
                assignedTo: { type: Type.STRING, description: "Sales rep or project manager name" },
                description: { type: Type.STRING, description: "Job description or notes" },
                roofType: { type: Type.STRING, description: "Roof type: shingle, tile, flat, metal, etc." },
                source: { type: Type.STRING, description: "Lead source: referral, door_knock, online, etc." },
              },
              required: ["name"]
            }
          },
          {
            name: "update_job",
            description: "Update any fields on an existing Job. You can provide EITHER jobId OR jobName — the system will auto-resolve the name to an ID.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                jobId: { type: Type.NUMBER, description: "The ID of the Job (optional if jobName is provided)" },
                jobName: { type: Type.STRING, description: "The homeowner/job name to look up (alternative to jobId)" },
                name: { type: Type.STRING },
                address: { type: Type.STRING },
                city: { type: Type.STRING },
                state: { type: Type.STRING },
                zip: { type: Type.STRING },
                stage: { type: Type.STRING },
                type: { type: Type.STRING },
                estimatedValue: { type: Type.NUMBER },
                insuranceClaim: { type: Type.STRING },
                deductible: { type: Type.NUMBER },
                assignedTo: { type: Type.STRING },
                description: { type: Type.STRING },
                roofType: { type: Type.STRING },
                source: { type: Type.STRING },
              },
              required: []
            }
          },
          {
            name: "move_job_stage",
            description: "Move a job to a new pipeline stage. Provide EITHER jobId OR jobName.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                jobId: { type: Type.NUMBER, description: "The Job ID (optional if jobName is provided)" },
                jobName: { type: Type.STRING, description: "The homeowner/job name to look up" },
                stage: { type: Type.STRING, description: "New stage: lead, inspection, estimate, scope_approval, contract_signed, material_order, production, supplement, final_invoice, complete, closed, canceled" },
              },
              required: ["stage"]
            }
          },
          {
            name: "delete_job",
            description: "Delete a Job record permanently. Provide EITHER jobId OR jobName.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                jobId: { type: Type.NUMBER, description: "The Job ID (optional if jobName is provided)" },
                jobName: { type: Type.STRING, description: "The homeowner/job name" },
                reason: { type: Type.STRING, description: "Reason for deletion" }
              },
              required: ["reason"]
            }
          },
          {
            name: "get_jobs",
            description: "Get a list of all jobs to answer questions about them.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                query: { type: Type.STRING, description: "Optional search query to filter jobs by name or address" }
              }
            }
          },
          {
            name: "get_job_summary",
            description: "Get a full detail digest of a specific job. Provide EITHER jobId OR jobName.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                jobId: { type: Type.NUMBER, description: "The Job ID (optional if jobName is provided)" },
                jobName: { type: Type.STRING, description: "The homeowner/job name" },
              },
              required: []
            }
          },

          // ── CONTACT TOOLS ──
          {
            name: "create_contact",
            description: "Create a new contact in the CRM.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                firstName: { type: Type.STRING, description: "First name" },
                lastName: { type: Type.STRING, description: "Last name" },
                role: { type: Type.STRING, description: "Role: homeowner, adjuster, appraiser, subcontractor, supplier, sales_rep, project_manager, other" },
                company: { type: Type.STRING, description: "Company name" },
                email: { type: Type.STRING, description: "Email address" },
                phone: { type: Type.STRING, description: "Phone number" },
                address: { type: Type.STRING, description: "Address" },
                notes: { type: Type.STRING, description: "Notes about this contact" },
              },
              required: ["firstName", "role"]
            }
          },
          {
            name: "get_contacts",
            description: "Get all contacts, optionally filtered by role.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                role: { type: Type.STRING, description: "Filter by role: homeowner, adjuster, appraiser, subcontractor, supplier. Omit for all." }
              }
            }
          },
          {
            name: "link_contact_to_job",
            description: "Link a contact to a job with a role.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                jobId: { type: Type.NUMBER, description: "Job ID" },
                contactId: { type: Type.NUMBER, description: "Contact ID" },
                role: { type: Type.STRING, description: "Role on this job (e.g. 'homeowner', 'adjuster')" }
              },
              required: ["jobId", "contactId"]
            }
          },
          {
            name: "unlink_contact_from_job",
            description: "Remove a contact link from a job.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                jobId: { type: Type.NUMBER, description: "Job ID" },
                contactId: { type: Type.NUMBER, description: "Contact ID" }
              },
              required: ["jobId", "contactId"]
            }
          },

          // ── TASK TOOLS ──
          {
            name: "create_task",
            description: "Create a new task, optionally assigned to a Job.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "Task title" },
                description: { type: Type.STRING, description: "Task description" },
                jobId: { type: Type.NUMBER, description: "Job ID to assign this task to" },
                priority: { type: Type.STRING, description: "Priority: low, medium, high, urgent" },
                action: { type: Type.STRING, description: "Action type: inspect, call, email, text, schedule, order, invoice, follow_up, document, meeting, other" },
                status: { type: Type.STRING, description: "Status: todo, in_progress, waiting_on, done" },
                scheduledDate: { type: Type.STRING, description: "Scheduled date in YYYY-MM-DD format" },
                assignedTo: { type: Type.STRING, description: "Person assigned to this task" },
              },
              required: ["title"]
            }
          },
          {
            name: "update_task",
            description: "Update fields on an existing task.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                taskId: { type: Type.NUMBER, description: "The ID of the task to update" },
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                priority: { type: Type.STRING },
                action: { type: Type.STRING },
                status: { type: Type.STRING },
                jobId: { type: Type.NUMBER },
                scheduledDate: { type: Type.STRING },
                assignedTo: { type: Type.STRING },
              },
              required: ["taskId"]
            }
          },
          {
            name: "complete_task",
            description: "Mark a task as done.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                taskId: { type: Type.NUMBER, description: "The task ID to complete" },
              },
              required: ["taskId"]
            }
          },
          {
            name: "delete_task",
            description: "Delete a task permanently.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                taskId: { type: Type.NUMBER, description: "The ID of the task to delete" },
              },
              required: ["taskId"]
            }
          },

          // ── COMMUNICATION TOOLS ──
          {
            name: "log_communication",
            description: "Log a communication entry (email, call, text, meeting, note) for a Job. Provide EITHER jobId OR jobName.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                jobId: { type: Type.NUMBER, description: "Job ID (optional if jobName is provided)" },
                jobName: { type: Type.STRING, description: "The homeowner/job name" },
                contactId: { type: Type.NUMBER, description: "Contact ID (optional)" },
                channel: { type: Type.STRING, description: "Channel: email, call, text, meeting, note, letter" },
                direction: { type: Type.STRING, description: "Direction: inbound or outbound" },
                subject: { type: Type.STRING, description: "Subject line" },
                body: { type: Type.STRING, description: "Content of the communication" },
              },
              required: ["body"]
            }
          },
          {
            name: "create_note",
            description: "Create a note in the system history.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                content: { type: Type.STRING, description: "Note content" },
                type: { type: Type.STRING, description: "Note type: general, history, development, bug, agent" },
                jobId: { type: Type.NUMBER, description: "Optional Job ID to link to" },
              },
              required: ["content"]
            }
          },

          // ── ESTIMATE TOOLS ──
          {
            name: "create_estimate",
            description: "Create an estimate for a job with line items. Provide EITHER jobId OR jobName.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                jobId: { type: Type.NUMBER, description: "Job ID (optional if jobName is provided)" },
                jobName: { type: Type.STRING, description: "The homeowner/job name" },
                lineItems: { type: Type.STRING, description: "JSON array of line items: [{description, quantity, unitPrice, total}]" },
                subtotal: { type: Type.NUMBER, description: "Subtotal amount" },
                tax: { type: Type.NUMBER, description: "Tax amount" },
                total: { type: Type.NUMBER, description: "Total amount" },
                notes: { type: Type.STRING, description: "Estimate notes" },
              },
              required: ["lineItems", "total"]
            }
          },

          // ── DATA QUERY ──
          {
            name: "query_data",
            description: "Run a SQL query against the database to look up any information. Tables: jobs, contacts, job_contacts, tasks, subtasks, task_dependencies, communications, documents, estimates, notes.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                sql: { type: Type.STRING, description: "SQL SELECT query" },
                reason: { type: Type.STRING, description: "Why you need this data" },
              },
              required: ["sql", "reason"]
            }
          },

          // ── DEPENDENCIES (Project Map) ──
          {
            name: "link_tasks",
            description: "Create a dependency between two tasks. taskId depends on dependsOnTaskId.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                taskId: { type: Type.NUMBER, description: "The task that has the dependency (must wait)" },
                dependsOnTaskId: { type: Type.NUMBER, description: "The prerequisite task" },
              },
              required: ["taskId", "dependsOnTaskId"]
            }
          },
          {
            name: "unlink_tasks",
            description: "Remove a dependency between two tasks.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                taskId: { type: Type.NUMBER, description: "The dependent task" },
                dependsOnTaskId: { type: Type.NUMBER, description: "The prerequisite task to unlink" },
              },
              required: ["taskId", "dependsOnTaskId"]
            }
          },

          // ── CALENDAR / SCHEDULING ──
          {
            name: "schedule_task",
            description: "Schedule or reschedule a task. Provide EITHER taskId OR taskTitle.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                taskId: { type: Type.NUMBER, description: "The task ID (optional if taskTitle is provided)" },
                taskTitle: { type: Type.STRING, description: "The task title to look up" },
                date: { type: Type.STRING, description: "Date in YYYY-MM-DD format" },
                timeSlot: { type: Type.STRING, description: "Optional time description like 'morning', 'afternoon', '9am'" },
              },
              required: ["date"]
            }
          },

          // ── NAVIGATION ──
          {
            name: "navigate_to",
            description: "Navigate to a specific screen or tab in the application.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                tab: { type: Type.STRING, description: "Tab: dashboard, jobs, contacts, tasks, planner, comms, assistant, history, map" },
                entityId: { type: Type.NUMBER, description: "Optional ID of entity to open" },
                entityType: { type: Type.STRING, description: "Optional: 'job' or 'task'" }
              },
              required: ["tab"]
            }
          },

          // ── SEARCH ──
          {
            name: "search_jobs",
            description: "Search jobs by any field — name, address, stage, assignedTo, etc.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                query: { type: Type.STRING, description: "Search term" },
                stage: { type: Type.STRING, description: "Filter by stage" },
                assignedTo: { type: Type.STRING, description: "Filter by assigned person" },
              },
              required: ["query"]
            }
          },
          {
            name: "search_contacts",
            description: "Search contacts by name, role, company, etc.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                query: { type: Type.STRING, description: "Search term" },
                role: { type: Type.STRING, description: "Filter by role" },
              },
              required: ["query"]
            }
          },

          // ── UTILITY ──
          {
            name: "report_bug",
            description: "Report a bug or limitation encountered during the session.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                userRequest: { type: Type.STRING, description: "What the user asked for" },
                whatFailed: { type: Type.STRING, description: "What went wrong" },
                suggestedFix: { type: Type.STRING, description: "Suggested code fix" },
                severity: { type: Type.STRING, description: "Bug severity: low, medium, high, critical" },
              },
              required: ["userRequest", "whatFailed", "suggestedFix"]
            }
          },
          {
            name: "close_agent",
            description: "Close the voice agent window. Use when the user says they are done.",
            parameters: {
              type: Type.OBJECT,
              properties: {}
            }
          },

          // ── AGENTIC PLATFORM TOOLS ──
          {
            name: "agent_delegate",
            description: "Delegate a task to a specialized AI sub-agent. Available agents: claims_strategist (insurance claims, supplements, adjusters), estimation_analyst (line items, pricing, margins), photo_inspector (damage photos, evidence, reports), operations_monitor (pipeline, bottlenecks, daily briefing), communications_director (email drafts, SMS, templates), scheduling_optimizer (calendar, crew scheduling), personal_assistant (general queries, delegation). Use this when the user asks about claims, estimates, photos, pipeline, scheduling, or communications — let the specialist handle it.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                agentId: { type: Type.STRING, description: "Target agent: claims_strategist, estimation_analyst, photo_inspector, operations_monitor, communications_director, scheduling_optimizer, personal_assistant" },
                action: { type: Type.STRING, description: "What to ask the agent to do (e.g., 'analyze_claim', 'suggest_line_items', 'daily_briefing', 'draft_email')" },
                params: { type: Type.STRING, description: "JSON string of parameters for the agent (e.g., '{\"jobId\": 1, \"squareFootage\": 2500}')" },
                intent: { type: Type.STRING, description: "Natural language description of what's needed (for smart routing if agentId is unknown)" },
              },
              required: ["action"]
            }
          },
          {
            name: "agent_status",
            description: "Get the real-time status of all 7 AI sub-agents across TaskPro OS, Rapid Photo Report, and TaskPro. Shows what each agent knows, how many memories they have, and what they're tracking.",
            parameters: {
              type: Type.OBJECT,
              properties: {}
            }
          },
        ]
      }
    ];
  }

  async connect(callbacks: {
    onText?: (text: string) => void;
    onUserTranscript?: (text: string) => void;
    onInterrupted?: () => void;
    onError?: (err: any) => void;
    onClose?: () => void;
    onToolCall?: (toolCall: any) => Promise<any>;
  }) {
    try {
      const apiKey = localStorage.getItem('geminiApiKey') || process.env.GEMINI_API_KEY || 'AIzaSyCYIe1Y5JvLmnx7xych7xLdLuH4_gjzoWc';
      if (!apiKey) {
        throw new Error("No Gemini API Key found. Please add it via Settings.");
      }
      this.ai = new GoogleGenAI({ apiKey });
      this.session = await this.ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        callbacks: {
          onopen: () => {
            console.log("Live session opened");
            this.startMic(callbacks.onError);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle model audio output
            if (message.serverContent?.modelTurn?.parts) {
              for (const part of message.serverContent.modelTurn.parts) {
                if (part.inlineData?.data) {
                  this.handleAudioOutput(part.inlineData.data);
                }
                if (part.text) {
                  callbacks.onText?.(part.text);
                }
              }
            }

            // Handle user input transcription
            const anyMessage = message as any;
            if (anyMessage.serverContent?.inputTranscription?.text) {
              callbacks.onUserTranscript?.(anyMessage.serverContent.inputTranscription.text);
            }
            if (anyMessage.inputTranscription?.text) {
              callbacks.onUserTranscript?.(anyMessage.inputTranscription.text);
            }

            // Check for tool calls
            if (message.toolCall) {
              const response = await callbacks.onToolCall?.(message.toolCall);
              if (response) {
                this.session.sendToolResponse(response);
              }
            }

            // Handle interruption
            if (message.serverContent?.interrupted) {
              this.stopPlayback();
              callbacks.onInterrupted?.();
            }
          },
          onerror: (err: any) => {
            console.error("Live session error:", err);
            callbacks.onError?.(err);
          },
          onclose: () => {
            console.log("Live session closed");
            this.stopMic();
            callbacks.onClose?.();
          }
        },
        config: {
          tools: this.tools,
          responseModalities: [Modality.AUDIO],
          outputAudioTranscription: {},
          inputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: `You are an OMNIPOTENT CRM Agent for a roofing company CRM called TaskPro.
You are directly speaking to the roofing sales rep or production manager.
You have FULL CONTROL over the entire CRM: jobs, contacts, tasks, communications, estimates, schedules, and dependencies.

YOUR CAPABILITIES:
1. CREATE/UPDATE/DELETE jobs — full pipeline management (lead → inspection → estimate → scope_approval → contract_signed → material_order → production → supplement → final_invoice → complete → closed → canceled)
2. CREATE/UPDATE/DELETE contacts — homeowners, adjusters, appraisers, subcontractors, suppliers
3. LINK contacts to jobs with roles
4. CREATE/UPDATE/DELETE tasks — linked to jobs, with action types, priorities, scheduling
5. COMPLETE tasks instantly
6. LOG communications — email, call, text, meeting, note, letter — with direction (inbound/outbound)
7. CREATE estimates with line items for jobs
8. SCHEDULE tasks on the calendar/planner
9. LINK task dependencies for the Project Map
10. NAVIGATE anywhere — dashboard, jobs board, contacts, tasks, planner, comms, history, map
11. QUERY the database directly with SQL
12. SEARCH jobs and contacts by any field
13. GET full job summaries with all linked data
14. REPORT bugs when something goes wrong

**DATABASE COLUMN NAMES (use exactly these in SQL queries):**
- jobs: id, jobNumber, name, address, city, state, zip, stage, type, estimatedValue, insuranceClaim, deductible, assignedTo, description, roofType, source, createdAt, updatedAt
- contacts: id, firstName, lastName, role, company, email, phone, address, notes, createdAt
- job_contacts: id, jobId, contactId, role
- tasks: id, jobId, contactId, title, description, status, priority, action, assignedTo, scheduledDate, startTime, duration, waitingOn, isAutoGenerated, createdAt, updatedAt
- subtasks: id, taskId, title, isCompleted, createdAt
- task_dependencies: id, taskId, dependsOnTaskId
- communications: id, jobId, contactId, channel, direction, subject, body, scheduledAt, sentAt, createdAt
- documents: id, jobId, name, type, filePath, fileSize, createdAt
- estimates: id, jobId, lineItems, subtotal, tax, total, status, notes, createdAt, updatedAt
- notes: id, jobId, contactId, content, type, createdAt

**SESSION MEMORY:** When you create a job, task, contact, or estimate, the tool response includes the REAL ID. Read and use these IDs for follow-up operations. The response also includes _sessionMemory listing all recently created entities.

CRITICAL RULES:
- **USE NAMES, NOT IDs.** You do NOT need to know numeric IDs. Use jobName/taskTitle parameters instead — the system auto-resolves names to IDs. For example: move_job_stage({jobName: "Smith", stage: "inspection"}).
- If you DO have an ID from a previous tool response, you can use it directly.
- EXECUTE ALL ACTIONS IMMEDIATELY. Do NOT say "I can't do that." Just DO IT.
- When creating a Job, default stage to 'lead' unless told otherwise.
- After EVERY action, concisely confirm: "Done. Created Johnson job at 123 Oak St."
- ALWAYS log a communication when you create/update/delete anything on a Job.
- Be FAST. SHORT, DIRECT sentences. No filler.
- **SPEECH-TO-TEXT WARNING:** Names may be misheard. Be FLEXIBLE with name matching. If "Smith" doesn't work, try "Smyth" or similar. The system does fuzzy matching for you.
- For navigation: 'jobs' = jobs board, 'planner' = calendar, 'map' = project map, 'comms' = communications center.
- "calendar", "day planner", "planner", and "schedule" ALL mean the planner tab.
- **SCHEDULING:** Use 'schedule_task' with taskTitle (name of the task) — no ID needed.
- **DUPLICATE PREVENTION:** Before creating a task, check if similar task exists. Update instead of duplicating.
- **BUG REPORTING:** When ANY action fails, ALWAYS use 'report_bug' to log it.

## SUB-AGENT DELEGATION:
You have 7 specialized AI sub-agents. Use 'agent_delegate' to invoke them for expert help:
- **claims_strategist** — Insurance claims, supplement strategies, adjuster profiling. Use for: "analyze this claim", "supplement strategy", "adjuster profile"
- **estimation_analyst** — Line item suggestions, pricing, margin analysis. Use for: "suggest line items for 2500 sqft roof", "check margins"
- **photo_inspector** — Damage photo analysis, evidence packaging, report generation. Use for: "analyze damage photos", "build evidence package"
- **operations_monitor** — Pipeline health, bottleneck detection, daily briefings, SLA tracking. Use for: "daily briefing", "pipeline analysis", "stale jobs"
- **communications_director** — Email/SMS drafting, template management, follow-up suggestions. Use for: "draft email to adjuster", "follow-up suggestions"
- **scheduling_optimizer** — Calendar sync, crew scheduling, conflict detection. Use for: "optimize schedule", "find best time slot"
- **personal_assistant** — General queries, multi-agent delegation. Use for: "what's on my plate", general questions

Use 'agent_status' to check all agents' status. ALWAYS delegate to specialists when the topic matches — your sub-agents have persistent memory, learning, and confidence scoring.

`,
        },
      });
    } catch (err) {
      console.error("Failed to connect to Live API:", err);
      throw err;
    }
  }

  private async startMic(onError?: (err: any) => void) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = new AudioContext({ sampleRate: 16000 });
      this.source = this.audioContext.createMediaStreamSource(stream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
        }
        const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));

        if (this.session) {
          this.session.sendRealtimeInput({
            media: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
          });
        }
      };

      this.source.connect(this.processor);
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = 0;
      this.processor.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

    } catch (err) {
      console.error("Error starting microphone:", err);
      onError?.(err);
      this.disconnect();
    }
  }

  private stopMic() {
    if (this.source) { this.source.disconnect(); this.source = null; }
    if (this.processor) { this.processor.disconnect(); this.processor = null; }
    if (this.audioContext) { this.audioContext.close(); this.audioContext = null; }
  }

  private handleAudioOutput(base64Audio: string) {
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const pcmData = new Int16Array(bytes.buffer);
    const floatData = new Float32Array(pcmData.length);
    for (let i = 0; i < pcmData.length; i++) {
      floatData[i] = pcmData[i] / 0x7FFF;
    }
    this.audioQueue.push(floatData);
    if (!this.isPlaying) {
      this.playNextChunk();
    }
  }

  private outputContext: AudioContext | null = null;
  private nextPlayTime = 0;

  private async playNextChunk() {
    if (this.audioQueue.length === 0) { this.isPlaying = false; return; }
    this.isPlaying = true;
    if (!this.outputContext) {
      this.outputContext = new AudioContext();
      this.nextPlayTime = this.outputContext.currentTime;
    }
    while (this.audioQueue.length > 0) {
      const chunk = this.audioQueue.shift()!;
      const buffer = this.outputContext.createBuffer(1, chunk.length, 24000);
      buffer.getChannelData(0).set(chunk);
      const source = this.outputContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.outputContext.destination);
      const startTime = Math.max(this.outputContext.currentTime, this.nextPlayTime);
      source.start(startTime);
      this.nextPlayTime = startTime + buffer.duration;
    }
    this.isPlaying = false;
  }

  private stopPlayback() {
    this.audioQueue = [];
    this.isPlaying = false;
    if (this.outputContext) { this.outputContext.close(); this.outputContext = null; }
    this.nextPlayTime = 0;
  }

  disconnect() {
    if (this.session) { this.session.close(); this.session = null; }
    this.stopMic();
    this.stopPlayback();
  }
}

export const liveGemini = new LiveGeminiService();
