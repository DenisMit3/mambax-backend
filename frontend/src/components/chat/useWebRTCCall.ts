"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useHaptic } from "@/hooks/useHaptic";

type CallState = "ringing" | "connecting" | "connected" | "ended";

interface UseWebRTCCallProps {
    isOpen: boolean;
    matchId: string;
    callType: "audio" | "video";
    isIncoming: boolean;
    ws: WebSocket | null;
    remoteUserId: string;
    onClose: () => void;
}

export function useWebRTCCall({
    isOpen, matchId, callType, isIncoming, ws, remoteUserId, onClose
}: UseWebRTCCallProps) {
    const haptic = useHaptic();
    const [state, setState] = useState<CallState>("ringing");
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(callType === "audio");
    const [isSpeaker, setIsSpeaker] = useState(false);

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const iceServers = [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
    ];

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

    useEffect(() => {
        return () => { cleanup(); };
    }, []);

    useEffect(() => {
        if (state === "connected") {
            timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [state]);

    const createPeerConnection = () => {
        const pc = new RTCPeerConnection({ iceServers });
        pc.onicecandidate = (e) => {
            if (e.candidate && ws?.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: "candidate", candidate: e.candidate, receiver_id: remoteUserId, match_id: matchId }));
            }
        };
        pc.ontrack = (e) => {
            if (remoteVideoRef.current && e.streams[0]) {
                remoteVideoRef.current.srcObject = e.streams[0];
            }
        };
        pc.onconnectionstatechange = () => {
            if (pc.connectionState === "connected") { setState("connected"); haptic.medium(); }
            else if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
                setState("ended"); setTimeout(onClose, 1500);
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
        if (localVideoRef.current) { localVideoRef.current.srcObject = stream; }
        return stream;
    };

    const handleRemoteOffer = async (offer: RTCSessionDescriptionInit) => {
        try {
            const pc = createPeerConnection();
            const stream = await getMedia();
            stream.getTracks().forEach(t => pc.addTrack(t, stream));
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            ws?.send(JSON.stringify({ type: "answer", answer, receiver_id: remoteUserId, match_id: matchId }));
        } catch (err) { console.error("Failed to handle offer:", err); }
    };

    const handleRemoteAnswer = async (answer: RTCSessionDescriptionInit) => {
        try { await pcRef.current?.setRemoteDescription(new RTCSessionDescription(answer)); }
        catch (err) { console.error("Failed to handle answer:", err); }
    };

    const handleRemoteCandidate = async (candidate: RTCIceCandidateInit) => {
        try { await pcRef.current?.addIceCandidate(new RTCIceCandidate(candidate)); }
        catch (err) { console.error("Failed to add ICE candidate:", err); }
    };

    // Listen for WebSocket signals
    useEffect(() => {
        if (!ws || !isOpen) return;
        const handler = (event: MessageEvent) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === "offer" && data.match_id === matchId) handleRemoteOffer(data.offer);
                else if (data.type === "answer" && data.match_id === matchId) handleRemoteAnswer(data.answer);
                else if (data.type === "candidate" && data.match_id === matchId) handleRemoteCandidate(data.candidate);
                else if (data.type === "call_end" && data.match_id === matchId) { setState("ended"); setTimeout(onClose, 1500); }
            } catch (e) { console.warn('WebSocket parse error:', e); }
        };
        ws.addEventListener("message", handler);
        return () => ws.removeEventListener("message", handler);
    }, [ws, isOpen, matchId]);

    const startCall = async () => {
        try {
            setState("connecting");
            const pc = createPeerConnection();
            const stream = await getMedia();
            stream.getTracks().forEach(t => pc.addTrack(t, stream));
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            ws?.send(JSON.stringify({ type: "offer", offer, receiver_id: remoteUserId, match_id: matchId }));
        } catch (err) {
            console.error("Failed to start call:", err);
            setState("ended"); setTimeout(onClose, 1500);
        }
    };

    // Auto-start call if outgoing
    useEffect(() => {
        if (isOpen && !isIncoming) { startCall(); }
    }, [isOpen, isIncoming]);

    const acceptCall = () => { haptic.medium(); setState("connecting"); };

    const endCall = () => {
        haptic.heavy();
        ws?.send(JSON.stringify({ type: "call_end", receiver_id: remoteUserId, match_id: matchId }));
        cleanup(); setState("ended"); setTimeout(onClose, 500);
    };

    const toggleMute = () => {
        haptic.light();
        const audioTrack = localStreamRef.current?.getAudioTracks()[0];
        if (audioTrack) { audioTrack.enabled = !audioTrack.enabled; setIsMuted(!audioTrack.enabled); }
    };

    const toggleVideo = () => {
        haptic.light();
        const videoTrack = localStreamRef.current?.getVideoTracks()[0];
        if (videoTrack) { videoTrack.enabled = !videoTrack.enabled; setIsVideoOff(!videoTrack.enabled); }
    };

    const formatDuration = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
    };

    return {
        state, duration, isMuted, isVideoOff, isSpeaker, setIsSpeaker,
        localVideoRef, remoteVideoRef,
        acceptCall, endCall, toggleMute, toggleVideo, formatDuration, haptic
    };
}
