// System Monitoring Service - Real-time monitoring and alerting
import { 
  collection, 
  addDoc, 
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { logger } from '../utils/logger';

class SystemMonitoringService {
  constructor() {
    this.metrics = new Map();
    this.alerts = [];
    this.thresholds = {
      errorRate: 0.05, // 5% error rate
      responseTime: 5000, // 5 seconds
      criticalErrors: 5, // per minute
      dataCorruption: 1, // any corruption is critical
      lockTimeout: 900000, // 15 minutes
      memoryUsage: 0.9, // 90% memory usage
      transactionFailureRate: 0.1 // 10% failure rate
    };
    this.listeners = new Map();
    this.isMonitoring = false;
  }

  // Start monitoring
  async startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    await logger.info('System monitoring started');
    
    // Set up real-time listeners
    this.setupMetricsCollection();
    this.setupAlertSystem();
    this.setupHealthChecks();
    
    // Start periodic checks
    this.startPeriodicChecks();
  }

  // Stop monitoring
  async stopMonitoring() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    // Clean up listeners
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners.clear();
    
    // Clear intervals
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    await logger.info('System monitoring stopped');
  }

  // Set up metrics collection
  setupMetricsCollection() {
    // Monitor error logs
    const errorQuery = query(
      collection(db, 'audit_logs'),
      where('level', '==', 'error'),
      orderBy('timestamp', 'desc'),
      limit(100)
    );
    
    const errorListener = onSnapshot(errorQuery, (snapshot) => {
      const errors = snapshot.docs.map(doc => doc.data());
      this.processErrors(errors);
    });
    
    this.listeners.set('errors', errorListener);
    
    // Monitor critical events
    const criticalQuery = query(
      collection(db, 'audit_logs'),
      where('level', '==', 'critical'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    
    const criticalListener = onSnapshot(criticalQuery, (snapshot) => {
      const criticals = snapshot.docs.map(doc => doc.data());
      this.processCriticalEvents(criticals);
    });
    
    this.listeners.set('criticals', criticalListener);
  }

  // Process error metrics
  processErrors(errors) {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Count recent errors
    const recentErrors = errors.filter(e => {
      const timestamp = e.timestamp?.toDate?.()?.getTime() || 0;
      return timestamp > oneMinuteAgo;
    });
    
    // Calculate error rate
    const errorRate = recentErrors.length / 60; // errors per second
    this.metrics.set('errorRate', errorRate);
    
    // Check for data corruption
    const corruptionErrors = recentErrors.filter(e => 
      e.message?.includes('corruption') || 
      e.message?.includes('corrupted')
    );
    
    if (corruptionErrors.length > 0) {
      this.triggerAlert('DATA_CORRUPTION', {
        count: corruptionErrors.length,
        errors: corruptionErrors
      });
    }
    
    // Check error rate threshold
    if (errorRate > this.thresholds.errorRate) {
      this.triggerAlert('HIGH_ERROR_RATE', {
        rate: errorRate,
        threshold: this.thresholds.errorRate,
        recentErrors
      });
    }
  }

  // Process critical events
  processCriticalEvents(criticals) {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Count recent critical events
    const recentCriticals = criticals.filter(c => {
      const timestamp = c.timestamp?.toDate?.()?.getTime() || 0;
      return timestamp > oneMinuteAgo;
    });
    
    if (recentCriticals.length >= this.thresholds.criticalErrors) {
      this.triggerAlert('CRITICAL_ERROR_SURGE', {
        count: recentCriticals.length,
        threshold: this.thresholds.criticalErrors,
        events: recentCriticals
      });
    }
  }

  // Set up alert system
  setupAlertSystem() {
    // Monitor for stuck workflows
    const workflowQuery = query(
      collection(db, 'releases'),
      where('lockedBy', '!=', null)
    );
    
    const workflowListener = onSnapshot(workflowQuery, (snapshot) => {
      const now = new Date();
      const stuckReleases = [];
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.lockedAt) {
          const lockTime = data.lockedAt.toDate();
          const lockAge = now - lockTime;
          
          if (lockAge > this.thresholds.lockTimeout) {
            stuckReleases.push({
              id: doc.id,
              releaseNumber: data.releaseNumber,
              lockedBy: data.lockedByName,
              lockAge: Math.round(lockAge / 60000) // minutes
            });
          }
        }
      });
      
      if (stuckReleases.length > 0) {
        this.triggerAlert('STUCK_LOCKS', {
          count: stuckReleases.length,
          releases: stuckReleases
        });
      }
    });
    
    this.listeners.set('workflows', workflowListener);
  }

  // Set up health checks
  setupHealthChecks() {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, 30000); // Every 30 seconds
  }

  // Perform health checks
  async performHealthChecks() {
    const health = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      checks: {}
    };
    
    // Check database connectivity
    try {
      const startTime = Date.now();
      await getDocs(query(collection(db, 'releases'), limit(1)));
      const responseTime = Date.now() - startTime;
      
      health.checks.database = {
        status: responseTime < this.thresholds.responseTime ? 'healthy' : 'slow',
        responseTime
      };
      
      if (responseTime > this.thresholds.responseTime) {
        this.triggerAlert('SLOW_DATABASE', {
          responseTime,
          threshold: this.thresholds.responseTime
        });
      }
    } catch (error) {
      health.checks.database = {
        status: 'error',
        error: error.message
      };
      health.status = 'unhealthy';
      
      this.triggerAlert('DATABASE_ERROR', {
        error: error.message
      });
    }
    
    // Check memory usage (if available)
    if (performance?.memory) {
      const memoryUsage = performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit;
      health.checks.memory = {
        status: memoryUsage < this.thresholds.memoryUsage ? 'healthy' : 'high',
        usage: Math.round(memoryUsage * 100)
      };
      
      if (memoryUsage > this.thresholds.memoryUsage) {
        this.triggerAlert('HIGH_MEMORY_USAGE', {
          usage: Math.round(memoryUsage * 100),
          threshold: Math.round(this.thresholds.memoryUsage * 100)
        });
      }
    }
    
    // Store health status
    this.metrics.set('health', health);
    
    // Log health check
    if (health.status === 'unhealthy') {
      await logger.error('System health check failed', null, health);
    }
  }

  // Trigger alert
  async triggerAlert(type, data) {
    const alert = {
      type,
      severity: this.getAlertSeverity(type),
      timestamp: new Date().toISOString(),
      data,
      id: `${type}_${Date.now()}`
    };
    
    // Deduplicate alerts (don't trigger same alert within 5 minutes)
    const recentAlert = this.alerts.find(a => 
      a.type === type && 
      (Date.now() - new Date(a.timestamp).getTime()) < 300000
    );
    
    if (recentAlert) {
      return; // Skip duplicate alert
    }
    
    this.alerts.push(alert);
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
    
    // Log alert
    await logger.critical(`ALERT: ${type}`, data);
    
    // Store alert in database
    try {
      await addDoc(collection(db, 'system_alerts'), {
        ...alert,
        timestamp: serverTimestamp(),
        acknowledged: false
      });
    } catch (error) {
      console.error('Failed to store alert:', error);
    }
    
    // Send notification (implement based on your notification system)
    this.sendNotification(alert);
  }

  // Get alert severity
  getAlertSeverity(type) {
    const criticalTypes = ['DATA_CORRUPTION', 'CRITICAL_ERROR_SURGE', 'DATABASE_ERROR'];
    const highTypes = ['HIGH_ERROR_RATE', 'STUCK_LOCKS', 'HIGH_MEMORY_USAGE'];
    const mediumTypes = ['SLOW_DATABASE', 'HIGH_TRANSACTION_FAILURES'];
    
    if (criticalTypes.includes(type)) return 'critical';
    if (highTypes.includes(type)) return 'high';
    if (mediumTypes.includes(type)) return 'medium';
    return 'low';
  }

  // Send notification (implement based on your needs)
  sendNotification(alert) {
    // Console notification for now
    const emoji = {
      critical: '🚨',
      high: '⚠️',
      medium: '⚡',
      low: 'ℹ️'
    };
    
    console.log(`${emoji[alert.severity]} ${alert.type}: ${JSON.stringify(alert.data)}`);
    
    // TODO: Implement email, SMS, Slack, etc.
  }

  // Get current metrics
  getMetrics() {
    return Object.fromEntries(this.metrics);
  }

  // Get recent alerts
  getAlerts(limit = 10) {
    return this.alerts.slice(-limit);
  }

  // Acknowledge alert
  async acknowledgeAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      
      // Update in database
      try {
        const alertQuery = query(
          collection(db, 'system_alerts'),
          where('id', '==', alertId),
          limit(1)
        );
        const snapshot = await getDocs(alertQuery);
        
        if (!snapshot.empty) {
          await updateDoc(snapshot.docs[0].ref, {
            acknowledged: true,
            acknowledgedAt: serverTimestamp()
          });
        }
      } catch (error) {
        console.error('Failed to acknowledge alert:', error);
      }
    }
  }

  // Start periodic checks
  startPeriodicChecks() {
    // Check system health every 30 seconds
    setInterval(() => {
      if (this.isMonitoring) {
        this.checkSystemMetrics();
      }
    }, 30000);
  }

  // Check system metrics
  async checkSystemMetrics() {
    // Calculate transaction failure rate
    const transactionMetrics = this.metrics.get('transactions') || { success: 0, failure: 0 };
    const failureRate = transactionMetrics.failure / (transactionMetrics.success + transactionMetrics.failure || 1);
    
    if (failureRate > this.thresholds.transactionFailureRate) {
      this.triggerAlert('HIGH_TRANSACTION_FAILURES', {
        failureRate: Math.round(failureRate * 100),
        threshold: Math.round(this.thresholds.transactionFailureRate * 100)
      });
    }
  }
}

// Export singleton
export const systemMonitoringService = new SystemMonitoringService();
export default systemMonitoringService;