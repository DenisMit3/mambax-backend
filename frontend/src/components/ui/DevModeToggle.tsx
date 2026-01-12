"use client";

import { useEffect, useState } from "react";

export const DevModeToggle = () => {
    const [isMobileView, setIsMobileView] = useState(true);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Check localStorage on mount
        const savedMode = localStorage.getItem("devViewMode");
        if (savedMode === "desktop") {
            setIsMobileView(false);
            document.body.classList.add("force-desktop-view");
        } else {
            // Default to mobile view (wrapper active)
            setIsMobileView(true);
            document.body.classList.remove("force-desktop-view");
        }
    }, []);

    const toggleMode = () => {
        const newMode = !isMobileView;
        setIsMobileView(newMode);

        if (newMode) {
            // Switch TO Mobile emulation
            document.body.classList.remove("force-desktop-view");
            localStorage.setItem("devViewMode", "mobile");
        } else {
            // Switch TO Desktop full width
            document.body.classList.add("force-desktop-view");
            localStorage.setItem("devViewMode", "desktop");
        }
    };

    if (!mounted) return null;

    return (
        <button
            onClick={toggleMode}
            className="fixed bottom-4 right-4 z-[9999] flex h-12 w-12 items-center justify-center rounded-full bg-black text-white shadow-lg transition-transform hover:scale-110 active:scale-95"
            title={isMobileView ? "Switch to Desktop View" : "Switch to Mobile View"}
            style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}
        >
            {isMobileView ? (
                // Desktop Icon
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <rect width="20" height="14" x="2" y="3" rx="2" />
                    <line x1="8" x2="16" y1="21" y2="21" />
                    <line x1="12" x2="12" y1="17" y2="21" />
                </svg>
            ) : (
                // Mobile Icon
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
                    <path d="M12 18h.01" />
                </svg>
            )}
        </button>
    );
};
