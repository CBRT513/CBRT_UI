// Test Analysis Service - Analyzes stress test results and generates fixes
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { logger } from '../utils/logger';

class TestAnalysisService {
  constructor() {
    this.knownIssues = new Map();
    this.fixTemplates = new Map();
    this.initializeKnowledgeBase();
  }

  // Initialize known issue patterns and fixes
  initializeKnowledgeBase() {
    // Race condition patterns
    this.knownIssues.set('multiple_locks', {
      pattern: /multiple.*lock.*acquired/i,
      severity: 'critical',
      category: 'concurrency',
      description: 'Multiple users can acquire locks simultaneously',
      impact: 'Data corruption, workflow inconsistency',
      fix: 'Implement atomic lock acquisition with database transactions'
    });

    this.knownIssues.set('duplicate_bypass', {
      pattern: /duplicate.*not.*detected/i,
      severity: 'high',
      category: 'validation',
      description: 'Duplicate detection can be bypassed',
      impact: 'Duplicate data creation',
      fix: 'Add server-side validation before database writes'
    });

    this.knownIssues.set('permission_bypass', {
      pattern: /permission.*bypass/i,
      severity: 'critical',
      category: 'security',
      description: 'User permissions can be circumvented',
      impact: 'Unauthorized operations, security breach',
      fix: 'Implement server-side permission checks'
    });

    this.knownIssues.set('data_corruption', {
      pattern: /corruption.*not.*fixed/i,
      severity: 'high',
      category: 'data_integrity',
      description: 'Corrupted data not automatically recovered',
      impact: 'System instability, data loss',
      fix: 'Enhance data validation and auto-recovery mechanisms'
    });

    this.knownIssues.set('performance_slow', {
      pattern: /slow.*performance|duration.*\d{4,}/i,
      severity: 'medium',
      category: 'performance',
      description: 'Operations taking too long',
      impact: 'Poor user experience, system bottlenecks',
      fix: 'Optimize queries, add caching, implement pagination'
    });

    this.knownIssues.set('invalid_status', {
      pattern: /invalid.*status.*accepted/i,
      severity: 'medium',
      category: 'validation',
      description: 'Invalid status values accepted',
      impact: 'Workflow confusion, state inconsistency',
      fix: 'Add enum validation for status fields'
    });

    // Fix templates with actual code
    this.fixTemplates.set('atomic_locks', {
      file: 'src/services/releaseWorkflowService.js',
      function: 'acquireLock',
      code: `
// Fixed atomic lock acquisition
async acquireLock(releaseId, user) {
  return await runTransaction(db, async (transaction) => {
    const releaseRef = doc(db, 'releases', releaseId);
    const releaseDoc = await transaction.get(releaseRef);
    
    if (!releaseDoc.exists()) {
      throw new Error('Release not found');
    }
    
    const data = releaseDoc.data();
    
    // Check if already locked by another user
    if (data.lockedBy && data.lockedBy !== user.id) {
      const lockTime = data.lockedAt?.toDate();
      const now = new Date();
      const lockAge = now - lockTime;
      
      // Release stale locks (older than 15 minutes)
      if (lockAge > 15 * 60 * 1000) {
        transaction.update(releaseRef, {
          lockedBy: user.id,
          lockedByName: user.name,
          lockedAt: serverTimestamp()
        });
        return { success: true };
      }
      
      throw new Error(\`Release locked by \${data.lockedByName}\`);
    }
    
    // Acquire or extend lock
    transaction.update(releaseRef, {
      lockedBy: user.id,
      lockedByName: user.name,
      lockedAt: serverTimestamp()
    });
    
    return { success: true };
  });
}`
    });

    this.fixTemplates.set('server_validation', {
      file: 'src/services/duplicateDetectionService.js',
      function: 'enforceServerValidation',
      code: `
// Server-side duplicate prevention with transaction
async createReleaseWithValidation(releaseData) {
  return await runTransaction(db, async (transaction) => {
    // Check for duplicates within transaction
    const duplicateQuery = query(
      collection(db, 'releases'),
      where('supplierId', '==', releaseData.supplierId),
      where('customerId', '==', releaseData.customerId),
      where('releaseNumber', '==', releaseData.releaseNumber)
    );
    
    const existingReleases = await getDocs(duplicateQuery);
    
    // Check line items for exact matches
    for (const doc of existingReleases.docs) {
      const existing = doc.data();
      if (this.compareLineItems(releaseData.lineItems, existing.lineItems)) {
        throw new Error('Duplicate release detected in server validation');
      }
    }
    
    // Create release within transaction
    const newReleaseRef = doc(collection(db, 'releases'));
    transaction.set(newReleaseRef, {
      ...releaseData,
      createdAt: serverTimestamp(),
      validatedAt: serverTimestamp()
    });
    
    return newReleaseRef.id;
  });
}`
    });

    this.fixTemplates.set('permission_enforcement', {
      file: 'src/services/releaseWorkflowService.js',
      function: 'enforcePermissions',
      code: `
// Enhanced permission checking
async verifyRelease(releaseId, user) {
  return await runTransaction(db, async (transaction) => {
    const releaseRef = doc(db, 'releases', releaseId);
    const releaseDoc = await transaction.get(releaseRef);
    
    if (!releaseDoc.exists()) {
      throw new Error('Release not found');
    }
    
    const data = releaseDoc.data();
    
    // Server-side permission check
    if (data.stagedBy === user.id) {
      throw new Error('User cannot verify their own staging (server enforced)');
    }
    
    // Check if user has verification permissions
    const userRef = doc(db, 'users', user.id);
    const userDoc = await transaction.get(userRef);
    const userData = userDoc.data();
    
    if (!userData?.permissions?.canVerify) {
      throw new Error('User does not have verification permissions');
    }
    
    // Update release
    transaction.update(releaseRef, {
      status: 'Verified',
      verifiedBy: user.id,
      verifiedByName: user.name,
      verifiedAt: serverTimestamp()
    });
    
    return { success: true };
  });
}`
    });

    this.fixTemplates.set('performance_optimization', {
      file: 'src/hooks/useFirestore.js',
      function: 'optimizeQueries',
      code: `
// Performance optimizations
export const useOptimizedFirestore = (collectionName, options = {}) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const cacheRef = useRef(new Map());
  
  useEffect(() => {
    let unsubscribe;
    
    const setupQuery = async () => {
      let q = collection(db, collectionName);
      
      // Add pagination
      if (options.limit) {
        q = query(q, limit(options.limit));
      }
      
      // Add indexing hints
      if (options.orderBy) {
        q = query(q, orderBy(options.orderBy.field, options.orderBy.direction || 'asc'));
      }
      
      // Use cached data if available and recent
      const cacheKey = JSON.stringify({ collectionName, options });
      const cached = cacheRef.current.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 30000) {
        setData(cached.data);
        setLoading(false);
        return;
      }
      
      unsubscribe = onSnapshot(q, (snapshot) => {
        const newData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setData(newData);
        setLoading(false);
        
        // Cache results
        cacheRef.current.set(cacheKey, {
          data: newData,
          timestamp: Date.now()
        });
      });
    };
    
    setupQuery();
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [collectionName, JSON.stringify(options)]);
  
  return { data, loading };
};`
    });

    this.fixTemplates.set('status_validation', {
      file: 'src/services/releaseWorkflowService.js',
      function: 'validateStatus',
      code: `
// Status validation with enums
const VALID_STATUSES = ['Entered', 'Staged', 'Verified', 'Loaded', 'Shipped'];
const VALID_TRANSITIONS = {
  'Entered': ['Staged'],
  'Staged': ['Verified', 'Entered'], // Can reject back to Entered
  'Verified': ['Loaded'],
  'Loaded': ['Shipped'],
  'Shipped': [] // Terminal state
};

async updateReleaseStatus(releaseId, newStatus, user) {
  // Validate status
  if (!VALID_STATUSES.includes(newStatus)) {
    throw new Error(\`Invalid status: \${newStatus}. Must be one of: \${VALID_STATUSES.join(', ')}\`);
  }
  
  return await runTransaction(db, async (transaction) => {
    const releaseRef = doc(db, 'releases', releaseId);
    const releaseDoc = await transaction.get(releaseRef);
    
    if (!releaseDoc.exists()) {
      throw new Error('Release not found');
    }
    
    const currentData = releaseDoc.data();
    const currentStatus = currentData.status;
    
    // Validate transition
    const allowedTransitions = VALID_TRANSITIONS[currentStatus] || [];
    if (!allowedTransitions.includes(newStatus)) {
      throw new Error(\`Invalid transition from \${currentStatus} to \${newStatus}\`);
    }
    
    transaction.update(releaseRef, {
      status: newStatus,
      statusUpdatedAt: serverTimestamp(),
      statusUpdatedBy: user.id
    });
    
    return { success: true };
  });
}`
    });
  }

  // Analyze stress test results
  async analyzeTestResults(testResults) {
    console.log('🔍 Analyzing test results...');
    
    const analysis = {
      totalTests: testResults.length,
      criticalIssues: [],
      highPriorityIssues: [],
      mediumPriorityIssues: [],
      lowPriorityIssues: [],
      patterns: new Map(),
      recommendations: [],
      estimatedFixTime: 0,
      riskLevel: 'low'
    };

    // Categorize issues by severity
    for (const result of testResults) {
      if (result.anomaly) {
        const issue = this.categorizeIssue(result);
        
        switch (issue.severity) {
          case 'critical':
            analysis.criticalIssues.push(issue);
            break;
          case 'high':
            analysis.highPriorityIssues.push(issue);
            break;
          case 'medium':
            analysis.mediumPriorityIssues.push(issue);
            break;
          default:
            analysis.lowPriorityIssues.push(issue);
        }
        
        // Track patterns
        const category = issue.category;
        analysis.patterns.set(category, (analysis.patterns.get(category) || 0) + 1);
      }
    }

    // Determine overall risk level
    if (analysis.criticalIssues.length > 0) {
      analysis.riskLevel = 'critical';
    } else if (analysis.highPriorityIssues.length > 0) {
      analysis.riskLevel = 'high';
    } else if (analysis.mediumPriorityIssues.length > 0) {
      analysis.riskLevel = 'medium';
    }

    // Generate recommendations
    analysis.recommendations = await this.generateRecommendations(analysis);
    
    // Estimate fix time
    analysis.estimatedFixTime = this.estimateFixTime(analysis);

    console.log('✅ Analysis complete:', analysis);
    
    // Log the analysis
    await logger.info('Test results analysis completed', {
      criticalCount: analysis.criticalIssues.length,
      highCount: analysis.highPriorityIssues.length,
      riskLevel: analysis.riskLevel,
      estimatedFixTime: analysis.estimatedFixTime
    });

    return analysis;
  }

  // Categorize individual issue
  categorizeIssue(result) {
    const issue = {
      id: `issue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: result.timestamp || new Date().toISOString(),
      action: result.action,
      anomaly: result.anomaly,
      severity: result.severity || 'low',
      category: 'unknown',
      description: '',
      impact: '',
      fix: '',
      codeRequired: false,
      estimatedHours: 0
    };

    // Match against known patterns
    for (const [key, pattern] of this.knownIssues.entries()) {
      if (pattern.pattern.test(result.anomaly || '')) {
        issue.severity = pattern.severity;
        issue.category = pattern.category;
        issue.description = pattern.description;
        issue.impact = pattern.impact;
        issue.fix = pattern.fix;
        issue.codeRequired = true;
        break;
      }
    }

    // Set estimated fix time based on severity and category
    issue.estimatedHours = this.estimateIssueFixTime(issue);

    return issue;
  }

  // Generate specific recommendations
  async generateRecommendations(analysis) {
    const recommendations = [];

    // Critical issues first
    if (analysis.criticalIssues.length > 0) {
      recommendations.push({
        priority: 1,
        title: '🚨 CRITICAL: Immediate Action Required',
        description: `${analysis.criticalIssues.length} critical security/data integrity issues found`,
        actions: analysis.criticalIssues.map(issue => ({
          issue: issue.description,
          fix: issue.fix,
          code: this.getFixCode(issue.category)
        })),
        timeline: 'Fix immediately (within 24 hours)'
      });
    }

    // Performance issues
    const perfIssues = [...analysis.highPriorityIssues, ...analysis.mediumPriorityIssues]
      .filter(issue => issue.category === 'performance');
    
    if (perfIssues.length > 0) {
      recommendations.push({
        priority: 2,
        title: '⚡ Performance Optimization Required',
        description: `${perfIssues.length} performance issues detected`,
        actions: [{
          issue: 'Slow database operations and queries',
          fix: 'Implement caching, query optimization, and pagination',
          code: this.getFixCode('performance')
        }],
        timeline: 'Fix within 1 week'
      });
    }

    // Concurrency issues
    const concurrencyIssues = [...analysis.criticalIssues, ...analysis.highPriorityIssues]
      .filter(issue => issue.category === 'concurrency');
    
    if (concurrencyIssues.length > 0) {
      recommendations.push({
        priority: 1,
        title: '🔒 Concurrency Control Issues',
        description: 'Race conditions and locking problems detected',
        actions: [{
          issue: 'Multiple users can acquire locks simultaneously',
          fix: 'Implement atomic lock acquisition with database transactions',
          code: this.getFixCode('concurrency')
        }],
        timeline: 'Fix immediately'
      });
    }

    // Validation issues
    const validationIssues = [...analysis.highPriorityIssues, ...analysis.mediumPriorityIssues]
      .filter(issue => issue.category === 'validation');
    
    if (validationIssues.length > 0) {
      recommendations.push({
        priority: 2,
        title: '✅ Validation Improvements',
        description: 'Data validation gaps identified',
        actions: [{
          issue: 'Server-side validation missing',
          fix: 'Add comprehensive server-side validation',
          code: this.getFixCode('validation')
        }],
        timeline: 'Fix within 3 days'
      });
    }

    // Monitoring and alerting
    recommendations.push({
      priority: 3,
      title: '📊 Enhanced Monitoring',
      description: 'Add proactive monitoring to catch issues early',
      actions: [{
        issue: 'Limited visibility into system health',
        fix: 'Implement comprehensive monitoring and alerting',
        code: this.getMonitoringCode()
      }],
      timeline: 'Implement within 2 weeks'
    });

    return recommendations;
  }

  // Get fix code for category
  getFixCode(category) {
    switch (category) {
      case 'concurrency':
        return this.fixTemplates.get('atomic_locks');
      case 'validation':
        return this.fixTemplates.get('server_validation');
      case 'security':
        return this.fixTemplates.get('permission_enforcement');
      case 'performance':
        return this.fixTemplates.get('performance_optimization');
      default:
        return this.fixTemplates.get('status_validation');
    }
  }

  // Generate monitoring code
  getMonitoringCode() {
    return {
      file: 'src/services/healthMonitorService.js',
      function: 'monitorSystem',
      code: `
// System health monitoring
class HealthMonitorService {
  constructor() {
    this.metrics = new Map();
    this.alerts = [];
  }
  
  async checkSystemHealth() {
    const health = {
      database: await this.checkDatabaseHealth(),
      performance: await this.checkPerformance(),
      locks: await this.checkStuckLocks(),
      duplicates: await this.checkDuplicatePatterns(),
      timestamp: new Date().toISOString()
    };
    
    // Alert on issues
    if (health.database.issues || health.performance.slow || health.locks.stuck > 0) {
      await this.sendAlert('System health issues detected', health);
    }
    
    return health;
  }
  
  async checkDatabaseHealth() {
    const start = Date.now();
    try {
      await getDocs(query(collection(db, 'releases'), limit(1)));
      return { 
        healthy: true, 
        responseTime: Date.now() - start 
      };
    } catch (error) {
      return { 
        healthy: false, 
        error: error.message 
      };
    }
  }
}`
    };
  }

  // Estimate fix time for individual issue
  estimateIssueFixTime(issue) {
    const baseHours = {
      critical: 8,
      high: 4,
      medium: 2,
      low: 1
    };

    const categoryMultiplier = {
      security: 2,
      concurrency: 1.5,
      data_integrity: 1.5,
      performance: 1.2,
      validation: 1,
      unknown: 1
    };

    return (baseHours[issue.severity] || 1) * (categoryMultiplier[issue.category] || 1);
  }

  // Estimate total fix time
  estimateFixTime(analysis) {
    const critical = analysis.criticalIssues.reduce((sum, issue) => sum + issue.estimatedHours, 0);
    const high = analysis.highPriorityIssues.reduce((sum, issue) => sum + issue.estimatedHours, 0);
    const medium = analysis.mediumPriorityIssues.reduce((sum, issue) => sum + issue.estimatedHours, 0);
    
    return {
      immediate: critical,
      shortTerm: high,
      mediumTerm: medium,
      total: critical + high + medium
    };
  }

  // Generate implementation plan
  async generateImplementationPlan(analysis) {
    const plan = {
      phases: [],
      totalDuration: analysis.estimatedFixTime.total,
      risks: [],
      testing: []
    };

    // Phase 1: Critical fixes
    if (analysis.criticalIssues.length > 0) {
      plan.phases.push({
        phase: 1,
        title: 'Critical Security & Data Integrity Fixes',
        duration: analysis.estimatedFixTime.immediate,
        priority: 'IMMEDIATE',
        issues: analysis.criticalIssues,
        testing: ['Security penetration testing', 'Data integrity validation'],
        risks: ['System downtime during deployment', 'Potential breaking changes']
      });
    }

    // Phase 2: High priority fixes
    if (analysis.highPriorityIssues.length > 0) {
      plan.phases.push({
        phase: 2,
        title: 'Performance & Validation Improvements',
        duration: analysis.estimatedFixTime.shortTerm,
        priority: 'HIGH',
        issues: analysis.highPriorityIssues,
        testing: ['Load testing', 'Validation testing'],
        risks: ['Performance regression during optimization']
      });
    }

    // Phase 3: Medium priority fixes
    if (analysis.mediumPriorityIssues.length > 0) {
      plan.phases.push({
        phase: 3,
        title: 'System Hardening & Monitoring',
        duration: analysis.estimatedFixTime.mediumTerm,
        priority: 'MEDIUM',
        issues: analysis.mediumPriorityIssues,
        testing: ['Integration testing', 'Monitoring validation'],
        risks: ['Minimal - incremental improvements']
      });
    }

    return plan;
  }

  // Save analysis results
  async saveAnalysis(analysis, implementationPlan) {
    try {
      // Convert Map objects to plain objects for Firestore
      const serializedAnalysis = {
        ...analysis,
        patterns: Object.fromEntries(analysis.patterns)
      };
      
      const analysisDoc = {
        timestamp: serverTimestamp(),
        analysis: serializedAnalysis,
        implementationPlan,
        status: 'pending',
        createdBy: 'test-analysis-service'
      };

      const docRef = await addDoc(collection(db, 'test_analyses'), analysisDoc);
      console.log('✅ Analysis saved:', docRef.id);
      
      return docRef.id;
    } catch (error) {
      console.error('❌ Failed to save analysis:', error);
      throw error;
    }
  }
}

// Export singleton
export const testAnalysisService = new TestAnalysisService();
export default testAnalysisService;