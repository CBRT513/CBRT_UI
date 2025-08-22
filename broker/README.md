# Broker API for CBRT SSO

Minimal broker implementation for SSO testing with Firebase Auth and RBAC.

## Quick Test Commands

```bash
# 1. Health check (no auth)
curl https://api.barge2rail.com/api/health

# 2. Get current user info (requires auth)
curl https://api.barge2rail.com/cbrt/me \
  -H "Authorization: Bearer <TOKEN>"

# 3. List releases (viewer+)
curl https://api.barge2rail.com/cbrt/releases \
  -H "Authorization: Bearer <TOKEN>"

# 4. Stage release (loader+) - 403 for viewer
curl -X POST https://api.barge2rail.com/cbrt/releases/123/stage \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"location": "A1"}'

# 5. Verify release (supervisor+) - 403 for viewer/loader
curl -X POST https://api.barge2rail.com/cbrt/releases/123/verify \
  -H "Authorization: Bearer <TOKEN>"
```

## Setup

```bash
pip install -r requirements.txt
```

## Run Locally

```bash
# Set environment variables
export AUTH_PROJECT=barge2rail-auth
export ENV=staging
export VERSION=v1

# Run server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Environment Variables (Cloud Run)

```
AUTH_PROJECT=barge2rail-auth
ENV=staging
VERSION=v1
ALLOWED_ORIGINS=http://localhost:5173,https://cbrt-app-ui-dev.web.app,https://cbrt-ui-staging.web.app,https://maintenance.barge2rail.com,https://cbrt.barge2rail.com
ALLOWED_ORIGIN_REGEX=^https:\/\/(cbrt-app-ui-dev|cbrt-ui-staging)(--[\w-]+)?\.web\.app$
```

## API Endpoints

### Health Check (No Auth)
```bash
curl https://api.barge2rail.com/api/health
# Returns: { "ok": true, "service": "broker", "env": "staging", "version": "v1", "time": "..." }
```

### List Releases (Viewer+)
```bash
# Without token - expects 401
curl https://api.barge2rail.com/cbrt/releases

# With viewer token - expects 200
curl https://api.barge2rail.com/cbrt/releases \
  -H "Authorization: Bearer $ID_TOKEN"
# Returns: { "ok": true, "items": [] }
```

### Stage Release (Loader+)
```bash
# With viewer token - expects 403
curl -X POST https://api.barge2rail.com/cbrt/releases/123/stage \
  -H "Authorization: Bearer $VIEWER_TOKEN"

# With loader token - expects 200
curl -X POST https://api.barge2rail.com/cbrt/releases/123/stage \
  -H "Authorization: Bearer $LOADER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"location": "A1", "stagedQuantities": [10, 20]}'
# Returns: { "ok": true, "rid": "123", "action": "stage" }
```

### Verify Release (Supervisor+)
```bash
# With loader token - expects 403
curl -X POST https://api.barge2rail.com/cbrt/releases/123/verify \
  -H "Authorization: Bearer $LOADER_TOKEN"

# With supervisor token - expects 200
curl -X POST https://api.barge2rail.com/cbrt/releases/123/verify \
  -H "Authorization: Bearer $SUPERVISOR_TOKEN"
# Returns: { "ok": true, "rid": "123", "action": "verify" }
```

### Reject Release (Supervisor+)
```bash
curl -X POST https://api.barge2rail.com/cbrt/releases/123/reject \
  -H "Authorization: Bearer $SUPERVISOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Incorrect quantities"}'
# Returns: { "ok": true, "rid": "123", "action": "reject" }
```

### Load Release (Loader+)
```bash
curl -X POST https://api.barge2rail.com/cbrt/releases/123/load \
  -H "Authorization: Bearer $LOADER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"truckNumber": "TRK-001"}'
# Returns: { "ok": true, "rid": "123", "action": "load" }
```

### Audit Logs (Viewer+)
```bash
curl "https://api.barge2rail.com/cbrt/audit?releaseId=123" \
  -H "Authorization: Bearer $ID_TOKEN"
# Returns: { "ok": true, "items": [] }
```

## RBAC Hierarchy

- `viewer` < `loader` < `supervisor` < `admin`
- Source of truth: `barge2rail-auth` project `/users/{uid}` document
- User must have `status: "active"` to access

## Testing Token Generation

```javascript
// In browser console with Firebase Auth
const user = firebase.auth().currentUser;
const token = await user.getIdToken();
console.log('Bearer', token);
```