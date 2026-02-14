'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
    message?: string;
    onRetry?: () => void;
}

export function ErrorState({
    message = 'Не удалось загрузить данные. Проверьте подключение к интернету.',
    onRetry,
}: ErrorStateProps) {
    return (
        <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
            <AlertTriangle size={48} className="text-yellow-500 mb-4" />
            <p className="text-slate-300 text-base mb-6">{message}</p>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold active:scale-95 transition"
                >
                    <RefreshCw size={18} />
                    Попробовать снова
                </button>
            )}
        </div>
    );
}
