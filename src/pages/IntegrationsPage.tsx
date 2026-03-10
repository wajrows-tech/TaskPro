import React, { useState, useEffect } from 'react';
import { RefreshCcw, WifiOff, Settings2, Plus, Cable, CheckCircle2, XCircle } from 'lucide-react';
import { UIContext } from '../contexts/UIContext';
import { IntegrationModule, IntegrationConfig } from '../integrations/types.ts';

interface IntegrationView extends IntegrationModule {
    config?: IntegrationConfig | null;
}

export function IntegrationsPage() {
    const [modules, setModules] = useState<IntegrationView[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedModule, setSelectedModule] = useState<IntegrationView | null>(null);

    const loadModules = async () => {
        try {
            const res = await fetch('/api/integrations');
            if (res.ok) {
                const data = await res.json();
                setModules(data);
            }
        } catch (err) {
            console.error('Failed to load integrations', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadModules();
    }, []);

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-white tracking-tight">Integrations Directory</h2>
                        <p className="text-gray-400 mt-2">Connect TaskPro to the tools you already use.</p>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <RefreshCcw className="w-8 h-8 text-emerald-500 animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {modules.map(mod => (
                        <IntegrationCard
                            key={mod.id}
                            module={mod}
                            onClick={() => setSelectedModule(mod)}
                        />
                    ))}
                </div>
            )}

            {/* Config modal will pop up here */}
            {selectedModule && (
                <ConfigModal
                    module={selectedModule}
                    onClose={() => setSelectedModule(null)}
                    onSaved={loadModules}
                />
            )}
        </div>
    );
}

function IntegrationCard({ module, onClick }: { module: IntegrationView, onClick: () => void }) {
    const isConnected = module.config?.enabled && module.config?.hasCredentials;

    return (
        <div
            onClick={onClick}
            className={`bg-gray-900 border ${isConnected ? 'border-emerald-500/30' : 'border-gray-800'} rounded-xl p-6 hover:bg-gray-800/80 cursor-pointer transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-black/50 group`}
        >
            <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-gray-800 shadow-inner" style={{ color: module.brandColor }}>
                    <Cable className="w-6 h-6" /> {/* Temporary generic icon */}
                </div>
                {isConnected ? (
                    <span className="flex items-center text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Connected
                    </span>
                ) : (
                    <span className="flex items-center text-xs font-medium text-gray-500 bg-gray-800 px-2 py-1 rounded-full">
                        <WifiOff className="w-3 h-3 mr-1" />
                        Not Connected
                    </span>
                )}
            </div>

            <h3 className="text-xl font-bold text-white mb-2">{module.name}</h3>
            <p className="text-sm text-gray-400 line-clamp-2">{module.description}</p>

            <div className="mt-6 flex items-center justify-between border-t border-gray-800/50 pt-4">
                <span className="text-xs text-gray-500 capitalize">{module.category.replace('_', ' ')}</span>
                <button className="text-sm text-gray-300 group-hover:text-emerald-400 font-medium transition-colors flex items-center">
                    <Settings2 className="w-4 h-4 mr-2" />
                    Configure
                </button>
            </div>
        </div>
    );
}

function ConfigModal({ module, onClose, onSaved }: { module: IntegrationView, onClose: () => void, onSaved: () => void }) {
    const isConnected = module.config?.enabled && module.config?.credentials !== null;

    // Default form state from existing config if available
    const [credentials, setCredentials] = useState<Record<string, string>>({});
    const [settings, setSettings] = useState<Record<string, any>>(module.config?.settings || {});
    const [saving, setSaving] = useState(false);

    // Initialize default toggle values
    useEffect(() => {
        if (!module.config?.settings) {
            const defaults: Record<string, any> = {};
            module.settingsFields?.forEach(f => {
                if (f.defaultValue !== undefined) defaults[f.key] = f.defaultValue;
            });
            setSettings(defaults);
        }
    }, [module]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/integrations/${module.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    enabled: true,
                    credentials: Object.keys(credentials).length > 0 ? credentials : null,
                    settings,
                    syncRules: []
                })
            });
            if (res.ok) {
                onSaved();
                onClose();
            } else {
                alert('Save failed: ' + (await res.json()).error);
            }
        } catch (err) {
            console.error('Save failed', err);
        } finally {
            setSaving(false);
        }
    };

    const handleDisconnect = async () => {
        if (!confirm('Are you sure you want to disconnect this integration?')) return;
        setSaving(true);
        try {
            await fetch(`/api/integrations/${module.id}/disconnect`, { method: 'POST' });
            onSaved();
            onClose();
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center p-4 animate-in fade-in duration-200">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">

                {/* Header */}
                <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/50 rounded-t-2xl">
                    <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-800" style={{ color: module.brandColor }}>
                            <Cable className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">{module.name} Setup</h2>
                            <p className="text-sm text-gray-400">v{module.version} by {module.author}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors">
                        <XCircle className="w-6 h-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1 space-y-8">

                    {/* Credentials Section */}
                    {module.credentialFields && module.credentialFields.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-white border-b border-gray-800 pb-2">Authentication Credentials</h3>

                            {isConnected && (
                                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-lg flex items-center">
                                    <CheckCircle2 className="w-5 h-5 mr-3" />
                                    This integration is currently connected and authenticated. Providing new credentials will overwrite the existing ones.
                                </div>
                            )}

                            {module.credentialFields.map(field => (
                                <div key={field.key} className="space-y-1">
                                    <label className="text-sm font-medium text-gray-300">{field.label} {field.required && <span className="text-red-500">*</span>}</label>
                                    <input
                                        type={field.type === 'password' ? 'password' : 'text'}
                                        placeholder={field.placeholder || ''}
                                        value={credentials[field.key] || ''}
                                        onChange={e => setCredentials(prev => ({ ...prev, [field.key]: e.target.value }))}
                                        className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                                    />
                                    {field.helpText && <p className="text-xs text-gray-500 mt-1">{field.helpText}</p>}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Settings Section */}
                    {module.settingsFields && module.settingsFields.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-white border-b border-gray-800 pb-2">Module Settings</h3>
                            <div className="space-y-4">
                                {module.settingsFields.map(field => (
                                    <div key={field.key}>
                                        {field.type === 'toggle' ? (
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <label className="text-sm font-medium text-gray-300">{field.label}</label>
                                                    {field.helpText && <p className="text-xs text-gray-500">{field.helpText}</p>}
                                                </div>
                                                <button
                                                    onClick={() => setSettings(prev => ({ ...prev, [field.key]: !prev[field.key] }))}
                                                    className={`w-12 h-6 rounded-full transition-colors ${settings[field.key] ? 'bg-emerald-500' : 'bg-gray-800'} relative`}
                                                >
                                                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${settings[field.key] ? 'translate-x-6' : 'translate-x-0.5'}`} />
                                                </button>
                                            </div>
                                        ) : field.type === 'select' ? (
                                            <div className="space-y-1">
                                                <label className="text-sm font-medium text-gray-300">{field.label}</label>
                                                <select
                                                    value={settings[field.key] || field.defaultValue}
                                                    onChange={e => setSettings(prev => ({ ...prev, [field.key]: e.target.value }))}
                                                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                                                >
                                                    {field.options?.map(opt => (
                                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                    ))}
                                                </select>
                                                {field.helpText && <p className="text-xs text-gray-500 mt-1">{field.helpText}</p>}
                                            </div>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-800 flex justify-between items-center bg-gray-900/50 rounded-b-2xl">
                    {isConnected ? (
                        <button
                            onClick={handleDisconnect}
                            disabled={saving}
                            className="px-5 py-2.5 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                            Disconnect Module
                        </button>
                    ) : <div></div>}

                    <div className="flex space-x-3">
                        <button onClick={onClose} className="px-5 py-2.5 text-gray-400 hover:text-white font-medium transition-colors">
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                        >
                            {saving ? 'Saving...' : 'Save & Enable'}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
 
