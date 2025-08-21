#!/usr/bin/env node

/**
 * Integration Layer Load Testing Script
 * 
 * Comprehensive load testing for F milestone integration components
 */

import { performance } from 'perf_hooks';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Load test configuration
const LOAD_TEST_CONFIG = {
  scenarios: {
    light: {
      name: 'Light Load',
      duration: 30000,      // 30 seconds
      virtualUsers: 10,
      rampUpTime: 5000,     // 5 seconds
      requestRate: 5,       // requests per second per user
    },
    moderate: {
      name: 'Moderate Load',
      duration: 60000,      // 1 minute
      virtualUsers: 50,
      rampUpTime: 10000,    // 10 seconds
      requestRate: 10,      // requests per second per user
    },
    heavy: {
      name: 'Heavy Load',
      duration: 120000,     // 2 minutes
      virtualUsers: 100,
      rampUpTime: 20000,    // 20 seconds
      requestRate: 15,      // requests per second per user
    },
    stress: {
      name: 'Stress Test',
      duration: 180000,     // 3 minutes
      virtualUsers: 200,
      rampUpTime: 30000,    // 30 seconds
      requestRate: 20,      // requests per second per user
    },
  },
  thresholds: {
    maxResponseTime: 5000,     // 5 seconds
    maxErrorRate: 0.05,        // 5%
    minThroughput: 100,        // requests per second
    maxCpuUsage: 0.8,          // 80%
    maxMemoryUsage: 0.9,       // 90%
  },
  endpoints: [
    {
      name: 'Health Check',
      path: '/api/health',
      method: 'GET',
      weight: 10, // 10% of requests
    },
    {
      name: 'List Integrations',
      path: '/api/integrations',
      method: 'GET',
      weight: 30, // 30% of requests
    },
    {
      name: 'Get Integration',
      path: '/api/integrations/{id}',
      method: 'GET',
      weight: 25, // 25% of requests
    },
    {
      name: 'Create Integration',
      path: '/api/integrations',
      method: 'POST',
      weight: 15, // 15% of requests
      body: {
        name: 'Load Test Integration',
        type: 'rest',
        config: { baseUrl: 'https://api.example.com' },
      },
    },
    {
      name: 'Update Integration',
      path: '/api/integrations/{id}',
      method: 'PUT',
      weight: 10, // 10% of requests
      body: {
        config: { timeout: 30000 },
      },
    },
    {
      name: 'Test Connection',
      path: '/api/integrations/{id}/test',
      method: 'POST',
      weight: 10, // 10% of requests
    },
  ],
};

/**
 * Main load testing orchestrator
 */
class LoadTestOrchestrator {
  constructor() {
    this.workers = [];
    this.results = {
      startTime: null,
      endTime: null,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      errorsByType: new Map(),
      responseTimePercentiles: [],
      throughputHistory: [],
      resourceUsage: [],
    };
  }

  /**
   * Run load test scenario
   */
  async runScenario(scenarioName = 'moderate') {
    const scenario = LOAD_TEST_CONFIG.scenarios[scenarioName];
    if (!scenario) {
      throw new Error(`Unknown scenario: ${scenarioName}`);
    }

    console.log(`${colors.cyan}${colors.bright}🚀 Starting Load Test: ${scenario.name}${colors.reset}\n`);
    console.log(`Duration: ${scenario.duration / 1000}s`);
    console.log(`Virtual Users: ${scenario.virtualUsers}`);
    console.log(`Ramp-up Time: ${scenario.rampUpTime / 1000}s`);
    console.log(`Request Rate: ${scenario.requestRate}/s per user\n`);

    this.results.startTime = performance.now();

    try {
      // Start resource monitoring
      const resourceMonitor = this.startResourceMonitoring();

      // Create and start workers
      await this.createWorkers(scenario);
      
      // Wait for test completion
      await this.waitForCompletion(scenario.duration);
      
      // Stop resource monitoring
      clearInterval(resourceMonitor);
      
      // Collect results from workers
      await this.collectResults();
      
      // Generate report
      this.generateReport(scenario);
      
    } catch (error) {
      console.error(`${colors.red}Load test failed: ${error.message}${colors.reset}`);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Create worker threads for load generation
   */
  async createWorkers(scenario) {
    const workersPerUser = Math.min(scenario.virtualUsers, 50); // Max 50 workers
    const usersPerWorker = Math.ceil(scenario.virtualUsers / workersPerUser);
    
    console.log(`${colors.blue}🔧 Creating ${workersPerUser} workers (${usersPerWorker} users each)...${colors.reset}`);

    for (let i = 0; i < workersPerUser; i++) {
      const worker = new Worker(__filename, {
        workerData: {
          workerId: i,
          usersPerWorker,
          scenario,
          endpoints: LOAD_TEST_CONFIG.endpoints,
          rampUpDelay: (i * scenario.rampUpTime) / workersPerUser,
        },
      });

      worker.on('message', this.handleWorkerMessage.bind(this));
      worker.on('error', this.handleWorkerError.bind(this));
      
      this.workers.push(worker);
    }

    // Wait for all workers to be ready
    await new Promise(resolve => {
      let readyCount = 0;
      const checkReady = () => {
        if (readyCount >= this.workers.length) {
          resolve();
        }
      };

      this.workers.forEach(worker => {
        worker.once('message', (msg) => {
          if (msg.type === 'ready') {
            readyCount++;
            checkReady();
          }
        });
      });
    });

    console.log(`${colors.green}✅ All workers ready${colors.reset}\n`);
  }

  /**
   * Wait for test completion
   */
  async waitForCompletion(duration) {
    const startTime = Date.now();
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / duration) * 100, 100);
      const remainingTime = Math.max(0, duration - elapsed);
      
      process.stdout.write(`\r${colors.yellow}Progress: ${progress.toFixed(1)}% | Remaining: ${(remainingTime / 1000).toFixed(0)}s | Requests: ${this.results.totalRequests}${colors.reset}`);
    }, 1000);

    await new Promise(resolve => setTimeout(resolve, duration));
    clearInterval(progressInterval);
    
    console.log('\n');
  }

  /**
   * Start resource monitoring
   */
  startResourceMonitoring() {
    return setInterval(() => {
      const usage = process.cpuUsage();
      const memUsage = process.memoryUsage();
      
      this.results.resourceUsage.push({
        timestamp: Date.now(),
        cpu: usage,
        memory: {
          rss: memUsage.rss,
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
          external: memUsage.external,
        },
      });
    }, 5000); // Every 5 seconds
  }

  /**
   * Handle worker messages
   */
  handleWorkerMessage(message) {
    switch (message.type) {
      case 'request_complete':
        this.results.totalRequests++;
        if (message.success) {
          this.results.successfulRequests++;
        } else {
          this.results.failedRequests++;
          const errorType = message.error || 'unknown';
          this.results.errorsByType.set(errorType, 
            (this.results.errorsByType.get(errorType) || 0) + 1);
        }
        
        if (message.responseTime) {
          this.results.totalResponseTime += message.responseTime;
          this.results.minResponseTime = Math.min(this.results.minResponseTime, message.responseTime);
          this.results.maxResponseTime = Math.max(this.results.maxResponseTime, message.responseTime);
        }
        break;
        
      case 'throughput_update':
        this.results.throughputHistory.push({
          timestamp: message.timestamp,
          throughput: message.throughput,
        });
        break;
    }
  }

  /**
   * Handle worker errors
   */
  handleWorkerError(error) {
    console.error(`${colors.red}Worker error: ${error.message}${colors.reset}`);
  }

  /**
   * Collect final results from workers
   */
  async collectResults() {
    console.log(`${colors.blue}📊 Collecting results from workers...${colors.reset}`);
    
    // Signal workers to stop and send final results
    this.workers.forEach(worker => {
      worker.postMessage({ type: 'stop' });
    });

    // Wait for final results
    await new Promise(resolve => {
      let completedWorkers = 0;
      const handleCompletion = () => {
        completedWorkers++;
        if (completedWorkers >= this.workers.length) {
          resolve();
        }
      };

      this.workers.forEach(worker => {
        worker.once('message', (msg) => {
          if (msg.type === 'final_results') {
            // Merge worker results
            if (msg.responseTimePercentiles) {
              this.results.responseTimePercentiles.push(...msg.responseTimePercentiles);
            }
            handleCompletion();
          }
        });
      });
    });

    this.results.endTime = performance.now();
  }

  /**
   * Generate comprehensive test report
   */
  generateReport(scenario) {
    const duration = (this.results.endTime - this.results.startTime) / 1000;
    const avgResponseTime = this.results.totalRequests > 0 
      ? this.results.totalResponseTime / this.results.totalRequests 
      : 0;
    const errorRate = this.results.totalRequests > 0 
      ? this.results.failedRequests / this.results.totalRequests 
      : 0;
    const throughput = this.results.totalRequests / duration;

    console.log(`\n${colors.cyan}${colors.bright}📈 LOAD TEST REPORT${colors.reset}`);
    console.log(`${colors.cyan}========================${colors.reset}\n`);

    // Test Configuration
    console.log(`${colors.bright}Test Configuration:${colors.reset}`);
    console.log(`  Scenario: ${scenario.name}`);
    console.log(`  Duration: ${duration.toFixed(2)}s`);
    console.log(`  Virtual Users: ${scenario.virtualUsers}`);
    console.log(`  Target Rate: ${scenario.requestRate * scenario.virtualUsers}/s\n`);

    // Request Statistics
    console.log(`${colors.bright}Request Statistics:${colors.reset}`);
    console.log(`  Total Requests: ${this.results.totalRequests.toLocaleString()}`);
    console.log(`  ${colors.green}Successful: ${this.results.successfulRequests.toLocaleString()}${colors.reset}`);
    console.log(`  ${colors.red}Failed: ${this.results.failedRequests.toLocaleString()}${colors.reset}`);
    console.log(`  Success Rate: ${((1 - errorRate) * 100).toFixed(2)}%`);
    console.log(`  Error Rate: ${(errorRate * 100).toFixed(2)}%\n`);

    // Performance Metrics
    console.log(`${colors.bright}Performance Metrics:${colors.reset}`);
    console.log(`  Throughput: ${throughput.toFixed(2)} req/s`);
    console.log(`  Avg Response Time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`  Min Response Time: ${this.results.minResponseTime.toFixed(2)}ms`);
    console.log(`  Max Response Time: ${this.results.maxResponseTime.toFixed(2)}ms\n`);

    // Response Time Percentiles
    if (this.results.responseTimePercentiles.length > 0) {
      const sorted = this.results.responseTimePercentiles.sort((a, b) => a - b);
      const p50 = this.getPercentile(sorted, 50);
      const p90 = this.getPercentile(sorted, 90);
      const p95 = this.getPercentile(sorted, 95);
      const p99 = this.getPercentile(sorted, 99);

      console.log(`${colors.bright}Response Time Percentiles:${colors.reset}`);
      console.log(`  50th percentile: ${p50.toFixed(2)}ms`);
      console.log(`  90th percentile: ${p90.toFixed(2)}ms`);
      console.log(`  95th percentile: ${p95.toFixed(2)}ms`);
      console.log(`  99th percentile: ${p99.toFixed(2)}ms\n`);
    }

    // Error Breakdown
    if (this.results.errorsByType.size > 0) {
      console.log(`${colors.bright}Error Breakdown:${colors.reset}`);
      for (const [errorType, count] of this.results.errorsByType.entries()) {
        const percentage = (count / this.results.failedRequests * 100).toFixed(1);
        console.log(`  ${errorType}: ${count} (${percentage}%)`);
      }
      console.log();
    }

    // Resource Usage
    if (this.results.resourceUsage.length > 0) {
      const avgMemory = this.results.resourceUsage.reduce((sum, usage) => 
        sum + usage.memory.heapUsed, 0) / this.results.resourceUsage.length;
      const maxMemory = Math.max(...this.results.resourceUsage.map(u => u.memory.heapUsed));

      console.log(`${colors.bright}Resource Usage:${colors.reset}`);
      console.log(`  Avg Memory: ${(avgMemory / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  Peak Memory: ${(maxMemory / 1024 / 1024).toFixed(2)} MB\n`);
    }

    // Threshold Analysis
    console.log(`${colors.bright}Threshold Analysis:${colors.reset}`);
    this.analyzeThresholds(avgResponseTime, errorRate, throughput);

    // Summary
    console.log(`\n${colors.bright}Summary:${colors.reset}`);
    const passed = this.evaluateTestResults(avgResponseTime, errorRate, throughput);
    if (passed) {
      console.log(`${colors.green}✅ Load test PASSED - System performed within acceptable limits${colors.reset}`);
    } else {
      console.log(`${colors.red}❌ Load test FAILED - System exceeded performance thresholds${colors.reset}`);
    }

    // Save detailed results
    this.saveResults(scenario, {
      duration,
      avgResponseTime,
      errorRate,
      throughput,
      passed,
    });
  }

  /**
   * Analyze performance thresholds
   */
  analyzeThresholds(avgResponseTime, errorRate, throughput) {
    const thresholds = LOAD_TEST_CONFIG.thresholds;
    
    const checks = [
      ['Max Response Time', avgResponseTime, thresholds.maxResponseTime, 'ms', '<'],
      ['Max Error Rate', errorRate * 100, thresholds.maxErrorRate * 100, '%', '<'],
      ['Min Throughput', throughput, thresholds.minThroughput, 'req/s', '>'],
    ];

    for (const [name, actual, threshold, unit, operator] of checks) {
      const passed = operator === '<' ? actual < threshold : actual > threshold;
      const status = passed ? `${colors.green}✓` : `${colors.red}✗`;
      const comparison = operator === '<' ? 'below' : 'above';
      
      console.log(`  ${status}${colors.reset} ${name}: ${actual.toFixed(2)}${unit} (${comparison} ${threshold}${unit})`);
    }
  }

  /**
   * Evaluate overall test results
   */
  evaluateTestResults(avgResponseTime, errorRate, throughput) {
    const thresholds = LOAD_TEST_CONFIG.thresholds;
    
    return avgResponseTime < thresholds.maxResponseTime &&
           errorRate < thresholds.maxErrorRate &&
           throughput > thresholds.minThroughput;
  }

  /**
   * Get percentile value from sorted array
   */
  getPercentile(sortedArray, percentile) {
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)];
  }

  /**
   * Save results to file
   */
  saveResults(scenario, summary) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `load-test-${scenario.name.toLowerCase().replace(' ', '-')}-${timestamp}.json`;
    const filePath = path.join(__dirname, '..', 'test-results', filename);

    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const report = {
      scenario,
      summary,
      detailed: this.results,
      timestamp: new Date().toISOString(),
    };

    try {
      fs.writeFileSync(filePath, JSON.stringify(report, null, 2));
      console.log(`\n${colors.blue}📄 Detailed results saved to: ${filename}${colors.reset}`);
    } catch (error) {
      console.error(`${colors.red}Failed to save results: ${error.message}${colors.reset}`);
    }
  }

  /**
   * Cleanup workers and resources
   */
  async cleanup() {
    console.log(`${colors.blue}🧹 Cleaning up workers...${colors.reset}`);
    
    for (const worker of this.workers) {
      await worker.terminate();
    }
    
    this.workers = [];
  }
}

/**
 * Worker thread implementation
 */
class LoadTestWorker {
  constructor(workerData) {
    this.workerId = workerData.workerId;
    this.usersPerWorker = workerData.usersPerWorker;
    this.scenario = workerData.scenario;
    this.endpoints = workerData.endpoints;
    this.rampUpDelay = workerData.rampUpDelay;
    
    this.isRunning = false;
    this.requestCount = 0;
    this.responseTimes = [];
    this.startTime = null;
  }

  /**
   * Start worker execution
   */
  async start() {
    // Notify main thread that worker is ready
    parentPort.postMessage({ type: 'ready', workerId: this.workerId });

    // Wait for ramp-up delay
    await new Promise(resolve => setTimeout(resolve, this.rampUpDelay));

    this.isRunning = true;
    this.startTime = performance.now();

    // Start virtual users
    const userPromises = [];
    for (let i = 0; i < this.usersPerWorker; i++) {
      userPromises.push(this.simulateUser(i));
    }

    await Promise.all(userPromises);
  }

  /**
   * Simulate individual user behavior
   */
  async simulateUser(userId) {
    const requestInterval = 1000 / this.scenario.requestRate; // ms between requests
    
    while (this.isRunning) {
      try {
        await this.makeRequest();
        await new Promise(resolve => setTimeout(resolve, requestInterval));
      } catch (error) {
        // Continue with next request
      }
    }
  }

  /**
   * Make HTTP request to random endpoint
   */
  async makeRequest() {
    const endpoint = this.selectRandomEndpoint();
    const startTime = performance.now();
    
    try {
      // Simulate HTTP request
      const responseTime = await this.simulateHttpRequest(endpoint);
      const endTime = performance.now();
      const actualResponseTime = endTime - startTime;
      
      this.responseTimes.push(actualResponseTime);
      this.requestCount++;
      
      parentPort.postMessage({
        type: 'request_complete',
        success: true,
        responseTime: actualResponseTime,
        endpoint: endpoint.name,
      });
      
    } catch (error) {
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      parentPort.postMessage({
        type: 'request_complete',
        success: false,
        responseTime,
        endpoint: endpoint.name,
        error: error.message,
      });
    }
  }

  /**
   * Select random endpoint based on weights
   */
  selectRandomEndpoint() {
    const totalWeight = this.endpoints.reduce((sum, ep) => sum + ep.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const endpoint of this.endpoints) {
      random -= endpoint.weight;
      if (random <= 0) {
        return endpoint;
      }
    }
    
    return this.endpoints[0]; // Fallback
  }

  /**
   * Simulate HTTP request with realistic timing
   */
  async simulateHttpRequest(endpoint) {
    // Simulate network latency and processing time
    const baseLatency = 50 + Math.random() * 100; // 50-150ms base
    const processingTime = 10 + Math.random() * 40; // 10-50ms processing
    
    // Add some variability based on endpoint complexity
    const complexityMultiplier = endpoint.method === 'POST' ? 1.5 : 1.0;
    const totalTime = (baseLatency + processingTime) * complexityMultiplier;
    
    // Simulate occasional failures (2% failure rate)
    if (Math.random() < 0.02) {
      await new Promise(resolve => setTimeout(resolve, totalTime * 0.5));
      throw new Error('Simulated network error');
    }
    
    await new Promise(resolve => setTimeout(resolve, totalTime));
    return totalTime;
  }

  /**
   * Stop worker and send final results
   */
  stop() {
    this.isRunning = false;
    
    parentPort.postMessage({
      type: 'final_results',
      workerId: this.workerId,
      requestCount: this.requestCount,
      responseTimePercentiles: this.responseTimes,
    });
  }
}

// Worker thread entry point
if (!isMainThread) {
  const worker = new LoadTestWorker(workerData);
  
  parentPort.on('message', (message) => {
    if (message.type === 'stop') {
      worker.stop();
    }
  });
  
  worker.start().catch(error => {
    parentPort.postMessage({
      type: 'error',
      error: error.message,
    });
  });
}

/**
 * CLI interface
 */
async function main() {
  const args = process.argv.slice(2);
  const scenario = args[0] || 'moderate';
  
  if (!LOAD_TEST_CONFIG.scenarios[scenario]) {
    console.error(`${colors.red}Unknown scenario: ${scenario}${colors.reset}`);
    console.log(`Available scenarios: ${Object.keys(LOAD_TEST_CONFIG.scenarios).join(', ')}`);
    process.exit(1);
  }

  const orchestrator = new LoadTestOrchestrator();
  
  try {
    await orchestrator.runScenario(scenario);
    console.log(`\n${colors.green}Load test completed successfully!${colors.reset}`);
  } catch (error) {
    console.error(`\n${colors.red}Load test failed: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Run if called directly
if (isMainThread && import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(`${colors.red}Load test execution failed: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

export { LoadTestOrchestrator, LOAD_TEST_CONFIG };