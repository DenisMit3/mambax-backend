'use client';

import React, { Component, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

/**
 * Global Error Boundary
 * 
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing.
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: undefined });
    };

    render() {
        if (this.state.hasError) {
            // Custom fallback UI
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-dvh bg-black flex flex-col items-center justify-center p-6 text-white">
                    <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-6">
                        <AlertTriangle className="w-8 h-8 text-red-500" />
                    </div>

                    <h1 className="text-xl font-bold mb-2">Что-то пошло не так</h1>
                    <p className="text-gray-400 text-center text-sm max-w-xs mb-6">
                        Произошла непредвиденная ошибка. Попробуйте обновить страницу.
                    </p>

                    {process.env.NODE_ENV === 'development' && this.state.error && (
                        <div className="mb-6 p-4 bg-white/5 rounded-xl max-w-sm w-full overflow-auto">
                            <p className="text-red-400 text-xs font-mono break-all">
                                {this.state.error.message}
                            </p>
                        </div>
                    )}

                    <button
                        onClick={this.handleRetry}
                        className="flex items-center gap-2 px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200 active:scale-95 transition"
                    >
                        <RefreshCw size={18} />
                        Попробовать снова
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
