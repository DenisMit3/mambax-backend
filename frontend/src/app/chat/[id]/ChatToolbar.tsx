'use client';

import React from 'react';
import { Phone, Video, Lightbulb } from 'lucide-react';
import { EphemeralToggle } from '@/components/chat/EphemeralMessages';
import { ConversationPromptsButton } from '@/components/chat/ConversationPromptsButton';

interface ChatToolbarProps {
    matchId: string;
    ephemeralEnabled: boolean;
    ephemeralSeconds: number;
    onToggleEphemeral: (v: boolean) => void;
    onChangeEphemeralSeconds: (v: number) => void;
    onStartAudioCall: () => void;
    onStartVideoCall: () => void;
    onOpenGifPicker: () => void;
    onOpenIcebreakers: () => void;
    onSelectPrompt: (text: string) => void;
}

export function ChatToolbar({
    matchId,
    ephemeralEnabled,
    ephemeralSeconds,
    onToggleEphemeral,
    onChangeEphemeralSeconds,
    onStartAudioCall,
    onStartVideoCall,
    onOpenGifPicker,
    onOpenIcebreakers,
    onSelectPrompt,
}: ChatToolbarProps) {
    return (
        <div className="flex items-center gap-2 overflow-x-auto">
            <button
                type="button"
                onClick={onStartAudioCall}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white/90 transition-colors"
                title="Аудиозвонок"
            >
                <Phone className="w-4 h-4 text-green-400" />
            </button>
            <button
                type="button"
                onClick={onStartVideoCall}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white/90 transition-colors"
                title="Видеозвонок"
            >
                <Video className="w-4 h-4 text-blue-400" />
            </button>
            <button
                type="button"
                onClick={onOpenGifPicker}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white/90 text-sm font-bold transition-colors"
                title="Отправить GIF"
            >
                GIF
            </button>
            <EphemeralToggle
                isEnabled={ephemeralEnabled}
                seconds={ephemeralSeconds}
                onToggle={onToggleEphemeral}
                onChangeSeconds={onChangeEphemeralSeconds}
            />
            <ConversationPromptsButton
                matchId={matchId}
                onSelectPrompt={onSelectPrompt}
            />
            <button
                type="button"
                onClick={onOpenIcebreakers}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white/90 text-sm transition-colors"
                title="Идеи для разговора"
            >
                <Lightbulb className="w-4 h-4 text-amber-400" />
                <span>Идеи</span>
            </button>
        </div>
    );
}
