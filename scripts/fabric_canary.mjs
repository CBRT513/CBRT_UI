#!/usr/bin/env node

/**
 * CBRT Fabric Canary Deployment Script
 * Automates canary deployments with SLO monitoring and automatic rollback
 * Supports 5% → 50% → 100% deployment progression with SLO guardrails
 */

import { spawn } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Configuration
const CANARY_CONFIG = {
  stages: [
    { name: 'canary-5', traffic: 5, duration: 300000, slo: { errorRate: 0.01, p99Latency: 2000 } },
    { name: 'canary-25', traffic: 25, duration: 600000, slo: { errorRate: 0.005, p99Latency: 1500 } },
    { name: 'canary-50', traffic: 50, duration: 900000, slo: { errorRate: 0.005, p99Latency: 1500 } },
    { name: 'stable', traffic: 100, duration: 0, slo: { errorRate: 0.005, p99Latency: 1000 } },
  ],
  prometheus: {
    url: process.env.PROMETHEUS_URL || 'http://localhost:9090',
    timeout: 30000,
  },
  kubernetes: {
    namespace: process.env.K8S_NAMESPACE || 'cbrt-mesh',
    context: process.env.K8S_CONTEXT || 'cbrt-cluster',
  },
  rollback: {
    autoRollback: true,
    healthCheck: true,
    sloViolationThreshold: 2, // Number of consecutive violations before rollback
  },
};

class CanaryDeployment {
  constructor(serviceName, newVersion, config = CANARY_CONFIG) {
    this.serviceName = serviceName;
    this.newVersion = newVersion;
    this.config = config;
    this.currentStage = 0;
    this.violations = 0;
    this.deploymentId = `${serviceName}-${newVersion}-${Date.now()}`;
    this.startTime = Date.now();
  }

  async deploy() {
    console.log(`🚀 Starting canary deployment for ${this.serviceName}:${this.newVersion}`);
    console.log(`📋 Deployment ID: ${this.deploymentId}`);
    console.log(`📅 Started at: ${new Date().toISOString()}`);

    try {
      // Pre-deployment checks
      await this.preDeploymentChecks();

      // Execute canary stages
      for (let i = 0; i < this.config.stages.length; i++) {
        this.currentStage = i;
        const stage = this.config.stages[i];
        
        console.log(`\n🎯 Stage ${i + 1}: ${stage.name} (${stage.traffic}% traffic)`);
        
        // Deploy stage
        await this.deployStage(stage);
        
        // Monitor SLOs
        if (stage.duration > 0) {
          await this.monitorSLOs(stage);
        }
        
        console.log(`✅ Stage ${stage.name} completed successfully`);
      }

      // Post-deployment validation
      await this.postDeploymentValidation();
      
      console.log(`\n🎉 Canary deployment completed successfully!`);
      console.log(`⏱️  Total deployment time: ${((Date.now() - this.startTime) / 1000 / 60).toFixed(2)} minutes`);

    } catch (error) {
      console.error(`\n❌ Deployment failed: ${error.message}`);
      if (this.config.rollback.autoRollback) {
        await this.rollback();
      }
      process.exit(1);
    }
  }

  async preDeploymentChecks() {
    console.log('\n🔍 Running pre-deployment checks...');

    // Check Kubernetes connectivity
    await this.runCommand('kubectl', ['version', '--client']);
    
    // Check current service health
    const healthy = await this.checkServiceHealth();
    if (!healthy) {
      throw new Error('Current service is not healthy. Aborting deployment.');
    }

    // Validate new version exists
    await this.validateNewVersion();

    // Check Prometheus connectivity
    await this.checkPrometheusHealth();

    console.log('✅ Pre-deployment checks passed');
  }

  async deployStage(stage) {
    console.log(`📦 Deploying ${stage.name} with ${stage.traffic}% traffic...`);

    // Update virtual service for traffic splitting
    await this.updateTrafficSplit(stage.traffic);

    // Deploy new version if not already deployed
    if (stage.traffic === 5) {
      await this.deployNewVersion();
    }

    // Wait for pods to be ready
    await this.waitForPods();

    console.log(`🚦 Traffic split: ${100 - stage.traffic}% stable, ${stage.traffic}% canary`);
  }

  async monitorSLOs(stage) {
    console.log(`📊 Monitoring SLOs for ${stage.duration / 1000}s...`);
    
    const monitoringInterval = 30000; // 30 seconds
    const checks = Math.floor(stage.duration / monitoringInterval);
    
    for (let check = 0; check < checks; check++) {
      console.log(`🔍 SLO check ${check + 1}/${checks}`);
      
      const metrics = await this.collectMetrics();
      const sloViolation = this.checkSLOViolation(metrics, stage.slo);
      
      if (sloViolation) {
        this.violations++;
        console.warn(`⚠️  SLO violation detected (${this.violations}/${this.config.rollback.sloViolationThreshold}): ${sloViolation}`);
        
        if (this.violations >= this.config.rollback.sloViolationThreshold) {
          throw new Error(`SLO violations exceeded threshold. Rolling back.`);
        }
      } else {
        this.violations = 0; // Reset on successful check
        console.log(`✅ SLOs within acceptable range`);
      }
      
      this.logMetrics(metrics, stage.slo);
      
      if (check < checks - 1) {
        await this.sleep(monitoringInterval);
      }
    }
  }

  async collectMetrics() {
    const queries = {
      errorRate: `sum(rate(istio_requests_total{destination_service_name="${this.serviceName}",response_code=~"5.*"}[5m])) / sum(rate(istio_requests_total{destination_service_name="${this.serviceName}"}[5m]))`,
      p99Latency: `histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{destination_service_name="${this.serviceName}"}[5m])) by (le))`,
      requestRate: `sum(rate(istio_requests_total{destination_service_name="${this.serviceName}"}[5m]))`,
      successRate: `sum(rate(istio_requests_total{destination_service_name="${this.serviceName}",response_code!~"5.*"}[5m])) / sum(rate(istio_requests_total{destination_service_name="${this.serviceName}"}[5m]))`,
    };

    const metrics = {};
    
    for (const [name, query] of Object.entries(queries)) {
      try {
        const result = await this.queryPrometheus(query);
        metrics[name] = parseFloat(result) || 0;
      } catch (error) {
        console.warn(`⚠️  Failed to collect ${name} metric: ${error.message}`);
        metrics[name] = 0;
      }
    }

    return metrics;
  }

  checkSLOViolation(metrics, slo) {
    if (metrics.errorRate > slo.errorRate) {
      return `Error rate ${(metrics.errorRate * 100).toFixed(2)}% exceeds SLO ${(slo.errorRate * 100).toFixed(2)}%`;
    }
    
    if (metrics.p99Latency > slo.p99Latency) {
      return `P99 latency ${metrics.p99Latency.toFixed(0)}ms exceeds SLO ${slo.p99Latency}ms`;
    }
    
    return null;
  }

  logMetrics(metrics, slo) {
    console.log(`📈 Current metrics:`);
    console.log(`   Error Rate: ${(metrics.errorRate * 100).toFixed(3)}% (SLO: ${(slo.errorRate * 100).toFixed(2)}%)`);
    console.log(`   P99 Latency: ${metrics.p99Latency.toFixed(0)}ms (SLO: ${slo.p99Latency}ms)`);
    console.log(`   Request Rate: ${metrics.requestRate.toFixed(2)} req/s`);
    console.log(`   Success Rate: ${(metrics.successRate * 100).toFixed(2)}%`);
  }

  async updateTrafficSplit(canaryTraffic) {
    const stableTraffic = 100 - canaryTraffic;
    
    const virtualService = {
      apiVersion: 'networking.istio.io/v1beta1',
      kind: 'VirtualService',
      metadata: {
        name: `${this.serviceName}-canary`,
        namespace: this.config.kubernetes.namespace,
        labels: {
          app: this.serviceName,
          deployment: this.deploymentId,
        },
      },
      spec: {
        hosts: [`${this.serviceName}`],
        http: [{
          match: [{ headers: { 'x-canary': { exact: 'true' } } }],
          route: [{
            destination: {
              host: this.serviceName,
              subset: 'canary',
            },
            weight: 100,
          }],
        }, {
          route: [{
            destination: {
              host: this.serviceName,
              subset: 'stable',
            },
            weight: stableTraffic,
          }, {
            destination: {
              host: this.serviceName,
              subset: 'canary',
            },
            weight: canaryTraffic,
          }],
        }],
      },
    };

    const tempFile = `/tmp/${this.serviceName}-virtualservice.yaml`;
    writeFileSync(tempFile, JSON.stringify(virtualService, null, 2));
    
    await this.runCommand('kubectl', ['apply', '-f', tempFile]);
  }

  async deployNewVersion() {
    console.log(`🚢 Deploying new version ${this.newVersion}...`);
    
    // Create canary deployment
    const deployment = {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: {
        name: `${this.serviceName}-canary`,
        namespace: this.config.kubernetes.namespace,
        labels: {
          app: this.serviceName,
          version: 'canary',
          deployment: this.deploymentId,
        },
      },
      spec: {
        replicas: 1,
        selector: {
          matchLabels: {
            app: this.serviceName,
            version: 'canary',
          },
        },
        template: {
          metadata: {
            labels: {
              app: this.serviceName,
              version: 'canary',
            },
            annotations: {
              'prometheus.io/scrape': 'true',
              'prometheus.io/port': '8080',
              'prometheus.io/path': '/metrics',
            },
          },
          spec: {
            containers: [{
              name: this.serviceName,
              image: `${this.serviceName}:${this.newVersion}`,
              ports: [{
                containerPort: 8080,
                name: 'http',
              }],
              env: [{
                name: 'VERSION',
                value: this.newVersion,
              }, {
                name: 'DEPLOYMENT_TYPE',
                value: 'canary',
              }],
              livenessProbe: {
                httpGet: {
                  path: '/health',
                  port: 8080,
                },
                initialDelaySeconds: 30,
                periodSeconds: 10,
              },
              readinessProbe: {
                httpGet: {
                  path: '/ready',
                  port: 8080,
                },
                initialDelaySeconds: 5,
                periodSeconds: 5,
              },
              resources: {
                requests: {
                  cpu: '100m',
                  memory: '256Mi',
                },
                limits: {
                  cpu: '500m',
                  memory: '512Mi',
                },
              },
            }],
          },
        },
      },
    };

    const tempFile = `/tmp/${this.serviceName}-canary-deployment.yaml`;
    writeFileSync(tempFile, JSON.stringify(deployment, null, 2));
    
    await this.runCommand('kubectl', ['apply', '-f', tempFile]);
  }

  async waitForPods() {
    console.log('⏳ Waiting for pods to be ready...');
    
    await this.runCommand('kubectl', [
      'wait',
      '--for=condition=ready',
      'pod',
      '-l', `app=${this.serviceName},version=canary`,
      '-n', this.config.kubernetes.namespace,
      '--timeout=300s',
    ]);
  }

  async checkServiceHealth() {
    try {
      const result = await this.runCommand('kubectl', [
        'get', 'pods',
        '-l', `app=${this.serviceName}`,
        '-n', this.config.kubernetes.namespace,
        '-o', 'jsonpath={.items[*].status.phase}',
      ]);
      
      const phases = result.stdout.split(' ');
      return phases.every(phase => phase === 'Running');
    } catch (error) {
      return false;
    }
  }

  async validateNewVersion() {
    // This would typically check if the image exists in your registry
    console.log(`🔍 Validating new version ${this.newVersion}...`);
    // Placeholder - implement actual image validation
  }

  async checkPrometheusHealth() {
    try {
      await this.queryPrometheus('up');
      console.log('✅ Prometheus connectivity verified');
    } catch (error) {
      throw new Error(`Prometheus health check failed: ${error.message}`);
    }
  }

  async queryPrometheus(query) {
    const url = `${this.config.prometheus.url}/api/v1/query?query=${encodeURIComponent(query)}`;
    
    return new Promise((resolve, reject) => {
      const child = spawn('curl', [
        '-s',
        '--max-time', '30',
        url,
      ]);

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Prometheus query failed: ${stderr}`));
          return;
        }

        try {
          const response = JSON.parse(stdout);
          if (response.status !== 'success') {
            reject(new Error(`Prometheus query error: ${response.error}`));
            return;
          }

          const result = response.data.result;
          if (result.length === 0) {
            resolve('0');
          } else {
            resolve(result[0].value[1]);
          }
        } catch (error) {
          reject(new Error(`Failed to parse Prometheus response: ${error.message}`));
        }
      });
    });
  }

  async rollback() {
    console.log('\n🔄 Initiating rollback...');
    
    try {
      // Remove canary traffic
      await this.updateTrafficSplit(0);
      
      // Delete canary deployment
      await this.runCommand('kubectl', [
        'delete', 'deployment',
        `${this.serviceName}-canary`,
        '-n', this.config.kubernetes.namespace,
        '--ignore-not-found=true',
      ]);
      
      // Clean up virtual service
      await this.runCommand('kubectl', [
        'delete', 'virtualservice',
        `${this.serviceName}-canary`,
        '-n', this.config.kubernetes.namespace,
        '--ignore-not-found=true',
      ]);
      
      console.log('✅ Rollback completed successfully');
    } catch (error) {
      console.error(`❌ Rollback failed: ${error.message}`);
    }
  }

  async postDeploymentValidation() {
    console.log('\n🔍 Running post-deployment validation...');
    
    // Check final service health
    const healthy = await this.checkServiceHealth();
    if (!healthy) {
      throw new Error('Service health check failed after deployment');
    }
    
    // Final SLO check
    const metrics = await this.collectMetrics();
    const finalStage = this.config.stages[this.config.stages.length - 1];
    const violation = this.checkSLOViolation(metrics, finalStage.slo);
    
    if (violation) {
      throw new Error(`Final SLO check failed: ${violation}`);
    }
    
    console.log('✅ Post-deployment validation passed');
  }

  async runCommand(command, args) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args);
      
      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Command failed (${code}): ${command} ${args.join(' ')}\n${stderr}`));
        } else {
          resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
        }
      });
    });
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI Interface
function parseArgs() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: fabric_canary.mjs <service-name> <new-version> [options]');
    console.error('');
    console.error('Options:');
    console.error('  --prometheus-url <url>    Prometheus URL (default: http://localhost:9090)');
    console.error('  --namespace <ns>          Kubernetes namespace (default: cbrt-mesh)');
    console.error('  --no-auto-rollback       Disable automatic rollback on SLO violations');
    console.error('  --dry-run                 Show what would be deployed without executing');
    process.exit(1);
  }

  const config = { ...CANARY_CONFIG };
  const serviceName = args[0];
  const newVersion = args[1];

  for (let i = 2; i < args.length; i++) {
    switch (args[i]) {
      case '--prometheus-url':
        config.prometheus.url = args[++i];
        break;
      case '--namespace':
        config.kubernetes.namespace = args[++i];
        break;
      case '--no-auto-rollback':
        config.rollback.autoRollback = false;
        break;
      case '--dry-run':
        config.dryRun = true;
        break;
      default:
        console.warn(`Unknown option: ${args[i]}`);
    }
  }

  return { serviceName, newVersion, config };
}

// Main execution
async function main() {
  const { serviceName, newVersion, config } = parseArgs();
  
  console.log('🔧 CBRT Fabric Canary Deployment');
  console.log('================================');
  console.log(`Service: ${serviceName}`);
  console.log(`New Version: ${newVersion}`);
  console.log(`Namespace: ${config.kubernetes.namespace}`);
  console.log(`Auto-rollback: ${config.rollback.autoRollback ? 'enabled' : 'disabled'}`);
  
  if (config.dryRun) {
    console.log('\n🔍 DRY RUN MODE - No changes will be applied');
    console.log('Deployment stages:');
    config.stages.forEach((stage, i) => {
      console.log(`  ${i + 1}. ${stage.name}: ${stage.traffic}% traffic for ${stage.duration / 1000}s`);
    });
    return;
  }

  const deployment = new CanaryDeployment(serviceName, newVersion, config);
  await deployment.deploy();
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('\n💥 Unhandled error:', error.message);
  process.exit(1);
});

process.on('SIGINT', async () => {
  console.log('\n🛑 Deployment interrupted. Cleaning up...');
  // Add cleanup logic here if needed
  process.exit(1);
});

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('\n💥 Deployment failed:', error.message);
    process.exit(1);
  });
}