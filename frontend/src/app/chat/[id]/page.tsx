"use client";

import { useState, useEffect, useRef, use } from "react";
import { authService } from "@/services/api";
import { ArrowLeft, Send, MoreVertical, Mic, Square, Play, Paperclip, Smile } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

// Mock messages
const MOCK_MESSAGES = [
    { id: 1, sender_id: "other", text: "Hey! How are you?", type: "text" },
    { id: 2, sender_id: "00000000-0000-0000-0000-000000000000", text: "I'm good, thanks!", type: "text" },
];

export default function ChatRoomPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const id = resolvedParams.id;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [messages, setMessages] = useState<any[]>(MOCK_MESSAGES);
    const [inputText, setInputText] = useState("");
    const [chatUser, setChatUser] = useState<{ name: string, photo: string | null } | null>(null);

    // Recording State
    const [recordingState, setRecordingState] = useState<'idle' | 'recording'>('idle');
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [slideOffset, setSlideOffset] = useState(0);

    // Playback State
    const [playingMessageId, setPlayingMessageId] = useState<string | number | null>(null);
    const [playbackProgress, setPlaybackProgress] = useState(0);
    const [playbackTime, setPlaybackTime] = useState(0);
    const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

    // Debug Panel
    const [debugLogs, setDebugLogs] = useState<string[]>([]);
    const [showDebug, setShowDebug] = useState(true);

    // Refs
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const micStreamRef = useRef<MediaStream | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Interaction Refs
    const startXRef = useRef<number>(0);
    const durationRef = useRef<number>(0);
    const slideOffsetRef = useRef<number>(0);

    const log = (msg: string) => {
        const time = new Date().toLocaleTimeString('en-US', { hour12: false });
        setDebugLogs(prev => [...prev.slice(-15), `[${time}] ${msg}`]);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // --- Init ---
    useEffect(() => {
        const loadData = async () => {
            // 1. Fetch Messages
            try {
                const data = await authService.getMessages(id);
                if (Array.isArray(data) && data.length > 0) setMessages(data);
            } catch {
                log("Using mock messages");
            }

            // 2. Fetch Chat User Info via Matches
            try {
                const matches = await authService.getMatches();
                if (Array.isArray(matches)) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const match = matches.find((m: any) => m.id === id);
                    if (match && match.user) {
                        setChatUser({
                            name: match.user.name,
                            photo: match.user.photos && match.user.photos.length > 0 ? match.user.photos[0] : null
                        });
                    }
                }
            } catch (e) {
                console.error("Failed to load user info", e);
            }
        };
        loadData();
    }, [id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, recordingState]);

    // --- Recording Logic ---
    const initRecording = async () => {
        log("Init Rec");
        const startTime = Date.now();
        (initRecording as any).lastStart = startTime;

        // CRITICAL CHECK: Support HTTP local dev if needed, or enforce HTTPS
        if (!navigator.mediaDevices?.getUserMedia) {
            log("ERR: No getUserMedia (Need HTTPS?)");
            return false;
        }

        try {
            if (recordingState === 'idle' && (initRecording as any).lastStart !== startTime) return false;

            let stream = micStreamRef.current;
            if (!stream || !stream.active) {
                try {
                    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    micStreamRef.current = stream;
                } catch (e) {
                    log("ERR: Mic Access Denied");
                    return false;
                }
            }

            // Check if we should still be recording (failed start race condition)
            if (recordingState === 'idle' && durationRef.current === 0) return false;

            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
            mediaRecorder.onstop = async () => {
                const finalDuration = durationRef.current;
                log(`Rec Stop. Dur: ${finalDuration}s`);

                if (audioChunksRef.current.length === 0) return;
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const url = URL.createObjectURL(blob);
                const durStr = formatTime(finalDuration);

                // Optimistic UI
                const tempId = Date.now();
                setMessages(prev => [...prev, {
                    id: tempId,
                    sender_id: "00000000-0000-0000-0000-000000000000",
                    text: "Voice message",
                    type: 'voice',
                    duration: durStr,
                    audioUrl: url,
                    audio_url: url
                }]);

                const file = new File([blob], "voice.webm", { type: blob.type });
                try {
                    const res = await authService.uploadPhoto(file);
                    if (res.url) await authService.sendMessage(id, "Voice", "voice", res.url, durStr);
                } catch (e) {
                    log("Upload Failed");
                }
            };

            mediaRecorder.start(100);
            return true;
        } catch { return false; }
    };

    const stopAndSend = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop();
        cleanupRecording();
    };

    const cancelRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            audioChunksRef.current = [];
        }
        cleanupRecording();
    };

    const cleanupRecording = () => {
        setRecordingState('idle');
        setRecordingDuration(0);
        setSlideOffset(0);
        slideOffsetRef.current = 0;
        if (timerRef.current) clearInterval(timerRef.current);
    };

    // --- Interaction Handlers (Global Listeners) ---
    useEffect(() => {
        // Only attach if recording
        if (recordingState !== 'recording') return;

        const handleMove = (e: TouchEvent | MouseEvent) => {
            const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
            const diff = startXRef.current - clientX;
            if (diff > 0) {
                const newOffset = Math.min(diff, 150);
                setSlideOffset(newOffset);
                slideOffsetRef.current = newOffset;
            }
        };

        const handleEnd = () => {
            // log(`End Rec Action. Dur: ${durationRef.current}`);
            if (slideOffsetRef.current > 100) {
                cancelRecording();
            } else if (durationRef.current >= 0.5) {
                stopAndSend();
            } else {
                cancelRecording();
            }
        };

        // Attach global listeners to capture release/move ANYWHERE
        window.addEventListener('touchmove', handleMove);
        window.addEventListener('touchend', handleEnd);
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleEnd);

        return () => {
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleEnd);
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleEnd);
        };
    }, [recordingState]);

    const handleStartInteraction = async (e: any) => {
        // Prevent default to stop scrolling/context menu usually
        // But be careful not to block legit clicks if bound incorrectly.
        // For the mic button, we DO want to prevent default context menu.
        // e.preventDefault(); 

        startXRef.current = e.touches ? e.touches[0].clientX : e.clientX;
        slideOffsetRef.current = 0;
        durationRef.current = 0;
        setSlideOffset(0);
        setRecordingDuration(0);
        setRecordingState('recording');

        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setRecordingDuration(p => p + 1);
            durationRef.current += 1;
        }, 1000);

        const ok = await initRecording();
        if (!ok) {
            setRecordingState(prev => {
                if (prev === 'recording') {
                    cleanupRecording();
                    return 'idle';
                }
                return prev;
            });
        }
    };


    // --- Audio Playback ---
    const handlePlay = async (url: string, mid: any) => {
        if (!url) return;
        if (playingMessageId === mid && audioPlayerRef.current) {
            audioPlayerRef.current.paused ? audioPlayerRef.current.play() : audioPlayerRef.current.pause();
            return;
        }
        if (audioPlayerRef.current) { audioPlayerRef.current.pause(); setPlayingMessageId(null); }

        const audio = new Audio(url);
        audioPlayerRef.current = audio;
        audio.ontimeupdate = () => {
            if (audio.duration) {
                setPlaybackProgress((audio.currentTime / audio.duration) * 100);
                setPlaybackTime(Math.floor(audio.currentTime));
            }
        };
        audio.onended = () => { setPlayingMessageId(null); setPlaybackProgress(0); };
        audio.play().then(() => setPlayingMessageId(mid));
    };

    const handleSend = () => {
        if (!inputText.trim()) return;
        const txt = inputText;
        setMessages(prev => [...prev, {
            id: Date.now(), sender_id: "00000000-0000-0000-0000-000000000000", text: txt, type: "text"
        }]);
        authService.sendMessage(id, txt);
        setInputText("");
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: '#eef1f5', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>

            {/* Debug */}
            {showDebug && <div style={{ position: 'fixed', top: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.8)', color: '#0f0', fontSize: '10px', padding: '5px', zIndex: 9999 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>VER 16.0 (HTTPS REQUIRED)</span><button onClick={() => setShowDebug(false)} style={{ color: 'red' }}>X</button></div>
                {debugLogs.map((l, i) => <div key={i}>{l}</div>)}
            </div>}

            {/* Header */}
            <div style={{
                height: '56px', background: 'white', display: 'flex', alignItems: 'center', padding: '0 10px',
                borderBottom: '1px solid #e0e0e0', flexShrink: 0, zIndex: 10,
                paddingTop: 'env(safe-area-inset-top)', // Handle Safe Area
                boxSizing: 'content-box' // ensure height adds to padding
            }}>
                <Link href="/chat" style={{ display: 'flex', alignItems: 'center', padding: '10px 5px 10px 0' }}>
                    <ArrowLeft color="#333" size={24} />
                </Link>

                {/* Avatar */}
                <div style={{
                    position: 'relative',
                    width: '38px', height: '38px', borderRadius: '50%', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    marginLeft: '5px', marginRight: '12px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontWeight: 'bold', fontSize: '16px', textTransform: 'uppercase',
                    overflow: 'hidden'
                }}>
                    {chatUser?.photo ? (
                        <Image src={chatUser.photo} alt={chatUser.name} fill style={{ objectFit: 'cover' }} unoptimized />
                    ) : (
                        chatUser?.name ? chatUser.name[0] : 'U'
                    )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontWeight: 600, fontSize: '16px', lineHeight: '1.2', color: '#000' }}>{chatUser ? chatUser.name : 'Unknown'}</div>
                    <div style={{ fontSize: '12px', color: '#007aff' }}>Online</div>
                </div>

                <div style={{ marginLeft: 'auto' }}>
                    <MoreVertical size={20} color="#333" />
                </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', background: '#eef1f5' }}>
                {messages.map((m: any) => {
                    const me = m.sender_id === "00000000-0000-0000-0000-000000000000";
                    return (
                        <div key={m.id} style={{
                            alignSelf: me ? 'flex-end' : 'flex-start',
                            background: me ? '#ff6b35' : 'white',
                            color: me ? 'white' : '#000',
                            padding: '8px 12px', borderRadius: '16px',
                            maxWidth: '78%', fontSize: '16px', lineHeight: '1.3',
                            boxShadow: '0 1px 1px rgba(0,0,0,0.08)',
                            wordBreak: 'break-word'
                        }}>
                            {m.type === 'voice' ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '160px' }}>
                                    <button onClick={() => handlePlay(m.audioUrl || m.audio_url, m.id)} style={{
                                        width: '32px', height: '32px', borderRadius: '50%', background: me ? 'white' : '#ff6b35', border: 'none',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: me ? '#ff6b35' : 'white'
                                    }}>
                                        {playingMessageId === m.id && !audioPlayerRef.current?.paused ? <Square size={14} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                                    </button>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ height: '2px', background: 'rgba(0,0,0,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: playingMessageId === m.id ? `${playbackProgress}%` : '0%', background: me ? 'white' : '#ff6b35' }} />
                                        </div>
                                        <div style={{ fontSize: '11px', marginTop: '4px', textAlign: 'right', opacity: 0.8 }}>
                                            {playingMessageId === m.id ? formatTime(playbackTime) : m.duration}
                                        </div>
                                    </div>
                                </div>
                            ) : m.type === 'image' ? (
                                <img src={m.image} alt="Img" style={{ maxWidth: '100%', borderRadius: '8px' }} />
                            ) : m.text}
                        </div>
                    )
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* INPUT AREA */}
            <div style={{
                background: '#eef1f5', padding: '6px 8px', flexShrink: 0, paddingBottom: 'calc(6px + env(safe-area-inset-bottom))'
            }}>
                <div style={{
                    width: '100%',
                    minHeight: '48px',
                    background: 'white',
                    borderRadius: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 6px',
                    boxSizing: 'border-box',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                }}>
                    {recordingState === 'recording' ? (
                        <>
                            <div style={{ width: '10px', height: '10px', background: '#ff3b30', borderRadius: '50%', margin: '0 12px', animation: 'Pulse 1s infinite' }} />
                            <span style={{ fontWeight: 500, color: '#333', fontSize: '16px' }}>{formatTime(recordingDuration)}</span>
                            <div style={{ marginLeft: 'auto', fontSize: '14px', color: '#8e8e93', paddingRight: '10px', transform: `translateX(-${slideOffset}px)` }}>
                                &lt; Slide to cancel
                            </div>
                        </>
                    ) : (
                        <>
                            <button style={{ width: '40px', height: '40px', border: 'none', background: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                                <Smile size={26} color="#8e8e93" />
                            </button>
                            <input
                                ref={inputRef}
                                value={inputText}
                                onChange={e => setInputText(e.target.value)}
                                placeholder="Message"
                                style={{
                                    flex: 1, border: 'none', outline: 'none', fontSize: '17px', color: '#000',
                                    background: 'transparent', padding: '0 5px', minWidth: 0
                                }}
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                style={{ width: '40px', height: '40px', border: 'none', background: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                            >
                                <Paperclip size={24} color="#8e8e93" style={{ transform: 'rotate(45deg)' }} />
                            </button>
                            <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={e => {
                                if (e.target.files?.[0]) authService.uploadPhoto(e.target.files[0]).then(res => {
                                    if (res.url) {
                                        setMessages(p => [...p, { id: Date.now(), sender_id: "00000000-0000-0000-0000-000000000000", type: "image", image: res.url }]);
                                        authService.sendMessage(id, "", "image", res.url);
                                    }
                                });
                            }} />
                            {inputText.trim() ? (
                                <button onClick={handleSend} style={{ width: '40px', height: '40px', border: 'none', background: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                                    <Send size={24} color="#007aff" />
                                </button>
                            ) : (
                                <button
                                    onTouchStart={handleStartInteraction}
                                    onMouseDown={handleStartInteraction}
                                    onContextMenu={(e) => e.preventDefault()}
                                    style={{
                                        width: '40px', height: '40px', border: 'none', background: 'none',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
                                        touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none'
                                    }}
                                >
                                    <Mic size={24} color="#8e8e93" />
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            <style jsx global>{`
                @keyframes Pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
            `}</style>
        </div>
    );
}
