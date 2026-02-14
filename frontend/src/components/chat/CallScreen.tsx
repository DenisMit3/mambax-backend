"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Phone, PhoneOff, Video, VideoOff, Mic, MicOff,
    Volume2, VolumeX, Maximize2, Minimize2, X
} from "lucide-react";
import { useHaptic } from "@/hooks/useHaptic";
import { FALLBACK_AVATAR } from "@/lib/constants";

interface CallScreenProps {
    isOpen: boolean;
    matchId: string;
    callType: "audio" | "video";
    callerName: string;
    callerPhoto: string;
    isIncoming?: boolean;
    ws: WebSocket | null;
    currentUserId: string;
    remoteUserId: string;
    onClose: () => void;
}

type CallState = "ringing" | "connecting" | "connected" | "ended";

export function CallScreen({
    isOpen, matchId, callType, callerName, callerPhoto,
    isIncoming = false, ws, currentUserId, remoteUserId, onClose
}: CallScreenProps) {
    const haptic = useHaptic();
    const [state, setState] = useState<CallState>("ringing");
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(callType === "audio");
    const [isSpeaker, setIsSpeaker] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const iceServers = [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
    ];

    // Cleanup
    useEffect(() => {
        return () => {
            cleanup();
        };
    }, []);

    // Duration timer
    useEffect(() => {
        if (state === "connected") {
            timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [state]);

    // Listen for WebSocket signals
    useEffect(() => {
        if (!ws || !isOpen) return;

        const handler = (event: MessageEvent) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === "offer" && data.match_id === matchId) {
                    handleRemoteOffer(data.offer);
                } else if (data.type === "answer" && data.match_id === matchId) {
                    handleRemoteAnswer(data.answer);
                } else if (data.type === "candidate" && data.match_id === matchId) {
                    handleRemoteCandidate(data.candidate);
                } else if (data.type === "call_end" && data.match_id === matchId) {
                    setState("ended");
                    setTimeout(onClose, 1500);
                }
            } catch (e) { console.warn('WebSocket parse error:', e); }
        };

        ws.addEventListener("message", handler);
        return () => ws.removeEventListener("message", handler);
    }, [ws, isOpen, matchId]);

    // Auto-start call if outgoing
    useEffect(() => {
        if (isOpen && !isIncoming) {
            startCall();
        }
    }, [isOpen, isIncoming]);

    const cleanup = useCallback(() => {
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(t => t.stop());
            localStreamRef.current = null;
        }
        if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
        }
        if (timerRef.current) clearInterval(timerRef.current);
        setDuration(0);
        setState("ringing");
    }, []);

    const createPeerConnection = () => {
        const pc = new RTCPeerConnection({ iceServers });

        pc.onicecandidate = (e) => {
            if (e.candidate && ws?.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: "candidate",
                    candidate: e.candidate,
                    receiver_id: remoteUserId,
                    match_id: matchId,
                }));
            }
        };

        pc.ontrack = (e) => {
            if (remoteVideoRef.current && e.streams[0]) {
                remoteVideoRef.current.srcObject = e.streams[0];
            }
        };

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === "connected") {
                setState("connected");
                haptic.medium();
            } else if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
                setState("ended");
                setTimeout(onClose, 1500);
            }
        };

        pcRef.current = pc;
        return pc;
    };

    const getMedia = async () => {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: callType === "video" ? { facingMode: "user", width: 640, height: 480 } : false,
        });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
        }
        return stream;
    };

    const startCall = async () => {
        try {
            setState("connecting");
            const pc = createPeerConnection();
            const stream = await getMedia();
            stream.getTracks().forEach(t => pc.addTrack(t, stream));

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            ws?.send(JSON.stringify({
                type: "offer",
                offer: offer,
                receiver_id: remoteUserId,
                match_id: matchId,
            }));
        } catch (err) {
            console.error("Failed to start call:", err);
            setState("ended");
            setTimeout(onClose, 1500);
        }
    };

    const acceptCall = async () => {
        haptic.medium();
        setState("connecting");
        // The offer will be handled by handleRemoteOffer
    };

    const handleRemoteOffer = async (offer: RTCSessionDescriptionInit) => {
        try {
            const pc = createPeerConnection();
            const stream = await getMedia();
            stream.getTracks().forEach(t => pc.addTrack(t, stream));

            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            ws?.send(JSON.stringify({
                type: "answer",
                answer: answer,
                receiver_id: remoteUserId,
                match_id: matchId,
            }));
        } catch (err) {
            console.error("Failed to handle offer:", err);
        }
    };

    const handleRemoteAnswer = async (answer: RTCSessionDescriptionInit) => {
        try {
            await pcRef.current?.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (err) {
            console.error("Failed to handle answer:", err);
        }
    };

    const handleRemoteCandidate = async (candidate: RTCIceCandidateInit) => {
        try {
            await pcRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
            console.error("Failed to add ICE candidate:", err);
        }
    };

    const endCall = () => {
        haptic.heavy();
        ws?.send(JSON.stringify({
            type: "call_end",
            receiver_id: remoteUserId,
            match_id: matchId,
        }));
        cleanup();
        setState("ended");
        setTimeout(onClose, 500);
    };

    const toggleMute = () => {
        haptic.light();
        const audioTrack = localStreamRef.current?.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            setIsMuted(!audioTrack.enabled);
        }
    };

    const toggleVideo = () => {
        haptic.light();
        const videoTrack = localStreamRef.current?.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
            setIsVideoOff(!videoTrack.enabled);
        }
    };

    const formatDuration = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-black flex flex-col"
            >
                {/* Remote Video (fullscreen) */}
                {callType === "video" && (
                    <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                )}

                {/* Audio-only or connecting overlay */}
                {(callType === "audio" || state !== "connected") && (
                    <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-950 to-black flex flex-col items-center justify-center">
                        {/* Avatar */}
                        <motion.div
                            animate={state === "ringing" ? { scale: [1, 1.05, 1] } : {}}
                            transition={{ repeat: Infinity, duration: 2 }}
                            className="relative"
                        >
                            <img
                                src={callerPhoto || FALLBACK_AVATAR}
                                alt={callerName}
                                className="w-28 h-28 rounded-full object-cover border-2 border-white/20"
                            />
                            {state === "ringing" && (
                                <motion.div
                                    animate={{ scale: [1, 1.8], opacity: [0.5, 0] }}
                                    transition={{ repeat: Infinity, duration: 1.5 }}
                                    className="absolute inset-0 rounded-full border-2 border-green-400"
                                />
                            )}
                        </motion.div>

                        <h2 className="text-white text-xl font-black mt-6">{callerName}</h2>
                        <p className="text-slate-400 text-sm mt-1">
                            {state === "ringing" && (isIncoming ? "Входящий звонок..." : "Вызов...")}
                            {state === "connecting" && "Подключение..."}
                            {state === "connected" && formatDuration(duration)}
                            {state === "ended" && "Звонок завершён"}
                        </p>
                    </div>
                )}

                {/* Connected duration overlay for video */}
                {state === "connected" && callType === "video" && (
                    <div className="absolute top-12 left-0 right-0 flex justify-center z-10">
                        <div className="bg-black/50 backdrop-blur-sm px-4 py-1.5 rounded-full">
                            <span className="text-white text-sm font-bold">{formatDuration(duration)}</span>
                        </div>
                    </div>
                )}

                {/* Local Video (PiP) */}
                {callType === "video" && state === "connected" && !isVideoOff && (
                    <motion.div
                        drag
                        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                        className="absolute top-16 right-4 w-28 h-40 rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl z-20"
                    >
                        <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover mirror"
                            style={{ transform: "scaleX(-1)" }}
                        />
                    </motion.div>
                )}

                {/* Incoming call actions */}
                {state === "ringing" && isIncoming && (
                    <div className="absolute bottom-20 left-0 right-0 flex justify-center gap-12 z-10">
                        <button
                            onClick={endCall}
                            className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/30"
                        >
                            <PhoneOff size={28} className="text-white" />
                        </button>
                        <button
                            onClick={acceptCall}
                            className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/30"
                        >
                            <Phone size={28} className="text-white" />
                        </button>
                    </div>
                )}

                {/* Connected / Outgoing controls */}
                {(state === "connected" || (state !== "ended" && !isIncoming) || (state === "connecting")) && !(state === "ringing" && isIncoming) && (
                    <div className="absolute bottom-16 left-0 right-0 z-10">
                        <div className="flex justify-center items-center gap-5">
                            {/* Mute */}
                            <button
                                onClick={toggleMute}
                                className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                                    isMuted ? "bg-white/20" : "bg-white/10"
                                }`}
                            >
                                {isMuted ? <MicOff size={20} className="text-red-400" /> : <Mic size={20} className="text-white" />}
                            </button>

                            {/* Video toggle */}
                            {callType === "video" && (
                                <button
                                    onClick={toggleVideo}
                                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                                        isVideoOff ? "bg-white/20" : "bg-white/10"
                                    }`}
                                >
                                    {isVideoOff ? <VideoOff size={20} className="text-red-400" /> : <Video size={20} className="text-white" />}
                                </button>
                            )}

                            {/* End Call */}
                            <button
                                onClick={endCall}
                                className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/30"
                            >
                                <PhoneOff size={28} className="text-white" />
                            </button>

                            {/* Speaker */}
                            <button
                                onClick={() => { setIsSpeaker(!isSpeaker); haptic.light(); }}
                                className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                                    isSpeaker ? "bg-white/20" : "bg-white/10"
                                }`}
                            >
                                {isSpeaker ? <Volume2 size={20} className="text-white" /> : <VolumeX size={20} className="text-slate-400" />}
                            </button>
                        </div>
                    </div>
                )}

                {/* Close button (top-left) */}
                {state === "ended" && (
                    <button
                        onClick={onClose}
                        className="absolute top-12 right-4 z-20 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
                    >
                        <X size={20} className="text-white" />
                    </button>
                )}
            </motion.div>
        </AnimatePresence>
    );
}
