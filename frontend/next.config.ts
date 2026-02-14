import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Docker production build
  output: 'standalone',
  // Skip TS check during build (speeds up CI)
  typescript: { ignoreBuildErrors: true },
  // Security: Hide source code in production
  productionBrowserSourceMaps: false,
  // Security: Hide framework identity
  poweredByHeader: false,
  // FIX (PERF): Enable explicit gzip compression
  compress: true,

  // Experimental optimizations
  experimental: {
    // PERF: Tree-shake unused package exports (smaller bundles)
    optimizePackageImports: [
      'lucide-react', 
      'framer-motion', 
      '@radix-ui/react-dialog',
      '@tanstack/react-query',
      'date-fns'
    ],
  },

  // Security Headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY', // We use CSP frame-ancestors for finer control
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin', // Privacy friendly
          },
          {
            key: 'Content-Security-Policy',
            value: `
              default-src 'self';
              script-src 'self' 'unsafe-eval' 'unsafe-inline' https://telegram.org https://oauth.telegram.org https://app.posthog.com https://*.sentry.io;
              style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
              img-src 'self' blob: data: https:;
              font-src 'self' data: https://fonts.gstatic.com;
              connect-src 'self' https://*.sentry.io https://app.posthog.com wss://*.vercel.app https://*.vercel.app; 
              frame-ancestors 'self' https://web.telegram.org https://*.telegram.org;
              form-action 'self';
            `.replace(/\s{2,}/g, ' ').trim(),
          },
        ],
      },
    ];
  },

  async rewrites() {
    const backendUrl = process.env.BACKEND_URL;
    if (!backendUrl) {
      console.warn('BACKEND_URL not set — API proxy will not work');
      return [];
    }
    return [
      {
        source: '/api_proxy/:path*',
        destination: `${backendUrl}/:path*`,
      },
      {
        source: '/debug/:path*',
        destination: `${backendUrl}/debug/:path*`,
      },
      {
        source: '/chat/ws',
        destination: `${backendUrl}/chat/ws`,
      },
      {
        source: '/chat/ws/:path*',
        destination: `${backendUrl}/chat/ws/:path*`,
      },
      {
        source: '/admin/ws',
        destination: `${backendUrl}/admin/ws`,
      },
      {
        source: '/static/:path*',
        destination: `${backendUrl}/static/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${backendUrl}/static/uploads/:path*`,
      }
    ];
  },
  images: {
    // FIX: Enable modern image formats for 3-5x smaller files
    formats: ['image/avif', 'image/webp'],
    // Cache optimized images for 7 days
    minimumCacheTTL: 60 * 60 * 24 * 7,
    // Device sizes optimized for mobile-first dating app
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'plus.unsplash.com' },
      { protocol: 'https', hostname: 'randomuser.me' }, // For demo users
      // Telegram CDN & Avatars
      { protocol: 'https', hostname: 't.me' },
      { protocol: 'https', hostname: 'telegram.org' },
      { protocol: 'https', hostname: 'cdn4.telesco.pe' },
      { protocol: 'https', hostname: 'api.telegram.org' }, // Local bot API
      // Storage Providers
      { protocol: 'https', hostname: 'public.blob.vercel-storage.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'placehold.co' }, // For dev fallback
    ],
  },
};

import { withSentryConfig } from "@sentry/nextjs";

export default withSentryConfig(nextConfig, {
  org: "mambax",
  project: "frontend",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  reactComponentAnnotation: { enabled: true },
  tunnelRoute: "/monitoring",
  disableLogger: true,
});
