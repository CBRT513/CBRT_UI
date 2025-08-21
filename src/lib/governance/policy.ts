/**
 * Governance Rule Engine
 */

import { Role, Permission } from '../auth/roles';
import { auditService, AuditAction } from './audit';

export interface Policy {
  id: string;
  name: string;
  description?: string;
  type: PolicyType;
  rules: PolicyRule[];
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  workspaceId?: string;
}

export enum PolicyType {
  ACCESS_CONTROL = 'access_control',
  DATA_QUALITY = 'data_quality',
  MODERATION = 'moderation',
  APPROVAL_WORKFLOW = 'approval_workflow',
  RETENTION = 'retention',
  EXPORT_CONTROL = 'export_control',
}

export interface PolicyRule {
  id: string;
  condition: RuleCondition;
  action: RuleAction;
  priority: number;
}

export interface RuleCondition {
  type: 'role' | 'permission' | 'entity' | 'confidence' | 'time' | 'custom';
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: any;
  field?: string;
}

export interface RuleAction {
  type: 'allow' | 'deny' | 'require_approval' | 'flag' | 'notify' | 'log';
  metadata?: Record<string, any>;
}

export interface ModerationFlag {
  id: string;
  entityType: string;
  entityId: string;
  reason: string;
  confidence?: number;
  flaggedBy: string;
  flaggedAt: Date;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
}

export interface ApprovalRequest {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  requestedBy: string;
  requestedAt: Date;
  approvers: string[];
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
}

/**
 * Governance policy service
 */
export class PolicyService {
  private policies: Map<string, Policy> = new Map();
  private moderationFlags: Map<string, ModerationFlag> = new Map();
  private approvalRequests: Map<string, ApprovalRequest> = new Map();

  /**
   * Create a new policy
   */
  async createPolicy(
    name: string,
    type: PolicyType,
    rules: PolicyRule[],
    createdBy: string,
    workspaceId?: string
  ): Promise<Policy> {
    const policy: Policy = {
      id: `pol_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      type,
      rules,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy,
      workspaceId,
    };

    this.policies.set(policy.id, policy);

    // Audit log
    await auditService.log(
      createdBy,
      AuditAction.POLICY_CREATE,
      'policy',
      policy.id,
      {
        workspaceId,
        metadata: { policyName: name, policyType: type },
      }
    );

    return policy;
  }

  /**
   * Evaluate policies for an action
   */
  async evaluateAction(
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    context: Record<string, any> = {}
  ): Promise<{
    allowed: boolean;
    requiresApproval: boolean;
    flags: string[];
    appliedPolicies: Policy[];
  }> {
    const applicablePolicies = this.getApplicablePolicies(
      context.workspaceId,
      entityType
    );

    let allowed = true;
    let requiresApproval = false;
    const flags: string[] = [];
    const appliedPolicies: Policy[] = [];

    for (const policy of applicablePolicies) {
      if (!policy.enabled) continue;

      for (const rule of policy.rules) {
        if (this.evaluateCondition(rule.condition, { userId, action, entityType, ...context })) {
          appliedPolicies.push(policy);

          switch (rule.action.type) {
            case 'deny':
              allowed = false;
              break;
            
            case 'require_approval':
              requiresApproval = true;
              break;
            
            case 'flag':
              flags.push(rule.action.metadata?.reason || 'Policy violation');
              break;
            
            case 'notify':
              await this.sendNotification(userId, action, entityId, rule);
              break;
            
            case 'log':
              await auditService.log(
                userId,
                AuditAction.POLICY_VIOLATION,
                entityType,
                entityId,
                {
                  metadata: { policy: policy.name, rule: rule.id },
                }
              );
              break;
          }
        }
      }
    }

    return {
      allowed,
      requiresApproval,
      flags,
      appliedPolicies,
    };
  }

  /**
   * Flag entity for moderation
   */
  async flagForModeration(
    entityType: string,
    entityId: string,
    reason: string,
    flaggedBy: string,
    confidence?: number
  ): Promise<ModerationFlag> {
    const flag: ModerationFlag = {
      id: `flag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      entityType,
      entityId,
      reason,
      confidence,
      flaggedBy,
      flaggedAt: new Date(),
      status: 'pending',
    };

    this.moderationFlags.set(flag.id, flag);

    // Audit log
    await auditService.log(
      flaggedBy,
      AuditAction.AI_MODERATE,
      entityType,
      entityId,
      {
        metadata: { reason, confidence },
      }
    );

    return flag;
  }

  /**
   * Review moderation flag
   */
  async reviewModerationFlag(
    flagId: string,
    reviewedBy: string,
    approved: boolean,
    notes?: string
  ): Promise<ModerationFlag> {
    const flag = this.moderationFlags.get(flagId);
    if (!flag) {
      throw new Error(`Moderation flag ${flagId} not found`);
    }

    flag.status = approved ? 'approved' : 'rejected';
    flag.reviewedBy = reviewedBy;
    flag.reviewedAt = new Date();
    flag.reviewNotes = notes;

    // Audit log
    await auditService.log(
      reviewedBy,
      approved ? AuditAction.AI_APPROVE : AuditAction.AI_REJECT,
      flag.entityType,
      flag.entityId,
      {
        metadata: { flagId, notes },
      }
    );

    return flag;
  }

  /**
   * Create approval request
   */
  async requestApproval(
    entityType: string,
    entityId: string,
    action: string,
    requestedBy: string,
    approvers: string[]
  ): Promise<ApprovalRequest> {
    const request: ApprovalRequest = {
      id: `apr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      entityType,
      entityId,
      action,
      requestedBy,
      requestedAt: new Date(),
      approvers,
      status: 'pending',
    };

    this.approvalRequests.set(request.id, request);

    // Notify approvers
    for (const approver of approvers) {
      await this.notifyApprover(approver, request);
    }

    return request;
  }

  /**
   * Process approval request
   */
  async processApproval(
    requestId: string,
    approvedBy: string,
    approved: boolean,
    reason?: string
  ): Promise<ApprovalRequest> {
    const request = this.approvalRequests.get(requestId);
    if (!request) {
      throw new Error(`Approval request ${requestId} not found`);
    }

    if (!request.approvers.includes(approvedBy)) {
      throw new Error('User is not authorized to approve this request');
    }

    request.status = approved ? 'approved' : 'rejected';
    request.approvedBy = approvedBy;
    request.approvedAt = new Date();
    
    if (!approved) {
      request.rejectionReason = reason;
    }

    // Audit log
    await auditService.log(
      approvedBy,
      approved ? AuditAction.AI_APPROVE : AuditAction.AI_REJECT,
      request.entityType,
      request.entityId,
      {
        metadata: { requestId, action: request.action, reason },
      }
    );

    return request;
  }

  /**
   * Get applicable policies
   */
  private getApplicablePolicies(
    workspaceId?: string,
    entityType?: string
  ): Policy[] {
    const policies: Policy[] = [];

    for (const policy of this.policies.values()) {
      // Check workspace scope
      if (workspaceId && policy.workspaceId && policy.workspaceId !== workspaceId) {
        continue;
      }

      // Check if policy applies to entity type
      // (In a real implementation, this would be more sophisticated)
      policies.push(policy);
    }

    // Sort by priority
    policies.sort((a, b) => {
      const aPriority = Math.min(...a.rules.map(r => r.priority));
      const bPriority = Math.min(...b.rules.map(r => r.priority));
      return aPriority - bPriority;
    });

    return policies;
  }

  /**
   * Evaluate a rule condition
   */
  private evaluateCondition(
    condition: RuleCondition,
    context: Record<string, any>
  ): boolean {
    const value = condition.field ? context[condition.field] : context[condition.type];

    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      
      case 'not_equals':
        return value !== condition.value;
      
      case 'contains':
        return Array.isArray(value) 
          ? value.includes(condition.value)
          : String(value).includes(String(condition.value));
      
      case 'greater_than':
        return Number(value) > Number(condition.value);
      
      case 'less_than':
        return Number(value) < Number(condition.value);
      
      default:
        return false;
    }
  }

  /**
   * Send notification
   */
  private async sendNotification(
    userId: string,
    action: string,
    entityId: string,
    rule: PolicyRule
  ): Promise<void> {
    // In a real implementation, this would send actual notifications
    console.log('Policy Notification:', {
      userId,
      action,
      entityId,
      rule: rule.id,
    });
  }

  /**
   * Notify approver
   */
  private async notifyApprover(
    approverId: string,
    request: ApprovalRequest
  ): Promise<void> {
    // In a real implementation, this would send actual notifications
    console.log('Approval Request Notification:', {
      approverId,
      requestId: request.id,
      action: request.action,
    });
  }

  /**
   * Get pending moderation flags
   */
  async getPendingFlags(workspaceId?: string): Promise<ModerationFlag[]> {
    const flags: ModerationFlag[] = [];

    for (const flag of this.moderationFlags.values()) {
      if (flag.status === 'pending') {
        flags.push(flag);
      }
    }

    return flags;
  }

  /**
   * Get pending approval requests
   */
  async getPendingApprovals(
    approverId?: string
  ): Promise<ApprovalRequest[]> {
    const requests: ApprovalRequest[] = [];

    for (const request of this.approvalRequests.values()) {
      if (request.status === 'pending') {
        if (!approverId || request.approvers.includes(approverId)) {
          requests.push(request);
        }
      }
    }

    return requests;
  }
}

// Singleton instance
export const policyService = new PolicyService();