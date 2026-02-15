'use client';

import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { VIPChatSystem } from '@/components/chat/VIPChatSystem';
import { GiftPicker } from '@/components/chat/GiftPicker';
import { GifPicker } from '@/components/chat/GifPicker';
import { QuestionOfTheDayCard } from '@/components/chat/QuestionOfTheDayCard';
import { IcebreakersModal } from '@/components/chat/IcebreakersModal';
import { Toast } from '@/components/ui/Toast';
import { ChatToolbar } from './ChatToolbar';
import { useChatPage } from './useChatPage';

const CallScreen = dynamic(() => import('@/components/chat/CallScreen').then(m => ({ default: m.CallScreen })), {
    ssr: false,
    loading: () => null
});

export default function ChatPage() {
    const router = useRouter();
    const chat = useChatPage();

    if (chat.isChecking || chat.loading) return (
        <div className="h-full bg-black flex flex-col items-center justify-center text-white font-mono space-y-4">
            <div className="w-12 h-12 border-2 border-primary-red/30 border-t-primary-red rounded-full animate-spin" />
            <p className="text-primary-red animate-pulse">Установка защищенного соединения...</p>
        </div>
    );

    if (!chat.user) return <div className="h-full bg-black flex items-center justify-center text-white">Чат не найден</div>;

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black overflow-hidden">
            <VIPChatSystem
                user={chat.user}
                messages={chat.messages}
                isPremium={true}
                onSendMessage={chat.handleSendMessage}
                onSendImage={chat.handleSendImage}
                onSendSuperLike={() => chat.setShowGiftPicker(true)}
                onReaction={chat.handleReaction}
                onBack={() => router.back()}
                injectInputText={chat.injectInputText}
                onConsumedInject={() => chat.setInjectInputText('')}
                toolbarSlot={
                    <div className="flex flex-col gap-2 p-2 bg-black/80 backdrop-blur-sm border-b border-white/5">
                        <QuestionOfTheDayCard
                            matchId={chat.id}
                            onBothAnswered={() => {}}
                        />
                        <ChatToolbar
                            matchId={chat.id}
                            ephemeralEnabled={chat.ephemeralEnabled}
                            ephemeralSeconds={chat.ephemeralSeconds}
                            onToggleEphemeral={chat.setEphemeralEnabled}
                            onChangeEphemeralSeconds={chat.setEphemeralSeconds}
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
                            onOpenGifPicker={() => chat.setShowGifPicker(true)}
                            onOpenIcebreakers={() => chat.setShowIcebreakers(true)}
                            onSelectPrompt={(text) => chat.setInjectInputText(text)}
                        />
                    </div>
                }
            />

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
