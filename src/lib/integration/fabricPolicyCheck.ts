/**
 * CBRT Fabric Policy Checker
 * Local mirror of mesh policy decisions with detailed reasoning and fallback logic
 */

import { logger } from '../../utils/logger';

// Types
export interface PolicyDecision {
  allowed: boolean;
  reason: string;
  code: string;
  metadata: {
    policyVersion: string;
    evaluationTime: number;
    rulePath: string[];
    context: Record<string, any>;
  };
}

export interface PolicyContext {
  user?: {
    id: string;
    role: string;
    permissions: string[];
    sessionId: string;
  };
  request: {
    method: string;
    path: string;
    headers: Record<string, string>;
    sourceIp: string;
    userAgent: string;
  };
  service: {
    sourceSpiffeId: string;
    targetSpiffeId: string;
    sourceService: string;
    targetService: string;
  };
  time: {
    timestamp: number;
    timezone: string;
    businessHours: boolean;
  };
  rateLimit?: {
    currentUsage: number;
    limit: number;
    resetTime: number;
  };
}

export interface PolicyRule {
  id: string;
  name: string;
  priority: number;
  conditions: PolicyCondition[];
  action: 'ALLOW' | 'DENY' | 'RATE_LIMIT' | 'REQUIRE_APPROVAL';
  metadata?: Record<string, any>;
}

export interface PolicyCondition {
  type: 'path' | 'method' | 'role' | 'permission' | 'time' | 'rate_limit' | 'spiffe_id' | 'custom';
  operator: 'equals' | 'contains' | 'starts_with' | 'regex' | 'in' | 'gt' | 'lt' | 'between';
  value: any;
  negate?: boolean;
}

class FabricPolicyChecker {
  private policies: PolicyRule[] = [];
  private policyVersion: string = '1.0.0';

  constructor() {
    this.initializePolicies();
  }

  /**
   * Check if a request is allowed based on fabric policies
   */
  async checkPolicy(context: PolicyContext): Promise<PolicyDecision> {
    const startTime = Date.now();
    
    try {
      // Sort policies by priority (higher number = higher priority)
      const sortedPolicies = [...this.policies].sort((a, b) => b.priority - a.priority);

      for (const policy of sortedPolicies) {
        const result = await this.evaluatePolicy(policy, context);
        
        if (result.matches) {
          const decision: PolicyDecision = {
            allowed: policy.action === 'ALLOW',
            reason: result.reason,
            code: this.getDecisionCode(policy.action, result.reason),
            metadata: {
              policyVersion: this.policyVersion,
              evaluationTime: Date.now() - startTime,
              rulePath: [policy.id, policy.name],
              context: this.sanitizeContext(context),
            },
          };

          logger.info('Policy decision made', {
            policyId: policy.id,
            decision: decision.allowed ? 'ALLOW' : 'DENY',
            reason: decision.reason,
            evaluationTime: decision.metadata.evaluationTime,
            context: decision.metadata.context,
          });

          return decision;
        }
      }

      // Default deny if no policies match
      return {
        allowed: false,
        reason: 'No matching policy found',
        code: 'DEFAULT_DENY',
        metadata: {
          policyVersion: this.policyVersion,
          evaluationTime: Date.now() - startTime,
          rulePath: ['default', 'deny_all'],
          context: this.sanitizeContext(context),
        },
      };

    } catch (error) {
      logger.error('Policy evaluation failed', {
        error: (error as Error).message,
        context: this.sanitizeContext(context),
      });

      // Fail closed - deny on error
      return {
        allowed: false,
        reason: 'Policy evaluation error',
        code: 'EVALUATION_ERROR',
        metadata: {
          policyVersion: this.policyVersion,
          evaluationTime: Date.now() - startTime,
          rulePath: ['error', 'fail_closed'],
          context: this.sanitizeContext(context),
        },
      };
    }
  }

  /**
   * Validate that a request conforms to rate limiting policies
   */
  async checkRateLimit(context: PolicyContext): Promise<PolicyDecision> {
    if (!context.rateLimit) {
      return {
        allowed: true,
        reason: 'No rate limit context provided',
        code: 'NO_RATE_LIMIT',
        metadata: {
          policyVersion: this.policyVersion,
          evaluationTime: 0,
          rulePath: ['rate_limit', 'no_context'],
          context: this.sanitizeContext(context),
        },
      };
    }

    const { currentUsage, limit, resetTime } = context.rateLimit;
    const now = Date.now();

    if (currentUsage >= limit && now < resetTime) {
      return {
        allowed: false,
        reason: `Rate limit exceeded: ${currentUsage}/${limit}`,
        code: 'RATE_LIMIT_EXCEEDED',
        metadata: {
          policyVersion: this.policyVersion,
          evaluationTime: 1,
          rulePath: ['rate_limit', 'exceeded'],
          context: {
            ...this.sanitizeContext(context),
            rateLimitDetails: {
              current: currentUsage,
              limit,
              resetTime,
              secondsUntilReset: Math.ceil((resetTime - now) / 1000),
            },
          },
        },
      };
    }

    return {
      allowed: true,
      reason: `Rate limit OK: ${currentUsage}/${limit}`,
      code: 'RATE_LIMIT_OK',
      metadata: {
        policyVersion: this.policyVersion,
        evaluationTime: 1,
        rulePath: ['rate_limit', 'allowed'],
        context: this.sanitizeContext(context),
      },
    };
  }

  /**
   * Check business hours restrictions
   */
  checkBusinessHours(context: PolicyContext): PolicyDecision {
    const { time, user, request } = context;

    // Admin users bypass business hours restrictions
    if (user?.role === 'admin') {
      return {
        allowed: true,
        reason: 'Admin user bypasses business hours',
        code: 'ADMIN_BYPASS',
        metadata: {
          policyVersion: this.policyVersion,
          evaluationTime: 1,
          rulePath: ['business_hours', 'admin_bypass'],
          context: this.sanitizeContext(context),
        },
      };
    }

    // Warehouse operations restricted to business hours
    if (request.path.includes('/warehouse/') && user?.role === 'loader') {
      if (!time.businessHours) {
        return {
          allowed: false,
          reason: 'Warehouse operations restricted to business hours',
          code: 'OUTSIDE_BUSINESS_HOURS',
          metadata: {
            policyVersion: this.policyVersion,
            evaluationTime: 1,
            rulePath: ['business_hours', 'warehouse_restricted'],
            context: this.sanitizeContext(context),
          },
        };
      }
    }

    return {
      allowed: true,
      reason: 'Business hours check passed',
      code: 'BUSINESS_HOURS_OK',
      metadata: {
        policyVersion: this.policyVersion,
        evaluationTime: 1,
        rulePath: ['business_hours', 'allowed'],
        context: this.sanitizeContext(context),
      },
    };
  }

  /**
   * Check SPIFFE ID authorization
   */
  checkSpiffeAuthorization(context: PolicyContext): PolicyDecision {
    const { service } = context;

    // Validate SPIFFE ID format
    if (!service.sourceSpiffeId.startsWith('spiffe://cbrt.company.com/')) {
      return {
        allowed: false,
        reason: 'Invalid SPIFFE ID format',
        code: 'INVALID_SPIFFE_ID',
        metadata: {
          policyVersion: this.policyVersion,
          evaluationTime: 1,
          rulePath: ['spiffe', 'invalid_format'],
          context: this.sanitizeContext(context),
        },
      };
    }

    // Check if source service is authorized to call target service
    const authorized = this.isSpiffeAuthorized(service.sourceSpiffeId, service.targetSpiffeId);
    
    return {
      allowed: authorized,
      reason: authorized ? 'SPIFFE ID authorized' : 'SPIFFE ID not authorized for target service',
      code: authorized ? 'SPIFFE_AUTHORIZED' : 'SPIFFE_UNAUTHORIZED',
      metadata: {
        policyVersion: this.policyVersion,
        evaluationTime: 1,
        rulePath: ['spiffe', authorized ? 'authorized' : 'unauthorized'],
        context: this.sanitizeContext(context),
      },
    };
  }

  /**
   * Evaluate a single policy against the context
   */
  private async evaluatePolicy(policy: PolicyRule, context: PolicyContext): Promise<{ matches: boolean; reason: string }> {
    for (const condition of policy.conditions) {
      const conditionResult = await this.evaluateCondition(condition, context);
      
      if (!conditionResult) {
        return {
          matches: false,
          reason: `Condition failed: ${condition.type} ${condition.operator} ${condition.value}`,
        };
      }
    }

    return {
      matches: true,
      reason: `Policy ${policy.name} matched`,
    };
  }

  /**
   * Evaluate a single condition
   */
  private async evaluateCondition(condition: PolicyCondition, context: PolicyContext): Promise<boolean> {
    let result = false;
    let actualValue: any;

    switch (condition.type) {
      case 'path':
        actualValue = context.request.path;
        break;
      case 'method':
        actualValue = context.request.method;
        break;
      case 'role':
        actualValue = context.user?.role;
        break;
      case 'permission':
        actualValue = context.user?.permissions || [];
        break;
      case 'spiffe_id':
        actualValue = context.service.sourceSpiffeId;
        break;
      case 'time':
        actualValue = context.time.businessHours;
        break;
      case 'rate_limit':
        actualValue = context.rateLimit?.currentUsage || 0;
        break;
      default:
        return false;
    }

    switch (condition.operator) {
      case 'equals':
        result = actualValue === condition.value;
        break;
      case 'contains':
        result = Array.isArray(actualValue) 
          ? actualValue.includes(condition.value)
          : String(actualValue).includes(String(condition.value));
        break;
      case 'starts_with':
        result = String(actualValue).startsWith(String(condition.value));
        break;
      case 'regex':
        result = new RegExp(condition.value).test(String(actualValue));
        break;
      case 'in':
        result = Array.isArray(condition.value) && condition.value.includes(actualValue);
        break;
      case 'gt':
        result = Number(actualValue) > Number(condition.value);
        break;
      case 'lt':
        result = Number(actualValue) < Number(condition.value);
        break;
      case 'between':
        const [min, max] = condition.value;
        result = Number(actualValue) >= Number(min) && Number(actualValue) <= Number(max);
        break;
      default:
        return false;
    }

    return condition.negate ? !result : result;
  }

  /**
   * Initialize default policies
   */
  private initializePolicies(): void {
    this.policies = [
      // Health check endpoints - highest priority
      {
        id: 'health-check-allow',
        name: 'Allow health check endpoints',
        priority: 1000,
        conditions: [
          { type: 'path', operator: 'in', value: ['/health', '/ready', '/metrics'] },
        ],
        action: 'ALLOW',
      },

      // Admin access - very high priority
      {
        id: 'admin-access',
        name: 'Admin users have full access',
        priority: 900,
        conditions: [
          { type: 'role', operator: 'equals', value: 'admin' },
        ],
        action: 'ALLOW',
      },

      // Authentication endpoints
      {
        id: 'auth-endpoints',
        name: 'Allow authentication endpoints',
        priority: 800,
        conditions: [
          { type: 'path', operator: 'starts_with', value: '/api/auth/' },
        ],
        action: 'ALLOW',
      },

      // Office user CRUD operations
      {
        id: 'office-crud',
        name: 'Office users can perform CRUD operations',
        priority: 700,
        conditions: [
          { type: 'role', operator: 'in', value: ['admin', 'office'] },
          { type: 'path', operator: 'regex', value: '^/api/v1/(releases|customers|suppliers|items|sizes)' },
          { type: 'method', operator: 'in', value: ['GET', 'POST', 'PUT'] },
        ],
        action: 'ALLOW',
      },

      // Loader warehouse operations during business hours
      {
        id: 'loader-warehouse',
        name: 'Loader warehouse operations during business hours',
        priority: 600,
        conditions: [
          { type: 'role', operator: 'in', value: ['admin', 'office', 'loader'] },
          { type: 'path', operator: 'starts_with', value: '/api/v1/releases/' },
          { type: 'path', operator: 'contains', value: '/advance' },
          { type: 'method', operator: 'equals', value: 'PUT' },
          { type: 'time', operator: 'equals', value: true }, // business hours
        ],
        action: 'ALLOW',
      },

      // Viewer read-only access
      {
        id: 'viewer-readonly',
        name: 'Viewer read-only access',
        priority: 500,
        conditions: [
          { type: 'role', operator: 'equals', value: 'viewer' },
          { type: 'method', operator: 'equals', value: 'GET' },
          { type: 'path', operator: 'regex', value: '^/api/v1/(releases|barcodes)' },
        ],
        action: 'ALLOW',
      },

      // Rate limiting for high-volume endpoints
      {
        id: 'rate-limit-barcodes',
        name: 'Rate limit barcode endpoints',
        priority: 400,
        conditions: [
          { type: 'path', operator: 'starts_with', value: '/api/v1/barcodes' },
          { type: 'rate_limit', operator: 'gt', value: 100 }, // per minute
        ],
        action: 'RATE_LIMIT',
      },

      // Block external SPIFFE IDs
      {
        id: 'block-external-spiffe',
        name: 'Block external SPIFFE IDs',
        priority: 300,
        conditions: [
          { type: 'spiffe_id', operator: 'starts_with', value: 'spiffe://cbrt.company.com/', negate: true },
        ],
        action: 'DENY',
      },

      // Default deny for admin endpoints
      {
        id: 'admin-endpoints-deny',
        name: 'Deny admin endpoints to non-admins',
        priority: 200,
        conditions: [
          { type: 'path', operator: 'starts_with', value: '/api/v1/admin/' },
          { type: 'role', operator: 'equals', value: 'admin', negate: true },
        ],
        action: 'DENY',
      },

      // Delete operations require approval
      {
        id: 'delete-approval',
        name: 'Delete operations require approval',
        priority: 100,
        conditions: [
          { type: 'method', operator: 'equals', value: 'DELETE' },
          { type: 'role', operator: 'equals', value: 'admin', negate: true },
        ],
        action: 'REQUIRE_APPROVAL',
      },
    ];
  }

  /**
   * Check SPIFFE authorization matrix
   */
  private isSpiffeAuthorized(sourceSpiffeId: string, targetSpiffeId: string): boolean {
    const authorizationMatrix: Record<string, string[]> = {
      'spiffe://cbrt.company.com/frontend/cbrt-ui': [
        'spiffe://cbrt.company.com/api/cbrt-backend',
        'spiffe://cbrt.company.com/observability/metrics',
      ],
      'spiffe://cbrt.company.com/api/cbrt-backend': [
        'spiffe://cbrt.company.com/warehouse/operations',
        'spiffe://cbrt.company.com/observability/metrics',
      ],
      'spiffe://cbrt.company.com/warehouse/operations': [
        'spiffe://cbrt.company.com/api/cbrt-backend',
        'spiffe://cbrt.company.com/observability/metrics',
      ],
      'spiffe://cbrt.company.com/observability/metrics': [
        '*', // Observability can connect to all services
      ],
      'spiffe://cbrt.company.com/gateway/istio': [
        '*', // Gateway can route to all services
      ],
    };

    const allowedTargets = authorizationMatrix[sourceSpiffeId] || [];
    return allowedTargets.includes('*') || allowedTargets.includes(targetSpiffeId);
  }

  /**
   * Generate decision code based on action and reason
   */
  private getDecisionCode(action: string, reason: string): string {
    const actionCode = action.replace(/[^A-Z]/g, '');
    const reasonCode = reason.replace(/[^a-zA-Z]/g, '').toUpperCase().substring(0, 8);
    return `${actionCode}_${reasonCode}`;
  }

  /**
   * Sanitize context for logging (remove sensitive data)
   */
  private sanitizeContext(context: PolicyContext): Record<string, any> {
    return {
      user: context.user ? {
        id: context.user.id,
        role: context.user.role,
        permissionCount: context.user.permissions?.length || 0,
      } : null,
      request: {
        method: context.request.method,
        path: context.request.path,
        sourceIp: context.request.sourceIp.replace(/\d+$/, 'XXX'), // Mask last octet
        userAgent: context.request.userAgent.substring(0, 50),
      },
      service: {
        sourceService: context.service.sourceService,
        targetService: context.service.targetService,
      },
      time: {
        businessHours: context.time.businessHours,
        timezone: context.time.timezone,
      },
    };
  }

  /**
   * Update policies from external source
   */
  updatePolicies(policies: PolicyRule[]): void {
    this.policies = policies;
    this.policyVersion = `${Date.now()}`;
    
    logger.info('Policies updated', {
      policyCount: policies.length,
      version: this.policyVersion,
    });
  }

  /**
   * Get current policy statistics
   */
  getPolicyStats(): {
    totalPolicies: number;
    version: string;
    policiesByAction: Record<string, number>;
  } {
    const policiesByAction = this.policies.reduce((acc, policy) => {
      acc[policy.action] = (acc[policy.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalPolicies: this.policies.length,
      version: this.policyVersion,
      policiesByAction,
    };
  }
}

// Create default policy checker instance
export const fabricPolicyChecker = new FabricPolicyChecker();

// Export the class for custom configurations
export { FabricPolicyChecker };