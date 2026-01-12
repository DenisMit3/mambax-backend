"use client";

import { TelegramProvider } from "@/components/providers/TelegramProvider";
import { BottomNav } from "@/components/layout/BottomNav";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { notificationService } from "@/services/notificationService";
import { initRemoteLogger } from "@/utils/remoteLogger";
import { GiftNotification } from "@/components/ui/GiftNotification";

import { UserProvider } from "@/context/UserContext";

export function ClientLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    // Hide bottom nav on specific pages
    const hideNav = pathname === "/" || pathname.startsWith("/auth") || pathname === "/onboarding" || (pathname.startsWith("/chat/") && pathname !== "/chat") || pathname.startsWith("/admin");


    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [giftData, setGiftData] = useState<any>(null);

    useEffect(() => {
        // Initialize remote logging for mobile debugging
        if (process.env.NODE_ENV === 'development') {
            initRemoteLogger();
        }

        // Attempt to register push notifications if possible
        notificationService.register();

        // Connect WebSocket Global Listener
        const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
        if (token) {
            // Lazy import or use imported service
            // Ensure connection
            import("@/services/websocket").then(({ wsService }) => {
                wsService.connect(token);
                // Listen for gifts
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const handleGift = (data: any) => {
                    console.log("Global Gift received:", data);
                    setGiftData(data);
                };

                wsService.on("gift_received", handleGift);

                // Cleanup? Ideally we keep it open, but we should remove listener to avoid dupes if re-mount
                // But ClientLayout unmounts only on hard refresh
            });
        }
    }, []);

    return (
        <TelegramProvider>
            <UserProvider>
                {children}
                <GiftNotification data={giftData} onClose={() => setGiftData(null)} />
                {!hideNav && <BottomNav />}
            </UserProvider>
        </TelegramProvider>
    );
}
