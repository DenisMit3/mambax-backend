import type { Metadata, Viewport } from 'next';
import React from 'react';
import { Manrope } from 'next/font/google';
import './globals.css';
import Script from 'next/script';
import ClientLayout from '@/components/layout/ClientLayout';

const manrope = Manrope({
    subsets: ['latin', 'cyrillic'],
    variable: '--font-manrope',
    display: 'swap',
});

export const metadata: Metadata = {
    metadataBase: new URL('https://mambax.app'),
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
    interactiveWidget: 'resizes-content',
    // FIX (UX): Enable safe area insets on iOS (without this env() values are always 0)
    viewportFit: 'cover',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="ru" suppressHydrationWarning>
            <head>
                {/* Critical CSS inlined intentionally to prevent FOUC (dangerouslySetInnerHTML is safe here — static string, no user input) */}
                <style dangerouslySetInnerHTML={{
                    __html: `
                    body { background-color: #ffffff; color: #000000; }
                `}} />
                <Script
                    src="https://telegram.org/js/telegram-web-app.js"
                    strategy="afterInteractive"
                />
            </head>
            <body className={`${manrope.variable} font-sans antialiased text-slate-900 bg-gray-50 overflow-hidden`}>
                <script dangerouslySetInnerHTML={{ __html: `
                    try {
                        // CRITICAL: Save Telegram initData immediately before any redirects can lose it
                        function __saveTgInitData() {
                            if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData && window.Telegram.WebApp.initData.length > 0) {
                                sessionStorage.setItem('tg_init_data', window.Telegram.WebApp.initData);
                                return true;
                            }
                            return false;
                        }
                        if (!__saveTgInitData()) {
                            // SDK might not be ready yet, retry a few times
                            var __tgRetry = 0;
                            var __tgInterval = setInterval(function() {
                                if (__saveTgInitData() || ++__tgRetry > 20) clearInterval(__tgInterval);
                            }, 50);
                        }
                        
                        document.body.style.background = '#0f0f11';

                        // DEBUG OVERLAY: Only in development builds
                        if ('${process.env.NODE_ENV}' === 'development') {
                            var d = document.createElement('div');
                            d.id = '__boot_debug';
                            d.style.cssText = 'position:fixed;bottom:60px;left:0;right:0;z-index:9999;background:rgba(0,0,0,0.95);color:#0f0;font:9px monospace;padding:4px;max-height:40vh;overflow:auto;white-space:pre-wrap;word-break:break-all;';
                            d.textContent = '[BOOT] ' + new Date().toISOString() + ' tgSaved=' + !!sessionStorage.getItem('tg_init_data');
                            document.body.appendChild(d);
                            
                            window.__bootLog = function(msg) {
                                var el = document.getElementById('__boot_debug');
                                if (el) {
                                    el.textContent += '\\n' + msg;
                                    el.scrollTop = el.scrollHeight;
                                }
                            };
                            
                            window.onerror = function(m,s,l,c,e) {
                                window.__bootLog('[ERR] ' + m + ' at ' + (s||'').split('/').pop() + ':' + l);
                            };
                            window.addEventListener('unhandledrejection', function(ev) {
                                window.__bootLog('[REJECT] ' + (ev.reason && ev.reason.message || ev.reason));
                            });
                        }
                    } catch(e) { console.warn('Layout init error:', e); }
                `}} />
                <ClientLayout>{children}</ClientLayout>
                {/* HONEYPOT TRAP: Bots following this invisible link get banned */}
                <a href="/api_proxy/trap" style={{ display: 'none', visibility: 'hidden' }} aria-hidden="true" rel="nofollow">System Node Status</a>
            </body>
        </html>
    );
}
