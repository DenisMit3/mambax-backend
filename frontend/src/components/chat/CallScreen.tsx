"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
    Phone, PhoneOff, Video, VideoOff, Mic, MicOff,
    Volume2, VolumeX, X
} from "lucide-react";
import { FALLBACK_AVATAR } from "@/lib/constants";
import { useWebRTCCall } from "./useWebRTCCall";

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

export function CallScreen({
    isOpen, matchId, callType, callerName, callerPhoto,
    isIncoming = false, ws, currentUserId, remoteUserId, onClose
}: CallScreenProps) {
    const {
        state, duration, isMuted, isVideoOff, isSpeaker, setIsSpeaker,
        localVideoRef, remoteVideoRef,
        acceptCall, endCall, toggleMute, toggleVideo, formatDuration, haptic
    } = useWebRTCCall({ isOpen, matchId, callType, isIncoming, ws, remoteUserId, onClose });

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-black flex flex-col">
                {/* Remote Video */}
                {callType === "video" && (
                    <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
                )}

                {/* Audio-only or connecting overlay */}
                {(callType === "audio" || state !== "connected") && (
                    <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-950 to-black flex flex-col items-center justify-center">
                        <motion.div animate={state === "ringing" ? { scale: [1, 1.05, 1] } : {}}
                            transition={{ repeat: Infinity, duration: 2 }} className="relative">
                            <img src={callerPhoto || FALLBACK_AVATAR} alt={callerName}
                                className="w-28 h-28 rounded-full object-cover border-2 border-white/20" />
                            {state === "ringing" && (
                                <motion.div animate={{ scale: [1, 1.8], opacity: [0.5, 0] }}
                                    transition={{ repeat: Infinity, duration: 1.5 }}
                                    className="absolute inset-0 rounded-full border-2 border-green-400" />
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

                {/* Duration overlay for video */}
                {state === "connected" && callType === "video" && (
                    <div className="absolute top-12 left-0 right-0 flex justify-center z-10">
                        <div className="bg-black/50 backdrop-blur-sm px-4 py-1.5 rounded-full">
                            <span className="text-white text-sm font-bold">{formatDuration(duration)}</span>
                        </div>
                    </div>
                )}

                {/* Local Video PiP */}
                {callType === "video" && state === "connected" && !isVideoOff && (
                    <motion.div drag dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                        className="absolute top-16 right-4 w-28 h-40 rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl z-20">
                        <video ref={localVideoRef} autoPlay playsInline muted
                            className="w-full h-full object-cover mirror" style={{ transform: "scaleX(-1)" }} />
                    </motion.div>
                )}

                {/* Incoming call actions */}
                {state === "ringing" && isIncoming && (
                    <div className="absolute bottom-20 left-0 right-0 flex justify-center gap-12 z-10">
                        <button onClick={endCall} className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/30">
                            <PhoneOff size={28} className="text-white" />
                        </button>
                        <button onClick={acceptCall} className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/30">
                            <Phone size={28} className="text-white" />
                        </button>
                    </div>
                )}

                {/* Connected / Outgoing controls */}
                {(state === "connected" || (state !== "ended" && !isIncoming) || (state === "connecting")) && !(state === "ringing" && isIncoming) && (
                    <div className="absolute bottom-16 left-0 right-0 z-10">
                        <div className="flex justify-center items-center gap-5">
                            <button onClick={toggleMute}
                                className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isMuted ? "bg-white/20" : "bg-white/10"}`}>
                                {isMuted ? <MicOff size={20} className="text-red-400" /> : <Mic size={20} className="text-white" />}
                            </button>
                            {callType === "video" && (
                                <button onClick={toggleVideo}
                                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isVideoOff ? "bg-white/20" : "bg-white/10"}`}>
                                    {isVideoOff ? <VideoOff size={20} className="text-red-400" /> : <Video size={20} className="text-white" />}
                                </button>
                            )}
                            <button onClick={endCall} className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/30">
                                <PhoneOff size={28} className="text-white" />
                            </button>
                            <button onClick={() => { setIsSpeaker(!isSpeaker); haptic.light(); }}
                                className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isSpeaker ? "bg-white/20" : "bg-white/10"}`}>
                                {isSpeaker ? <Volume2 size={20} className="text-white" /> : <VolumeX size={20} className="text-slate-400" />}
                            </button>
                        </div>
                    </div>
                )}

                {/* Close button */}
                {state === "ended" && (
                    <button onClick={onClose} className="absolute top-12 right-4 z-20 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                        <X size={20} className="text-white" />
                    </button>
                )}
            </motion.div>
        </AnimatePresence>
    );
}
