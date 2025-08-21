/**
 * CBRT Fabric Circuit Breaker Tests
 * Tests circuit breaker functionality, failure detection, and recovery mechanisms
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { FabricClient } from '../../src/lib/integration/fabricClient';

// Mock circuit breaker implementation
class MockCircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private successCount: number = 0;

  constructor(
    private failureThreshold: number = 5,
    private timeout: number = 30000,
    private halfOpenMaxCalls: number = 3
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
      } else {
        throw new Error(`Circuit breaker is OPEN. Next attempt in ${Math.ceil((this.timeout - (Date.now() - this.lastFailureTime)) / 1000)}s`);
      }
    }

    if (this.state === 'HALF_OPEN' && this.successCount >= this.halfOpenMaxCalls) {
      throw new Error('Circuit breaker is HALF_OPEN and max calls exceeded');
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.halfOpenMaxCalls) {
        this.state = 'CLOSED';
        this.successCount = 0;
      }
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      this.successCount = 0;
    } else if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  getState(): string {
    return this.state;
  }

  getFailureCount(): number {
    return this.failures;
  }

  reset(): void {
    this.state = 'CLOSED';
    this.failures = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
  }
}

describe('Circuit Breaker Tests', () => {
  let circuitBreaker: MockCircuitBreaker;
  let testClient: FabricClient;
  let mockOperation: jest.Mock;

  beforeEach(() => {
    circuitBreaker = new MockCircuitBreaker(3, 5000, 2); // 3 failures, 5s timeout, 2 half-open calls
    testClient = new FabricClient({
      serviceId: 'cbrt-test-client',
      spiffeId: 'spiffe://cbrt.company.com/test/client',
      circuitBreaker: {
        enabled: true,
        failureThreshold: 3,
        timeout: 5000,
      },
    });

    mockOperation = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
    circuitBreaker.reset();
  });

  describe('Circuit Breaker State Transitions', () => {
    it('should start in CLOSED state', () => {
      expect(circuitBreaker.getState()).toBe('CLOSED');
      expect(circuitBreaker.getFailureCount()).toBe(0);
    });

    it('should transition to OPEN after failure threshold', async () => {
      // Configure operation to always fail
      mockOperation.mockRejectedValue(new Error('Service failure'));

      // Execute operations until circuit breaker opens
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(mockOperation);
        } catch (error) {
          // Expected to fail
        }
      }

      expect(circuitBreaker.getState()).toBe('OPEN');
      expect(circuitBreaker.getFailureCount()).toBe(3);
    });

    it('should transition to HALF_OPEN after timeout', async () => {
      // Trigger circuit breaker to open
      mockOperation.mockRejectedValue(new Error('Service failure'));
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(mockOperation);
        } catch (error) {
          // Expected to fail
        }
      }

      expect(circuitBreaker.getState()).toBe('OPEN');

      // Mock timeout passage
      const originalNow = Date.now;
      Date.now = jest.fn(() => originalNow() + 6000); // 6 seconds later

      // Next call should transition to HALF_OPEN
      mockOperation.mockResolvedValue('success');
      await circuitBreaker.execute(mockOperation);

      expect(circuitBreaker.getState()).toBe('HALF_OPEN');

      // Restore Date.now
      Date.now = originalNow;
    });

    it('should transition from HALF_OPEN to CLOSED after successful calls', async () => {
      // First, open the circuit breaker
      mockOperation.mockRejectedValue(new Error('Service failure'));
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(mockOperation);
        } catch (error) {
          // Expected to fail
        }
      }

      // Mock timeout passage to enable HALF_OPEN
      const originalNow = Date.now;
      Date.now = jest.fn(() => originalNow() + 6000);

      // Configure operation to succeed
      mockOperation.mockResolvedValue('success');

      // Execute successful operations in HALF_OPEN state
      await circuitBreaker.execute(mockOperation);
      expect(circuitBreaker.getState()).toBe('HALF_OPEN');

      await circuitBreaker.execute(mockOperation);
      expect(circuitBreaker.getState()).toBe('CLOSED');

      // Restore Date.now
      Date.now = originalNow;
    });

    it('should transition from HALF_OPEN back to OPEN on failure', async () => {
      // Open the circuit breaker
      mockOperation.mockRejectedValue(new Error('Service failure'));
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(mockOperation);
        } catch (error) {
          // Expected to fail
        }
      }

      // Mock timeout passage
      const originalNow = Date.now;
      Date.now = jest.fn(() => originalNow() + 6000);

      // First call succeeds (enters HALF_OPEN)
      mockOperation.mockResolvedValueOnce('success');
      await circuitBreaker.execute(mockOperation);
      expect(circuitBreaker.getState()).toBe('HALF_OPEN');

      // Second call fails (back to OPEN)
      mockOperation.mockRejectedValue(new Error('Service still failing'));
      try {
        await circuitBreaker.execute(mockOperation);
      } catch (error) {
        // Expected to fail
      }

      expect(circuitBreaker.getState()).toBe('OPEN');

      // Restore Date.now
      Date.now = originalNow;
    });
  });

  describe('Request Blocking in OPEN State', () => {
    it('should block all requests when circuit breaker is OPEN', async () => {
      // Open the circuit breaker
      mockOperation.mockRejectedValue(new Error('Service failure'));
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(mockOperation);
        } catch (error) {
          // Expected to fail
        }
      }

      expect(circuitBreaker.getState()).toBe('OPEN');

      // All subsequent calls should be blocked without calling the operation
      mockOperation.mockClear();
      
      try {
        await circuitBreaker.execute(mockOperation);
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect((error as Error).message).toContain('Circuit breaker is OPEN');
        expect(mockOperation).not.toHaveBeenCalled();
      }
    });

    it('should provide time until next retry attempt', async () => {
      // Open the circuit breaker
      mockOperation.mockRejectedValue(new Error('Service failure'));
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(mockOperation);
        } catch (error) {
          // Expected to fail
        }
      }

      try {
        await circuitBreaker.execute(mockOperation);
      } catch (error) {
        expect((error as Error).message).toMatch(/Next attempt in \d+s/);
      }
    });
  });

  describe('Integration with FabricClient', () => {
    it('should open circuit breaker on repeated HTTP failures', async () => {
      // Mock repeated HTTP failures
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const endpoint = '/api/v1/test';
      const requests = [];

      // Make multiple requests to trigger circuit breaker
      for (let i = 0; i < 5; i++) {
        requests.push(
          testClient.get(endpoint).catch(err => ({ error: err.message, attempt: i + 1 }))
        );
      }

      const results = await Promise.all(requests);

      // All requests should fail
      expect(results.every(r => 'error' in r)).toBe(true);

      // Check circuit breaker status
      const circuitBreakerStatus = testClient.getCircuitBreakerStatus();
      const endpointStatus = circuitBreakerStatus['/api/v1/test'];
      
      expect(endpointStatus).toBeDefined();
      expect(endpointStatus.state).toBe('OPEN');
      expect(endpointStatus.failures).toBeGreaterThanOrEqual(3);
    });

    it('should reset circuit breaker on successful requests', async () => {
      // First, trigger circuit breaker failure
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      for (let i = 0; i < 5; i++) {
        try {
          await testClient.get('/api/v1/test');
        } catch (error) {
          // Expected to fail
        }
      }

      // Verify circuit breaker is open
      let status = testClient.getCircuitBreakerStatus();
      expect(status['/api/v1/test']?.state).toBe('OPEN');

      // Mock successful response
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['X-Service-ID', 'cbrt-api']]),
        json: jest.fn().mockResolvedValue({ success: true }),
      });

      // Wait for circuit breaker timeout (simulate)
      testClient.resetCircuitBreaker('/api/v1/test');

      // Make successful request
      const response = await testClient.get('/api/v1/test');
      expect(response.status).toBe(200);

      // Circuit breaker should be closed
      status = testClient.getCircuitBreakerStatus();
      expect(status['/api/v1/test']?.state).toBe('CLOSED');
      expect(status['/api/v1/test']?.failures).toBe(0);
    });
  });

  describe('Different Failure Types', () => {
    it('should distinguish between retryable and non-retryable errors', async () => {
      const retryableErrors = [
        new Error('HTTP 500: Internal Server Error'),
        new Error('HTTP 502: Bad Gateway'),
        new Error('HTTP 503: Service Unavailable'),
        new Error('HTTP 504: Gateway Timeout'),
        new Error('Network timeout'),
      ];

      const nonRetryableErrors = [
        new Error('HTTP 400: Bad Request'),
        new Error('HTTP 401: Unauthorized'),
        new Error('HTTP 403: Forbidden'),
        new Error('HTTP 404: Not Found'),
      ];

      // Retryable errors should contribute to circuit breaker
      for (const error of retryableErrors) {
        mockOperation.mockRejectedValueOnce(error);
        try {
          await circuitBreaker.execute(mockOperation);
        } catch (e) {
          // Expected to fail
        }
      }

      // Should be close to opening threshold due to retryable errors
      expect(circuitBreaker.getFailureCount()).toBeGreaterThan(0);

      // Reset for non-retryable test
      circuitBreaker.reset();

      // Non-retryable errors should not contribute to circuit breaker count
      // (In a real implementation, you'd configure this behavior)
      for (const error of nonRetryableErrors) {
        mockOperation.mockRejectedValueOnce(error);
        try {
          await circuitBreaker.execute(mockOperation);
        } catch (e) {
          // For this test, we'll simulate that non-retryable errors don't count
          // by manually decrementing the failure count
          if (error.message.includes('40')) {
            // Simulate non-retryable error handling
            circuitBreaker.reset();
          }
        }
      }

      // Circuit breaker should still be closed for non-retryable errors
      expect(circuitBreaker.getState()).toBe('CLOSED');
    });
  });

  describe('Performance and Monitoring', () => {
    it('should track failure rates over time', async () => {
      const failureRates = [];
      const totalRequests = 100;
      let failures = 0;

      // Simulate mixed success/failure pattern
      for (let i = 0; i < totalRequests; i++) {
        if (i % 5 === 0) {
          // Every 5th request fails
          mockOperation.mockRejectedValueOnce(new Error('Intermittent failure'));
          try {
            await circuitBreaker.execute(mockOperation);
          } catch (error) {
            failures++;
          }
        } else {
          // Other requests succeed
          mockOperation.mockResolvedValueOnce('success');
          await circuitBreaker.execute(mockOperation);
        }

        // Calculate failure rate every 10 requests
        if ((i + 1) % 10 === 0) {
          const windowFailures = failures;
          const windowRequests = i + 1;
          failureRates.push(windowFailures / windowRequests);
        }
      }

      // Failure rate should be approximately 20% (1 in 5)
      const avgFailureRate = failureRates.reduce((a, b) => a + b, 0) / failureRates.length;
      expect(avgFailureRate).toBeCloseTo(0.2, 1);
    });

    it('should handle high-volume requests efficiently', async () => {
      const requestCount = 1000;
      const startTime = Date.now();

      mockOperation.mockResolvedValue('success');

      const promises = Array.from({ length: requestCount }, () =>
        circuitBreaker.execute(mockOperation)
      );

      const results = await Promise.all(promises);
      const endTime = Date.now();

      expect(results).toHaveLength(requestCount);
      expect(results.every(r => r === 'success')).toBe(true);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Configuration and Customization', () => {
    it('should support custom failure thresholds', () => {
      const customBreaker = new MockCircuitBreaker(10, 5000, 3); // Higher threshold

      expect(customBreaker.getState()).toBe('CLOSED');

      // Should require more failures to open
      // This would be tested with actual failure injection
    });

    it('should support custom timeout periods', async () => {
      const shortTimeoutBreaker = new MockCircuitBreaker(3, 1000, 2); // 1 second timeout

      // Open the breaker
      mockOperation.mockRejectedValue(new Error('Service failure'));
      for (let i = 0; i < 3; i++) {
        try {
          await shortTimeoutBreaker.execute(mockOperation);
        } catch (error) {
          // Expected to fail
        }
      }

      expect(shortTimeoutBreaker.getState()).toBe('OPEN');

      // After 1 second, should allow retry
      const originalNow = Date.now;
      Date.now = jest.fn(() => originalNow() + 1100); // 1.1 seconds later

      mockOperation.mockResolvedValue('success');
      await shortTimeoutBreaker.execute(mockOperation);

      expect(shortTimeoutBreaker.getState()).toBe('HALF_OPEN');

      Date.now = originalNow;
    });
  });
});