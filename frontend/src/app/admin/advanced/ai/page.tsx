'use client';

import AIContentGenerator from '@/components/admin/advanced/AIContentGenerator';

export default function AIAdvancedPage() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 text-zinc-900 dark:text-zinc-100">AI Features</h1>
      <AIContentGenerator />
    </div>
  );
}
