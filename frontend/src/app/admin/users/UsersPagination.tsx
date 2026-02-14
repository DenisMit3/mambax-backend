'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface UsersPaginationProps {
  currentPage: number;
  totalPages: number;
  totalUsers: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

// Пагинация с номерами страниц
export function UsersPagination({ currentPage, totalPages, totalUsers, itemsPerPage, onPageChange }: UsersPaginationProps) {
  return (
    <div className="flex items-center justify-between mt-8">
      <span className="text-sm text-[var(--admin-text-secondary)]">
        Показано {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalUsers)} из {totalUsers}
      </span>
      <div className="flex gap-2">
        <button
          disabled={currentPage === 1}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          className="p-2 rounded-lg bg-[var(--admin-glass-bg-light)] border border-[var(--admin-glass-border)] text-[var(--admin-text-secondary)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--admin-glass-bg-hover)] transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let pageNum = i + 1;
          if (totalPages > 5 && currentPage > 3) {
            pageNum = currentPage - 3 + i;
            if (pageNum > totalPages) pageNum -= (pageNum - totalPages);
          }
          if (pageNum <= 0) pageNum = i + 1;

          return (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={`w-9 h-9 rounded-lg border text-sm font-medium transition-colors ${currentPage === pageNum
                ? 'bg-[var(--admin-gradient-primary)] text-white border-transparent'
                : 'bg-[var(--admin-glass-bg-light)] border-[var(--admin-glass-border)] text-[var(--admin-text-secondary)] hover:bg-[var(--admin-glass-bg-hover)]'
                }`}
            >
              {pageNum}
            </button>
          );
        })}
        <button
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          className="p-2 rounded-lg bg-[var(--admin-glass-bg-light)] border border-[var(--admin-glass-border)] text-[var(--admin-text-secondary)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--admin-glass-bg-hover)] transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
