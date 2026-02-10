"use client";

import { useEffect } from "react";
import Script from "next/script";

// Flag to prevent multiple initializations
let telegramInitialized = false;

export function TelegramProvider({ children }: { children: React.ReactNode }) {

  useEffect(() => {
    // Check if running in browser with window.Telegram
    const init = () => {
      if (typeof window !== 'undefined' && !telegramInitialized) {
        // Use 'unknown' cast or specific type for window.Telegram.
        // Define a type for the Telegram object we expect on window
        type WindowWithTelegram = Window & {
          Telegram?: {
            WebApp?: {
              ready: () => void;
              expand: () => void;
              colorScheme: 'dark' | 'light';
            };
          };
        };

        const windowAsTelegram = window as WindowWithTelegram;

        if (windowAsTelegram.Telegram?.WebApp) {
          const tg = windowAsTelegram.Telegram.WebApp;
          tg.ready();
          tg.expand();
          telegramInitialized = true;

          console.log("Telegram Web App Initialized");

          // Sync Theme
          if (tg.colorScheme === 'dark') {
            document.documentElement.classList.add('dark');
          }
        }
      }
    };

    // Attempt init immediately and after script load
    init();
  }, []);

  return (
    <>
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="afterInteractive"
      />
      {children}
    </>
  );
}
