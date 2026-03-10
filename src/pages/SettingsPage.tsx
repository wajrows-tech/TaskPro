// ── Settings Page ───────────────────────────────────────────────────────────
import React from 'react';
import { useUI } from '../contexts/UIContext';
import { Card } from '../shared/Card';
import { Button } from '../shared/Button';
import { Sun, Moon } from 'lucide-react';
import { request } from '../services/api/request.ts';

export function SettingsPage() {
    const { theme, setTheme } = useUI();

    return (
        <div className="p-6 flex flex-col gap-6 max-w-[800px] mx-auto">
            <div>
                <h1 className="text-2xl font-bold text-white">Settings</h1>
                <p className="text-sm text-gray-500 mt-0.5">Configure your CRM</p>
            </div>

            <Card>
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Appearance</h3>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-white">Theme</p>
                        <p className="text-xs text-gray-500 mt-0.5">Switch between dark and light mode</p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant={theme === 'dark' ? 'primary' : 'secondary'}
                            size="sm"
                            icon={<Moon size={14} />}
                            onClick={() => setTheme('dark')}
                        >
                            Dark
                        </Button>
                        <Button
                            variant={theme === 'light' ? 'primary' : 'secondary'}
                            size="sm"
                            icon={<Sun size={14} />}
                            onClick={() => setTheme('light')}
                        >
                            Light
                        </Button>
                    </div>
                </div>
            </Card>

            <Card>
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Integrations</h3>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-white">AccuLynx Sync</p>
                        <p className="text-xs text-gray-500 mt-0.5">Import Contacts, Jobs, and Messages (API Key configured in .env)</p>
                    </div>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={async () => {
                            try {
                                const data = await request<any>('/integrations/acculynx/sync', {
                                    method: 'POST',
                                    body: JSON.stringify({}) // Trigger sync (backend handles auth keys)
                                });
                                alert(`Synced: ${data.result.contacts} contacts, ${data.result.jobs} jobs, ${data.result.messages} messages.`);
                            } catch (e: any) {
                                alert(`Error syncing: ${e.message}`);
                            }
                        }}
                    >
                        Sync Data
                    </Button>
                </div>
            </Card>

            <Card>
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">About</h3>
                <div className="mb-8">
                    <p><strong className="text-white">TaskPro CRM</strong> v2.0</p>
                </div>
                <p className="mt-1">Built by Wajrows Tech</p>
                <p className="mt-1 text-xs text-gray-600">React • Vite • Express • SQLite • TailwindCSS</p>
            </Card>
        </div>
    );
}
 
 
