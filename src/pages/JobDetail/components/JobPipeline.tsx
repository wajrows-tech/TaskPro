import React from 'react';
import { Card } from '../../../shared/Card';
import { JOB_STAGES, type Job, type JobStage } from '../../../types.ts';
import { cn } from '../../../utils.ts';

interface JobPipelineProps {
    job: Job;
    onStageChange: (newStage: JobStage) => void;
}

export function JobPipeline({ job, onStageChange }: JobPipelineProps) {
    return (
        <Card className="overflow-hidden border-white/10 p-0">
            <div className="px-5 py-4 bg-white/[0.02] border-b border-white/5">
                <h3 className="text-sm font-semibold text-white">Project Pipeline</h3>
            </div>
            <div className="p-5 overflow-x-auto">
                <div className="flex min-w-[800px] justify-between relative">
                    {/* Background Line */}
                    <div className="absolute top-[14px] left-8 right-8 h-1 bg-white/10 rounded-full z-0" />

                    {JOB_STAGES.filter(s => !['canceled'].includes(s.key)).map((s, idx) => {
                        const currentIdx = JOB_STAGES.findIndex(x => x.key === job.stage);
                        const thisIdx = JOB_STAGES.findIndex(x => x.key === s.key);
                        const isPassed = thisIdx < currentIdx;
                        const isActive = thisIdx === currentIdx;

                        return (
                            <button
                                key={s.key}
                                onClick={() => onStageChange(s.key as JobStage)}
                                className="relative z-10 flex flex-col items-center gap-2 group w-24"
                            >
                                <div
                                    className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center transition-all border-4 shadow-lg",
                                        isActive ? `bg-gray-900 border-[${s.color}] scale-125` :
                                            isPassed ? `bg-[${s.color}] border-[${s.color}]` :
                                                "bg-gray-800 border-gray-700 group-hover:border-gray-500"
                                    )}
                                    style={isActive ? { borderColor: s.color } : (isPassed ? { backgroundColor: s.color, borderColor: s.color } : {})}
                                >
                                    {isActive && <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />}
                                </div>
                                <span className={cn(
                                    "text-[10px] font-bold text-center leading-tight uppercase tracking-wider transition-colors",
                                    isActive ? "text-white" : isPassed ? "text-gray-300" : "text-gray-500"
                                )}>
                                    {s.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </Card>
    );
}
