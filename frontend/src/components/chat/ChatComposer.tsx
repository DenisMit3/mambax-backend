'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Gift, Image, Smile } from 'lucide-react';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { VoiceRecorder } from './VoiceRecorder';
import { EMOJI_PICKER_LIST } from './ChatTypes';

interface ChatComposerProps {
    message: string;
    isPremium: boolean;
    inputRef: React.RefObject<HTMLInputElement | null>;
    onMessageChange: (value: string) => void;
    onSendMessage: () => void;
    onVoiceSend: (audioBlob: Blob, duration: number) => void;
}

// Поле ввода сообщения: текст, эмодзи, вложения, голос
export const ChatComposer = ({
    message,
    isPremium,
    inputRef,
    onMessageChange,
    onSendMessage,
    onVoiceSend,
}: ChatComposerProps) => {
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    return (
        <motion.div
            className="p-4 border-t border-white/10 bg-black/20 backdrop-blur-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
        >
            <div className="flex items-center space-x-3">
                {/* Кнопки вложений */}
                <div className="flex space-x-2">
                    <AnimatedButton
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 min-w-[44px] min-h-[44px]"
                    >
                        <Image className="w-5 h-5" />
                    </AnimatedButton>

                    {isPremium && (
                        <AnimatedButton
                            variant="ghost"
                            size="sm"
                            className="text-pink-400 min-w-[44px] min-h-[44px]"
                        >
                            <Gift className="w-5 h-5" />
                        </AnimatedButton>
                    )}
                </div>

                {/* Поле ввода */}
                <div className="flex-1 relative">
                    <input
                        ref={inputRef}
                        type="text"
                        value={message}
                        onChange={(e) => onMessageChange(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && onSendMessage()}
                        placeholder="Напишите сообщение..."
                    autoComplete="off"
                    autoCapitalize="sentences"
                    enterKeyHint="send"
                        className="w-full bg-gray-800 text-white rounded-full px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center"
                    >
                        <Smile className="w-5 h-5" />
                    </button>
                </div>

                {/* Кнопка отправки или голосовое */}
                {message.trim() ? (
                    <AnimatedButton
                        onClick={onSendMessage}
                        className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                    >
                        <Send className="w-4 h-4" />
                    </AnimatedButton>
                ) : (
                    <VoiceRecorder onSend={onVoiceSend} />
                )}
            </div>

            {/* Пикер эмодзи */}
            <AnimatePresence>
                {showEmojiPicker && (
                    <motion.div
                        className="absolute bottom-16 right-4 bg-gray-800 rounded-2xl p-4 shadow-lg border border-gray-700"
                        initial={{ opacity: 0, scale: 0.8, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 10 }}
                    >
                        <div className="grid grid-cols-6 gap-2">
                            {EMOJI_PICKER_LIST.map((emoji) => (
                                <button
                                    key={emoji}
                                    className="text-xl hover:scale-125 transition-transform p-1"
                                    onClick={() => {
                                        onMessageChange(message + emoji);
                                        setShowEmojiPicker(false);
                                    }}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
