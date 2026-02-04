"use client";

import { useEffect, useState } from "react";
import { Monitor, Phone } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const DevModeToggle = () => {
    const [isMobileView, setIsMobileView] = useState(true);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const savedMode = localStorage.getItem("devViewMode");
        if (savedMode === "desktop") {
            setIsMobileView(false);
            document.body.classList.add("force-desktop-view");
        } else {
            setIsMobileView(true);
            document.body.classList.remove("force-desktop-view");
        }
    }, []);

    const toggleMode = () => {
        const newMode = !isMobileView;
        setIsMobileView(newMode);

        if (newMode) {
            document.body.classList.remove("force-desktop-view");
            localStorage.setItem("devViewMode", "mobile");
        } else {
            document.body.classList.add("force-desktop-view");
            localStorage.setItem("devViewMode", "desktop");
        }
    };

    if (!mounted) return null;

    return (
        <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleMode}
            className={cn(
                "fixed bottom-6 right-6 z-[9999] flex h-14 w-14 items-center justify-center rounded-2xl",
                "text-white shadow-2xl transition-colors hover:bg-slate-800",
                "glass-panel bg-slate-900/80" // Override glass-panel bg with 80% opacity
            )}
            title={isMobileView ? "Switch to Desktop View" : "Switch to Mobile View"}
        >
            {isMobileView ? (
                <Monitor size={24} className="text-amber-400" />
            ) : (
                <Phone size={24} className="text-blue-400" />
            )}
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900" />
        </motion.button>
    );
};
