/**
 * Mock Infrastructure for F Integration Tests
 * 
 * Provides mock servers, storage adapters, and test utilities
 */

import http from 'http';
import crypto from 'crypto';

/**
 * Mock Storage Adapter for testing
 */
export class MockStorageAdapter {
  constructor() {
    this.data = new Map();
    this.sequences = new Map();
    this.reset();
  }

  reset() {
    this.data.clear();
    this.sequences.clear();
    
    // Initialize table collections
    this.data.set('integrations', new Map());
    this.data.set('credentials', new Map());
    this.data.set('mappings', new Map());
    this.data.set('jobs', new Map());
    this.data.set('test_results', new Map());
    this.data.set('integration_audits', new Map());
    this.data.set('security_events', new Map());
  }

  generateId() {
    return `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async create(table, data) {
    if (!this.data.has(table)) {
      this.data.set(table, new Map());
    }

    const id = this.generateId();
    const record = { ...data, id };
    this.data.get(table).set(id, record);
    
    return record;
  }

  async findById(table, id) {
    const tableData = this.data.get(table);
    return tableData ? tableData.get(id) || null : null;
  }

  async findMany(table, query) {
    const tableData = this.data.get(table);
    if (!tableData) return [];

    let results = Array.from(tableData.values());

    // Apply filters
    if (query.workspaceId) {
      results = results.filter(r => r.workspaceId === query.workspaceId);
    }
    if (query.status) {
      if (Array.isArray(query.status)) {
        results = results.filter(r => query.status.includes(r.status));
      } else {
        results = results.filter(r => r.status === query.status);
      }
    }
    if (query.type) {
      if (Array.isArray(query.type)) {
        results = results.filter(r => query.type.includes(r.type));
      } else {
        results = results.filter(r => r.type === query.type);
      }
    }
    if (query.integrationId) {
      results = results.filter(r => r.integrationId === query.integrationId);
    }
    if (query.createdBy) {
      results = results.filter(r => r.createdBy === query.createdBy);
    }

    // Apply sorting
    if (query.sortBy) {
      const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
      results.sort((a, b) => {
        const aVal = this.getNestedValue(a, query.sortBy);
        const bVal = this.getNestedValue(b, query.sortBy);
        
        if (aVal < bVal) return -1 * sortOrder;
        if (aVal > bVal) return 1 * sortOrder;
        return 0;
      });
    }

    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || results.length;
    
    return results.slice(offset, offset + limit);
  }

  async update(table, id, data) {
    const tableData = this.data.get(table);
    if (!tableData || !tableData.has(id)) return null;

    const existing = tableData.get(id);
    const updated = { ...existing, ...data };
    tableData.set(id, updated);
    
    return updated;
  }

  async delete(table, id) {
    const tableData = this.data.get(table);
    if (!tableData) return false;
    
    return tableData.delete(id);
  }

  async count(table, query) {
    const results = await this.findMany(table, query);
    return results.length;
  }

  async transaction(callback) {
    // Simple transaction implementation - in real world would need rollback
    return await callback(this);
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((acc, part) => acc?.[part], obj);
  }
}

/**
 * Mock Integration Server for testing external APIs
 */
export class MockIntegrationServer {
  constructor(port = 8888) {
    this.port = port;
    this.server = null;
    this.requests = [];
    this.failureCount = new Map(); // Track failures for flaky endpoint simulation
  }

  async start() {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        this.handleRequest(req, res);
      });

      this.server.listen(this.port, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log(`🖥️  Mock server started on port ${this.port}`);
          resolve();
        }
      });
    });
  }

  async stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('🛑 Mock server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  handleRequest(req, res) {
    // Log request
    this.requests.push({
      method: req.method,
      url: req.url,
      headers: req.headers,
      timestamp: new Date(),
    });

    // Parse URL
    const url = new URL(req.url, `http://localhost:${this.port}`);
    const path = url.pathname;

    // Set common headers
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    try {
      this.routeRequest(req, res, path, url);
    } catch (error) {
      console.error('Mock server error:', error);
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  }

  routeRequest(req, res, path, url) {
    // OAuth2 endpoints
    if (path === '/oauth/token') {
      this.handleOAuthToken(req, res);
      return;
    }

    if (path === '/oauth/authorize') {
      this.handleOAuthAuthorize(req, res);
      return;
    }

    // OIDC endpoints
    if (path === '/.well-known/openid-configuration') {
      this.handleOIDCDiscovery(req, res);
      return;
    }

    if (path === '/oauth/userinfo') {
      this.handleOIDCUserInfo(req, res);
      return;
    }

    // GraphQL endpoint
    if (path === '/graphql') {
      this.handleGraphQL(req, res);
      return;
    }

    // SSE events endpoint
    if (path === '/api/events') {
      this.handleSSE(req, res);
      return;
    }

    // REST API endpoints
    if (path.startsWith('/api/')) {
      this.handleRESTAPI(req, res, path, url);
      return;
    }

    // 404 for unknown paths
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  }

  handleOAuthToken(req, res) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const params = new URLSearchParams(body);
      const grantType = params.get('grant_type');

      if (grantType === 'client_credentials') {
        res.writeHead(200);
        res.end(JSON.stringify({
          access_token: 'mock_access_token_' + Date.now(),
          token_type: 'Bearer',
          expires_in: 3600,
          scope: 'read write',
        }));
      } else if (grantType === 'authorization_code') {
        res.writeHead(200);
        res.end(JSON.stringify({
          access_token: 'mock_access_token_' + Date.now(),
          token_type: 'Bearer',
          expires_in: 3600,
          refresh_token: 'mock_refresh_token_' + Date.now(),
          id_token: this.generateMockJWT(),
          scope: 'openid profile email',
        }));
      } else {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'unsupported_grant_type' }));
      }
    });
  }

  handleOAuthAuthorize(req, res) {
    // Simulate OAuth2 authorization redirect
    const url = new URL(req.url, `http://localhost:${this.port}`);
    const redirectUri = url.searchParams.get('redirect_uri');
    const state = url.searchParams.get('state');
    
    const authCode = 'mock_auth_code_' + Date.now();
    const redirectUrl = `${redirectUri}?code=${authCode}&state=${state}`;
    
    res.writeHead(302, { Location: redirectUrl });
    res.end();
  }

  handleOIDCDiscovery(req, res) {
    res.writeHead(200);
    res.end(JSON.stringify({
      issuer: `http://localhost:${this.port}`,
      authorization_endpoint: `http://localhost:${this.port}/oauth/authorize`,
      token_endpoint: `http://localhost:${this.port}/oauth/token`,
      userinfo_endpoint: `http://localhost:${this.port}/oauth/userinfo`,
      jwks_uri: `http://localhost:${this.port}/.well-known/jwks.json`,
      scopes_supported: ['openid', 'profile', 'email'],
      response_types_supported: ['code', 'token'],
      grant_types_supported: ['authorization_code', 'client_credentials'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256'],
    }));
  }

  handleOIDCUserInfo(req, res) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.writeHead(401);
      res.end(JSON.stringify({ error: 'unauthorized' }));
      return;
    }

    res.writeHead(200);
    res.end(JSON.stringify({
      sub: 'user_123',
      email: 'test@example.com',
      name: 'Test User',
      preferred_username: 'testuser',
      email_verified: true,
    }));
  }

  handleGraphQL(req, res) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { query, variables } = JSON.parse(body);
        
        if (query.includes('GetUsers')) {
          res.writeHead(200);
          res.end(JSON.stringify({
            data: {
              users: [
                { id: '1', name: 'Alice Smith', email: 'alice@example.com' },
                { id: '2', name: 'Bob Jones', email: 'bob@example.com' },
              ],
            },
          }));
        } else if (query.includes('CreateUser')) {
          const input = variables?.input || {};
          res.writeHead(200);
          res.end(JSON.stringify({
            data: {
              createUser: {
                id: 'user_' + Date.now(),
                name: input.name || 'New User',
                email: input.email || 'newuser@example.com',
              },
            },
          }));
        } else {
          res.writeHead(400);
          res.end(JSON.stringify({
            errors: [{ message: 'Unknown query' }],
          }));
        }
      } catch (error) {
        res.writeHead(400);
        res.end(JSON.stringify({
          errors: [{ message: 'Invalid GraphQL request' }],
        }));
      }
    });
  }

  handleSSE(req, res) {
    // Server-Sent Events endpoint
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    // Send initial event
    res.write('data: {"type": "connected", "timestamp": "' + new Date().toISOString() + '"}\n\n');

    // Send periodic events
    let eventCount = 0;
    const interval = setInterval(() => {
      eventCount++;
      const event = {
        type: 'user-activity',
        id: eventCount,
        data: {
          userId: 'user_' + (eventCount % 5),
          action: ['login', 'logout', 'update', 'create'][eventCount % 4],
          timestamp: new Date().toISOString(),
        },
      };
      
      res.write(`data: ${JSON.stringify(event)}\n\n`);
      
      if (eventCount >= 5) {
        clearInterval(interval);
        res.end();
      }
    }, 500);

    // Cleanup on client disconnect
    req.on('close', () => {
      clearInterval(interval);
    });
  }

  handleRESTAPI(req, res, path, url) {
    // Simulate different response scenarios based on path
    
    // Error endpoint
    if (path === '/api/error') {
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Internal server error' }));
      return;
    }

    // Slow endpoint (for timeout testing)
    if (path === '/api/slow') {
      setTimeout(() => {
        res.writeHead(200);
        res.end(JSON.stringify({ message: 'Slow response' }));
      }, 2000);
      return;
    }

    // Flaky endpoint (fails first few times)
    if (path === '/api/flaky') {
      const key = 'flaky';
      const failures = this.failureCount.get(key) || 0;
      
      if (failures < 2) {
        this.failureCount.set(key, failures + 1);
        res.writeHead(503);
        res.end(JSON.stringify({ error: 'Service temporarily unavailable' }));
        return;
      } else {
        // Reset counter and succeed
        this.failureCount.set(key, 0);
        res.writeHead(200);
        res.end(JSON.stringify({ message: 'Success after retries' }));
        return;
      }
    }

    // Standard REST endpoints
    if (path === '/api/test') {
      res.writeHead(200);
      res.end(JSON.stringify({ 
        message: 'Test endpoint',
        timestamp: new Date().toISOString(),
        requestId: url.searchParams.get('id') || 'default',
      }));
      return;
    }

    if (path === '/api/users') {
      if (req.method === 'GET') {
        res.writeHead(200);
        res.end(JSON.stringify({
          users: [
            { id: '1', name: 'Alice Smith', email: 'alice@example.com' },
            { id: '2', name: 'Bob Jones', email: 'bob@example.com' },
            { id: '3', name: 'Carol Davis', email: 'carol@example.com' },
          ],
          total: 3,
        }));
      } else if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          const userData = JSON.parse(body);
          res.writeHead(201);
          res.end(JSON.stringify({
            id: 'user_' + Date.now(),
            ...userData,
            createdAt: new Date().toISOString(),
          }));
        });
      }
      return;
    }

    if (path.match(/^\/api\/users\/\d+$/)) {
      const userId = path.split('/').pop();
      
      if (req.method === 'PUT') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          const userData = JSON.parse(body);
          res.writeHead(200);
          res.end(JSON.stringify({
            id: userId,
            ...userData,
            updatedAt: new Date().toISOString(),
          }));
        });
      } else if (req.method === 'DELETE') {
        res.writeHead(204);
        res.end();
      } else {
        res.writeHead(200);
        res.end(JSON.stringify({
          id: userId,
          name: 'User ' + userId,
          email: `user${userId}@example.com`,
        }));
      }
      return;
    }

    // Health check endpoint
    if (path === '/api/health') {
      res.writeHead(200);
      res.end(JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0',
      }));
      return;
    }

    // Default response
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Endpoint not found' }));
  }

  generateMockJWT() {
    // Generate a mock JWT for testing (not cryptographically secure)
    const header = { alg: 'RS256', typ: 'JWT' };
    const payload = {
      sub: 'user_123',
      email: 'test@example.com',
      name: 'Test User',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto.randomBytes(32).toString('base64url');

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  getRequests() {
    return this.requests;
  }

  clearRequests() {
    this.requests = [];
  }
}

/**
 * Mock Authentication Provider
 */
export class MockAuthProvider {
  constructor() {
    this.users = new Map();
    this.sessions = new Map();
    this.initializeTestUsers();
  }

  initializeTestUsers() {
    this.users.set('test_user_f', {
      id: 'test_user_f',
      username: 'testuser',
      email: 'test@example.com',
      roles: ['integration_operator'],
      permissions: [
        'integration:read',
        'integration:create',
        'integration:execute',
        'credential:read',
        'credential:create',
        'job:read',
        'job:create',
        'metrics:read',
      ],
      apiKey: 'test-api-key-valid-12345',
    });

    this.users.set('admin_user_f', {
      id: 'admin_user_f',
      username: 'admin',
      email: 'admin@example.com',
      roles: ['integration_admin'],
      permissions: ['admin:*'],
      apiKey: 'admin-api-key-67890',
    });
  }

  validateApiKey(apiKey) {
    for (const user of this.users.values()) {
      if (user.apiKey === apiKey) {
        return user;
      }
    }
    return null;
  }

  createSession(userId) {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const session = {
      id: sessionId,
      userId,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours
      lastActivity: new Date(),
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  validateSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session || session.expiresAt < new Date()) {
      this.sessions.delete(sessionId);
      return null;
    }

    session.lastActivity = new Date();
    return session;
  }

  getUserPermissions(userId) {
    const user = this.users.get(userId);
    return user ? user.permissions : [];
  }
}

/**
 * Mock Metrics Collector
 */
export class MockMetricsCollector {
  constructor() {
    this.metrics = new Map();
    this.events = [];
  }

  record(integrationId, metric, value) {
    if (!this.metrics.has(integrationId)) {
      this.metrics.set(integrationId, {
        requests: [],
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        errorRate: 0,
      });
    }

    const data = this.metrics.get(integrationId);
    data.requests.push({
      timestamp: Date.now(),
      metric,
      value,
    });

    this.updateAggregates(integrationId);
  }

  updateAggregates(integrationId) {
    const data = this.metrics.get(integrationId);
    const requests = data.requests;

    data.totalRequests = requests.length;
    data.successfulRequests = requests.filter(r => r.metric === 'success').length;
    data.failedRequests = requests.filter(r => r.metric === 'error').length;
    
    const responseTimes = requests.map(r => r.value).filter(v => v > 0);
    data.averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;
    
    data.errorRate = data.totalRequests > 0 
      ? data.failedRequests / data.totalRequests
      : 0;
  }

  getMetrics(integrationId) {
    return this.metrics.get(integrationId) || {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      errorRate: 0,
    };
  }

  reset() {
    this.metrics.clear();
    this.events = [];
  }
}

/**
 * Test utilities
 */
export class TestUtils {
  static async waitForCondition(condition, timeout = 5000, interval = 100) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    throw new Error(`Condition not met within ${timeout}ms`);
  }

  static generateTestData(type, count = 1) {
    const generators = {
      integration: () => ({
        name: `Test Integration ${Date.now()}`,
        description: 'Generated test integration',
        connectorType: 'rest',
        connectorVersion: '1.0.0',
        workspaceId: 'test_workspace_f',
        config: {
          baseUrl: 'https://api.example.com',
          timeout: 30000,
        },
        tags: ['test', 'generated'],
      }),
      
      credential: () => ({
        name: `Test Credential ${Date.now()}`,
        type: 'api_key',
        integrationId: 'integration-123',
        workspaceId: 'test_workspace_f',
        credentialData: {
          apiKey: `test-key-${Math.random().toString(36).substr(2, 20)}`,
        },
        metadata: {
          environment: 'development',
          autoRotate: false,
          refreshable: false,
        },
      }),
      
      job: () => ({
        name: `Test Job ${Date.now()}`,
        type: 'sync',
        integrationId: 'integration-123',
        workspaceId: 'test_workspace_f',
        priority: 'normal',
        config: {
          source: { integrationId: 'integration-123' },
          target: { integrationId: 'integration-456', operation: 'create' },
        },
      }),
    };

    if (!generators[type]) {
      throw new Error(`Unknown test data type: ${type}`);
    }

    return count === 1 
      ? generators[type]()
      : Array.from({ length: count }, generators[type]);
  }

  static async measurePerformance(operation, iterations = 1) {
    const results = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = process.hrtime.bigint();
      await operation();
      const end = process.hrtime.bigint();
      
      results.push(Number(end - start) / 1_000_000); // Convert to milliseconds
    }

    return {
      iterations,
      totalTime: results.reduce((a, b) => a + b, 0),
      averageTime: results.reduce((a, b) => a + b, 0) / results.length,
      minTime: Math.min(...results),
      maxTime: Math.max(...results),
      results,
    };
  }
}

// Export all mocks
export {
  MockStorageAdapter,
  MockIntegrationServer,
  MockAuthProvider,
  MockMetricsCollector,
  TestUtils,
};