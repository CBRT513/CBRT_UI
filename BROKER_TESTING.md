# Broker Testing Guide

This guide provides step-by-step instructions for testing the SSO integration between CBRT_UI and the Broker API.

## Prerequisites

1. **Environment Setup**
   ```bash
   # In .env.development.local or .env.staging.local
   VITE_ENABLE_SSO=true
   VITE_API_BASE=https://api.barge2rail.com  # or http://localhost:8000 for local
   ```

2. **Get Your ID Token**
   - Visit http://localhost:5173/debug (must be signed in as admin)
   - Click "Copy ID Token" button
   - Token is now in your clipboard

## Test Scenarios

### 1. Health Check (No Auth Required)

Test that the broker is running and accessible:

```bash
# Production broker
curl https://api.barge2rail.com/api/health

# Local broker
curl http://localhost:8000/api/health
```

**Expected Response:**
```json
{
  "ok": true,
  "service": "broker",
  "env": "staging",
  "version": "v1",
  "time": "2025-08-22T00:00:00.000Z"
}
```

### 2. List Releases (Auth Required - Viewer+)

Test without authentication (should fail):

```bash
curl https://api.barge2rail.com/cbrt/releases
```

**Expected:** `401 Unauthorized`
```json
{
  "detail": "Missing bearer token"
}
```

Test with authentication (replace <TOKEN> with your ID token):

```bash
curl https://api.barge2rail.com/cbrt/releases \
  -H "Authorization: Bearer <TOKEN>"
```

**Expected:** `200 OK`
```json
{
  "ok": true,
  "items": [],
  "status": []
}
```

### 3. Stage Release (Auth Required - Loader+)

Test with viewer token (should fail):

```bash
curl -X POST https://api.barge2rail.com/cbrt/releases/123/stage \
  -H "Authorization: Bearer <VIEWER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"location": "A1", "stagedQuantities": [10, 20]}'
```

**Expected:** `403 Forbidden`
```json
{
  "detail": "Role 'viewer' insufficient for 'loader'"
}
```

Test with loader token (should succeed):

```bash
curl -X POST https://api.barge2rail.com/cbrt/releases/123/stage \
  -H "Authorization: Bearer <LOADER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"location": "A1", "stagedQuantities": [10, 20]}'
```

**Expected:** `200 OK`
```json
{
  "ok": true,
  "rid": "123",
  "action": "stage"
}
```

### 4. Verify Release (Auth Required - Supervisor+)

Test with loader token (should fail):

```bash
curl -X POST https://api.barge2rail.com/cbrt/releases/123/verify \
  -H "Authorization: Bearer <LOADER_TOKEN>" \
  -H "Content-Type: application/json"
```

**Expected:** `403 Forbidden`
```json
{
  "detail": "Role 'loader' insufficient for 'supervisor'"
}
```

Test with supervisor token (should succeed):

```bash
curl -X POST https://api.barge2rail.com/cbrt/releases/123/verify \
  -H "Authorization: Bearer <SUPERVISOR_TOKEN>" \
  -H "Content-Type: application/json"
```

**Expected:** `200 OK`
```json
{
  "ok": true,
  "rid": "123",
  "action": "verify"
}
```

### 5. Reject Release (Auth Required - Supervisor+)

```bash
curl -X POST https://api.barge2rail.com/cbrt/releases/123/reject \
  -H "Authorization: Bearer <SUPERVISOR_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Incorrect quantities"}'
```

**Expected:** `200 OK`
```json
{
  "ok": true,
  "rid": "123",
  "action": "reject"
}
```

### 6. Load Release (Auth Required - Loader+)

```bash
curl -X POST https://api.barge2rail.com/cbrt/releases/123/load \
  -H "Authorization: Bearer <LOADER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"truckNumber": "TRK-001"}'
```

**Expected:** `200 OK`
```json
{
  "ok": true,
  "rid": "123",
  "action": "load"
}
```

### 7. Audit Logs (Auth Required - Viewer+)

```bash
curl "https://api.barge2rail.com/cbrt/audit?releaseId=123" \
  -H "Authorization: Bearer <TOKEN>"
```

**Expected:** `200 OK`
```json
{
  "ok": true,
  "items": []
}
```

## Role Hierarchy Testing

The RBAC hierarchy is: `viewer < loader < supervisor < admin`

| Endpoint | viewer | loader | supervisor | admin |
|----------|--------|--------|------------|-------|
| GET /cbrt/releases | ✅ 200 | ✅ 200 | ✅ 200 | ✅ 200 |
| POST /cbrt/releases/:id/stage | ❌ 403 | ✅ 200 | ✅ 200 | ✅ 200 |
| POST /cbrt/releases/:id/verify | ❌ 403 | ❌ 403 | ✅ 200 | ✅ 200 |
| POST /cbrt/releases/:id/reject | ❌ 403 | ❌ 403 | ✅ 200 | ✅ 200 |
| POST /cbrt/releases/:id/load | ❌ 403 | ✅ 200 | ✅ 200 | ✅ 200 |
| GET /cbrt/audit | ✅ 200 | ✅ 200 | ✅ 200 | ✅ 200 |

## UI Testing with Debug Page

1. **Navigate to Debug Page**
   ```
   http://localhost:5173/debug
   ```
   Note: You must be signed in as admin to access this page.

2. **Test Broker Health**
   - Click "Test Broker Health" button
   - Should see JSON response in output area

3. **Copy ID Token**
   - Click "Copy ID Token" button
   - Use this token for curl commands above

4. **Test Endpoints from UI**
   - Click the endpoint buttons to test directly from browser
   - View raw JSON responses in output area
   - Check network tab for Authorization headers

## Common Issues

### CORS Errors
If you see HTML responses or CORS errors:
1. Check that `VITE_API_BASE` is set correctly
2. Verify broker CORS configuration includes your domain
3. Ensure broker is running and accessible

### 401 Unauthorized
1. Token may be expired (tokens last 1 hour)
2. Get a fresh token from /debug page
3. Ensure token is properly formatted: `Bearer <TOKEN>`

### 403 Forbidden
1. User doesn't have required role
2. Check user's role in barge2rail-auth project: `/users/{uid}`
3. Ensure user status is "active"

### Network Errors
1. Check if broker is running
2. Verify network connectivity
3. Check firewall/proxy settings

## Local Broker Testing

To run the broker locally for testing:

```bash
cd broker
pip install -r requirements.txt

# Set environment variables
export AUTH_PROJECT=barge2rail-auth
export ENV=local
export VERSION=v1

# Run the broker
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Then update your `.env.development.local`:
```
VITE_API_BASE=http://localhost:8000
```

## Next Steps

After validating all tests pass:
1. Deploy broker to Cloud Run
2. Update staging environment variables
3. Run full integration test suite
4. Monitor logs for any errors