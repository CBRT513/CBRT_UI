# Repository Hygiene Report
Generated: 2025-08-21

## Executive Summary
Repository contamination detected: Found foreign Firebase Functions projects and staging directories mixed with CBRT_UI codebase. Proceeding with quarantine and cleanup.

## 1. Foreign Modules Detected

### Suspicious Directories
- **`/staging/`** - Complete Firebase Functions project with 407 node_modules
  - Contains separate package.json for "functions" 
  - Has its own node_modules (285KB package-lock.json)
  - Last modified: Aug 20, 2025
  
- **`/functions/`** - Another Firebase Functions directory
  - Duplicate of staging with same "functions" package name
  - Standard Firebase Functions structure

### Documentation Suggesting External Projects
- **`docker-compose.yml`** - Added recently (Aug 21)
- **`SYSTEM_OVERVIEW.md`** - References Docker setup
- **`RUNNING_GUIDE.md`** - Docker-based deployment instructions
- **`monitoring/`** - Prometheus configuration

### Other Artifacts
- Multiple backup directories (`/backups/`, `/.backups/`)
- Test files at root level (`test-sms-mvp.html`)
- Temporary import files (`temp_import.js`)
- Development logs (`firebase-debug.log`, `dev.log`, `pglite-debug.log`)

## 2. CBRT_UI Core Structure (KEEP)

### Confirmed CBRT Paths
```
src/
├── components/     # UI components (BatchBar, SelectableTable, etc.)
├── contexts/       # React contexts
├── features/       # Feature modules (bol-generation)
├── hooks/         # Custom React hooks
├── managers/      # Entity managers (CustomerManager, etc.)
├── modals/        # Modal components
├── pages/         # Page components
├── routes/        # Route components
├── services/      # Business logic (bolService, auditService)
├── tests/         # Test files
└── utils/         # Utility functions
```

### Core Configuration Files (KEEP)
- `package.json` (root) - Main CBRT_UI app
- `vite.config.js` - Vite bundler config
- `tailwind.config.js` - Tailwind CSS
- `firebase.json` - Firebase hosting config
- `firestore.rules` - Security rules
- `.firebaserc` - Firebase project config

## 3. Contamination Timeline

Based on git history and file timestamps:
- **Jul 25-26**: Initial CBRT_UI setup
- **Aug 8**: Functions directories created (staging/)
- **Aug 20-21**: Docker and monitoring infrastructure added
- **Current**: Mixed state with both CBRT_UI and Functions projects

## 4. Quarantine Plan

### Phase 1: Immediate Quarantine
Moving to `_foreign/quarantined-20250821/`:
- `/staging/` - Complete directory
- `/functions/` - Complete directory  
- `/monitoring/` - Prometheus config
- `/docker-compose.yml`
- `/SYSTEM_OVERVIEW.md` (Docker-focused)
- `/RUNNING_GUIDE.md` (Docker-focused)
- Development artifacts:
  - `temp_import.js`
  - `test-sms-mvp.html`
  - `populate-*.sh`
  - Various debug logs

### Phase 2: Build Scope Restriction
- Update `vite.config.js` to explicitly include only `src/` paths
- Ensure single Firebase initialization in `src/firebase/config.js`
- Remove any cross-references to quarantined directories

## 5. Impact Assessment

### Risk Level: MEDIUM
- No production deployment detected
- Build still functional with foreign modules present
- Clear separation between CBRT_UI and Functions code

### Data Loss Risk: NONE
- Full backup created at `backup/full-snapshot-20250821-124237`
- Safety tag: `hygiene-preclean-20250821-124320`
- All files preserved in quarantine directory

## 6. Verification Checklist

- [ ] Single Firebase app initialization
- [ ] Single package.json at root
- [ ] No Functions directories in build
- [ ] Vite build passes
- [ ] All CBRT routes accessible
- [ ] No Docker dependencies for local dev

## 7. Prevention Measures

### Immediate
- `.gitignore` updates to exclude logs and temp files
- Branch protection rules
- CODEOWNERS file for critical paths

### Long-term
- CI lint for foreign frameworks
- Pre-commit hooks for path validation
- Clear project structure documentation

## 8. Execution Log

```bash
# Backup created
git branch: backup/full-snapshot-20250821-124237
git tag: hygiene-preclean-20250821-124320

# Working branch
git branch: fix/repo-hygiene

# Next steps
1. Execute quarantine (move files)
2. Update build configs
3. Test CBRT_UI functionality
4. Commit and create PR
```

---
**Status**: Ready to execute quarantine
**Estimated completion**: 15 minutes