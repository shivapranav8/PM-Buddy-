/**
 * OpenAI Text-to-Speech Service
 * Provides natural-sounding voice synthesis using OpenAI's TTS API
 */

import { generateSpeechAudio } from './api-client';

export type VoiceModel = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

export interface TTSOptions {
    text: string;
    voice?: VoiceModel;
    speed?: number;
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
 * Generate speech audio using OpenAI TTS (proxied through a Cloud Function
 * so the user's API key never reaches the browser)
 * @returns Audio blob that can be played in browser
 */
export async function generateSpeech(options: TTSOptions): Promise<Blob> {
    const { text, voice = 'alloy', speed = 1.0 } = options;

    const audio = await generateSpeechAudio({ text, voice, speed });
    const bytes = Uint8Array.from(atob(audio), c => c.charCodeAt(0));
    return new Blob([bytes], { type: 'audio/mpeg' });
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
