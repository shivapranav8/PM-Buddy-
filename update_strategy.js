const fs = require('fs');

const data = JSON.parse(fs.readFileSync('Open AI Logic.json', 'utf8'));

// Replace PRODUCT_STRATEGY ALL with Easy, Medium, Hard
data.rubrics.PRODUCT_STRATEGY = {
    "EASY": {
        "title": "6. Product Strategy — Easy",
        "content": `# 6. Product Strategy — Easy

## Expected Approach
- Clarify the strategic question and business context
- Ask high-impact questions to uncover core value drivers
- Synthesize information — balance data with judgment
- Outline where to play and how to win decisions
- Reason through alternatives and explain your choice

## Interviewer Checks
- Strategic insight over rote framework application
- Abstraction ability — rising above specifics to broader perspective
- Alignment of recommendation to company and product goals
- Comfortable weighing trade-offs

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
`
    },
    "MEDIUM": {
        "title": "6. Product Strategy — Medium",
        "content": `# 6. Product Strategy — Medium

## Expected Approach
- Clarify the strategic question and business context
- Ask high-impact questions to uncover core value drivers
- Synthesize information — balance data with judgment
- Outline where to play and how to win decisions
- Reason through alternatives and explain your choice

## Interviewer Checks
- Strategic insight over rote framework application
- Abstraction ability — rising above specifics to broader perspective
- Alignment of recommendation to company and product goals
- Comfortable weighing trade-offs

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
`
    },
    "HARD": {
        "title": "6. Product Strategy — Hard",
        "content": `# 6. Product Strategy — Hard

## Expected Approach
- Clarify the strategic question and business context
- Ask high-impact questions to uncover core value drivers
- Synthesize information — balance data with judgment
- Outline where to play and how to win decisions
- Reason through alternatives and explain your choice

## Interviewer Checks
- Strategic insight over rote framework application
- Abstraction ability — rising above specifics to broader perspective
- Alignment of recommendation to company and product goals
- Comfortable weighing trade-offs

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
`
    }
};

// Update selection rules to use standard pattern instead of ALL
const strategyRuleIndex = data.selection_rules.rubric_lookup.findIndex(rule => rule.if.round === 'PRODUCT_STRATEGY');
if (strategyRuleIndex !== -1) {
    data.selection_rules.rubric_lookup[strategyRuleIndex] = {
        "if": {
            "round": "PRODUCT_STRATEGY",
            "difficulty": "*"
        },
        "then_use": "rubrics.PRODUCT_STRATEGY.{{DIFFICULTY}}"
    };
}

fs.writeFileSync('Open AI Logic.json', JSON.stringify(data, null, 4), 'utf8');
console.log('✅ Updated PRODUCT_STRATEGY with Easy, Medium, Hard levels');
