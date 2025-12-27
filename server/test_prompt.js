const OpenAI = require('openai');
const openAILogic = require('../Open AI Logic.json');
require('dotenv').config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Mock user config
const config = {
    backendRound: "PRODUCT_IMPROVEMENT",
    backendDifficulty: "MEDIUM" // Test with MEDIUM first
};

async function testGeneration() {
    console.log(`Testing Question Generation for ${config.backendRound} (${config.backendDifficulty})...`);

    const rubricContent = openAILogic.rubrics[config.backendRound][config.backendDifficulty].content;

    const systemPrompt = `
    You are an expert Google/Meta Product Manager interviewer.
    Your goal is to assess the candidate's Product Sense / Product Improvement skills.
    
    RUBRIC:
    ${rubricContent}
    
    CRITICAL GENERATION RULES:
    1. Your first message MUST be exactly one question.
    2. IMPORTANT: The question MUST MATCH THE ROUND TYPE style:
       - For RCA: "X metric dropped by Y%"
       - For PRODUCT_IMPROVEMENT: "How would you improve X?" or "Redesign Y for users." or "How would you increase Z for Product X?"
       
    3. Generate a NEW, UNIQUE question for companies across various sectors.
    
    [FORBIDDEN_FORMATS]
    If ROUND is PRODUCT_IMPROVEMENT:
    - NEVER ask about metric drops, revenue decreases, churn increases, or any "why did X happen" questions.
    - NEVER use phrase "dropped by", "decreased by", or "fallen by".
    - NEVER state a business symptom alone (e.g., "Growth has plateaued") without an action prompt.
    - NEVER just state a problem (e.g., "Instagram uploads are failing"). THIS IS NOT A QUESTION.
    - NEVER invent new problem statements. SELECT ONLY FROM THE "Practice Questions" in the RUBRIC.
    - These are RCA questions, and you are NOT in an RCA round.
    
    [REQUIRED_FORMAT]
    If ROUND is PRODUCT_IMPROVEMENT:
    - ALWAYS select from "Practice Questions" in the rubric.
    - ALWAYS follow business context with a product-focused action prompt.
    - ALWAYS ask "How would you improve X?" or "Redesign X for Y." or "How would you increase Z for Product X?"
    - Example Correct: "Instagram's upload experience is frustrating. How would you improve it?"
    - Example Incorrect: "Instagram's upload experience is frustrating."
    
    [DIFFICULTY_LOGIC]
    If ROUND is PRODUCT_IMPROVEMENT:
    - EASY: Focus on ONE user group, ONE obvious pain point. Allow answers from personal experience. NO data/trade-offs.
    - MEDIUM: Imply need for diagnosis. specific context/constraint (e.g., low internet). Require segmentation.
    
    [VALIDATION CHECKLIST]
    Before asking, validate:
    1. Is this clearly about changing the product experience?
    2. Is the user or context explicit?
    3. Does difficulty match required depth?
    4. Can this be answered without switching rounds?
    
    Focus on design and evolution.
    `;

    console.log("\n--- GENERATED SYSTEM PROMPT ---");
    console.log(systemPrompt);
    console.log("\n--- END SYSTEM PROMPT ---\n");
    console.log("Validation Checks:");
    console.log("1. Contains [FORBIDDEN_FORMATS]? ", systemPrompt.includes("[FORBIDDEN_FORMATS]"));
    console.log("2. Contains [REQUIRED_FORMAT]? ", systemPrompt.includes("[REQUIRED_FORMAT]"));
    console.log("3. Contains Practice Questions? ", rubricContent.includes("How would you improve Instagram"));
}

testGeneration();
