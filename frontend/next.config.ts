import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // Proxy all API requests through a specific prefix to avoid conflicts with frontend pages
      {
        source: '/api_proxy/:path*',
        destination: `${process.env.BACKEND_URL || 'http://127.0.0.1:8001'}/:path*`, // Proxy to Backend
      },
      // Support for direct /debug access (if client cached)
      {
        source: '/debug/:path*',
        destination: `${process.env.BACKEND_URL || 'http://127.0.0.1:8001'}/debug/:path*`,
      },
      // Special case for WebSocket upgrade endpoint (if accessed via HTTP initially)
      {
        source: '/chat/ws',
        destination: `${process.env.BACKEND_URL || 'http://127.0.0.1:8001'}/chat/ws`,
      },
      {
        source: '/chat/ws/:path*',
        destination: `${process.env.BACKEND_URL || 'http://127.0.0.1:8001'}/chat/ws/:path*`,
      }
    ];
  },
};

export default nextConfig;
