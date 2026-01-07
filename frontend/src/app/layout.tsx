"use client";

import "./globals.css";
import { Inter } from "next/font/google"; // Use Inter for premium feel
import { TelegramProvider } from "@/components/providers/TelegramProvider";
import Script from "next/script";
import { BottomNav } from "@/components/layout/BottomNav";
import { usePathname } from "next/navigation";

// Optimize Font Loading
const inter = Inter({
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-inter',
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();

  // Hide bottom nav on specific pages
  const hideNav = pathname === "/" || pathname.startsWith("/auth") || pathname === "/onboarding";

  return (
    <html lang="en" className={inter.variable}>
      <head>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      </head>
      <body className={inter.className}>
        <TelegramProvider>
          {children}
          {!hideNav && <BottomNav />}
        </TelegramProvider>
      </body>
    </html>
  );
}
