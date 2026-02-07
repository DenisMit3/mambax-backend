'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import { Shield, AlertCircle, UserCheck, CheckCircle2 } from 'lucide-react';

import { useTelegram } from '@/lib/telegram';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { GlassCard } from '@/components/ui/GlassCard';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

interface VerificationScannerProps {
    onSuccess: () => void;
    onCancel: () => void;
}

type ScanStep = 'center' | 'blink' | 'side' | 'processing' | 'success';

export const VerificationScanner = ({ onSuccess, onCancel }: VerificationScannerProps) => {
    const { hapticFeedback } = useTelegram();
    const [step, setStep] = useState<ScanStep>('center');
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        startCamera();
        return () => stopCamera();
    }, []);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user' }
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            setError('Доступ к камере отклонен. Проверьте настройки браузера.');
            hapticFeedback.notificationOccurred('error');
        }
    };

    const stopCamera = () => {
        if (videoRef.current?.srcObject) {
            const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
            tracks.forEach(track => track.stop());
        }
    };

    const uploadVerificationPhoto = async (blob: Blob) => {
        try {
            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('file', blob, 'verification_selfie.jpg');

            const res = await fetch(`${API_URL}/users/me/verification-photo`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!res.ok) throw new Error('Upload failed');
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    };

    const captureAndUpload = async () => {
        if (!videoRef.current) return;

        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);

        canvas.toBlob(async (blob) => {
            if (blob) {
                await uploadVerificationPhoto(blob);
            }
        }, 'image/jpeg', 0.8);
    };

    const nextStep = () => {
        hapticFeedback.impactOccurred('medium');
        switch (step) {
            case 'center':
                setStep('blink');
                break;
            case 'blink':
                setStep('side');
                break;
            case 'side':
                setStep('processing');
                captureAndUpload(); // Capture photo before processing animation
                startProcessing();
                break;
        }
    };

    const startProcessing = () => {
        let currentProgress = 0;
        const interval = setInterval(() => {
            currentProgress += Math.random() * 15;
            if (currentProgress >= 100) {
                currentProgress = 100;
                clearInterval(interval);
                setStep('success');
                hapticFeedback.notificationOccurred('success');
                setTimeout(onSuccess, 1500);
            }
            setProgress(Math.floor(currentProgress));
        }, 400);
    };

    const getStepInstruction = () => {
        switch (step) {
            case 'center': return 'Поместите лицо в рамку';
            case 'blink': return 'Медленно моргните';
            case 'side': return 'Поверните голову направо';
            case 'processing': return 'Анализ биометрических данных...';
            case 'success': return 'Отправлено на проверку!';
            default: return '';
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-between p-6 overflow-hidden font-sans">
            {/* HUD Header */}
            <motion.div
                className="w-full flex items-center justify-between"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
            >
                <div className="flex items-center space-x-2">
                    <Shield className="w-5 h-5 text-primary-red" />
                    <span className="text-white font-mono text-sm tracking-widest uppercase font-black">
                        SECURE ID SCAN
                    </span>
                </div>
                <AnimatedButton variant="ghost" size="sm" onClick={onCancel}>
                    Отмена
                </AnimatedButton>
            </motion.div>

            {/* Main Scanner Area */}
            <div className="relative w-full aspect-square max-w-sm flex items-center justify-center">
                {/* Camera Feed */}
                <div className="absolute inset-x-4 inset-y-4 rounded-full overflow-hidden border-4 border-white/10 shadow-2xl">
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover scale-x-[-1]"
                    />
                    <div className="absolute inset-0 bg-primary-red/10 mix-blend-overlay pointer-events-none" />
                </div>

                {/* Scan Frame Overlay */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100">
                    {/* Rotating Pulse Ring */}
                    <motion.circle
                        cx="50"
                        cy="50"
                        r="48"
                        stroke="#FF3B30"
                        strokeWidth="0.5"
                        fill="none"
                        strokeDasharray="10 5"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                    />

                    {/* Corners */}
                    <path d="M 20 10 L 10 10 L 10 20" stroke="white" strokeWidth="0.5" fill="none" />
                    <path d="M 80 10 L 90 10 L 90 20" stroke="white" strokeWidth="0.5" fill="none" />
                    <path d="M 20 90 L 10 90 L 10 80" stroke="white" strokeWidth="0.5" fill="none" />
                    <path d="M 80 90 L 90 90 L 90 80" stroke="white" strokeWidth="0.5" fill="none" />
                </svg>

                {/* Scanline Effect */}
                <AnimatePresence>
                    {(step !== 'processing' && step !== 'success') && (
                        <motion.div
                            className="absolute top-0 left-0 right-0 h-0.5 bg-blue-400 shadow-lg shadow-blue-400/80 z-10"
                            initial={{ top: '10%' }}
                            animate={{ top: '90%' }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        />
                    )}
                </AnimatePresence>

                {/* Processing/Success Overlays */}
                <AnimatePresence>
                    {step === 'processing' && (
                        <motion.div
                            className="absolute inset-0 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center rounded-full"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        >
                            <div className="text-4xl font-mono text-blue-400 font-bold mb-2">
                                {progress}%
                            </div>
                            <div className="text-xs text-blue-400 font-mono tracking-tighter uppercase">
                                Analyzing Biometrics
                            </div>
                        </motion.div>
                    )}

                    {step === 'success' && (
                        <motion.div
                            className="absolute inset-0 bg-green-500/20 backdrop-blur-md flex flex-col items-center justify-center rounded-full border-4 border-green-500"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                        >
                            <CheckCircle2 className="w-20 h-20 text-green-500" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Footer Controls */}
            <div className="w-full max-w-sm space-y-6">
                <div className="text-center">
                    <motion.p
                        key={step}
                        className="text-white text-xl font-bold mb-1"
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                    >
                        {getStepInstruction()}
                    </motion.p>
                    <div className="flex justify-center space-x-1">
                        {['center', 'blink', 'side'].map((s) => (
                            <div
                                key={s}
                                className={`w-1.5 h-1.5 rounded-full ${step === s ? 'bg-blue-500' : 'bg-gray-700'
                                    }`}
                            />
                        ))}
                    </div>
                </div>

                {error ? (
                    <GlassCard className="p-4 bg-red-500/20 border-red-500/50">
                        <div className="flex items-center space-x-2 text-red-400">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-sm">{error}</span>
                        </div>
                    </GlassCard>
                ) : (
                    <div className="flex flex-col space-y-3">
                        {step !== 'processing' && step !== 'success' && (
                            <AnimatedButton
                                className="w-full bg-blue-600 hover:bg-blue-500 py-4 text-lg"
                                onClick={nextStep}
                            >
                                {step === 'side' ? 'Завершить' : 'Далее'}
                            </AnimatedButton>
                        )}

                        <div className="text-center">
                            <span className="text-xs text-gray-500 flex items-center justify-center space-x-1 uppercase tracking-widest">
                                <UserCheck className="w-3 h-3" />
                                <span>Pending Admin Review</span>
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
