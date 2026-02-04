'use client';

import { VerificationScanner } from '@/components/auth/VerificationScanner';

export default function VerificationPage() {
    return (
        <main>
            <VerificationScanner
                onSuccess={() => window.location.href = '/'}
                onCancel={() => window.history.back()}
            />
        </main>
    );
}
