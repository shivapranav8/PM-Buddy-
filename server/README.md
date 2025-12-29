# ⚠️ DEPRECATED - DO NOT USE

This `server/` directory contains the **legacy local worker** that has been replaced by **Firebase Cloud Functions**.

## What Changed

| Before | After |
|--------|-------|
| Run `npm run start` locally | Cloud Functions run automatically |
| `worker.js` handles interviews | `functions/index.js` handles everything |
| `api.js` for encryption | `encryptApiKey` Cloud Function |
| Manual restart on laptop reboot | Always running in Google Cloud |

## Migration Complete

All functionality has been moved to `functions/index.js`:
- `onInterviewCreated` - Sends first question
- `onMessageCreated` - AI responses
- `onInterviewUpdated` - Generates insights
- `encryptApiKey` - Encrypts API keys
- `deleteApiKey` - Removes API keys
- `getApiKeyStatus` - Checks key status
- `validateApiKey` - Tests key with OpenAI

## Can I Delete This Folder?

Yes, you can safely delete this entire `server/` directory. It's kept only for reference.

```bash
rm -rf server/
```
