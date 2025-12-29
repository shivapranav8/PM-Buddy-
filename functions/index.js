const admin = require('firebase-admin');
const functions = require('firebase-functions');
const OpenAI = require('openai');
const openAILogic = require('./Open AI Logic.json');

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Helper function to get user's OpenAI key
async function getUserOpenAIKey(userId) {
    try {
        const userSettingsDoc = await db.collection('users').doc(userId).collection('settings').doc('openai').get();
        if (userSettingsDoc.exists) {
            return userSettingsDoc.data().apiKey;
        }
        return null;
    } catch (error) {
        console.error(`Error fetching OpenAI Key for user ${userId}:`, error);
        return null;
    }
}

// Helper function to get interview details and build system prompt
async function buildSystemPrompt(interviewId, userId) {
    const interviewDoc = await db.collection('interviews').doc(interviewId).get();
    if (!interviewDoc.exists) {
        throw new Error(`Interview ${interviewId} not found`);
    }

    const interviewData = interviewDoc.data();
    const interviewRound = interviewData.roundType;
    const interviewDifficulty = (interviewData.difficulty || 'MEDIUM').toUpperCase();

    // Map frontend round IDs to backend enums
    const roundMapping = {
        'product-sense': 'PRODUCT_IMPROVEMENT',
        'technical': 'PRODUCT_DESIGN',
        'rca': 'RCA',
        'metrics': 'METRICS',
        'guesstimates': 'GUESSTIMATES',
        'strategy': 'PRODUCT_STRATEGY'
    };

    const backendRound = roundMapping[interviewRound] || 'PRODUCT_IMPROVEMENT';
    const backendDifficulty = interviewDifficulty;

    // Get the appropriate rubric
    let rubricContent = '';
    try {
        if (openAILogic.rubrics[backendRound] && openAILogic.rubrics[backendRound][backendDifficulty]) {
            rubricContent = openAILogic.rubrics[backendRound][backendDifficulty].content;
        } else {
            console.warn(`No rubric found for ${backendRound} - ${backendDifficulty}, using default`);
            rubricContent = 'Conduct a professional product management interview.';
        }
    } catch (error) {
        console.error('Error loading rubric:', error);
        rubricContent = 'Conduct a professional product management interview.';
    }

    // Construct the unified system prompt
    const baseSystemPrompt = openAILogic.prompts.system_antigravity;
    const randomSeed = Math.random().toString(36).substring(7);
    const unifiedSystemPrompt = `${baseSystemPrompt}
    
    RANDOM_SEED: ${randomSeed}
    
    ROUND: ${backendRound}
    DIFFICULTY: ${backendDifficulty}
    
    RUBRIC:
    ${rubricContent}
    
    CRITICAL GENERATION RULES:
    1. Your first message MUST be exactly one question.
    2. IMPORTANT: The question MUST MATCH THE ROUND TYPE style:
       - For RCA: "X metric dropped by Y%"
       - For PRODUCT_IMPROVEMENT: "How would you improve X?" or "Redesign Y for users."
       - For PRODUCT_DESIGN: "Design a X for Y audience."
       - For GUESSTIMATES: "Estimate the number of X in Y."
    
    3. Generate a NEW, UNIQUE question for companies across various sectors:
       - Big Tech: Google, Meta (Instagram/WhatsApp), Amazon, Apple, Microsoft
       - Travel/Stay: Airbnb, Uber, Ola, Booking.com, Expedia
       - E-commerce: Flipkart, Myntra, Etsy, Shopify, Tata Cliq
       - Food/Social: Swiggy, Zomato, TikTok, YouTube, Netflix, Disney+, Spotify
       - FinTech/EdTech: PhonePe, Stripe, Duolingo, Slack, Discord, Notion, Canva, Zoom
    4. ULTRA-STRICT: If ROUND is PRODUCT_IMPROVEMENT, do NOT ask "Why?". Ask "How would you improve?" or "Redesign?".
    5. ULTRA-STRICT REACTION RULE: If the candidate asks ANY question or makes a data request, you MUST answer it directly and helpfully in your VERY NEXT response.
    6. PRESENTATION RULE: NEVER use markdown formatting like **bold** or __underline__. Keep the text plain, clean, and conversational for a digital interface. Avoid any special characters or symbols.
    7. IMMERSION RULE: You are a human interviewer. NEVER explain your internal logic (e.g., "You seem to be asking for a different format"). NEVER mention "RCA format" or "Product Improvement format" explicitly. If the candidate is off-track, just say "Let's focus on..." naturally. Do not debug the conversation.`;

    const finalSystemPrompt = `${unifiedSystemPrompt}
    
    [FORBIDDEN_FORMATS]
    If ROUND is PRODUCT_IMPROVEMENT:
    - STOP. DO NOT GENERATE A NEW QUESTION.
    - NEVER invent a question.
    - NEVER mention a metric drop, revenue decrease, or sentiment decline.
    - NEVER use "dropped by", "decreased by", "fallen by".
    - NEVER state a problem without asking "How would you improve X?".
    
    [REQUIRED_FORMAT]
    If ROUND is PRODUCT_IMPROVEMENT:
    - YOU MUST COPY-PASTE ONE QUESTION FROM THE "Practice Questions" LIST IN THE RUBRIC.
    - DO NOT CHANGE WORDS.
    - DO NOT ADD CONTEXT.
    - JUST PICK ONE QUESTION FROM THE RUBRIC LIST.
    - EXAMPLE: "How would you improve Instagram's image upload experience to reduce user frustration?"
    - EXAMPLE: "How would you improve Google Maps for users in areas with poor internet connectivity?"

    
    [DIFFICULTY_LOGIC]
    If ROUND is PRODUCT_IMPROVEMENT:
    - EASY: Focus on ONE user group, ONE obvious pain point. Allow answers from personal experience. NO data/trade-offs.
    - MEDIUM: Imply need for diagnosis. specific context/constraint (e.g., low internet). DO NOT mention a specific user group. The candidate MUST define and segment the users.
    
    [VALIDATION CHECKLIST]
    Before asking, validate:
    1. Is this clearly about changing the product experience?
    2. Is the user or context explicit?
    3. Does difficulty match required depth?
    4. Can this be answered without switching rounds?
    
    [INTERVIEW FLOW ENFORCEMENT]
    - Expect candidate to clarify user/context
    - Expect hypothesis BEFORE solution (Medium+)
    - Redirect if candidate jumps to strategy or metrics: "Let's stay focused on product changes. What experience would you improve first?"
    
    Focus on design and evolution.`;

    return { finalSystemPrompt, backendRound, interviewRound, interviewDifficulty };
}

// Generate first question when interview becomes active
async function generateFirstQuestion(interviewId, userId, interviewRound, interviewDifficulty, backendRound, rubricContent) {
    const messagesRef = db.collection('interviews').doc(interviewId).collection('messages');
    const messagesSnapshot = await messagesRef.get();

    if (!messagesSnapshot.empty) {
        return; // Already has messages
    }

    console.log(`Interview ${interviewId} has no messages. Processing first question for ${backendRound}...`);

    const userOpenAIKey = await getUserOpenAIKey(userId);
    if (!userOpenAIKey) {
        console.warn(`No OpenAI Key found for user ${userId}. Cannot generate first question.`);
        // Send error message to user
        await messagesRef.add({
            sender: 'ai',
            text: "Error: OpenAI API Key not configured. Please set your API key in settings.",
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        return;
    }

    const userOpenAI = new OpenAI({ apiKey: userOpenAIKey });

    try {
        // 1. Parse Practice Questions from Rubric
        let practiceQuestions = [];
        const practiceMatch = rubricContent.match(/Practice Questions:\s*((?:- .+\n?)+)/i);
        if (practiceMatch && practiceMatch[1]) {
            const list = practiceMatch[1];
            practiceQuestions = list.split('\n')
                .map(line => line.replace(/^-\s*/, '').trim())
                .filter(line => line.length > 10);
        }
        console.log(`Found ${practiceQuestions.length} practice questions in rubric.`);

        // 2. Fetch User History
        const historySnapshot = await db.collection('interviews')
            .where('userId', '==', userId)
            .where('roundType', '==', interviewRound)
            .where('difficulty', '==', interviewDifficulty)
            .get();

        const questionHistory = new Map();
        historySnapshot.docs.forEach(doc => {
            const d = doc.data();
            if (d.questionText && doc.id !== interviewId) {
                const timestamp = d.createdAt || d.timestamp;
                if (!questionHistory.has(d.questionText) ||
                    (timestamp && timestamp > questionHistory.get(d.questionText).timestamp)) {
                    questionHistory.set(d.questionText, { timestamp, interviewId: doc.id });
                }
            }
        });
        console.log(`User ${userId} has seen ${questionHistory.size} unique questions in this category.`);

        // 3. Determine Selection Strategy
        const availableQuestions = practiceQuestions.filter(q => !questionHistory.has(q));
        let selectedQuestion = null;
        let isFallback = false;

        if (availableQuestions.length > 0) {
            const randomIndex = Math.floor(Math.random() * availableQuestions.length);
            selectedQuestion = availableQuestions[randomIndex];
            console.log(`✓ Selected: "${selectedQuestion}"`);
        } else if (questionHistory.size > 0) {
            const sortedQuestions = Array.from(questionHistory.entries())
                .filter(([question]) => practiceQuestions.includes(question))
                .sort((a, b) => {
                    const timeA = a[1].timestamp?.toMillis?.() || 0;
                    const timeB = b[1].timestamp?.toMillis?.() || 0;
                    return timeA - timeB;
                });

            if (sortedQuestions.length > 0) {
                const oldestCount = Math.min(3, sortedQuestions.length);
                const oldestQuestions = sortedQuestions.slice(0, oldestCount);
                const randomPick = oldestQuestions[Math.floor(Math.random() * oldestQuestions.length)];
                selectedQuestion = randomPick[0];
            } else {
                selectedQuestion = practiceQuestions[0];
            }
        } else {
            isFallback = true;
        }

        // 4. Execution
        if (!isFallback && selectedQuestion) {
            await messagesRef.add({
                sender: 'ai',
                text: selectedQuestion,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });

            await db.collection('interviews').doc(interviewId).update({
                questionText: selectedQuestion
            });
        } else {
            // AI Generation Fallback
            const { finalSystemPrompt } = await buildSystemPrompt(interviewId, userId);
            let generationSystemPrompt = finalSystemPrompt;

            if (backendRound === 'PRODUCT_IMPROVEMENT') {
                generationSystemPrompt = generationSystemPrompt.replace('STOP. DO NOT GENERATE A NEW QUESTION.', 'GENERATE A NEW QUESTION.');
                generationSystemPrompt = generationSystemPrompt.replace('NEVER invent a question.', '');
                generationSystemPrompt = generationSystemPrompt.replace('YOU MUST COPY-PASTE ONE QUESTION FROM THE "Practice Questions" LIST IN THE RUBRIC.', '');

                generationSystemPrompt += `
                
                [GENERATION OVERRIDE]
                - The user has exhausted all practice questions.
                - YOU MUST GENERATE A NEW, UNIQUE QUESTION.
                - It must follow the exact same style as the "Practice Questions".
                - "How would you improve X?" or "Redesign X for Y".
                - Pick a company NOT in the practice list if possible.
                `;
            }

            const completion = await userOpenAI.chat.completions.create({
                messages: [
                    { role: "system", content: generationSystemPrompt },
                    {
                        role: "user",
                        content: `CONTEXT: We are doing a ${backendRound} interview. 
                        The candidate has done many before. Generate a NEW, FRESH question.
                        DO NOT ask about metric drops or "why" questions. 
                        Ask for a way to IMPROVE or REDESIGN a product. 
                        Keep it under 15 words. Just the question.`
                    }
                ],
                model: "gpt-4o",
                max_tokens: 60,
                temperature: 0.7,
            });

            const reply = completion.choices[0].message.content;

            await messagesRef.add({
                sender: 'ai',
                text: reply,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });

            await db.collection('interviews').doc(interviewId).update({
                questionText: reply
            });

            console.log(`Generated fallback question for ${interviewId}: ${reply}`);
        }
    } catch (error) {
        console.error('Error generating first question:', error);
        // Send error message to user
        try {
            await messagesRef.add({
                sender: 'ai',
                text: `Error: ${error.message || 'Failed to generate first question. Please try again.'}`,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
        } catch (err) {
            console.error('Failed to send error message:', err);
        }
    }
}

// Process user message and generate AI response
async function processUserMessage(interviewId, userId, messageText) {
    console.log(`Processing message for ${interviewId}: ${messageText}`);

    const userOpenAIKey = await getUserOpenAIKey(userId);
    if (!userOpenAIKey) {
        console.warn(`No OpenAI Key found for user ${userId}. Cannot reply.`);
        await db.collection('interviews').doc(interviewId).collection('messages').add({
            sender: 'ai',
            text: "Error: OpenAI API Key not configured. Please set your API key in settings.",
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        return;
    }

    const userOpenAI = new OpenAI({ apiKey: userOpenAIKey });
    const { finalSystemPrompt } = await buildSystemPrompt(interviewId, userId);

    // Get conversation history
    const messagesSnapshot = await db.collection('interviews').doc(interviewId).collection('messages')
        .orderBy('timestamp', 'asc')
        .get();

    const history = messagesSnapshot.docs.map(doc => ({
        role: doc.data().sender === 'user' ? 'user' : 'assistant',
        content: doc.data().text
    }));

    try {
        const messages = [
            { role: "system", content: finalSystemPrompt },
            ...history
        ];

        const completion = await userOpenAI.chat.completions.create({
            messages: messages,
            model: "gpt-4o",
        });

        const reply = completion.choices[0].message.content;

        await db.collection('interviews').doc(interviewId).collection('messages').add({
            sender: 'ai',
            text: reply,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`Replied to ${interviewId}`);
    } catch (error) {
        console.error('Error generating reply:', error);
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
    }
}

// Generate insights when interview is completed
async function generateInsights(interviewId, userId) {
    console.log(`========================================`);
    console.log(`GENERATING INSIGHTS FOR: ${interviewId}`);
    console.log(`User ID: ${userId}`);
    console.log(`========================================`);

    const userOpenAIKey = await getUserOpenAIKey(userId);
    if (!userOpenAIKey) {
        console.error(`No OpenAI Key found for user ${userId}. Cannot evaluate.`);
        return;
    }

    const userOpenAI = new OpenAI({ apiKey: userOpenAIKey });

    // Get Interview Details & Transcript
    const interviewDoc = await db.collection('interviews').doc(interviewId).get();
    if (!interviewDoc.exists) {
        console.error(`Interview ${interviewId} not found.`);
        return;
    }

    const interviewData = interviewDoc.data();
    const messagesSnap = await db.collection('interviews').doc(interviewId).collection('messages')
        .orderBy('timestamp', 'asc').get();
    
    const transcript = messagesSnap.docs.map(doc => {
        const d = doc.data();
        return `${d.sender.toUpperCase()}: ${d.text}`;
    }).join('\n\n');

    if (!transcript || transcript.trim() === "") {
        console.warn(`No transcript found for ${interviewId}.`);
        return;
    }

    // Check if user actually participated
    const userMessagesSnapshot = await db.collection('interviews').doc(interviewId).collection('messages')
        .where('sender', '==', 'user').get();
    const actualUserMessages = userMessagesSnapshot.docs.filter(doc => {
        const text = doc.data().text || "";
        return !text.includes("I am ready for the interview");
    });

    if (actualUserMessages.length === 0) {
        console.log(`No actual user participation for ${interviewId}. Marking score as 0.`);
        await db.collection('interviews').doc(interviewId).update({
            insights: {
                score: 0,
                summary: "The interview was ended before any responses were provided.",
                strengths: [],
                improvements: ["Participate in the interview to receive feedback."],
                scores: {
                    "Problem Framing": 0,
                    "MECE Thinking": 0,
                    "Structure Thinking": 0,
                    "Prioritization": 0,
                    "Root Cause Identification": 0,
                    "Solution Quality": 0,
                    "Communication": 0
                },
                actual_root_cause: "N/A - No attempt made.",
                rubric_breakdown: []
            },
            insightsGeneratedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return;
    }

    // Select Rubric
    const roundMapping = {
        'product-sense': 'PRODUCT_IMPROVEMENT',
        'technical': 'PRODUCT_DESIGN',
        'rca': 'RCA',
        'metrics': 'METRICS',
        'guesstimates': 'GUESSTIMATES',
        'strategy': 'PRODUCT_STRATEGY'
    };
    const backendRound = roundMapping[interviewData.roundType] || 'RCA';
    const backendDifficulty = (interviewData.difficulty || 'MEDIUM').toUpperCase();

    let rubricContent = '';
    try {
        if (openAILogic.rubrics[backendRound] && openAILogic.rubrics[backendRound][backendDifficulty]) {
            rubricContent = openAILogic.rubrics[backendRound][backendDifficulty].content;
        } else {
            rubricContent = openAILogic.rubrics.RCA.MEDIUM.content;
        }
    } catch (e) {
        rubricContent = "Evaluate based on standard PM interview criteria.";
    }

    // Build evaluation prompt (same as worker.js)
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
    - For HARD difficulty RCA, the "actual_root_cause" MUST be systemic and multi-layered (e.g., "A failed server migration led to corrupted metadata which then triggered an edge-case bug in the iOS cache invalidation logic").
    - IF the session difficulty is HARD, ensure the "actual_root_cause" output reflects this complexity.`;

    // Build user prompt with round-specific requirements (truncated for brevity, but includes all the same logic)
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
    `;

    try {
        const completion = await userOpenAI.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            model: "gpt-4o",
            response_format: { type: "json_object" }
        });

        const result = JSON.parse(completion.choices[0].message.content);

        // Apply weighted scoring for PRODUCT_STRATEGY
        if (backendRound === 'PRODUCT_STRATEGY' && result.scores) {
            const weights = {
                "Strategic Framing": 0.15,
                "Systems Thinking": 0.15,
                "First-Principles Reasoning": 0.10,
                "Strategic Options": 0.10,
                "Strategic Choice & Prioritization": 0.20,
                "Long-Term Vision": 0.10,
                "Risks & Trade-offs": 0.10,
                "Metrics & Success Criteria": 0.05,
                "Communication & Leadership": 0.05
            };

            let weightedSum = 0;
            let totalWeightUsed = 0;

            for (const [dimension, weight] of Object.entries(weights)) {
                if (result.scores[dimension] !== undefined) {
                    weightedSum += (result.scores[dimension] * weight);
                    totalWeightUsed += weight;
                }
            }

            if (totalWeightUsed > 0) {
                const recalculatedScore = Math.round((weightedSum / totalWeightUsed) / 10 * 10) / 10;
                result.score = recalculatedScore;
            }
        }

        // Convert score from 0-10 scale to 0-100 scale
        if (result.score !== undefined) {
            result.score = Math.round(result.score * 10);
        }

        await db.collection('interviews').doc(interviewId).update({
            insights: result,
            insightsGeneratedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`✅ Insights generated successfully for ${interviewId}`);
    } catch (error) {
        console.error(`❌ Error generating insights for ${interviewId}:`, error);
    }
}

// Cloud Function: Trigger when interview is created with status 'active'
exports.onInterviewCreated = functions
    .runWith({ timeoutSeconds: 540, memory: '512MB' })
    .firestore
    .document('interviews/{interviewId}')
    .onCreate(async (snap, context) => {
        const interviewData = snap.data();
        const interviewId = context.params.interviewId;

        // Only process if status is 'active'
        if (interviewData.status === 'active') {
            const userId = interviewData.userId;
            const interviewRound = interviewData.roundType;
            const interviewDifficulty = interviewData.difficulty || 'MEDIUM';

            // Get rubric content for first question generation
            const roundMapping = {
                'product-sense': 'PRODUCT_IMPROVEMENT',
                'technical': 'PRODUCT_DESIGN',
                'rca': 'RCA',
                'metrics': 'METRICS',
                'guesstimates': 'GUESSTIMATES',
                'strategy': 'PRODUCT_STRATEGY'
            };
            const backendRound = roundMapping[interviewRound] || 'PRODUCT_IMPROVEMENT';
            const backendDifficulty = interviewDifficulty.toUpperCase();

            let rubricContent = '';
            try {
                if (openAILogic.rubrics[backendRound] && openAILogic.rubrics[backendRound][backendDifficulty]) {
                    rubricContent = openAILogic.rubrics[backendRound][backendDifficulty].content;
                }
            } catch (error) {
                console.error('Error loading rubric:', error);
            }

            await generateFirstQuestion(interviewId, userId, interviewRound, interviewDifficulty, backendRound, rubricContent);
        }
    });

// Cloud Function: Trigger when interview status changes
exports.onInterviewUpdated = functions
    .runWith({ timeoutSeconds: 540, memory: '512MB' })
    .firestore
    .document('interviews/{interviewId}')
    .onUpdate(async (change, context) => {
        const before = change.before.data();
        const after = change.after.data();
        const interviewId = context.params.interviewId;

        // Process if status changed to 'active' (from non-active state)
        if (before.status !== 'active' && after.status === 'active') {
            const userId = after.userId;
            const interviewRound = after.roundType;
            const interviewDifficulty = after.difficulty || 'MEDIUM';

            // Get rubric content for first question generation
            const roundMapping = {
                'product-sense': 'PRODUCT_IMPROVEMENT',
                'technical': 'PRODUCT_DESIGN',
                'rca': 'RCA',
                'metrics': 'METRICS',
                'guesstimates': 'GUESSTIMATES',
                'strategy': 'PRODUCT_STRATEGY'
            };
            const backendRound = roundMapping[interviewRound] || 'PRODUCT_IMPROVEMENT';
            const backendDifficulty = interviewDifficulty.toUpperCase();

            let rubricContent = '';
            try {
                if (openAILogic.rubrics[backendRound] && openAILogic.rubrics[backendRound][backendDifficulty]) {
                    rubricContent = openAILogic.rubrics[backendRound][backendDifficulty].content;
                }
            } catch (error) {
                console.error('Error loading rubric:', error);
            }

            await generateFirstQuestion(interviewId, userId, interviewRound, interviewDifficulty, backendRound, rubricContent);
        }

        // Process if status changed to 'completed' and insights not yet generated
        if (before.status !== 'completed' && after.status === 'completed' && !after.insights) {
            const userId = after.userId;
            await generateInsights(interviewId, userId);
        }
    });

// Cloud Function: Trigger when a new message is created
exports.onMessageCreated = functions
    .runWith({ timeoutSeconds: 540, memory: '512MB' })
    .firestore
    .document('interviews/{interviewId}/messages/{messageId}')
    .onCreate(async (snap, context) => {
        const messageData = snap.data();
        const interviewId = context.params.interviewId;

        // Only process user messages
        if (messageData.sender !== 'user') {
            return;
        }

        // Get interview data to check status
        const interviewDoc = await db.collection('interviews').doc(interviewId).get();
        if (!interviewDoc.exists) {
            return;
        }

        const interviewData = interviewDoc.data();
        if (interviewData.status !== 'active') {
            return; // Only process messages for active interviews
        }

        const userId = interviewData.userId;
        await processUserMessage(interviewId, userId, messageData.text);
    });

