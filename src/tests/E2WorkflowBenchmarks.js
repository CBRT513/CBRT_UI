/**
 * E2 Workflow Benchmarks and Performance Tests
 */

import { workflowEngine, StepType } from '../lib/workflows';
import { notificationService, NotificationType } from '../lib/notifications';
import { aiResolutionService } from '../lib/resolution';
import { performanceMonitor, performanceCache, queryOptimizer } from '../lib/performance';
import { workflowGovernance } from '../lib/governance/workflow-policies';

class E2WorkflowBenchmarks {
  constructor() {
    this.results = {
      workflowPerformance: {},
      notificationPerformance: {},
      resolutionPerformance: {},
      governancePerformance: {},
      scalabilityTests: {},
    };
  }

  /**
   * Run all E2 benchmarks
   */
  async runAllBenchmarks() {
    console.log('🚀 Starting E2 Workflow Benchmarks...');
    
    try {
      // Workflow Engine Tests
      await this.benchmarkWorkflowEngine();
      
      // Notification System Tests
      await this.benchmarkNotificationSystem();
      
      // AI Resolution Tests
      await this.benchmarkResolutionSystem();
      
      // Governance Tests
      await this.benchmarkGovernanceSystem();
      
      // Scalability Tests
      await this.benchmarkScalability();
      
      // Generate Report
      this.generateReport();
      
      console.log('✅ All E2 benchmarks completed successfully');
      return this.results;
    } catch (error) {
      console.error('❌ Benchmark failed:', error);
      throw error;
    }
  }

  /**
   * Benchmark workflow engine performance
   */
  async benchmarkWorkflowEngine() {
    console.log('📋 Benchmarking Workflow Engine...');
    
    // Test 1: Chain creation performance
    const chainCreationStart = Date.now();
    const chains = [];
    
    for (let i = 0; i < 100; i++) {
      const chain = await workflowEngine.createChain(
        `Test Chain ${i}`,
        this.createTestSteps(5),
        'test_workspace',
        'test_user'
      );
      chains.push(chain);
    }
    
    const chainCreationTime = Date.now() - chainCreationStart;
    this.results.workflowPerformance.chainCreation = {
      count: 100,
      totalTime: chainCreationTime,
      avgTime: chainCreationTime / 100,
      throughput: 100 / (chainCreationTime / 1000),
    };

    // Test 2: Workflow instance creation
    const instanceStart = Date.now();
    const instances = [];
    
    for (let i = 0; i < 50; i++) {
      const instance = await workflowEngine.startWorkflow(
        chains[i % chains.length].id,
        `entity_${i}`,
        'test_entity',
        'test_user',
        { testData: i }
      );
      instances.push(instance);
    }
    
    const instanceTime = Date.now() - instanceStart;
    this.results.workflowPerformance.instanceCreation = {
      count: 50,
      totalTime: instanceTime,
      avgTime: instanceTime / 50,
      throughput: 50 / (instanceTime / 1000),
    };

    // Test 3: Approval processing
    const approvalStart = Date.now();
    let approvals = 0;
    
    for (const instance of instances.slice(0, 25)) {
      try {
        await workflowEngine.approveStep(
          instance.id,
          instance.currentStep,
          'test_approver',
          'Benchmark approval'
        );
        approvals++;
      } catch (error) {
        // Step may not be approvable
      }
    }
    
    const approvalTime = Date.now() - approvalStart;
    this.results.workflowPerformance.approval = {
      count: approvals,
      totalTime: approvalTime,
      avgTime: approvals > 0 ? approvalTime / approvals : 0,
      throughput: approvals / (approvalTime / 1000),
    };

    // Test 4: Metrics collection
    const metricsStart = Date.now();
    const metrics = await workflowEngine.getMetrics();
    const metricsTime = Date.now() - metricsStart;
    
    this.results.workflowPerformance.metrics = {
      time: metricsTime,
      data: metrics,
    };

    console.log('✅ Workflow Engine benchmarks completed');
  }

  /**
   * Benchmark notification system
   */
  async benchmarkNotificationSystem() {
    console.log('📧 Benchmarking Notification System...');
    
    // Test 1: Bulk notification sending
    const bulkStart = Date.now();
    const notifications = [];
    
    for (let i = 0; i < 200; i++) {
      const notification = await notificationService.send({
        type: NotificationType.WORKFLOW,
        recipients: [`user_${i % 10}`],
        subject: `Test Notification ${i}`,
        body: `This is a test notification for benchmarking purposes. ID: ${i}`,
        priority: i % 4 === 0 ? 'high' : 'normal',
      });
      notifications.push(notification);
    }
    
    const bulkTime = Date.now() - bulkStart;
    this.results.notificationPerformance.bulkSending = {
      count: 200,
      totalTime: bulkTime,
      avgTime: bulkTime / 200,
      throughput: 200 / (bulkTime / 1000),
    };

    // Test 2: Real-time subscription performance
    const subscriptionStart = Date.now();
    const subscriptions = [];
    
    for (let i = 0; i < 50; i++) {
      const unsubscribe = notificationService.subscribeToRealtime(
        `user_${i}`,
        (notification) => {
          // Simulated real-time processing
        }
      );
      subscriptions.push(unsubscribe);
    }
    
    const subscriptionTime = Date.now() - subscriptionStart;
    this.results.notificationPerformance.subscriptions = {
      count: 50,
      totalTime: subscriptionTime,
      avgTime: subscriptionTime / 50,
    };

    // Test 3: Notification filtering
    const filterStart = Date.now();
    
    // Set preferences for test users
    for (let i = 0; i < 10; i++) {
      notificationService.setPreferences(`user_${i}`, {
        userId: `user_${i}`,
        channels: {
          email: { enabled: true, types: [NotificationType.WORKFLOW] },
          webhook: { enabled: false, types: [] },
          realtime: { enabled: true, types: [] },
          sms: { enabled: false, types: [] },
          slack: { enabled: false, types: [] },
        },
        digest: { enabled: false, frequency: 'daily', types: [] },
        muted: [],
        filters: [],
      });
    }
    
    const filterTime = Date.now() - filterStart;
    this.results.notificationPerformance.filtering = {
      count: 10,
      totalTime: filterTime,
      avgTime: filterTime / 10,
    };

    // Test 4: Metrics collection
    const metricsStart = Date.now();
    const metrics = notificationService.getMetrics();
    const metricsTime = Date.now() - metricsStart;
    
    this.results.notificationPerformance.metrics = {
      time: metricsTime,
      data: metrics,
    };

    // Cleanup subscriptions
    subscriptions.forEach(unsub => unsub());

    console.log('✅ Notification System benchmarks completed');
  }

  /**
   * Benchmark AI resolution system
   */
  async benchmarkResolutionSystem() {
    console.log('🤖 Benchmarking AI Resolution System...');
    
    // Create test conflicts
    const conflicts = this.createTestConflicts(50);
    
    // Test 1: Conflict analysis performance
    const analysisStart = Date.now();
    const analyses = [];
    
    for (const conflict of conflicts.slice(0, 20)) {
      const analysis = await aiResolutionService.analyzeConflict(conflict);
      analyses.push(analysis);
    }
    
    const analysisTime = Date.now() - analysisStart;
    this.results.resolutionPerformance.analysis = {
      count: 20,
      totalTime: analysisTime,
      avgTime: analysisTime / 20,
      throughput: 20 / (analysisTime / 1000),
    };

    // Test 2: Auto-resolution performance
    const resolutionStart = Date.now();
    const resolutions = [];
    
    for (const conflict of conflicts.slice(20, 35)) {
      try {
        const result = await aiResolutionService.autoResolve(conflict);
        resolutions.push(result);
      } catch (error) {
        // Some conflicts may not be auto-resolvable
      }
    }
    
    const resolutionTime = Date.now() - resolutionStart;
    this.results.resolutionPerformance.autoResolution = {
      count: resolutions.length,
      totalTime: resolutionTime,
      avgTime: resolutions.length > 0 ? resolutionTime / resolutions.length : 0,
      successRate: resolutions.filter(r => r.success).length / resolutions.length,
    };

    // Test 3: Suggestion generation
    const suggestionStart = Date.now();
    const suggestions = [];
    
    for (const conflict of conflicts.slice(35, 45)) {
      const suggestion = await aiResolutionService.getSuggestions(conflict);
      suggestions.push(suggestion);
    }
    
    const suggestionTime = Date.now() - suggestionStart;
    this.results.resolutionPerformance.suggestions = {
      count: 10,
      totalTime: suggestionTime,
      avgTime: suggestionTime / 10,
    };

    // Test 4: Metrics collection
    const metricsStart = Date.now();
    const metrics = aiResolutionService.getMetrics();
    const metricsTime = Date.now() - metricsStart;
    
    this.results.resolutionPerformance.metrics = {
      time: metricsTime,
      data: metrics,
    };

    console.log('✅ AI Resolution System benchmarks completed');
  }

  /**
   * Benchmark governance system
   */
  async benchmarkGovernanceSystem() {
    console.log('⚖️ Benchmarking Governance System...');
    
    // Test 1: Chain validation performance
    const chainValidationStart = Date.now();
    const validations = [];
    
    for (let i = 0; i < 25; i++) {
      const chain = {
        id: `test_chain_${i}`,
        name: `Test Chain ${i}`,
        steps: this.createTestSteps(Math.floor(Math.random() * 10) + 1),
        workspaceId: 'test_workspace',
        createdBy: 'test_user',
        createdAt: new Date(),
        updatedAt: new Date(),
        triggers: [],
        policies: [],
        status: 'active',
      };
      
      const validation = await workflowGovernance.validateChain(chain);
      validations.push(validation);
    }
    
    const chainValidationTime = Date.now() - chainValidationStart;
    this.results.governancePerformance.chainValidation = {
      count: 25,
      totalTime: chainValidationTime,
      avgTime: chainValidationTime / 25,
      validChains: validations.filter(v => v.valid).length,
    };

    // Test 2: Instance validation performance
    const instanceValidationStart = Date.now();
    const instanceValidations = [];
    
    for (let i = 0; i < 30; i++) {
      const instance = {
        id: `test_instance_${i}`,
        chainId: 'test_chain',
        entityId: `entity_${i}`,
        entityType: 'test_entity',
        startedAt: new Date(Date.now() - Math.random() * 86400000),
        status: 'in_progress',
        currentStep: 'step_1',
        history: [],
        metadata: {
          initiatedBy: i % 5 === 0 ? 'test_user' : 'other_user',
          justification: 'Test justification',
          value: Math.random() * 200000,
        },
      };
      
      const chain = {
        id: 'test_chain',
        steps: this.createTestSteps(3),
      };
      
      const validation = await workflowGovernance.validateInstance(
        instance,
        chain,
        'test_user'
      );
      instanceValidations.push(validation);
    }
    
    const instanceValidationTime = Date.now() - instanceValidationStart;
    this.results.governancePerformance.instanceValidation = {
      count: 30,
      totalTime: instanceValidationTime,
      avgTime: instanceValidationTime / 30,
      validInstances: instanceValidations.filter(v => v.valid).length,
    };

    // Test 3: Metrics collection
    const metricsStart = Date.now();
    const metrics = workflowGovernance.getMetrics();
    const metricsTime = Date.now() - metricsStart;
    
    this.results.governancePerformance.metrics = {
      time: metricsTime,
      data: metrics,
    };

    console.log('✅ Governance System benchmarks completed');
  }

  /**
   * Benchmark system scalability
   */
  async benchmarkScalability() {
    console.log('📊 Benchmarking System Scalability...');
    
    // Test 1: Concurrent workflow processing
    const concurrentStart = Date.now();
    
    const concurrentPromises = [];
    for (let i = 0; i < 20; i++) {
      concurrentPromises.push(this.simulateConcurrentWorkflow(i));
    }
    
    const concurrentResults = await Promise.all(concurrentPromises);
    const concurrentTime = Date.now() - concurrentStart;
    
    this.results.scalabilityTests.concurrentWorkflows = {
      count: 20,
      totalTime: concurrentTime,
      avgTime: concurrentTime / 20,
      successfulWorkflows: concurrentResults.filter(r => r.success).length,
    };

    // Test 2: High-volume notifications
    const highVolumeStart = Date.now();
    
    const volumePromises = [];
    for (let i = 0; i < 500; i++) {
      volumePromises.push(
        notificationService.send({
          type: NotificationType.SYSTEM_ALERT,
          recipients: [`user_${i % 20}`],
          subject: `Volume Test ${i}`,
          body: 'High volume notification test',
          priority: 'normal',
        })
      );
    }
    
    await Promise.all(volumePromises);
    const highVolumeTime = Date.now() - highVolumeStart;
    
    this.results.scalabilityTests.highVolumeNotifications = {
      count: 500,
      totalTime: highVolumeTime,
      avgTime: highVolumeTime / 500,
      throughput: 500 / (highVolumeTime / 1000),
    };

    // Test 3: Cache performance under load
    const cacheStart = Date.now();
    
    // Fill cache
    for (let i = 0; i < 1000; i++) {
      performanceCache.set(`key_${i}`, { data: `value_${i}`, timestamp: Date.now() });
    }
    
    // Test retrieval
    let cacheHits = 0;
    for (let i = 0; i < 2000; i++) {
      const value = performanceCache.get(`key_${i % 1000}`);
      if (value) cacheHits++;
    }
    
    const cacheTime = Date.now() - cacheStart;
    const cacheStats = performanceCache.getStats();
    
    this.results.scalabilityTests.cachePerformance = {
      operations: 2000,
      totalTime: cacheTime,
      avgTime: cacheTime / 2000,
      hitRate: cacheHits / 2000,
      cacheStats,
    };

    // Test 4: Performance monitoring
    const monitoringStart = Date.now();
    
    // Record various metrics
    for (let i = 0; i < 100; i++) {
      performanceMonitor.record({
        responseTime: Math.random() * 200,
        throughput: Math.random() * 1000,
        concurrentUsers: Math.floor(Math.random() * 100),
        cpuUsage: Math.random(),
        memoryUsage: Math.random(),
        cacheHitRate: Math.random(),
        queueLength: Math.floor(Math.random() * 50),
        errorRate: Math.random() * 0.1,
      });
    }
    
    const avgMetrics = performanceMonitor.getAverageMetrics(60000);
    const isDegraded = performanceMonitor.isPerformanceDegraded();
    const recommendations = performanceMonitor.getRecommendations();
    
    const monitoringTime = Date.now() - monitoringStart;
    
    this.results.scalabilityTests.performanceMonitoring = {
      samples: 100,
      totalTime: monitoringTime,
      avgMetrics,
      isDegraded,
      recommendations,
    };

    console.log('✅ Scalability benchmarks completed');
  }

  /**
   * Simulate concurrent workflow execution
   */
  async simulateConcurrentWorkflow(index) {
    try {
      // Create chain
      const chain = await workflowEngine.createChain(
        `Concurrent Chain ${index}`,
        this.createTestSteps(3),
        'test_workspace',
        `user_${index}`
      );

      // Start instance
      const instance = await workflowEngine.startWorkflow(
        chain.id,
        `entity_${index}`,
        'test_entity',
        `user_${index}`,
        { concurrent: true, index }
      );

      // Simulate some approvals
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
      
      if (instance.currentStep) {
        await workflowEngine.approveStep(
          instance.id,
          instance.currentStep,
          `approver_${index}`,
          'Concurrent approval'
        );
      }

      return { success: true, chainId: chain.id, instanceId: instance.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Create test workflow steps
   */
  createTestSteps(count) {
    const steps = [];
    
    for (let i = 0; i < count; i++) {
      steps.push({
        id: `step_${i + 1}`,
        name: `Test Step ${i + 1}`,
        type: i === 0 ? StepType.APPROVAL : 
              i % 2 === 0 ? StepType.NOTIFICATION : StepType.APPROVAL,
        mode: 'sequential',
        approvers: [{
          type: 'user',
          value: `approver_${i + 1}`,
        }],
        timeout: 60000,
        actions: [],
        nextSteps: i < count - 1 ? [`step_${i + 2}`] : [],
      });
    }
    
    return steps;
  }

  /**
   * Create test conflicts
   */
  createTestConflicts(count) {
    const conflicts = [];
    
    for (let i = 0; i < count; i++) {
      conflicts.push({
        sessionId: `session_${i}`,
        field: ['title', 'description', 'value', 'status'][i % 4],
        type: 'update',
        baseValue: `base_value_${i}`,
        ourChange: {
          value: `our_value_${i}`,
          timestamp: new Date(Date.now() - 1000),
          userId: 'user_1',
        },
        theirChange: {
          value: `their_value_${i}`,
          timestamp: new Date(),
          userId: 'user_2',
        },
        userId: 'user_1',
      });
    }
    
    return conflicts;
  }

  /**
   * Generate performance report
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: 0,
        passedTests: 0,
        avgResponseTime: 0,
        throughput: 0,
      },
      details: this.results,
      recommendations: [],
    };

    // Calculate summary metrics
    const allTests = [
      ...Object.values(this.results.workflowPerformance),
      ...Object.values(this.results.notificationPerformance),
      ...Object.values(this.results.resolutionPerformance),
      ...Object.values(this.results.governancePerformance),
      ...Object.values(this.results.scalabilityTests),
    ];

    report.summary.totalTests = allTests.length;
    
    // Calculate recommendations
    if (this.results.workflowPerformance.chainCreation?.avgTime > 100) {
      report.recommendations.push('Workflow chain creation is slow - consider optimization');
    }
    
    if (this.results.notificationPerformance.bulkSending?.throughput < 50) {
      report.recommendations.push('Notification throughput is low - consider batching');
    }
    
    if (this.results.resolutionPerformance.autoResolution?.successRate < 0.7) {
      report.recommendations.push('AI resolution success rate is low - retrain models');
    }
    
    if (this.results.scalabilityTests.cachePerformance?.hitRate < 0.8) {
      report.recommendations.push('Cache hit rate is low - review caching strategy');
    }

    console.log('\n📊 E2 Benchmark Report:');
    console.log('================================');
    console.log(`Total Tests: ${report.summary.totalTests}`);
    console.log(`Workflow Engine: ${Object.keys(this.results.workflowPerformance).length} tests`);
    console.log(`Notification System: ${Object.keys(this.results.notificationPerformance).length} tests`);
    console.log(`AI Resolution: ${Object.keys(this.results.resolutionPerformance).length} tests`);
    console.log(`Governance: ${Object.keys(this.results.governancePerformance).length} tests`);
    console.log(`Scalability: ${Object.keys(this.results.scalabilityTests).length} tests`);
    
    if (report.recommendations.length > 0) {
      console.log('\n🔧 Recommendations:');
      report.recommendations.forEach(rec => console.log(`  • ${rec}`));
    }
    
    console.log('\n✅ Benchmark report generated successfully');
    
    // Store report for later analysis
    this.report = report;
    return report;
  }
}

// Export for use in tests
export default E2WorkflowBenchmarks;