/**
 * API Server for PM Interview Buddy
 * Handles secure API key encryption/decryption
 */

const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const { encrypt, decryptApiKey } = require('./crypto-utils');
require('dotenv').config();

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    const serviceAccount = require('./serviceAccountKey.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();
const app = express();

// Middleware
app.use(cors({
    origin: [
        'http://localhost:5173',
        'http://localhost:3000',
        'https://pm-buddy.vercel.app',
        'https://pm-mock-studio.vercel.app',
        /\.vercel\.app$/
    ],
    credentials: true
}));
app.use(express.json());

/**
 * Verify Firebase Auth Token
 */
async function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const idToken = authHeader.split('Bearer ')[1];

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.user = decodedToken;
        next();
    } catch (error) {
        console.error('Token verification failed:', error.message);
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

/**
 * POST /api/keys/encrypt
 * Encrypts and stores user's OpenAI API key
 */
app.post('/api/keys/encrypt', verifyToken, async (req, res) => {
    try {
        const { apiKey } = req.body;
        const userId = req.user.uid;

        if (!apiKey || typeof apiKey !== 'string') {
            return res.status(400).json({ error: 'API key is required' });
        }

        if (!apiKey.startsWith('sk-')) {
            return res.status(400).json({ error: 'Invalid OpenAI API key format' });
        }

        // Encrypt the API key
        const encryptedData = encrypt(apiKey);

        // Store in Firestore
        await db.collection('users').doc(userId).collection('settings').doc('openai').set({
            encrypted: encryptedData.encrypted,
            iv: encryptedData.iv,
            authTag: encryptedData.authTag,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            encryptionVersion: 1
        });

        console.log(`API key encrypted and stored for user: ${userId}`);

        res.json({ success: true, message: 'API key encrypted and stored' });

    } catch (error) {
        console.error('Encryption error:', error);
        res.status(500).json({ error: 'Failed to encrypt API key' });
    }
});

/**
 * DELETE /api/keys
 * Removes user's OpenAI API key
 */
app.delete('/api/keys', verifyToken, async (req, res) => {
    try {
        const userId = req.user.uid;

        await db.collection('users').doc(userId).collection('settings').doc('openai').delete();

        console.log(`API key deleted for user: ${userId}`);

        res.json({ success: true, message: 'API key deleted' });

    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: 'Failed to delete API key' });
    }
});

/**
 * GET /api/keys/status
 * Check if user has an API key stored (doesn't return the key)
 */
app.get('/api/keys/status', verifyToken, async (req, res) => {
    try {
        const userId = req.user.uid;

        const doc = await db.collection('users').doc(userId).collection('settings').doc('openai').get();

        if (doc.exists) {
            const data = doc.data();
            res.json({
                hasKey: true,
                isEncrypted: !!data.encrypted,
                updatedAt: data.updatedAt
            });
        } else {
            res.json({ hasKey: false });
        }

    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({ error: 'Failed to check key status' });
    }
});

/**
 * POST /api/keys/validate
 * Validates the stored API key by making a test call to OpenAI
 */
app.post('/api/keys/validate', verifyToken, async (req, res) => {
    try {
        const userId = req.user.uid;

        // Fetch encrypted key
        const doc = await db.collection('users').doc(userId).collection('settings').doc('openai').get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'No API key found' });
        }

        const keyData = doc.data();
        const apiKey = decryptApiKey(keyData);

        if (!apiKey) {
            return res.status(500).json({ error: 'Failed to decrypt API key' });
        }

        // Test the key with OpenAI
        const OpenAI = require('openai');
        const openai = new OpenAI({ apiKey });

        await openai.models.list();

        res.json({ valid: true, message: 'API key is valid' });

    } catch (error) {
        console.error('Validation error:', error);

        if (error.code === 'invalid_api_key') {
            return res.status(400).json({ valid: false, error: 'Invalid API key' });
        }
        if (error.code === 'insufficient_quota') {
            return res.status(400).json({ valid: false, error: 'API key has exceeded quota' });
        }

        res.status(500).json({ error: 'Failed to validate API key' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
const PORT = process.env.API_PORT || 3001;

app.listen(PORT, () => {
    console.log(`API Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
