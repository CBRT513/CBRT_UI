# Fix Firebase Authentication for localhost:5176

## Quick Solution

The error `auth/requests-from-referer-http://localhost:5176-are-blocked` means Firebase is blocking auth requests from your local development server.

## Steps to Fix:

### Option 1: Add localhost to Firebase Authorized Domains (Recommended)

1. Go to Firebase Console: https://console.firebase.google.com/project/cbrt-app-ui-dev/authentication/settings

2. Navigate to **Settings** tab → **Authorized domains**

3. Add these domains if not already present:
   - `localhost`
   - `127.0.0.1`
   - `localhost:5176`

4. Click **Save**

### Option 2: Use Firebase Emulator for Local Development

Add this to your `src/firebase/config.js` for local development:

```javascript
import { connectAuthEmulator } from 'firebase/auth';

// After initializing auth
if (window.location.hostname === 'localhost') {
  connectAuthEmulator(auth, 'http://localhost:9099');
}
```

Then run: `firebase emulators:start --only auth`

### Option 3: Temporary Workaround - Use Port 5173

Firebase often pre-authorizes port 5173 for Vite apps. Try:

```bash
npm run dev -- --port 5173
```

Then access: http://localhost:5173

## Current Status

Currently authorized domains in your Firebase project:
- ✅ cbrt-app-ui-dev.firebaseapp.com
- ✅ cbrt-app-ui-dev.web.app
- ❌ localhost (needs to be added)
- ❌ 127.0.0.1 (needs to be added)

## Testing the Fix

After adding the domains:
1. Clear browser cache/cookies
2. Restart the dev server
3. Try accessing http://localhost:5176 again

The authentication should now work properly!