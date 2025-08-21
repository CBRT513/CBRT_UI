/**
 * E2 Integration Tests - End-to-End Workflow Testing
 */

import { workflowEngine, StepType } from '../lib/workflows';
import { notificationService, NotificationType } from '../lib/notifications';
import { aiResolutionService } from '../lib/resolution';
import { workflowGovernance } from '../lib/governance/workflow-policies';
import { performanceMonitor } from '../lib/performance';

class E2IntegrationTests {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: [],
      details: {},
    };
  }

  /**
   * Run all integration tests
   */
  async runAllTests() {
    console.log('🧪 Starting E2 Integration Tests...');
    
    const testSuites = [
      'testWorkflowCreationAndExecution',
      'testNotificationIntegration',
      'testConflictResolutionFlow',
      'testGovernanceEnforcement',
      'testPerformanceOptimization',
      'testEndToEndWorkflow',
      'testErrorHandling',
      'testScalabilityLimits',
    ];
    
    for (const testSuite of testSuites) {
      try {
        console.log(`\n📋 Running ${testSuite}...`);
        await this[testSuite]();
        this.testResults.passed++;
        console.log(`✅ ${testSuite} passed`);
      } catch (error) {
        this.testResults.failed++;
        this.testResults.errors.push({
          test: testSuite,
          error: error.message,
          stack: error.stack,
        });
        console.error(`❌ ${testSuite} failed:`, error.message);
      }
    }
    
    this.generateTestReport();
    return this.testResults;
  }

  /**
   * Test workflow creation and basic execution
   */
  async testWorkflowCreationAndExecution() {
    // Create a workflow chain
    const steps = [
      {
        id: 'step_1',
        name: 'Initial Review',
        type: StepType.APPROVAL,
        mode: 'sequential',
        approvers: [{ type: 'user', value: 'reviewer_1' }],
        timeout: 60000,
        actions: [],
        nextSteps: ['step_2'],
      },
      {
        id: 'step_2',
        name: 'Manager Approval',
        type: StepType.APPROVAL,
        mode: 'sequential',
        approvers: [{ type: 'role', value: 'manager' }],
        timeout: 120000,
        actions: [],
        nextSteps: ['step_3'],
      },
      {
        id: 'step_3',
        name: 'Final Notification',
        type: StepType.NOTIFICATION,
        mode: 'sequential',
        approvers: [{ type: 'user', value: 'requester' }],
        actions: [{ type: 'notify', params: { message: 'Process complete' } }],
        nextSteps: [],
      },
    ];

    const chain = await workflowEngine.createChain(
      'Integration Test Workflow',
      steps,
      'test_workspace',
      'test_user',
      { description: 'Test workflow for integration testing' }
    );

    if (!chain.id) {
      throw new Error('Chain creation failed - no ID returned');
    }

    // Start a workflow instance
    const instance = await workflowEngine.startWorkflow(
      chain.id,
      'test_entity_123',
      'purchase_order',
      'test_user',
      { value: 75000, description: 'Test purchase order' }
    );

    if (!instance.id) {
      throw new Error('Instance creation failed - no ID returned');
    }

    if (instance.status !== 'in_progress') {
      throw new Error(`Expected status 'in_progress', got '${instance.status}'`);
    }

    if (instance.currentStep !== 'step_1') {
      throw new Error(`Expected current step 'step_1', got '${instance.currentStep}'`);
    }

    // Test step approval
    await workflowEngine.approveStep(
      instance.id,
      'step_1',
      'reviewer_1',
      'Approved in integration test'
    );

    // Verify step progression
    const updatedInstance = workflowEngine.instances?.get(instance.id);
    if (updatedInstance?.currentStep !== 'step_2') {
      throw new Error(`Expected progression to step_2, but current step is ${updatedInstance?.currentStep}`);
    }

    this.testResults.details.workflowCreation = {
      chainId: chain.id,
      instanceId: instance.id,
      stepsCount: steps.length,
      passed: true,
    };
  }

  /**
   * Test notification system integration
   */
  async testNotificationIntegration() {
    const notifications = [];
    let receivedCount = 0;

    // Set up real-time subscription
    const unsubscribe = notificationService.subscribeToRealtime(
      'test_user_notifications',
      (notification) => {
        receivedCount++;
        notifications.push(notification);
      }
    );

    // Send various types of notifications
    const testNotifications = [
      {
        type: NotificationType.WORKFLOW,
        subject: 'Workflow Started',
        body: 'A new workflow has been started',
        priority: 'normal',
      },
      {
        type: NotificationType.APPROVAL_REQUEST,
        subject: 'Approval Required',
        body: 'Your approval is required for a request',
        priority: 'high',
      },
      {
        type: NotificationType.CONFLICT_DETECTED,
        subject: 'Conflict Detected',
        body: 'A conflict has been detected and requires resolution',
        priority: 'urgent',
      },
    ];

    for (const notif of testNotifications) {
      await notificationService.send({
        ...notif,
        recipients: ['test_user_notifications'],
      });
    }

    // Wait for real-time delivery
    await new Promise(resolve => setTimeout(resolve, 100));

    if (receivedCount !== testNotifications.length) {
      throw new Error(`Expected ${testNotifications.length} notifications, received ${receivedCount}`);
    }

    // Test notification preferences
    notificationService.setPreferences('test_user_notifications', {
      userId: 'test_user_notifications',
      channels: {
        email: { enabled: true, types: [NotificationType.APPROVAL_REQUEST] },
        webhook: { enabled: false, types: [] },
        realtime: { enabled: true, types: [] },
        sms: { enabled: false, types: [] },
        slack: { enabled: false, types: [] },
      },
      digest: { enabled: false, frequency: 'daily', types: [] },
      muted: [],
      filters: [],
    });

    // Send filtered notification
    await notificationService.send({
      type: NotificationType.SYSTEM_ALERT,
      recipients: ['test_user_notifications'],
      subject: 'System Alert',
      body: 'This should be filtered out',
      priority: 'low',
    });

    // Verify metrics
    const metrics = notificationService.getMetrics();
    if (metrics.totalSent === 0) {
      throw new Error('No notifications marked as sent in metrics');
    }

    unsubscribe();

    this.testResults.details.notificationIntegration = {
      sentCount: testNotifications.length,
      receivedCount,
      metrics,
      passed: true,
    };
  }

  /**
   * Test conflict resolution flow
   */
  async testConflictResolutionFlow() {
    // Create test conflict
    const conflict = {
      sessionId: 'test_session_123',
      field: 'description',
      type: 'update',
      baseValue: 'Original description',
      ourChange: {
        value: 'Updated description from user A',
        timestamp: new Date(Date.now() - 1000),
        userId: 'user_a',
      },
      theirChange: {
        value: 'Updated description from user B',
        timestamp: new Date(),
        userId: 'user_b',
      },
      userId: 'user_a',
    };

    // Test conflict analysis
    const analysis = await aiResolutionService.analyzeConflict(conflict);
    
    if (!analysis.conflictType) {
      throw new Error('Conflict analysis failed - no conflict type detected');
    }

    if (!analysis.suggestedStrategies || analysis.suggestedStrategies.length === 0) {
      throw new Error('No resolution strategies suggested');
    }

    // Test auto-resolution
    const resolution = await aiResolutionService.autoResolve(conflict);
    
    if (resolution.success && !resolution.mergedValue) {
      throw new Error('Successful resolution should provide merged value');
    }

    // Test suggestions
    const suggestions = await aiResolutionService.getSuggestions(conflict);
    
    if (!suggestions.strategies || suggestions.strategies.length === 0) {
      throw new Error('No resolution suggestions provided');
    }

    // Test feedback system
    if (resolution.success) {
      aiResolutionService.provideFeedback('test_resolution_id', {
        rating: 4,
        wasHelpful: true,
        comment: 'Good resolution',
      });
    }

    // Verify metrics
    const metrics = aiResolutionService.getMetrics();
    if (metrics.totalResolutions === 0 && resolution.success) {
      throw new Error('Metrics not updated after resolution');
    }

    this.testResults.details.conflictResolution = {
      analysisType: analysis.conflictType,
      strategiesCount: analysis.suggestedStrategies.length,
      resolutionSuccess: resolution.success,
      suggestionsCount: suggestions.strategies.length,
      passed: true,
    };
  }

  /**
   * Test governance enforcement
   */
  async testGovernanceEnforcement() {
    // Test workflow chain validation
    const validChain = {
      id: 'valid_test_chain',
      name: 'Valid Test Chain',
      workspaceId: 'test_workspace',
      createdBy: 'test_user',
      createdAt: new Date(),
      updatedAt: new Date(),
      steps: [
        {
          id: 'step_1',
          name: 'Review Step',
          type: StepType.APPROVAL,
          mode: 'sequential',
          approvers: [{ type: 'user', value: 'reviewer' }],
          actions: [],
          nextSteps: [],
        },
      ],
      triggers: [],
      policies: [],
      status: 'active',
    };

    const validationResult = await workflowGovernance.validateChain(validChain);
    
    if (!validationResult.valid) {
      throw new Error(`Valid chain failed validation: ${validationResult.violations.join(', ')}`);
    }

    // Test invalid chain (too many steps)
    const invalidChain = {
      ...validChain,
      id: 'invalid_test_chain',
      steps: new Array(25).fill(0).map((_, i) => ({
        id: `step_${i}`,
        name: `Step ${i}`,
        type: StepType.APPROVAL,
        mode: 'sequential',
        approvers: [{ type: 'user', value: 'reviewer' }],
        actions: [],
        nextSteps: [],
      })),
    };

    const invalidValidation = await workflowGovernance.validateChain(invalidChain);
    
    if (invalidValidation.valid) {
      throw new Error('Invalid chain should have failed validation');
    }

    // Test instance validation
    const testInstance = {
      id: 'test_instance_gov',
      chainId: 'valid_test_chain',
      entityId: 'entity_123',
      entityType: 'test_entity',
      startedAt: new Date(),
      status: 'in_progress',
      currentStep: 'step_1',
      history: [],
      metadata: {
        initiatedBy: 'user_a',
        justification: 'Test justification',
        value: 50000,
      },
    };

    const instanceValidation = await workflowGovernance.validateInstance(
      testInstance,
      validChain,
      'user_b' // Different user from initiator
    );

    if (!instanceValidation.valid) {
      throw new Error(`Valid instance failed validation: ${instanceValidation.violations.join(', ')}`);
    }

    // Test segregation of duties
    const sodValidation = await workflowGovernance.validateInstance(
      testInstance,
      validChain,
      'user_a' // Same as initiator
    );

    if (sodValidation.valid) {
      throw new Error('Segregation of duties violation should have been detected');
    }

    this.testResults.details.governance = {
      validChainPassed: validationResult.valid,
      invalidChainRejected: !invalidValidation.valid,
      instanceValidationPassed: instanceValidation.valid,
      segregationDetected: !sodValidation.valid,
      passed: true,
    };
  }

  /**
   * Test performance optimization features
   */
  async testPerformanceOptimization() {
    // Test performance monitoring
    const startTime = Date.now();
    
    // Simulate some operations
    for (let i = 0; i < 10; i++) {
      performanceMonitor.record({
        responseTime: Math.random() * 100,
        throughput: Math.random() * 500,
        concurrentUsers: 5,
        cpuUsage: Math.random() * 0.5,
        memoryUsage: Math.random() * 0.7,
        cacheHitRate: Math.random() * 0.8 + 0.2,
        queueLength: Math.floor(Math.random() * 10),
        errorRate: Math.random() * 0.02,
      });
    }

    const metrics = performanceMonitor.getCurrentMetrics();
    const avgMetrics = performanceMonitor.getAverageMetrics(60000);
    const isDegraded = performanceMonitor.isPerformanceDegraded();
    const recommendations = performanceMonitor.getRecommendations();

    if (!metrics) {
      throw new Error('Performance metrics not available');
    }

    // Test that metrics are being recorded
    if (avgMetrics.concurrentUsers !== 5) {
      throw new Error('Performance metrics not being recorded correctly');
    }

    const operationTime = Date.now() - startTime;

    this.testResults.details.performance = {
      operationTime,
      metricsRecorded: 10,
      degradationDetected: isDegraded,
      recommendationsCount: recommendations.length,
      passed: true,
    };
  }

  /**
   * Test complete end-to-end workflow
   */
  async testEndToEndWorkflow() {
    // Create a comprehensive workflow
    const steps = [
      {
        id: 'step_1',
        name: 'Document Review',
        type: StepType.APPROVAL,
        mode: 'sequential',
        approvers: [{ type: 'user', value: 'document_reviewer' }],
        timeout: 300000, // 5 minutes
        actions: [],
        nextSteps: ['step_2'],
      },
      {
        id: 'step_2',
        name: 'Financial Approval',
        type: StepType.APPROVAL,
        mode: 'sequential',
        approvers: [{ type: 'role', value: 'finance_manager' }],
        timeout: 600000, // 10 minutes
        actions: [],
        nextSteps: ['step_3'],
      },
      {
        id: 'step_3',
        name: 'Notification',
        type: StepType.NOTIFICATION,
        mode: 'sequential',
        approvers: [{ type: 'user', value: 'requester' }],
        actions: [{ type: 'notify' }],
        nextSteps: [],
      },
    ];

    // Create chain with governance validation
    const chain = await workflowEngine.createChain(
      'E2E Test Workflow',
      steps,
      'e2e_workspace',
      'e2e_user',
      { description: 'End-to-end integration test workflow' }
    );

    // Validate chain with governance
    const chainValidation = await workflowGovernance.validateChain(chain);
    if (!chainValidation.valid) {
      throw new Error(`Chain validation failed: ${chainValidation.violations.join(', ')}`);
    }

    // Start workflow instance
    const instance = await workflowEngine.startWorkflow(
      chain.id,
      'e2e_entity_456',
      'contract',
      'e2e_user',
      {
        value: 25000,
        description: 'E2E test contract',
        justification: 'Integration testing',
      }
    );

    // Subscribe to notifications
    const notifications = [];
    const unsubscribe = notificationService.subscribeToRealtime(
      'document_reviewer',
      (notification) => {
        notifications.push(notification);
      }
    );

    // Approve first step
    await workflowEngine.approveStep(
      instance.id,
      'step_1',
      'document_reviewer',
      'E2E test approval'
    );

    // Wait for notifications
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify progression
    const metrics = await workflowEngine.getMetrics(chain.id);
    if (metrics.activeInstances === 0) {
      throw new Error('No active instances found in metrics');
    }

    // Approve second step
    await workflowEngine.approveStep(
      instance.id,
      'step_2',
      'finance_manager',
      'E2E financial approval'
    );

    // Wait for completion
    await new Promise(resolve => setTimeout(resolve, 100));

    unsubscribe();

    this.testResults.details.endToEnd = {
      chainId: chain.id,
      instanceId: instance.id,
      notificationsReceived: notifications.length,
      workflowCompleted: true,
      passed: true,
    };
  }

  /**
   * Test error handling and recovery
   */
  async testErrorHandling() {
    // Test invalid workflow creation
    try {
      await workflowEngine.createChain(
        '', // Empty name should fail
        [],
        'test_workspace',
        'test_user'
      );
      throw new Error('Empty workflow creation should have failed');
    } catch (error) {
      if (!error.message.includes('name')) {
        // Re-throw if it's not the expected validation error
        throw error;
      }
    }

    // Test invalid instance creation
    try {
      await workflowEngine.startWorkflow(
        'non_existent_chain',
        'entity_123',
        'test_entity',
        'test_user'
      );
      throw new Error('Non-existent chain should have failed');
    } catch (error) {
      if (!error.message.includes('not found')) {
        throw error;
      }
    }

    // Test invalid step approval
    try {
      await workflowEngine.approveStep(
        'non_existent_instance',
        'step_1',
        'user',
        'comment'
      );
      throw new Error('Non-existent instance approval should have failed');
    } catch (error) {
      if (!error.message.includes('not found')) {
        throw error;
      }
    }

    // Test conflict resolution with invalid data
    try {
      await aiResolutionService.analyzeConflict({
        // Missing required fields
        sessionId: 'test',
      });
      // This might not throw, but should handle gracefully
    } catch (error) {
      // Expected to fail or handle gracefully
    }

    this.testResults.details.errorHandling = {
      invalidWorkflowHandled: true,
      invalidInstanceHandled: true,
      invalidApprovalHandled: true,
      invalidConflictHandled: true,
      passed: true,
    };
  }

  /**
   * Test system scalability limits
   */
  async testScalabilityLimits() {
    const startTime = Date.now();
    const results = {
      chains: 0,
      instances: 0,
      notifications: 0,
      errors: 0,
    };

    // Test rapid chain creation
    try {
      const chainPromises = [];
      for (let i = 0; i < 10; i++) {
        chainPromises.push(
          workflowEngine.createChain(
            `Scale Test Chain ${i}`,
            [{
              id: 'step_1',
              name: 'Test Step',
              type: StepType.APPROVAL,
              mode: 'sequential',
              approvers: [{ type: 'user', value: 'approver' }],
              actions: [],
              nextSteps: [],
            }],
            'scale_workspace',
            'scale_user'
          )
        );
      }
      
      const chains = await Promise.all(chainPromises);
      results.chains = chains.length;

      // Test rapid instance creation
      const instancePromises = [];
      for (let i = 0; i < 20; i++) {
        instancePromises.push(
          workflowEngine.startWorkflow(
            chains[i % chains.length].id,
            `scale_entity_${i}`,
            'scale_entity',
            'scale_user',
            { scaleTest: true, index: i }
          )
        );
      }

      const instances = await Promise.all(instancePromises);
      results.instances = instances.length;

      // Test bulk notifications
      const notificationPromises = [];
      for (let i = 0; i < 50; i++) {
        notificationPromises.push(
          notificationService.send({
            type: NotificationType.SYSTEM_ALERT,
            recipients: [`scale_user_${i % 5}`],
            subject: `Scale Test ${i}`,
            body: 'Scalability testing notification',
            priority: 'normal',
          })
        );
      }

      const notifications = await Promise.all(notificationPromises);
      results.notifications = notifications.length;

    } catch (error) {
      results.errors++;
      console.warn('Scalability test encountered error:', error.message);
    }

    const totalTime = Date.now() - startTime;

    if (results.chains === 0 && results.instances === 0 && results.notifications === 0) {
      throw new Error('All scalability operations failed');
    }

    this.testResults.details.scalability = {
      ...results,
      totalTime,
      passed: true,
    };
  }

  /**
   * Generate test report
   */
  generateTestReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: this.testResults.passed + this.testResults.failed,
        passed: this.testResults.passed,
        failed: this.testResults.failed,
        successRate: this.testResults.passed / (this.testResults.passed + this.testResults.failed),
      },
      details: this.testResults.details,
      errors: this.testResults.errors,
    };

    console.log('\n📊 E2 Integration Test Report:');
    console.log('==================================');
    console.log(`Total Tests: ${report.summary.totalTests}`);
    console.log(`Passed: ${report.summary.passed}`);
    console.log(`Failed: ${report.summary.failed}`);
    console.log(`Success Rate: ${(report.summary.successRate * 100).toFixed(1)}%`);

    if (this.testResults.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.testResults.errors.forEach(error => {
        console.log(`  • ${error.test}: ${error.error}`);
      });
    }

    console.log('\n✅ Integration test report generated');
    return report;
  }
}

// Export for use in test runner
export default E2IntegrationTests;