'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { VIPChatSystem } from '@/components/chat/VIPChatSystem';
import { GiftPicker } from '@/components/chat/GiftPicker';
import { GifPicker } from '@/components/chat/GifPicker';
import { QuestionOfTheDayCard } from '@/components/chat/QuestionOfTheDayCard';
import { IcebreakersModal } from '@/components/chat/IcebreakersModal';
import { Toast } from '@/components/ui/Toast';
import { useChatPage } from './useChatPage';

const CallScreen = dynamic(() => import('@/components/chat/CallScreen').then(m => ({ default: m.CallScreen })), {
    ssr: false,
    loading: () => null
});

const loadingPhrases = [
    '🔐 Устанавливаем защищённое соединение...',
    '🔥 Подкидываем дрова в печку...',
    '⚡ Ещё чуть-чуть...',
    '💬 Готовим чат для вас...',
    '🚀 Почти на месте!',
];

function ChatLoader() {
    const [phraseIdx, setPhraseIdx] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setPhraseIdx(prev => (prev + 1) % loadingPhrases.length);
        }, 1500);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center text-white font-mono space-y-4">
            <div className="w-12 h-12 border-2 border-primary-red/30 border-t-primary-red rounded-full animate-spin" />
            <p className="text-primary-red animate-pulse transition-all duration-300 text-center px-6">
                {loadingPhrases[phraseIdx]}
            </p>
        </div>
    );
}

export default function ChatPage() {
    const router = useRouter();
    const chat = useChatPage();

    if (chat.isChecking || chat.loading) return <ChatLoader />;

    if (!chat.user) return <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center text-white">Чат не найден</div>;

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black" style={{ height: '100dvh' }}>
            <VIPChatSystem
                user={chat.user}
                messages={chat.messages}
                isPremium={true}
                onSendMessage={chat.handleSendMessage}
                onSendImage={chat.handleSendImage}
                onSendSuperLike={() => chat.setShowGiftPicker(true)}
                onReaction={chat.handleReaction}
                onBack={() => router.push('/chat')}
                injectInputText={chat.injectInputText}
                onConsumedInject={() => chat.setInjectInputText('')}
                // Звонки — в шапку
                onStartAudioCall={() => {
                    chat.setCallType("audio");
                    chat.setIncomingCall(null);
                    chat.setShowCall(true);
                }}
                onStartVideoCall={() => {
                    chat.setCallType("video");
                    chat.setIncomingCall(null);
                    chat.setShowCall(true);
                }}
                // Ephemeral — в меню шапки
                ephemeralEnabled={chat.ephemeralEnabled}
                onToggleEphemeral={chat.setEphemeralEnabled}
                ephemeralSeconds={chat.ephemeralSeconds}
                onChangeEphemeralSeconds={chat.setEphemeralSeconds}
                // GIF и Идеи — кнопки в composer
                onOpenGifPicker={() => chat.setShowGifPicker(true)}
                onOpenIcebreakers={() => chat.setShowIcebreakers(true)}
                // Вопрос дня — компактная карточка над composer
                questionOfDaySlot={
                    <QuestionOfTheDayCard
                        matchId={chat.id}
                        onBothAnswered={() => {}}
                    />
                }
            />

            {/* Модалки */}
            <IcebreakersModal
                isOpen={chat.showIcebreakers}
                onClose={() => chat.setShowIcebreakers(false)}
                matchId={chat.id}
                onSelectIcebreaker={(text) => {
                    chat.setInjectInputText(text);
                    chat.setShowIcebreakers(false);
                }}
            />

            <GiftPicker
                isOpen={chat.showGiftPicker}
                gifts={chat.gifts}
                onClose={() => chat.setShowGiftPicker(false)}
                onSelectGift={chat.handleSendGift}
            />

            <CallScreen
                isOpen={chat.showCall}
                matchId={chat.id}
                callType={chat.callType}
                callerName={chat.user?.name || ""}
                callerPhoto={chat.user?.photo || ""}
                isIncoming={!!chat.incomingCall}
                ws={chat.ws.current}
                currentUserId={chat.currentUserIdRef.current || ""}
                remoteUserId={chat.user?.id || ""}
                onClose={() => {
                    chat.setShowCall(false);
                    chat.setIncomingCall(null);
                }}
            />

            <GifPicker
                isOpen={chat.showGifPicker}
                onClose={() => chat.setShowGifPicker(false)}
                onSelectGif={(gifUrl) => {
                    chat.handleSendMessage(`[GIF] ${gifUrl}`);
                    chat.setShowGifPicker(false);
                }}
            />

            {chat.toast && <Toast message={chat.toast.message} type={chat.toast.type} onClose={() => chat.setToast(null)} />}
        </div>
    );
}
