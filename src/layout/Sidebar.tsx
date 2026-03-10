// ── Sidebar Navigation ──────────────────────────────────────────────────────
import React from 'react';
import { motion } from 'motion/react';
import {
    LayoutDashboard, Briefcase, Users, ClipboardList,
    MessageSquare, FileText, Bot, Settings, ChevronLeft,
    Zap, Blocks, LogOut
} from 'lucide-react';
import { useUI, type Page } from '../contexts/UIContext';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../utils.ts';

interface NavItem {
    id: Page;
    label: string;
    icon: React.ReactNode;
    badge?: number;
}

export function Sidebar() {
    const { currentPage, navigate, sidebarOpen, toggleSidebar } = useUI();
    const { stats } = useApp();
    const { user, logout } = useAuth();

    const navItems: NavItem[] = [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
        { id: 'jobs', label: 'Jobs', icon: <Briefcase size={20} />, badge: stats?.activeJobs },
        { id: 'contacts', label: 'Contacts', icon: <Users size={20} />, badge: stats?.totalContacts },
        { id: 'tasks', label: 'Tasks', icon: <ClipboardList size={20} />, badge: stats?.openTasks },
        { id: 'communications', label: 'Activity', icon: <MessageSquare size={20} /> },
        { id: 'estimates', label: 'Estimates', icon: <FileText size={20} /> },
    ];

    const bottomItems: NavItem[] = [
        { id: 'integrations', label: 'App Market', icon: <Blocks size={20} /> },
        { id: 'automations', label: 'Automations', icon: <Zap size={20} /> },
        { id: 'event-log', label: 'Sys Logs', icon: <ClipboardList size={20} /> },
        { id: 'ai', label: 'AI Assistant', icon: <Bot size={20} /> },
        { id: 'settings', label: 'Settings', icon: <Settings size={20} /> },
    ];

    return (
        <motion.aside
            className={cn(
                'h-screen flex flex-col bg-gray-950/80 backdrop-blur-xl border-r border-white/5',
                'transition-all duration-300 ease-out shrink-0'
            )}
            animate={{ width: sidebarOpen ? 240 : 64 }}
        >
            {/* Logo */}
            <div className="flex items-center gap-3 px-4 h-16 border-b border-white/5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0">
                    <Zap size={16} className="text-white" />
                </div>
                {sidebarOpen && (
                    <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="font-bold text-white text-lg tracking-tight"
                    >
                        <div className="flex items-center gap-3">
                            <LayoutDashboard className="w-6 h-6 text-white" />
                            <h1 className="text-xl font-bold tracking-tight text-white font-mono">
                                TaskPro
                            </h1>
                        </div>
                    </motion.span>
                )}
                <button
                    onClick={toggleSidebar}
                    className={cn(
                        'ml-auto p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors cursor-pointer',
                        !sidebarOpen && 'ml-0'
                    )}
                >
                    <ChevronLeft size={16} className={cn('transition-transform', !sidebarOpen && 'rotate-180')} />
                </button>
            </div>

            {/* Main nav */}
            <nav className="flex-1 flex flex-col gap-1 p-2 mt-2">
                {navItems.map(item => (
                    <NavButton key={item.id} item={item} active={currentPage === item.id} collapsed={!sidebarOpen} onClick={() => navigate(item.id)} />
                ))}
            </nav>

            {/* Bottom nav */}
            <nav className="flex flex-col gap-1 p-2 border-t border-white/5">
                {bottomItems.map(item => (
                    <NavButton key={item.id} item={item} active={currentPage === item.id} collapsed={!sidebarOpen} onClick={() => navigate(item.id)} />
                ))}
            </nav>

            {/* User Profile */}
            <div className={cn("mt-auto p-4 border-t border-white/5 flex items-center gap-3", !sidebarOpen && "flex-col p-2")}>
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0 font-bold text-xs uppercase text-white shadow-sm" title={`${user?.firstName} ${user?.lastName}`}>
                    {user?.firstName?.charAt(0) || 'U'}
                </div>
                {sidebarOpen && (
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{user?.firstName} {user?.lastName}</p>
                        <p className="text-[10px] uppercase tracking-wider text-gray-400 truncate">{user?.role || 'User'}</p>
                    </div>
                )}
                <button
                    onClick={logout}
                    className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors shrink-0"
                    title="Sign Out"
                >
                    <LogOut size={16} />
                </button>
            </div>
        </motion.aside>
    );
}

function NavButton({ item, active, collapsed, onClick }: { item: NavItem; active: boolean; collapsed: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                'relative flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer group',
                collapsed ? 'justify-center p-3' : 'px-3 py-2.5',
                active
                    ? 'bg-blue-600/20 text-blue-400'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
            )}
            title={collapsed ? item.label : undefined}
        >
            {active && (
                <motion.div
                    layoutId="nav-indicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-500 rounded-r-full"
                />
            )}
            <span className="shrink-0">{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
            {!collapsed && item.badge !== undefined && item.badge > 0 && (
                <span className="ml-auto text-[10px] bg-white/10 text-gray-300 px-1.5 py-0.5 rounded-full">
                    {item.badge}
                </span>
            )}
        </button>
    );
}
 
 
