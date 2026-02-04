import type { Metadata, Viewport } from 'next';
import React from 'react';
import './globals.css';
import Script from 'next/script';
import ClientLayout from '@/components/layout/ClientLayout';

export const metadata: Metadata = {
    title: 'MambaX | Premium Dating',
    description: 'The future of digital dating and artificial personality matching.',
    keywords: ['dating', 'знакомства', 'мамба', 'telegram dating', 'premium dating'],
    authors: [{ name: 'MambaX Team' }],

    // Open Graph for social sharing
    openGraph: {
        title: 'MambaX | Premium Dating',
        description: 'Find your perfect match with AI-powered compatibility',
        url: 'https://mambax.app',
        siteName: 'MambaX',
        locale: 'ru_RU',
        type: 'website',
        images: [
            {
                url: '/og-image.png',
                width: 1200,
                height: 630,
                alt: 'MambaX - Premium Dating Platform',
            }
        ],
    },

    // Twitter Card
    twitter: {
        card: 'summary_large_image',
        title: 'MambaX | Premium Dating',
        description: 'Find your perfect match with AI-powered compatibility',
        images: ['/og-image.png'],
    },

    // PWA & App metadata
    applicationName: 'MambaX',
    appleWebApp: {
        capable: true,
        title: 'MambaX',
        statusBarStyle: 'black-translucent',
    },

    // Robots
    robots: {
        index: true,
        follow: true,
    },
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    // FIX (A11Y): Allow user scaling for accessibility (WCAG compliance)
    maximumScale: 5,
    userScalable: true,
    themeColor: '#000000',
    interactiveWidget: 'resizes-content'
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="ru" suppressHydrationWarning>
            <head>
                <style dangerouslySetInnerHTML={{
                    __html: `
                    body { background-color: #ffffff; color: #000000; }
                `}} />
                <Script
                    src="https://telegram.org/js/telegram-web-app.js"
                    strategy="beforeInteractive"
                />
            </head>
            <body className="antialiased font-sans text-slate-900 bg-gray-50 overflow-hidden">
                <ClientLayout>{children}</ClientLayout>
                {/* HONEYPOT TRAP: Bots following this invisible link get banned */}
                <a href="/api_proxy/trap" style={{ display: 'none', visibility: 'hidden' }} aria-hidden="true" rel="nofollow">System Node Status</a>
            </body>
        </html>
    );
}
