class SoundService {
    private sounds: Map<string, HTMLAudioElement> = new Map()
    private enabled: boolean = true
    private loadedSounds: Set<string> = new Set()

    constructor() {
        if (typeof window !== 'undefined') {
            // Only preload sounds that exist - whoosh.mp3 is the only confirmed file
            this.preload('whoosh', '/sounds/whoosh.mp3')
            // Other sounds are optional - will fail silently if not present
            this.preloadOptional('match', '/sounds/match.mp3')
            this.preloadOptional('sent', '/sounds/sent.mp3')
            this.preloadOptional('like', '/sounds/like.mp3')
            this.preloadOptional('success', '/sounds/success.mp3')
            this.preloadOptional('tap', '/sounds/tap.mp3')
        }
    }

    preload(soundName: string, url: string): void {
        if (typeof window === 'undefined') return
        try {
            const audio = new Audio(url)
            audio.addEventListener('canplaythrough', () => {
                this.sounds.set(soundName, audio)
                this.loadedSounds.add(soundName)
            }, { once: true })
            audio.addEventListener('error', () => {
                // Sound file not found - skip gracefully
            }, { once: true })
            audio.load()
        } catch {
            // Audio creation failed - skip gracefully
        }
    }

    preloadOptional(soundName: string, url: string): void {
        if (typeof window === 'undefined') return
        const audio = new Audio(url)
        
        // Only add to sounds map if file loads successfully
        audio.addEventListener('canplaythrough', () => {
            this.sounds.set(soundName, audio)
            this.loadedSounds.add(soundName)
        }, { once: true })
        
        // Silently ignore load errors for optional sounds
        audio.addEventListener('error', () => {
            // Sound file not found - this is expected for missing optional sounds
        }, { once: true })
        
        audio.load()
    }

    async play(soundName: string, volume: number = 0.5): Promise<void> {
        if (!this.enabled || typeof window === 'undefined') return

        const audio = this.sounds.get(soundName)
        if (audio && this.loadedSounds.has(soundName)) {
            try {
                audio.currentTime = 0
                audio.volume = volume
                await audio.play()
            } catch (err) {
                // Silently fail - user interaction may be required
            }
        }
        // If sound not loaded, silently skip (no console warning spam)
    }

    setEnabled(enabled: boolean): void {
        this.enabled = enabled
    }

    // Predefined sounds
    playMatch(): void { this.play('match') }
    playSent(): void { this.play('sent') }
    playLike(): void { this.play('like') }
    playWhoosh(): void { this.play('whoosh') }
    playSuccess(): void { this.play('success') }
    playTap(): void { this.play('tap') }
}

export const soundService = new SoundService()
