import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/hooks/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/services/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/utils/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: 'var(--primary)',
                    foreground: 'var(--primary-foreground)',
                    red: '#FF3B30',
                    orange: '#FF9500',
                    main: '#FF3B30', // Alias
                },
                background: 'var(--background)',
                foreground: 'var(--foreground)',
                surface: 'var(--surface)',
                card: {
                    DEFAULT: 'var(--card)',
                    foreground: 'var(--card-foreground)',
                },
                popover: {
                    DEFAULT: 'var(--popover)',
                    foreground: 'var(--popover-foreground)',
                },
                secondary: {
                    DEFAULT: 'var(--secondary)',
                    foreground: 'var(--secondary-foreground)',
                },
                accent: {
                    DEFAULT: 'var(--accent)',
                    foreground: 'var(--accent-foreground)',
                },
                destructive: {
                    DEFAULT: 'var(--destructive)',
                    foreground: 'var(--destructive-foreground)',
                },
                border: 'var(--border)',
                input: 'var(--input)',
                ring: 'var(--ring)',
                muted: {
                    DEFAULT: 'var(--muted)',
                    foreground: 'var(--muted-foreground)',
                },
                chart: {
                    '1': 'var(--chart-1)',
                    '2': 'var(--chart-2)',
                    '3': 'var(--chart-3)',
                    '4': 'var(--chart-4)',
                    '5': 'var(--chart-5)',
                },
                sidebar: {
                    DEFAULT: 'var(--sidebar)',
                    foreground: 'var(--sidebar-foreground)',
                    primary: 'var(--sidebar-primary)',
                    'primary-foreground': 'var(--sidebar-primary-foreground)',
                    accent: 'var(--sidebar-accent)',
                    'accent-foreground': 'var(--sidebar-accent-foreground)',
                    border: 'var(--sidebar-border)',
                    ring: 'var(--sidebar-ring)',
                },
                obsidian: {
                    light: '#1C1C1E',
                    DEFAULT: '#0D0D10',
                    dark: '#050505',
                },
                neon: {
                    blue: '#3b82f6',
                    purple: '#a855f7',
                    pink: '#ec4899',
                    green: '#10b981',
                    orange: '#f97316',
                    red: '#ef4444',
                    cyan: '#06b6d4',
                    yellow: '#eab308',
                }
            },
            backgroundImage: {
                'gradient-primary': 'linear-gradient(135deg, #FF3B30 0%, #FF9500 100%)',
                'gradient-neon': 'linear-gradient(135deg, #a855f7 0%, #3b82f6 100%)',
            },
            keyframes: {
                'neon-pulse': {
                    '0%, 100%': { boxShadow: '0 0 5px rgba(255, 59, 48, 0.2)' },
                    '50%': { boxShadow: '0 0 20px rgba(255, 59, 48, 0.5)' },
                },
                shimmer: {
                    '0%': { transform: 'translateX(-100%)' },
                    '100%': { transform: 'translateX(100%)' }
                }
            },
            animation: {
                'neon-pulse': 'neon-pulse 2s infinite ease-in-out',
                shimmer: 'shimmer 2s infinite'
            },
            backdropBlur: {
                'xs': '2px',
                '3xl': '32px',
            },
            boxShadow: {
                'neon-blue': '0 0 20px rgba(59, 130, 246, 0.4)',
                'neon-purple': '0 0 20px rgba(168, 85, 247, 0.4)',
            }
        },
    },
    plugins: [],
};
export default config;
