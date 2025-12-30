/**
 * API Client for PM Interview Buddy
 * Uses Firebase Cloud Functions (callable)
 */

import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';
import { app } from '../firebase';

// Initialize Functions
const functions = getFunctions(app);

// Uncomment for local development with emulator:
// connectFunctionsEmulator(functions, 'localhost', 5001);

/**
 * Encrypt and store API key using Cloud Function
 */
export async function encryptAndStoreApiKey(apiKey: string): Promise<void> {
    const encryptApiKeyFn = httpsCallable(functions, 'encryptApiKey');
    const result = await encryptApiKeyFn({ apiKey });

    if (!(result.data as any).success) {
        throw new Error('Failed to encrypt API key');
    }
}

/**
 * Delete API key using Cloud Function
 */
export async function deleteApiKey(): Promise<void> {
    const deleteApiKeyFn = httpsCallable(functions, 'deleteApiKey');
    const result = await deleteApiKeyFn({});

    if (!(result.data as any).success) {
        throw new Error('Failed to delete API key');
    }
}

/**
 * Check if user has an API key stored
 */
export async function getApiKeyStatus(): Promise<{ hasKey: boolean; isEncrypted?: boolean }> {
    const getApiKeyStatusFn = httpsCallable(functions, 'getApiKeyStatus');
    const result = await getApiKeyStatusFn({});
    return result.data as { hasKey: boolean; isEncrypted?: boolean };
}

/**
 * Validate stored API key
 */
export async function validateApiKey(): Promise<{ valid: boolean; error?: string }> {
    const validateApiKeyFn = httpsCallable(functions, 'validateApiKey');
    const result = await validateApiKeyFn({});
    return result.data as { valid: boolean; error?: string };
}

/**
 * Get decrypted API key for client-side TTS
 * Called on login to populate localStorage
 */
export async function getDecryptedApiKey(): Promise<{ hasKey: boolean; apiKey: string | null; error?: string }> {
    const getDecryptedApiKeyFn = httpsCallable(functions, 'getDecryptedApiKey');
    const result = await getDecryptedApiKeyFn({});
    return result.data as { hasKey: boolean; apiKey: string | null; error?: string };
}
