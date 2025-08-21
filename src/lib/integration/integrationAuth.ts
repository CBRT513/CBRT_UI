/**
 * Integration Authentication & Authorization Security Gate
 * 
 * Centralized security layer for all integration operations
 */

import { EventEmitter } from 'events';
import { ConnectorConfig, ExecutionContext, AuthConfig } from './types';
import { integrationRepository } from './storage/repo';
import { auditService } from '../governance/audit';
import { rateLimiter } from './monitoring/metrics';

// Security event types
export enum SecurityEventType {
  AUTH_SUCCESS = 'auth_success',
  AUTH_FAILURE = 'auth_failure',
  PERMISSION_DENIED = 'permission_denied',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  TOKEN_EXPIRED = 'token_expired',
  INVALID_CREDENTIALS = 'invalid_credentials',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
}

export interface SecurityEvent {
  type: SecurityEventType;
  userId: string;
  integrationId?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  details: Record<string, any>;
  risk: 'low' | 'medium' | 'high' | 'critical';
}

export interface AuthenticationResult {
  success: boolean;
  userId?: string;
  permissions: string[];
  sessionId?: string;
  expiresAt?: Date;
  metadata?: Record<string, any>;
  error?: string;
  securityEvents?: SecurityEvent[];
}

export interface AuthorizationRequest {
  userId: string;
  action: string;
  resource: string;
  context: Record<string, any>;
}

export interface AuthorizationResult {
  granted: boolean;
  reason?: string;
  conditions?: Record<string, any>;
  expiresAt?: Date;
}

// Permission definitions
export const PERMISSIONS = {
  // Integration management
  INTEGRATION_CREATE: 'integration:create',
  INTEGRATION_READ: 'integration:read',
  INTEGRATION_UPDATE: 'integration:update',
  INTEGRATION_DELETE: 'integration:delete',
  INTEGRATION_EXECUTE: 'integration:execute',
  
  // Credential management
  CREDENTIAL_CREATE: 'credential:create',
  CREDENTIAL_READ: 'credential:read',
  CREDENTIAL_UPDATE: 'credential:update',
  CREDENTIAL_DELETE: 'credential:delete',
  CREDENTIAL_ROTATE: 'credential:rotate',
  
  // Job management
  JOB_CREATE: 'job:create',
  JOB_READ: 'job:read',
  JOB_UPDATE: 'job:update',
  JOB_DELETE: 'job:delete',
  JOB_EXECUTE: 'job:execute',
  
  // Monitoring and audit
  METRICS_READ: 'metrics:read',
  AUDIT_READ: 'audit:read',
  
  // Administrative
  ADMIN_ALL: 'admin:*',
  WORKSPACE_ADMIN: 'workspace:admin',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// Role definitions
export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
  workspaceId?: string;
  conditions?: Record<string, any>;
}

export const DEFAULT_ROLES: Role[] = [
  {
    id: 'integration_admin',
    name: 'Integration Administrator',
    permissions: [
      PERMISSIONS.INTEGRATION_CREATE,
      PERMISSIONS.INTEGRATION_READ,
      PERMISSIONS.INTEGRATION_UPDATE,
      PERMISSIONS.INTEGRATION_DELETE,
      PERMISSIONS.INTEGRATION_EXECUTE,
      PERMISSIONS.CREDENTIAL_CREATE,
      PERMISSIONS.CREDENTIAL_READ,
      PERMISSIONS.CREDENTIAL_UPDATE,
      PERMISSIONS.CREDENTIAL_DELETE,
      PERMISSIONS.CREDENTIAL_ROTATE,
      PERMISSIONS.JOB_CREATE,
      PERMISSIONS.JOB_READ,
      PERMISSIONS.JOB_UPDATE,
      PERMISSIONS.JOB_DELETE,
      PERMISSIONS.JOB_EXECUTE,
      PERMISSIONS.METRICS_READ,
      PERMISSIONS.AUDIT_READ,
    ],
  },
  {
    id: 'integration_operator',
    name: 'Integration Operator',
    permissions: [
      PERMISSIONS.INTEGRATION_READ,
      PERMISSIONS.INTEGRATION_EXECUTE,
      PERMISSIONS.CREDENTIAL_READ,
      PERMISSIONS.JOB_CREATE,
      PERMISSIONS.JOB_READ,
      PERMISSIONS.JOB_UPDATE,
      PERMISSIONS.JOB_EXECUTE,
      PERMISSIONS.METRICS_READ,
    ],
  },
  {
    id: 'integration_viewer',
    name: 'Integration Viewer',
    permissions: [
      PERMISSIONS.INTEGRATION_READ,
      PERMISSIONS.JOB_READ,
      PERMISSIONS.METRICS_READ,
    ],
  },
];

// Security configuration
export interface SecurityConfig {
  sessionTimeout: number; // ms
  maxFailedAttempts: number;
  lockoutDuration: number; // ms
  requireMFA: boolean;
  allowedIpRanges?: string[];
  suspiciousActivityThreshold: number;
  enableAuditLogging: boolean;
  rateLimits: {
    requests: number;
    windowMs: number;
  };
}

const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  sessionTimeout: 8 * 60 * 60 * 1000, // 8 hours
  maxFailedAttempts: 5,
  lockoutDuration: 30 * 60 * 1000, // 30 minutes
  requireMFA: false,
  suspiciousActivityThreshold: 10,
  enableAuditLogging: true,
  rateLimits: {
    requests: 100,
    windowMs: 60 * 1000, // 1 minute
  },
};

/**
 * Integration Authentication Service
 */
export class IntegrationAuthService extends EventEmitter {
  private config: SecurityConfig;
  private sessions = new Map<string, AuthSession>();
  private failedAttempts = new Map<string, FailedAttemptTracker>();
  private userRoles = new Map<string, Role[]>();
  private securityEvents: SecurityEvent[] = [];

  constructor(config?: Partial<SecurityConfig>) {
    super();
    this.config = { ...DEFAULT_SECURITY_CONFIG, ...config };
    this.initializeDefaultRoles();
    this.startCleanupTasks();
  }

  /**
   * Authenticate user and create session
   */
  async authenticate(credentials: AuthCredentials, context: AuthContext): Promise<AuthenticationResult> {
    const startTime = Date.now();
    const events: SecurityEvent[] = [];

    try {
      // Check rate limiting
      const rateLimitKey = `auth:${context.ipAddress || 'unknown'}`;
      if (!rateLimiter.checkLimit(rateLimitKey, this.config.rateLimits.requests, this.config.rateLimits.windowMs)) {
        const event = this.createSecurityEvent(
          SecurityEventType.RATE_LIMIT_EXCEEDED,
          credentials.userId || 'unknown',
          undefined,
          context,
          { rateLimitKey },
          'medium'
        );
        events.push(event);
        return {
          success: false,
          permissions: [],
          error: 'Rate limit exceeded',
          securityEvents: events,
        };
      }

      // Check for account lockout
      const lockoutStatus = this.checkAccountLockout(credentials.userId);
      if (lockoutStatus.locked) {
        const event = this.createSecurityEvent(
          SecurityEventType.AUTH_FAILURE,
          credentials.userId,
          undefined,
          context,
          { reason: 'account_locked', unlockAt: lockoutStatus.unlockAt },
          'high'
        );
        events.push(event);
        return {
          success: false,
          permissions: [],
          error: `Account locked until ${lockoutStatus.unlockAt?.toISOString()}`,
          securityEvents: events,
        };
      }

      // Verify credentials
      const authResult = await this.verifyCredentials(credentials);
      if (!authResult.valid) {
        this.recordFailedAttempt(credentials.userId, context);
        const event = this.createSecurityEvent(
          SecurityEventType.AUTH_FAILURE,
          credentials.userId,
          undefined,
          context,
          { reason: authResult.reason },
          'medium'
        );
        events.push(event);
        return {
          success: false,
          permissions: [],
          error: authResult.reason,
          securityEvents: events,
        };
      }

      // Check IP restrictions
      if (this.config.allowedIpRanges && !this.isIpAllowed(context.ipAddress)) {
        const event = this.createSecurityEvent(
          SecurityEventType.UNAUTHORIZED_ACCESS,
          credentials.userId,
          undefined,
          context,
          { reason: 'ip_not_allowed' },
          'high'
        );
        events.push(event);
        return {
          success: false,
          permissions: [],
          error: 'Access denied from this IP address',
          securityEvents: events,
        };
      }

      // Create session
      const session = this.createSession(credentials.userId, context);
      const permissions = this.getUserPermissions(credentials.userId);

      // Clear failed attempts on successful auth
      this.failedAttempts.delete(credentials.userId);

      const successEvent = this.createSecurityEvent(
        SecurityEventType.AUTH_SUCCESS,
        credentials.userId,
        undefined,
        context,
        { sessionId: session.id, duration: Date.now() - startTime },
        'low'
      );
      events.push(successEvent);

      // Audit log
      if (this.config.enableAuditLogging) {
        await auditService.log(
          credentials.userId,
          'authentication',
          'integration_auth',
          session.id,
          { success: true, method: credentials.type }
        );
      }

      return {
        success: true,
        userId: credentials.userId,
        permissions,
        sessionId: session.id,
        expiresAt: session.expiresAt,
        securityEvents: events,
      };
    } catch (error) {
      const errorEvent = this.createSecurityEvent(
        SecurityEventType.AUTH_FAILURE,
        credentials.userId || 'unknown',
        undefined,
        context,
        { error: error.message },
        'medium'
      );
      events.push(errorEvent);

      return {
        success: false,
        permissions: [],
        error: 'Authentication failed',
        securityEvents: events,
      };
    }
  }

  /**
   * Authorize user action
   */
  async authorize(request: AuthorizationRequest): Promise<AuthorizationResult> {
    try {
      // Check if user has required permission
      const permissions = this.getUserPermissions(request.userId);
      const hasPermission = this.checkPermission(permissions, request.action, request.context);

      if (!hasPermission) {
        const event = this.createSecurityEvent(
          SecurityEventType.PERMISSION_DENIED,
          request.userId,
          request.context.integrationId,
          request.context,
          { action: request.action, resource: request.resource },
          'medium'
        );
        this.securityEvents.push(event);
        
        return {
          granted: false,
          reason: `Permission denied for action: ${request.action}`,
        };
      }

      // Check resource-specific authorization
      const resourceAuth = await this.checkResourceAuthorization(request);
      if (!resourceAuth.granted) {
        return resourceAuth;
      }

      return { granted: true };
    } catch (error) {
      return {
        granted: false,
        reason: `Authorization error: ${error.message}`,
      };
    }
  }

  /**
   * Validate session
   */
  validateSession(sessionId: string): AuthSession | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    if (session.expiresAt < new Date()) {
      this.sessions.delete(sessionId);
      return null;
    }

    // Update last activity
    session.lastActivity = new Date();
    return session;
  }

  /**
   * Revoke session
   */
  revokeSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * Get user permissions
   */
  getUserPermissions(userId: string): Permission[] {
    const roles = this.userRoles.get(userId) || [];
    const permissions = new Set<Permission>();

    for (const role of roles) {
      for (const permission of role.permissions) {
        permissions.add(permission);
      }
    }

    return Array.from(permissions);
  }

  /**
   * Assign role to user
   */
  assignRole(userId: string, roleId: string, workspaceId?: string): boolean {
    const role = DEFAULT_ROLES.find(r => r.id === roleId);
    if (!role) return false;

    const userRoles = this.userRoles.get(userId) || [];
    const roleWithWorkspace = { ...role, workspaceId };
    userRoles.push(roleWithWorkspace);
    this.userRoles.set(userId, userRoles);

    return true;
  }

  /**
   * Remove role from user
   */
  removeRole(userId: string, roleId: string, workspaceId?: string): boolean {
    const userRoles = this.userRoles.get(userId) || [];
    const filteredRoles = userRoles.filter(r => 
      r.id !== roleId || r.workspaceId !== workspaceId
    );
    this.userRoles.set(userId, filteredRoles);
    return true;
  }

  /**
   * Get security events
   */
  getSecurityEvents(filters?: {
    userId?: string;
    type?: SecurityEventType;
    risk?: string;
    since?: Date;
    limit?: number;
  }): SecurityEvent[] {
    let events = this.securityEvents;

    if (filters) {
      if (filters.userId) {
        events = events.filter(e => e.userId === filters.userId);
      }
      if (filters.type) {
        events = events.filter(e => e.type === filters.type);
      }
      if (filters.risk) {
        events = events.filter(e => e.risk === filters.risk);
      }
      if (filters.since) {
        events = events.filter(e => e.timestamp >= filters.since!);
      }
    }

    const limit = filters?.limit || 100;
    return events.slice(-limit);
  }

  // Private methods
  private initializeDefaultRoles(): void {
    // Initialize with system admin user
    const systemAdminRole: Role = {
      id: 'system_admin',
      name: 'System Administrator',
      permissions: [PERMISSIONS.ADMIN_ALL],
    };

    this.userRoles.set('system', [systemAdminRole]);
  }

  private async verifyCredentials(credentials: AuthCredentials): Promise<{ valid: boolean; reason?: string }> {
    switch (credentials.type) {
      case 'session':
        const session = this.validateSession(credentials.sessionId!);
        return session ? { valid: true } : { valid: false, reason: 'Invalid or expired session' };

      case 'api_key':
        // Verify API key against stored credentials
        const apiKeyValid = await this.verifyApiKey(credentials.apiKey!);
        return apiKeyValid ? { valid: true } : { valid: false, reason: 'Invalid API key' };

      case 'oauth':
        // Verify OAuth token
        const oauthValid = await this.verifyOAuthToken(credentials.token!);
        return oauthValid ? { valid: true } : { valid: false, reason: 'Invalid OAuth token' };

      default:
        return { valid: false, reason: 'Unsupported credential type' };
    }
  }

  private async verifyApiKey(apiKey: string): Promise<boolean> {
    // Implementation would verify against stored API keys
    // For now, accept any non-empty key
    return apiKey && apiKey.length > 10;
  }

  private async verifyOAuthToken(token: string): Promise<boolean> {
    // Implementation would verify OAuth token with provider
    // For now, accept any non-empty token
    return token && token.length > 20;
  }

  private createSession(userId: string, context: AuthContext): AuthSession {
    const session: AuthSession = {
      id: this.generateSessionId(),
      userId,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.config.sessionTimeout),
      lastActivity: new Date(),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    };

    this.sessions.set(session.id, session);
    return session;
  }

  private generateSessionId(): string {
    return `ses_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private checkPermission(permissions: Permission[], action: string, context: Record<string, any>): boolean {
    // Check for admin permission
    if (permissions.includes(PERMISSIONS.ADMIN_ALL)) {
      return true;
    }

    // Check for specific permission
    if (permissions.includes(action as Permission)) {
      return true;
    }

    // Check workspace-specific permissions
    if (context.workspaceId && permissions.includes(PERMISSIONS.WORKSPACE_ADMIN)) {
      return true;
    }

    return false;
  }

  private async checkResourceAuthorization(request: AuthorizationRequest): Promise<AuthorizationResult> {
    // Check if user has access to the specific resource
    if (request.context.integrationId) {
      const integration = await integrationRepository.getIntegration(request.context.integrationId);
      if (!integration) {
        return { granted: false, reason: 'Integration not found' };
      }

      // Check workspace access
      if (request.context.workspaceId && integration.workspaceId !== request.context.workspaceId) {
        return { granted: false, reason: 'Integration not in specified workspace' };
      }
    }

    return { granted: true };
  }

  private checkAccountLockout(userId: string): { locked: boolean; unlockAt?: Date } {
    const attempts = this.failedAttempts.get(userId);
    if (!attempts) return { locked: false };

    if (attempts.count >= this.config.maxFailedAttempts) {
      const unlockAt = new Date(attempts.lastAttempt.getTime() + this.config.lockoutDuration);
      if (new Date() < unlockAt) {
        return { locked: true, unlockAt };
      } else {
        // Lockout period has expired
        this.failedAttempts.delete(userId);
        return { locked: false };
      }
    }

    return { locked: false };
  }

  private recordFailedAttempt(userId: string, context: AuthContext): void {
    const existing = this.failedAttempts.get(userId) || {
      count: 0,
      firstAttempt: new Date(),
      lastAttempt: new Date(),
      ipAddresses: new Set(),
    };

    existing.count++;
    existing.lastAttempt = new Date();
    existing.ipAddresses.add(context.ipAddress || 'unknown');

    this.failedAttempts.set(userId, existing);
  }

  private isIpAllowed(ipAddress?: string): boolean {
    if (!ipAddress || !this.config.allowedIpRanges) return true;

    // Simple IP range checking (would use proper CIDR checking in production)
    return this.config.allowedIpRanges.some(range => {
      if (range === '*') return true;
      if (range === ipAddress) return true;
      if (range.endsWith('*')) {
        const prefix = range.slice(0, -1);
        return ipAddress.startsWith(prefix);
      }
      return false;
    });
  }

  private createSecurityEvent(
    type: SecurityEventType,
    userId: string,
    integrationId: string | undefined,
    context: AuthContext,
    details: Record<string, any>,
    risk: SecurityEvent['risk']
  ): SecurityEvent {
    return {
      type,
      userId,
      integrationId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      timestamp: new Date(),
      details,
      risk,
    };
  }

  private startCleanupTasks(): void {
    // Clean up expired sessions every 5 minutes
    setInterval(() => {
      const now = new Date();
      for (const [sessionId, session] of this.sessions.entries()) {
        if (session.expiresAt < now) {
          this.sessions.delete(sessionId);
        }
      }
    }, 5 * 60 * 1000);

    // Clean up old security events every hour
    setInterval(() => {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours
      this.securityEvents = this.securityEvents.filter(e => e.timestamp > cutoff);
    }, 60 * 60 * 1000);
  }
}

// Supporting interfaces
interface AuthCredentials {
  userId: string;
  type: 'session' | 'api_key' | 'oauth';
  sessionId?: string;
  apiKey?: string;
  token?: string;
  [key: string]: any;
}

interface AuthContext {
  ipAddress?: string;
  userAgent?: string;
  workspaceId?: string;
  integrationId?: string;
  [key: string]: any;
}

interface AuthSession {
  id: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
  lastActivity: Date;
  ipAddress?: string;
  userAgent?: string;
}

interface FailedAttemptTracker {
  count: number;
  firstAttempt: Date;
  lastAttempt: Date;
  ipAddresses: Set<string>;
}

// Singleton instance
export const integrationAuth = new IntegrationAuthService();

// Middleware helper for Express-like frameworks
export function requireAuth(permission?: Permission) {
  return async (req: any, res: any, next: any) => {
    try {
      const sessionId = req.headers.authorization?.replace('Bearer ', '');
      if (!sessionId) {
        return res.status(401).json({ error: 'Missing authorization header' });
      }

      const session = integrationAuth.validateSession(sessionId);
      if (!session) {
        return res.status(401).json({ error: 'Invalid or expired session' });
      }

      if (permission) {
        const authResult = await integrationAuth.authorize({
          userId: session.userId,
          action: permission,
          resource: req.path,
          context: {
            workspaceId: req.params.workspaceId,
            integrationId: req.params.integrationId,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
          },
        });

        if (!authResult.granted) {
          return res.status(403).json({ error: authResult.reason });
        }
      }

      req.user = { userId: session.userId, sessionId: session.id };
      next();
    } catch (error) {
      res.status(500).json({ error: 'Authentication error' });
    }
  };
}