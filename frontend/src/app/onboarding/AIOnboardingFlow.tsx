'use client';

import React from 'react';
import { X } from 'lucide-react';
import { Toast } from '@/components/ui/Toast';
import { useOnboardingFlow } from './useOnboardingFlow';
import OnboardingProgress from './OnboardingProgress';
import OnboardingChatView from './OnboardingChatView';
import OnboardingSummary from './OnboardingSummary';
import OnboardingInputBar from './OnboardingInputBar';

// --- Главный компонент онбординга (композиция) ---
export default function AIOnboardingFlow() {
    const {
        messages,
        stepIndex,
        inputValue,
        setInputValue,
        showSummary,
        setShowSummary,
        isInitializing,
        initError,
        userData,
        isTyping,
        isSubmitting,
        tempSelectedOptions,
        toast,
        setToast,
        messagesEndRef,
        fileInputRef,
        currentStepConfig,
        isTextInputAllowed,
        isNumberInput,
        handleOptionClick,
        handleMultiSelectConfirm,
        handleUserResponse,
        handlePhotoUpload,
        handleFinishOnboarding,
        handleConfirmProfile,
        router,
    } = useOnboardingFlow();

    return (
        <div className="fixed inset-0 bg-[#0f0f11] flex items-center justify-center z-[100] font-sans text-white">
            <div className="w-full h-full sm:h-[90vh] sm:max-w-[420px] bg-black sm:rounded-[3rem] sm:border-[8px] sm:border-[#1c1c1e] sm:shadow-2xl relative flex flex-col overflow-hidden">

                {/* Загрузка */}
                {isInitializing && (
                    <div className="absolute inset-0 bg-black z-50 flex flex-col items-center justify-center">
                        <div className="w-16 h-16 border-2 border-[#ff4b91]/30 rounded-full border-t-[#ff4b91] animate-spin mb-4" />
                        <p className="text-gray-400 text-sm">Загрузка...</p>
                    </div>
                )}

                {/* Ошибка инициализации */}
                {initError && !isInitializing && (
                    <div className="absolute inset-0 bg-black z-50 flex flex-col items-center justify-center p-6 text-center">
                        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                            <X size={32} className="text-red-500" />
                        </div>
                        <h2 className="text-xl font-bold mb-2">Ошибка</h2>
                        <p className="text-gray-400 text-sm mb-6">{initError}</p>
                        <button
                            onClick={() => router.refresh()}
                            className="px-6 py-3 bg-[#ff4b91] rounded-full text-white font-bold"
                        >
                            Попробовать снова
                        </button>
                    </div>
                )}

                {showSummary ? (
                    <OnboardingSummary
                        userData={userData}
                        isSubmitting={isSubmitting}
                        onBack={() => setShowSummary(false)}
                        onConfirm={handleConfirmProfile}
                    />
                ) : (
                    <>
                        <OnboardingProgress stepIndex={stepIndex} />

                        <OnboardingChatView
                            messages={messages}
                            isTyping={isTyping}
                            userData={userData}
                            tempSelectedOptions={tempSelectedOptions}
                            fileInputRef={fileInputRef}
                            messagesEndRef={messagesEndRef}
                            handleOptionClick={handleOptionClick}
                            handlePhotoUpload={handlePhotoUpload}
                            handleFinishOnboarding={handleFinishOnboarding}
                        />

                        <OnboardingInputBar
                            stepIndex={stepIndex}
                            currentStepConfig={currentStepConfig}
                            isTextInputAllowed={isTextInputAllowed}
                            isNumberInput={isNumberInput}
                            isTyping={isTyping}
                            inputValue={inputValue}
                            setInputValue={setInputValue}
                            tempSelectedOptions={tempSelectedOptions}
                            handleUserResponse={handleUserResponse}
                            handleMultiSelectConfirm={handleMultiSelectConfirm}
                        />
                    </>
                )}
            </div>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
