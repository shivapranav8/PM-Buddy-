/**
 * Firebase Cloud Functions for PM Interview Buddy
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

/**
 * Get decrypted API key for client-side TTS
 * Called on login to populate localStorage
 * The key is returned securely over HTTPS to the authenticated user only
 */
exports.getDecryptedApiKey = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;

    try {
        const doc = await db.collection('users').doc(userId).collection('settings').doc('openai').get();

        if (!doc.exists) {
            return { hasKey: false, apiKey: null };
        }

        const keyData = doc.data();
        const apiKey = decryptApiKey(keyData);

        if (!apiKey) {
            return { hasKey: true, apiKey: null, error: 'Failed to decrypt' };
        }

        // Return the decrypted key - this goes over HTTPS to the authenticated user only
        console.log(`Decrypted API key for user: ${userId}`);
        return { hasKey: true, apiKey: apiKey };

    } catch (error) {
        console.error('Decryption error:', error);
        throw new functions.https.HttpsError('internal', 'Failed to retrieve API key');
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
            // More flexible regex to handle varied "Practice Questions" headers
            const practiceMatch = rubricContent.match(/Practice Questions.*:\s*((?:- .+\n?)+)/i);
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
                console.log(`Selected curated question: ${selectedQuestion}`);
            } else {
                console.warn('No curated questions found, falling back to AI generation');
                // Fallback to AI generation with better context
                const systemPrompt = openAILogic.prompts.system_antigravity;
                const completion = await userOpenAI.chat.completions.create({
                    messages: [
                        { role: "system", content: systemPrompt },
                        {
                            role: "user", content: `Generate a ${backendRound} interview question at ${backendDifficulty} difficulty. 
                        
IMPORTANT: Always mention a real-world product name or specific software (e.g., Instagram, Swiggy, Uber, or a generic SaaS/B2B platform) in the question to provide context. 

Just return the question text, under 20 words.` }
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

            // Add special instructions for RCA to prevent giving away answers
            let additionalInstructions = '';
            if (backendRound === 'RCA') {
                additionalInstructions = `
                
CRITICAL RCA INTERVIEW RULES:
- **NEVER reveal potential root causes or answers to the candidate**
- **NEVER provide hints about what might have caused the issue**
- **NEVER mention specific events, updates, or changes unless the candidate asks**
- Only answer questions the candidate explicitly asks
- If they ask a yes/no question, answer concisely
- If they ask about a specific area, only provide data for that area
- Make them do the detective work - don't guide them to the answer
- ${backendDifficulty === 'HARD' ? 'Be especially strict - provide minimal information unless directly asked' : 'Guide them with questions, but never reveal causes'}
                `;
            }

            const systemPrompt = `${openAILogic.prompts.system_antigravity}
            
            ROUND: ${backendRound}
            DIFFICULTY: ${backendDifficulty}
            ${additionalInstructions}
            
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

                const systemPrompt = `You are a HARSH senior Product Management Interview Bar Raiser at Google / Meta. 
You have extremely high standards and rarely give scores above 70%.
You are evaluating a CANDIDATE's performance in a mock interview.

CRITICAL RULES:
1. ONLY evaluate the CANDIDATE's responses (marked as "user" in transcript)
2. DO NOT evaluate the interviewer's questions or follow-ups
3. Be HARSH - most candidates should score 40-60%. Only exceptional answers get 70+%.
4. Penalize heavily for: vague answers, missing structure, no data requests, jumping to solutions
5. A perfect answer (90-100%) is extremely rare

RCA ROUND SPECIFICS:
- For HARD difficulty RCA, the "actual_root_cause" MUST be systemic and multi-layered.
- IF the session difficulty is HARD, ensure the "actual_root_cause" output reflects this complexity.`;

                const userPrompt = `
                Context:
                - Round: ${backendRound}
                - Difficulty: ${backendDifficulty}
                
                Rubric / Assessment Pointers:
                ${rubricContent}
                
                Transcript (evaluate ONLY the "user" messages, NOT the "assistant" messages):
                ${transcript}
                
                ---
                TASK:
                Evaluate ONLY THE CANDIDATE's responses (user messages) based on the Rubric.
                Do NOT give credit for anything the interviewer (assistant) said or hinted at.
                Provide the output in valid JSON format with the following structure:
                {
                    "score": <number 0-10>,
                    "summary": "<2-3 sentences summary>",
                    "strengths": ["<point 1>", "<point 2>", ...],
                    "improvements": ["<point 1>", "<point 2>", ...],
                    "scores": {
                        "<Rubric Category 1>": <percentage 0-100>,
                        "<Rubric Category 2>": <percentage 0-100>,
                        ...
                    },
                    "actual_root_cause": "<1-2 sentences outlining the TRUE root cause that should have been discovered>",
                    "rubric_breakdown": [
                        { "category": "<Category Name from Rubric>", "score": <0-5>, "feedback": "<Specific feedback>" },
                        ...
                    ]
                }
                ${backendRound === 'RCA' ? `
CRITICAL FOR RCA:
Your "scores" object MUST include these exact keys with percentage values (0-100):
{
  "Problem Framing": <0-100>,
  "MECE Thinking": <0-100>,
  "Structure Thinking": <0-100>,
  "Prioritization & Root Cause": <0-100>,
  "Solution Quality": <0-100>
}

Your "rubric_breakdown" array MUST include these exact categories with individual scores (0-5):
1. { "category": "Problem Framing", "score": <0-5>, "feedback": "..." }
2. { "category": "MECE Thinking", "score": <0-5>, "feedback": "..." }
3. { "category": "Structure Thinking", "score": <0-5>, "feedback": "..." }
4. { "category": "Prioritization & Root Cause", "score": <0-5>, "feedback": "..." }
5. { "category": "Solution Quality", "score": <0-5>, "feedback": "..." }
` : ''}
                ${backendRound === 'PRODUCT_IMPROVEMENT' ? `
CRITICAL FOR PRODUCT_IMPROVEMENT:
Your "scores" object MUST include these exact keys with percentage values (0-100):
{
  "Product Insight": <0-100>,
  "User Empathy": <0-100>,
  "Problem Framing": <0-100>,
  "Solution Creativity": <0-100>,
  "Design Judgment": <0-100>
}

Your "rubric_breakdown" array MUST include these exact categories with individual scores (0-5):
1. { "category": "Product Insight", "score": <0-5>, "feedback": "..." }
2. { "category": "User Empathy", "score": <0-5>, "feedback": "..." }
3. { "category": "Problem Framing", "score": <0-5>, "feedback": "..." }
4. { "category": "Solution Creativity", "score": <0-5>, "feedback": "..." }
5. { "category": "Design Judgment", "score": <0-5>, "feedback": "..." }
` : ''}
                ${backendRound === 'PRODUCT_STRATEGY' ? `
CRITICAL FOR PRODUCT_STRATEGY:
Your "scores" object MUST include these exact keys with percentage values (0-100):
{
  "Strategic Framing": <0-100>,
  "Systems Thinking": <0-100>,
  "First-Principles Reasoning": <0-100>,
  "Strategic Options": <0-100>,
  "Strategic Choice & Prioritization": <0-100>,
  "Long-Term Vision": <0-100>,
  "Risks & Trade-offs": <0-100>,
  "Metrics & Success Criteria": <0-100>,
  "Communication & Leadership": <0-100>
}

Your "rubric_breakdown" array MUST include these exact categories with individual scores (0-5):
1. { "category": "Strategic Framing", "score": <0-5>, "feedback": "..." }
2. { "category": "Systems Thinking", "score": <0-5>, "feedback": "..." }
3. { "category": "First-Principles Reasoning", "score": <0-5>, "feedback": "..." }
4. { "category": "Strategic Options", "score": <0-5>, "feedback": "..." }
5. { "category": "Strategic Choice & Prioritization", "score": <0-5>, "feedback": "..." }
6. { "category": "Long-Term Vision", "score": <0-5>, "feedback": "..." }
7. { "category": "Risks & Trade-offs", "score": <0-5>, "feedback": "..." }
8. { "category": "Metrics & Success Criteria", "score": <0-5>, "feedback": "..." }
9. { "category": "Communication & Leadership", "score": <0-5>, "feedback": "..." }
` : ''}
                ${backendRound === 'GUESSTIMATES' ? `
CRITICAL FOR GUESSTIMATES:
Your "scores" object MUST include these exact keys with percentage values (0-100):
{
  "Problem Clarification": <0-100>,
  "Logical Structure": <0-100>,
  "Reasonable Assumptions": <0-100>,
  "Quantitative Comfort": <0-100>,
  "Sanity Checking": <0-100>,
  "Communication & Composure": <0-100>
}

Your "rubric_breakdown" array MUST include these exact categories with individual scores (0-5):
1. { "category": "Problem Clarification", "score": <0-5>, "feedback": "..." }
2. { "category": "Logical Structure", "score": <0-5>, "feedback": "..." }
3. { "category": "Reasonable Assumptions", "score": <0-5>, "feedback": "..." }
4. { "category": "Quantitative Comfort", "score": <0-5>, "feedback": "..." }
5. { "category": "Sanity Checking", "score": <0-5>, "feedback": "..." }
6. { "category": "Communication & Composure", "score": <0-5>, "feedback": "..." }
` : ''}
                ${backendRound === 'METRICS' ? `
CRITICAL FOR METRICS:
Your "scores" object MUST include these exact keys with percentage values (0-100):
{
  "Structured Problem Approach": <0-100>,
  "Strategic Metric Selection": <0-100>,
  "Technical Operationalization": <0-100>,
  "Trade-off Evaluation": <0-100>
}

Your "rubric_breakdown" array MUST include these exact categories with individual scores (0-5):
1. { "category": "Structured Problem Approach", "score": <0-5>, "feedback": "..." }
2. { "category": "Strategic Metric Selection", "score": <0-5>, "feedback": "..." }
3. { "category": "Technical Operationalization", "score": <0-5>, "feedback": "..." }
4. { "category": "Trade-off Evaluation", "score": <0-5>, "feedback": "..." }
` : ''}
                ${backendRound === 'PRODUCT_DESIGN' ? `
CRITICAL FOR PRODUCT_DESIGN:
Your "scores" object MUST include these exact keys with percentage values (0-100):
{
  "Problem Framing & Clarification": <0-100>,
  "User Understanding & Empathy": <0-100>,
  "Solution Exploration": <0-100>,
  "Prioritization & Judgment": <0-100>,
  "Solution Structure & Coherence": <0-100>,
  "Trade-offs & Constraints": <0-100>,
  "Success Metrics & Validation": <0-100>,
  "Communication & Reasoning": <0-100>
}

Your "rubric_breakdown" array MUST include these exact categories with individual scores (0-5):
1. { "category": "Problem Framing & Clarification", "score": <0-5>, "feedback": "..." }
2. { "category": "User Understanding & Empathy", "score": <0-5>, "feedback": "..." }
3. { "category": "Solution Exploration", "score": <0-5>, "feedback": "..." }
4. { "category": "Prioritization & Judgment", "score": <0-5>, "feedback": "..." }
5. { "category": "Solution Structure & Coherence", "score": <0-5>, "feedback": "..." }
6. { "category": "Trade-offs & Constraints", "score": <0-5>, "feedback": "..." }
7. { "category": "Success Metrics & Validation", "score": <0-5>, "feedback": "..." }
8. { "category": "Communication & Reasoning", "score": <0-5>, "feedback": "..." }
` : ''}
                `;

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

/**
 * Reverse Proxy for PostHog to bypass ad blockers
 * Access at /ingest matches usually map to /posthogProxy via firebase.json rewrites
 */
exports.posthogProxy = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        // Strip the /ingest prefix to map to PostHog root
        // Example: /ingest/e -> /e
        // If req.path comes in as /ingest/e, we want /e
        // Note: req.path depends on hosting rewrite behavior, usually includes full path

        let targetPath = req.path;
        if (targetPath.startsWith('/ingest')) {
            targetPath = targetPath.replace('/ingest', '');
        }

        const targetUrl = `https://us.i.posthog.com${targetPath}`;

        console.log(`Proxying ${req.method} request from ${req.path} to ${targetUrl}`);

        try {
            // Forward headers but filter out host/origin to avoid confusion
            const headers = { ...req.headers };
            delete headers.host;
            delete headers.origin;
            delete headers.referer;

            const response = await fetch(targetUrl, {
                method: req.method,
                headers: headers,
                body: (req.method !== 'GET' && req.method !== 'HEAD') ? JSON.stringify(req.body) : undefined
            });

            const data = await response.text();

            // Forward response status and headers
            res.status(response.status);
            // Copy keys from response.headers if needed, or simple send
            res.send(data);
        } catch (error) {
            console.error('PostHog Proxy Error:', error);
            res.status(500).send('Proxy Error');
        }
    });
});
