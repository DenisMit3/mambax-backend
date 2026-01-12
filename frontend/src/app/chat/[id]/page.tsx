"use client";

import { useState, useEffect, useRef, use } from "react";
import { authService } from "@/services/api";
import { wsService } from "@/services/websocket";
import { ArrowLeft, Send, MoreVertical, Mic, Square, Play, Paperclip, Smile, Video, Phone, AlertTriangle, Slash, Gift, X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { SendGiftModal } from "@/components/gifts";
import { TopUpModal } from "@/components/ui/TopUpModal";

export default function ChatRoomPage({ params }: { params: { id: string } }) {
    const { id } = params;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState("");
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [chatUser, setChatUser] = useState<{ id: string; name: string, photo: string | null } | null>(null);

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
    const [showDebug, setShowDebug] = useState(false);

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

    // Call State
    const [isInCall, setIsInCall] = useState(false);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

    // Safety State
    const [showMenu, setShowMenu] = useState(false);
    const [showUnmatchModal, setShowUnmatchModal] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);

    // Gift State
    const [showGiftModal, setShowGiftModal] = useState(false);
    const [showTopUpModal, setShowTopUpModal] = useState(false);
    const [starsBalance, setStarsBalance] = useState(0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [giftNotification, setGiftNotification] = useState<any>(null);
    const [reportReason, setReportReason] = useState("harassment");

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
            // 0. Fetch Me
            try {
                const me = await authService.getMe();
                if (me?.id) {
                    setCurrentUserId(me.id);
                    setStarsBalance(me.stars_balance || 0);
                }
            } catch (e) {
                console.error("Failed to load current user", e);
            }

            // 1. Fetch Chat User Info via Matches to get Name/Photo
            let partnerId = "";
            try {
                const matches = await authService.getMatches();
                if (Array.isArray(matches)) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const match = matches.find((m: any) => m.id === id);
                    if (match && match.user) {
                        partnerId = match.user.id;
                        setChatUser({
                            id: match.user.id,
                            name: match.user.name,
                            photo: match.user.photos && match.user.photos.length > 0 ? match.user.photos[0] : null
                        });
                    }
                }
            } catch (e) {
                console.error("Failed to load user info", e);
            }

            // 2. Fetch Messages History
            try {
                const data = await authService.getMessages(id);
                if (Array.isArray(data)) {
                    // Normalize messages if needed
                    setMessages(data);
                }
            } catch {
                log("Failed to load messages");
            }
        };
        loadData();
    }, [id]);

    const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

    // --- WebSocket ---
    useEffect(() => {
        const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
        if (token) {
            wsService.connect(token);
        }

        const handleWsMessage = (data: any) => {
            // log(`WS Msg: ${data.type}`);
            if (data.type === 'message') {
                const msg = data.message || data;
                if (msg.match_id === id) {
                    setMessages(prev => {
                        if (prev.find(m => m.id === msg.id)) return prev;
                        return [...prev, msg];
                    });
                }
            } else if (data.type === 'typing') {
                // { type: "typing", user_id: "...", is_typing: true }
                if (data.user_id && data.user_id !== (chatUser?.id || "me")) {
                    setTypingUsers(prev => {
                        const newSet = new Set(prev);
                        if (data.is_typing) {
                            newSet.add(data.user_id);
                        } else {
                            newSet.delete(data.user_id);
                        }
                        return newSet;
                    });
                }
            } else if (data.type === 'gift_received') {
                // Show notification if it's for me (which it should be if I received it via socket)
                setGiftNotification(data);
                // Auto-hide after 5 seconds
                setTimeout(() => setGiftNotification(null), 5000);
            } else if (data.type === 'offer') {
                handleReceiveOffer(data);
            } else if (data.type === 'answer') {
                handleReceiveAnswer(data);
            } else if (data.type === 'candidate') {
                handleReceiveCandidate(data);
            } else if (data.type === 'call_end') {
                endCall(false);
            } else if (data.type === 'read') {
                // { type: "read", reader_id: "...", count: 5 }
                // Update my messages to is_read = true for messages sent by me
                setMessages(prev => prev.map(m =>
                    // If the reader is the chat user, marks MY messages as read
                    // This simple logic marks ALL messages as read?
                    // Backend says "mark_messages_as_read(reader_id, sender_id)" marks all.
                    // So we can blindly mark all messages from ME as read if reader_id == chatUser.id
                    // Or use 'count' but we assume all previous are read.
                    m.sender_id === currentUserId ? { ...m, is_read: true } : m
                ));
            }
        };

        wsService.on('message', handleWsMessage);

        return () => {
            wsService.off('message', handleWsMessage);
        };
    }, [id, chatUser, currentUserId]);

    // --- Mark as Read Logic ---
    useEffect(() => {
        if (!chatUser?.id || !currentUserId) return;

        // Find unread messages from partner
        const unreadFromPartner = messages.some(m => m.sender_id === chatUser.id && !m.is_read);

        if (unreadFromPartner) {
            // Send read receipt (sender_id = who sent the messages I am reading)
            wsService.send({ type: "read", sender_id: chatUser.id });

            // Locally mark them as read to avoid loop
            setMessages(prev => prev.map(m =>
                m.sender_id === chatUser.id ? { ...m, is_read: true } : m
            ));
        }
    }, [messages, chatUser, currentUserId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, recordingState, typingUsers]);

    // --- Recording Logic ---
    const initRecording = async () => {
        log("Init Rec");
        const startTime = Date.now();
        (initRecording as any).lastStart = startTime;

        if (!navigator.mediaDevices?.getUserMedia) {
            log("ERR: No getUserMedia");
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
                const tempId = Date.now().toString(); // string ID
                const optimisticMsg = {
                    id: tempId,
                    sender_id: currentUserId || "00000000-0000-0000-0000-000000000000", // Will be replaced by real user ID on reload
                    text: "Voice message",
                    type: 'voice',
                    duration: durStr,
                    audioUrl: url,
                    audio_url: url,
                    match_id: id
                };
                setMessages(prev => [...prev, optimisticMsg]);

                const file = new File([blob], "voice.webm", { type: blob.type });
                try {
                    // Upload voice file using dedicated endpoint
                    const res = await authService.uploadChatMedia(file);
                    if (res.url) {
                        wsService.send({
                            type: "voice",
                            match_id: id,
                            receiver_id: chatUser?.id,
                            content: "[Voice Message]",
                            media_url: res.url,
                            duration: finalDuration
                        });
                    }
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
            if (slideOffsetRef.current > 100) {
                cancelRecording();
            } else if (durationRef.current >= 0.5) {
                stopAndSend();
            } else {
                cancelRecording();
            }
        };

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
        if (!chatUser?.id) {
            log("Cannot send: no receiver_id");
            return;
        }
        const txt = inputText;

        // Optimistic UI
        if (currentUserId) {
            const tempId = Date.now().toString();
            const optimisticMsg = {
                id: tempId,
                sender_id: currentUserId,
                match_id: id,
                text: txt,
                content: txt,
                type: 'message',
                created_at: new Date().toISOString()
            };
            setMessages(prev => [...prev, optimisticMsg]);
        }

        wsService.send({ type: "message", match_id: id, receiver_id: chatUser.id, content: txt });
        setInputText("");
    };

    // Safety Actions
    const handleBlock = async () => {
        if (!chatUser || !confirm("Block this user? It cannot be undone.")) return;
        try {
            await authService.blockUser(chatUser.id, "User requested block");
            window.location.href = "/matches";
        } catch (e) { alert("Failed to block"); }
    };

    const handleReport = async () => {
        if (!chatUser) return;
        try {
            await authService.reportUser(chatUser.id, reportReason, "Reported from chat");
            setShowReportModal(false);
            alert("Report sent. We will review it shortly.");
        } catch (e) { alert("Failed to report"); }
    };

    // WebRTC Logic
    const startCall = async () => {
        if (!chatUser?.id) return;
        setIsInCall(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setLocalStream(stream);

            const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
            peerConnectionRef.current = pc;

            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            pc.onicecandidate = event => {
                if (event.candidate) {
                    wsService.send({ type: 'candidate', candidate: event.candidate, receiver_id: chatUser.id, match_id: id });
                }
            };

            pc.ontrack = event => {
                setRemoteStream(event.streams[0]);
            };

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            wsService.send({ type: 'offer', offer: offer, receiver_id: chatUser.id, match_id: id });

        } catch (e) {
            console.error("Call failed", e);
            endCall();
        }
    };

    const handleReceiveOffer = async (data: any) => {
        if (!chatUser?.id) return;
        const confirmAnswer = confirm(`Incoming call from ${chatUser?.name || 'User'}. Accept?`);
        if (!confirmAnswer) return;

        setIsInCall(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setLocalStream(stream);

            const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
            peerConnectionRef.current = pc;

            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            pc.onicecandidate = event => {
                if (event.candidate) {
                    wsService.send({ type: 'candidate', candidate: event.candidate, receiver_id: chatUser.id, match_id: id });
                }
            };

            pc.ontrack = event => { setRemoteStream(event.streams[0]); };

            await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            wsService.send({ type: 'answer', answer: answer, receiver_id: chatUser.id, match_id: id });

        } catch (e) { endCall(); }
    };

    const handleReceiveAnswer = async (data: any) => {
        if (peerConnectionRef.current) {
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        }
    };

    const handleReceiveCandidate = async (data: any) => {
        if (peerConnectionRef.current && data.candidate) {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
    };

    const endCall = (notify = true) => {
        if (notify && chatUser?.id) wsService.send({ type: 'call_end', receiver_id: chatUser.id, match_id: id });

        if (localStream) localStream.getTracks().forEach(t => t.stop());
        if (peerConnectionRef.current) peerConnectionRef.current.close();

        setLocalStream(null);
        setRemoteStream(null);
        setIsInCall(false);
    };

    useEffect(() => {
        if (localStream) {
            const vid = document.getElementById("localVideo") as HTMLVideoElement;
            if (vid) vid.srcObject = localStream;
        }
    }, [localStream]);

    useEffect(() => {
        if (remoteStream) {
            const vid = document.getElementById("remoteVideo") as HTMLVideoElement;
            if (vid) vid.srcObject = remoteStream;
        }
    }, [remoteStream]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: '#eef1f5', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
            {/* Header */}
            <div style={{
                height: '56px', background: 'white', display: 'flex', alignItems: 'center', padding: '0 10px',
                borderBottom: '1px solid #e0e0e0', flexShrink: 0, zIndex: 10,
                paddingTop: 'env(safe-area-inset-top)',
                boxSizing: 'content-box'
            }}>
                <Link href="/chat" style={{ display: 'flex', alignItems: 'center', padding: '10px 5px 10px 0' }}>
                    <ArrowLeft color="#333" size={24} />
                </Link>

                <Link href={chatUser ? `/users/${chatUser.id}` : '#'} style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', flex: 1, overflow: 'hidden' }}>
                    <div style={{
                        position: 'relative',
                        width: '38px', height: '38px', borderRadius: '50%', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        marginLeft: '5px', marginRight: '12px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontWeight: 'bold', fontSize: '16px', textTransform: 'uppercase',
                        overflow: 'hidden',
                        flexShrink: 0
                    }}>
                        {chatUser?.photo ? (
                            <Image src={chatUser.photo} alt={chatUser.name} fill style={{ objectFit: 'cover' }} unoptimized />
                        ) : (
                            chatUser?.name ? chatUser.name[0] : 'U'
                        )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden' }}>
                        <div style={{ fontWeight: 600, fontSize: '16px', lineHeight: '1.2', color: '#000', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{chatUser ? chatUser.name : 'Loading...'}</div>
                        <div style={{ fontSize: '12px', color: '#007aff' }}>Online</div>
                    </div>
                </Link>

                <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {/* Stars Balance */}
                    <button
                        onClick={() => setShowTopUpModal(true)}
                        style={{
                            padding: '6px 10px',
                            borderRadius: '16px',
                            background: 'rgba(255, 215, 0, 0.1)',
                            border: '1px solid rgba(255, 215, 0, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                            marginRight: '4px'
                        }}
                    >
                        <span style={{ fontSize: '14px' }}>⭐</span>
                        <span style={{
                            color: '#b45309',
                            fontSize: '13px',
                            fontWeight: 700
                        }}>
                            {starsBalance}
                        </span>
                    </button>

                    {/* Gift Button */}
                    <button
                        onClick={() => setShowGiftModal(true)}
                        style={{
                            padding: '6px 12px',
                            borderRadius: '16px',
                            background: 'linear-gradient(135deg, #ec4899, #a855f7)',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer'
                        }}
                    >
                        <Gift size={16} color="white" />
                        <span style={{ color: 'white', fontSize: '13px', fontWeight: 600 }}>Gift</span>
                    </button>

                    <div onClick={startCall} style={{ cursor: 'pointer', padding: '4px' }}>
                        <Video size={24} color="#007aff" />
                    </div>
                    <div style={{ position: 'relative' }}>
                        <div onClick={() => setShowMenu(!showMenu)} style={{ cursor: 'pointer', padding: '4px' }}>
                            <MoreVertical size={24} color="#333" />
                        </div>
                        {showMenu && (
                            <div style={{
                                position: 'absolute', top: '100%', right: 0,
                                background: 'white', border: '1px solid #ddd', borderRadius: '8px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 100, minWidth: '150px'
                            }}>
                                <div onClick={() => { setShowReportModal(true); setShowMenu(false); }} style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderBottom: '1px solid #eee' }}>
                                    <AlertTriangle size={16} color="orange" /> Report
                                </div>
                                <div onClick={handleBlock} style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'red' }}>
                                    <Slash size={16} color="red" /> Block
                                </div>
                                <div onClick={() => setShowMenu(false)} style={{ padding: '12px', textAlign: 'center', color: '#999', fontSize: '12px' }}>
                                    Cancel
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Video Call Overlay */}
            {isInCall && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: '#000', zIndex: 999, display: 'flex', flexDirection: 'column'
                }}>
                    <video id="remoteVideo" autoPlay playsInline style={{ flex: 1, objectFit: 'cover', width: '100%' }} />
                    <video id="localVideo" autoPlay playsInline muted style={{
                        position: 'absolute', top: '20px', right: '20px',
                        width: '100px', height: '150px', objectFit: 'cover',
                        border: '2px solid white', borderRadius: '8px', background: '#333'
                    }} />
                    <div style={{ padding: '20px', display: 'flex', justifyContent: 'center', gap: '20px' }}>
                        <button onClick={() => endCall(true)} style={{
                            width: '60px', height: '60px', borderRadius: '50%',
                            background: 'red', border: 'none', color: 'white',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <Phone size={24} style={{ transform: 'rotate(135deg)' }} />
                        </button>
                    </div>
                </div>
            )}

            {/* Report Modal */}
            {showReportModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <div style={{ background: 'white', padding: '20px', borderRadius: '12px', width: '90%', maxWidth: '320px' }}>
                        <h3>Report User</h3>
                        <select style={{ width: '100%', padding: '8px', margin: '10px 0' }} value={reportReason} onChange={e => setReportReason(e.target.value)}>
                            <option value="harassment">Harassment</option>
                            <option value="fake">Fake Profile</option>
                            <option value="spam">Spam</option>
                            <option value="nudity">Inappropriate Content</option>
                        </select>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                            <button onClick={() => setShowReportModal(false)} style={{ flex: 1, padding: '10px', background: '#eee', border: 'none', borderRadius: '8px' }}>Cancel</button>
                            <button onClick={handleReport} style={{ flex: 1, padding: '10px', background: '#ff3b30', color: 'white', border: 'none', borderRadius: '8px' }}>Send</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', background: '#eef1f5' }}>
                {messages.map((m: any) => {
                    // Determine if ME sent it. 
                    // sender_id from backend is UUID. "me" is optimistic.
                    // We need to know MY user ID.
                    // authService.getMe() ? We didn't fetch it here.
                    // But usually messages from backend for ME have sender_id == MY_ID.
                    // Or we can check if sender_id !== partnerId (if chatUser.id is set).

                    const isMe = chatUser ? m.sender_id !== chatUser.id : m.sender_id === "me";

                    return (
                        <div key={m.id} style={{
                            alignSelf: isMe ? 'flex-end' : 'flex-start',
                            background: isMe ? '#ff6b35' : 'white',
                            color: isMe ? 'white' : '#000',
                            padding: '8px 12px', borderRadius: '16px',
                            maxWidth: '78%', fontSize: '16px', lineHeight: '1.3',
                            boxShadow: '0 1px 1px rgba(0,0,0,0.08)',
                            wordBreak: 'break-word'
                        }}>
                            {m.type === 'voice' ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '160px' }}>
                                    <button onClick={() => handlePlay(m.audioUrl || m.audio_url, m.id)} style={{
                                        width: '32px', height: '32px', borderRadius: '50%', background: isMe ? 'white' : '#ff6b35', border: 'none',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: isMe ? '#ff6b35' : 'white'
                                    }}>
                                        {playingMessageId === m.id && !audioPlayerRef.current?.paused ? <Square size={14} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                                    </button>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ height: '2px', background: 'rgba(0,0,0,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: playingMessageId === m.id ? `${playbackProgress}%` : '0%', background: isMe ? 'white' : '#ff6b35' }} />
                                        </div>
                                        <div style={{ fontSize: '11px', marginTop: '4px', textAlign: 'right', opacity: 0.8 }}>
                                            {playingMessageId === m.id ? formatTime(playbackTime) : m.duration}
                                        </div>
                                    </div>
                                </div>
                            ) : m.type === 'gift' ? (
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '12px',
                                    background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.1), rgba(168, 85, 247, 0.1))',
                                    borderRadius: '12px',
                                    minWidth: '150px'
                                }}>
                                    <div style={{ fontSize: '32px' }}>🎁</div>
                                    {(m.photo_url || m.media_url) && (
                                        <img
                                            src={m.photo_url?.startsWith('http') ? m.photo_url : `/api_proxy${m.photo_url || m.media_url}`}
                                            alt="Gift"
                                            style={{ width: '60px', height: '60px', objectFit: 'contain' }}
                                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                        />
                                    )}
                                    <span style={{
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        color: isMe ? 'white' : '#ec4899',
                                        textAlign: 'center'
                                    }}>
                                        {isMe ? 'You sent a gift!' : 'Sent you a gift!'}
                                    </span>
                                    <span style={{ fontSize: '12px', opacity: 0.8 }}>
                                        {m.gift_name || m.text?.replace('🎁 Sent a gift: ', '') || 'Gift'}
                                    </span>
                                </div>
                            ) : m.type === 'image' ? (
                                <img src={m.image || m.media_url} alt="Img" style={{ maxWidth: '100%', borderRadius: '8px' }} />
                            ) : m.text || m.content}
                        </div>
                    )
                })}
                <div ref={messagesEndRef} />
                {typingUsers.size > 0 && (
                    <div style={{ padding: '4px 12px', fontSize: '12px', color: '#8e8e93', fontStyle: 'italic' }}>
                        {chatUser?.name || "User"} is typing...
                    </div>
                )}
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
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSend();
                                    wsService.send({ type: "typing", receiver_id: chatUser?.id, is_typing: true });
                                    // Should implement debounce for set false, but for now simple trigger
                                    setTimeout(() => wsService.send({ type: "typing", receiver_id: chatUser?.id, is_typing: false }), 2000);
                                }}
                                onFocus={() => wsService.send({ type: "typing", receiver_id: chatUser?.id, is_typing: true })}
                                onBlur={() => wsService.send({ type: "typing", receiver_id: chatUser?.id, is_typing: false })}
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                style={{ width: '40px', height: '40px', border: 'none', background: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                                <Paperclip size={24} color="#8e8e93" style={{ transform: 'rotate(45deg)' }} />
                            </button>
                            <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={e => {
                                if (e.target.files?.[0]) authService.uploadChatMedia(e.target.files[0]).then(res => {
                                    if (res.url) {
                                        setMessages(p => [...p, { id: Date.now(), sender_id: "me", type: "image", image: res.url }]);
                                        wsService.send({
                                            type: "photo",
                                            match_id: id,
                                            receiver_id: chatUser?.id,
                                            content: "[Photo]",
                                            media_url: res.url
                                        });
                                    }
                                });
                            }} />
                            {inputText.trim() ? (
                                <button aria-label="Send message" onClick={handleSend} style={{ width: '40px', height: '40px', border: 'none', background: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                                    <Send size={24} color="#007aff" />
                                </button>
                            ) : (
                                <button
                                    aria-label="Record voice"
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

            {/* Gift Notification Banner */}
            {giftNotification && (
                <div style={{
                    position: 'fixed',
                    top: '70px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 2000,
                    background: 'linear-gradient(135deg, #ec4899, #a855f7)',
                    color: 'white',
                    padding: '12px 20px',
                    borderRadius: '50px',
                    boxShadow: '0 4px 15px rgba(236, 72, 153, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    animation: 'slideDown 0.5s ease-out'
                }}>
                    <div style={{ fontSize: '20px' }}>🎁</div>
                    <div>
                        <div style={{ fontWeight: 'bold', fontSize: '14px' }}>Gift Received!</div>
                        <div style={{ fontSize: '12px', opacity: 0.9 }}>
                            {giftNotification.sender_name} sent you a {giftNotification.gift_name}
                        </div>
                    </div>
                    <button
                        onClick={() => setGiftNotification(null)}
                        style={{ background: 'none', border: 'none', color: 'white', marginLeft: '8px', cursor: 'pointer' }}
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Send Gift Modal */}
            {chatUser && (
                <SendGiftModal
                    isOpen={showGiftModal}
                    onClose={() => setShowGiftModal(false)}
                    receiverId={chatUser.id}
                    receiverName={chatUser.name}
                    receiverPhoto={chatUser.photo || undefined}
                    onGiftSent={(tx) => {
                        console.log("Gift sent from chat:", tx);
                    }}
                />
            )}

            {/* Top Up Modal */}
            <TopUpModal
                isOpen={showTopUpModal}
                onClose={() => setShowTopUpModal(false)}
                currentBalance={starsBalance}
                onSuccess={(newBalance) => {
                    setStarsBalance(newBalance);
                }}
            />

            <style jsx global>{`
                @keyframes Pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
                @keyframes slideDown { from { transform: translate(-50%, -100%); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
            `}</style>
        </div>
    );
}
