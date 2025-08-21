# CBRT UI Deployment Guide

## 🚀 Project Setup

This project uses two Firebase projects:
- **DEV**: `cbrt-app-ui-dev` - Development environment with emulators
- **STAGING**: `cbrt-ui-staging` - UAT environment with real Firebase

## 📋 Prerequisites

1. **Firebase CLI**
   ```bash
   npm install -g firebase-tools
   firebase login
   ```

2. **Environment Files**
   - Copy `.env.example` to `.env.development.local` for DEV
   - Copy `.env.example` to `.env.staging.local` for STAGING
   - Update with actual Firebase project credentials

3. **GitHub Secrets Required**
   ```
   FIREBASE_SA_DEV              # Service account for DEV
   FIREBASE_SA_STAGING          # Service account for STAGING
   FIREBASE_TOKEN_DEV           # Firebase CI token for DEV
   FIREBASE_TOKEN_STAGING       # Firebase CI token for STAGING
   VITE_FIREBASE_API_KEY_DEV    # Firebase API key for DEV
   VITE_FIREBASE_API_KEY_STAGING # Firebase API key for STAGING
   VITE_FIREBASE_MESSAGING_SENDER_ID_DEV
   VITE_FIREBASE_MESSAGING_SENDER_ID_STAGING
   VITE_FIREBASE_APP_ID_DEV
   VITE_FIREBASE_APP_ID_STAGING
   ```

## 🔧 Local Development

### Start Development Server
```bash
# With emulators (default)
npm run dev

# Test staging build locally
npm run dev:staging
```

### Firebase Emulators
```bash
# Start all emulators
npm run emulators

# Emulator ports:
# - Auth: http://localhost:9099
# - Firestore: http://localhost:8081
# - Functions: http://localhost:5001
```

## 🗑️ Database Management

### Wipe Database (DEV)
```bash
# Interactive confirmation
npm run wipe:dev

# Force wipe (CI/scripts)
firebase use dev
node scripts/wipe-firestore.js --force
```

### Seed Test Data
```bash
# Full dataset
npm run seed:dev

# Minimal dataset
node scripts/seed-data.js --minimal

# Web-based seeders (after deploy)
# - http://localhost:5173/seedReleases.html
# - http://localhost:5173/seedF8Test.html
```

## 📦 Build & Deploy

### Manual Deployment

#### Deploy to DEV
```bash
# Switch to DEV project
firebase use dev

# Build for development
npm run build:dev

# Deploy everything
npm run deploy:dev

# Deploy only rules/indexes
npm run deploy:rules
```

#### Deploy to STAGING
```bash
# Switch to STAGING project
firebase use staging

# Build for staging
npm run build:staging

# Deploy everything
npm run deploy:staging
```

### Automated Deployment (CI/CD)

The GitHub Actions workflow automatically:

1. **Pull Requests** → Deploy preview to DEV hosting channel
2. **main/develop branch** → Deploy to DEV environment
3. **release/* branches** → Deploy to STAGING environment

## 🔍 Verification Steps

### DEV Environment
1. Visit: https://cbrt-app-ui-dev.web.app
2. Check emulator connection (console should show "Using Firebase Emulators")
3. Test F7 Ops Queues: `/ops/queues`
4. Test F8 workflows: Stage → Verify → Load

### STAGING Environment
1. Visit: https://cbrt-ui-staging.web.app
2. Login with @cbrt.com email only
3. Verify no emulator warnings
4. Run full UAT test suite

## 🔐 Auth Configuration

### DEV Environment
- ✅ Email/Password
- ✅ Google Auth
- ✅ Anonymous Auth
- No domain restrictions

### STAGING Environment
- ✅ Email/Password
- ✅ Google Auth (restricted to @cbrt.com)
- ❌ Anonymous Auth disabled
- Domain restriction: @cbrt.com only

## 📝 Feature Flags

Control features via environment variables:

```env
# Core Features
VITE_ENABLE_SUPERSACK=true    # F7/F8 Ops functionality
VITE_SHOW_AGING=true          # Aging timers in queues
VITE_NOTIFS_DRY_RUN=true      # Dry-run notifications

# Environment-specific
VITE_ENABLE_DEBUG=true        # DEV only
VITE_ENABLE_SEED_SCRIPTS=true # DEV only
```

## 🚨 Troubleshooting

### Common Issues

1. **Multiple Firebase Init Error**
   - Check: `grep -r "initializeApp(" src/`
   - Should only exist in `src/firebase/config.js`

2. **Emulator Connection Failed**
   - Ensure emulators are running: `npm run emulators`
   - Check `.env.development.local` has `VITE_USE_EMULATORS=true`

3. **Deploy Permission Denied**
   - Verify Firebase login: `firebase login`
   - Check project access: `firebase projects:list`

4. **Build Fails**
   - Clear cache: `rm -rf node_modules dist`
   - Reinstall: `npm install`
   - Rebuild: `npm run build`

## 📊 Monitoring

### View Deployment Status
- GitHub Actions: Check workflow runs
- Firebase Console: https://console.firebase.google.com
- Hosting URLs:
  - DEV: https://cbrt-app-ui-dev.web.app
  - STAGING: https://cbrt-ui-staging.web.app

### Logs
```bash
# View Firebase Functions logs
firebase functions:log --project cbrt-app-ui-dev

# View hosting activity
firebase hosting:channel:list --project cbrt-app-ui-dev
```

## 🔄 Rollback Procedure

### Hosting Rollback
```bash
# List versions
firebase hosting:versions:list --project cbrt-app-ui-dev

# Rollback to specific version
firebase hosting:rollback --project cbrt-app-ui-dev
```

### Firestore Rules Rollback
```bash
# Deploy previous rules version
git checkout <previous-commit> -- firestore.rules
firebase deploy --only firestore:rules
```

## 📚 Additional Resources

- [Firebase Console - DEV](https://console.firebase.google.com/project/cbrt-app-ui-dev)
- [Firebase Console - STAGING](https://console.firebase.google.com/project/cbrt-ui-staging)
- [GitHub Actions Workflows](https://github.com/CBRT513/CBRT_UI/actions)
- [Firebase Documentation](https://firebase.google.com/docs)