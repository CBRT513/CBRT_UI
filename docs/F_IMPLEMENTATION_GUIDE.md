# F Integration Layer Implementation Guide

## Quick Start

This guide walks you through implementing and deploying the Milestone F Integration Layer in your CBRT UI application.

## Prerequisites

- Node.js 18+ with npm
- PostgreSQL or compatible database
- Redis for caching (optional but recommended)
- SSL certificates for production

## Installation Steps

### 1. Environment Setup

```bash
# Clone and navigate to project
git clone <repository-url>
cd cbrt-ui

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

### 2. Environment Configuration

Edit `.env` with your configuration:

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/cbrt_integration
REDIS_URL=redis://localhost:6379

# Integration Layer
INTEGRATION_MASTER_KEY=your_32_byte_hex_key_here
INTEGRATION_ENCRYPTION_ALGORITHM=aes-256-gcm

# OAuth2 Configuration
OAUTH2_CLIENT_ID=your_oauth2_client_id
OAUTH2_CLIENT_SECRET=your_oauth2_client_secret
OAUTH2_REDIRECT_URI=http://localhost:3000/callback

# OIDC Configuration
OIDC_ISSUER=https://your-oidc-provider.com
OIDC_CLIENT_ID=your_oidc_client_id
OIDC_CLIENT_SECRET=your_oidc_client_secret

# Webhook Security
WEBHOOK_SECRET=your_webhook_secret_key

# Policy Configuration
ALLOWED_DOMAINS=api.example.com,*.trusted.com
BLOCKED_DOMAINS=malicious.com,untrusted.com
DATA_RESIDENCY_REGIONS=us-east-1,eu-west-1

# Performance Configuration
CIRCUIT_BREAKER_THRESHOLD=5
CIRCUIT_BREAKER_TIMEOUT=30000
RETRY_MAX_ATTEMPTS=3
RETRY_BACKOFF_MS=1000
CACHE_SIZE=10000
CACHE_TTL_MS=300000

# Monitoring
METRICS_ENABLED=true
TRACING_ENABLED=true
HEALTH_CHECK_INTERVAL=30000
LOG_LEVEL=info
```

### 3. Database Setup

```bash
# Run database migrations
npm run db:migrate

# Seed initial data (optional)
npm run db:seed
```

### 4. Verification

```bash
# Run integration layer verification
node scripts/verify-integration-layer.js

# Expected output:
# ✅ File structure verification passed
# ✅ Module imports verification passed
# ✅ TypeScript definitions verification passed
# ✅ Configuration verification passed
# ✅ Security verification passed
# ✅ Performance verification passed
# ✅ Integration tests verification passed
# 🎉 INTEGRATION LAYER VERIFICATION PASSED
```

### 5. Start Development Server

```bash
# Start with integration layer enabled
FEATURE_INTEGRATION_LAYER=true npm run dev

# Server should start on http://localhost:3000
# Integration panel available at /integration
```

## Core Components Implementation

### Integration Registry

The registry manages all available connectors:

```typescript
import { connectorRegistry } from './lib/integration/registry';
import { restAdapter } from './lib/integration/adapters/rest';

// Register adapters
connectorRegistry.register(restAdapter);

// Get registered adapter
const adapter = connectorRegistry.get('rest', '1.0.0');

// Validate configuration
const validation = adapter.validate(config);
if (!validation.valid) {
  console.error('Configuration errors:', validation.errors);
}
```

### Executing Integrations

```typescript
import { executeWithPolicy } from './lib/integration/runtime';

const result = await executeWithPolicy(
  adapter,
  request,
  config,
  context,
  {
    timeout: 30000,
    retries: 3,
    circuitBreaker: {
      failureThreshold: 5,
      resetTimeoutMs: 30000,
    },
  }
);

if (result.success) {
  console.log('Integration response:', result.data);
} else {
  console.error('Integration failed:', result.error);
}
```

### Authentication Setup

#### OAuth2 Implementation

```typescript
import { OAuth2Client } from './lib/integration/auth/oauth2';

const oauth2Client = new OAuth2Client({
  clientId: process.env.OAUTH2_CLIENT_ID,
  clientSecret: process.env.OAUTH2_CLIENT_SECRET,
  authUrl: 'https://provider.com/oauth/authorize',
  tokenUrl: 'https://provider.com/oauth/token',
  scopes: ['read', 'write'],
});

// Get access token
const token = await oauth2Client.clientCredentials();
```

#### OIDC Implementation

```typescript
import { OIDCClient } from './lib/integration/auth/oidc';

const oidcClient = new OIDCClient({
  clientId: process.env.OIDC_CLIENT_ID,
  clientSecret: process.env.OIDC_CLIENT_SECRET,
  issuer: process.env.OIDC_ISSUER,
  redirectUri: process.env.OIDC_REDIRECT_URI,
});

// Discover endpoints
await oidcClient.discover();

// Exchange code for token
const token = await oidcClient.exchangeCodeForToken(authCode);
```

### Storage and Credentials

```typescript
import { integrationRepository } from './lib/integration/storage/repo';

// Create integration
const integration = await integrationRepository.createIntegration({
  name: 'My API Integration',
  connectorType: 'rest',
  connectorVersion: '1.0.0',
  workspaceId: 'workspace_123',
  config: {
    baseUrl: 'https://api.example.com',
    timeout: 30000,
  },
}, userId);

// Create encrypted credential
const credential = await integrationRepository.createCredential({
  name: 'API Key',
  type: 'api_key',
  integrationId: integration.id,
  workspaceId: 'workspace_123',
  credentialData: {
    apiKey: 'secret-api-key-12345',
  },
  metadata: {
    environment: 'production',
    autoRotate: false,
  },
}, userId);
```

### Policy Configuration

```typescript
import { residencyPolicyEngine, domainPolicyEngine } from './lib/integration/policies/integrationPolicies';

// Configure data residency policy
const residencyPolicy = {
  id: 'eu-residency',
  allowedRegions: ['eu-west-1', 'eu-central-1'],
  requiredCertifications: ['GDPR'],
  dataClassifications: ['personal', 'sensitive'],
};

// Evaluate policy
const result = await residencyPolicyEngine.evaluate(residencyPolicy, {
  targetRegion: 'eu-west-1',
  dataClassification: 'personal',
  certifications: ['GDPR'],
});

console.log('Policy result:', result.allowed);
```

### Monitoring Setup

```typescript
import { integrationMetrics, healthChecker } from './lib/integration/monitoring/metrics';

// Record metrics
integrationMetrics.recordRequest('integration-123', 'success', 250);

// Register health check
healthChecker.registerCheck('integration-123', {
  name: 'API Connectivity',
  description: 'Check API endpoint connectivity',
  check: async () => {
    // Health check logic
    return {
      status: 'healthy',
      responseTime: 150,
      metadata: { endpoint: 'https://api.example.com' },
    };
  },
  interval: 30000,
  timeout: 10000,
});

// Get health status
const health = await healthChecker.runChecks('integration-123');
console.log('Health status:', health.overall);
```

## UI Components Integration

### Integration Manager

```jsx
import IntegrationManager from './components/IntegrationManager';

function App() {
  return (
    <div className="app">
      <IntegrationManager />
    </div>
  );
}
```

### Health Panel

```jsx
import IntegrationHealthPanel from './components/IntegrationHealthPanel';

function IntegrationDetailPage({ integrationId }) {
  return (
    <div className="integration-detail">
      <IntegrationHealthPanel integrationId={integrationId} />
    </div>
  );
}
```

### Configuration Panel

```jsx
import IntegrationConfigPanel from './components/IntegrationConfigPanel';

function ConfigurationPage({ integration }) {
  const handleSave = async (updatedIntegration) => {
    // Save logic
  };

  const handleCancel = () => {
    // Cancel logic
  };

  return (
    <IntegrationConfigPanel
      integration={integration}
      onSave={handleSave}
      onCancel={handleCancel}
    />
  );
}
```

## Security Implementation

### Authentication Middleware

```typescript
import { requireAuth, PERMISSIONS } from './lib/integration/integrationAuth';

// Protect routes
app.get('/api/integrations', requireAuth(PERMISSIONS.INTEGRATION_READ), (req, res) => {
  // Route handler
});

app.post('/api/integrations', requireAuth(PERMISSIONS.INTEGRATION_CREATE), (req, res) => {
  // Route handler
});
```

### Data Redaction

```typescript
import { redactSensitiveData, RedactionStrategy } from './lib/integration/policies/redaction';

const sensitiveData = {
  name: 'John Doe',
  email: 'john@example.com',
  ssn: '123-45-6789',
};

const redacted = await redactSensitiveData(sensitiveData, {
  strategy: RedactionStrategy.MASK,
  patterns: ['email', 'ssn'],
  preserveLength: true,
});

console.log('Redacted:', redacted);
// Output: { name: 'John Doe', email: '***@***.***', ssn: '***-**-****' }
```

## Testing Implementation

### Unit Tests

```typescript
import { describe, test, expect } from '@jest/globals';
import { restAdapter } from './lib/integration/adapters/rest';

describe('REST Adapter', () => {
  test('should validate configuration', () => {
    const config = {
      id: 'test-rest',
      name: 'Test REST',
      type: 'rest',
      config: {
        baseUrl: 'https://api.example.com',
        timeout: 5000,
      },
    };

    const validation = restAdapter.validate(config);
    expect(validation.valid).toBe(true);
  });

  test('should handle GET requests', async () => {
    const request = {
      method: 'GET',
      path: '/users',
    };

    const result = await restAdapter.execute(request, config, context);
    expect(result.success).toBe(true);
    expect(result.data).toBeTruthy();
  });
});
```

### Integration Tests

```bash
# Run integration tests
npm run test:integration

# Run with coverage
npm run test:coverage
```

### Load Tests

```bash
# Run light load test
node scripts/load-test-integration.js light

# Run full benchmark suite
./scripts/run-integration-benchmarks.sh
```

## Production Deployment

### Build for Production

```bash
# Build optimized bundle
npm run build

# Verify build
npm run verify:build
```

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

### Environment Variables for Production

```bash
# Production overrides
NODE_ENV=production
INTEGRATION_MASTER_KEY=production_key_here
DATABASE_URL=postgresql://user:pass@prod-db:5432/cbrt
REDIS_URL=redis://prod-redis:6379

# Security
HTTPS_ONLY=true
SECURE_COOKIES=true
HSTS_MAX_AGE=31536000

# Performance
CACHE_ENABLED=true
COMPRESSION_ENABLED=true
RATE_LIMIT_ENABLED=true

# Monitoring
METRICS_ENDPOINT=https://metrics.company.com
LOGGING_LEVEL=warn
ERROR_REPORTING_ENABLED=true
```

### Health Checks for Load Balancer

```javascript
// health-check.js
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/health',
  method: 'GET',
  timeout: 5000,
};

const req = http.request(options, (res) => {
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

req.on('error', () => process.exit(1));
req.on('timeout', () => process.exit(1));
req.end();
```

## Monitoring and Alerting

### Prometheus Metrics

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'cbrt-integration'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: /metrics
    scrape_interval: 10s
```

### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "CBRT Integration Layer",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "rate(integration_requests_total[5m])"
          }
        ]
      },
      {
        "title": "Response Time",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, integration_response_time_bucket)"
          }
        ]
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(integration_errors_total[5m]) / rate(integration_requests_total[5m])"
          }
        ]
      }
    ]
  }
}
```

### Alerting Rules

```yaml
# alerts.yml
groups:
  - name: integration-layer
    rules:
      - alert: HighErrorRate
        expr: rate(integration_errors_total[5m]) / rate(integration_requests_total[5m]) > 0.05
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: High error rate in integration layer

      - alert: SlowResponseTime
        expr: histogram_quantile(0.95, integration_response_time_bucket) > 5000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: Slow response times in integration layer

      - alert: CircuitBreakerOpen
        expr: integration_circuit_breaker_state == 1
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: Circuit breaker is open
```

## Troubleshooting

### Common Issues

#### 1. Authentication Failures

```bash
# Check credential status
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/integration/credentials

# Test authentication
curl -X POST http://localhost:3000/api/integration/auth/test \
  -H "Content-Type: application/json" \
  -d '{"apiKey": "your-key"}'
```

#### 2. Connection Timeouts

```javascript
// Increase timeout in configuration
const config = {
  timeout: 60000, // 60 seconds
  retryPolicy: {
    maxRetries: 5,
    backoffMs: 2000,
  },
};
```

#### 3. Circuit Breaker Issues

```bash
# Check circuit breaker status
curl http://localhost:3000/api/integration/health

# Reset circuit breaker (if needed)
curl -X POST http://localhost:3000/api/integration/circuit-breaker/reset
```

#### 4. Memory Issues

```bash
# Monitor memory usage
node --max-old-space-size=4096 app.js

# Enable garbage collection logging
node --trace-gc app.js
```

### Debug Logging

```javascript
// Enable debug logging
process.env.LOG_LEVEL = 'debug';
process.env.INTEGRATION_DEBUG = 'true';

// Or in .env
LOG_LEVEL=debug
INTEGRATION_DEBUG=true
```

### Performance Profiling

```bash
# CPU profiling
npx 0x app.js

# Memory profiling
npx clinic doctor -- node app.js

# Heap snapshots
npx clinic heapprofiler -- node app.js
```

## Migration Guide

### From Previous Versions

```bash
# Backup current data
pg_dump cbrt_db > backup.sql

# Run migration scripts
npm run migrate:integration-layer

# Verify migration
npm run verify:migration
```

### Feature Flag Rollout

```javascript
// Gradual feature rollout
const integrationEnabled = process.env.FEATURE_INTEGRATION_LAYER === 'true';
const userPercentage = parseInt(process.env.INTEGRATION_ROLLOUT_PERCENTAGE || '0');

function isIntegrationEnabledForUser(userId) {
  if (!integrationEnabled) return false;
  
  const hash = crypto.createHash('md5').update(userId).digest('hex');
  const userBucket = parseInt(hash.substr(0, 2), 16) % 100;
  
  return userBucket < userPercentage;
}
```

## Best Practices

### Security

1. **Never commit secrets** - Use environment variables or secret management
2. **Rotate credentials regularly** - Set up automatic rotation policies
3. **Validate all inputs** - Use schema validation for API requests
4. **Audit all operations** - Log security-relevant events
5. **Use HTTPS everywhere** - Enforce TLS for all communications

### Performance

1. **Use connection pooling** - Configure database connection pools
2. **Implement caching** - Cache frequently accessed data
3. **Monitor circuit breakers** - Set appropriate failure thresholds
4. **Optimize database queries** - Use indexes and query optimization
5. **Enable compression** - Use gzip compression for API responses

### Reliability

1. **Implement retries** - Use exponential backoff for failed requests
2. **Set appropriate timeouts** - Balance responsiveness with reliability
3. **Monitor health checks** - Set up comprehensive health monitoring
4. **Plan for failures** - Implement graceful degradation
5. **Test disaster recovery** - Regularly test backup and recovery procedures

---

**Implementation Guide Version**: 1.0  
**Last Updated**: 2025-08-21  
**Compatibility**: Node.js 18+, CBRT UI v2.0+