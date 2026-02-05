import { useEffect } from 'react'
import { soundService } from '@/services/soundService'
import { useUser } from '@/context/UserContext'

export const useSoundService = () => {
    const { user } = useUser()

    useEffect(() => {
        soundService.setEnabled(user?.ux_preferences?.sounds_enabled !== false)
    }, [user?.ux_preferences?.sounds_enabled])

    return soundService
}
