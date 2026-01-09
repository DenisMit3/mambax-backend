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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      </head>
      <body className={inter.className}>
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
