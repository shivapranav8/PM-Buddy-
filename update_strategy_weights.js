const fs = require('fs');

const data = JSON.parse(fs.readFileSync('Open AI Logic.json', 'utf8'));

const assessmentDimensions = `## Assessment Dimensions (Weighted Scoring)

### 1. Strategic Framing & Problem Definition — 15%
**Strong**: Restates problem in strategic terms, identifies the decision to be made (not solution), distinguishes symptoms vs root strategic issue
**Weak**: Jumps to tactics/features, treats strategy like bigger product-design problem, misses core trade-off

### 2. Market, Ecosystem & Systems Thinking — 15%
**Strong**: Identifies stakeholders (users, competitors, partners, regulators), talks about ecosystem dynamics, anticipates ripple effects
**Weak**: Product-in-a-vacuum thinking, linear cause–effect reasoning, ignores incentives or power dynamics

### 3. First-Principles Reasoning — 10%
**Strong**: Starts from fundamental user or market needs, challenges assumptions, avoids copying competitors blindly
**Weak**: Framework recitation, buzzwords without substance, "because everyone else is doing it"

### 4. Strategic Options Generation — 10%
**Strong**: Lays out 2–4 distinct strategic options, covers different levers (price, positioning, ecosystem, business model), explicitly compares options
**Weak**: One obvious answer, incremental tweaks only, "we should just do X"

### 5. Strategic Choice & Prioritization (MOST IMPORTANT) — 20%
**Strong**: Clearly states which option they'd pursue, explains why others are deprioritized, uses explicit criteria (moat, risk, timing, leverage)
**Weak**: "I'd experiment with all of these", no clear recommendation, avoids trade-offs

### 6. Long-Term Vision & Future Orientation — 10%
**Strong**: Talks about 3–5 or 5–10 year implications, connects strategy to future user behavior or technology shifts, differentiates short-term tactics from long-term bets
**Weak**: Present-only thinking, over-focus on current metrics, no vision narrative

### 7. Risk Awareness & Trade-offs — 10%
**Strong**: Calls out risks unprompted, explains why risks are acceptable or how they're mitigated, acknowledges uncertainty
**Weak**: Overconfidence, hand-wavy risk handling, ignores downsides

### 8. Metrics & Strategic Success Criteria — 5%
**Strong**: Uses north-star or directional metrics, differentiates leading vs lagging indicators, links metrics to strategic intent
**Weak**: Only DAU/revenue, feature-level metrics only, no time horizon

### 9. Strategic Communication & Leadership Signals — 5%
**Strong**: Clear narrative, thinks out loud, handles pushback calmly and logically, invites alignment
**Weak**: Rambling, defensive, framework-first insight-last

## Evaluator Mindset
"Would I trust this person to set direction for a business under uncertainty?"`;

// Update EASY
data.rubrics.PRODUCT_STRATEGY.EASY.content = `# 6. Product Strategy — Easy

${assessmentDimensions}

## Expected Approach
- Clarify the strategic question and business context
- Ask high-impact questions to uncover core value drivers
- Synthesize information — balance data with judgment
- Outline where to play and how to win decisions
- Reason through alternatives and explain your choice

Practice Questions:
- Should Instagram add a music streaming feature?
- Should Zomato enter the grocery delivery market?
- Should LinkedIn launch a freelance marketplace?
- Should WhatsApp introduce ads?
- Should Spotify add video podcasts?
- Should Uber launch a subscription service?
- Should Netflix create original video games?
- Should Amazon enter the healthcare market?
- Should Google Maps add social features?
- Should Airbnb launch a co-working space product?
- Should Flipkart start a fashion rental service?
- Should Paytm launch a credit card?
- Should Swiggy enter the cloud kitchen business?
- Should YouTube add live shopping features?
- Should Twitter launch a premium subscription?
- Should Slack add project management tools?
- Should Discord launch a creator monetization platform?
- Should Notion add AI writing assistance?
- Should Canva launch a video editing product?
- Should Reddit introduce a job board?
- Should TikTok add e-commerce features?
- Should Duolingo launch corporate training?
- Should Zoom add asynchronous video messaging?
- Should Microsoft Teams launch a consumer version?
- Should Apple Music add karaoke features?
- Should GitHub launch a no-code platform?
- Should Figma add 3D design tools?
- Should Shopify enter the payment processing market?
- Should Stripe launch a business banking product?
- Should Pinterest add AR try-on features?
`;

// Update MEDIUM
data.rubrics.PRODUCT_STRATEGY.MEDIUM.content = `# 6. Product Strategy — Medium

${assessmentDimensions}

## Expected Approach
- Clarify the strategic question and business context
- Ask high-impact questions to uncover core value drivers
- Synthesize information — balance data with judgment
- Outline where to play and how to win decisions
- Reason through alternatives and explain your choice

Practice Questions:
- How should Spotify compete with YouTube Music in India?
- Should Netflix prioritize original content or licensed content in emerging markets?
- How should Uber Eats differentiate from Zomato and Swiggy?
- Should Amazon India focus on tier-1 or tier-2/3 cities for expansion?
- How should LinkedIn grow in markets where Facebook dominates professional networking?
- Should Airbnb prioritize experiences over accommodations?
- How should WhatsApp Business monetize without alienating users?
- Should Google Pay focus on peer-to-peer payments or merchant payments?
- How should Flipkart compete with Amazon's logistics advantage?
- Should Paytm prioritize financial services or commerce?
- How should Swiggy balance quick commerce vs food delivery?
- Should YouTube Shorts prioritize creators or viewers?
- How should Twitter compete with Instagram for creator attention?
- Should Slack focus on SMBs or enterprise customers?
- How should Discord monetize beyond Nitro subscriptions?
- Should Notion prioritize individual users or teams?
- How should Canva compete with Adobe in the professional market?
- Should Reddit focus on community growth or monetization?
- How should TikTok balance content moderation with creator freedom?
- Should Duolingo prioritize gamification or learning effectiveness?
- How should Zoom compete with Microsoft Teams?
- Should Apple Music differentiate on exclusive content or features?
- How should GitHub compete with GitLab for enterprise customers?
- Should Figma prioritize design tools or collaboration features?
- How should Shopify balance merchant success with platform revenue?
- Should Stripe focus on payment processing or financial infrastructure?
- How should Pinterest monetize without degrading user experience?
- Should Ola focus on ride-hailing or electric vehicles?
- How should PhonePe compete with Google Pay's merchant network?
- Should Cred prioritize credit cards or broader financial products?
`;

// Update HARD
data.rubrics.PRODUCT_STRATEGY.HARD.content = `# 6. Product Strategy — Hard

${assessmentDimensions}

## Expected Approach
- Clarify the strategic question and business context
- Ask high-impact questions to uncover core value drivers
- Synthesize information — balance data with judgment
- Outline where to play and how to win decisions
- Reason through alternatives and explain your choice

Practice Questions:
- Meta is considering entering the professional networking space. Should they build, buy, or partner?
- Google is losing search market share to AI chatbots. What should their 5-year strategy be?
- Amazon's retail margins are shrinking. Should they prioritize AWS, advertising, or new verticals?
- Netflix faces saturation in developed markets. Should they pivot to gaming, live sports, or something else?
- Uber is profitable in ride-hailing but losing in food delivery. What should their portfolio strategy be?
- Apple's iPhone revenue is plateauing. Should they focus on services, wearables, or new hardware categories?
- Microsoft Teams is winning enterprise but losing mindshare to Slack. What's the right competitive strategy?
- Spotify is profitable but losing podcast creators to YouTube. Should they pivot their content strategy?
- Airbnb faces regulatory challenges globally. Should they diversify into hotels or double down on homes?
- Tesla faces increasing EV competition. Should they focus on autonomy, energy, or manufacturing scale?
- ByteDance faces TikTok bans globally. What should their geographic and product diversification strategy be?
- Stripe faces competition from embedded finance. Should they move up or down the value chain?
- Shopify merchants are moving to Amazon. Should Shopify build fulfillment or focus on software?
- LinkedIn's engagement is declining among younger professionals. Should they pivot to short-form content?
- Twitter's ad revenue is declining. Should they focus on subscriptions, creator economy, or something else?
- Zoom's growth has stalled post-pandemic. What adjacent markets should they enter?
- GitHub faces competition from AI coding assistants. Should they build, partner, or acquire?
- Figma was acquired by Adobe. Should Adobe integrate or keep separate?
- Notion faces competition from Microsoft Loop. What's their sustainable competitive advantage?
- Discord is growing but not monetizing well. Should they focus on gaming, communities, or enterprise?
- Reddit's IPO is approaching. Should they prioritize user growth or monetization?
- Duolingo faces competition from ChatGPT for language learning. How should they respond?
- Canva is expanding into video. Should they compete with Adobe Premiere or focus on templates?
- Pinterest's user growth is slowing. Should they pivot to social commerce or creator tools?
- Snapchat is losing users to Instagram and TikTok. What's their path to sustainable growth?
- Paytm's stock is down 70% from IPO. Should they focus on payments, lending, or commerce?
- Swiggy is losing market share to Zomato. Should they compete on price, selection, or delivery speed?
- Ola Electric is scaling production. Should they focus on scooters, bikes, or cars?
- PhonePe is profitable but facing UPI commoditization. What's their next growth driver?
- Cred has high engagement but low monetization. Should they become a neobank or stay focused on credit?
`;

fs.writeFileSync('Open AI Logic.json', JSON.stringify(data, null, 4), 'utf8');
console.log('✅ Updated PRODUCT_STRATEGY with weighted scoring breakdown');
