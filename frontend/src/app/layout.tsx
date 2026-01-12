import "./globals.css";
import { Inter } from "next/font/google"; // Use Inter for premium feel
import Script from "next/script";
import { ClientLayout } from "@/components/layout/ClientLayout";
import { Metadata } from "next";

// Optimize Font Loading
const inter = Inter({
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: "MambaX",
  description: "Telegram Dating App",
};

import { DevModeToggle } from "@/components/ui/DevModeToggle";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.NODE_ENV === "development";

  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#ffffff" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
      </head>
      <body className={inter.className}>
        <div className="desktop-wrapper">
          <div className="mobile-frame">
            <ClientLayout>
              {children}
            </ClientLayout>
          </div>
        </div>
        {isDev && <DevModeToggle />}
      </body>
    </html>
  );
}
