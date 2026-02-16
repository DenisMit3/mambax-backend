'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface UsersBulkActionsProps {
  selectedCount: number;
  onBulkAction: (action: string) => void;
}

// Панель массовых действий — появляется при выборе пользователей
export function UsersBulkActions({ selectedCount, onBulkAction }: UsersBulkActionsProps) {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
          className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-center justify-between backdrop-blur-md"
        >
          {/* Левая часть: счётчик + текст */}
          <div className="flex items-center gap-3 px-2">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-500 text-white text-xs font-bold">
              {selectedCount}
            </span>
            <span className="text-sm font-medium text-blue-200">Выбрано пользователей</span>
          </div>

          {/* Правая часть: кнопки действий */}
          <div className="flex gap-2">
            <button
              onClick={() => onBulkAction('activate')}
              className="px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 text-xs font-semibold transition-colors"
            >
              Активировать
            </button>
            <button
              onClick={() => onBulkAction('suspend')}
              className="px-3 py-1.5 rounded-lg bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 text-xs font-semibold transition-colors"
            >
              Приостановить
            </button>
            <button
              onClick={() => onBulkAction('ban')}
              className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 text-xs font-semibold transition-colors"
            >
              Заблокировать
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
