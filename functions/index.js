/**
 * Firebase Cloud Functions for PM Mock Studio
 * 
 * Includes:
 * - API Key encryption/decryption (HTTPS callable)
 * - Interview triggers (Firestore triggers)
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });
const OpenAI = require('openai');
const crypto = require('crypto');

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// ============================================
// ENCRYPTION UTILITIES
// ============================================

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey() {
    // In Cloud Functions, use Firebase environment config
    const key = functions.config().encryption?.key || process.env.ENCRYPTION_KEY;
    if (!key) {
        throw new Error('ENCRYPTION_KEY not configured. Run: firebase functions:config:set encryption.key="YOUR_KEY"');
    }
    if (key.length !== 64) {
        throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
    }
    return Buffer.from(key, 'hex');
}

function encrypt(plaintext) {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return {
        encrypted: encrypted,
        iv: iv.toString('hex'),
        authTag: cipher.getAuthTag().toString('hex')
    };
}

function decrypt(encrypted, iv, authTag) {
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'hex'), { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

function decryptApiKey(keyData) {
    if (!keyData) return null;

    // Handle encrypted format
    if (keyData.encrypted && keyData.iv && keyData.authTag) {
        try {
            return decrypt(keyData.encrypted, keyData.iv, keyData.authTag);
        } catch (error) {
            console.error('Failed to decrypt API key:', error.message);
            return null;
        }
    }

    // Handle legacy plaintext format
    if (keyData.apiKey && typeof keyData.apiKey === 'string') {
        console.warn('Found plaintext API key - consider re-encrypting');
        return keyData.apiKey;
    }

    return null;
}

// ============================================
// HTTPS CALLABLE FUNCTIONS (API Endpoints)
// ============================================

/**
 * Encrypt and store API key
 * Called from frontend when user saves their API key
 */
exports.encryptApiKey = functions.https.onCall(async (data, context) => {
    // Verify authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { apiKey } = data;
    const userId = context.auth.uid;

    if (!apiKey || typeof apiKey !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'API key is required');
    }

    if (!apiKey.startsWith('sk-')) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid OpenAI API key format');
    }

    try {
        const encryptedData = encrypt(apiKey);

        await db.collection('users').doc(userId).collection('settings').doc('openai').set({
            encrypted: encryptedData.encrypted,
            iv: encryptedData.iv,
            authTag: encryptedData.authTag,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            encryptionVersion: 1
        });

        console.log(`API key encrypted for user: ${userId}`);
        return { success: true };

    } catch (error) {
        console.error('Encryption error:', error);
        throw new functions.https.HttpsError('internal', 'Failed to encrypt API key');
    }
});

/**
 * Delete API key
 */
exports.deleteApiKey = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;

    try {
        await db.collection('users').doc(userId).collection('settings').doc('openai').delete();
        console.log(`API key deleted for user: ${userId}`);
        return { success: true };
    } catch (error) {
        console.error('Delete error:', error);
        throw new functions.https.HttpsError('internal', 'Failed to delete API key');
    }
});

/**
 * Check API key status
 */
exports.getApiKeyStatus = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;

    try {
        const doc = await db.collection('users').doc(userId).collection('settings').doc('openai').get();

        if (doc.exists) {
            const data = doc.data();
            return {
                hasKey: true,
                isEncrypted: !!data.encrypted
            };
        }
        return { hasKey: false };
    } catch (error) {
        console.error('Status check error:', error);
        throw new functions.https.HttpsError('internal', 'Failed to check key status');
    }
});

/**
 * Validate API key by testing with OpenAI
 */
exports.validateApiKey = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;

    try {
        const doc = await db.collection('users').doc(userId).collection('settings').doc('openai').get();

        if (!doc.exists) {
            return { valid: false, error: 'No API key found' };
        }

        const keyData = doc.data();
        const apiKey = decryptApiKey(keyData);

        if (!apiKey) {
            return { valid: false, error: 'Failed to decrypt API key' };
        }

        const openai = new OpenAI({ apiKey });
        await openai.models.list();

        return { valid: true };

    } catch (error) {
        console.error('Validation error:', error);
        if (error.code === 'invalid_api_key') {
            return { valid: false, error: 'Invalid API key' };
        }
        if (error.code === 'insufficient_quota') {
            return { valid: false, error: 'API key has exceeded quota' };
        }
        return { valid: false, error: 'Validation failed' };
    }
});

// ============================================
// FIRESTORE TRIGGERS (Interview Handling)
// ============================================

// Load interview logic
const openAILogic = require('./Open AI Logic.json');

/**
 * Get user's OpenAI client
 */
async function getUserOpenAI(userId) {
    const doc = await db.collection('users').doc(userId).collection('settings').doc('openai').get();

    if (!doc.exists) {
        throw new Error(`No API key found for user ${userId}`);
    }

    const apiKey = decryptApiKey(doc.data());
    if (!apiKey) {
        throw new Error(`Failed to decrypt API key for user ${userId}`);
    }

    return new OpenAI({ apiKey });
}

/**
 * Round mapping for interview types
 */
const roundMapping = {
    'product-sense': 'PRODUCT_IMPROVEMENT',
    'technical': 'PRODUCT_DESIGN',
    'rca': 'RCA',
    'metrics': 'METRICS',
    'guesstimates': 'GUESSTIMATES',
    'strategy': 'PRODUCT_STRATEGY'
};

/**
 * Trigger: New interview created
 * Generates the first question
 */
exports.onInterviewCreated = functions.firestore
    .document('interviews/{interviewId}')
    .onCreate(async (snap, context) => {
        const interviewId = context.params.interviewId;
        const data = snap.data();
        const userId = data.userId;

        if (data.status !== 'active') return null;

        console.log(`New interview created: ${interviewId} for user: ${userId}`);

        try {
            const userOpenAI = await getUserOpenAI(userId);

            const backendRound = roundMapping[data.roundType] || 'PRODUCT_IMPROVEMENT';
            const backendDifficulty = (data.difficulty || 'MEDIUM').toUpperCase();

            // Get rubric
            let rubricContent = '';
            if (openAILogic.rubrics[backendRound]?.[backendDifficulty]) {
                rubricContent = openAILogic.rubrics[backendRound][backendDifficulty].content;
            } else {
                rubricContent = 'Conduct a professional product management interview.';
            }

            // Parse practice questions from rubric
            let practiceQuestions = [];
            const practiceMatch = rubricContent.match(/Practice Questions:\s*((?:- .+\n?)+)/i);
            if (practiceMatch?.[1]) {
                practiceQuestions = practiceMatch[1].split('\n')
                    .map(line => line.replace(/^-\s*/, '').trim())
                    .filter(line => line.length > 10);
            }

            // Select a random question
            let selectedQuestion;
            if (practiceQuestions.length > 0) {
                const randomIndex = Math.floor(Math.random() * practiceQuestions.length);
                selectedQuestion = practiceQuestions[randomIndex];
            } else {
                // Fallback to AI generation
                const systemPrompt = openAILogic.prompts.system_antigravity;
                const completion = await userOpenAI.chat.completions.create({
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: `Generate a ${backendRound} interview question at ${backendDifficulty} difficulty. Just the question, under 15 words.` }
                    ],
                    model: "gpt-4o",
                    max_tokens: 60
                });
                selectedQuestion = completion.choices[0].message.content;
            }

            // Add first message
            await db.collection('interviews').doc(interviewId).collection('messages').add({
                sender: 'ai',
                text: selectedQuestion,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });

            // Save question for history tracking
            await snap.ref.update({ questionText: selectedQuestion });

            console.log(`First question sent for interview ${interviewId}`);
            return null;

        } catch (error) {
            console.error(`Error in onInterviewCreated for ${interviewId}:`, error);

            // Send error message to user
            await db.collection('interviews').doc(interviewId).collection('messages').add({
                sender: 'ai',
                text: `Error: ${error.message}. Please check your OpenAI API key in Settings.`,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
            return null;
        }
    });

/**
 * Trigger: New message in interview
 * Generates AI response when user sends a message
 */
exports.onMessageCreated = functions.firestore
    .document('interviews/{interviewId}/messages/{messageId}')
    .onCreate(async (snap, context) => {
        const { interviewId, messageId } = context.params;
        const message = snap.data();

        // Only respond to user messages
        if (message.sender !== 'user') return null;

        console.log(`New user message in ${interviewId}: ${message.text?.substring(0, 50)}...`);

        try {
            // Get interview data
            const interviewDoc = await db.collection('interviews').doc(interviewId).get();
            if (!interviewDoc.exists) {
                console.error(`Interview ${interviewId} not found`);
                return null;
            }

            const interviewData = interviewDoc.data();
            const userId = interviewData.userId;

            if (interviewData.status !== 'active') {
                console.log(`Interview ${interviewId} is not active, skipping`);
                return null;
            }

            const userOpenAI = await getUserOpenAI(userId);

            // Get conversation history
            const messagesSnap = await db.collection('interviews')
                .doc(interviewId)
                .collection('messages')
                .orderBy('timestamp', 'asc')
                .get();

            const history = messagesSnap.docs.map(doc => ({
                role: doc.data().sender === 'user' ? 'user' : 'assistant',
                content: doc.data().text
            }));

            // Build system prompt
            const backendRound = roundMapping[interviewData.roundType] || 'PRODUCT_IMPROVEMENT';
            const backendDifficulty = (interviewData.difficulty || 'MEDIUM').toUpperCase();

            let rubricContent = '';
            if (openAILogic.rubrics[backendRound]?.[backendDifficulty]) {
                rubricContent = openAILogic.rubrics[backendRound][backendDifficulty].content;
            }

            const systemPrompt = `${openAILogic.prompts.system_antigravity}
            
            ROUND: ${backendRound}
            DIFFICULTY: ${backendDifficulty}
            
            RUBRIC:
            ${rubricContent}`;

            // Generate response
            const completion = await userOpenAI.chat.completions.create({
                messages: [
                    { role: "system", content: systemPrompt },
                    ...history
                ],
                model: "gpt-4o"
            });

            const reply = completion.choices[0].message.content;

            await db.collection('interviews').doc(interviewId).collection('messages').add({
                sender: 'ai',
                text: reply,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });

            console.log(`AI replied to ${interviewId}`);
            return null;

        } catch (error) {
            console.error(`Error in onMessageCreated for ${interviewId}:`, error);

            let errorMessage = "I'm having trouble connecting to OpenAI.";
            if (error.code === 'insufficient_quota') {
                errorMessage = "Error: Your OpenAI API Key has exceeded its quota.";
            } else if (error.code === 'invalid_api_key') {
                errorMessage = "Error: Invalid OpenAI API Key.";
            }

            await db.collection('interviews').doc(interviewId).collection('messages').add({
                sender: 'ai',
                text: errorMessage,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });

            return null;
        }
    });

/**
 * Trigger: Interview status updated
 * Generates insights when interview is completed
 */
exports.onInterviewUpdated = functions.firestore
    .document('interviews/{interviewId}')
    .onUpdate(async (change, context) => {
        const interviewId = context.params.interviewId;
        const before = change.before.data();
        const after = change.after.data();

        // Check if status changed to 'completed' and insights don't exist yet
        if (before.status === 'active' && after.status === 'completed' && !after.insights) {
            console.log(`Interview ${interviewId} completed. Generating insights...`);

            const userId = after.userId;

            try {
                const userOpenAI = await getUserOpenAI(userId);

                // Get transcript
                const messagesSnap = await db.collection('interviews')
                    .doc(interviewId)
                    .collection('messages')
                    .orderBy('timestamp', 'asc')
                    .get();

                const transcript = messagesSnap.docs.map(doc => {
                    const d = doc.data();
                    return `${d.sender.toUpperCase()}: ${d.text}`;
                }).join('\n\n');

                if (!transcript.trim()) {
                    console.warn(`No transcript for ${interviewId}`);
                    return null;
                }

                // Check for actual user participation
                const userMessages = messagesSnap.docs.filter(doc => {
                    const data = doc.data();
                    return data.sender === 'user' && !data.text?.includes('I am ready');
                });

                if (userMessages.length === 0) {
                    await change.after.ref.update({
                        insights: {
                            score: 0,
                            summary: "Interview ended before responses were provided.",
                            strengths: [],
                            improvements: ["Participate in the interview to receive feedback."],
                            scores: {}
                        },
                        insightsGeneratedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                    return null;
                }

                const backendRound = roundMapping[after.roundType] || 'RCA';
                const backendDifficulty = (after.difficulty || 'MEDIUM').toUpperCase();

                let rubricContent = '';
                if (openAILogic.rubrics[backendRound]?.[backendDifficulty]) {
                    rubricContent = openAILogic.rubrics[backendRound][backendDifficulty].content;
                }

                const systemPrompt = `You are a senior PM Interview evaluator. Be harsh but fair.`;

                const userPrompt = `
                Round: ${backendRound}
                Difficulty: ${backendDifficulty}
                
                Rubric: ${rubricContent}
                
                Transcript:
                ${transcript}
                
                Evaluate ONLY the candidate's (user) responses. Return JSON:
                {
                    "score": <0-10>,
                    "summary": "<2-3 sentences>",
                    "strengths": ["<point 1>", ...],
                    "improvements": ["<point 1>", ...],
                    "scores": {"<Category>": <0-100>, ...}
                }`;

                const completion = await userOpenAI.chat.completions.create({
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userPrompt }
                    ],
                    model: "gpt-4o",
                    response_format: { type: "json_object" }
                });

                const insights = JSON.parse(completion.choices[0].message.content);

                await change.after.ref.update({
                    insights: insights,
                    insightsGeneratedAt: admin.firestore.FieldValue.serverTimestamp()
                });

                console.log(`Insights generated for ${interviewId}`);
                return null;

            } catch (error) {
                console.error(`Error generating insights for ${interviewId}:`, error);

                await change.after.ref.update({
                    insights: {
                        score: 0,
                        summary: `Error generating insights: ${error.message}`,
                        strengths: [],
                        improvements: [],
                        scores: {}
                    },
                    insightsGeneratedAt: admin.firestore.FieldValue.serverTimestamp()
                });

                return null;
            }
        }

        return null;
    });
