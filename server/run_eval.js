const admin = require('firebase-admin');
const fs = require('fs');
const OpenAI = require('openai');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

// Evaluation Metrics
const METRICS = {
    IMMERSION_BREAK: {
        type: 'CODE',
        check: (text) => {
            const forbidden = [
                'root cause analysis format',
                'product improvement format',
                'system prompt',
                'ai language assistant',
                'as an ai',
                'format:',
                'rubric'
            ];
            const lower = text.toLowerCase();
            return !forbidden.some(f => lower.includes(f));
        }
    },
    PASSIVENESS: {
        type: 'LLM',
        prompt: `You are a strict Interview Quality Judge.
        Goal: The Interviewer (AI) should NOT solve the problem for the candidate. It should ask facilitating questions.
        If the Interviewer provides a numbered list of solutions, a framework, or "step-by-step approach" WITHOUT being asked for help, it FAILS.
        It should only provide data or answer specific clarifying questions.
        
        Is this response too helpful/passive-aggressive or solving the case?
        Reply JSON: { "pass": boolean, "reason": "string" }`
    },
    RELEVANCE: {
        type: 'LLM',
        prompt: `You are a Conversation Coherence Judge.
        Check if the Interviewer's response is directly addressing the User's input.
        Ignore minor grammar issues in User input (ASR errors).
        Does the AI understand the intent?
        Reply JSON: { "pass": boolean, "reason": "string" }`
    }
};

async function runEval() {
    console.log('Starting Evaluation...');
    const traces = JSON.parse(fs.readFileSync('traces.json', 'utf8'));
    let totalMessages = 0;
    let passedImmersion = 0;
    let passedLLM = 0;
    let totalLLMChecks = 0;

    const report = [];
    const failures = [];

    // Cache OpenAI instances by userId
    const openaiCache = {};

    for (const trace of traces) {
        console.log(`Evaluating Interview: ${trace.interviewId}`);

        // 1. Get User ID & Key
        let openai = null;
        try {
            const interviewDoc = await db.collection('interviews').doc(trace.interviewId).get();
            if (!interviewDoc.exists) continue;
            const userId = interviewDoc.data().userId;

            if (!openaiCache[userId]) {
                const settings = await db.collection('users').doc(userId).collection('settings').doc('openai').get();
                if (settings.exists && settings.data().apiKey) {
                    openaiCache[userId] = new OpenAI({ apiKey: settings.data().apiKey });
                }
            }
            openai = openaiCache[userId];
        } catch (e) {
            console.error('Error fetching key:', e);
        }

        if (!openai) {
            console.log('Skipping LLM checks (No API Key)');
        }

        // 2. Iterate Messages
        for (let i = 0; i < trace.messages.length; i++) {
            const msg = trace.messages[i];
            if (msg.sender !== 'ai') continue;

            const text = msg.text;
            totalMessages++;

            // CHECK 1: CODE BASED (Immersion)
            if (METRICS.IMMERSION_BREAK.check(text)) {
                passedImmersion++;
            } else {
                failures.push({
                    type: 'IMMERSION_BREAK',
                    interviewId: trace.interviewId,
                    text: text
                });
            }

            // CHECK 2: LLM BASED
            if (openai && i > 0) {
                const history = trace.messages.slice(Math.max(0, i - 3), i).map(m => `${m.sender}: ${m.text}`).join('\n');
                const promptContext = `HISTORY:\n${history}\n\nTARGET RESPONSE (AI):\n${text}`;

                // Check Passiveness
                try {
                    const completion = await openai.chat.completions.create({
                        messages: [
                            { role: "system", content: METRICS.PASSIVENESS.prompt },
                            { role: "user", content: promptContext }
                        ],
                        model: "gpt-4o",
                        response_format: { type: "json_object" }
                    });
                    const result = JSON.parse(completion.choices[0].message.content);
                    totalLLMChecks++;
                    if (result.pass) {
                        passedLLM++;
                    } else {
                        failures.push({
                            type: 'PASSIVENESS_FAIL',
                            interviewId: trace.interviewId,
                            text: text,
                            reason: result.reason
                        });
                        process.stdout.write('F'); // Fail indicator
                        continue;
                    }
                } catch (e) {
                    console.error('LLM Eval Error:', e);
                }
                process.stdout.write('.'); // Progress indicator
            }
        }
        console.log(' Done.');
    }

    // Generate Report
    const score = ((passedImmersion + passedLLM) / (totalMessages + totalLLMChecks) * 100).toFixed(1);

    console.log('\n\n=== EVALUATION REPORT ===');
    console.log(`Total Messages Evaluated: ${totalMessages}`);
    console.log(`Immersion Pass Rate: ${((passedImmersion / totalMessages) * 100).toFixed(1)}%`);
    console.log(`LLM Judge pass Rate: ${totalLLMChecks > 0 ? ((passedLLM / totalLLMChecks) * 100).toFixed(1) : 'N/A'}%`);
    console.log('FAILURES:');
    failures.forEach(f => {
        console.log(`[${f.type}] in ${f.interviewId}: "${f.text.substring(0, 50)}..." -> ${f.reason || 'Keyword Detected'}`);
    });

    // Write Markdown
    const md = `# AI Evaluation Report
Date: ${new Date().toISOString()}

## Summary
- **Overall Score**: ${score}%
- **Messages Scanned**: ${totalMessages}
- **LLM Checks**: ${totalLLMChecks}

## Failure Analysis
${failures.map(f => `- **${f.type}**: ${f.reason || 'Constraint Violation'}\n  - *"${f.text.substring(0, 100)}..."*`).join('\n')}
    `;
    fs.writeFileSync('eval_report.md', md);
}

runEval();
