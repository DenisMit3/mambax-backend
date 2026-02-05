'use client';

import { motion } from 'framer-motion';

export const SuccessCheckmark = ({ size = 100, color = "#ff4b91" }) => {
    return (
        <div style={{ width: size, height: size }}>
            <svg
                viewBox="0 0 52 52"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full"
            >
                <motion.circle
                    cx="26"
                    cy="26"
                    r="25"
                    stroke={color}
                    strokeWidth="2"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                />
                <motion.path
                    d="M14 27l7 7 16-16"
                    stroke={color}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.3, delay: 0.5, ease: "easeOut" }}
                />
            </svg>
        </div>
    );
};

export const ErrorShake = ({ children, trigger }: { children: React.ReactNode, trigger: boolean }) => {
    return (
        <motion.div
            animate={trigger ? {
                x: [0, -10, 10, -10, 10, 0],
                transition: { duration: 0.4 }
            } : {}}
        >
            {children}
        </motion.div>
    );
};
