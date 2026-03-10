import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    X, Key, Eye, EyeOff, CheckCircle2, Bell, Palette, Layout,
    Clock, Globe, Shield, Database, Zap, Moon, Sun, Monitor,
    Volume2, VolumeX, Type, AlignLeft, Columns, SlidersHorizontal,
    ToggleLeft, ToggleRight, ChevronRight, Info, MapPin, Sunset
} from 'lucide-react';
import { useToast } from './Toast';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type SettingSection = 'general' | 'appearance' | 'notifications' | 'ai' | 'planner' | 'tasks' | 'data' | 'advanced';

const SECTIONS: { id: SettingSection; label: string; icon: any; desc: string }[] = [
    { id: 'general', label: 'General', icon: SlidersHorizontal, desc: 'Profile, timezone & defaults' },
    { id: 'appearance', label: 'Appearance', icon: Palette, desc: 'Theme, density & layout' },
    { id: 'notifications', label: 'Notifications', icon: Bell, desc: 'Alerts & reminders' },
    { id: 'ai', label: 'AI & API', icon: Zap, desc: 'Gemini API keys & behavior' },
    { id: 'planner', label: 'Day Planner', icon: Clock, desc: 'Working hours & calendar prefs' },
    { id: 'tasks', label: 'Tasks', icon: CheckCircle2, desc: 'Defaults, sorting & archiving' },
    { id: 'data', label: 'Data & Sync', icon: Database, desc: 'Export, backup & Google Calendar' },
    { id: 'advanced', label: 'Advanced', icon: Shield, desc: 'Developer options & reset' },
];

function Toggle({ value, onChange, id }: { value: boolean; onChange: (v: boolean) => void; id?: string }) {
    return (
        <button id={id} onClick={() => onChange(!value)}
            className={cn('relative w-10 h-5.5 rounded-full transition-colors shrink-0 border', value ? 'bg-[#1A1A2E] border-[#1A1A2E]' : 'bg-gray-200 border-gray-200')}
        >
            <div className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm', value ? 'translate-x-5' : 'translate-x-0.5')} />
        </button>
    );
}

function SettingRow({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between py-3 border-b border-[#1A1A2E]/5 gap-6">
            <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[#1A1A2E]">{label}</div>
                {desc && <div className="text-[10px] font-mono opacity-40 mt-0.5 leading-tight">{desc}</div>}
            </div>
            <div className="shrink-0">{children}</div>
        </div>
    );
}

function SelectInput({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
    return (
        <select value={value} onChange={e => onChange(e.target.value)}
            className="bg-white border border-[#1A1A2E]/20 px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#1A1A2E] rounded-md"
        >
            {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
    );
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const [section, setSection] = useState<SettingSection>('general');
    const { addToast } = useToast();

    // ── Persistent settings state ──
    const get = (key: string, def: string) => localStorage.getItem(`taskpro_${key}`) ?? def;
    const set = (key: string, val: string) => localStorage.setItem(`taskpro_${key}`, val);

    // API
    const [apiKey, setApiKey] = useState(() => localStorage.getItem('geminiApiKey') || '');
    const [showKey, setShowKey] = useState(false);

    // General
    const [timezone, setTimezone] = useState(() => get('timezone', Intl.DateTimeFormat().resolvedOptions().timeZone));
    const [businessName, setBusinessName] = useState(() => get('businessName', 'TaskPro'));
    const [ownerName, setOwnerName] = useState(() => get('ownerName', 'Administrator'));
    const [dateFormat, setDateFormat] = useState(() => get('dateFormat', 'MM/dd/yyyy'));
    const [workCutoff, setWorkCutoff] = useState(() => get('workCutoff', '21:00'));
    const [latitude, setLatitude] = useState(() => get('latitude', '33.45'));
    const [longitude, setLongitude] = useState(() => get('longitude', '-112.07'));

    // Appearance
    const [theme, setTheme] = useState(() => get('theme', 'light'));
    const [density, setDensity] = useState(() => get('density', 'normal'));
    const [fontSize, setFontSize] = useState(() => get('fontSize', 'medium'));
    const [sidebarExpanded, setSidebarExpanded] = useState(() => get('sidebarExpanded', 'hover') === 'always');
    const [animationsEnabled, setAnimationsEnabled] = useState(() => get('animations', 'true') === 'true');
    const [compactHeader, setCompactHeader] = useState(() => get('compactHeader', 'true') === 'true');

    // Notifications
    const [soundEnabled, setSoundEnabled] = useState(() => get('sound', 'true') === 'true');
    const [desktopNotifs, setDesktopNotifs] = useState(() => get('desktopNotifs', 'false') === 'true');
    const [dailyDigest, setDailyDigest] = useState(() => get('dailyDigest', 'true') === 'true');
    const [overdueAlerts, setOverdueAlerts] = useState(() => get('overdueAlerts', 'true') === 'true');
    const [digestTime, setDigestTime] = useState(() => get('digestTime', '08:00'));

    // AI
    const [aiModel, setAiModel] = useState(() => get('aiModel', 'gemini-2.5-flash'));
    const [aiPersonality, setAiPersonality] = useState(() => get('aiPersonality', 'professional'));
    const [autoAdvice, setAutoAdvice] = useState(() => get('autoAdvice', 'false') === 'true');
    const [aiVoice, setAiVoice] = useState(() => get('aiVoice', 'Aoede'));

    // Planner
    const [workdayStart, setWorkdayStart] = useState(() => get('workdayStart', '07:00'));
    const [workdayEnd, setWorkdayEnd] = useState(() => get('workdayEnd', '18:00'));
    const [defaultDuration, setDefaultDuration] = useState(() => get('defaultDuration', '60'));
    const [snapInterval, setSnapInterval] = useState(() => get('snapInterval', '15'));
    const [gcalEnabled, setGcalEnabled] = useState(() => get('gcalEnabled', 'false') === 'true');
    const [weekStartDay, setWeekStartDay] = useState(() => get('weekStartDay', '1'));

    // Tasks
    const [defaultPriority, setDefaultPriority] = useState(() => get('defaultPriority', 'medium'));
    const [defaultSort, setDefaultSort] = useState(() => get('defaultSort', 'priority'));
    const [archiveAfterDays, setArchiveAfterDays] = useState(() => get('archiveAfterDays', '30'));
    const [showDoneAtBottom, setShowDoneAtBottom] = useState(() => get('showDoneAtBottom', 'true') === 'true');
    const [confirmDelete, setConfirmDelete] = useState(() => get('confirmDelete', 'true') === 'true');
    const [autoArchive, setAutoArchive] = useState(() => get('autoArchive', 'false') === 'true');

    const handleSaveAll = () => {
        // API
        if (apiKey.trim()) localStorage.setItem('geminiApiKey', apiKey.trim());
        else localStorage.removeItem('geminiApiKey');

        // General
        set('timezone', timezone); set('businessName', businessName); set('dateFormat', dateFormat);
        set('workCutoff', workCutoff); set('latitude', latitude); set('longitude', longitude);
        // Appearance
        set('theme', theme); set('density', density); set('fontSize', fontSize);
        set('sidebarExpanded', sidebarExpanded ? 'always' : 'hover');
        set('animations', String(animationsEnabled)); set('compactHeader', String(compactHeader));
        // Notifications
        set('sound', String(soundEnabled)); set('desktopNotifs', String(desktopNotifs));
        set('dailyDigest', String(dailyDigest)); set('overdueAlerts', String(overdueAlerts));
        set('digestTime', digestTime);
        // AI
        set('aiModel', aiModel); set('aiPersonality', aiPersonality);
        set('autoAdvice', String(autoAdvice)); set('aiVoice', aiVoice);
        // Planner
        set('workdayStart', workdayStart); set('workdayEnd', workdayEnd);
        set('defaultDuration', defaultDuration); set('snapInterval', snapInterval);
        set('gcalEnabled', String(gcalEnabled)); set('weekStartDay', weekStartDay);
        // Tasks
        set('defaultPriority', defaultPriority); set('defaultSort', defaultSort);
        set('archiveAfterDays', archiveAfterDays); set('showDoneAtBottom', String(showDoneAtBottom));
        set('confirmDelete', String(confirmDelete)); set('autoArchive', String(autoArchive));

        addToast('success', 'Settings saved successfully');
        setTimeout(onClose, 800);
    };

    const inputClass = "bg-white border border-[#1A1A2E]/20 px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#1A1A2E] rounded-md w-full";
    const timeInputClass = "bg-white border border-[#1A1A2E]/20 px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#1A1A2E] rounded-md w-28";

    const renderSection = () => {
        switch (section) {
            case 'general': return (
                <div className="space-y-1">
                    <SettingRow label="Business Name" desc="Used in reports and AI greetings">
                        <input className={cn(inputClass, 'w-48')} value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="My Company" />
                    </SettingRow>
                    <SettingRow label="Date Format" desc="How dates are displayed throughout the app">
                        <SelectInput value={dateFormat} onChange={setDateFormat} options={[
                            { v: 'MM/dd/yyyy', l: 'MM/DD/YYYY' }, { v: 'dd/MM/yyyy', l: 'DD/MM/YYYY' },
                            { v: 'yyyy-MM-dd', l: 'YYYY-MM-DD' }, { v: 'MMMM d, yyyy', l: 'Month D, YYYY' },
                        ]} />
                    </SettingRow>
                    <SettingRow label="Timezone" desc="Used for scheduling and report timestamps">
                        <input className={cn(inputClass, 'w-52')} value={timezone} onChange={e => setTimezone(e.target.value)} />
                    </SettingRow>
                    <SettingRow label="Week Starts On" desc="First day of the week in calendar views">
                        <SelectInput value={weekStartDay} onChange={setWeekStartDay} options={[
                            { v: '0', l: 'Sunday' }, { v: '1', l: 'Monday' }, { v: '6', l: 'Saturday' },
                        ]} />
                    </SettingRow>

                    <div className="border-t border-[#1A1A2E]/10 pt-2 mt-2">
                        <p className="text-[10px] font-mono opacity-50 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Sunset size={11} /> Countdown Timers</p>
                    </div>
                    <SettingRow label="Work Cutoff Time" desc="End-of-day countdown shown in footer">
                        <input type="time" className={timeInputClass} value={workCutoff} onChange={e => setWorkCutoff(e.target.value)} />
                    </SettingRow>
                    <SettingRow label="Location (Latitude)" desc="For sunset calculation">
                        <div className="flex items-center gap-1.5">
                            <input className={cn(inputClass, 'w-24')} value={latitude} onChange={e => setLatitude(e.target.value)} placeholder="33.45" />
                            <button onClick={() => {
                                navigator.geolocation?.getCurrentPosition(pos => {
                                    setLatitude(pos.coords.latitude.toFixed(2));
                                    setLongitude(pos.coords.longitude.toFixed(2));
                                    addToast('success', 'Location detected');
                                }, () => addToast('error', 'Location access denied'));
                            }} className="p-1.5 border border-[#1A1A2E]/20 rounded hover:bg-[#1A1A2E] hover:text-white transition-colors" title="Detect location">
                                <MapPin size={12} />
                            </button>
                        </div>
                    </SettingRow>
                    <SettingRow label="Location (Longitude)" desc="For sunset calculation">
                        <input className={cn(inputClass, 'w-24')} value={longitude} onChange={e => setLongitude(e.target.value)} placeholder="-112.07" />
                    </SettingRow>
                </div>
            );

            case 'appearance': return (
                <div className="space-y-1">
                    <SettingRow label="Theme" desc="App color scheme">
                        <div className="flex gap-1.5">
                            {(['light', 'auto', 'dark'] as const).map(t => (
                                <button key={t} onClick={() => setTheme(t)}
                                    className={cn('flex items-center gap-1.5 px-3 py-1.5 border rounded-md text-xs font-mono uppercase transition-colors',
                                        theme === t ? 'bg-[#1A1A2E] text-white border-[#1A1A2E]' : 'border-[#1A1A2E]/20 hover:border-[#1A1A2E]/50')}
                                >
                                    {t === 'light' ? <Sun size={11} /> : t === 'dark' ? <Moon size={11} /> : <Monitor size={11} />}
                                    {t}
                                </button>
                            ))}
                        </div>
                    </SettingRow>
                    <SettingRow label="UI Density" desc="Controls padding and spacing throughout the app">
                        <SelectInput value={density} onChange={setDensity} options={[
                            { v: 'compact', l: 'Compact' }, { v: 'normal', l: 'Normal' }, { v: 'comfortable', l: 'Comfortable' },
                        ]} />
                    </SettingRow>
                    <SettingRow label="Font Size" desc="Base text size">
                        <SelectInput value={fontSize} onChange={setFontSize} options={[
                            { v: 'small', l: 'Small' }, { v: 'medium', l: 'Medium' }, { v: 'large', l: 'Large' },
                        ]} />
                    </SettingRow>
                    <SettingRow label="Compact Header" desc="Reduces the top bar height">
                        <Toggle value={compactHeader} onChange={setCompactHeader} />
                    </SettingRow>
                    <SettingRow label="Sidebar Behavior" desc="When to show navigation labels">
                        <SelectInput value={sidebarExpanded ? 'always' : 'hover'} onChange={v => setSidebarExpanded(v === 'always')} options={[
                            { v: 'hover', l: 'Expand on Hover' }, { v: 'always', l: 'Always Expanded' },
                        ]} />
                    </SettingRow>
                    <SettingRow label="Animations" desc="Motion effects and transitions">
                        <Toggle value={animationsEnabled} onChange={setAnimationsEnabled} />
                    </SettingRow>
                </div>
            );

            case 'notifications': return (
                <div className="space-y-1">
                    <SettingRow label="Sound Effects" desc="Play sound on task completion and alerts">
                        <Toggle value={soundEnabled} onChange={setSoundEnabled} />
                    </SettingRow>
                    <SettingRow label="Desktop Notifications" desc="Show browser notifications when tab is inactive">
                        <Toggle value={desktopNotifs} onChange={v => {
                            if (v && 'Notification' in window) Notification.requestPermission();
                            setDesktopNotifs(v);
                        }} />
                    </SettingRow>
                    <SettingRow label="Daily Digest" desc="Morning summary of tasks and priorities">
                        <Toggle value={dailyDigest} onChange={setDailyDigest} />
                    </SettingRow>
                    {dailyDigest && (
                        <SettingRow label="Digest Time" desc="When to show the daily summary">
                            <input type="time" className={timeInputClass} value={digestTime} onChange={e => setDigestTime(e.target.value)} />
                        </SettingRow>
                    )}
                    <SettingRow label="Overdue Alerts" desc="Warn when tasks have been pending too long">
                        <Toggle value={overdueAlerts} onChange={setOverdueAlerts} />
                    </SettingRow>
                </div>
            );

            case 'ai': return (
                <div className="space-y-1">
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-3">
                        <div className="flex items-center gap-2 text-amber-700 font-mono text-[10px] uppercase font-bold mb-1">
                            <Info size={12} /> Gemini API Key
                        </div>
                        <p className="text-xs text-amber-700/80 leading-relaxed">
                            Required for AI features. Get a free key at{' '}
                            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="underline font-bold">Google AI Studio</a>.
                        </p>
                    </div>
                    <SettingRow label="API Key" desc={apiKey ? '● Key configured' : '○ No key set'}>
                        <div className="relative flex items-center gap-1.5">
                            <input
                                type={showKey ? 'text' : 'password'}
                                className={cn(inputClass, 'w-52 pr-8')}
                                value={apiKey} onChange={e => setApiKey(e.target.value)}
                                placeholder="AIzaSy..."
                            />
                            <button onClick={() => setShowKey(!showKey)} className="text-[#1A1A2E]/40 hover:text-[#1A1A2E] transition-colors">
                                {showKey ? <EyeOff size={13} /> : <Eye size={13} />}
                            </button>
                        </div>
                    </SettingRow>
                    <SettingRow label="AI Model" desc="Which Gemini model to use for text tasks">
                        <SelectInput value={aiModel} onChange={setAiModel} options={[
                            { v: 'gemini-2.5-flash', l: 'Gemini 2.5 Flash (Recommended)' },
                            { v: 'gemini-2.5-flash-preview-04-17', l: 'Gemini 2.5 Flash Preview' },
                            { v: 'gemini-2.0-flash', l: 'Gemini 2.0 Flash (Legacy)' },
                        ]} />
                    </SettingRow>
                    <SettingRow label="AI Personality" desc="Tone of AI assistant responses">
                        <SelectInput value={aiPersonality} onChange={setAiPersonality} options={[
                            { v: 'professional', l: 'Professional' }, { v: 'concise', l: 'Concise & Direct' },
                            { v: 'detailed', l: 'Detailed & Thorough' }, { v: 'friendly', l: 'Friendly & Casual' },
                        ]} />
                    </SettingRow>
                    <SettingRow label="Voice Agent Voice" desc="Voice for the live AI voice agent">
                        <SelectInput value={aiVoice} onChange={setAiVoice} options={[
                            { v: 'Aoede', l: 'Aoede (Default)' }, { v: 'Charon', l: 'Charon' },
                            { v: 'Fenrir', l: 'Fenrir' }, { v: 'Kore', l: 'Kore' }, { v: 'Puck', l: 'Puck' },
                        ]} />
                    </SettingRow>
                    <SettingRow label="Auto-Advice" desc="Automatically suggest AI advice when a task is opened">
                        <Toggle value={autoAdvice} onChange={setAutoAdvice} />
                    </SettingRow>
                </div>
            );

            case 'planner': return (
                <div className="space-y-1">
                    <SettingRow label="Workday Start" desc="Earliest time shown on the day planner">
                        <input type="time" className={timeInputClass} value={workdayStart} onChange={e => setWorkdayStart(e.target.value)} />
                    </SettingRow>
                    <SettingRow label="Workday End" desc="Latest time shown on the day planner">
                        <input type="time" className={timeInputClass} value={workdayEnd} onChange={e => setWorkdayEnd(e.target.value)} />
                    </SettingRow>
                    <SettingRow label="Default Duration" desc="Default task block length when scheduling">
                        <SelectInput value={defaultDuration} onChange={setDefaultDuration} options={[
                            { v: '15', l: '15 minutes' }, { v: '30', l: '30 minutes' }, { v: '45', l: '45 minutes' },
                            { v: '60', l: '1 hour' }, { v: '90', l: '1.5 hours' }, { v: '120', l: '2 hours' },
                        ]} />
                    </SettingRow>
                    <SettingRow label="Snap Interval" desc="Minimum time increment when placing/resizing blocks">
                        <SelectInput value={snapInterval} onChange={setSnapInterval} options={[
                            { v: '5', l: '5 minutes' }, { v: '10', l: '10 minutes' }, { v: '15', l: '15 minutes' },
                            { v: '30', l: '30 minutes' },
                        ]} />
                    </SettingRow>
                    <SettingRow label="Google Calendar Sync" desc="Sync scheduled tasks to Google Calendar (requires OAuth)">
                        <Toggle value={gcalEnabled} onChange={setGcalEnabled} />
                    </SettingRow>
                </div>
            );

            case 'tasks': return (
                <div className="space-y-1">
                    <SettingRow label="Default Priority" desc="Priority assigned to new tasks">
                        <SelectInput value={defaultPriority} onChange={setDefaultPriority} options={[
                            { v: 'high', l: 'High' }, { v: 'medium', l: 'Medium' }, { v: 'low', l: 'Low' },
                        ]} />
                    </SettingRow>
                    <SettingRow label="Default Sort Order" desc="How tasks are sorted on the task page">
                        <SelectInput value={defaultSort} onChange={setDefaultSort} options={[
                            { v: 'priority', l: 'Priority (High → Low)' }, { v: 'created', l: 'Date Created' },
                            { v: 'updated', l: 'Last Updated' }, { v: 'title', l: 'Alphabetical' },
                            { v: 'Job', l: 'By Job' }, { v: 'status', l: 'By Status' },
                            { v: 'scheduled', l: 'Scheduled Date' },
                        ]} />
                    </SettingRow>
                    <SettingRow label="Done Tasks at Bottom" desc="Sort completed tasks below active tasks">
                        <Toggle value={showDoneAtBottom} onChange={setShowDoneAtBottom} />
                    </SettingRow>
                    <SettingRow label="Auto-Archive Completed" desc="Automatically archive done tasks after a set period">
                        <Toggle value={autoArchive} onChange={setAutoArchive} />
                    </SettingRow>
                    {autoArchive && (
                        <SettingRow label="Archive After" desc="Days after completion to auto-archive">
                            <SelectInput value={archiveAfterDays} onChange={setArchiveAfterDays} options={[
                                { v: '7', l: '7 days' }, { v: '14', l: '14 days' },
                                { v: '30', l: '30 days' }, { v: '90', l: '90 days' },
                            ]} />
                        </SettingRow>
                    )}
                    <SettingRow label="Confirm Before Delete" desc="Show a confirmation prompt before deleting tasks">
                        <Toggle value={confirmDelete} onChange={setConfirmDelete} />
                    </SettingRow>
                </div>
            );

            case 'data': return (
                <div className="space-y-3">
                    <p className="text-xs text-[#1A1A2E]/50 font-mono">Export and backup your data.</p>
                    <button className="w-full border border-[#1A1A2E]/20 py-3 font-mono text-xs uppercase tracking-widest hover:bg-[#1A1A2E] hover:text-white transition-colors rounded-md"
                        onClick={() => addToast('info', 'Export coming soon — data is stored in your browser localStorage')}
                    >
                        Export All Data (JSON)
                    </button>
                    <button className="w-full border border-[#1A1A2E]/20 py-3 font-mono text-xs uppercase tracking-widest hover:bg-[#1A1A2E] hover:text-white transition-colors rounded-md"
                        onClick={() => addToast('info', 'CSV export coming soon')}
                    >
                        Export Tasks as CSV
                    </button>
                    <button className="w-full border border-[#1A1A2E]/20 py-3 font-mono text-xs uppercase tracking-widest hover:bg-[#1A1A2E] hover:text-white transition-colors rounded-md"
                        onClick={() => addToast('info', 'Import coming soon')}
                    >
                        Import from Backup
                    </button>
                    <div className="border-t border-[#1A1A2E]/10 pt-3">
                        <p className="text-[10px] font-mono opacity-40 mb-2 uppercase tracking-widest">Google Calendar</p>
                        <button className="w-full border border-emerald-300 py-3 font-mono text-xs uppercase tracking-widest text-emerald-700 hover:bg-emerald-50 transition-colors rounded-md"
                            onClick={() => addToast('info', 'GCal OAuth integration coming soon')}
                        >
                            Connect Google Calendar
                        </button>
                    </div>
                </div>
            );

            case 'advanced': return (
                <div className="space-y-3">
                    <p className="text-xs text-[#1A1A2E]/50 font-mono">Developer options and danger zone.</p>
                    <SettingRow label="Debug Mode" desc="Log AI requests and API calls to console">
                        <Toggle value={get('debug', 'false') === 'true'} onChange={v => set('debug', String(v))} />
                    </SettingRow>
                    <SettingRow label="Verbose AI Logging" desc="Include full prompts in console output">
                        <Toggle value={get('verboseAi', 'false') === 'true'} onChange={v => set('verboseAi', String(v))} />
                    </SettingRow>
                    <div className="border-t border-[#1A1A2E]/10 pt-4">
                        <p className="text-[10px] font-mono text-red-600 uppercase tracking-widest mb-2 font-bold">Danger Zone</p>
                        <button className="w-full border border-red-300 py-2.5 font-mono text-xs uppercase tracking-widest text-red-600 hover:bg-red-50 transition-colors rounded-md"
                            onClick={() => {
                                if (window.confirm('Clear ALL TaskPro settings? App data will remain.')) {
                                    Object.keys(localStorage).filter(k => k.startsWith('taskpro_')).forEach(k => localStorage.removeItem(k));
                                    addToast('info', 'Settings cleared');
                                    onClose();
                                }
                            }}
                        >
                            Reset All Settings
                        </button>
                    </div>
                </div>
            );

            default: return null;
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[150] flex items-center justify-center p-6">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
                        className="bg-[#F8F7F4] border border-[#1A1A2E] w-full max-w-3xl shadow-2xl flex overflow-hidden"
                        style={{ maxHeight: 'calc(100vh - 80px)' }}
                    >
                        {/* Sidebar */}
                        <div className="w-48 shrink-0 border-r border-[#1A1A2E]/10 bg-[#1A1A2E] text-[#F8F7F4] flex flex-col overflow-y-auto">
                            <div className="p-4 border-b border-white/10">
                                <h3 className="font-bold text-sm tracking-tight">Settings</h3>
                                <p className="font-mono text-[8px] uppercase opacity-40 mt-0.5">TaskPro v2.0</p>
                            </div>
                            <nav className="flex-1 p-2 space-y-0.5">
                                {SECTIONS.map(({ id, label, icon: Icon }) => (
                                    <button key={id} onClick={() => setSection(id)}
                                        className={cn('w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-left transition-colors text-sm',
                                            section === id ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white hover:bg-white/5')}
                                    >
                                        <Icon size={14} className="shrink-0" />
                                        <span className="font-mono text-[10px] uppercase tracking-widest font-medium">{label}</span>
                                    </button>
                                ))}
                            </nav>
                        </div>

                        {/* Content */}
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1A1A2E]/10 shrink-0">
                                <div>
                                    <h4 className="font-bold text-base">{SECTIONS.find(s => s.id === section)?.label}</h4>
                                    <p className="font-mono text-[9px] opacity-40 uppercase mt-0.5">{SECTIONS.find(s => s.id === section)?.desc}</p>
                                </div>
                                <button onClick={onClose} className="p-2 hover:bg-[#1A1A2E]/10 rounded-lg transition-colors">
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto px-6 py-4">
                                <AnimatePresence mode="wait">
                                    <motion.div key={section} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
                                        {renderSection()}
                                    </motion.div>
                                </AnimatePresence>
                            </div>

                            <div className="border-t border-[#1A1A2E]/10 px-6 py-3 flex justify-end gap-2 shrink-0">
                                <button onClick={onClose} className="px-4 py-2 font-mono text-xs uppercase text-[#1A1A2E]/50 hover:text-[#1A1A2E] transition-colors">
                                    Cancel
                                </button>
                                <button onClick={handleSaveAll}
                                    className="px-6 py-2 bg-[#1A1A2E] text-[#F8F7F4] font-mono text-xs uppercase tracking-widest hover:bg-black transition-colors flex items-center gap-2"
                                >
                                    <CheckCircle2 size={13} /> Save Settings
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
 
