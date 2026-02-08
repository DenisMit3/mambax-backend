'use client';

import { AlertCircle, RefreshCw, Phone } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

interface TelegramAuthErrorProps {
    error: string;
    onRetry: () => void;
    retryCount?: number;
    isRetrying?: boolean;
}

/**
 * Компонент для отображения ошибок Telegram аутентификации
 * с возможностью повторной попытки или перехода к альтернативному методу входа
 */
export function TelegramAuthError({ 
    error, 
    onRetry, 
    retryCount = 0,
    isRetrying = false 
}: TelegramAuthErrorProps) {
    const router = useRouter();
    
    return (
        <div className="flex flex-col items-center justify-center h-full bg-black text-white p-6">
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center"
            >
                {/* Иконка ошибки */}
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                >
                    <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
                </motion.div>
                
                {/* Заголовок */}
                <h2 className="text-xl font-bold mb-2 text-center">Ошибка входа</h2>
                
                {/* Сообщение об ошибке */}
                <p className="text-gray-400 text-center mb-6 max-w-xs leading-relaxed">
                    {error}
                </p>
                
                {/* Информация о попытках */}
                {retryCount > 0 && (
                    <p className="text-gray-500 text-sm mb-4">
                        Попыток: {retryCount} из 3
                    </p>
                )}
                
                {/* Кнопки действий */}
                <div className="flex gap-3">
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={onRetry}
                        disabled={isRetrying}
                        className={`
                            px-6 py-3 rounded-full font-semibold 
                            flex items-center gap-2 transition-all
                            ${isRetrying 
                                ? 'bg-blue-600/50 cursor-not-allowed' 
                                : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
                            }
                        `}
                    >
                        <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
                        {isRetrying ? 'Повтор...' : 'Повторить'}
                    </motion.button>
                    
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => router.push('/auth/phone')}
                        className="px-6 py-3 bg-slate-800 rounded-full font-semibold flex items-center gap-2 hover:bg-slate-700 active:scale-95 transition-all"
                    >
                        <Phone className="w-4 h-4" />
                        По телефону
                    </motion.button>
                </div>
                
                {/* Подсказка */}
                <p className="text-gray-600 text-xs mt-6 text-center max-w-xs">
                    Если проблема повторяется, попробуйте перезапустить бот командой /start в Telegram
                </p>
            </motion.div>
        </div>
    );
}
