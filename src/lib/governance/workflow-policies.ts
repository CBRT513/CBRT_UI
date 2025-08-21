/**
 * Workflow Governance Policies
 */

import { PolicyEngine, Policy, PolicyType } from './policy';
import { auditService, AuditAction } from './audit';
import { WorkflowChain, WorkflowInstance, WorkflowStep } from '../workflows';

export interface WorkflowPolicy extends Policy {
  workflowId?: string;
  stepId?: string;
  conditions: WorkflowCondition[];
  actions: WorkflowPolicyAction[];
}

export interface WorkflowCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
  dataSource?: 'entity' | 'metadata' | 'user' | 'context';
}

export interface WorkflowPolicyAction {
  type: 'approve' | 'reject' | 'escalate' | 'notify' | 'modify' | 'branch';
  params?: Record<string, any>;
}

export interface WorkflowGovernanceConfig {
  maxStepsPerChain: number;
  maxApproversPerStep: number;
  maxInstanceDuration: number; // milliseconds
  requireBusinessJustification: boolean;
  allowDynamicApprovers: boolean;
  enforceSegregationOfDuties: boolean;
}

/**
 * Workflow governance service
 */
export class WorkflowGovernance {
  private policies: Map<string, WorkflowPolicy> = new Map();
  private config: WorkflowGovernanceConfig;
  private policyEngine: PolicyEngine;

  constructor(config?: Partial<WorkflowGovernanceConfig>) {
    this.config = {
      maxStepsPerChain: 20,
      maxApproversPerStep: 10,
      maxInstanceDuration: 7 * 24 * 60 * 60 * 1000, // 7 days
      requireBusinessJustification: true,
      allowDynamicApprovers: true,
      enforceSegregationOfDuties: true,
      ...config,
    };

    this.policyEngine = new PolicyEngine();
    this.initializeDefaultPolicies();
  }

  /**
   * Initialize default workflow policies
   */
  private initializeDefaultPolicies(): void {
    // Policy: High-value approval threshold
    this.addPolicy({
      id: 'wf_high_value_approval',
      name: 'High-Value Approval Required',
      type: PolicyType.APPROVAL_WORKFLOW,
      priority: 1,
      enabled: true,
      rules: [{
        conditions: {
          field: 'value',
          operator: 'greater_than',
          value: 100000,
        },
        action: 'flag',
        message: 'High-value transaction requires senior approval',
      }],
      conditions: [{
        field: 'entity.value',
        operator: 'greater_than',
        value: 100000,
        dataSource: 'entity',
      }],
      actions: [{
        type: 'escalate',
        params: {
          role: 'senior_manager',
          reason: 'High-value transaction',
        },
      }],
    });

    // Policy: Segregation of duties
    this.addPolicy({
      id: 'wf_segregation_duties',
      name: 'Segregation of Duties',
      type: PolicyType.ACCESS_CONTROL,
      priority: 2,
      enabled: true,
      rules: [{
        conditions: {
          field: 'approver',
          operator: 'not_equals',
          value: 'initiator',
        },
        action: 'deny',
        message: 'Initiator cannot approve their own request',
      }],
      conditions: [{
        field: 'user.id',
        operator: 'not_in',
        value: 'workflow.initiator',
        dataSource: 'context',
      }],
      actions: [{
        type: 'reject',
        params: {
          reason: 'Segregation of duties violation',
        },
      }],
    });

    // Policy: Deadline enforcement
    this.addPolicy({
      id: 'wf_deadline_enforcement',
      name: 'Deadline Enforcement',
      type: PolicyType.APPROVAL_WORKFLOW,
      priority: 3,
      enabled: true,
      rules: [{
        conditions: {
          field: 'deadline',
          operator: 'less_than',
          value: 'now',
        },
        action: 'escalate',
        message: 'Deadline exceeded, escalating to manager',
      }],
      conditions: [{
        field: 'metadata.deadline',
        operator: 'less_than',
        value: Date.now(),
        dataSource: 'metadata',
      }],
      actions: [{
        type: 'escalate',
        params: {
          notifyOriginal: true,
          autoApprove: false,
        },
      }],
    });

    // Policy: Parallel approval consensus
    this.addPolicy({
      id: 'wf_parallel_consensus',
      name: 'Parallel Approval Consensus',
      type: PolicyType.APPROVAL_WORKFLOW,
      priority: 4,
      enabled: true,
      rules: [{
        conditions: {
          field: 'mode',
          operator: 'equals',
          value: 'parallel',
        },
        action: 'require',
        message: 'All parallel approvers must approve',
      }],
      conditions: [{
        field: 'step.mode',
        operator: 'equals',
        value: 'parallel',
        dataSource: 'context',
      }],
      actions: [{
        type: 'modify',
        params: {
          requireAll: true,
          threshold: 1.0,
        },
      }],
    });
  }

  /**
   * Add a workflow policy
   */
  addPolicy(policy: WorkflowPolicy): void {
    this.policies.set(policy.id, policy);
    
    // Also register with main policy engine
    this.policyEngine.addPolicy(policy);
  }

  /**
   * Validate workflow chain
   */
  async validateChain(chain: WorkflowChain): Promise<{
    valid: boolean;
    violations: string[];
  }> {
    const violations: string[] = [];

    // Check max steps
    if (chain.steps.length > this.config.maxStepsPerChain) {
      violations.push(`Chain exceeds maximum ${this.config.maxStepsPerChain} steps`);
    }

    // Check each step
    for (const step of chain.steps) {
      const stepViolations = await this.validateStep(step);
      violations.push(...stepViolations);
    }

    // Check for circular dependencies
    if (this.hasCircularDependency(chain)) {
      violations.push('Chain contains circular dependencies');
    }

    // Check for unreachable steps
    const unreachable = this.findUnreachableSteps(chain);
    if (unreachable.length > 0) {
      violations.push(`Unreachable steps: ${unreachable.join(', ')}`);
    }

    return {
      valid: violations.length === 0,
      violations,
    };
  }

  /**
   * Validate workflow step
   */
  private async validateStep(step: WorkflowStep): Promise<string[]> {
    const violations: string[] = [];

    // Check max approvers
    if (step.approvers.length > this.config.maxApproversPerStep) {
      violations.push(`Step "${step.name}" exceeds maximum ${this.config.maxApproversPerStep} approvers`);
    }

    // Check dynamic approvers
    if (!this.config.allowDynamicApprovers) {
      const hasDynamic = step.approvers.some(a => a.type === 'dynamic');
      if (hasDynamic) {
        violations.push(`Step "${step.name}" uses dynamic approvers which are not allowed`);
      }
    }

    // Check timeout
    if (step.timeout && step.timeout > this.config.maxInstanceDuration) {
      violations.push(`Step "${step.name}" timeout exceeds maximum duration`);
    }

    return violations;
  }

  /**
   * Validate workflow instance
   */
  async validateInstance(
    instance: WorkflowInstance,
    chain: WorkflowChain,
    userId: string
  ): Promise<{
    valid: boolean;
    violations: string[];
  }> {
    const violations: string[] = [];

    // Check duration
    const duration = Date.now() - instance.startedAt.getTime();
    if (duration > this.config.maxInstanceDuration) {
      violations.push('Instance exceeds maximum duration');
    }

    // Check segregation of duties
    if (this.config.enforceSegregationOfDuties) {
      const initiator = instance.metadata?.initiatedBy;
      if (initiator === userId) {
        const currentStep = chain.steps.find(s => s.id === instance.currentStep);
        if (currentStep?.type === 'approval') {
          violations.push('Initiator cannot approve their own request');
        }
      }
    }

    // Check business justification
    if (this.config.requireBusinessJustification) {
      if (!instance.metadata?.justification) {
        violations.push('Business justification is required');
      }
    }

    // Apply custom policies
    for (const policy of this.policies.values()) {
      if (policy.enabled && this.isPolicyApplicable(policy, instance, chain)) {
        const result = await this.evaluatePolicy(policy, instance, chain, userId);
        if (!result.compliant) {
          violations.push(result.message || `Policy ${policy.name} violated`);
        }
      }
    }

    return {
      valid: violations.length === 0,
      violations,
    };
  }

  /**
   * Check if policy is applicable
   */
  private isPolicyApplicable(
    policy: WorkflowPolicy,
    instance: WorkflowInstance,
    chain: WorkflowChain
  ): boolean {
    // Check workflow ID match
    if (policy.workflowId && policy.workflowId !== chain.id) {
      return false;
    }

    // Check step ID match
    if (policy.stepId && policy.stepId !== instance.currentStep) {
      return false;
    }

    return true;
  }

  /**
   * Evaluate policy against instance
   */
  private async evaluatePolicy(
    policy: WorkflowPolicy,
    instance: WorkflowInstance,
    chain: WorkflowChain,
    userId: string
  ): Promise<{
    compliant: boolean;
    message?: string;
    actions?: WorkflowPolicyAction[];
  }> {
    // Evaluate all conditions
    const conditionsMet = policy.conditions.every(condition => 
      this.evaluateCondition(condition, instance, chain, userId)
    );

    if (!conditionsMet) {
      return { compliant: true }; // Policy doesn't apply
    }

    // Conditions met, check if this violates the policy
    const rule = policy.rules[0]; // Simplified: use first rule
    if (rule?.action === 'deny') {
      return {
        compliant: false,
        message: rule.message,
        actions: policy.actions,
      };
    }

    return {
      compliant: true,
      actions: policy.actions,
    };
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(
    condition: WorkflowCondition,
    instance: WorkflowInstance,
    chain: WorkflowChain,
    userId: string
  ): boolean {
    const value = this.getConditionValue(condition, instance, chain, userId);
    const targetValue = condition.value;

    switch (condition.operator) {
      case 'equals':
        return value === targetValue;
      case 'contains':
        return String(value).includes(String(targetValue));
      case 'greater_than':
        return Number(value) > Number(targetValue);
      case 'less_than':
        return Number(value) < Number(targetValue);
      case 'in':
        return Array.isArray(targetValue) && targetValue.includes(value);
      case 'not_in':
        return Array.isArray(targetValue) && !targetValue.includes(value);
      default:
        return false;
    }
  }

  /**
   * Get value for condition evaluation
   */
  private getConditionValue(
    condition: WorkflowCondition,
    instance: WorkflowInstance,
    chain: WorkflowChain,
    userId: string
  ): any {
    const source = condition.dataSource || 'entity';
    const field = condition.field;

    switch (source) {
      case 'entity':
        return this.getNestedValue(instance, field);
      case 'metadata':
        return this.getNestedValue(instance.metadata, field);
      case 'user':
        return field === 'id' ? userId : null;
      case 'context':
        return this.getContextValue(field, instance, chain);
      default:
        return null;
    }
  }

  /**
   * Get nested object value
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((acc, part) => acc?.[part], obj);
  }

  /**
   * Get context value
   */
  private getContextValue(field: string, instance: WorkflowInstance, chain: WorkflowChain): any {
    switch (field) {
      case 'workflow.initiator':
        return instance.metadata?.initiatedBy;
      case 'step.mode':
        const step = chain.steps.find(s => s.id === instance.currentStep);
        return step?.mode;
      default:
        return null;
    }
  }

  /**
   * Check for circular dependencies in workflow
   */
  private hasCircularDependency(chain: WorkflowChain): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (stepId: string): boolean => {
      visited.add(stepId);
      recursionStack.add(stepId);

      const step = chain.steps.find(s => s.id === stepId);
      if (step) {
        for (const nextId of step.nextSteps) {
          if (!visited.has(nextId)) {
            if (hasCycle(nextId)) return true;
          } else if (recursionStack.has(nextId)) {
            return true;
          }
        }
      }

      recursionStack.delete(stepId);
      return false;
    };

    for (const step of chain.steps) {
      if (!visited.has(step.id)) {
        if (hasCycle(step.id)) return true;
      }
    }

    return false;
  }

  /**
   * Find unreachable steps
   */
  private findUnreachableSteps(chain: WorkflowChain): string[] {
    if (chain.steps.length === 0) return [];

    const reachable = new Set<string>();
    const queue = [chain.steps[0].id];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (reachable.has(current)) continue;
      
      reachable.add(current);
      
      const step = chain.steps.find(s => s.id === current);
      if (step) {
        queue.push(...step.nextSteps);
      }
    }

    return chain.steps
      .filter(s => !reachable.has(s.id))
      .map(s => s.name || s.id);
  }

  /**
   * Apply policy actions
   */
  async applyPolicyActions(
    actions: WorkflowPolicyAction[],
    instance: WorkflowInstance,
    userId: string
  ): Promise<void> {
    for (const action of actions) {
      switch (action.type) {
        case 'approve':
          await auditService.log(
            userId,
            AuditAction.APPROVAL_DECISION,
            'workflow_instance',
            instance.id,
            {
              decision: 'approved',
              reason: 'Policy auto-approval',
              policyParams: action.params,
            }
          );
          break;

        case 'reject':
          await auditService.log(
            userId,
            AuditAction.APPROVAL_DECISION,
            'workflow_instance',
            instance.id,
            {
              decision: 'rejected',
              reason: action.params?.reason || 'Policy rejection',
            }
          );
          break;

        case 'escalate':
          await auditService.log(
            userId,
            AuditAction.APPROVAL_REQUEST,
            'workflow_instance',
            instance.id,
            {
              escalatedTo: action.params?.role || action.params?.user,
              reason: action.params?.reason,
            }
          );
          break;

        case 'notify':
          // Notification handled separately
          break;

        case 'modify':
          await auditService.log(
            userId,
            AuditAction.ENTITY_UPDATE,
            'workflow_instance',
            instance.id,
            {
              modifications: action.params,
            }
          );
          break;

        case 'branch':
          await auditService.log(
            userId,
            AuditAction.ENTITY_UPDATE,
            'workflow_instance',
            instance.id,
            {
              branched: true,
              branchTo: action.params?.stepId,
            }
          );
          break;
      }
    }
  }

  /**
   * Get governance metrics
   */
  getMetrics(): {
    totalPolicies: number;
    activePolicies: number;
    averageChainLength: number;
    violationRate: number;
  } {
    const activePolicies = Array.from(this.policies.values())
      .filter(p => p.enabled).length;

    return {
      totalPolicies: this.policies.size,
      activePolicies,
      averageChainLength: 0, // Would need to track chains
      violationRate: 0, // Would need to track violations
    };
  }
}

// Singleton instance
export const workflowGovernance = new WorkflowGovernance();