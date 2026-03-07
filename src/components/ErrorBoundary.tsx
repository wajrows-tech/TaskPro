import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children: React.ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            const reqId = (this.state.error as any)?.response?.data?.requestId || (this.state.error as any)?.requestId;

            return (
                <div className="min-h-screen bg-[#F8F7F4] flex items-center justify-center p-8">
                    <div className="bg-white border border-red-200 shadow-2xl max-w-lg w-full p-10 text-center">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle size={32} className="text-red-500" />
                        </div>
                        <h1 className="text-2xl font-black uppercase tracking-tight mb-2">Something Went Wrong</h1>
                        <p className="font-mono text-xs text-red-600 mb-4 bg-red-50 p-3 rounded border border-red-100 text-left overflow-auto max-h-32">
                            {this.state.error?.message || 'An unexpected error occurred'}
                        </p>
                        {reqId && (
                            <div className="text-xs font-mono text-gray-500 mb-6 flex justify-between px-2">
                                <span>Correlation ID:</span>
                                <span className="text-gray-800 select-all">{reqId}</span>
                            </div>
                        )}
                        <button
                            onClick={() => {
                                this.setState({ hasError: false, error: null });
                                window.location.reload();
                            }}
                            className="bg-[#1A1A2E] text-[#F8F7F4] px-8 py-3 font-mono text-xs uppercase tracking-widest inline-flex items-center gap-2 hover:opacity-90 transition-opacity"
                        >
                            <RefreshCw size={14} />
                            Reload Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
