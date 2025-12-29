# Firebase Cloud Functions for PM Mock Studio

This directory contains Firebase Cloud Functions that handle:
- Generating the first interview question when an interview becomes active
- Processing user messages and generating AI interviewer responses
- Generating insights when an interview is completed

## Setup

1. Install Firebase CLI (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Install dependencies:
   ```bash
   cd functions
   npm install
   ```

4. Deploy functions:
   ```bash
   # From the project root
   firebase deploy --only functions
   ```

## Local Development

To test functions locally:

```bash
firebase emulators:start --only functions
```

## Functions

### `onInterviewActivated`
Triggers when an interview document is updated and status changes to 'active' or 'completed':
- When status becomes 'active': Generates the first interview question
- When status becomes 'completed': Generates insights/evaluation

### `onMessageCreated`
Triggers when a new message is created in an interview's messages subcollection:
- Processes user messages and generates AI interviewer responses

## Migration from Local Worker

The local worker (`server/worker.js`) has been converted to Cloud Functions. The local worker is no longer needed once these functions are deployed.

To migrate:
1. Deploy the Cloud Functions (see Setup above)
2. Stop any running local workers
3. The application will now use Cloud Functions automatically


