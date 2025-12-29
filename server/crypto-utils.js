/**
 * Crypto Utilities for API Key Encryption
 * Uses AES-256-GCM for authenticated encryption
 */

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // GCM recommends 12-16 bytes
const AUTH_TAG_LENGTH = 16;

/**
 * Get the encryption key from environment
 * @returns {Buffer} 32-byte encryption key
 */
function getEncryptionKey() {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
        throw new Error('ENCRYPTION_KEY not set in environment variables');
    }
    if (key.length !== 64) {
        throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
    }
    return Buffer.from(key, 'hex');
}

/**
 * Encrypt a plaintext string
 * @param {string} plaintext - The text to encrypt
 * @returns {Object} - { encrypted: string, iv: string, authTag: string }
 */
function encrypt(plaintext) {
    if (!plaintext || typeof plaintext !== 'string') {
        throw new Error('Plaintext must be a non-empty string');
    }

    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
        authTagLength: AUTH_TAG_LENGTH
    });

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
        encrypted: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
    };
}

/**
 * Decrypt an encrypted string
 * @param {string} encrypted - The encrypted hex string
 * @param {string} iv - The initialization vector as hex
 * @param {string} authTag - The authentication tag as hex
 * @returns {string} - The decrypted plaintext
 */
function decrypt(encrypted, iv, authTag) {
    if (!encrypted || !iv || !authTag) {
        throw new Error('Missing required decryption parameters');
    }

    const key = getEncryptionKey();

    const decipher = crypto.createDecipheriv(
        ALGORITHM,
        key,
        Buffer.from(iv, 'hex'),
        { authTagLength: AUTH_TAG_LENGTH }
    );

    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

/**
 * Check if a stored key object is encrypted (has all required fields)
 * @param {Object} keyData - The key data from Firestore
 * @returns {boolean}
 */
function isEncrypted(keyData) {
    return keyData &&
        typeof keyData.encrypted === 'string' &&
        typeof keyData.iv === 'string' &&
        typeof keyData.authTag === 'string';
}

/**
 * Decrypt API key from Firestore format
 * Handles both encrypted and legacy plaintext formats
 * @param {Object} keyData - The key data from Firestore
 * @returns {string|null} - The API key or null if not found
 */
function decryptApiKey(keyData) {
    if (!keyData) return null;

    // Handle encrypted format
    if (isEncrypted(keyData)) {
        try {
            return decrypt(keyData.encrypted, keyData.iv, keyData.authTag);
        } catch (error) {
            console.error('Failed to decrypt API key:', error.message);
            return null;
        }
    }

    // Handle legacy plaintext format (for backwards compatibility)
    if (keyData.apiKey && typeof keyData.apiKey === 'string') {
        console.warn('Found plaintext API key - consider re-encrypting');
        return keyData.apiKey;
    }

    return null;
}

module.exports = {
    encrypt,
    decrypt,
    isEncrypted,
    decryptApiKey
};
