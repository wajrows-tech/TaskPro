// ── UIContext: Navigation, theme, toasts, and UI state ─────────────────────
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type Page =
    | 'dashboard'
    | 'jobs'
    | 'job-detail'
    | 'contacts'
    | 'contact-detail'
    | 'tasks'
    | 'communications'
    | 'estimates'
    | 'ai'
    | 'settings'
    | 'integrations'
    | 'event-log'
    | 'automations';

export interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
}

interface PageParams {
    jobId?: number;
    contactId?: number;
}

interface UIState {
    currentPage: Page;
    pageParams: PageParams;
    sidebarOpen: boolean;
    theme: 'dark' | 'light';
    toasts: Toast[];
    commandBarOpen: boolean;
    aiPanelOpen: boolean;
}

interface UIActions {
    navigate: (page: Page, params?: PageParams) => void;
    toggleSidebar: () => void;
    setTheme: (theme: 'dark' | 'light') => void;
    addToast: (message: string, type?: Toast['type']) => void;
    removeToast: (id: string) => void;
    setCommandBarOpen: (open: boolean) => void;
    setAIPanelOpen: (open: boolean) => void;
}

type UIContextValue = UIState & UIActions;

export const UIContext = createContext<UIContextValue | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
    const [currentPage, setCurrentPage] = useState<Page>('dashboard');
    const [pageParams, setPageParams] = useState<PageParams>({});
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [theme, setThemeState] = useState<'dark' | 'light'>('dark');
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [commandBarOpen, setCommandBarOpen] = useState(false);
    const [aiPanelOpen, setAIPanelOpen] = useState(false);

    const navigate = useCallback((page: Page, params?: PageParams) => {
        setCurrentPage(page);
        setPageParams(params || {});
    }, []);

    const toggleSidebar = useCallback(() => setSidebarOpen(p => !p), []);

    const setTheme = useCallback((t: 'dark' | 'light') => {
        setThemeState(t);
        document.documentElement.setAttribute('data-theme', t);
    }, []);

    const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
        const id = crypto.randomUUID();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <UIContext.Provider value={{
            currentPage, pageParams, sidebarOpen, theme, toasts, commandBarOpen, aiPanelOpen,
            navigate, toggleSidebar, setTheme, addToast, removeToast, setCommandBarOpen, setAIPanelOpen,
        }}>
            {children}
        </UIContext.Provider>
    );
}

export function useUI(): UIContextValue {
    const ctx = useContext(UIContext);
    if (!ctx) throw new Error('useUI must be used within <UIProvider>');
    return ctx;
}
