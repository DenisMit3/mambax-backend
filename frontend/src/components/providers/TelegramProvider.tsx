"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

export function TelegramProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Check if running in browser with window.Telegram
    const init = () => {
      if (typeof window !== 'undefined') {
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
          setIsReady(true);
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
