'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface UsersPaginationProps {
  currentPage: number;
  totalPages: number;
  totalUsers: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

// Вычисление окна страниц (до 5 кнопок с умным смещением)
function getPageNumbers(current: number, total: number): number[] {
  const maxVisible = 5;
  if (total <= maxVisible) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  // Центрируем текущую страницу в окне
  let start = Math.max(1, current - Math.floor(maxVisible / 2));
  let end = start + maxVisible - 1;

  // Корректируем если вышли за правый край
  if (end > total) {
    end = total;
    start = Math.max(1, end - maxVisible + 1);
  }

  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

// Пагинация с номерами страниц
export function UsersPagination({
  currentPage,
  totalPages,
  totalUsers,
  itemsPerPage,
  onPageChange,
}: UsersPaginationProps) {
  const from = (currentPage - 1) * itemsPerPage + 1;
  const to = Math.min(currentPage * itemsPerPage, totalUsers);
  const pages = getPageNumbers(currentPage, totalPages);

  const isPrevDisabled = currentPage === 1;
  const isNextDisabled = currentPage === totalPages;

  const navBtnClass = (disabled: boolean) =>
    `p-2 rounded-lg border text-sm transition-colors ${
      disabled
        ? 'opacity-50 cursor-not-allowed bg-white/5 border-white/10 text-white/40'
        : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
    }`;

  return (
    <div className="flex items-center justify-between mt-8">
      {/* Информация о показанных записях */}
      <span className="text-sm text-white/50">
        Показано {from}–{to} из {totalUsers.toLocaleString()}
      </span>

      {/* Кнопки навигации */}
      <div className="flex gap-1.5">
        {/* Предыдущая */}
        <button
          disabled={isPrevDisabled}
          onClick={() => onPageChange(currentPage - 1)}
          className={navBtnClass(isPrevDisabled)}
          aria-label="Предыдущая страница"
        >
          <ChevronLeft size={18} />
        </button>

        {/* Номера страниц */}
        {pages.map((pageNum) => (
          <button
            key={pageNum}
            onClick={() => onPageChange(pageNum)}
            className={`w-9 h-9 rounded-lg border text-sm font-medium transition-colors ${
              currentPage === pageNum
                ? 'bg-blue-600 text-white border-transparent'
                : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
            }`}
          >
            {pageNum}
          </button>
        ))}

        {/* Следующая */}
        <button
          disabled={isNextDisabled}
          onClick={() => onPageChange(currentPage + 1)}
          className={navBtnClass(isNextDisabled)}
          aria-label="Следующая страница"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
