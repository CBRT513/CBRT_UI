# CBRT Integration Fabric Guide

## Overview

The CBRT Integration Fabric provides a comprehensive service mesh solution built on Istio, delivering zero-trust security, observability, and policy enforcement for all service-to-service communication.

## Architecture

### Core Components

- **Istio Service Mesh**: mTLS, traffic management, policy enforcement
- **SPIFFE/SPIRE**: Identity and certificate management
- **OpenTelemetry**: Distributed tracing and metrics
- **Prometheus/Grafana**: Monitoring and alerting
- **Jaeger**: Trace visualization
- **Loki**: Log aggregation

### Security Model

- **STRICT mTLS**: All service communication encrypted and authenticated
- **Zero-trust egress**: No external calls without explicit authorization
- **SPIFFE Identity**: Cryptographic service identity with workload attestation
- **Policy Enforcement**: OPA-based authorization at mesh and application layers

## Deployment

### Prerequisites

```bash
# Install Istio
curl -L https://istio.io/downloadIstio | sh -
export PATH=$PWD/istio-*/bin:$PATH
istioctl install --set values.defaultRevision=default

# Install observability stack
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.19/samples/addons/prometheus.yaml
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.19/samples/addons/grafana.yaml
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.19/samples/addons/jaeger.yaml
```

### Fabric Deployment

```bash
# Deploy mesh infrastructure
kubectl apply -f infra/gateway/k8s/
kubectl apply -f infra/mesh/k8s/
kubectl apply -f infra/observability/k8s/

# Verify deployment
kubectl get pods -n istio-system
kubectl get pods -n cbrt-mesh
kubectl get pods -n observability
```

## Application Integration

### Fabric Client Usage

```typescript
import { FabricClient } from '@/lib/integration/fabricClient';

const client = new FabricClient({
  serviceId: 'cbrt-frontend',
  spiffeId: 'spiffe://cbrt.company.com/frontend/cbrt-ui',
  baseURL: process.env.API_BASE_URL,
  circuitBreaker: {
    enabled: true,
    failureThreshold: 5,
    timeout: 30000,
  },
});

// Fabric-aware HTTP request with automatic retry and circuit breaking
try {
  const response = await client.get('/api/v1/releases');
  console.log('Response:', response.data);
} catch (error) {
  console.error('Request failed:', error.message);
}
```

### Policy Integration

```typescript
import { fabricPolicyChecker } from '@/lib/integration/fabricPolicyCheck';

const context = {
  user: { id: '12345', role: 'loader', permissions: ['write:releases'] },
  request: { method: 'PUT', path: '/api/v1/releases/123/advance' },
  service: {
    sourceSpiffeId: 'spiffe://cbrt.company.com/frontend/cbrt-ui',
    targetSpiffeId: 'spiffe://cbrt.company.com/api/cbrt-backend',
  },
  time: { timestamp: Date.now(), businessHours: true },
};

const decision = await fabricPolicyChecker.checkPolicy(context);
if (!decision.allowed) {
  throw new Error(`Access denied: ${decision.reason}`);
}
```

## Testing

### Unit Tests

```bash
# Run fabric integration tests
npm test tests/fabric/

# Run specific test suites
npm test tests/fabric/mtls_e2e.test.ts
npm test tests/fabric/ratelimit.test.ts
npm test tests/fabric/circuit_breaker.test.ts
```

### End-to-End Testing

```bash
# Run canary deployment with validation
node scripts/fabric_canary.mjs --validate-only

# Full canary deployment
node scripts/fabric_canary.mjs --environment staging
```

## Monitoring

### Key Metrics

- **Request Rate**: `sum(rate(istio_requests_total[5m]))`
- **Error Rate**: `sum(rate(istio_requests_total{response_code!~"2.."}[5m]))`
- **Latency P99**: `histogram_quantile(0.99, istio_request_duration_milliseconds)`
- **mTLS Success**: `sum(rate(istio_tcp_connections_opened_total[5m]))`

### Dashboards

- **Istio Mesh Dashboard**: Service topology and health
- **Service Performance**: Latency, throughput, error rates
- **Security Dashboard**: mTLS status, policy violations
- **Circuit Breaker Status**: Failure rates and state transitions

### Alerts

```yaml
groups:
  - name: fabric.rules
    rules:
      - alert: HighErrorRate
        expr: sum(rate(istio_requests_total{response_code!~"2.."}[5m])) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
          
      - alert: mTLSFailure
        expr: increase(istio_tcp_connections_closed_total[5m]) > 10
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "mTLS connection failures"
```

## Troubleshooting

### Common Issues

1. **mTLS Handshake Failures**
   ```bash
   # Check certificate status
   istioctl proxy-status
   kubectl get peerauthentication -A
   ```

2. **Circuit Breaker Opening**
   ```bash
   # Check outlier detection
   istioctl proxy-config cluster <pod> | grep outlier
   ```

3. **Policy Violations**
   ```bash
   # Check authorization policies
   kubectl get authorizationpolicy -A
   istioctl analyze
   ```

### Debug Commands

```bash
# View proxy configuration
istioctl proxy-config all <pod-name>

# Check Envoy access logs
kubectl logs <pod-name> -c istio-proxy

# Validate mesh configuration
istioctl analyze --all-namespaces

# Check certificate details
openssl x509 -in cert.pem -text -noout
```

## Security Considerations

### Certificate Management

- Certificates auto-rotate every 24 hours
- Root CA rotation requires coordinated deployment
- SPIFFE ID validation enforced at all mesh ingress points

### Zero-Trust Egress

- Default DENY for all external traffic
- Explicit ServiceEntry required for external dependencies
- Egress gateway for centralized external access control

### Policy Enforcement

- Multi-layer authorization: Istio + application layer
- Business hours restrictions for sensitive operations
- Role-based access control with fine-grained permissions
- Rate limiting per user, role, and endpoint

## Performance Tuning

### Resource Limits

```yaml
resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 2000m
    memory: 1Gi
```

### Connection Pooling

```yaml
trafficPolicy:
  connectionPool:
    tcp:
      maxConnections: 100
    http:
      http1MaxPendingRequests: 50
      maxRequestsPerConnection: 10
```

### Circuit Breaker Tuning

- Failure threshold: 5 consecutive failures
- Timeout: 30 seconds before retry
- Half-open: 3 test requests before full recovery

## Local Development

### Docker Compose Parity

The fabric configuration maintains behavior parity between Kubernetes and local Docker Compose environments:

```yaml
# docker-compose.override.yml
services:
  cbrt-frontend:
    environment:
      - FABRIC_MODE=local
      - SPIFFE_ID=spiffe://cbrt.company.com/frontend/cbrt-ui
```

### Testing Locally

```bash
# Start local stack
docker-compose up -d

# Run fabric tests against local services
FABRIC_TEST_MODE=local npm test tests/fabric/
```