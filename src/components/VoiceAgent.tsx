// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Loader2, Check, X, ChevronDown, MessageSquare } from 'lucide-react';
import { liveGemini } from '../services/liveGemini.ts';
import { ChatMessage } from '../types.ts';
import { api } from '../services/api.ts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface VoiceAgentProps {
  onNavigate: (tab: any, entityId?: number, entityType?: string) => void;
  onRefreshData: () => void;
  getJobs: () => any[];
  getTasks: () => any[];
  onClose?: () => void;
}

export function VoiceAgent({
  onNavigate,
  onRefreshData,
  getJobs,
  getTasks,
  onClose,
}: VoiceAgentProps) {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState<'idle' | 'listening' | 'speaking' | 'processing' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  // Session memory: tracks recently created/modified entities with real IDs
  const recentActions = useRef<{ action: string; type: string; id: number; name: string; timestamp: number }[]>([]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, isExpanded]);

  const addMessage = (role: 'user' | 'assistant' | 'system', content: string, actions?: any[]) => {
    setChatHistory(prev => {
      const lastMsg = prev[prev.length - 1];
      if (lastMsg && lastMsg.role === role && role !== 'system' && Date.now() - lastMsg.timestamp < 10000) {
        return [
          ...prev.slice(0, -1),
          { ...lastMsg, content: lastMsg.content + content, actions: actions || lastMsg.actions }
        ];
      }
      return [...prev, {
        id: Math.random().toString(36).substring(7),
        role,
        content,
        timestamp: Date.now(),
        actions
      }];
    });
  };

  const addSystemAction = (description: string, success: boolean = true) => {
    setChatHistory(prev => [...prev, {
      id: Math.random().toString(36).substring(7),
      role: 'system',
      content: '',
      timestamp: Date.now(),
      actions: [{ type: 'action', description, status: success ? 'success' as const : 'failed' as const }]
    }]);
  };

  // Thinking transparency: show the agent's reasoning to users
  const addThinkingStep = (message: string) => {
    setChatHistory(prev => [...prev, {
      id: Math.random().toString(36).substring(7),
      role: 'system',
      content: '',
      timestamp: Date.now(),
      actions: [{ type: 'thinking', description: message, status: 'thinking' as const }]
    }]);
  };

  const toggleAgent = async () => {
    if (isActive) {
      liveGemini.disconnect();
      setIsActive(false);
      setStatus('idle');
    } else {
      setIsActive(true);
      setStatus('listening');
      setIsExpanded(true);
      setErrorMessage(null);
      try {
        await liveGemini.connect({
          onText: (text) => {
            addMessage('assistant', text);
            setStatus('speaking');
          },
          onUserTranscript: (text) => {
            addMessage('user', text);
          },
          onInterrupted: () => setStatus('listening'),
          onError: (err) => {
            console.error("Voice agent error:", err);
            setIsActive(false);
            setStatus('error');
            let msg = "An error occurred with the voice agent.";
            if (err.name === 'NotAllowedError' || err.message?.includes('Permission denied')) {
              msg = "Microphone access was denied. Please click the camera/mic icon in your browser's address bar and select 'Allow', then try again.";
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
              msg = "No microphone was found. Please ensure your microphone is plugged in.";
            } else {
              msg = err.message || msg;
            }
            setErrorMessage(msg);
          },
          onClose: () => {
            setIsActive(false);
            setStatus('idle');
          },
          onToolCall: async (toolCall) => {
            setStatus('processing');
            const functionCalls = toolCall.functionCalls;
            const responses = [];

            // ── Auto-resolve IDs from names ──
            const resolveJobId = (a: any): number | null => {
              if (a.jobId) return a.jobId;
              if (!a.jobName) return null;
              const q = a.jobName.toLowerCase();
              addThinkingStep(`🔍 Looking up job: "${a.jobName}"...`);
              const jobs = getJobs();
              // Exact substring match
              let match = jobs.find((j: any) => j.name?.toLowerCase().includes(q));
              if (!match) match = jobs.find((j: any) => j.address?.toLowerCase().includes(q));
              // Fuzzy: 2+ char overlap
              if (!match) {
                match = jobs.find((j: any) => {
                  const n = j.name?.toLowerCase() || '';
                  for (let len = Math.min(q.length, n.length); len >= 2; len--) {
                    for (let i = 0; i <= q.length - len; i++) {
                      if (n.includes(q.substring(i, i + len))) return true;
                    }
                  }
                  return false;
                });
              }
              // If only one job exists, use it
              if (!match && jobs.length === 1) match = jobs[0];
              if (match) {
                addThinkingStep(`✅ Resolved → Job #${match.id}: "${match.name}"`);
              } else {
                addThinkingStep(`❌ No match found for "${a.jobName}" in ${jobs.length} jobs`);
              }
              return match?.id || null;
            };

            const resolveTaskId = (a: any): number | null => {
              if (a.taskId) return a.taskId;
              if (!a.taskTitle && !a.taskName) return null;
              const q = (a.taskTitle || a.taskName).toLowerCase();
              addThinkingStep(`🔍 Looking up task: "${a.taskTitle || a.taskName}"...`);
              const tasks = getTasks();
              let match = tasks.find((t: any) => t.title?.toLowerCase().includes(q));
              if (!match && tasks.length === 1) match = tasks[0];
              if (match) {
                addThinkingStep(`✅ Resolved → Task #${match.id}: "${match.title}"`);
              } else {
                addThinkingStep(`❌ No match for "${a.taskTitle || a.taskName}"`);
              }
              return match?.id || null;
            };

            for (const call of functionCalls) {
              const { name, args, id } = call;
              let result: any = { status: 'ok' };

              try {
                // ── JOB OPERATIONS ──
                if (name === 'create_job') {
                  const jobData: any = {
                    name: args.name,
                    stage: args.stage || 'lead',
                    type: args.type || 'residential',
                    estimatedValue: args.estimatedValue || 0,
                    address: args.address || '',
                    city: args.city || '',
                    state: args.state || '',
                    zip: args.zip || '',
                    insuranceClaim: args.insuranceClaim || '',
                    deductible: args.deductible || 0,
                    assignedTo: args.assignedTo || '',
                    description: args.description || '',
                    roofType: args.roofType || '',
                    source: args.source || '',
                  };
                  const newJob = await api.createJob(jobData);
                  await api.createNote(`🤖 AI Agent created Job: "${args.name}" | Stage: ${jobData.stage}`, 'history', newJob?.id);
                  if (newJob?.id) {
                    await api.createCommunication({
                      jobId: newJob.id,
                      channel: 'note',
                      direction: 'outbound',
                      subject: 'Job Created',
                      body: `[AI Agent] Created this Job. Stage: ${jobData.stage}, Type: ${jobData.type}, Est. Value: $${jobData.estimatedValue}`
                    });
                    recentActions.current.push({ action: 'created', type: 'job', id: newJob.id, name: args.name, timestamp: Date.now() });
                  }
                  result = { status: 'created', jobId: newJob?.id, name: args.name };
                  addSystemAction(`✅ Created Job: "${args.name}" → ${jobData.stage}`);
                  onRefreshData();

                } else if (name === 'update_job') {
                  const { jobId: rawId, jobName, ...updates } = args;
                  const jobId = rawId || resolveJobId(args);
                  if (!jobId) { result = { error: 'Could not find that job. Try saying the full name.' }; addSystemAction('❌ Job not found', false); }
                  else {
                    await api.updateJob(jobId, updates);
                    const fields = Object.keys(updates).join(', ');
                    await api.createNote(`🤖 AI Agent updated Job #${jobId}: ${fields}`, 'history', jobId);
                    await api.createCommunication({
                      jobId,
                      channel: 'note',
                      direction: 'outbound',
                      subject: 'Job Updated',
                      body: `[AI Agent] Updated: ${Object.entries(updates).map(([k, v]) => `${k}: ${v}`).join(', ')}`
                    });
                    result = { status: 'updated', jobId };
                    addSystemAction(`✅ Updated Job #${jobId}: ${fields}`);
                    onRefreshData();
                  }

                } else if (name === 'move_job_stage') {
                  const resolvedJobId = resolveJobId(args);
                  if (!resolvedJobId) { result = { error: 'Could not find that job.' }; addSystemAction('❌ Job not found', false); }
                  else {
                    await api.updateJob(resolvedJobId, { stage: args.stage });
                    await api.createNote(`🤖 AI Agent moved Job #${resolvedJobId} → ${args.stage}`, 'history', resolvedJobId);
                    await api.createCommunication({
                      jobId: resolvedJobId,
                      channel: 'note',
                      direction: 'outbound',
                      subject: 'Stage Changed',
                      body: `[AI Agent] Moved to stage: ${args.stage}`
                    });
                    result = { status: 'moved', jobId: resolvedJobId, stage: args.stage };
                    addSystemAction(`📋 Moved Job #${resolvedJobId} → ${args.stage}`);
                    onRefreshData();
                  }

                } else if (name === 'delete_job') {
                  const resolvedJobId = resolveJobId(args);
                  if (!resolvedJobId) { result = { error: 'Could not find that job.' }; addSystemAction('❌ Job not found', false); }
                  else {
                    await api.deleteJob(resolvedJobId);
                    await api.createNote(`🤖 AI Agent deleted Job #${resolvedJobId}. Reason: ${args.reason}`, 'history');
                    result = { status: 'deleted' };
                    addSystemAction(`🗑️ Deleted Job #${resolvedJobId}`);
                    onRefreshData();
                  }

                } else if (name === 'get_jobs') {
                  const jobs = getJobs();
                  let filtered = jobs;
                  if (args.query) {
                    const q = args.query.toLowerCase();
                    filtered = jobs.filter((j: any) =>
                      j.name?.toLowerCase().includes(q) || j.address?.toLowerCase().includes(q)
                    );
                    if (filtered.length === 0) {
                      // Fuzzy match
                      filtered = jobs.filter((j: any) => {
                        const name = j.name?.toLowerCase() || '';
                        const addr = j.address?.toLowerCase() || '';
                        for (let len = Math.min(q.length, name.length); len >= 2; len--) {
                          for (let i = 0; i <= q.length - len; i++) {
                            if (name.includes(q.substring(i, i + len)) || addr.includes(q.substring(i, i + len))) return true;
                          }
                        }
                        return false;
                      });
                    }
                    if (filtered.length === 0) filtered = jobs;
                  }
                  result = {
                    jobs: filtered.map((j: any) => ({
                      id: j.id, name: j.name, address: j.address, stage: j.stage, type: j.type,
                      estimatedValue: j.estimatedValue, assignedTo: j.assignedTo
                    }))
                  };
                  addSystemAction(`📋 Found ${filtered.length} jobs${args.query ? ` matching "${args.query}"` : ''}`);

                } else if (name === 'get_job_summary') {
                  const resolvedJobId = resolveJobId(args);
                  if (!resolvedJobId) { result = { error: 'Could not find that job.' }; addSystemAction('❌ Job not found', false); }
                  else {
                    try {
                      const job = await api.getJob(resolvedJobId);
                      result = { job };
                      addSystemAction(`📋 Retrieved summary for Job #${resolvedJobId}`);
                    } catch (err: any) {
                      result = { error: err.message };
                      addSystemAction(`❌ Failed to get Job #${resolvedJobId}`, false);
                    }
                  }

                } else if (name === 'search_jobs') {
                  const jobs = getJobs();
                  const q = (args.query || '').toLowerCase();
                  let filtered = jobs.filter((j: any) => {
                    const match = j.name?.toLowerCase().includes(q) || j.address?.toLowerCase().includes(q) || j.assignedTo?.toLowerCase().includes(q);
                    if (args.stage && j.stage !== args.stage) return false;
                    if (args.assignedTo && !j.assignedTo?.toLowerCase().includes(args.assignedTo.toLowerCase())) return false;
                    return match;
                  });
                  result = {
                    jobs: filtered.map((j: any) => ({
                      id: j.id, name: j.name, address: j.address, stage: j.stage,
                      estimatedValue: j.estimatedValue, assignedTo: j.assignedTo
                    }))
                  };
                  addSystemAction(`🔍 Search found ${filtered.length} jobs`);

                  // ── CONTACT OPERATIONS ──
                } else if (name === 'create_contact') {
                  const contactData: any = {
                    firstName: args.firstName,
                    lastName: args.lastName || '',
                    role: args.role || 'other',
                    company: args.company || '',
                    email: args.email || '',
                    phone: args.phone || '',
                    address: args.address || '',
                    notes: args.notes || '',
                  };
                  const newContact = await api.createContact(contactData);
                  const displayName = `${args.firstName} ${args.lastName || ''}`.trim();
                  result = { status: 'created', contactId: newContact?.id, name: displayName, role: args.role };
                  if (newContact?.id) {
                    recentActions.current.push({ action: 'created', type: 'contact', id: newContact.id, name: displayName, timestamp: Date.now() });
                  }
                  addSystemAction(`✅ Created ${args.role}: "${displayName}" (ID: ${newContact?.id})`);
                  onRefreshData();

                } else if (name === 'get_contacts') {
                  const allContacts = await api.getContacts();
                  let filtered = allContacts;
                  if (args.role) {
                    filtered = allContacts.filter((c: any) => c.role === args.role);
                  }
                  result = {
                    contacts: filtered.map((c: any) => ({
                      id: c.id, firstName: c.firstName, lastName: c.lastName, role: c.role,
                      company: c.company, email: c.email, phone: c.phone
                    }))
                  };
                  addSystemAction(`📋 Found ${filtered.length} contacts${args.role ? ` (${args.role})` : ''}`);

                } else if (name === 'search_contacts') {
                  const allContacts = await api.getContacts();
                  const q = (args.query || '').toLowerCase();
                  let filtered = allContacts.filter((c: any) => {
                    const fullName = `${c.firstName || ''} ${c.lastName || ''}`.toLowerCase();
                    const match = fullName.includes(q) || c.company?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q);
                    if (args.role && c.role !== args.role) return false;
                    return match;
                  });
                  result = {
                    contacts: filtered.map((c: any) => ({
                      id: c.id, firstName: c.firstName, lastName: c.lastName, role: c.role, company: c.company
                    }))
                  };
                  addSystemAction(`🔍 Search found ${filtered.length} contacts`);

                } else if (name === 'link_contact_to_job') {
                  await api.linkJobContact(args.jobId, args.contactId, args.role);
                  result = { status: 'linked' };
                  addSystemAction(`🔗 Linked contact #${args.contactId} to Job #${args.jobId}`);
                  onRefreshData();

                } else if (name === 'unlink_contact_from_job') {
                  await api.unlinkJobContact(args.jobId, args.contactId);
                  result = { status: 'unlinked' };
                  addSystemAction(`✂️ Unlinked contact #${args.contactId} from Job #${args.jobId}`);
                  onRefreshData();

                  // ── TASK OPERATIONS ──
                } else if (name === 'create_task') {
                  const taskData: any = {
                    title: args.title,
                    description: args.description || '',
                    jobId: args.jobId || undefined,
                    priority: args.priority || 'medium',
                    action: args.action || 'other',
                    status: args.status || 'todo',
                    scheduledDate: args.scheduledDate || undefined,
                    assignedTo: args.assignedTo || '',
                    isAutoGenerated: true,
                  };
                  const newTask = await api.createTask(taskData);
                  const realTaskId = newTask?.id;
                  const jobNote = args.jobId ? ` for Job #${args.jobId}` : '';
                  await api.createNote(`🤖 AI Agent created task: "${args.title}"${jobNote}`, 'history', args.jobId);
                  if (args.jobId) {
                    await api.createCommunication({
                      jobId: args.jobId,
                      channel: 'note',
                      direction: 'outbound',
                      subject: 'Task Created',
                      body: `[AI Agent] Created task: "${args.title}" (ID: ${realTaskId}) | Priority: ${taskData.priority} | Action: ${taskData.action}${args.scheduledDate ? ` | Scheduled: ${args.scheduledDate}` : ''}`
                    });
                  }
                  result = { status: 'created', taskId: realTaskId, title: args.title };
                  if (realTaskId) {
                    recentActions.current.push({ action: 'created', type: 'task', id: realTaskId, name: args.title, timestamp: Date.now() });
                  }
                  addSystemAction(`✅ Created task: "${args.title}" (ID: ${realTaskId})${jobNote}`);
                  onRefreshData();

                } else if (name === 'update_task') {
                  const { taskId, ...updates } = args;
                  await api.updateTask(taskId, updates);
                  const fields = Object.keys(updates).join(', ');
                  await api.createNote(`🤖 AI Agent updated task #${taskId}: ${fields}`, 'history');
                  const allTasks = getTasks();
                  const task = allTasks.find((t: any) => t.id === taskId);
                  if (task?.jobId) {
                    await api.createCommunication({
                      jobId: task.jobId,
                      channel: 'note',
                      direction: 'outbound',
                      subject: 'Task Updated',
                      body: `[AI Agent] Updated task "${task.title}" (#${taskId}): ${fields}`
                    });
                  }
                  result = { status: 'updated', taskId };
                  addSystemAction(`✅ Updated task #${taskId}: ${fields}`);
                  onRefreshData();

                } else if (name === 'complete_task') {
                  await api.updateTask(args.taskId, { status: 'done' });
                  await api.createNote(`🤖 AI Agent completed task #${args.taskId}`, 'history');
                  const allTasks = getTasks();
                  const task = allTasks.find((t: any) => t.id === args.taskId);
                  if (task?.jobId) {
                    await api.createCommunication({
                      jobId: task.jobId,
                      channel: 'note',
                      direction: 'outbound',
                      subject: 'Task Completed',
                      body: `[AI Agent] Completed task: "${task.title}" (#${args.taskId})`
                    });
                  }
                  result = { status: 'completed', taskId: args.taskId };
                  addSystemAction(`✅ Completed task #${args.taskId}`);
                  onRefreshData();

                } else if (name === 'delete_task') {
                  const allTasks = getTasks();
                  const task = allTasks.find((t: any) => t.id === args.taskId);
                  await api.deleteTask(args.taskId);
                  await api.createNote(`🤖 AI Agent deleted task #${args.taskId}`, 'history');
                  if (task?.jobId) {
                    await api.createCommunication({
                      jobId: task.jobId,
                      channel: 'note',
                      direction: 'outbound',
                      subject: 'Task Deleted',
                      body: `[AI Agent] Deleted task: "${task.title}" (#${args.taskId})`
                    });
                  }
                  result = { status: 'deleted' };
                  addSystemAction(`🗑️ Deleted task #${args.taskId}`);
                  onRefreshData();

                  // ── COMMUNICATION ──
                } else if (name === 'log_communication') {
                  const resolvedJobId = resolveJobId(args);
                  if (!resolvedJobId) { result = { error: 'Could not find that job.' }; addSystemAction('❌ Job not found', false); }
                  else {
                    await api.createCommunication({
                      jobId: resolvedJobId,
                      contactId: args.contactId || undefined,
                      channel: args.channel || 'note',
                      direction: args.direction || 'outbound',
                      subject: args.subject || '',
                      body: args.body,
                    });
                    result = { status: 'logged' };
                    addSystemAction(`📝 Logged ${args.channel || 'note'} for Job #${resolvedJobId}`);
                    onRefreshData();
                  }

                } else if (name === 'create_note') {
                  await api.createNote(args.content, args.type || 'general', args.jobId);
                  result = { status: 'created' };
                  addSystemAction(`📝 Note created: "${args.content.slice(0, 50)}..."`);
                  onRefreshData();

                  // ── ESTIMATES ──
                } else if (name === 'create_estimate') {
                  const resolvedJobId = resolveJobId(args);
                  if (!resolvedJobId) { result = { error: 'Could not find that job.' }; addSystemAction('❌ Job not found', false); }
                  else {
                    const estimate = await api.createEstimate(resolvedJobId, {
                      lineItems: args.lineItems,
                      subtotal: args.subtotal || 0,
                      tax: args.tax || 0,
                      total: args.total,
                      notes: args.notes || '',
                      status: 'draft',
                    });
                    await api.createCommunication({
                      jobId: resolvedJobId,
                      channel: 'note',
                      direction: 'outbound',
                      subject: 'Estimate Created',
                      body: `[AI Agent] Created estimate (ID: ${estimate?.id}) | Total: $${args.total}`
                    });
                    result = { status: 'created', estimateId: estimate?.id, total: args.total };
                    if (estimate?.id) {
                      recentActions.current.push({ action: 'created', type: 'estimate', id: estimate.id, name: `$${args.total} estimate`, timestamp: Date.now() });
                    }
                    addSystemAction(`✅ Created estimate for Job #${resolvedJobId}: $${args.total}`);
                    onRefreshData();
                  }

                  // ── DATA QUERY ──
                } else if (name === 'query_data') {
                  try {
                    const queryResult = await api.aiQuery(args.sql);
                    result = { rows: queryResult.rows || queryResult, count: queryResult.count || (queryResult as any).length };
                    addSystemAction(`📊 Query returned ${result.count} rows`);
                  } catch (err: any) {
                    result = { error: err.message };
                    addSystemAction(`❌ Query failed: ${err.message}`, false);
                  }

                  // ── DEPENDENCIES (Project Map) ──
                } else if (name === 'link_tasks') {
                  await api.addTaskDependency(args.taskId, args.dependsOnTaskId);
                  await api.createNote(`🤖 AI Agent linked task #${args.taskId} → depends on #${args.dependsOnTaskId}`, 'history');
                  result = { status: 'linked' };
                  addSystemAction(`🔗 Linked: task #${args.taskId} → depends on #${args.dependsOnTaskId}`);
                  onRefreshData();

                } else if (name === 'unlink_tasks') {
                  await api.removeTaskDependency(args.taskId, args.dependsOnTaskId);
                  await api.createNote(`🤖 AI Agent unlinked task #${args.taskId} from #${args.dependsOnTaskId}`, 'history');
                  result = { status: 'unlinked' };
                  addSystemAction(`✂️ Unlinked: task #${args.taskId} from #${args.dependsOnTaskId}`);
                  onRefreshData();

                  // ── CALENDAR / SCHEDULING ──
                } else if (name === 'schedule_task') {
                  const resolvedTaskId = resolveTaskId(args) || args.taskId;
                  if (!resolvedTaskId) { result = { error: 'Could not find that task.' }; addSystemAction('❌ Task not found', false); }
                  else {
                    const updateData: any = { scheduledDate: args.date };
                    if (args.timeSlot) {
                      const allTasks = getTasks();
                      const task = allTasks.find((t: any) => t.id === resolvedTaskId);
                      updateData.description = (task?.description || '') + `\n⏰ Time: ${args.timeSlot}`;
                    }
                    await api.updateTask(resolvedTaskId, updateData);
                    await api.createNote(`🤖 AI Agent scheduled task #${resolvedTaskId} for ${args.date}${args.timeSlot ? ' (' + args.timeSlot + ')' : ''}`, 'history');
                    const allTasks2 = getTasks();
                    const task2 = allTasks2.find((t: any) => t.id === resolvedTaskId);
                    if (task2?.jobId) {
                      await api.createCommunication({
                        jobId: task2.jobId,
                        channel: 'note',
                        direction: 'outbound',
                        subject: 'Task Scheduled',
                        body: `[AI Agent] Scheduled task "${task2.title}" for ${args.date}${args.timeSlot ? ' (' + args.timeSlot + ')' : ''}`
                      });
                    }
                    result = { status: 'scheduled', date: args.date };
                    addSystemAction(`📅 Scheduled task #${resolvedTaskId} for ${args.date}${args.timeSlot ? ' (' + args.timeSlot + ')' : ''}`);
                    onRefreshData();
                  }

                  // ── NAVIGATION ──
                } else if (name === 'navigate_to') {
                  onNavigate(args.tab, args.entityId, args.entityType);
                  result = { status: 'navigated' };
                  addSystemAction(`📍 Navigated to ${args.tab}`);

                  // ── UTILITY ──
                } else if (name === 'report_bug') {
                  const severity = args.severity || 'medium';
                  const bugContent = `🐛 BUG REPORT [${severity.toUpperCase()}]\n\n📋 User Request: ${args.userRequest}\n\n❌ What Failed: ${args.whatFailed}\n\n🔧 Suggested Fix: ${args.suggestedFix}\n\n🕐 Reported: ${new Date().toLocaleString()}`;
                  await api.createNote(bugContent, 'bug' as any);
                  result = { status: 'reported' };
                  addSystemAction(`🐛 Bug reported: ${args.whatFailed.slice(0, 60)}...`);
                  onRefreshData();

                } else if (name === 'close_agent') {
                  onClose?.();
                  setIsActive(false);
                  result = { status: 'closed' };

                  // ── AGENTIC PLATFORM ──
                } else if (name === 'agent_delegate') {
                  addThinkingStep(`🧠 Delegating to sub-agent...`);

                  try {
                    let agentParams = {};
                    if (args.params) {
                      try { agentParams = JSON.parse(args.params); } catch { agentParams = {}; }
                    }

                    // Use smart routing if no specific agent given, otherwise direct route
                    const endpoint = args.agentId
                      ? `/api/agents/${args.agentId}/request`
                      : '/api/agents/smart';

                    const body = args.agentId
                      ? { action: args.action, params: agentParams }
                      : { intent: args.intent || args.action, params: agentParams };

                    const resp = await fetch(endpoint, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(body),
                    });
                    const agentResp = await resp.json();

                    // Stream thinking steps into the chat with agent icons
                    if (agentResp.thinkingSteps && agentResp.thinkingSteps.length > 0) {
                      for (const step of agentResp.thinkingSteps) {
                        addThinkingStep(`${step.agentIcon} ${step.agentName}: ${step.message}`);
                      }
                    }

                    const confidence = agentResp.confidence || 0;
                    addSystemAction(
                      `${args.agentId ? '🤖' : '🧠'} Agent ${agentResp.fromAgent}: ${agentResp.status} (${(confidence * 100).toFixed(0)}% confidence)`,
                      agentResp.status === 'completed'
                    );

                    result = agentResp.result || agentResp;
                  } catch (err: any) {
                    result = { error: err.message || 'Agent delegation failed' };
                    addSystemAction(`❌ Agent delegation failed: ${err.message}`, false);
                  }

                } else if (name === 'agent_status') {
                  try {
                    const resp = await fetch('/api/agents');
                    const status = await resp.json();
                    const summary = status.agents?.map((a: any) =>
                      `${a.icon} ${a.name} [${a.pillar}]: ${a.status.summary} (autonomy: ${(a.autonomy * 100).toFixed(0)}%)`
                    ).join('\n') || 'No agents registered';
                    addThinkingStep(`📊 Agent Platform Status:\n${summary}`);
                    result = status;
                  } catch (err: any) {
                    result = { error: err.message };
                  }
                }

              } catch (err: any) {
                const errMsg = (err.message || 'Unknown error').replace(/<[^>]*>/g, '').slice(0, 100);
                result = { error: errMsg };
                addSystemAction(`❌ ${name} failed: ${errMsg}`, false);
                try {
                  await api.createNote(
                    `🐛 AUTO BUG REPORT [tool failure]\n\n📋 Tool: ${name}\n📋 Args: ${JSON.stringify(args).slice(0, 200)}\n❌ Error: ${errMsg}\n🕐 Time: ${new Date().toLocaleString()}`,
                    'bug' as any
                  );
                } catch { /* don't fail the failure handler */ }
              }

              // Attach session memory to every response so AI knows recent entity IDs
              const memoryCtx = recentActions.current
                .filter(a => Date.now() - a.timestamp < 300000) // Last 5 minutes
                .map(a => `${a.action} ${a.type}: "${a.name}" (REAL ID: ${a.id})`)
                .join('; ');
              if (memoryCtx) {
                result._sessionMemory = memoryCtx;
              }

              responses.push({ name, response: { result }, id });
            }

            setStatus('listening');
            return { functionResponses: responses };
          }
        });
      } catch (err: any) {
        console.error("Failed to start voice agent", err);
        setIsActive(false);
        setStatus('error');
        setErrorMessage(err.message || "Failed to start. Check your Gemini API Key in Settings.");
      }
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3 pointer-events-none">
      <div className="pointer-events-auto flex flex-col items-end gap-4">
        {/* Chat Bubble / History */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="bg-white border border-[#1A1A2E]/10 shadow-2xl rounded-2xl overflow-hidden w-80 sm:w-96 flex flex-col max-h-[500px]"
            >
              <div className="bg-[#1A1A2E] text-white p-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
                  <span className="font-mono text-xs uppercase tracking-widest font-bold">
                    {status === 'listening' ? 'Listening...' : status === 'speaking' ? 'Speaking...' : status === 'processing' ? 'Executing...' : status === 'error' ? 'Error' : 'Agent Offline'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {chatHistory.length > 0 && (
                    <button
                      onClick={() => setChatHistory([])}
                      className="text-white/30 hover:text-white text-[9px] font-mono uppercase mr-2"
                    >
                      Clear
                    </button>
                  )}
                  <button onClick={() => setIsExpanded(false)} className="text-white/50 hover:text-white">
                    <ChevronDown size={16} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F5F5F5] min-h-[200px] max-h-[400px]">
                {status === 'error' && errorMessage && (
                  <div className="bg-red-50 border border-red-100 p-3 rounded-xl text-xs text-red-800 flex items-start gap-2">
                    <X size={14} className="mt-0.5 shrink-0" />
                    <div>
                      <p className="font-bold uppercase mb-1">Microphone Error</p>
                      <p>{errorMessage}</p>
                      <button
                        onClick={toggleAgent}
                        className="mt-2 text-red-600 font-bold hover:underline uppercase"
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                )}
                {chatHistory.length === 0 && status !== 'error' && (
                  <div className="text-center text-gray-400 text-xs font-mono mt-10">
                    Speak to start managing your CRM...
                  </div>
                )}
                {chatHistory.map((msg) => (
                  <div key={msg.id} className={cn(
                    "flex flex-col",
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  )}>
                    {msg.content && msg.role !== 'system' && (
                      <span className={cn(
                        "text-[9px] font-mono uppercase tracking-widest mb-1 px-1",
                        msg.role === 'user' ? 'text-gray-400' : 'text-emerald-600'
                      )}>
                        {msg.role === 'user' ? 'You' : 'Agent'}
                      </span>
                    )}
                    {msg.content && (
                      <div className={cn(
                        "max-w-[85%] p-3 rounded-xl text-sm leading-relaxed",
                        msg.role === 'user'
                          ? 'bg-[#1A1A2E] text-white rounded-br-none'
                          : msg.role === 'assistant'
                            ? 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
                            : 'bg-blue-50 border border-blue-100 text-blue-800 text-xs'
                      )}>
                        {msg.content}
                      </div>
                    )}
                    {msg.actions && (
                      <div className="mt-1 space-y-1 w-full">
                        {msg.actions.map((action: any, idx: number) => (
                          <div key={idx} className={cn(
                            "border p-2 rounded-lg flex items-center gap-2 text-xs",
                            action.status === 'thinking'
                              ? 'bg-slate-50 border-slate-200 text-slate-500 italic'
                              : action.status === 'error' || action.status === 'failed'
                                ? 'bg-red-50 border-red-100 text-red-800'
                                : 'bg-emerald-50 border-emerald-100 text-emerald-800'
                          )}>
                            {action.status === 'thinking' ? (
                              <span className="text-slate-400 text-[10px]">💭</span>
                            ) : action.status === 'error' || action.status === 'failed' ? (
                              <X size={12} className="text-red-500" />
                            ) : (
                              <Check size={12} className="text-emerald-600" />
                            )}
                            <span className={cn("font-medium", action.status === 'thinking' && 'font-normal text-[11px]')}>{action.description}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Agent Button */}
        <div className="relative group">
          {!isExpanded && isActive && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-[#1A1A2E] text-white px-3 py-1.5 rounded-lg whitespace-nowrap text-xs font-mono shadow-lg"
            >
              {status === 'listening' ? 'Listening...' : 'Active'}
            </motion.div>
          )}

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleAgent}
            className={`w-11 h-11 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 ${isActive
              ? 'bg-red-500 text-white shadow-red-500/30'
              : 'bg-[#1A1A2E] text-white shadow-black/30'
              }`}
          >
            {isActive ? <MicOff size={20} /> : <Mic size={20} />}
          </motion.button>

          {isActive && !isExpanded && (
            <button
              onClick={() => setIsExpanded(true)}
              className="absolute -top-2 -right-2 bg-white text-[#1A1A2E] p-1.5 rounded-full shadow-md border border-gray-200 hover:bg-gray-50"
            >
              <MessageSquare size={12} />
            </button>
          )}

          {isActive && (
            <span className="absolute inset-0 rounded-full bg-red-500 animate-ping -z-10 opacity-20" />
          )}
        </div>
      </div>
    </div>
  );
}
 
 
