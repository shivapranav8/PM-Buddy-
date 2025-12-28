/**
 * OpenAI Text-to-Speech Service
 * Provides natural-sounding voice synthesis using OpenAI's TTS API
 */

export type VoiceModel = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

export interface TTSOptions {
    text: string;
    voice?: VoiceModel;
    speed?: number;
    apiKey: string;
}

/**
 * Map accent preferences to OpenAI voice models (male voices only)
 */
export function getVoiceForAccent(accent: string): VoiceModel {
    switch (accent) {
        case 'UK English':
            return 'echo'; // British male voice
        case 'US English':
        default:
            return 'onyx'; // Deep US male voice
    }
}

/**
 * Generate speech audio using OpenAI TTS API
 * @returns Audio blob that can be played in browser
 */
export async function generateSpeech(options: TTSOptions): Promise<Blob> {
    const { text, voice = 'alloy', speed = 1.0, apiKey } = options;

    if (!apiKey || !apiKey.startsWith('sk-')) {
        throw new Error('Valid OpenAI API key required for TTS');
    }

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'tts-1', // Use tts-1 for faster, cheaper generation (tts-1-hd for higher quality)
            input: text,
            voice: voice,
            speed: speed,
            response_format: 'mp3'
        }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
        throw new Error(`OpenAI TTS API error: ${error.error?.message || response.statusText}`);
    }

    return await response.blob();
}

/**
 * Simple in-memory cache for audio blobs to avoid re-generating same text
 */
class AudioCache {
    private cache = new Map<string, Blob>();
    private maxSize = 20; // Cache last 20 audio clips

    getCacheKey(text: string, voice: VoiceModel, speed: number): string {
        return `${voice}-${speed}-${text?.substring(0, 100) || ''}`;
    }

    get(text: string, voice: VoiceModel, speed: number): Blob | null {
        const key = this.getCacheKey(text, voice, speed);
        return this.cache.get(key) || null;
    }

    set(text: string, voice: VoiceModel, speed: number, blob: Blob): void {
        const key = this.getCacheKey(text, voice, speed);

        // Simple LRU: if cache is full, delete oldest entry
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }

        this.cache.set(key, blob);
    }

    clear(): void {
        this.cache.clear();
    }
}

export const audioCache = new AudioCache();
