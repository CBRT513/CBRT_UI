/**
 * CBRT Fabric Rate Limiting Tests
 * Tests token bucket rate limiting, throttling, and quota enforcement
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { fabricClient, FabricClient } from '../../src/lib/integration/fabricClient';
import { fabricPolicyChecker, PolicyContext } from '../../src/lib/integration/fabricPolicyCheck';

// Mock rate limiter
class MockRateLimiter {
  private buckets: Map<string, { tokens: number; lastRefill: number; limit: number; refillRate: number }> = new Map();

  constructor(private defaultLimit: number = 100, private defaultRefillRate: number = 10) {}

  async checkRateLimit(key: string, limit?: number, refillRate?: number): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
  }> {
    const bucketLimit = limit || this.defaultLimit;
    const bucketRefillRate = refillRate || this.defaultRefillRate;
    
    let bucket = this.buckets.get(key);
    const now = Date.now();

    if (!bucket) {
      bucket = {
        tokens: bucketLimit,
        lastRefill: now,
        limit: bucketLimit,
        refillRate: bucketRefillRate,
      };
      this.buckets.set(key, bucket);
    }

    // Refill tokens based on time passed
    const timePassed = now - bucket.lastRefill;
    const tokensToAdd = Math.floor(timePassed / 1000) * bucket.refillRate;
    bucket.tokens = Math.min(bucket.limit, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    if (bucket.tokens > 0) {
      bucket.tokens--;
      return {
        allowed: true,
        remaining: bucket.tokens,
        resetTime: now + (bucket.limit - bucket.tokens) * (1000 / bucket.refillRate),
      };
    } else {
      return {
        allowed: false,
        remaining: 0,
        resetTime: now + (1000 / bucket.refillRate),
        retryAfter: Math.ceil(1000 / bucket.refillRate),
      };
    }
  }

  reset(key?: string): void {
    if (key) {
      this.buckets.delete(key);
    } else {
      this.buckets.clear();
    }
  }
}

describe('Rate Limiting Tests', () => {
  let rateLimiter: MockRateLimiter;
  let testClient: FabricClient;

  beforeEach(() => {
    rateLimiter = new MockRateLimiter();
    testClient = new FabricClient({
      serviceId: 'cbrt-test-client',
      spiffeId: 'spiffe://cbrt.company.com/test/client',
    });

    // Reset rate limiter state
    rateLimiter.reset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Token Bucket Rate Limiting', () => {
    it('should allow requests within rate limit', async () => {
      const userKey = 'user:12345';
      const limit = 10;
      const requests = 5;

      const results = [];
      for (let i = 0; i < requests; i++) {
        const result = await rateLimiter.checkRateLimit(userKey, limit, 10);
        results.push(result);
      }

      // All requests should be allowed
      expect(results.every(r => r.allowed)).toBe(true);
      
      // Token count should decrease
      expect(results[0].remaining).toBe(9); // 10 - 1
      expect(results[4].remaining).toBe(5); // 10 - 5
    });

    it('should deny requests when rate limit exceeded', async () => {
      const userKey = 'user:12345';
      const limit = 5;
      const requests = 7; // Exceed limit

      const results = [];
      for (let i = 0; i < requests; i++) {
        const result = await rateLimiter.checkRateLimit(userKey, limit, 1);
        results.push(result);
      }

      // First 5 should be allowed
      expect(results.slice(0, 5).every(r => r.allowed)).toBe(true);
      
      // Last 2 should be denied
      expect(results.slice(5).every(r => !r.allowed)).toBe(true);
      
      // Should provide retry-after information
      expect(results[5].retryAfter).toBeGreaterThan(0);
    });

    it('should refill tokens over time', async () => {
      const userKey = 'user:12345';
      const limit = 10;
      const refillRate = 5; // 5 tokens per second

      // Exhaust all tokens
      for (let i = 0; i < limit; i++) {
        await rateLimiter.checkRateLimit(userKey, limit, refillRate);
      }

      // Should be out of tokens
      let result = await rateLimiter.checkRateLimit(userKey, limit, refillRate);
      expect(result.allowed).toBe(false);

      // Wait for refill (simulate 2 seconds)
      const bucket = (rateLimiter as any).buckets.get(userKey);
      bucket.lastRefill = Date.now() - 2000; // 2 seconds ago

      // Should have refilled tokens
      result = await rateLimiter.checkRateLimit(userKey, limit, refillRate);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
    });
  });

  describe('Per-User Rate Limiting', () => {
    it('should enforce different limits for different users', async () => {
      const user1 = 'user:admin';
      const user2 = 'user:viewer';
      
      // Admin gets higher limit
      const adminLimit = 100;
      const viewerLimit = 20;

      // Test admin user
      let result = await rateLimiter.checkRateLimit(user1, adminLimit, 10);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(99);

      // Test viewer user
      result = await rateLimiter.checkRateLimit(user2, viewerLimit, 2);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(19);

      // Users should have independent buckets
      for (let i = 0; i < viewerLimit; i++) {
        await rateLimiter.checkRateLimit(user2, viewerLimit, 2);
      }

      // Viewer should be rate limited
      result = await rateLimiter.checkRateLimit(user2, viewerLimit, 2);
      expect(result.allowed).toBe(false);

      // Admin should still have tokens
      result = await rateLimiter.checkRateLimit(user1, adminLimit, 10);
      expect(result.allowed).toBe(true);
    });

    it('should handle role-based rate limits', async () => {
      const testCases = [
        { role: 'admin', limit: 100, refillRate: 20 },
        { role: 'office', limit: 50, refillRate: 10 },
        { role: 'loader', limit: 25, refillRate: 5 },
        { role: 'viewer', limit: 20, refillRate: 2 },
      ];

      for (const testCase of testCases) {
        const userKey = `user:${testCase.role}:12345`;
        
        // Make requests up to limit
        for (let i = 0; i < testCase.limit; i++) {
          const result = await rateLimiter.checkRateLimit(userKey, testCase.limit, testCase.refillRate);
          expect(result.allowed).toBe(true);
        }

        // Next request should be denied
        const result = await rateLimiter.checkRateLimit(userKey, testCase.limit, testCase.refillRate);
        expect(result.allowed).toBe(false);
      }
    });
  });

  describe('Endpoint-Specific Rate Limiting', () => {
    it('should apply different limits to different endpoints', async () => {
      const user = 'user:12345';
      const endpoints = {
        '/api/auth/login': { limit: 5, refillRate: 1 }, // Strict limit for auth
        '/api/v1/releases': { limit: 50, refillRate: 10 }, // Normal API limit
        '/health': { limit: 100, refillRate: 50 }, // High limit for health checks
      };

      for (const [endpoint, config] of Object.entries(endpoints)) {
        const key = `${user}:${endpoint}`;
        
        // Test endpoint-specific limits
        for (let i = 0; i < config.limit; i++) {
          const result = await rateLimiter.checkRateLimit(key, config.limit, config.refillRate);
          expect(result.allowed).toBe(true);
        }

        // Should be rate limited after exceeding endpoint limit
        const result = await rateLimiter.checkRateLimit(key, config.limit, config.refillRate);
        expect(result.allowed).toBe(false);
      }
    });

    it('should handle burst allowances', async () => {
      const userKey = 'user:12345';
      const sustainedLimit = 10; // 10 requests per second sustained
      const burstLimit = 20; // 20 requests burst allowance

      // Should allow burst up to burst limit
      const burstResults = [];
      for (let i = 0; i < burstLimit; i++) {
        const result = await rateLimiter.checkRateLimit(userKey, burstLimit, sustainedLimit);
        burstResults.push(result);
      }

      // All burst requests should be allowed
      expect(burstResults.every(r => r.allowed)).toBe(true);

      // Next request should be denied (burst exhausted)
      const deniedResult = await rateLimiter.checkRateLimit(userKey, burstLimit, sustainedLimit);
      expect(deniedResult.allowed).toBe(false);
    });
  });

  describe('Business Hours Rate Limiting', () => {
    it('should apply stricter limits outside business hours', async () => {
      const userKey = 'user:loader:12345';
      
      const businessHoursContext: PolicyContext = {
        user: { id: '12345', role: 'loader', permissions: [], sessionId: 'session-123' },
        request: {
          method: 'PUT',
          path: '/api/v1/releases/123/advance',
          headers: {},
          sourceIp: '192.168.1.100',
          userAgent: 'test-agent',
        },
        service: {
          sourceSpiffeId: 'spiffe://cbrt.company.com/frontend/cbrt-ui',
          targetSpiffeId: 'spiffe://cbrt.company.com/api/cbrt-backend',
          sourceService: 'cbrt-frontend',
          targetService: 'cbrt-api',
        },
        time: {
          timestamp: Date.now(),
          timezone: 'America/Chicago',
          businessHours: true, // Business hours
        },
      };

      const afterHoursContext = { ...businessHoursContext };
      afterHoursContext.time.businessHours = false;

      // Business hours - normal rate limit
      const businessHoursDecision = await fabricPolicyChecker.checkPolicy(businessHoursContext);
      expect(businessHoursDecision.allowed).toBe(true);

      // After hours - should be denied for warehouse operations
      const afterHoursDecision = await fabricPolicyChecker.checkPolicy(afterHoursContext);
      expect(afterHoursDecision.allowed).toBe(false);
      expect(afterHoursDecision.reason).toContain('business hours');
    });
  });

  describe('Rate Limit Headers', () => {
    it('should include rate limit information in response headers', async () => {
      // Mock fetch to return rate limit headers
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([
          ['X-RateLimit-Limit', '100'],
          ['X-RateLimit-Remaining', '95'],
          ['X-RateLimit-Reset', String(Date.now() + 60000)],
          ['X-Service-ID', 'cbrt-api'],
        ]),
        json: jest.fn().mockResolvedValue({ success: true }),
      });

      const response = await testClient.get('/api/v1/test');

      expect(response.headers['X-RateLimit-Limit']).toBe('100');
      expect(response.headers['X-RateLimit-Remaining']).toBe('95');
      expect(response.headers['X-RateLimit-Reset']).toBeDefined();
    });

    it('should handle 429 Too Many Requests response', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 429,
        headers: new Map([
          ['X-RateLimit-Limit', '100'],
          ['X-RateLimit-Remaining', '0'],
          ['Retry-After', '60'],
        ]),
        text: jest.fn().mockResolvedValue('Rate limit exceeded'),
      });

      await expect(testClient.get('/api/v1/test')).rejects.toThrow('HTTP 429');
    });
  });

  describe('Rate Limiting with Policy Integration', () => {
    it('should integrate rate limiting with policy decisions', async () => {
      const context: PolicyContext = {
        user: { id: '12345', role: 'viewer', permissions: ['read:releases'], sessionId: 'session-123' },
        request: {
          method: 'GET',
          path: '/api/v1/barcodes',
          headers: {},
          sourceIp: '192.168.1.100',
          userAgent: 'test-agent',
        },
        service: {
          sourceSpiffeId: 'spiffe://cbrt.company.com/frontend/cbrt-ui',
          targetSpiffeId: 'spiffe://cbrt.company.com/api/cbrt-backend',
          sourceService: 'cbrt-frontend',
          targetService: 'cbrt-api',
        },
        time: {
          timestamp: Date.now(),
          timezone: 'America/Chicago',
          businessHours: true,
        },
        rateLimit: {
          currentUsage: 150, // Over limit
          limit: 100,
          resetTime: Date.now() + 60000,
        },
      };

      const rateLimitDecision = await fabricPolicyChecker.checkRateLimit(context);
      expect(rateLimitDecision.allowed).toBe(false);
      expect(rateLimitDecision.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(rateLimitDecision.reason).toContain('Rate limit exceeded');
    });
  });

  describe('Performance and Stress Testing', () => {
    it('should handle high-volume rate limit checks efficiently', async () => {
      const userCount = 100;
      const requestsPerUser = 10;
      const startTime = Date.now();

      const promises = [];
      for (let userId = 0; userId < userCount; userId++) {
        for (let req = 0; req < requestsPerUser; req++) {
          const userKey = `user:${userId}`;
          promises.push(rateLimiter.checkRateLimit(userKey, 50, 5));
        }
      }

      const results = await Promise.all(promises);
      const endTime = Date.now();

      expect(results).toHaveLength(userCount * requestsPerUser);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should maintain accuracy under concurrent load', async () => {
      const userKey = 'user:concurrent';
      const limit = 10;
      const concurrentRequests = 20;

      const promises = Array.from({ length: concurrentRequests }, () =>
        rateLimiter.checkRateLimit(userKey, limit, 1)
      );

      const results = await Promise.all(promises);
      const allowedCount = results.filter(r => r.allowed).length;
      const deniedCount = results.filter(r => !r.allowed).length;

      // Should allow exactly the limit number of requests
      expect(allowedCount).toBeLessThanOrEqual(limit);
      expect(deniedCount).toBeGreaterThanOrEqual(concurrentRequests - limit);
      expect(allowedCount + deniedCount).toBe(concurrentRequests);
    });
  });

  describe('Circuit Breaker Integration', () => {
    it('should open circuit breaker when rate limiting fails', async () => {
      // Mock rate limiter failure
      const originalCheckRateLimit = rateLimiter.checkRateLimit;
      rateLimiter.checkRateLimit = jest.fn().mockRejectedValue(new Error('Rate limiter service unavailable'));

      // Mock fabric client to simulate repeated failures
      global.fetch = jest.fn().mockRejectedValue(new Error('Service unavailable'));

      // Make several requests to trigger circuit breaker
      const requests = [];
      for (let i = 0; i < 10; i++) {
        requests.push(
          testClient.get('/api/v1/test').catch(err => ({ error: err.message }))
        );
      }

      const results = await Promise.all(requests);
      
      // All requests should fail due to service being unavailable
      expect(results.every(r => 'error' in r)).toBe(true);

      // Check circuit breaker status
      const circuitBreakerStatus = testClient.getCircuitBreakerStatus();
      expect(Object.keys(circuitBreakerStatus)).toContain('/api/v1/test');

      // Restore original method
      rateLimiter.checkRateLimit = originalCheckRateLimit;
    });
  });
});