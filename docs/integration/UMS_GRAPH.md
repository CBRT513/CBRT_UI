# UMS Graph API Integration

## Overview

The CBRT UI integrates with the Universal Memory System (UMS) Graph API to provide knowledge extraction and entity management capabilities.

## Configuration

### Environment Variables

```bash
# .env.local
VITE_UMS_GRAPH_BASE_URL=http://127.0.0.1:8091  # Local development
VITE_FEATURE_UMS=true                           # Enable UMS features
```

### Production Configuration

In production, requests are proxied through Firebase Functions:
- Client → `/api/ums/*` → Firebase Function → UMS API
- Authentication validated by Firebase Function

## API Endpoints

### Search Documents

```bash
curl -X GET "http://127.0.0.1:8091/api/graph/documents?q=test&limit=10"
```

Response:
```json
[
  {
    "id": 1,
    "title": "Document Title",
    "url": "https://example.com",
    "snippet": "Document content...",
    "match_score": 0.95,
    "capture_id": "cap_123",
    "project_id": "project-1"
  }
]
```

### Search Entities

```bash
curl -X GET "http://127.0.0.1:8091/api/graph/entities?q=openai&limit=10"
```

Response:
```json
[
  {
    "id": 1,
    "type": "org",
    "name": "OpenAI",
    "normalized": "openai",
    "confidence": 0.9,
    "project": "project-1"
  }
]
```

### Extract Entities

```bash
curl -X POST "http://127.0.0.1:8091/api/graph/extract?mode=rule" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Anthropic released Claude 3.5 Sonnet.",
    "project": "project-1",
    "persist": true
  }'
```

Response:
```json
{
  "entities": [
    {
      "type": "org",
      "name": "Anthropic",
      "normalized": "anthropic",
      "confidence": 0.9
    }
  ],
  "edges": [],
  "metadata": {
    "mode": "rule",
    "processing_ms": 45
  }
}
```

## Extraction Modes

- **rule**: Fast pattern-based extraction
- **llm**: AI-powered extraction (slower, more accurate)
- **hybrid**: Combines rule and LLM extraction

## React Integration

### Using the Hook

```jsx
import { useUmsQuery } from '../hooks/useUmsQuery';
import { getDocuments } from '../lib/ums';

function MyComponent() {
  const { data, loading, error, refetch } = useUmsQuery(
    (signal) => getDocuments('search term', 10, signal),
    ['search term']
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      {data?.map(doc => <div key={doc.id}>{doc.title}</div>)}
    </div>
  );
}
```

### Direct API Calls

```javascript
import { getDocuments, getEntities, postExtract } from '../lib/ums';

// Search documents
const docs = await getDocuments('query', 10);

// Search entities
const entities = await getEntities('query', 10);

// Extract entities
const result = await postExtract(
  'Text to analyze',
  'rule',  // or 'llm' or 'hybrid'
  { project: 'my-project', persist: true }
);
```

## Error Handling

### Error Types

- **408 Request Timeout**: Request exceeded 10s timeout
- **401 Unauthorized**: Invalid or missing Firebase token
- **500 Server Error**: UMS API error
- **503 Service Unavailable**: UMS API unreachable

### Error Response Format

```json
{
  "error": "Error message",
  "detail": "Additional details",
  "status": 500
}
```

### Handling Errors

```javascript
try {
  const data = await getDocuments('query');
} catch (error) {
  if (error instanceof UmsError) {
    console.error(`UMS Error ${error.status}: ${error.message}`);
    if (error.detail) {
      console.error('Details:', error.detail);
    }
  }
}
```

## Feature Flags

The UMS integration is feature-flagged:

```javascript
const showUms = import.meta.env.VITE_FEATURE_UMS === 'true';

if (showUms) {
  // Show UMS features
}
```

## Deployment

### Staging

```bash
# Deploy to staging (develop branch)
git push origin develop
# GitHub Actions will automatically deploy
```

### Production

```bash
# Deploy to production (main branch or tags)
git push origin main
# Or create a release tag
git tag v1.0.0
git push origin v1.0.0
```

### Manual Deployment

```bash
# Build
npm run build

# Deploy functions
cd functions
npm run deploy

# Deploy hosting
firebase deploy --only hosting
```

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure UMS API allows origin
   - Check Firebase Function proxy configuration

2. **Authentication Errors**
   - Verify Firebase token is valid
   - Check authorized domains in Firebase Console

3. **Timeout Errors**
   - UMS API may be slow for LLM mode
   - Consider using rule mode for faster responses

4. **Network Errors**
   - Verify UMS API is running on port 8091
   - Check network connectivity

### Debug Mode

Enable debug logging:
```javascript
localStorage.setItem('UMS_DEBUG', 'true');
```

## Security

- Firebase ID tokens validated server-side
- No direct UMS API access from client in production
- Requests proxied through Firebase Functions
- User context passed via headers