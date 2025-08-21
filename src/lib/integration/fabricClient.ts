/**
 * CBRT Fabric Client
 * Provides integration with the service mesh fabric for secure, monitored API calls
 */

import { logger } from '../../utils/logger';

// Types
export interface FabricRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
  circuitBreaker?: boolean;
}

export interface FabricResponse<T = any> {
  data: T;
  status: number;
  headers: Record<string, string>;
  traceId: string;
  requestId: string;
  fabricMetadata: {
    serviceId: string;
    policyDecision: string;
    rateLimitRemaining: number;
    upstreamServiceTime: number;
  };
}

export interface FabricError extends Error {
  status: number;
  code: string;
  traceId: string;
  requestId: string;
  retryable: boolean;
}

// Configuration
interface FabricConfig {
  serviceId: string;
  spiffeId: string;
  traceHeaders: boolean;
  rateLimitHeaders: boolean;
  circuitBreaker: {
    enabled: boolean;
    failureThreshold: number;
    timeout: number;
  };
  retry: {
    maxRetries: number;
    backoffMultiplier: number;
    maxBackoffMs: number;
  };
}

// Circuit breaker state
interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

class FabricClient {
  private config: FabricConfig;
  private circuitBreakerStates: Map<string, CircuitBreakerState> = new Map();
  private rateLimitTokens: Map<string, { count: number; lastRefill: number }> = new Map();

  constructor(config: Partial<FabricConfig> = {}) {
    this.config = {
      serviceId: 'cbrt-frontend',
      spiffeId: 'spiffe://cbrt.company.com/frontend/cbrt-ui',
      traceHeaders: true,
      rateLimitHeaders: true,
      circuitBreaker: {
        enabled: true,
        failureThreshold: 5,
        timeout: 30000,
      },
      retry: {
        maxRetries: 3,
        backoffMultiplier: 2,
        maxBackoffMs: 5000,
      },
      ...config,
    };

    // Initialize circuit breaker for each service endpoint
    this.initializeCircuitBreakers();
  }

  /**
   * Make a fabric-aware HTTP request
   */
  async request<T = any>(request: FabricRequest): Promise<FabricResponse<T>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    const traceId = this.generateTraceId();

    try {
      // Check circuit breaker
      if (request.circuitBreaker !== false && this.config.circuitBreaker.enabled) {
        this.checkCircuitBreaker(request.url);
      }

      // Prepare headers with fabric metadata
      const headers = this.prepareHeaders(request.headers, traceId, requestId);

      // Execute request with retries
      const response = await this.executeWithRetries(request, headers, traceId, requestId);

      // Update circuit breaker on success
      this.recordSuccess(request.url);

      // Log successful request
      logger.info('Fabric request successful', {
        method: request.method,
        url: request.url,
        status: response.status,
        duration: Date.now() - startTime,
        traceId,
        requestId,
        fabricMetadata: response.fabricMetadata,
      });

      return response;

    } catch (error) {
      // Update circuit breaker on failure
      this.recordFailure(request.url);

      // Create fabric error
      const fabricError = this.createFabricError(error, traceId, requestId);

      // Log failed request
      logger.error('Fabric request failed', {
        method: request.method,
        url: request.url,
        error: fabricError.message,
        status: fabricError.status,
        code: fabricError.code,
        duration: Date.now() - startTime,
        traceId,
        requestId,
        retryable: fabricError.retryable,
      });

      throw fabricError;
    }
  }

  /**
   * Convenience methods for common HTTP verbs
   */
  async get<T = any>(url: string, options: Omit<FabricRequest, 'method' | 'url'> = {}): Promise<FabricResponse<T>> {
    return this.request<T>({ method: 'GET', url, ...options });
  }

  async post<T = any>(url: string, body?: any, options: Omit<FabricRequest, 'method' | 'url' | 'body'> = {}): Promise<FabricResponse<T>> {
    return this.request<T>({ method: 'POST', url, body, ...options });
  }

  async put<T = any>(url: string, body?: any, options: Omit<FabricRequest, 'method' | 'url' | 'body'> = {}): Promise<FabricResponse<T>> {
    return this.request<T>({ method: 'PUT', url, body, ...options });
  }

  async delete<T = any>(url: string, options: Omit<FabricRequest, 'method' | 'url'> = {}): Promise<FabricResponse<T>> {
    return this.request<T>({ method: 'DELETE', url, ...options });
  }

  /**
   * Initialize circuit breakers for known service endpoints
   */
  private initializeCircuitBreakers(): void {
    const endpoints = [
      '/api/v1/releases',
      '/api/v1/customers',
      '/api/v1/suppliers',
      '/api/v1/barcodes',
      '/api/v1/warehouse',
      '/api/auth',
    ];

    endpoints.forEach(endpoint => {
      this.circuitBreakerStates.set(endpoint, {
        failures: 0,
        lastFailureTime: 0,
        state: 'CLOSED',
      });
    });
  }

  /**
   * Check circuit breaker state and throw if open
   */
  private checkCircuitBreaker(url: string): void {
    const endpoint = this.getEndpointKey(url);
    const state = this.circuitBreakerStates.get(endpoint);

    if (!state) return;

    const now = Date.now();

    switch (state.state) {
      case 'OPEN':
        if (now - state.lastFailureTime > this.config.circuitBreaker.timeout) {
          state.state = 'HALF_OPEN';
          logger.info('Circuit breaker transitioning to HALF_OPEN', { endpoint });
        } else {
          throw new Error(`Circuit breaker OPEN for ${endpoint}`);
        }
        break;

      case 'HALF_OPEN':
        // Allow one request through
        break;

      case 'CLOSED':
        // Normal operation
        break;
    }
  }

  /**
   * Record successful request for circuit breaker
   */
  private recordSuccess(url: string): void {
    const endpoint = this.getEndpointKey(url);
    const state = this.circuitBreakerStates.get(endpoint);

    if (state) {
      state.failures = 0;
      state.state = 'CLOSED';
    }
  }

  /**
   * Record failed request for circuit breaker
   */
  private recordFailure(url: string): void {
    const endpoint = this.getEndpointKey(url);
    const state = this.circuitBreakerStates.get(endpoint);

    if (state) {
      state.failures++;
      state.lastFailureTime = Date.now();

      if (state.failures >= this.config.circuitBreaker.failureThreshold) {
        state.state = 'OPEN';
        logger.warn('Circuit breaker opened', { 
          endpoint, 
          failures: state.failures,
          threshold: this.config.circuitBreaker.failureThreshold 
        });
      }
    }
  }

  /**
   * Prepare headers with fabric metadata
   */
  private prepareHeaders(userHeaders: Record<string, string> = {}, traceId: string, requestId: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...userHeaders,
    };

    // Add fabric headers
    if (this.config.traceHeaders) {
      headers['X-Trace-Id'] = traceId;
      headers['X-Request-Id'] = requestId;
      headers['X-Service-Id'] = this.config.serviceId;
      headers['X-SPIFFE-ID'] = this.config.spiffeId;
    }

    // Add authentication headers if available
    const authToken = this.getAuthToken();
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    // Add user context if available
    const userContext = this.getUserContext();
    if (userContext) {
      headers['X-User-ID'] = userContext.id;
      headers['X-User-Role'] = userContext.role;
    }

    return headers;
  }

  /**
   * Execute request with retry logic
   */
  private async executeWithRetries<T>(
    request: FabricRequest,
    headers: Record<string, string>,
    traceId: string,
    requestId: string
  ): Promise<FabricResponse<T>> {
    const maxRetries = request.retries ?? this.config.retry.maxRetries;
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Add attempt number to headers
        headers['X-Attempt'] = (attempt + 1).toString();

        // Execute the actual HTTP request
        const response = await this.executeHttpRequest(request, headers);

        return this.processFabricResponse<T>(response, traceId, requestId);

      } catch (error) {
        lastError = error as Error;

        // Don't retry on certain error types
        if (!this.shouldRetry(error as Error, attempt, maxRetries)) {
          throw error;
        }

        // Calculate backoff delay
        if (attempt < maxRetries) {
          const delay = this.calculateBackoffDelay(attempt);
          logger.info('Retrying fabric request', {
            attempt: attempt + 1,
            maxRetries: maxRetries + 1,
            delay,
            traceId,
            requestId,
            error: (error as Error).message,
          });

          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  /**
   * Execute the actual HTTP request
   */
  private async executeHttpRequest(request: FabricRequest, headers: Record<string, string>): Promise<Response> {
    const fetchOptions: RequestInit = {
      method: request.method,
      headers,
      signal: request.timeout ? AbortSignal.timeout(request.timeout) : undefined,
    };

    if (request.body && request.method !== 'GET') {
      fetchOptions.body = typeof request.body === 'string' ? request.body : JSON.stringify(request.body);
    }

    const response = await fetch(request.url, fetchOptions);

    // Check for HTTP errors
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorBody}`);
    }

    return response;
  }

  /**
   * Process response and extract fabric metadata
   */
  private async processFabricResponse<T>(response: Response, traceId: string, requestId: string): Promise<FabricResponse<T>> {
    const data = await response.json();

    return {
      data,
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      traceId,
      requestId,
      fabricMetadata: {
        serviceId: response.headers.get('X-Service-ID') || 'unknown',
        policyDecision: response.headers.get('X-Policy-Decision') || 'allow',
        rateLimitRemaining: parseInt(response.headers.get('X-RateLimit-Remaining') || '0'),
        upstreamServiceTime: parseInt(response.headers.get('X-Upstream-Service-Time') || '0'),
      },
    };
  }

  /**
   * Determine if request should be retried
   */
  private shouldRetry(error: Error, attempt: number, maxRetries: number): boolean {
    if (attempt >= maxRetries) return false;

    // Don't retry on authentication errors
    if (error.message.includes('401') || error.message.includes('403')) {
      return false;
    }

    // Don't retry on client errors (4xx) except for rate limiting
    if (error.message.includes('4') && !error.message.includes('429')) {
      return false;
    }

    // Retry on server errors (5xx) and network errors
    return true;
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoffDelay(attempt: number): number {
    const baseDelay = 1000; // 1 second
    const delay = baseDelay * Math.pow(this.config.retry.backoffMultiplier, attempt);
    const jitter = Math.random() * 0.1 * delay; // Add 10% jitter
    
    return Math.min(delay + jitter, this.config.retry.maxBackoffMs);
  }

  /**
   * Create a FabricError from a generic error
   */
  private createFabricError(error: Error, traceId: string, requestId: string): FabricError {
    const fabricError = error as FabricError;
    
    fabricError.traceId = traceId;
    fabricError.requestId = requestId;
    
    // Extract status code from error message
    const statusMatch = error.message.match(/HTTP (\d+)/);
    fabricError.status = statusMatch ? parseInt(statusMatch[1]) : 500;
    
    // Determine error code
    if (fabricError.status === 429) {
      fabricError.code = 'RATE_LIMITED';
      fabricError.retryable = true;
    } else if (fabricError.status >= 500) {
      fabricError.code = 'SERVER_ERROR';
      fabricError.retryable = true;
    } else if (fabricError.status === 403) {
      fabricError.code = 'FORBIDDEN';
      fabricError.retryable = false;
    } else if (fabricError.status === 401) {
      fabricError.code = 'UNAUTHORIZED';
      fabricError.retryable = false;
    } else {
      fabricError.code = 'CLIENT_ERROR';
      fabricError.retryable = false;
    }

    return fabricError;
  }

  /**
   * Utility methods
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
  }

  private getEndpointKey(url: string): string {
    try {
      const parsedUrl = new URL(url);
      const pathParts = parsedUrl.pathname.split('/').slice(0, 4); // /api/v1/resource
      return pathParts.join('/');
    } catch {
      return url;
    }
  }

  private getAuthToken(): string | null {
    // This would integrate with your auth system
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('auth_token');
    }
    return null;
  }

  private getUserContext(): { id: string; role: string } | null {
    // This would integrate with your auth context
    if (typeof window !== 'undefined' && window.localStorage) {
      const userStr = localStorage.getItem('user_context');
      return userStr ? JSON.parse(userStr) : null;
    }
    return null;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get circuit breaker status for monitoring
   */
  getCircuitBreakerStatus(): Record<string, CircuitBreakerState> {
    return Object.fromEntries(this.circuitBreakerStates);
  }

  /**
   * Reset circuit breaker for a specific endpoint
   */
  resetCircuitBreaker(endpoint: string): void {
    const state = this.circuitBreakerStates.get(endpoint);
    if (state) {
      state.failures = 0;
      state.state = 'CLOSED';
      logger.info('Circuit breaker reset', { endpoint });
    }
  }
}

// Create default client instance
export const fabricClient = new FabricClient();

// Export the class for custom configurations
export { FabricClient };