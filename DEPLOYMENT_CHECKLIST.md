# Deployment Validation Checklist

## ✅ Validated Issues

### 1. ✅ Frontend NOT calling localhost/local IP
**Status:** PASSED
- No references to `localhost`, `127.0.0.1`, or local IPs found in codebase
- All API calls use Firebase SDK (connects to Firebase production)
- External API calls (OpenAI TTS, PostHog) use production URLs

### 2. ⚠️ Backend NOT deployed (CRITICAL ISSUE)
**Status:** NEEDS ACTION
- Cloud Functions were created but **NOT YET DEPLOYED**
- The app will fail on Vercel because Cloud Functions don't exist in production
- **Action Required:** Deploy Cloud Functions to Firebase

### 3. ⚠️ Environment Variables
**Status:** NEEDS VERIFICATION
- `VITE_POSTHOG_KEY` - Optional (has fallback)
- `VITE_POSTHOG_HOST` - Optional (has fallback to production)
- **Action Required:** Add to Vercel if using PostHog analytics

### 4. ✅ Firebase Emulators NOT enabled in production
**Status:** PASSED
- No `connectFirestoreEmulator` or `useEmulator` calls found
- Firebase connects directly to production
- No emulator configuration in code

### 5. ✅ Vercel Build/Output Settings
**Status:** PASSED
- Build command: `npm run build` (correct for Vite)
- Output directory: `dist` (matches vite.config.ts)
- SPA routing configured in `vercel.json`

### 6. ✅ SPA Routing Configured
**Status:** PASSED
- `vercel.json` has rewrite rule: `"source": "/(.*)", "destination": "/index.html"`
- This handles client-side routing correctly

## 🔧 Required Actions

### Action 1: Deploy Cloud Functions (CRITICAL)
```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Navigate to functions directory and install dependencies
cd functions
npm install
cd ..

# Deploy functions
firebase deploy --only functions
```

**Why this is critical:**
- The app relies on Cloud Functions for:
  - Generating first interview question
  - Processing user messages → AI responses
  - Generating insights when interview completes
- Without deployed functions, these features will fail silently

### Action 2: Add Environment Variables to Vercel (Optional)
If you're using PostHog analytics:
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add:
   - `VITE_POSTHOG_KEY` = your PostHog key
   - `VITE_POSTHOG_HOST` = your PostHog host (optional, defaults to production)

### Action 3: Verify Firebase Project
Ensure your Firebase project is the same in:
- `src/firebase.ts` (frontend config)
- Firebase CLI (when deploying functions)
- Vercel environment (if using Firebase hosting)

## 🧪 Testing Checklist

After deployment, verify:
- [ ] Interview starts and first question appears
- [ ] User messages trigger AI responses
- [ ] Interview completion generates insights
- [ ] No console errors in browser
- [ ] Network tab shows Firebase requests (not localhost)
- [ ] Vercel deployment logs show successful build

## 📊 Current Architecture

```
Frontend (Vercel)
    ↓
Firebase SDK (Production)
    ↓
Firestore (Production)
    ↓
Cloud Functions (MUST BE DEPLOYED)
    ↓
OpenAI API (User's API Key)
```

## 🐛 Debugging Tips

If issues persist after deployment:

1. **Check Vercel Logs:**
   - Vercel Dashboard → Deployments → View Function Logs
   - Look for Firebase connection errors

2. **Check Firebase Console:**
   - Firebase Console → Functions → View logs
   - Verify functions are deployed and active

3. **Check Browser Console:**
   - Open DevTools → Console
   - Look for Firebase/Firestore errors
   - Check Network tab for failed requests

4. **Verify Firestore Rules:**
   - Firebase Console → Firestore → Rules
   - Ensure rules allow authenticated users to read/write

5. **Test Cloud Functions Locally:**
   ```bash
   cd functions
   firebase emulators:start --only functions
   ```

