// ── TaskPro CRM — App Shell ─────────────────────────────────────────────────
// This file is the entry point component. It wraps providers and renders the shell.
// All business logic lives in contexts/, hooks/, and features/.
// See ARCHITECTURE.md for governance rules.

import React from 'react';
import { AppProvider } from './contexts/AppContext';
import { UIProvider } from './contexts/UIContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppShell } from './layout/AppShell';
import { Login } from './pages/Login';
import './index.css';

const AppContent = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 font-medium">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="animate-pulse">Loading TaskPro OS...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return <AppShell />;
};

export default function App() {
  return (
    <AuthProvider>
      <UIProvider>
        <AppProvider>
          <AppContent />
        </AppProvider>
      </UIProvider>
    </AuthProvider>
  );
}
 
 
