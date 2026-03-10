// ── Tasks Page ──────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { TaskBoard } from '../features/tasks/TaskBoard';
import { TaskForm } from '../features/tasks/TaskForm';
import { Button } from '../shared/Button';
import type { Task } from '../types.ts';

export function TasksPage() {
    const [showForm, setShowForm] = useState(false);
    const [editTask, setEditTask] = useState<Task | undefined>(undefined);

    const handleOpenForm = (task?: Task) => {
        setEditTask(task);
        setShowForm(true);
    };

    const handleCloseForm = () => {
        setShowForm(false);
        setEditTask(undefined);
    };

    return (
        <div className="p-6 flex flex-col gap-4 h-full">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Tasks</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Track and manage your workload</p>
                </div>
                <Button icon={<Plus size={16} />} onClick={() => handleOpenForm()}>New Task</Button>
            </div>
            <TaskBoard onTaskClick={handleOpenForm} />
            <TaskForm open={showForm} onClose={handleCloseForm} editTask={editTask} />
        </div>
    );
}
 
 
