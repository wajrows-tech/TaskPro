// ── Job Create/Edit Form ────────────────────────────────────────────────────
import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useUI } from '../../contexts/UIContext';
import { api } from '../../services/api.ts';
import { JOB_STAGES, type Job, type JobStage, type JobType } from '../../types.ts';
import { Modal } from '../../shared/Modal';
import { Input, Textarea } from '../../shared/Input';
import { Select } from '../../shared/Select';
import { Button } from '../../shared/Button';
import { cn } from '../../utils.ts';

const JOB_TYPES: { value: JobType; label: string }[] = [
    { value: 'residential', label: 'Residential' },
    { value: 'commercial', label: 'Commercial' },
    { value: 'insurance', label: 'Insurance' },
    { value: 'retail', label: 'Retail' },
    { value: 'other', label: 'Other' },
];

const ROOF_TYPES = [
    { value: '', label: 'Select...' },
    { value: 'shingle', label: 'Shingle' },
    { value: 'tile', label: 'Tile' },
    { value: 'flat', label: 'Flat' },
    { value: 'metal', label: 'Metal' },
    { value: 'slate', label: 'Slate' },
    { value: 'other', label: 'Other' },
];

const SOURCES = [
    { value: '', label: 'Select...' },
    { value: 'referral', label: 'Referral' },
    { value: 'door_knock', label: 'Door Knock' },
    { value: 'online', label: 'Online' },
    { value: 'social_media', label: 'Social Media' },
    { value: 'repeat', label: 'Repeat Customer' },
    { value: 'other', label: 'Other' },
];

interface JobFormProps {
    open: boolean;
    onClose: () => void;
    editJob?: Job | null;
}

export function JobForm({ open, onClose, editJob }: JobFormProps) {
    const { refreshJobs, refreshStats } = useApp();
    const { addToast, navigate } = useUI();
    const [saving, setSaving] = useState(false);
    const [activeSection, setActiveSection] = useState<'info' | 'financials' | 'production'>('info');

    const [form, setForm] = useState({
        name: editJob?.name ?? '',
        address: editJob?.address ?? '',
        city: editJob?.city ?? '',
        state: editJob?.state ?? '',
        zip: editJob?.zip ?? '',
        stage: editJob?.stage ?? ('lead' as JobStage),
        type: editJob?.type ?? ('residential' as JobType),
        estimatedValue: editJob?.estimatedValue ?? 0,
        insuranceClaim: editJob?.insuranceClaim ?? '',
        deductible: editJob?.deductible ?? 0,
        assignedTo: editJob?.assignedTo ?? '',
        description: editJob?.description ?? '',
        roofType: editJob?.roofType ?? '',
        source: editJob?.source ?? '',
        // Phase 7
        contractAmount: editJob?.contractAmount ?? 0,
        actualCost: editJob?.actualCost ?? 0,
        amountPaid: editJob?.amountPaid ?? 0,
        leadDate: editJob?.leadDate ?? '',
        soldDate: editJob?.soldDate ?? '',
        scheduledStartDate: editJob?.scheduledStartDate ?? '',
        actualStartDate: editJob?.actualStartDate ?? '',
        completionDate: editJob?.completionDate ?? '',
        squareFootage: editJob?.squareFootage ?? 0,
        roofPitch: editJob?.roofPitch ?? '',
        layers: editJob?.layers ?? 0,
        shingleColor: editJob?.shingleColor ?? '',
        trades: editJob?.trades ?? '[]',
        permitNumber: editJob?.permitNumber ?? '',
        gateCode: editJob?.gateCode ?? '',
        lockboxCode: editJob?.lockboxCode ?? '',
        dumpsterLocation: editJob?.dumpsterLocation ?? '',
        specialInstructions: editJob?.specialInstructions ?? '',
        crewName: editJob?.crewName ?? '',
    });

    const update = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) return addToast('Job name is required', 'error');
        setSaving(true);
        try {
            if (editJob) {
                await api.updateJob(editJob.id, form);
                addToast('Job updated', 'success');
            } else {
                const newJob = await api.createJob(form);
                addToast('Job created', 'success');
                navigate('job-detail', { jobId: newJob.id });
            }
            await Promise.all([refreshJobs(), refreshStats()]);
            onClose();
        } catch (err) {
            addToast('Failed to save job', 'error');
        }
        setSaving(false);
    };

    return (
        <Modal open={open} onClose={onClose} title={editJob ? 'Edit Job' : 'New Job'} size="xl">
            <div className="flex gap-6 mb-6 border-b border-white/10">
                {(['info', 'financials', 'production'] as const).map(section => (
                    <button
                        key={section}
                        onClick={() => setActiveSection(section)}
                        className={cn(
                            "pb-2 px-2 text-sm font-semibold capitalize transition-all border-b-2",
                            activeSection === section ? "text-blue-400 border-blue-400" : "text-gray-500 border-transparent hover:text-white"
                        )}
                    >
                        {section}
                    </button>
                ))}
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                {activeSection === 'info' && (
                    <>
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Job Name *" value={form.name} onChange={e => update('name', e.target.value)} placeholder="e.g. Smith Residence" />
                            <Select label="Stage" options={JOB_STAGES.map(s => ({ value: s.key, label: s.label }))} value={form.stage} onChange={v => update('stage', v)} />
                        </div>
                        <Input label="Address" value={form.address} onChange={e => update('address', e.target.value)} placeholder="123 Main St" />
                        <div className="grid grid-cols-3 gap-4">
                            <Input label="City" value={form.city} onChange={e => update('city', e.target.value)} />
                            <Input label="State" value={form.state} onChange={e => update('state', e.target.value)} />
                            <Input label="ZIP" value={form.zip} onChange={e => update('zip', e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Select label="Type" options={JOB_TYPES} value={form.type} onChange={v => update('type', v)} />
                            <Select label="Roof Type" options={ROOF_TYPES} value={form.roofType} onChange={v => update('roofType', v)} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Assigned To" value={form.assignedTo} onChange={e => update('assignedTo', e.target.value)} />
                            <Select label="Lead Source" options={SOURCES} value={form.source} onChange={v => update('source', v)} />
                        </div>
                        <Textarea label="Description" value={form.description} onChange={e => update('description', e.target.value)} placeholder="Basic job notes..." />
                    </>
                )}

                {activeSection === 'financials' && (
                    <>
                        <div className="grid grid-cols-3 gap-4">
                            <Input label="Est. Value ($)" type="number" value={form.estimatedValue || ''} onChange={e => update('estimatedValue', Number(e.target.value))} />
                            <Input label="Contract Amt ($)" type="number" value={form.contractAmount || ''} onChange={e => update('contractAmount', Number(e.target.value))} />
                            <Input label="Amount Paid ($)" type="number" value={form.amountPaid || ''} onChange={e => update('amountPaid', Number(e.target.value))} />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <Input label="Ins. Claim #" value={form.insuranceClaim} onChange={e => update('insuranceClaim', e.target.value)} />
                            <Input label="Deductible ($)" type="number" value={form.deductible || ''} onChange={e => update('deductible', Number(e.target.value))} />
                            <Input label="Actual Cost ($)" type="number" value={form.actualCost || ''} onChange={e => update('actualCost', Number(e.target.value))} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Lead Date" type="date" value={form.leadDate} onChange={e => update('leadDate', e.target.value)} />
                            <Input label="Sold Date" type="date" value={form.soldDate} onChange={e => update('soldDate', e.target.value)} />
                        </div>
                    </>
                )}

                {activeSection === 'production' && (
                    <>
                        <div className="grid grid-cols-3 gap-4">
                            <Input label="Sched. Start" type="date" value={form.scheduledStartDate} onChange={e => update('scheduledStartDate', e.target.value)} />
                            <Input label="Actual Start" type="date" value={form.actualStartDate} onChange={e => update('actualStartDate', e.target.value)} />
                            <Input label="Completion" type="date" value={form.completionDate} onChange={e => update('completionDate', e.target.value)} />
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                            <Input label="SQ (Size)" type="number" value={form.squareFootage || ''} onChange={e => update('squareFootage', Number(e.target.value))} />
                            <Input label="Pitch" value={form.roofPitch} onChange={e => update('roofPitch', e.target.value)} placeholder="e.g. 7/12" />
                            <Input label="Layers" type="number" value={form.layers || ''} onChange={e => update('layers', Number(e.target.value))} />
                            <Input label="Shingle Color" value={form.shingleColor} onChange={e => update('shingleColor', e.target.value)} />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <Input label="Permit #" value={form.permitNumber} onChange={e => update('permitNumber', e.target.value)} />
                            <Input label="Crew Name" value={form.crewName} onChange={e => update('crewName', e.target.value)} />
                            <Input label="Dumpster Loc." value={form.dumpsterLocation} onChange={e => update('dumpsterLocation', e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Gate Code" value={form.gateCode} onChange={e => update('gateCode', e.target.value)} />
                            <Input label="Lockbox" value={form.lockboxCode} onChange={e => update('lockboxCode', e.target.value)} />
                        </div>
                        <Textarea label="Special Instructions" value={form.specialInstructions} onChange={e => update('specialInstructions', e.target.value)} />
                    </>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                    <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button type="submit" disabled={saving}>{saving ? 'Saving...' : editJob ? 'Update Job' : 'Create Job'}</Button>
                </div>
            </form>
        </Modal>
    );
}
