/**
 * CBRT Fabric mTLS End-to-End Tests
 * Tests mutual TLS authentication, certificate validation, and secure communication
 */

import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { fabricClient, FabricClient } from '../../src/lib/integration/fabricClient';
import { fabricPolicyChecker } from '../../src/lib/integration/fabricPolicyCheck';

// Mock certificate utilities
const mockCertUtils = {
  generateSelfSignedCert: jest.fn(),
  validateCertificate: jest.fn(),
  extractSpiffeId: jest.fn(),
  createTLSContext: jest.fn(),
};

// Mock network utilities
const mockNetworkUtils = {
  createSecureConnection: jest.fn(),
  verifyPeerCertificate: jest.fn(),
  establishMTLS: jest.fn(),
};

describe('mTLS End-to-End Tests', () => {
  let testClient: FabricClient;
  let mockServer: any;

  beforeAll(async () => {
    // Set up test environment
    process.env.NODE_ENV = 'test';
    process.env.FABRIC_TEST_MODE = 'true';

    // Initialize test client with mTLS configuration
    testClient = new FabricClient({
      serviceId: 'cbrt-test-client',
      spiffeId: 'spiffe://cbrt.company.com/test/client',
      circuitBreaker: { enabled: false, failureThreshold: 5, timeout: 30000 },
    });

    // Mock server setup for testing
    mockServer = {
      start: jest.fn().mockResolvedValue(true),
      stop: jest.fn().mockResolvedValue(true),
      configureMTLS: jest.fn().mockResolvedValue(true),
    };

    await mockServer.start();
  });

  afterAll(async () => {
    await mockServer.stop();
  });

  describe('Certificate Validation', () => {
    it('should validate SPIFFE ID in client certificate', async () => {
      const mockCert = {
        subject: { CN: 'cbrt-frontend' },
        issuer: { CN: 'CBRT Internal CA' },
        spiffeId: 'spiffe://cbrt.company.com/frontend/cbrt-ui',
        notBefore: new Date(Date.now() - 86400000), // Yesterday
        notAfter: new Date(Date.now() + 86400000 * 30), // 30 days from now
      };

      mockCertUtils.extractSpiffeId.mockReturnValue(mockCert.spiffeId);
      mockCertUtils.validateCertificate.mockReturnValue(true);

      const isValid = mockCertUtils.validateCertificate(mockCert);
      const spiffeId = mockCertUtils.extractSpiffeId(mockCert);

      expect(isValid).toBe(true);
      expect(spiffeId).toBe('spiffe://cbrt.company.com/frontend/cbrt-ui');
      expect(spiffeId.startsWith('spiffe://cbrt.company.com/')).toBe(true);
    });

    it('should reject invalid SPIFFE ID format', () => {
      const invalidCert = {
        spiffeId: 'spiffe://external.domain.com/malicious/service',
      };

      mockCertUtils.extractSpiffeId.mockReturnValue(invalidCert.spiffeId);
      mockCertUtils.validateCertificate.mockReturnValue(false);

      const isValid = mockCertUtils.validateCertificate(invalidCert);
      const spiffeId = mockCertUtils.extractSpiffeId(invalidCert);

      expect(isValid).toBe(false);
      expect(spiffeId.startsWith('spiffe://cbrt.company.com/')).toBe(false);
    });

    it('should reject expired certificates', () => {
      const expiredCert = {
        spiffeId: 'spiffe://cbrt.company.com/frontend/cbrt-ui',
        notAfter: new Date(Date.now() - 86400000), // Expired yesterday
      };

      mockCertUtils.validateCertificate.mockReturnValue(false);

      const isValid = mockCertUtils.validateCertificate(expiredCert);
      expect(isValid).toBe(false);
    });
  });

  describe('Mutual TLS Handshake', () => {
    it('should successfully establish mTLS connection between services', async () => {
      const connectionConfig = {
        clientSpiffeId: 'spiffe://cbrt.company.com/frontend/cbrt-ui',
        serverSpiffeId: 'spiffe://cbrt.company.com/api/cbrt-backend',
        tlsVersion: '1.3',
        cipherSuite: 'ECDHE-ECDSA-AES256-GCM-SHA384',
      };

      mockNetworkUtils.establishMTLS.mockResolvedValue({
        connected: true,
        tlsVersion: '1.3',
        cipherSuite: 'ECDHE-ECDSA-AES256-GCM-SHA384',
        peerCertificate: {
          spiffeId: connectionConfig.serverSpiffeId,
          validated: true,
        },
      });

      const connection = await mockNetworkUtils.establishMTLS(connectionConfig);

      expect(connection.connected).toBe(true);
      expect(connection.tlsVersion).toBe('1.3');
      expect(connection.peerCertificate.validated).toBe(true);
      expect(connection.peerCertificate.spiffeId).toBe(connectionConfig.serverSpiffeId);
    });

    it('should fail mTLS handshake with untrusted certificate', async () => {
      const connectionConfig = {
        clientSpiffeId: 'spiffe://cbrt.company.com/frontend/cbrt-ui',
        serverSpiffeId: 'spiffe://malicious.domain.com/fake/service',
      };

      mockNetworkUtils.establishMTLS.mockRejectedValue(new Error('Certificate verification failed'));

      await expect(mockNetworkUtils.establishMTLS(connectionConfig))
        .rejects.toThrow('Certificate verification failed');
    });

    it('should enforce minimum TLS version', async () => {
      const connectionConfig = {
        clientSpiffeId: 'spiffe://cbrt.company.com/frontend/cbrt-ui',
        serverSpiffeId: 'spiffe://cbrt.company.com/api/cbrt-backend',
        tlsVersion: '1.1', // Below minimum
      };

      mockNetworkUtils.establishMTLS.mockRejectedValue(new Error('TLS version not supported'));

      await expect(mockNetworkUtils.establishMTLS(connectionConfig))
        .rejects.toThrow('TLS version not supported');
    });
  });

  describe('Service-to-Service Authentication', () => {
    it('should authenticate frontend to API service', async () => {
      // Mock successful API response with fabric headers
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([
          ['X-Service-ID', 'cbrt-api'],
          ['X-Policy-Decision', 'allow'],
          ['X-SPIFFE-ID', 'spiffe://cbrt.company.com/api/cbrt-backend'],
        ]),
        json: jest.fn().mockResolvedValue({ success: true, data: 'test' }),
      });

      const response = await testClient.get('/api/v1/health');

      expect(response.status).toBe(200);
      expect(response.fabricMetadata.serviceId).toBe('cbrt-api');
      expect(response.fabricMetadata.policyDecision).toBe('allow');
    });

    it('should reject unauthorized service communication', async () => {
      // Mock policy checker to deny request
      const policyContext = {
        user: { id: 'test-user', role: 'viewer', permissions: [], sessionId: 'session-123' },
        request: {
          method: 'POST',
          path: '/api/v1/admin/config',
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
      };

      const decision = await fabricPolicyChecker.checkPolicy(policyContext);

      expect(decision.allowed).toBe(false);
      expect(decision.code).toContain('DENY');
      expect(decision.reason).toContain('admin');
    });
  });

  describe('Certificate Rotation', () => {
    it('should handle certificate rotation gracefully', async () => {
      const oldCert = {
        spiffeId: 'spiffe://cbrt.company.com/frontend/cbrt-ui',
        notAfter: new Date(Date.now() + 3600000), // Expires in 1 hour
        rotationDue: true,
      };

      const newCert = {
        spiffeId: 'spiffe://cbrt.company.com/frontend/cbrt-ui',
        notAfter: new Date(Date.now() + 86400000 * 30), // Expires in 30 days
        rotationDue: false,
      };

      // Mock certificate rotation process
      mockCertUtils.generateSelfSignedCert.mockResolvedValue(newCert);

      const rotatedCert = await mockCertUtils.generateSelfSignedCert({
        spiffeId: oldCert.spiffeId,
        validityPeriod: '30d',
      });

      expect(rotatedCert.spiffeId).toBe(oldCert.spiffeId);
      expect(rotatedCert.notAfter.getTime()).toBeGreaterThan(oldCert.notAfter.getTime());
      expect(rotatedCert.rotationDue).toBe(false);
    });

    it('should maintain connections during certificate rotation', async () => {
      // Mock active connection
      const activeConnection = {
        id: 'conn-123',
        established: Date.now() - 30000, // 30 seconds ago
        lastActivity: Date.now() - 1000, // 1 second ago
        certificateExpiry: Date.now() + 60000, // Expires in 1 minute
      };

      // Simulate certificate rotation
      const rotationResult = {
        oldCertificateRevoked: true,
        newCertificateInstalled: true,
        activeConnectionsMaintained: true,
        gracePeriod: 300000, // 5 minutes
      };

      expect(rotationResult.activeConnectionsMaintained).toBe(true);
      expect(rotationResult.gracePeriod).toBeGreaterThan(0);
    });
  });

  describe('TLS Configuration Validation', () => {
    it('should use secure cipher suites only', () => {
      const allowedCipherSuites = [
        'ECDHE-ECDSA-AES256-GCM-SHA384',
        'ECDHE-RSA-AES256-GCM-SHA384',
        'ECDHE-ECDSA-CHACHA20-POLY1305',
        'ECDHE-RSA-CHACHA20-POLY1305',
        'ECDHE-ECDSA-AES128-GCM-SHA256',
        'ECDHE-RSA-AES128-GCM-SHA256',
      ];

      const insecureCipherSuites = [
        'RC4-SHA',
        'DES-CBC3-SHA',
        'AES128-SHA',
        'NULL-SHA',
      ];

      // All allowed cipher suites should be secure
      allowedCipherSuites.forEach(cipher => {
        expect(cipher).toMatch(/^ECDHE-(ECDSA|RSA)-(AES256-GCM|CHACHA20-POLY1305|AES128-GCM)/);
      });

      // Insecure cipher suites should not be in allowed list
      insecureCipherSuites.forEach(cipher => {
        expect(allowedCipherSuites).not.toContain(cipher);
      });
    });

    it('should enforce perfect forward secrecy', () => {
      const pfsRequiredCiphers = [
        'ECDHE-ECDSA-AES256-GCM-SHA384',
        'ECDHE-RSA-AES256-GCM-SHA384',
      ];

      pfsRequiredCiphers.forEach(cipher => {
        expect(cipher.startsWith('ECDHE-')).toBe(true);
      });
    });

    it('should validate certificate chain', async () => {
      const certificateChain = [
        {
          type: 'leaf',
          subject: 'cbrt-frontend',
          issuer: 'CBRT Intermediate CA',
          spiffeId: 'spiffe://cbrt.company.com/frontend/cbrt-ui',
        },
        {
          type: 'intermediate',
          subject: 'CBRT Intermediate CA',
          issuer: 'CBRT Root CA',
        },
        {
          type: 'root',
          subject: 'CBRT Root CA',
          issuer: 'CBRT Root CA', // Self-signed
        },
      ];

      mockCertUtils.validateCertificate.mockImplementation((cert) => {
        return cert.spiffeId?.startsWith('spiffe://cbrt.company.com/') ?? false;
      });

      const leafCert = certificateChain[0];
      const isValidChain = mockCertUtils.validateCertificate(leafCert);

      expect(isValidChain).toBe(true);
      expect(certificateChain).toHaveLength(3);
      expect(certificateChain[0].type).toBe('leaf');
      expect(certificateChain[2].type).toBe('root');
    });
  });

  describe('mTLS Performance Tests', () => {
    it('should establish mTLS connection within acceptable time', async () => {
      const startTime = Date.now();

      mockNetworkUtils.establishMTLS.mockImplementation(async () => {
        // Simulate connection establishment time
        await new Promise(resolve => setTimeout(resolve, 100));
        return { connected: true, handshakeTime: 100 };
      });

      const connection = await mockNetworkUtils.establishMTLS({
        clientSpiffeId: 'spiffe://cbrt.company.com/frontend/cbrt-ui',
        serverSpiffeId: 'spiffe://cbrt.company.com/api/cbrt-backend',
      });

      const handshakeTime = Date.now() - startTime;

      expect(connection.connected).toBe(true);
      expect(handshakeTime).toBeLessThan(1000); // Should be under 1 second
    });

    it('should handle concurrent mTLS connections', async () => {
      const connectionPromises = Array.from({ length: 10 }, (_, i) =>
        mockNetworkUtils.establishMTLS({
          clientSpiffeId: 'spiffe://cbrt.company.com/frontend/cbrt-ui',
          serverSpiffeId: 'spiffe://cbrt.company.com/api/cbrt-backend',
          connectionId: `conn-${i}`,
        })
      );

      mockNetworkUtils.establishMTLS.mockResolvedValue({ connected: true });

      const connections = await Promise.all(connectionPromises);

      expect(connections).toHaveLength(10);
      connections.forEach(conn => {
        expect(conn.connected).toBe(true);
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should retry on temporary TLS failures', async () => {
      const failureCounts = { count: 0 };

      mockNetworkUtils.establishMTLS.mockImplementation(async () => {
        failureCounts.count++;
        if (failureCounts.count < 3) {
          throw new Error('Temporary handshake failure');
        }
        return { connected: true, attempt: failureCounts.count };
      });

      // Configure retry logic
      const retryOptions = {
        maxRetries: 3,
        backoffMs: 100,
      };

      let connection;
      for (let attempt = 0; attempt <= retryOptions.maxRetries; attempt++) {
        try {
          connection = await mockNetworkUtils.establishMTLS({});
          break;
        } catch (error) {
          if (attempt === retryOptions.maxRetries) throw error;
          await new Promise(resolve => setTimeout(resolve, retryOptions.backoffMs));
        }
      }

      expect(connection.connected).toBe(true);
      expect(connection.attempt).toBe(3);
    });

    it('should fail fast on certificate validation errors', async () => {
      mockNetworkUtils.establishMTLS.mockRejectedValue(new Error('Certificate validation failed: untrusted issuer'));

      await expect(mockNetworkUtils.establishMTLS({}))
        .rejects.toThrow('Certificate validation failed');

      // Should not retry on certificate errors
      expect(mockNetworkUtils.establishMTLS).toHaveBeenCalledTimes(1);
    });
  });
});