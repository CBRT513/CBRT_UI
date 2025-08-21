/**
 * Workflow Engine - Multi-step approval chains and process automation
 */

import { auditService, AuditAction } from '../governance/audit';
import { notificationService } from '../notifications';

export interface WorkflowChain {
  id: string;
  name: string;
  description?: string;
  workspaceId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  steps: WorkflowStep[];
  triggers: WorkflowTrigger[];
  policies: WorkflowPolicy[];
  status: 'active' | 'paused' | 'archived';
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: StepType;
  mode: 'sequential' | 'parallel';
  approvers: Approver[];
  timeout?: number; // milliseconds
  escalation?: EscalationRule;
  autoApprove?: AutoApproveCondition;
  actions: StepAction[];
  nextSteps: string[]; // step IDs for branching
}

export enum StepType {
  APPROVAL = 'approval',
  NOTIFICATION = 'notification',
  AUTOMATED = 'automated',
  CONDITIONAL = 'conditional',
  MANUAL_TASK = 'manual_task',
}

export interface Approver {
  type: 'user' | 'role' | 'group' | 'dynamic';
  value: string; // userId, role, groupId, or expression
  delegateId?: string;
  isOptional?: boolean;
}

export interface EscalationRule {
  timeoutMs: number;
  escalateTo: Approver[];
  notifyOriginal?: boolean;
  autoApprove?: boolean;
}

export interface AutoApproveCondition {
  field: string;
  operator: 'equals' | 'less_than' | 'greater_than' | 'matches';
  value: any;
  confidence?: number; // For AI-based conditions
}

export interface StepAction {
  type: 'notify' | 'update' | 'execute' | 'branch';
  target?: string;
  params?: Record<string, any>;
}

export interface WorkflowTrigger {
  type: 'entity_create' | 'entity_update' | 'entity_delete' | 'manual' | 'schedule';
  entityType?: string;
  conditions?: Record<string, any>;
  schedule?: string; // cron expression
}

export interface WorkflowPolicy {
  type: 'approval_threshold' | 'time_limit' | 'auto_escalate' | 'skip_conditions';
  params: Record<string, any>;
}

export interface WorkflowInstance {
  id: string;
  chainId: string;
  entityId: string;
  entityType: string;
  startedAt: Date;
  completedAt?: Date;
  status: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'timeout' | 'error';
  currentStep?: string;
  history: WorkflowHistory[];
  metadata?: Record<string, any>;
}

export interface WorkflowHistory {
  stepId: string;
  action: 'started' | 'approved' | 'rejected' | 'escalated' | 'timeout' | 'auto_approved';
  userId?: string;
  timestamp: Date;
  comment?: string;
  metadata?: Record<string, any>;
}

/**
 * Workflow execution engine
 */
export class WorkflowEngine {
  private chains: Map<string, WorkflowChain> = new Map();
  private instances: Map<string, WorkflowInstance> = new Map();
  private stepTimers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Create a workflow chain
   */
  async createChain(
    name: string,
    steps: WorkflowStep[],
    workspaceId: string,
    createdBy: string,
    options: Partial<WorkflowChain> = {}
  ): Promise<WorkflowChain> {
    const chain: WorkflowChain = {
      id: `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      workspaceId,
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
      steps,
      triggers: [],
      policies: [],
      status: 'active',
      ...options,
    };

    this.chains.set(chain.id, chain);

    await auditService.log(
      createdBy,
      AuditAction.POLICY_CREATE,
      'workflow',
      chain.id,
      {
        workspaceId,
        metadata: { name, steps: steps.length },
      }
    );

    return chain;
  }

  /**
   * Start a workflow instance
   */
  async startWorkflow(
    chainId: string,
    entityId: string,
    entityType: string,
    initiatedBy: string,
    metadata?: Record<string, any>
  ): Promise<WorkflowInstance> {
    const chain = this.chains.get(chainId);
    if (!chain) {
      throw new Error(`Workflow chain ${chainId} not found`);
    }

    if (chain.status !== 'active') {
      throw new Error(`Workflow chain ${chainId} is not active`);
    }

    const instance: WorkflowInstance = {
      id: `wfi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      chainId,
      entityId,
      entityType,
      startedAt: new Date(),
      status: 'in_progress',
      currentStep: chain.steps[0]?.id,
      history: [],
      metadata,
    };

    this.instances.set(instance.id, instance);

    // Start first step
    if (chain.steps.length > 0) {
      await this.executeStep(instance.id, chain.steps[0].id, initiatedBy);
    }

    return instance;
  }

  /**
   * Execute a workflow step
   */
  private async executeStep(
    instanceId: string,
    stepId: string,
    userId?: string
  ): Promise<void> {
    const instance = this.instances.get(instanceId);
    const chain = instance ? this.chains.get(instance.chainId) : null;
    
    if (!instance || !chain) {
      throw new Error('Invalid workflow instance or chain');
    }

    const step = chain.steps.find(s => s.id === stepId);
    if (!step) {
      throw new Error(`Step ${stepId} not found`);
    }

    // Record step start
    instance.history.push({
      stepId,
      action: 'started',
      userId,
      timestamp: new Date(),
    });

    instance.currentStep = stepId;

    // Check auto-approval conditions
    if (step.autoApprove && await this.checkAutoApprove(step.autoApprove, instance)) {
      await this.approveStep(instanceId, stepId, 'system', 'Auto-approved by policy');
      return;
    }

    // Handle different step types
    switch (step.type) {
      case StepType.APPROVAL:
        await this.handleApprovalStep(instance, step);
        break;
      
      case StepType.NOTIFICATION:
        await this.handleNotificationStep(instance, step);
        break;
      
      case StepType.AUTOMATED:
        await this.handleAutomatedStep(instance, step);
        break;
      
      case StepType.CONDITIONAL:
        await this.handleConditionalStep(instance, step);
        break;
      
      case StepType.MANUAL_TASK:
        await this.handleManualTaskStep(instance, step);
        break;
    }

    // Set timeout if configured
    if (step.timeout) {
      const timer = setTimeout(() => {
        this.handleStepTimeout(instanceId, stepId);
      }, step.timeout);
      
      this.stepTimers.set(`${instanceId}-${stepId}`, timer);
    }
  }

  /**
   * Handle approval step
   */
  private async handleApprovalStep(
    instance: WorkflowInstance,
    step: WorkflowStep
  ): Promise<void> {
    // Notify approvers
    const notifications = step.approvers.map(approver => 
      this.notifyApprover(approver, instance, step)
    );

    if (step.mode === 'parallel') {
      // All approvers notified simultaneously
      await Promise.all(notifications);
    } else {
      // Sequential notification
      for (const notification of notifications) {
        await notification;
      }
    }
  }

  /**
   * Handle notification step
   */
  private async handleNotificationStep(
    instance: WorkflowInstance,
    step: WorkflowStep
  ): Promise<void> {
    // Send notifications
    for (const action of step.actions) {
      if (action.type === 'notify') {
        await notificationService.send({
          type: 'workflow',
          recipients: step.approvers.map(a => a.value),
          subject: `Workflow: ${step.name}`,
          body: `Step ${step.name} in workflow for ${instance.entityType} ${instance.entityId}`,
          metadata: {
            instanceId: instance.id,
            stepId: step.id,
            ...action.params,
          },
        });
      }
    }

    // Auto-complete notification steps
    await this.completeStep(instance.id, step.id);
  }

  /**
   * Handle automated step
   */
  private async handleAutomatedStep(
    instance: WorkflowInstance,
    step: WorkflowStep
  ): Promise<void> {
    try {
      // Execute automated actions
      for (const action of step.actions) {
        if (action.type === 'execute') {
          // Execute custom function or API call
          await this.executeAction(action, instance);
        } else if (action.type === 'update') {
          // Update entity
          await this.updateEntity(instance.entityId, action.params);
        }
      }

      await this.completeStep(instance.id, step.id);
    } catch (error) {
      instance.status = 'error';
      instance.history.push({
        stepId: step.id,
        action: 'rejected',
        timestamp: new Date(),
        comment: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }

  /**
   * Handle conditional step
   */
  private async handleConditionalStep(
    instance: WorkflowInstance,
    step: WorkflowStep
  ): Promise<void> {
    // Evaluate conditions and branch
    const nextStepId = await this.evaluateConditions(step, instance);
    
    if (nextStepId) {
      await this.completeStep(instance.id, step.id);
      await this.executeStep(instance.id, nextStepId);
    } else {
      // No matching condition, end workflow
      instance.status = 'approved';
      instance.completedAt = new Date();
    }
  }

  /**
   * Handle manual task step
   */
  private async handleManualTaskStep(
    instance: WorkflowInstance,
    step: WorkflowStep
  ): Promise<void> {
    // Create task for assignees
    for (const approver of step.approvers) {
      await this.createTask(approver, instance, step);
    }
  }

  /**
   * Approve a workflow step
   */
  async approveStep(
    instanceId: string,
    stepId: string,
    userId: string,
    comment?: string
  ): Promise<void> {
    const instance = this.instances.get(instanceId);
    const chain = instance ? this.chains.get(instance.chainId) : null;
    
    if (!instance || !chain) {
      throw new Error('Invalid workflow instance or chain');
    }

    const step = chain.steps.find(s => s.id === stepId);
    if (!step) {
      throw new Error(`Step ${stepId} not found`);
    }

    // Clear timeout
    const timerId = `${instanceId}-${stepId}`;
    if (this.stepTimers.has(timerId)) {
      clearTimeout(this.stepTimers.get(timerId)!);
      this.stepTimers.delete(timerId);
    }

    // Record approval
    instance.history.push({
      stepId,
      action: 'approved',
      userId,
      timestamp: new Date(),
      comment,
    });

    // Check if all required approvals received (for parallel mode)
    if (step.mode === 'parallel') {
      const requiredApprovals = step.approvers.filter(a => !a.isOptional).length;
      const receivedApprovals = instance.history.filter(
        h => h.stepId === stepId && h.action === 'approved'
      ).length;

      if (receivedApprovals < requiredApprovals) {
        return; // Wait for more approvals
      }
    }

    await this.completeStep(instanceId, stepId);
  }

  /**
   * Reject a workflow step
   */
  async rejectStep(
    instanceId: string,
    stepId: string,
    userId: string,
    reason: string
  ): Promise<void> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error('Workflow instance not found');
    }

    // Clear timeout
    const timerId = `${instanceId}-${stepId}`;
    if (this.stepTimers.has(timerId)) {
      clearTimeout(this.stepTimers.get(timerId)!);
      this.stepTimers.delete(timerId);
    }

    instance.history.push({
      stepId,
      action: 'rejected',
      userId,
      timestamp: new Date(),
      comment: reason,
    });

    instance.status = 'rejected';
    instance.completedAt = new Date();

    // Notify initiator
    await notificationService.send({
      type: 'workflow',
      recipients: [instance.metadata?.initiatedBy || 'system'],
      subject: 'Workflow Rejected',
      body: `Workflow for ${instance.entityType} ${instance.entityId} was rejected: ${reason}`,
    });
  }

  /**
   * Complete a step and move to next
   */
  private async completeStep(instanceId: string, stepId: string): Promise<void> {
    const instance = this.instances.get(instanceId);
    const chain = instance ? this.chains.get(instance.chainId) : null;
    
    if (!instance || !chain) return;

    const step = chain.steps.find(s => s.id === stepId);
    if (!step) return;

    // Execute step actions
    for (const action of step.actions) {
      if (action.type === 'branch' && step.nextSteps.length > 0) {
        // Move to next step(s)
        const nextSteps = step.nextSteps;
        
        for (const nextStepId of nextSteps) {
          await this.executeStep(instanceId, nextStepId);
        }
      }
    }

    // If no next steps, complete workflow
    if (!step.nextSteps || step.nextSteps.length === 0) {
      instance.status = 'approved';
      instance.completedAt = new Date();
    }
  }

  /**
   * Handle step timeout
   */
  private async handleStepTimeout(instanceId: string, stepId: string): Promise<void> {
    const instance = this.instances.get(instanceId);
    const chain = instance ? this.chains.get(instance.chainId) : null;
    
    if (!instance || !chain) return;

    const step = chain.steps.find(s => s.id === stepId);
    if (!step) return;

    instance.history.push({
      stepId,
      action: 'timeout',
      timestamp: new Date(),
    });

    // Handle escalation
    if (step.escalation) {
      if (step.escalation.autoApprove) {
        await this.approveStep(instanceId, stepId, 'system', 'Auto-approved on timeout');
      } else {
        // Escalate to next level
        instance.history.push({
          stepId,
          action: 'escalated',
          timestamp: new Date(),
        });

        for (const approver of step.escalation.escalateTo) {
          await this.notifyApprover(approver, instance, step);
        }

        // Set new timeout for escalation
        const timer = setTimeout(() => {
          this.handleStepTimeout(instanceId, stepId);
        }, step.escalation.timeoutMs);
        
        this.stepTimers.set(`${instanceId}-${stepId}`, timer);
      }
    } else {
      // No escalation, timeout the workflow
      instance.status = 'timeout';
      instance.completedAt = new Date();
    }
  }

  /**
   * Check auto-approval conditions
   */
  private async checkAutoApprove(
    condition: AutoApproveCondition,
    instance: WorkflowInstance
  ): Promise<boolean> {
    // In real implementation, evaluate against entity data
    const entityValue = instance.metadata?.[condition.field];
    
    switch (condition.operator) {
      case 'equals':
        return entityValue === condition.value;
      case 'less_than':
        return Number(entityValue) < Number(condition.value);
      case 'greater_than':
        return Number(entityValue) > Number(condition.value);
      case 'matches':
        return new RegExp(condition.value).test(String(entityValue));
      default:
        return false;
    }
  }

  /**
   * Notify an approver
   */
  private async notifyApprover(
    approver: Approver,
    instance: WorkflowInstance,
    step: WorkflowStep
  ): Promise<void> {
    let recipients: string[] = [];
    
    switch (approver.type) {
      case 'user':
        recipients = [approver.value];
        break;
      case 'role':
        // Get users with role
        recipients = await this.getUsersByRole(approver.value);
        break;
      case 'group':
        // Get group members
        recipients = await this.getGroupMembers(approver.value);
        break;
      case 'dynamic':
        // Evaluate expression
        recipients = await this.evaluateDynamicApprover(approver.value, instance);
        break;
    }

    if (approver.delegateId) {
      recipients.push(approver.delegateId);
    }

    await notificationService.send({
      type: 'approval_request',
      recipients,
      subject: `Approval Required: ${step.name}`,
      body: `Please review and approve ${instance.entityType} ${instance.entityId}`,
      metadata: {
        instanceId: instance.id,
        stepId: step.id,
        workflowName: step.name,
      },
    });
  }

  /**
   * Helper methods (simplified implementations)
   */
  private async getUsersByRole(role: string): Promise<string[]> {
    // In real implementation, query user service
    return [`user_with_${role}`];
  }

  private async getGroupMembers(groupId: string): Promise<string[]> {
    // In real implementation, query group service
    return [`member_of_${groupId}`];
  }

  private async evaluateDynamicApprover(
    expression: string,
    instance: WorkflowInstance
  ): Promise<string[]> {
    // In real implementation, evaluate expression
    return ['dynamic_approver'];
  }

  private async executeAction(
    action: StepAction,
    instance: WorkflowInstance
  ): Promise<void> {
    // In real implementation, execute custom action
    console.log('Executing action:', action, instance);
  }

  private async updateEntity(
    entityId: string,
    updates: Record<string, any>
  ): Promise<void> {
    // In real implementation, update entity
    console.log('Updating entity:', entityId, updates);
  }

  private async evaluateConditions(
    step: WorkflowStep,
    instance: WorkflowInstance
  ): Promise<string | null> {
    // In real implementation, evaluate conditions
    return step.nextSteps[0] || null;
  }

  private async createTask(
    assignee: Approver,
    instance: WorkflowInstance,
    step: WorkflowStep
  ): Promise<void> {
    // In real implementation, create task
    console.log('Creating task for:', assignee, instance, step);
  }

  /**
   * Get workflow performance metrics
   */
  async getMetrics(chainId?: string): Promise<{
    averageCompletionTime: number;
    averageStepLatency: number;
    timeoutRate: number;
    rejectionRate: number;
    activeInstances: number;
  }> {
    const instances = chainId
      ? Array.from(this.instances.values()).filter(i => i.chainId === chainId)
      : Array.from(this.instances.values());

    const completed = instances.filter(i => i.completedAt);
    const timedOut = instances.filter(i => i.status === 'timeout');
    const rejected = instances.filter(i => i.status === 'rejected');
    const active = instances.filter(i => i.status === 'in_progress');

    const completionTimes = completed.map(i => 
      i.completedAt!.getTime() - i.startedAt.getTime()
    );

    const stepLatencies: number[] = [];
    for (const instance of instances) {
      for (let i = 1; i < instance.history.length; i++) {
        const prev = instance.history[i - 1];
        const curr = instance.history[i];
        if (prev && curr) {
          stepLatencies.push(curr.timestamp.getTime() - prev.timestamp.getTime());
        }
      }
    }

    return {
      averageCompletionTime: completionTimes.length > 0
        ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
        : 0,
      averageStepLatency: stepLatencies.length > 0
        ? stepLatencies.reduce((a, b) => a + b, 0) / stepLatencies.length
        : 0,
      timeoutRate: instances.length > 0 ? timedOut.length / instances.length : 0,
      rejectionRate: instances.length > 0 ? rejected.length / instances.length : 0,
      activeInstances: active.length,
    };
  }
}

// Singleton instance
export const workflowEngine = new WorkflowEngine();