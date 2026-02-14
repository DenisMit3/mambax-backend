'use client';

import { useRouter } from 'next/navigation';
import { VerificationScanner } from '@/components/auth/VerificationScanner';

export default function VerificationPage() {
    const router = useRouter();
    return (
        <main>
            <VerificationScanner
                onSuccess={() => router.push('/')}
                onCancel={() => router.back()}
            />
        </main>
    );
}
