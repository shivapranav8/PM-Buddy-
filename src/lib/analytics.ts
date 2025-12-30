import posthog from 'posthog-js';

const POSTHOG_KEY = (import.meta as any).env.VITE_POSTHOG_KEY;
const POSTHOG_HOST = (import.meta as any).env.PROD ? '/ingest' : 'https://us.i.posthog.com';

export const initAnalytics = () => {
    if (POSTHOG_KEY) {
        posthog.init(POSTHOG_KEY, {
            api_host: POSTHOG_HOST,
            autocapture: true, // Automatically track clicks/views
            capture_pageview: true,
            persistence: 'localStorage',
        });
    } else {
        console.warn('PostHog Key not found. Analytics disabled.');
    }
};

export const identifyUser = (userId: string, traits?: Record<string, any>) => {
    if (POSTHOG_KEY) {
        posthog.identify(userId, traits);
    }
};

export const resetAnalytics = () => {
    if (POSTHOG_KEY) posthog.reset();
};

// HEART Framework Events
export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
    if (POSTHOG_KEY) {
        posthog.capture(eventName, properties);
    } else {
        console.log(`[Analytics] ${eventName}`, properties);
    }
};

export const AnalyticsEvents = {
    // ADOPTION
    SIGNUP_COMPLETED: 'signup_completed',
    FIRST_VOICE_INTERACTION: 'first_voice_interaction',

    // ENGAGEMENT
    MOCK_STARTED: 'mock_started',
    MOCK_COMPLETED: 'mock_completed', // NORTH STAR (if qualified)

    // HAPPINESS
    FEEDBACK_SUBMITTED: 'feedback_submitted', // CSAT

    // RETENTION
    FEEDBACK_SAVED: 'feedback_saved',
    TRANSCRIPT_PLAYED: 'transcript_played'
};

export default posthog;
