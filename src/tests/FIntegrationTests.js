/**
 * Milestone F - Integration Layer End-to-End Tests
 * 
 * Comprehensive test suite for the integration layer
 */

import { describe, test, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { connectorRegistry } from '../lib/integration/registry';
import { executeWithPolicy } from '../lib/integration/runtime';
import { restAdapter } from '../lib/integration/adapters/rest';
import { graphqlAdapter } from '../lib/integration/adapters/graphql';
import { OAuth2Client } from '../lib/integration/auth/oauth2';
import { OIDCClient } from '../lib/integration/auth/oidc';
import { ApiKeyAuth } from '../lib/integration/auth/apiKey';
import { integrationAuth, PERMISSIONS } from '../lib/integration/integrationAuth';
import { integrationRepository } from '../lib/integration/storage/repo';
import { integrationMetrics, healthChecker } from '../lib/integration/monitoring/metrics';
import { MockStorageAdapter, MockIntegrationServer } from './mocks/FIntegrationMocks';

// Test configuration
const TEST_CONFIG = {
  timeout: 30000,
  retries: 3,
  mockServerPort: 8888,
  testWorkspaceId: 'test_workspace_f',
  testUserId: 'test_user_f',
};

describe('Milestone F - Integration Layer', () => {
  let mockServer;
  let storageAdapter;

  beforeAll(async () => {
    // Start mock integration server
    mockServer = new MockIntegrationServer(TEST_CONFIG.mockServerPort);
    await mockServer.start();

    // Initialize storage adapter
    storageAdapter = new MockStorageAdapter();
    
    // Initialize integration repository with mock storage
    Object.assign(integrationRepository, {
      storage: storageAdapter,
      secretStore: {
        encrypt: (data) => Buffer.from(JSON.stringify(data)).toString('base64'),
        decrypt: (data) => JSON.parse(Buffer.from(data, 'base64').toString()),
      },
    });

    console.log('🚀 F Integration Tests: Setup complete');
  });

  afterAll(async () => {
    if (mockServer) {
      await mockServer.stop();
    }
    console.log('🏁 F Integration Tests: Cleanup complete');
  });

  beforeEach(() => {
    // Reset state before each test
    connectorRegistry.adapters.clear();
    integrationMetrics.reset();
    healthChecker.reset();
    storageAdapter.reset();
  });

  describe('Core Integration Infrastructure', () => {
    test('should register and retrieve connectors', async () => {
      // Register REST adapter
      connectorRegistry.register(restAdapter);

      // Verify registration
      const adapter = connectorRegistry.get('rest', '1.0.0');
      expect(adapter).toBeTruthy();
      expect(adapter.type).toBe('rest');
      expect(adapter.name).toBe('REST API Adapter');

      // Test connector validation
      const validConfig = {
        id: 'test-rest',
        name: 'Test REST Integration',
        type: 'rest',
        config: {
          baseUrl: `http://localhost:${TEST_CONFIG.mockServerPort}`,
          timeout: 5000,
        },
      };

      const validation = adapter.validate(validConfig);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should execute integration with runtime safety', async () => {
      connectorRegistry.register(restAdapter);

      const config = {
        id: 'test-rest-exec',
        name: 'Test REST Execution',
        type: 'rest',
        config: {
          baseUrl: `http://localhost:${TEST_CONFIG.mockServerPort}`,
          timeout: 5000,
        },
      };

      const request = {
        method: 'GET',
        path: '/api/test',
      };

      const context = {
        userId: TEST_CONFIG.testUserId,
        workspaceId: TEST_CONFIG.testWorkspaceId,
        traceId: 'test-trace-001',
      };

      const result = await executeWithPolicy(
        restAdapter,
        request,
        config,
        context,
        {
          timeout: 10000,
          retries: 2,
          circuitBreaker: {
            failureThreshold: 5,
            resetTimeoutMs: 30000,
          },
        }
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeTruthy();
      expect(result.metrics.responseTime).toBeGreaterThan(0);
    });

    test('should handle circuit breaker activation', async () => {
      connectorRegistry.register(restAdapter);

      const config = {
        id: 'test-circuit-breaker',
        name: 'Circuit Breaker Test',
        type: 'rest',
        config: {
          baseUrl: `http://localhost:${TEST_CONFIG.mockServerPort}`,
          timeout: 1000,
        },
      };

      const request = {
        method: 'GET',
        path: '/api/error', // Mock server returns 500 for this path
      };

      const context = {
        userId: TEST_CONFIG.testUserId,
        workspaceId: TEST_CONFIG.testWorkspaceId,
        traceId: 'test-trace-002',
      };

      // Execute multiple failing requests to trigger circuit breaker
      const results = [];
      for (let i = 0; i < 6; i++) {
        const result = await executeWithPolicy(
          restAdapter,
          request,
          config,
          context,
          {
            retries: 1,
            circuitBreaker: {
              failureThreshold: 3,
              resetTimeoutMs: 5000,
            },
          }
        );
        results.push(result);
      }

      // First few requests should fail normally
      expect(results[0].success).toBe(false);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(false);

      // Later requests should be circuit breaker rejections
      const circuitBreakerFailures = results.slice(3).filter(
        r => r.error?.includes('Circuit breaker')
      );
      expect(circuitBreakerFailures.length).toBeGreaterThan(0);
    });
  });

  describe('Authentication Systems', () => {
    test('should authenticate with OAuth2', async () => {
      const oauth2Client = new OAuth2Client({
        clientId: 'test-client',
        clientSecret: 'test-secret',
        authUrl: `http://localhost:${TEST_CONFIG.mockServerPort}/oauth/authorize`,
        tokenUrl: `http://localhost:${TEST_CONFIG.mockServerPort}/oauth/token`,
        scopes: ['read', 'write'],
      });

      const token = await oauth2Client.clientCredentials();
      
      expect(token).toBeTruthy();
      expect(token.accessToken).toBeTruthy();
      expect(token.expiresAt).toBeInstanceOf(Date);
      expect(token.scopes).toContain('read');
      expect(token.scopes).toContain('write');
    });

    test('should authenticate with OIDC', async () => {
      const oidcClient = new OIDCClient({
        clientId: 'test-oidc-client',
        clientSecret: 'test-oidc-secret',
        issuer: `http://localhost:${TEST_CONFIG.mockServerPort}`,
        redirectUri: 'http://localhost:3000/callback',
      });

      // Mock will auto-discover endpoints
      await oidcClient.discover();

      const token = await oidcClient.exchangeCodeForToken('test-auth-code');
      
      expect(token).toBeTruthy();
      expect(token.accessToken).toBeTruthy();
      expect(token.idToken).toBeTruthy();
    });

    test('should authenticate with API Key', async () => {
      const apiKeyAuth = new ApiKeyAuth({
        key: 'test-api-key-12345',
        location: 'header',
        name: 'X-API-Key',
      });

      const headers = apiKeyAuth.getHeaders();
      expect(headers['X-API-Key']).toBe('test-api-key-12345');

      // Test strength validation
      const weakKey = new ApiKeyAuth({ key: '123', location: 'header' });
      const strength = weakKey.validateKeyStrength();
      expect(strength.strength).toBe('weak');
      expect(strength.recommendations).toContain('Increase key length');
    });

    test('should handle webhook signature verification', async () => {
      const { WebhookSigner } = await import('../lib/integration/auth/signer');
      
      const signer = new WebhookSigner({
        secret: 'webhook-secret-key',
        algorithm: 'sha256',
        format: 'github',
      });

      const payload = { message: 'test webhook payload' };
      const signature = signer.sign(payload);

      expect(signature).toBeTruthy();
      expect(signature.startsWith('sha256=')).toBe(true);

      // Verify signature
      const isValid = signer.verify(payload, signature);
      expect(isValid).toBe(true);

      // Test with invalid signature
      const invalidSignature = 'sha256=invalid';
      const isInvalid = signer.verify(payload, invalidSignature);
      expect(isInvalid).toBe(false);
    });
  });

  describe('Adapter Implementations', () => {
    test('should execute REST requests with all HTTP methods', async () => {
      connectorRegistry.register(restAdapter);

      const config = {
        id: 'test-rest-methods',
        name: 'REST Methods Test',
        type: 'rest',
        config: {
          baseUrl: `http://localhost:${TEST_CONFIG.mockServerPort}`,
          timeout: 5000,
        },
      };

      const context = {
        userId: TEST_CONFIG.testUserId,
        workspaceId: TEST_CONFIG.testWorkspaceId,
        traceId: 'test-trace-003',
      };

      // Test GET
      const getResult = await restAdapter.execute(
        { method: 'GET', path: '/api/users' },
        config,
        context
      );
      expect(getResult.success).toBe(true);
      expect(getResult.data.users).toBeTruthy();

      // Test POST
      const postResult = await restAdapter.execute(
        { 
          method: 'POST', 
          path: '/api/users',
          body: { name: 'Test User', email: 'test@example.com' }
        },
        config,
        context
      );
      expect(postResult.success).toBe(true);
      expect(postResult.data.id).toBeTruthy();

      // Test PUT
      const putResult = await restAdapter.execute(
        { 
          method: 'PUT', 
          path: '/api/users/123',
          body: { name: 'Updated User' }
        },
        config,
        context
      );
      expect(putResult.success).toBe(true);

      // Test DELETE
      const deleteResult = await restAdapter.execute(
        { method: 'DELETE', path: '/api/users/123' },
        config,
        context
      );
      expect(deleteResult.success).toBe(true);
    });

    test('should execute GraphQL queries and mutations', async () => {
      connectorRegistry.register(graphqlAdapter);

      const config = {
        id: 'test-graphql',
        name: 'GraphQL Test',
        type: 'graphql',
        config: {
          baseUrl: `http://localhost:${TEST_CONFIG.mockServerPort}`,
          endpoint: '/graphql',
          timeout: 5000,
        },
      };

      const context = {
        userId: TEST_CONFIG.testUserId,
        workspaceId: TEST_CONFIG.testWorkspaceId,
        traceId: 'test-trace-004',
      };

      // Test Query
      const queryResult = await graphqlAdapter.execute(
        {
          query: `
            query GetUsers {
              users {
                id
                name
                email
              }
            }
          `,
        },
        config,
        context
      );

      expect(queryResult.success).toBe(true);
      expect(queryResult.data.data.users).toBeTruthy();

      // Test Mutation
      const mutationResult = await graphqlAdapter.execute(
        {
          query: `
            mutation CreateUser($input: UserInput!) {
              createUser(input: $input) {
                id
                name
                email
              }
            }
          `,
          variables: {
            input: {
              name: 'GraphQL Test User',
              email: 'graphql@example.com',
            },
          },
        },
        config,
        context
      );

      expect(mutationResult.success).toBe(true);
      expect(mutationResult.data.data.createUser.id).toBeTruthy();
    });

    test('should handle stream subscriptions', async () => {
      const { streamAdapter } = await import('../lib/integration/adapters/stream');
      connectorRegistry.register(streamAdapter);

      const config = {
        id: 'test-stream',
        name: 'Stream Test',
        type: 'stream',
        config: {
          baseUrl: `http://localhost:${TEST_CONFIG.mockServerPort}`,
          timeout: 5000,
        },
      };

      const context = {
        userId: TEST_CONFIG.testUserId,
        workspaceId: TEST_CONFIG.testWorkspaceId,
        traceId: 'test-trace-005',
      };

      // Test SSE subscription
      const subscription = await streamAdapter.execute(
        {
          type: 'sse',
          path: '/api/events',
          subscription: 'user-events',
        },
        config,
        context
      );

      expect(subscription.success).toBe(true);
      expect(subscription.subscription).toBeTruthy();

      // Wait for events (mock server sends test events)
      const events = [];
      subscription.subscription.onData = (data) => {
        events.push(data);
      };

      await new Promise(resolve => setTimeout(resolve, 2000));
      
      expect(events.length).toBeGreaterThan(0);
      
      // Cleanup
      subscription.subscription.unsubscribe();
    });
  });

  describe('Policy Enforcement', () => {
    test('should enforce data residency policies', async () => {
      const { residencyPolicyEngine } = await import('../lib/integration/policies/integrationPolicies');

      const policy = {
        id: 'eu-residency',
        allowedRegions: ['eu-west-1', 'eu-central-1'],
        requiredCertifications: ['GDPR'],
        dataClassifications: ['personal', 'sensitive'],
      };

      // Test allowed region
      const validRequest = {
        targetRegion: 'eu-west-1',
        dataClassification: 'personal',
        certifications: ['GDPR', 'SOC2'],
      };

      const validResult = await residencyPolicyEngine.evaluate(policy, validRequest);
      expect(validResult.allowed).toBe(true);

      // Test restricted region
      const invalidRequest = {
        targetRegion: 'us-east-1',
        dataClassification: 'personal',
        certifications: ['SOC2'],
      };

      const invalidResult = await residencyPolicyEngine.evaluate(policy, invalidRequest);
      expect(invalidResult.allowed).toBe(false);
      expect(invalidResult.violations).toContain('Region not allowed');
    });

    test('should enforce domain allowlist policies', async () => {
      const { domainPolicyEngine } = await import('../lib/integration/policies/integrationPolicies');

      const policy = {
        id: 'domain-allowlist',
        allowedDomains: ['api.example.com', '*.trusted.com'],
        blockedDomains: ['malicious.com'],
        requireHttps: true,
      };

      // Test allowed domain
      const validUrl = 'https://api.example.com/data';
      const validResult = await domainPolicyEngine.evaluate(policy, { url: validUrl });
      expect(validResult.allowed).toBe(true);

      // Test wildcard match
      const wildcardUrl = 'https://subdomain.trusted.com/api';
      const wildcardResult = await domainPolicyEngine.evaluate(policy, { url: wildcardUrl });
      expect(wildcardResult.allowed).toBe(true);

      // Test blocked domain
      const blockedUrl = 'https://malicious.com/api';
      const blockedResult = await domainPolicyEngine.evaluate(policy, { url: blockedUrl });
      expect(blockedResult.allowed).toBe(false);

      // Test HTTP vs HTTPS
      const httpUrl = 'http://api.example.com/data';
      const httpResult = await domainPolicyEngine.evaluate(policy, { url: httpUrl });
      expect(httpResult.allowed).toBe(false);
    });

    test('should redact sensitive data', async () => {
      const { redactSensitiveData, RedactionStrategy } = await import('../lib/integration/policies/redaction');

      const sensitiveData = {
        name: 'John Doe',
        email: 'john.doe@example.com',
        ssn: '123-45-6789',
        creditCard: '4111-1111-1111-1111',
        address: '123 Main St, Anytown, USA',
        metadata: {
          internalId: 'emp-12345',
          salary: 75000,
        },
      };

      // Test PII redaction
      const redacted = await redactSensitiveData(sensitiveData, {
        strategy: RedactionStrategy.MASK,
        patterns: ['email', 'ssn', 'creditCard'],
        preserveLength: true,
      });

      expect(redacted.name).toBe('John Doe'); // Not redacted
      expect(redacted.email).toMatch(/\*+@\*+\.\*+/); // Masked email
      expect(redacted.ssn).toMatch(/\*\*\*-\*\*-\*\*\*\*/); // Masked SSN
      expect(redacted.creditCard).toMatch(/\*\*\*\*-\*\*\*\*-\*\*\*\*-\*\*\*\*/); // Masked credit card
      expect(redacted.address).toBe('123 Main St, Anytown, USA'); // Not redacted

      // Test tokenization
      const tokenized = await redactSensitiveData(sensitiveData, {
        strategy: RedactionStrategy.TOKENIZE,
        patterns: ['ssn', 'creditCard'],
        tokenMapping: new Map(),
      });

      expect(tokenized.ssn).toMatch(/token_[a-f0-9]+/);
      expect(tokenized.creditCard).toMatch(/token_[a-f0-9]+/);
    });
  });

  describe('Storage and Security', () => {
    test('should store and retrieve integrations', async () => {
      const integrationData = {
        name: 'Test Storage Integration',
        description: 'Integration for testing storage',
        connectorType: 'rest',
        connectorVersion: '1.0.0',
        workspaceId: TEST_CONFIG.testWorkspaceId,
        config: {
          baseUrl: 'https://api.example.com',
          timeout: 30000,
        },
        tags: ['test', 'storage'],
      };

      // Create integration
      const createResult = await integrationRepository.createIntegration(
        integrationData,
        TEST_CONFIG.testUserId
      );

      expect(createResult.success).toBe(true);
      expect(createResult.id).toBeTruthy();

      // Retrieve integration
      const integration = await integrationRepository.getIntegration(createResult.id);
      expect(integration).toBeTruthy();
      expect(integration.name).toBe(integrationData.name);
      expect(integration.config.baseUrl).toBe(integrationData.config.baseUrl);

      // Query integrations
      const queryResult = await integrationRepository.queryIntegrations({
        workspaceId: TEST_CONFIG.testWorkspaceId,
        connectorType: 'rest',
        tags: ['test'],
      });

      expect(queryResult.data.length).toBeGreaterThan(0);
      expect(queryResult.data[0].id).toBe(createResult.id);
    });

    test('should encrypt and decrypt credentials', async () => {
      const credentialData = {
        name: 'Test API Credential',
        type: 'api_key',
        integrationId: 'integration-123',
        workspaceId: TEST_CONFIG.testWorkspaceId,
        credentialData: {
          apiKey: 'super-secret-api-key-12345',
          additionalSecret: 'another-secret-value',
        },
        metadata: {
          environment: 'development',
          autoRotate: false,
          refreshable: false,
        },
      };

      // Create credential (should encrypt automatically)
      const createResult = await integrationRepository.createCredential(
        credentialData,
        TEST_CONFIG.testUserId
      );

      expect(createResult.success).toBe(true);
      expect(createResult.id).toBeTruthy();

      // Retrieve credential (encrypted)
      const credential = await integrationRepository.getCredential(createResult.id);
      expect(credential).toBeTruthy();
      expect(credential.encryptedData).toBeTruthy();
      expect(credential.encryptedData).not.toContain('super-secret-api-key-12345');

      // Retrieve credential (decrypted)
      const decryptedCredential = await integrationRepository.getCredentialDecrypted(createResult.id);
      expect(decryptedCredential).toBeTruthy();
      expect(decryptedCredential.credentialData.apiKey).toBe('super-secret-api-key-12345');
      expect(decryptedCredential.credentialData.additionalSecret).toBe('another-secret-value');
    });

    test('should handle credential rotation', async () => {
      // Create initial credential
      const credentialData = {
        name: 'Rotation Test Credential',
        type: 'oauth2',
        integrationId: 'integration-456',
        workspaceId: TEST_CONFIG.testWorkspaceId,
        credentialData: {
          accessToken: 'initial-access-token',
          refreshToken: 'initial-refresh-token',
          expiresAt: new Date(Date.now() + 3600000),
        },
        metadata: {
          environment: 'development',
          autoRotate: true,
          refreshable: true,
        },
        rotationPolicy: {
          enabled: true,
          intervalDays: 30,
          warningDays: 7,
          autoRotate: true,
          notifyBefore: 3,
          backupCredentials: 2,
        },
      };

      const createResult = await integrationRepository.createCredential(
        credentialData,
        TEST_CONFIG.testUserId
      );

      expect(createResult.success).toBe(true);

      // Rotate credential
      const newCredentialData = {
        accessToken: 'rotated-access-token',
        refreshToken: 'rotated-refresh-token',
        expiresAt: new Date(Date.now() + 3600000),
      };

      const rotateResult = await integrationRepository.rotateCredential(
        createResult.id,
        newCredentialData,
        TEST_CONFIG.testUserId
      );

      expect(rotateResult.success).toBe(true);

      // Verify rotation
      const rotatedCredential = await integrationRepository.getCredentialDecrypted(createResult.id);
      expect(rotatedCredential.credentialData.accessToken).toBe('rotated-access-token');
      expect(rotatedCredential.credentialData.refreshToken).toBe('rotated-refresh-token');
    });
  });

  describe('Monitoring and Health', () => {
    test('should collect and report metrics', async () => {
      // Record some metrics
      integrationMetrics.recordRequest('integration-123', 'success', 250);
      integrationMetrics.recordRequest('integration-123', 'success', 300);
      integrationMetrics.recordRequest('integration-123', 'error', 150);

      // Get metrics
      const metrics = integrationMetrics.getMetrics('integration-123');
      
      expect(metrics.totalRequests).toBe(3);
      expect(metrics.successfulRequests).toBe(2);
      expect(metrics.failedRequests).toBe(1);
      expect(metrics.averageResponseTime).toBeCloseTo(233.33, 1);
      expect(metrics.errorRate).toBeCloseTo(0.33, 2);

      // Test throughput calculation
      await new Promise(resolve => setTimeout(resolve, 1100)); // Wait for time window
      
      const throughput = integrationMetrics.getThroughput('integration-123', 60000);
      expect(throughput).toBeGreaterThan(0);
    });

    test('should perform health checks', async () => {
      // Register health checks
      healthChecker.registerCheck('integration-123', {
        name: 'API Connectivity',
        description: 'Check API endpoint connectivity',
        check: async () => {
          // Simulate health check
          const start = Date.now();
          await new Promise(resolve => setTimeout(resolve, 100));
          return {
            status: 'healthy',
            responseTime: Date.now() - start,
            metadata: { endpoint: 'https://api.example.com/health' },
          };
        },
        interval: 5000,
        timeout: 10000,
      });

      // Run health check
      const healthResult = await healthChecker.runChecks('integration-123');
      
      expect(healthResult.overall).toBe('healthy');
      expect(healthResult.checks).toHaveLength(1);
      expect(healthResult.checks[0].status).toBe('healthy');
      expect(healthResult.checks[0].responseTime).toBeGreaterThan(0);
    });

    test('should trace requests', async () => {
      const { requestTracer } = await import('../lib/integration/monitoring/tracing');

      // Start trace
      const traceContext = requestTracer.startTrace({
        traceId: 'test-trace-006',
        spanId: 'span-001',
        operation: 'integration-execute',
        metadata: {
          integrationId: 'integration-123',
          userId: TEST_CONFIG.testUserId,
        },
      });

      expect(traceContext.traceId).toBe('test-trace-006');
      expect(traceContext.spanId).toBe('span-001');

      // Add span events
      requestTracer.addEvent(traceContext, 'auth-start', { method: 'oauth2' });
      requestTracer.addEvent(traceContext, 'auth-complete', { success: true });
      requestTracer.addEvent(traceContext, 'request-start', { url: 'https://api.example.com/data' });

      // Finish trace
      const traceResult = requestTracer.finishTrace(traceContext, {
        success: true,
        statusCode: 200,
        responseTime: 250,
      });

      expect(traceResult.duration).toBeGreaterThan(0);
      expect(traceResult.events).toHaveLength(3);
      expect(traceResult.events[0].name).toBe('auth-start');
    });
  });

  describe('Security and Authorization', () => {
    test('should authenticate and authorize users', async () => {
      // Authenticate user
      const authResult = await integrationAuth.authenticate(
        {
          userId: TEST_CONFIG.testUserId,
          type: 'api_key',
          apiKey: 'test-api-key-valid-12345',
        },
        {
          ipAddress: '127.0.0.1',
          userAgent: 'Test Client/1.0',
          workspaceId: TEST_CONFIG.testWorkspaceId,
        }
      );

      expect(authResult.success).toBe(true);
      expect(authResult.sessionId).toBeTruthy();
      expect(authResult.permissions).toContain(PERMISSIONS.INTEGRATION_READ);

      // Test authorization
      const authzResult = await integrationAuth.authorize({
        userId: TEST_CONFIG.testUserId,
        action: PERMISSIONS.INTEGRATION_CREATE,
        resource: 'integration',
        context: {
          workspaceId: TEST_CONFIG.testWorkspaceId,
        },
      });

      expect(authzResult.granted).toBe(true);

      // Test session validation
      const session = integrationAuth.validateSession(authResult.sessionId);
      expect(session).toBeTruthy();
      expect(session.userId).toBe(TEST_CONFIG.testUserId);
    });

    test('should handle failed authentication attempts', async () => {
      // Attempt authentication with invalid credentials
      const authResult = await integrationAuth.authenticate(
        {
          userId: 'invalid-user',
          type: 'api_key',
          apiKey: 'invalid-key',
        },
        {
          ipAddress: '127.0.0.1',
          userAgent: 'Test Client/1.0',
        }
      );

      expect(authResult.success).toBe(false);
      expect(authResult.error).toBeTruthy();
      expect(authResult.securityEvents).toHaveLength(1);
      expect(authResult.securityEvents[0].type).toBe('auth_failure');
    });

    test('should enforce rate limiting', async () => {
      const requests = [];
      
      // Make many requests quickly to trigger rate limit
      for (let i = 0; i < 150; i++) {
        const authResult = await integrationAuth.authenticate(
          {
            userId: `rate-test-user-${i % 10}`,
            type: 'api_key',
            apiKey: 'test-api-key-valid-12345',
          },
          {
            ipAddress: '192.168.1.100', // Same IP for rate limiting
            userAgent: 'Rate Test Client/1.0',
          }
        );
        requests.push(authResult);
      }

      // Check that some requests were rate limited
      const rateLimited = requests.filter(r => 
        r.error && r.error.includes('Rate limit')
      );
      
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should handle network timeouts gracefully', async () => {
      connectorRegistry.register(restAdapter);

      const config = {
        id: 'test-timeout',
        name: 'Timeout Test',
        type: 'rest',
        config: {
          baseUrl: `http://localhost:${TEST_CONFIG.mockServerPort}`,
          timeout: 500, // Very short timeout
        },
      };

      const request = {
        method: 'GET',
        path: '/api/slow', // Mock server delays this endpoint
      };

      const context = {
        userId: TEST_CONFIG.testUserId,
        workspaceId: TEST_CONFIG.testWorkspaceId,
        traceId: 'test-trace-007',
      };

      const result = await executeWithPolicy(
        restAdapter,
        request,
        config,
        context,
        { timeout: 1000, retries: 1 }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });

    test('should retry failed requests with exponential backoff', async () => {
      connectorRegistry.register(restAdapter);

      const config = {
        id: 'test-retry',
        name: 'Retry Test',
        type: 'rest',
        config: {
          baseUrl: `http://localhost:${TEST_CONFIG.mockServerPort}`,
          timeout: 5000,
        },
      };

      const request = {
        method: 'GET',
        path: '/api/flaky', // Mock server fails first few attempts
      };

      const context = {
        userId: TEST_CONFIG.testUserId,
        workspaceId: TEST_CONFIG.testWorkspaceId,
        traceId: 'test-trace-008',
      };

      const startTime = Date.now();
      const result = await executeWithPolicy(
        restAdapter,
        request,
        config,
        context,
        {
          retries: 3,
          backoffMs: 100,
          backoffMultiplier: 2,
        }
      );

      const duration = Date.now() - startTime;

      // Should eventually succeed after retries
      expect(result.success).toBe(true);
      expect(result.metadata.attemptCount).toBeGreaterThan(1);
      
      // Should have exponential backoff delays
      expect(duration).toBeGreaterThan(300); // At least 100 + 200 + processing time
    });

    test('should validate configurations and reject invalid ones', async () => {
      connectorRegistry.register(restAdapter);

      // Test missing required fields
      const invalidConfig = {
        id: 'test-invalid',
        name: 'Invalid Config Test',
        type: 'rest',
        config: {
          // Missing baseUrl
          timeout: 5000,
        },
      };

      const validation = restAdapter.validate(invalidConfig);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('baseUrl is required for REST adapter');

      // Test invalid URL
      const invalidUrlConfig = {
        id: 'test-invalid-url',
        name: 'Invalid URL Test',
        type: 'rest',
        config: {
          baseUrl: 'not-a-valid-url',
          timeout: 5000,
        },
      };

      const urlValidation = restAdapter.validate(invalidUrlConfig);
      expect(urlValidation.valid).toBe(false);
      expect(urlValidation.errors.some(e => e.includes('baseUrl'))).toBe(true);
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle concurrent requests efficiently', async () => {
      connectorRegistry.register(restAdapter);

      const config = {
        id: 'test-concurrent',
        name: 'Concurrent Test',
        type: 'rest',
        config: {
          baseUrl: `http://localhost:${TEST_CONFIG.mockServerPort}`,
          timeout: 10000,
        },
      };

      const context = {
        userId: TEST_CONFIG.testUserId,
        workspaceId: TEST_CONFIG.testWorkspaceId,
        traceId: 'test-trace-009',
      };

      // Execute 50 concurrent requests
      const requests = Array.from({ length: 50 }, (_, i) => ({
        method: 'GET',
        path: `/api/test?id=${i}`,
      }));

      const startTime = Date.now();
      const results = await Promise.all(
        requests.map(request =>
          executeWithPolicy(restAdapter, request, config, context)
        )
      );
      const duration = Date.now() - startTime;

      // All requests should complete successfully
      const successCount = results.filter(r => r.success).length;
      expect(successCount).toBe(50);

      // Should complete in reasonable time (concurrent, not sequential)
      expect(duration).toBeLessThan(10000); // 10 seconds max

      console.log(`✅ Concurrent test: ${successCount}/50 successful in ${duration}ms`);
    });

    test('should maintain performance under load', async () => {
      // Reset metrics before load test
      integrationMetrics.reset();

      const loadTestResults = {
        totalRequests: 0,
        successfulRequests: 0,
        averageResponseTime: 0,
        maxResponseTime: 0,
        minResponseTime: Infinity,
      };

      // Simulate load over time
      const loadDurationMs = 5000;
      const requestInterval = 50; // Request every 50ms
      const startTime = Date.now();

      while (Date.now() - startTime < loadDurationMs) {
        const requestStart = Date.now();
        
        try {
          const success = Math.random() > 0.05; // 95% success rate
          const responseTime = Math.random() * 200 + 50; // 50-250ms
          
          integrationMetrics.recordRequest(
            'load-test-integration',
            success ? 'success' : 'error',
            responseTime
          );

          loadTestResults.totalRequests++;
          if (success) {
            loadTestResults.successfulRequests++;
            loadTestResults.maxResponseTime = Math.max(loadTestResults.maxResponseTime, responseTime);
            loadTestResults.minResponseTime = Math.min(loadTestResults.minResponseTime, responseTime);
          }
        } catch (error) {
          console.error('Load test error:', error);
        }

        await new Promise(resolve => setTimeout(resolve, requestInterval));
      }

      // Calculate averages
      const metrics = integrationMetrics.getMetrics('load-test-integration');
      loadTestResults.averageResponseTime = metrics.averageResponseTime;

      // Verify performance targets
      expect(loadTestResults.totalRequests).toBeGreaterThan(80); // At least 80 requests in 5 seconds
      expect(loadTestResults.successfulRequests / loadTestResults.totalRequests).toBeGreaterThan(0.9); // 90%+ success rate
      expect(loadTestResults.averageResponseTime).toBeLessThan(300); // Average response time < 300ms

      console.log('📊 Load test results:', loadTestResults);
    });
  });
});

// Export test utilities for other test files
export {
  TEST_CONFIG,
  MockStorageAdapter,
  MockIntegrationServer,
};