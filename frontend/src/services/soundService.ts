class SoundService {
    private sounds: Map<string, HTMLAudioElement> = new Map()
    private enabled: boolean = true

    constructor() {
        if (typeof window !== 'undefined') {
            this.preload('match', '/sounds/match.mp3')
            this.preload('sent', '/sounds/sent.mp3')
            this.preload('like', '/sounds/like.mp3')
            this.preload('whoosh', '/sounds/whoosh.mp3')
            this.preload('success', '/sounds/success.mp3') // Added for general success
            this.preload('tap', '/sounds/tap.mp3') // Added for button taps
        }
    }

    preload(soundName: string, url: string): void {
        if (typeof window === 'undefined') return
        const audio = new Audio(url)
        audio.load()
        this.sounds.set(soundName, audio)
    }

    async play(soundName: string, volume: number = 0.5): Promise<void> {
        if (!this.enabled || typeof window === 'undefined') return

        const audio = this.sounds.get(soundName)
        if (audio) {
            try {
                audio.currentTime = 0
                audio.volume = volume
                await audio.play()
            } catch (err) {
                console.warn(`Failed to play sound: ${soundName}`, err)
            }
        }
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
