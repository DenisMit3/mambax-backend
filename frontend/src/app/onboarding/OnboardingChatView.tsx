'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Camera, ArrowRight } from 'lucide-react';
import { type Message, type UserData, getEmojiForOption } from './onboardingTypes';

interface OnboardingChatViewProps {
    messages: Message[];
    isTyping: boolean;
    userData: UserData;
    tempSelectedOptions: string[];
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    messagesEndRef: React.RefObject<HTMLDivElement | null>;
    handleOptionClick: (option: string, multiSelect?: boolean) => void;
    handlePhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleFinishOnboarding: () => void;
}

// --- Область чата: сообщения, опции, загрузка фото ---
export default function OnboardingChatView({
    messages,
    isTyping,
    userData,
    tempSelectedOptions,
    fileInputRef,
    messagesEndRef,
    handleOptionClick,
    handlePhotoUpload,
    handleFinishOnboarding,
}: OnboardingChatViewProps) {
    return (
        <>
            <input type="file" accept="image/*" multiple className="hidden" ref={fileInputRef} onChange={handlePhotoUpload} />
            <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24 scrollbar-hide">
                {messages.map((msg) => (
                    <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${msg.isAI ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[88%] ${msg.isAI ? 'order-2' : ''}`}>
                            {(msg.type !== 'photo_upload') && (
                                <div className={`px-5 py-3.5 rounded-2xl text-sm leading-relaxed shadow-lg ${msg.isAI ? 'bg-[#1c1c1e] text-gray-100 rounded-tl-sm border border-white/5' : 'bg-gradient-to-br from-[#ff4b91] to-[#ff9e4a] text-white rounded-tr-sm font-bold'}`}>
                                    <p className="whitespace-pre-wrap">{msg.text}</p>
                                </div>
                            )}
                            {msg.isAI && msg.options && (
                                <div className="mt-3 flex flex-col items-start gap-3 w-full">
                                    <div className={`flex flex-wrap gap-2 w-full ${msg.layoutType === 'card' ? 'grid grid-cols-2 gap-3' : ''}`}>
                                        {msg.options.map(opt => (
                                            <button
                                                key={opt}
                                                onClick={() => handleOptionClick(opt, msg.multiSelect)}
                                                className={`
                                                    transition-all active:scale-95
                                                    ${msg.layoutType === 'card'
                                                        ? `h-24 rounded-2xl flex flex-col items-center justify-center p-2 font-bold text-sm shadow-md border 
                                                            ${tempSelectedOptions.includes(opt)
                                                            ? 'bg-gradient-to-br from-[#ff4b91] to-[#ff9e4a] text-white border-transparent'
                                                            : 'bg-[#1c1c1e] text-gray-300 border-white/10 hover:bg-white/5'}`
                                                        : `px-4 py-2.5 rounded-xl text-xs font-medium 
                                                            ${tempSelectedOptions.includes(opt)
                                                            ? 'bg-white text-black scale-105 shadow-lg'
                                                            : 'bg-white/5 border border-white/10 text-gray-200 hover:bg-white/10'}`
                                                    }
                                                `}
                                            >
                                                {msg.layoutType === 'card' && <span className="text-2xl mb-1">{getEmojiForOption(opt)}</span>}
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {msg.isAI && msg.type === 'photo_upload' && (
                                <div className="mt-2 bg-[#1c1c1e] p-5 rounded-2xl border border-white/10 text-center space-y-4 shadow-xl">
                                    <p className="text-gray-400 text-sm mb-2">{msg.text}</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        {userData.photos.map((photoData, idx) => (
                                            <motion.div layout key={photoData.preview || idx} className="aspect-[3/4] rounded-xl overflow-hidden relative border border-white/10 shadow-sm">
                                                <Image src={photoData.preview} className="w-full h-full object-cover" alt={`Photo ${idx + 1}`} fill sizes="128px" />
                                            </motion.div>
                                        ))}
                                        {userData.photos.length < 4 && (
                                            <button onClick={() => fileInputRef.current?.click()} className="aspect-[3/4] rounded-xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center hover:bg-white/5 hover:border-[#ff4b91]/50 transition-all gap-2 group">
                                                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                    <Camera className="w-5 h-5 text-gray-400 group-hover:text-[#ff4b91]" />
                                                </div>
                                                <span className="text-[9px] uppercase tracking-widest text-gray-500 font-bold group-hover:text-gray-300">Добавить</span>
                                            </button>
                                        )}
                                    </div>
                                    {userData.photos.length > 0 && (
                                        <button onClick={handleFinishOnboarding} className="w-full py-4 bg-gradient-to-r from-[#ff4b91] to-[#ff9e4a] rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shadow-[0_4px_15px_rgba(255,75,145,0.3)] hover:scale-[1.02] transition-transform animate-in slide-in-from-bottom-2">
                                            <span>Я загрузил всё, продолжить</span> <ArrowRight className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                ))}
                {isTyping && (
                    <div className="flex justify-start">
                        <div className="bg-[#1c1c1e] px-4 py-3 rounded-2xl rounded-tl-sm flex space-x-1 border border-white/5">
                            <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
        </>
    );
}
