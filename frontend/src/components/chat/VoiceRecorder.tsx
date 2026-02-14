import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic } from 'lucide-react';
import { useHaptic } from '@/hooks/useHaptic';
import { Toast } from '@/components/ui/Toast';

interface VoiceRecorderProps {
    onSend: (audioBlob: Blob, duration: number) => void;
}

export const VoiceRecorder = ({ onSend }: VoiceRecorderProps) => {
    const [isRecording, setIsRecording] = useState(false);
    const [duration, setDuration] = useState(0);
    const [waveform, setWaveform] = useState<number[]>([]);
    const [toast, setToast] = useState<{message: string; type: 'success' | 'error'} | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const startTimeRef = useRef<number>(0);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    const haptic = useHaptic();

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            const audioContext = new AudioContext();
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();

            analyser.fftSize = 64;
            source.connect(analyser);
            analyserRef.current = analyser;

            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const finalDuration = (Date.now() - startTimeRef.current) / 1000;

                if (finalDuration > 0.5) { // Minimum duration check
                    onSend(audioBlob, finalDuration);
                    haptic.success();
                }

                stream.getTracks().forEach(track => track.stop());
                audioContext.close();
            };

            mediaRecorder.start();
            startTimeRef.current = Date.now();
            setIsRecording(true);
            setDuration(0);
            haptic.medium();

            // Animation loop for waveform
            const updateWaveform = () => {
                if (!analyserRef.current) return;
                const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
                analyserRef.current.getByteFrequencyData(dataArray);

                // Select a subset of frequencies for visualization (e.g. 20 bars)
                const step = Math.floor(dataArray.length / 20);
                const newWaveform = [];
                for (let i = 0; i < 20; i++) {
                    newWaveform.push(dataArray[i * step]);
                }
                setWaveform(newWaveform);

                animationFrameRef.current = requestAnimationFrame(updateWaveform);
            };
            updateWaveform();

        } catch (error) {
            console.error("Error accessing microphone:", error);
            setToast({message: 'Микрофон недоступен. Проверьте разрешения.', type: 'error'});
            haptic.error();
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            setWaveform([]);
        }
    };

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isRecording) {
            interval = setInterval(() => {
                setDuration(prev => prev + 0.1);
            }, 100);
        }
        return () => clearInterval(interval);
    }, [isRecording]);

    return (
        <>
        <div className="relative">
            <AnimatePresence>
                {isRecording && (
                    <motion.div
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        className="absolute right-12 top-0 bottom-0 flex items-center bg-gray-900 rounded-full px-4 pr-10 border border-red-500/50"
                        style={{ height: '40px', top: '0px' }} // Align with button
                    >
                        <div className="flex items-center space-x-2 min-w-[150px]">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-white text-xs font-mono w-10">
                                {duration.toFixed(1)}s
                            </span>

                            {/* Waveform */}
                            <div className="flex items-center space-x-0.5 h-8">
                                {waveform.map((value, i) => (
                                    <motion.div
                                        key={i}
                                        className="w-1 bg-red-400 rounded-full"
                                        style={{ height: Math.max(4, (value / 255) * 20) }}
                                        animate={{ height: Math.max(4, (value / 255) * 20) }}
                                        transition={{ duration: 0.05 }}
                                    />
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isRecording ? 'bg-red-500 text-white shadow-lg shadow-red-500/50' : 'bg-gray-800 text-gray-400 hover:text-white'
                    }`}
                onPointerDown={startRecording}
                onPointerUp={stopRecording}
                onPointerLeave={stopRecording} // Stop if dragged out
                whileTap={{ scale: 1.1 }}
            >
                <Mic className="w-5 h-5" />
            </motion.button>
        </div>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
    );
};
