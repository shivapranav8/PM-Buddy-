# Firebase Secret Manager Setup Guide

## Overview

The Cloud Functions now use Firebase Secret Manager to securely store the OpenAI API key instead of storing it in Firestore. This provides better security and follows best practices.

## Important Change

**Before:** Each user provided their own OpenAI API key (stored in Firestore)  
**After:** One shared OpenAI API key (stored in Secret Manager) - the app pays for OpenAI usage

## Setup Steps

### 1. Set the Secret

Run this command in your terminal:

```bash
firebase functions:secrets:set OPENAI_API_KEY
```

You'll be prompted to paste your OpenAI API key securely. The key will be stored in Google Secret Manager.

### 2. Grant Access to Functions

The secret needs to be accessible to your Cloud Functions. This is automatically handled when you deploy with the secret defined in the function.

### 3. Deploy Functions

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

The functions will automatically have access to the secret at runtime.

## How It Works

1. **Secret Storage**: The OpenAI API key is stored in Google Secret Manager (not in code or Firestore)
2. **Runtime Access**: Functions access the secret using `OPENAI_API_KEY.value()` at runtime
3. **Security**: The secret is encrypted at rest and only accessible to your Cloud Functions
4. **No User Keys Needed**: Users no longer need to provide their own API keys

## Migration Notes

- **Breaking Change**: Users will no longer need to enter their own API keys
- **Cost Model**: The app now pays for all OpenAI usage (not users)
- **Frontend Update**: You may want to remove the API key input from the Settings screen

## Verifying Secret is Set

Check if the secret exists:

```bash
firebase functions:secrets:access OPENAI_API_KEY
```

## Updating the Secret

To update the secret:

```bash
firebase functions:secrets:set OPENAI_API_KEY
```

Then redeploy functions:

```bash
firebase deploy --only functions
```

## Troubleshooting

### Error: "Secret not found"
- Make sure you've set the secret: `firebase functions:secrets:set OPENAI_API_KEY`
- Verify the secret name matches exactly: `OPENAI_API_KEY`

### Error: "Permission denied"
- Ensure your Firebase project has Secret Manager API enabled
- Check that you're logged in: `firebase login`

### Functions not accessing secret
- Verify the function uses `secrets: [OPENAI_API_KEY]` in the configuration
- Redeploy after setting the secret

