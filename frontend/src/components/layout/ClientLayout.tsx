"use client";

import { TelegramProvider } from "@/components/providers/TelegramProvider";
import { BottomNav } from "@/components/layout/BottomNav";
import { usePathname } from "next/navigation";

export function ClientLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    // Hide bottom nav on specific pages
    const hideNav = pathname === "/" || pathname.startsWith("/auth") || pathname === "/onboarding" || (pathname.startsWith("/chat/") && pathname !== "/chat");

    return (
        <TelegramProvider>
            {children}
            {!hideNav && <BottomNav />}
        </TelegramProvider>
    );
}
