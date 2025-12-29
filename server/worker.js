const admin = require('firebase-admin');
const OpenAI = require('openai');
const cheerio = require('cheerio');
const axios = require('axios');
const serviceAccount = require('./serviceAccountKey.json');
const openAILogic = require('../Open AI Logic.json');
const { decryptApiKey } = require('./crypto-utils');
require('dotenv').config();

// Initialize Firebase Admin
try {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin initialized');
} catch (error) {
    console.error('Error initializing Firebase Admin:', error);
}

const db = admin.firestore();

// Initialize OpenAI (optional - only used for seeding, not for user requests)
// User requests use their own API keys fetched from Firebase
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
}) : null;

async function seedQuestions() {
    console.log('Seeding questions...');
    const url = 'https://www.theproductfolks.com/product-management-case-studies';

    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        const questions = [];

        // NOTE: This selector is an approximation. We might need to adjust based on actual DOM.
        // Looking for headings or list items that look like case studies.
        // For now, let's assume a generic structure or seed some default ones if scraping fails/is complex.

        // Strategy: Look for cards or list items. 
        // Since I can't see the live site DOM, I will add some hardcoded seed data 
        // AND attempt a generic scrape.

        const hardcodedQuestions = [
            {
                category: 'RCA',
                title: 'Uber rides dropped by 10%',
                description: 'You are a PM at Uber. You noticed that rides have dropped by 10% in the last week. How would you investigate?'
            },
            {
                category: 'Product Design',
                title: 'Design an ATM for kids',
                description: 'How would you design an ATM specifically for children aged 8-12?'
            },
            {
                category: 'Metrics',
                title: 'Success metrics for Instagram Stories',
                description: 'What metrics would you track to measure the success of Instagram Stories?'
            },
            {
                category: 'Guesstimates',
                title: 'How many tennis balls fit in a Boeing 747?',
                description: 'Estimate the number of tennis balls that can fit inside a Boeing 747.'
            },
            {
                category: 'Product Improvement',
                title: 'Improve Spotify',
                description: 'Pick a feature in Spotify and improve it.'
            }
        ];

        const batch = db.batch();

        for (const q of hardcodedQuestions) {
            const docRef = db.collection('questions').doc();
            batch.set(docRef, q);
        }

        await batch.commit();
        console.log(`Seeded ${hardcodedQuestions.length} questions.`);

    } catch (error) {
        console.error('Error seeding questions:', error);
    }
}

async function handleNewMessage(snap, context) {
    // This function is intended to be used if we were deploying Cloud Functions.
    // Since we are running a local worker, we need to set up a listener manually.
}

// Map to track active listeners
const activeInterviews = new Map(); // interviewId -> unsubscribe function

function startWorker() {
    console.log('Starting worker...');

    // Listen for changes in interviews
    // We want to listen to ALL interviews' messages subcollections.
    // Firestore client SDKs don't support collection group queries for listeners easily in the same way as cloud functions triggers.
    // A better approach for a "local worker" is to listen to the 'interviews' collection for 'active' interviews,
    // and then attach listeners to those specific interviews.

    // Simplified approach:
    // 1. Listen to 'interviews' where status == 'active'
    // 2. For each active interview, listen to its 'messages' collection.

    db.collection('interviews').where('status', '==', 'active')
        .onSnapshot(snapshot => {
            snapshot.docChanges().forEach(async change => {
                const interviewId = change.doc.id;
                const interviewData = change.doc.data();
                const userId = interviewData.userId;

                if (change.type === 'added') {
                    if (interviewData.status === 'active') {
                        // Check if we already have a listener for this interview
                        if (activeInterviews.has(interviewId)) {
                            console.log(`Listener already exists for interview ${interviewId}, skipping.`);
                            return;
                        }

                        console.log(`New active interview: ${interviewId} for user: ${userId}`);
                        if (userId) {
                            setupInterviewListener(interviewId, userId);
                        } else {
                            console.error(`Interview ${interviewId} missing userId`);
                        }
                    }
                }

                if (change.type === 'modified') {
                    const data = change.doc.data();

                    // Handle status change to 'completed' for evaluation
                    if (data.status === 'completed' && !data.insights) {
                        console.log(`Interview ${interviewId} completed. Generating insights...`);
                        await generateInsights(interviewId, userId);
                    }

                    // Check if status changed FROM active (to cleanup listener)
                    if (data.status !== 'active') {
                        if (activeInterviews.has(interviewId)) {
                            activeInterviews.get(interviewId)(); // Unsubscribe
                            activeInterviews.delete(interviewId);
                        }
                    }
                }

                if (change.type === 'removed') {
                    if (activeInterviews.has(interviewId)) {
                        activeInterviews.get(interviewId)();
                        activeInterviews.delete(interviewId);
                    }
                }
            });
        });

    // SEPARATE listener for completed interviews to trigger evaluation
    db.collection('interviews').where('status', '==', 'completed')
        .onSnapshot(snapshot => {
            snapshot.docChanges().forEach(async change => {
                const interviewId = change.doc.id;
                const interviewData = change.doc.data();
                const userId = interviewData.userId;

                // Only process newly completed interviews (just added to this query)
                if (change.type === 'added' && !interviewData.insights) {
                    console.log(`Interview ${interviewId} just completed. Generating insights...`);
                    await generateInsights(interviewId, userId);
                }
            });
        });
}

async function setupInterviewListener(interviewId, userId) {
    // Fetch User's OpenAI Key (with decryption support)
    let userOpenAIKey = null;
    try {
        const userSettingsDoc = await db.collection('users').doc(userId).collection('settings').doc('openai').get();
        if (userSettingsDoc.exists) {
            const keyData = userSettingsDoc.data();
            userOpenAIKey = decryptApiKey(keyData);
            if (userOpenAIKey) {
                console.log(`Loaded and decrypted OpenAI Key for user ${userId}`);
            } else {
                console.warn(`Failed to decrypt OpenAI Key for user ${userId}. Bot will not reply.`);
                return;
            }
        } else {
            console.warn(`No OpenAI Key found for user ${userId}. Bot will not reply.`);
            return;
        }
    } catch (error) {
        console.error(`Error fetching OpenAI Key for user ${userId}:`, error);
        return;
    }

    const userOpenAI = new OpenAI({
        apiKey: userOpenAIKey,
    });

    // Fetch interview details to get round and difficulty
    let interviewRound = null;
    let interviewDifficulty = null;
    try {
        const interviewDoc = await db.collection('interviews').doc(interviewId).get();
        if (interviewDoc.exists) {
            const interviewData = interviewDoc.data();
            interviewRound = interviewData.roundType; // e.g., 'product-sense', 'technical'
            interviewDifficulty = interviewData.difficulty || 'MEDIUM'; // Default to MEDIUM if not specified
            console.log(`Interview ${interviewId}: Round=${interviewRound}, Difficulty=${interviewDifficulty}`);
        }
    } catch (error) {
        console.error(`Error fetching interview details for ${interviewId}:`, error);
    }

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
    const backendDifficulty = interviewDifficulty.toUpperCase();

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

    // Construct the unified system prompt with rubric context
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
    - EXAMPLE: "How would you improve Instagram’s image upload experience to reduce user frustration?"
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

    // Check if we need to send an initial greeting/question
    const messagesRef = db.collection('interviews').doc(interviewId).collection('messages');
    const messagesSnapshot = await messagesRef.get();

    if (messagesSnapshot.empty) {
        console.log(`Interview ${interviewId} has no messages. processing first question for ${backendRound}...`);

        try {
            // 1. Parse Practice Questions from Rubric
            let practiceQuestions = [];
            const practiceMatch = rubricContent.match(/Practice Questions:\s*((?:- .+\n?)+)/i);
            if (practiceMatch && practiceMatch[1]) {
                const list = practiceMatch[1];
                // Split by newline and dash, then clean up
                practiceQuestions = list.split('\n')
                    .map(line => line.replace(/^-\s*/, '').trim())
                    .filter(line => line.length > 10); // Filter empty/short lines
            }
            console.log(`Found ${practiceQuestions.length} practice questions in rubric.`);

            // 2. Fetch User History
            // Query for past interviews in this category/difficulty
            const historySnapshot = await db.collection('interviews')
                .where('userId', '==', userId)
                .where('roundType', '==', interviewRound) // Use frontend ID to match query consistency
                .where('difficulty', '==', interviewDifficulty)
                .get();

            // Build a map of questions with timestamps for LRU tracking
            const questionHistory = new Map(); // question -> { timestamp, interviewId }
            historySnapshot.docs.forEach(doc => {
                const d = doc.data();
                // Exclude current interview and only track questions that have been asked
                if (d.questionText && doc.id !== interviewId) {
                    const timestamp = d.createdAt || d.timestamp;
                    // Keep the most recent usage of each question
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
                // STRATEGY A: PICK FROM NEVER-USED QUESTIONS
                console.log(`✓ Picking from ${availableQuestions.length} never-used questions.`);
                const randomIndex = Math.floor(Math.random() * availableQuestions.length);
                selectedQuestion = availableQuestions[randomIndex];
                console.log(`  → Selected: "${selectedQuestion}"`);

            } else if (questionHistory.size > 0) {
                // STRATEGY B: ALL QUESTIONS USED - PICK LEAST RECENTLY USED
                console.log(`⟳ All ${practiceQuestions.length} questions have been used. Selecting least recently used...`);

                // Sort questions by timestamp (oldest first)
                const sortedQuestions = Array.from(questionHistory.entries())
                    .filter(([question]) => practiceQuestions.includes(question)) // Only consider questions still in rubric
                    .sort((a, b) => {
                        const timeA = a[1].timestamp?.toMillis?.() || 0;
                        const timeB = b[1].timestamp?.toMillis?.() || 0;
                        return timeA - timeB; // Oldest first
                    });

                if (sortedQuestions.length > 0) {
                    // Pick from the oldest 3 questions to add some variety
                    const oldestCount = Math.min(3, sortedQuestions.length);
                    const oldestQuestions = sortedQuestions.slice(0, oldestCount);
                    const randomPick = oldestQuestions[Math.floor(Math.random() * oldestQuestions.length)];
                    selectedQuestion = randomPick[0];

                    const lastUsed = randomPick[1].timestamp?.toDate?.();
                    console.log(`  → Selected LRU question: "${selectedQuestion}"`);
                    console.log(`  → Last used: ${lastUsed || 'unknown'} (${oldestCount} oldest candidates)`);
                } else {
                    // Fallback: pick first question from rubric
                    selectedQuestion = practiceQuestions[0];
                    console.log(`  → Fallback to first question: "${selectedQuestion}"`);
                }

            } else {
                // STRATEGY C: GENERATE NEW (No practice questions or all exhausted)
                console.log(`⚠ No practice questions available or all exhausted. Switching to AI Generation mode.`);
                isFallback = true;
            }

            // 4. Execution
            if (!isFallback && selectedQuestion) {
                // DIRECT WRITE - No AI call needed for initial question!
                console.log(`Using bank question: ${selectedQuestion}`);
                await messagesRef.add({
                    sender: 'ai',
                    text: selectedQuestion,
                    timestamp: admin.firestore.FieldValue.serverTimestamp()
                });

                // Save specific question text to parent for history tracking
                await db.collection('interviews').doc(interviewId).update({
                    questionText: selectedQuestion
                });

            } else {
                // AI GENERATION FALLBACK
                // We need a relaxed system prompt that ALLOWS generation
                let generationSystemPrompt = finalSystemPrompt;

                if (backendRound === 'PRODUCT_IMPROVEMENT') {
                    // Remove prohibition
                    generationSystemPrompt = generationSystemPrompt.replace('STOP. DO NOT GENERATE A NEW QUESTION.', 'GENERATE A NEW QUESTION.');
                    generationSystemPrompt = generationSystemPrompt.replace('NEVER invent a question.', '');
                    generationSystemPrompt = generationSystemPrompt.replace('YOU MUST COPY-PASTE ONE QUESTION FROM THE "Practice Questions" LIST IN THE RUBRIC.', '');

                    // Add permission to be creative but match style
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
                    temperature: 0.7, // Higher temp for creativity
                });

                const reply = completion.choices[0].message.content;

                await messagesRef.add({
                    sender: 'ai',
                    text: reply,
                    timestamp: admin.firestore.FieldValue.serverTimestamp()
                });

                // Save generated question for history too
                await db.collection('interviews').doc(interviewId).update({
                    questionText: reply
                });

                console.log(`Generated fallback question for ${interviewId}: ${reply} `);
            }

        } catch (error) {
            console.error('Error generating first question:', error);
            // Fallback to strict "First Question" from list if error (safe default)
            // ... existing error handler or retry logic
        }
    }

    // Listen for the LATEST message from the USER
    const unsubscribe = messagesRef
        .orderBy('timestamp', 'asc')
        .onSnapshot(async snapshot => {
            if (snapshot.empty) return;

            const lastDoc = snapshot.docs[snapshot.docs.length - 1];
            const lastMessage = lastDoc.data();

            if (lastMessage.sender === 'user') {
                console.log(`Processing message for ${interviewId}: ${lastMessage.text} `);

                // Construct conversation history - INCLUDE EVERYTHING
                const history = snapshot.docs.map(doc => ({
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

                    console.log(`Replied to ${interviewId} `);

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
        });

    activeInterviews.set(interviewId, unsubscribe);
}

async function generateInsights(interviewId, userId) {
    console.log(`========================================`);
    console.log(`GENERATING INSIGHTS FOR: ${interviewId} `);
    console.log(`User ID: ${userId} `);
    console.log(`========================================`);

    // 1. Get OpenAI Key (with decryption support)
    let userOpenAIKey = null;
    try {
        const userSettingsDoc = await db.collection('users').doc(userId).collection('settings').doc('openai').get();
        if (userSettingsDoc.exists) {
            const keyData = userSettingsDoc.data();
            userOpenAIKey = decryptApiKey(keyData);
            if (!userOpenAIKey) {
                console.error(`Failed to decrypt OpenAI Key for user ${userId}. Cannot evaluate.`);
                return;
            }
        } else {
            console.error(`No OpenAI Key found for user ${userId}. Cannot evaluate.`);
            return;
        }
    } catch (error) {
        console.error(`Error fetching OpenAI Key for user ${userId}: `, error);
        return;
    }

    const userOpenAI = new OpenAI({ apiKey: userOpenAIKey });

    // 2. Get Interview Details & Transcript
    let interviewData = null;
    let transcript = [];
    try {
        const interviewDoc = await db.collection('interviews').doc(interviewId).get();
        if (!interviewDoc.exists) {
            console.error(`Interview ${interviewId} not found.`);
            return;
        }
        interviewData = interviewDoc.data();

        const messagesSnap = await db.collection('interviews').doc(interviewId).collection('messages').orderBy('timestamp', 'asc').get();
        transcript = messagesSnap.docs.map(doc => {
            const d = doc.data();
            return `${d.sender.toUpperCase()}: ${d.text} `;
        }).join('\n\n');

    } catch (error) {
        console.error(`Error fetching interview data for ${interviewId}: `, error);
        return;
    }

    if (!transcript || transcript.trim() === "") {
        console.warn(`No transcript found for ${interviewId}.`);
        return;
    }

    // 2b. Check if user actually participated (exclude automated trigger message)
    const userMessagesSnapshot = await db.collection('interviews').doc(interviewId).collection('messages').where('sender', '==', 'user').get();
    const actualUserMessages = userMessagesSnapshot.docs.filter(doc => {
        const text = doc.data().text || "";
        return !text.includes("I am ready for the interview");
    });

    if (actualUserMessages.length === 0) {
        console.log(`No actual user participation for ${interviewId}.Marking score as 0.`);
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

    // 3. Select Rubric
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

    // Fallback logic for rubric
    let rubricContent = '';
    try {
        if (openAILogic.rubrics[backendRound] && openAILogic.rubrics[backendRound][backendDifficulty]) {
            rubricContent = openAILogic.rubrics[backendRound][backendDifficulty].content;
        } else {
            // Fallback for RCA
            rubricContent = openAILogic.rubrics.RCA.MEDIUM.content;
        }
    } catch (e) {
        rubricContent = "Evaluate based on standard PM interview criteria.";
    }

    // 4. Prompt OpenAI for Evaluation
    const systemPrompt = `You are a HARSH senior Product Management Interview Bar Raiser at Google / Meta. 
You have extremely high standards and rarely give scores above 70 %.
You are evaluating a CANDIDATE's performance in a mock interview.

CRITICAL RULES:
    1. ONLY evaluate the CANDIDATE's responses (marked as "user" in transcript)
    2. DO NOT evaluate the interviewer's questions or follow-ups
    3. Be HARSH - most candidates should score 40 - 60 %.Only exceptional answers get 70 +%.
4. Penalize heavily for: vague answers, missing structure, no data requests, jumping to solutions
    5. A perfect answer(90 - 100 %) is extremely rare

RCA ROUND SPECIFICS:
    - For HARD difficulty RCA, the "actual_root_cause" MUST be systemic and multi - layered(e.g., "A failed server migration led to corrupted metadata which then triggered an edge-case bug in the iOS cache invalidation logic").
- IF the session difficulty is HARD, ensure the "actual_root_cause" output reflects this complexity.`;

    // We expect JSON output.
    const userPrompt = `
    Context:
    - Round: ${backendRound}
    - Difficulty: ${backendDifficulty}

    Rubric / Assessment Pointers:
${rubricContent}

    Transcript(evaluate ONLY the "user" messages, NOT the "assistant" messages):
${transcript}

    ---
        TASK:
Evaluate ONLY THE CANDIDATE's responses (user messages) based on the Rubric.
Do NOT give credit for anything the interviewer(assistant) said or hinted at.
Provide the output in valid JSON format with the following structure:
    {
        "score": <number 0 - 10 >,
            "summary": "<2-3 sentences summary>",
                "strengths": ["<point 1>", "<point 2>", ...],
                    "improvements": ["<point 1>", "<point 2>", ...],
                        "scores": {
            "<Rubric Category 1>": <percentage 0 - 100 >,
                "<Rubric Category 2>": <percentage 0 - 100 >,
    ...
        },
        "actual_root_cause": "<1-2 sentences outlining the TRUE root cause that should have been discovered>",
            "rubric_breakdown": [
                { "category": "<Category Name from Rubric>", "score": < 0 - 5 >, "feedback": "<Specific feedback>" },
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
` : ''
        }

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

Your "rubric_breakdown" array MUST include these exact categories with individual scores (0-5) based on the specific metrics provided:
1. { "category": "Product Insight", "score": <0-5>, "feedback": "..." }
2. { "category": "User Empathy", "score": <0-5>, "feedback": "..." }
3. { "category": "Problem Framing", "score": <0-5>, "feedback": "..." }
4. { "category": "Solution Creativity", "score": <0-5>, "feedback": "..." }
5. { "category": "Design Judgment", "score": <0-5>, "feedback": "..." }
` : ''
        }

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
` : ''
        }
    `;

    try {
        console.log(`Calling OpenAI for interview ${interviewId}...`);
        console.log(`Prompt length: ${userPrompt.length} characters`);

        const completion = await userOpenAI.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            model: "gpt-4o",
            response_format: { type: "json_object" }
        });

        console.log(`OpenAI response received for ${interviewId}`);
        const result = JSON.parse(completion.choices[0].message.content);

        // 4b. ENFORCE WEIGHTED SCORING FOR PRODUCT STRATEGY
        if (backendRound === 'PRODUCT_STRATEGY' && result.scores) {
            console.log("Applying Weighted Scoring Logic for Product Strategy...");
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
                // If the weighted sum gives us a percentage (0-100), convert it back to 0-10 scale
                const recalculatedScore = Math.round((weightedSum / totalWeightUsed) / 10 * 10) / 10;
                console.log(`Recalculated Score: ${recalculatedScore} (from ${result.score})`);
                result.score = recalculatedScore;
            }
        }

        console.log(`Parsed result: `, JSON.stringify(result, null, 2));

        // Convert score from 0-10 scale to 0-100 scale for display
        if (result.score !== undefined) {
            result.score = Math.round(result.score * 10);
            console.log(`Converted score to 0-100 scale: ${result.score}`);
        }

        // 5. Update Firestore
        console.log(`Updating Firestore for ${interviewId}...`);
        await db.collection('interviews').doc(interviewId).update({
            insights: result,
            insightsGeneratedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`✅ Insights generated successfully for ${interviewId}`);

    } catch (error) {
        console.error(`❌ Error generating insights for ${interviewId}: `, error);
        console.error(`Error details: `, error.message);
        console.error(`Error stack: `, error.stack);
    }
}

// Check for seed flag
if (process.argv.includes('--seed')) {
    seedQuestions();
} else {
    startWorker();
}
