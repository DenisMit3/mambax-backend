/**
 * Lighthouse CI Configuration
 * Run: npx lhci autorun
 */
module.exports = {
  ci: {
    collect: {
      // URL to audit (change to your deployed URL)
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/discover',
        'http://localhost:3000/chat',
        'http://localhost:3000/profile'
      ],
      // Number of runs per URL for more accurate results
      numberOfRuns: 3,
      // Start server command (optional, if not already running)
      startServerCommand: 'npm run start',
      startServerReadyPattern: 'ready on',
      startServerReadyTimeout: 30000,
    },
    assert: {
      // Performance budgets based on optimization goals
      assertions: {
        // FCP < 1.5s target
        'first-contentful-paint': ['warn', { maxNumericValue: 1500 }],
        // TTI < 3s target  
        'interactive': ['warn', { maxNumericValue: 3000 }],
        // LCP < 2.5s (Core Web Vital)
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        // CLS < 0.1 (Core Web Vital)
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
        // Overall score > 90
        'categories:performance': ['warn', { minScore: 0.9 }],
        'categories:accessibility': ['warn', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'categories:seo': ['warn', { minScore: 0.9 }],
      },
    },
    upload: {
      // Save reports locally
      target: 'filesystem',
      outputDir: './lighthouse-reports',
    },
  },
};
