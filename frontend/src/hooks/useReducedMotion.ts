import { useEffect, useState } from 'react'
import { useUser } from '@/context/UserContext'

export const useReducedMotion = () => {
    const { user } = useUser()
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

    useEffect(() => {
        if (typeof window === 'undefined') return

        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

        const updateMotionPreference = () => {
            const systemPreference = mediaQuery.matches
            const userPreference = user?.ux_preferences?.reduced_motion === true
            setPrefersReducedMotion(systemPreference || userPreference)
        }

        updateMotionPreference()

        mediaQuery.addEventListener('change', updateMotionPreference)
        return () => mediaQuery.removeEventListener('change', updateMotionPreference)
    }, [user?.ux_preferences?.reduced_motion])

    return prefersReducedMotion
}
