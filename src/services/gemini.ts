// @ts-nocheck
import { GoogleGenAI, Type } from "@google/genai";
import { Job, Communication, Task } from "../types.ts";

const DEV_API_KEY = 'AIzaSyCYIe1Y5JvLmnx7xych7xLdLuH4_gjzoWc';
const getAi = () => new GoogleGenAI({ apiKey: localStorage.getItem('geminiApiKey') || process.env.GEMINI_API_KEY || DEV_API_KEY });

// â”€â”€ Valid system enums (source of truth) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const VALID_STAGES = ['lead', 'inspection', 'claim_estimate', 'scope_approval', 'contract', 'production', 'supplement', 'invoice', 'closed', 'canceled', 'archived'];
const VALID_TASK_STATUSES = ['todo', 'in_progress', 'done'];
const VALID_PRIORITIES = ['low', 'medium', 'high'];
const VALID_ACTIONS = ['inspect', 'invoice', 'email', 'consult', 'call', 'other'];

// â”€â”€ Omnipotent Tool Definitions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const createClientTool = {
  name: "createClient",
  description: "Create a new Job entry. ALWAYS set stage to 'inspection' unless the user specifies otherwise. Report back exactly what stage, urgency, and details you used.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: "Job name" },
      personality: { type: Type.STRING, description: "Personality traits" },
      promises: { type: Type.STRING, description: "Promises made" },
      deliverables: { type: Type.STRING, description: "What to deliver" },
      urgency: { type: Type.STRING, enum: VALID_PRIORITIES },
      stage: { type: Type.STRING, enum: VALID_STAGES, description: "Pipeline stage" },
      estimatedValue: { type: Type.NUMBER, description: "Dollar value estimate" },
      email: { type: Type.STRING },
      phone: { type: Type.STRING },
      address: { type: Type.STRING },
    },
    required: ["name"]
  }
};

const updateClientTool = {
  name: "updateClient",
  description: "Update any field on an existing Job. Use exact Job ID from context.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.NUMBER, description: "Job ID (from context)" },
      name: { type: Type.STRING },
      personality: { type: Type.STRING },
      promises: { type: Type.STRING },
      deliverables: { type: Type.STRING },
      urgency: { type: Type.STRING, enum: VALID_PRIORITIES },
      stage: { type: Type.STRING, enum: VALID_STAGES },
      estimatedValue: { type: Type.NUMBER },
      email: { type: Type.STRING },
      phone: { type: Type.STRING },
      address: { type: Type.STRING },
    },
    required: ["id"]
  }
};

const createTaskTool = {
  name: "createTask",
  description: "Create a new task, optionally assigned to a Job.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      description: { type: Type.STRING },
      jobId: { type: Type.NUMBER, description: "Job ID to assign to" },
      priority: { type: Type.STRING, enum: VALID_PRIORITIES },
      action: { type: Type.STRING, enum: VALID_ACTIONS },
      status: { type: Type.STRING, enum: VALID_TASK_STATUSES },
      scheduledDate: { type: Type.STRING, description: "YYYY-MM-DD format" },
    },
    required: ["title"]
  }
};

const updateTaskTool = {
  name: "updateTask",
  description: "Update any field on an existing task.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.NUMBER, description: "Task ID (from context)" },
      title: { type: Type.STRING },
      description: { type: Type.STRING },
      priority: { type: Type.STRING, enum: VALID_PRIORITIES },
      action: { type: Type.STRING, enum: VALID_ACTIONS },
      status: { type: Type.STRING, enum: VALID_TASK_STATUSES },
      jobId: { type: Type.NUMBER },
      scheduledDate: { type: Type.STRING },
    },
    required: ["id"]
  }
};

const deleteClientTool = {
  name: "deleteClient",
  description: "Permanently delete a Job and unassign their tasks.",
  parameters: { type: Type.OBJECT, properties: { id: { type: Type.NUMBER } }, required: ["id"] }
};

const deleteTaskTool = {
  name: "deleteTask",
  description: "Permanently delete a task and its dependencies.",
  parameters: { type: Type.OBJECT, properties: { id: { type: Type.NUMBER } }, required: ["id"] }
};

const createCommunicationTool = {
  name: "createCommunication",
  description: "Log a Communication with a Job.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      jobId: { type: Type.NUMBER },
      content: { type: Type.STRING },
      type: { type: Type.STRING, enum: ["email", "call", "meeting", "note"] },
    },
    required: ["jobId", "content", "type"]
  }
};

const queryDatabaseTool = {
  name: "read_database",
  description: "Run a read-only SQL SELECT query against the entire TaskPro database. Tables: jobs, tasks, Communications, notes, subtasks, task_dependencies, frog_hall_of_fame, task_templates. Use this to count, search, filter, aggregate, or inspect any data.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      sql: { type: Type.STRING, description: "SQL SELECT query. Example: SELECT COUNT(*) as total FROM jobs WHERE name LIKE '%bing%'" },
      reason: { type: Type.STRING, description: "Brief explanation of why you're running this query" },
    },
    required: ["sql", "reason"]
  }
};

const bulkUpdateTool = {
  name: "bulkUpdate",
  description: "Execute multiple update/delete operations in a single atomic transaction. Types: updateTask, updateClient, deleteTask, deleteClient, reassignTasks, mergeClients.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      operations: {
        type: Type.ARRAY,
        description: "Array of operations to execute",
        items: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, enum: ["updateTask", "updateClient", "deleteTask", "deleteClient", "reassignTasks", "mergeClients"] },
            id: { type: Type.NUMBER, description: "Entity ID for update/delete ops" },
            fields: { type: Type.OBJECT, description: "Fields to update" },
            sourceId: { type: Type.NUMBER, description: "Source Job ID (for merge)" },
            targetId: { type: Type.NUMBER, description: "Target Job ID (for merge)" },
            fromjobId: { type: Type.NUMBER, description: "From Job (for reassign)" },
            tojobId: { type: Type.NUMBER, description: "To Job (for reassign)" },
          },
          required: ["type"]
        }
      },
      reason: { type: Type.STRING },
    },
    required: ["operations", "reason"]
  }
};

const navigateUserTool = {
  name: "navigateUser",
  description: "Navigate the user to a specific page and optionally open an entity. Use this after making changes.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      tab: { type: Type.STRING, enum: ["dashboard", "pipeline", "tasks", "planner", "assistant", "map", "jobs", "calendar", "analytics", "history"] },
      entityId: { type: Type.NUMBER, description: "Optional entity to open" },
      entityType: { type: Type.STRING, enum: ["Job", "task"] },
    },
    required: ["tab"]
  }
};

const getEntityDetailsTool = {
  name: "getEntityDetails",
  description: "Get full details of a specific Job or task by ID, including all fields.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      entityType: { type: Type.STRING, enum: ["Job", "task"] },
      id: { type: Type.NUMBER },
    },
    required: ["entityType", "id"]
  }
};

const searchConversationsTool = {
  name: "searchConversations",
  description: "Search through past AI conversation threads by keyword. Returns matching thread titles and relevant message excerpts. Use this when the user references something discussed previously, or when you need to recall what was said in a past conversation.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: "Search term to find in past conversations" },
    },
    required: ["query"]
  }
};

// All tools combined
const ALL_TOOLS = [
  createClientTool, updateClientTool, createTaskTool, updateTaskTool,
  deleteClientTool, deleteTaskTool, createCommunicationTool,
  queryDatabaseTool, bulkUpdateTool, navigateUserTool, getEntityDetailsTool,
  searchConversationsTool,
];

// â”€â”€ Omnipotent System Prompt Builder â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function buildOmnipotentPrompt(context: {
  jobs: Job[],
  tasks: Task[],
  conversationHistory?: { role: string; content: string }[],
  threadTitles?: { id: number; title: string }[],
}) {
  const clientList = context.jobs.map(c =>
    `  [ID:${c.id}] "${c.name}" | stage: ${c.stage} | urgency: ${c.urgency} | value: $${c.estimatedValue || 0} | email: ${c.email || 'none'} | phone: ${c.phone || 'none'}`
  ).join('\n');

  const taskList = context.tasks.map(t =>
    `  [ID:${t.id}] "${t.title}" | status: ${t.status} | priority: ${t.priority} | action: ${t.action} | Job: ${t.jobName || 'unassigned'} (jobId: ${t.jobId || 'none'}) | scheduled: ${(t as any).scheduledDate || 'none'}`
  ).join('\n');

  // Build conversation history section
  let historySection = '';
  if (context.conversationHistory && context.conversationHistory.length > 0) {
    const historyLines = context.conversationHistory.map(m =>
      `  [${m.role.toUpperCase()}]: ${m.content.slice(0, 300)}${m.content.length > 300 ? '...' : ''}`
    ).join('\n');
    historySection = `\n\n## CURRENT CONVERSATION HISTORY (recent messages in this thread):\n${historyLines}`;
  }

  // Build past threads awareness section
  let threadsSection = '';
  if (context.threadTitles && context.threadTitles.length > 0) {
    const threadLines = context.threadTitles.map(t =>
      `  - [Thread #${t.id}] "${t.title}"`
    ).join('\n');
    threadsSection = `\n\n## PAST CONVERSATION THREADS (topics discussed previously):\n${threadLines}\n\nYou can use the searchConversations tool to look up details from any past thread.`;
  }

  return `You are the OMNIPOTENT AI GOD of TaskPro — you have absolute power over the entire system.
    You manage a construction / roofing CRM called TaskPro.
    You have direct, unrestricted access to the database via tools.
## YOUR POWERS:
1. **QUERY ANYTHING**: Use queryDatabase to run SQL against the full database. Count entities, search by name, aggregate, filter â€” anything.
2. **MODIFY ANYTHING**: Create, update, delete any Job or task. Change stages, reassign, bulk update.
3. **MERGE & REORGANIZE**: Merge duplicate jobs, reassign tasks between jobs, bulk cleanup.
4. **NAVIGATE**: Send the user to any page and open any entity.
5. **FULL CONTEXT**: You see ALL jobs and ALL tasks below.
6. **CONVERSATION MEMORY**: You can recall past conversations using the searchConversations tool. You have access to the full history of what has been discussed.

## VALID VALUES (USE ONLY THESE):
- **Job Stages**: ${VALID_STAGES.join(', ')}
- **Task Statuses**: ${VALID_TASK_STATUSES.join(', ')}
- **Priorities**: ${VALID_PRIORITIES.join(', ')}
- **Actions**: ${VALID_ACTIONS.join(', ')}

âš ï¸ CRITICAL: There is NO stage called "Active Projects", "active", "active_projects", or anything similar. Use ONLY the stages listed above.

## ALL jobs (${context.jobs.length}):
${clientList || '  (none)'}

## ALL TASKS (${context.tasks.length}):
${taskList || '  (none)'}
${historySection}
${threadsSection}

## DATABASE TABLES (for queryDatabase):
- jobs (id, name, personality, promises, deliverables, urgency, stage, estimatedValue, email, phone, address, strategyDoc, contextDump, createdAt)
- tasks (id, jobId, title, description, status, priority, action, scheduledDate, startTime, duration, waitingOn, icon, isFrog, frogName, createdAt, updatedAt)
- Communications (id, jobId, content, type, createdAt)
- notes (id, jobId, content, type, createdAt)
- subtasks (id, taskId, title, isCompleted, createdAt)
- task_dependencies (id, taskId, dependsOnTaskId, createdAt)
- task_templates (id, title, description, priority, action, subtasks)
- frog_hall_of_fame (id, taskId, taskTitle, frogName, jobName, completedAt)
- ai_threads (id, title, summary, createdAt, updatedAt)
- ai_conversations (id, role, content, functionCalls, threadId, createdAt)

## BEHAVIOR:
- When asked to count things, USE queryDatabase â€” never guess.
- When searching for entities, USE queryDatabase with LIKE queries.
- When updating entities, ALWAYS use the exact ID from context or a query result.
- When you make changes, USE navigateUser to show the user the result.
- Be SPECIFIC: name jobs, cite IDs, show counts.
- If there are duplicates, query the DB and list all matches with IDs.
- ALWAYS confirm before destructive operations (delete, merge).
- When the user asks about past conversations or references something discussed before, USE searchConversations to look it up.
- **CRITICAL: When creating jobs, ALWAYS set stage to 'inspection' unless the user explicitly specifies a different stage. NEVER create a Job without a stage.**
- **After ANY create/update action, ALWAYS tell the user EXACTLY what you did**: what entity, what stage/status/priority you set, and where to find it.
- Use 'closed' stage for completed projects, 'canceled' for abandoned ones, 'archived' for long-term storage.
- Be concise and direct. Don't over-explain.
- Format responses in clean Markdown.`;
}


// â”€â”€ Exported Service â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const gemini = {
  async processChat(
    message: string,
    context: {
      jobs: Job[],
      tasks: Task[],
      conversationHistory?: { role: string; content: string }[],
      threadTitles?: { id: number; title: string }[],
    },
    fileData?: { data: string, mimeType: string }
  ) {
    const parts: any[] = [{ text: message }];
    if (fileData) {
      parts.push({ inlineData: { data: fileData.data, mimeType: fileData.mimeType } });
    }

    const response = await getAi().models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts },
      config: {
        systemInstruction: buildOmnipotentPrompt(context),
        tools: [{ functionDeclarations: ALL_TOOLS }]
      }
    });

    return {
      text: response.text,
      functionCalls: response.functionCalls
    };
  },

  async getTaskAdvice(taskTitle: string, taskDescription: string, clientContext?: string) {
    const response = await getAi().models.generateContent({
      model: "gemini-2.5-flash",
      contents: `As a Project Manager Assistant, provide brief, actionable advice for the following task:
    Title: ${taskTitle}
  Description: ${taskDescription}
      ${clientContext ? `Job Context: ${clientContext}` : ''}
      
      Focus on efficiency and potential blockers.Keep it under 100 words.`,
    });
    return response.text;
  },

  async researchTask(taskTitle: string, stage: string) {
    const response = await getAi().models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Provide a detailed "How-To" guide for the following project task and stage:
  Task: ${taskTitle}
  Stage: ${stage}

  Include:
  1. Step - by - step instructions.
      2. Required documents or tools.
      3. Best practices for Job Communication during this stage.
      4. Common pitfalls to avoid.`,
    });
    return response.text;
  },

  async suggestActionTemplate(taskTitle: string, taskDescription: string, stage: string) {
    const response = await getAi().models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Suggest a list of 3 - 5 specific subtasks for the following project stage:
    Stage: ${stage}
  Task: ${taskTitle}
  Description: ${taskDescription}
      
      The project flow is: inspection -> present info -> action(file claim, meet insurance, sign contract) -> strategy / supplement -> build / complete work -> final invoice.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
      }
    });
    try { return JSON.parse(response.text); } catch { return []; }
  },

  async analyzeClient(Job: Job, Communications: Communication[]) {
    const commsText = Communications.map(c => `[${c.type}] ${c.content} `).join('\n');
    const response = await getAi().models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Analyze this Job profile and their recent Communications:
  Job: ${Job.name}
  Personality: ${Job.personality}
      Promises Made: ${Job.promises}
  Deliverables: ${Job.deliverables}
  Urgency: ${Job.urgency}

  Communications:
      ${commsText}
      
      Provide a concise summary of the Job's current mood, key concerns, and any immediate actions needed.`,
    });
    return response.text;
  },

  async summarizeProjectHistory(notes: string[]) {
    const response = await getAi().models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Summarize the following project history notes into a concise development log:\n${notes.join('\n')}\n\nHighlight key milestones and technical decisions.`,
    });
    return response.text;
  },

  async generateDeliverable(type: 'email' | 'estimate' | 'strategy', task: Task, Job?: Job) {
    const response = await getAi().models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate a ${type} for the following project:
      Project: ${task.title}
      Description: ${task.description}
      Stage: ${Job?.stage || 'Unknown'}
      ${Job ? `Job: ${Job.name} (Personality: ${Job.personality})` : ''}
      
      Format as professional Markdown. If it's an estimate, include line items. If it's an email, personalize for the Job.`,
    });
    return response.text;
  },

  async suggestProjectNextSteps(taskTitle: string, taskDesc: string, clientContext?: string) {
    const prompt = `Based on the completion of the following task, suggest 1-3 logical "Next Step" tasks.
    
    Current Task Completed: ${taskTitle}
    Task Details: ${taskDesc}
    ${clientContext ? `Job Context: ${clientContext}` : ''}
    
    Return a raw JSON array of objects with: title, description, priority (low/medium/high), action (inspect/invoice/email/consult/call/other)`;

    const response = await getAi().models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [{ text: prompt }] },
    });

    try {
      const cleaned = response.text!.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned);
    } catch { return []; }
  },

  async suggestNextBestAction(task: Task, subtasks: any[], Job?: Job) {
    const response = await getAi().models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Analyze this project and suggest the single most important "Next Best Action":
      Project: ${task.title}
      Stage: ${Job?.stage || 'Unknown'}
      Checklist: ${JSON.stringify(subtasks)}
      ${Job ? `Job: ${Job.name} (Urgency: ${Job.urgency})` : ''}
      
      Provide a one-sentence instruction and brief explanation.`,
    });
    return response.text;
  },

  async generateStrategicRoadmap(Job: Job, tasks: Task[]) {
    const response = await getAi().models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Create a strategic roadmap for:
      Job: ${Job.name} | Stage: ${Job.stage} | Value: $${Job.estimatedValue}
      
      Active Tasks: ${tasks.map(t => `- ${t.title} (${t.priority})`).join('\n')}
      
      Include: Immediate Priorities (48h), Mid-term (2 weeks), Long-term, Communication Strategy. Format as Markdown.`,
    });
    return response.text;
  },

  async processTaskUpdate(taskTitle: string, update: string) {
    const response = await getAi().models.generateContent({
      model: "gemini-2.5-flash",
      contents: `The user provided an update for task "${taskTitle}": "${update}"
      
      Return JSON: { "summary": "string", "isCompleted": boolean }`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            isCompleted: { type: Type.BOOLEAN }
          },
          required: ["summary", "isCompleted"]
        }
      }
    });
    try { return JSON.parse(response.text); } catch { return { summary: update, isCompleted: false }; }
  },

  async generateReport(jobs: Job[], tasks: Task[], historyNotes: string[]) {
    const activeClients = jobs.map(c => `- ${c.name} (Stage: ${c.stage}, Urgency: ${c.urgency}, Value: $${c.estimatedValue})`);
    const openTasks = tasks.filter(t => t.status !== 'done').map(t => `- ${t.title} [${t.priority}] â€” Job: ${t.jobName || 'none'}, waiting: ${t.waitingOn || 'nothing'}`);

    const response = await getAi().models.generateContent({
      model: "gemini-2.5-flash",
      contents: `You are a business intelligence assistant for a roofing & exterior renovation company.

## Current Pipeline:
${activeClients.join('\n') || 'No active jobs.'}

## Open Tasks (${openTasks.length}):
${openTasks.slice(0, 30).join('\n') || 'No open tasks.'}

## Recent History:
${historyNotes.slice(-50).join('\n') || 'No history.'}

Generate a professional BI report in Markdown: Executive Summary, Pipeline Health, Bottlenecks, Momentum Scores, Top 5 Actions, Process Improvements, 2-Week Outlook.`,
    });
    return response.text;
  },

  async processCheckIn(answers: { focus: string; urgentClients: string; waitingOn: string; notes: string }, jobs: Job[], tasks: Task[]) {
    const response = await getAi().models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Daily check-in:
- Focus: ${answers.focus}
- Urgent jobs: ${answers.urgentClients}
- Waiting On: ${answers.waitingOn}
- Notes: ${answers.notes}

Open tasks: ${tasks.filter(t => t.status !== 'done').length}, jobs: ${jobs.length}

Validate focus, identify missed jobs, suggest 3 actions, flag risks. Warm coaching tone, under 250 words.`,
    });
    return response.text;
  },

  async runWeeklyScan(jobs: Job[], tasks: Task[], historyNotes: string[]) {
    const stageSummary = jobs.map(c => {
      const ct = tasks.filter(t => t.jobId === c.id && t.status !== 'done');
      return `- ${c.name}: ${c.stage} | ${ct.length} open tasks | Value: $${c.estimatedValue}`;
    }).join('\n');

    const response = await getAi().models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Weekly pipeline review:
${stageSummary || 'No active jobs.'}

Recent history: ${historyNotes.slice(-30).join('\n')}

Cover: Stage Transitions, Documents to Prepare, Follow-up Schedule, Strategic Questions, Weekly Win Opportunities.`,
    });
    return response.text;
  },

  async godModeChat(
    message: string,
    context: {
      jobs: Job[];
      tasks: Task[];
      dependencies: { taskId: number; dependsOnTaskId: number }[];
      notes: { content: string; type: string }[];
    }
  ) {
    const response = await getAi().models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [{ text: message }] },
      config: {
        systemInstruction: buildOmnipotentPrompt({ jobs: context.jobs, tasks: context.tasks }),
        tools: [{ functionDeclarations: ALL_TOOLS }]
      }
    });

    return {
      text: response.text,
      functionCalls: response.functionCalls
    };
  },

  async parseDictation(transcript: string, type: 'task' | 'Job', context?: string): Promise<any> {
    const prompt = `Parse voice dictation into structured ${type} data:
    Transcript: "${transcript}"
    ${context ? `Context: ${context}` : ''}
    
    Return ONLY raw JSON (no markdown):
    ${type === 'task' ? `{ title, description, priority (low/medium/high), action (inspect/invoice/email/consult/call/other) }`
        : `{ name, personality, promises, deliverables, urgency (low/medium/high), estimatedValue (number) }`}`;

    const response = await getAi().models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [{ text: prompt }] },
    });

    try {
      const cleaned = response.text!.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned);
    } catch { return null; }
  },

  async generateThreadTitle(firstUserMessage: string, firstAssistantResponse: string): Promise<string> {
    try {
      const response = await getAi().models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Generate a very short title (3-5 words max) summarizing this conversation topic. Return ONLY the title text, no quotes or formatting.

User said: "${firstUserMessage.slice(0, 200)}"
Assistant replied: "${firstAssistantResponse.slice(0, 200)}"`,
      });
      return (response.text || 'New Chat').trim().replace(/^["']|["']$/g, '').slice(0, 50);
    } catch {
      return 'New Chat';
    }
  }
};
