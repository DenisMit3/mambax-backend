'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default function PrivacyPolicyPage() {
    return (
        <div className="min-h-dvh bg-black text-white p-6 pb-20">
            <header className="flex items-center gap-4 mb-8">
                <Link href="/profile" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white">
                    <ChevronLeft size={24} />
                </Link>
                <h1 className="text-2xl font-black italic tracking-wider uppercase">Privacy Policy</h1>
            </header>

            <div className="space-y-6 text-sm text-gray-400 leading-relaxed font-sans">
                <section>
                    <h2 className="text-white font-bold uppercase mb-2">1. Data Collection</h2>
                    <p>
                        MambaX collects minimal personal information necessary for functioning: your Telegram ID, name, photos, and bio provided during registration.
                    </p>
                </section>

                <section>
                    <h2 className="text-white font-bold uppercase mb-2">2. Data Usage</h2>
                    <p>
                        We use your data to provide AI-powered matching, personalized recommendations, and to facilitate communication between users.
                    </p>
                </section>

                <section>
                    <h2 className="text-white font-bold uppercase mb-2">3. Data Sharing</h2>
                    <p>
                        We do not sell your personal data. Your profile information is visible to other users of the application as part of the dating experience.
                    </p>
                </section>

                <section>
                    <h2 className="text-white font-bold uppercase mb-2">4. Security</h2>
                    <p>
                        We implement industry-standard security measures to protect your data. However, no digital transmission is 100% secure.
                    </p>
                </section>

                <p className="pt-8 text-xs text-gray-600 italic">
                    Last updated: February 2026
                </p>
            </div>
        </div>
    );
}
