const fs = require('fs');

const data = JSON.parse(fs.readFileSync('Open AI Logic.json', 'utf8'));

// Add PRODUCT_IMPROVEMENT HARD section
data.rubrics.PRODUCT_IMPROVEMENT.HARD = {
    "title": "2. Product Improvement — Hard",
    "content": `# Product Improvement — Hard

## Assessment Dimensions
- **Product Insight**: (0–5) Understanding the Product Landscape & Motivation.
- **User Empathy**: (0–5) Audience identification, segmentation, user needs.
- **Problem Framing**: (0–5) Identifying & prioritizing the right problem.
- **Solution Creativity**: (0–5) Creative, impactful, product-led solutions.
- **Design Judgment**: (0–5) Intentional design, MVP thinking, execution realism.

## Phase Characteristics
- Tests: Strategic product thinking, Ecosystem awareness, Long-term impact.
- Context: Complex products with multiple stakeholders and trade-offs.
- Goal: Candidate must balance user needs, business goals, and technical constraints while considering competitive dynamics.

Practice Questions:
- How would you improve Google Search?
- How would you improve Facebook?
- How would you improve Amazon?
- How would you improve Microsoft Office?
- How would you improve Apple's iOS?
- How would you improve Android?
- How would you improve Gmail?
- How would you improve Google Chrome?
- How would you improve Windows?
- How would you improve Salesforce?
- How would you improve Adobe Creative Cloud?
- How would you improve AWS?
- How would you improve Tesla's autopilot?
- How would you improve Uber's platform?
- How would you improve Airbnb's marketplace?
- How would you improve LinkedIn's professional network?
- How would you improve Twitter's content moderation?
- How would you improve YouTube's recommendation system?
- How would you improve Netflix's content discovery?
- How would you improve Spotify's artist platform?
- How would you improve Instagram's creator tools?
- How would you improve TikTok's algorithm?
- How would you improve WhatsApp for business users?
- How would you improve Zoom for enterprise customers?
- How would you improve Slack's collaboration features?
- How would you improve GitHub's developer experience?
- How would you improve Shopify's merchant platform?
- How would you improve Stripe's payment infrastructure?
- How would you improve Figma's collaboration features?
- How would you improve Notion's knowledge management?
`
};

fs.writeFileSync('Open AI Logic.json', JSON.stringify(data, null, 4), 'utf8');
console.log('✅ Added PRODUCT_IMPROVEMENT HARD section');
