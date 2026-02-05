import { useRef } from 'react'
import { useTelegram } from '@/lib/telegram'
import { useUser } from '@/context/UserContext'

export const useHaptic = () => {
    const { hapticFeedback } = useTelegram()
    const { user } = useUser()
    const lastCallRef = useRef<number>(0)

    const debounce = (fn: () => void, delay = 100) => {
        const now = Date.now()
        if (now - lastCallRef.current < delay) return
        lastCallRef.current = now

        // Check if user exists and has preferences, default to enabled if not set
        const hapticEnabled = user?.ux_preferences?.haptic_enabled !== false

        if (hapticEnabled) {
            fn()
        }
    }

    return {
        light: () => debounce(() => hapticFeedback.light()),
        medium: () => debounce(() => hapticFeedback.medium()),
        heavy: () => debounce(() => hapticFeedback.heavy()),
        success: () => debounce(() => hapticFeedback.success()),
        error: () => debounce(() => hapticFeedback.error()),
        selection: () => debounce(() => hapticFeedback.selection(), 50)
    }
}
