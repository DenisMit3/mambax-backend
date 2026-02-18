'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default function TermsOfServicePage() {
    return (
        <div className="min-h-dvh bg-black text-white p-6 pb-20">
            <header className="flex items-center gap-4 mb-8">
                <Link href="/profile" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white">
                    <ChevronLeft size={24} />
                </Link>
                <h1 className="text-2xl font-black italic tracking-wider uppercase">Terms of Service</h1>
            </header>

            <div className="space-y-6 text-sm text-gray-400 leading-relaxed font-sans">
                <section>
                    <h2 className="text-white font-bold uppercase mb-2">1. Eligibility</h2>
                    <p>
                        You must be at least 18 years old to use MambaX. By using the app, you represent that you meet this requirement.
                    </p>
                </section>

                <section>
                    <h2 className="text-white font-bold uppercase mb-2">2. User Conduct</h2>
                    <p>
                        Users are expected to communicate respectfully. Harassment, hate speech, and fraudulent behavior are strictly prohibited.
                    </p>
                </section>

                <section>
                    <h2 className="text-white font-bold uppercase mb-2">3. Virtual Goods</h2>
                    <p>
                        Purchases made with Telegram Stars are final and non-refundable, except as required by law.
                    </p>
                </section>

                <section>
                    <h2 className="text-white font-bold uppercase mb-2">4. Termination</h2>
                    <p>
                        We reserve the right to suspend or terminate accounts that violate these terms or for any other reason at our discretion.
                    </p>
                </section>

                <p className="pt-8 text-xs text-gray-600 italic">
                    Last updated: February 2026
                </p>
            </div>
        </div>
    );
}
