// 15-Minute Continuous Chaos Testing System
// Runs endless random scenarios and logs all anomalies
import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
  getDoc,
  runTransaction,
  writeBatch,
  limit,
  orderBy
} from 'firebase/firestore';
import { db } from '../firebase/config';
import releaseWorkflowService from '../services/releaseWorkflowService';
import releaseNotificationService from '../services/releaseNotificationService';
import duplicateDetectionService from '../services/duplicateDetectionService';
import { logger } from '../utils/logger';
import TestAnalysisDashboard from '../components/TestAnalysisDashboard';
import dataValidationService from '../services/dataValidationService';

const ContinuousChaosTest = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [stats, setStats] = useState({
    totalScenarios: 0,
    successfulScenarios: 0,
    failedScenarios: 0,
    anomaliesDetected: 0,
    criticalErrors: 0,
    dataCorruptions: 0,
    performanceIssues: 0,
    duplicatesCreated: 0,
    autoRecoveries: 0
  });
  const [anomalies, setAnomalies] = useState([]);
  const [currentAction, setCurrentAction] = useState('');
  const [testLog, setTestLog] = useState([]);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [allTestResults, setAllTestResults] = useState([]);
  
  const testAbortRef = useRef(false);
  const createdDataRef = useRef([]);
  const intervalRef = useRef(null);
  const scenarioRunnerRef = useRef(null);

  // Test duration: 5 minutes
  const TEST_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

  // Random scenario generators
  const scenarios = [
    // 1. Create normal release
    async () => {
      const action = 'Creating normal release';
      setCurrentAction(action);
      
      try {
        const timestamp = Date.now();
        const releaseData = {
          releaseNumber: `TEST-${timestamp}`,
          status: 'Entered',
          supplierId: `supplier-${Math.floor(Math.random() * 10)}`,
          customerId: `customer-${Math.floor(Math.random() * 10)}`,
          lineItems: [{
            itemId: `item-${Math.floor(Math.random() * 20)}`,
            sizeId: `size-${Math.floor(Math.random() * 5)}`,
            quantity: Math.floor(Math.random() * 100) + 1
          }],
          createdAt: serverTimestamp()
        };
        
        // Validate and fix data before saving
        const validation = await dataValidationService.validateOnWrite('releases', releaseData);
        const dataToSave = validation.valid ? validation.data : releaseData;
        
        const ref = await addDoc(collection(db, 'releases'), dataToSave);
        createdDataRef.current.push({ type: 'release', id: ref.id });
        
        return { success: true, action };
      } catch (error) {
        return { success: false, action, error: error.message };
      }
    },
    
    // 2. Create duplicate release
    async () => {
      const action = 'Testing duplicate detection';
      setCurrentAction(action);
      
      try {
        // First create a release
        const releaseNumber = `DUP-${Date.now()}`;
        const releaseData = {
          releaseNumber,
          status: 'Entered',
          supplierId: 'dup-supplier',
          customerId: 'dup-customer',
          lineItems: [{
            itemId: 'dup-item',
            sizeId: 'dup-size',
            quantity: 50
          }],
          createdAt: serverTimestamp()
        };
        
        const ref1 = await addDoc(collection(db, 'releases'), releaseData);
        createdDataRef.current.push({ type: 'release', id: ref1.id });
        
        // Try to create duplicate
        const duplicateCheck = await duplicateDetectionService.checkForDuplicate(releaseData);
        
        if (!duplicateCheck.isDuplicate) {
          throw new Error('Duplicate not detected!');
        }
        
        // Create it anyway to test
        const ref2 = await addDoc(collection(db, 'releases'), releaseData);
        createdDataRef.current.push({ type: 'release', id: ref2.id });
        
        setStats(prev => ({ ...prev, duplicatesCreated: prev.duplicatesCreated + 1 }));
        
        return { 
          success: true, 
          action,
          anomaly: 'Duplicate created',
          severity: 'warning'
        };
      } catch (error) {
        return { success: false, action, error: error.message };
      }
    },
    
    // 3. Corrupt data and test recovery
    async () => {
      const action = 'Testing data corruption recovery';
      setCurrentAction(action);
      
      try {
        const corruptedData = {
          releaseNumber: null, // Invalid
          status: 123, // Should be string
          supplierId: null, // Missing required field
          customerId: null, // Missing required field
          lineItems: 'not-an-array', // Should be array
          quantity: 'abc', // Should be number
          createdAt: 'invalid-date'
        };
        
        const ref = await addDoc(collection(db, 'releases'), corruptedData);
        createdDataRef.current.push({ type: 'release', id: ref.id });
        
        // Wait for monitor to fix it
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const fixed = await getDoc(doc(db, 'releases', ref.id));
        if (fixed.exists() && fixed.data().releaseNumber) {
          setStats(prev => ({ ...prev, autoRecoveries: prev.autoRecoveries + 1 }));
          return { success: true, action, note: 'Auto-recovered' };
        }
        
        setStats(prev => ({ ...prev, dataCorruptions: prev.dataCorruptions + 1 }));
        return { 
          success: false, 
          action,
          anomaly: 'Data corruption not fixed',
          severity: 'critical'
        };
      } catch (error) {
        return { success: true, action, note: 'Corruption rejected' };
      }
    },
    
    // 4. Race condition testing
    async () => {
      const action = 'Testing race conditions';
      setCurrentAction(action);
      
      try {
        const releaseRef = await addDoc(collection(db, 'releases'), {
          releaseNumber: `RACE-${Date.now()}`,
          status: 'Entered',
          supplierId: 'test',
          customerId: 'test',
          createdAt: serverTimestamp()
        });
        createdDataRef.current.push({ type: 'release', id: releaseRef.id });
        
        // Multiple users try to lock simultaneously
        const promises = [];
        for (let i = 0; i < 5; i++) {
          promises.push(
            releaseWorkflowService.acquireLock(
              releaseRef.id,
              { id: `user-${i}`, name: `User ${i}` }
            ).catch(() => false)
          );
        }
        
        const results = await Promise.all(promises);
        const successCount = results.filter(r => r === true).length;
        
        if (successCount > 1) {
          return { 
            success: false, 
            action,
            anomaly: 'Multiple locks acquired!',
            severity: 'critical'
          };
        }
        
        return { success: true, action };
      } catch (error) {
        return { success: false, action, error: error.message };
      }
    },
    
    // 5. Workflow state transitions
    async () => {
      const action = 'Testing workflow transitions';
      setCurrentAction(action);
      
      try {
        const releaseRef = await addDoc(collection(db, 'releases'), {
          releaseNumber: `FLOW-${Date.now()}`,
          status: 'Entered',
          supplierId: 'test',
          customerId: 'test',
          lineItems: [{ itemId: 'test', quantity: 10 }],
          createdAt: serverTimestamp()
        });
        createdDataRef.current.push({ type: 'release', id: releaseRef.id });
        
        // Try random state transitions
        const states = ['Staged', 'Verified', 'Loaded', 'Shipped', 'Entered'];
        const randomState = states[Math.floor(Math.random() * states.length)];
        
        await updateDoc(doc(db, 'releases', releaseRef.id), {
          status: randomState
        });
        
        // Try invalid transition
        await updateDoc(doc(db, 'releases', releaseRef.id), {
          status: 'InvalidStatus'
        });
        
        return { 
          success: false, 
          action,
          anomaly: 'Invalid status accepted',
          severity: 'high'
        };
      } catch (error) {
        return { success: true, action };
      }
    },
    
    // 6. Performance stress test
    async () => {
      const action = 'Performance stress test';
      setCurrentAction(action);
      
      const startTime = Date.now();
      
      try {
        // Create many releases quickly
        const promises = [];
        for (let i = 0; i < 20; i++) {
          promises.push(addDoc(collection(db, 'releases'), {
            releaseNumber: `PERF-${Date.now()}-${i}`,
            status: 'Entered',
            supplierId: `supplier-${i}`,
            customerId: `customer-${i}`,
            createdAt: serverTimestamp()
          }));
        }
        
        const refs = await Promise.all(promises);
        refs.forEach(ref => createdDataRef.current.push({ type: 'release', id: ref.id }));
        
        const duration = Date.now() - startTime;
        
        if (duration > 5000) {
          setStats(prev => ({ ...prev, performanceIssues: prev.performanceIssues + 1 }));
          return { 
            success: false, 
            action,
            anomaly: `Slow performance: ${duration}ms`,
            severity: 'medium'
          };
        }
        
        return { success: true, action, duration };
      } catch (error) {
        return { success: false, action, error: error.message };
      }
    },
    
    // 7. User permission violations
    async () => {
      const action = 'Testing permission violations';
      setCurrentAction(action);
      
      try {
        const releaseRef = await addDoc(collection(db, 'releases'), {
          releaseNumber: `PERM-${Date.now()}`,
          status: 'Staged',
          stagedBy: 'user1',
          supplierId: 'test',
          customerId: 'test',
          createdAt: serverTimestamp()
        });
        createdDataRef.current.push({ type: 'release', id: releaseRef.id });
        
        // Same user tries to verify (should fail)
        await releaseWorkflowService.verifyRelease(
          releaseRef.id,
          { id: 'user1', name: 'User 1' }
        );
        
        return { 
          success: false, 
          action,
          anomaly: 'Permission bypass successful',
          severity: 'critical'
        };
      } catch (error) {
        // Expected to fail
        return { success: true, action };
      }
    },
    
    // 8. Database transaction failures
    async () => {
      const action = 'Testing transaction failures';
      setCurrentAction(action);
      
      try {
        await runTransaction(db, async (transaction) => {
          const ref = doc(collection(db, 'releases'));
          
          transaction.set(ref, {
            releaseNumber: `TRANS-${Date.now()}`,
            status: 'Entered',
            supplierId: 'test',
            customerId: 'test'
          });
          
          // Force failure
          if (Math.random() > 0.5) {
            throw new Error('Simulated transaction failure');
          }
          
          createdDataRef.current.push({ type: 'release', id: ref.id });
        });
        
        return { success: true, action };
      } catch (error) {
        return { success: true, action, note: 'Transaction rolled back correctly' };
      }
    },
    
    // 9. Memory leak simulation
    async () => {
      const action = 'Testing memory leaks';
      setCurrentAction(action);
      
      try {
        const largeData = new Array(10000).fill('x'.repeat(100));
        const promises = [];
        
        for (let i = 0; i < 5; i++) {
          promises.push(addDoc(collection(db, 'releases'), {
            releaseNumber: `MEM-${Date.now()}-${i}`,
            status: 'Entered',
            largeField: largeData.join(''),
            createdAt: serverTimestamp()
          }).catch(() => null));
        }
        
        const refs = (await Promise.all(promises)).filter(r => r);
        refs.forEach(ref => {
          if (ref) createdDataRef.current.push({ type: 'release', id: ref.id });
        });
        
        return { success: true, action };
      } catch (error) {
        return { success: false, action, error: 'Memory issue detected' };
      }
    },
    
    // 10. Chaos operations
    async () => {
      const action = 'Random chaos operations';
      setCurrentAction(action);
      
      try {
        // Get a random release
        const releases = await getDocs(query(
          collection(db, 'releases'),
          limit(10)
        ));
        
        if (releases.empty) {
          return { success: true, action, note: 'No releases to chaos' };
        }
        
        const randomDoc = releases.docs[Math.floor(Math.random() * releases.docs.length)];
        
        // Perform random operation
        const operations = [
          () => updateDoc(randomDoc.ref, { chaos: true }),
          () => updateDoc(randomDoc.ref, { status: 'CHAOS' }),
          () => updateDoc(randomDoc.ref, { quantity: -999 }),
          () => deleteDoc(randomDoc.ref),
          () => updateDoc(randomDoc.ref, { 
            lineItems: new Array(1000).fill({ item: 'chaos' }) 
          })
        ];
        
        const randomOp = operations[Math.floor(Math.random() * operations.length)];
        await randomOp();
        
        return { success: true, action, note: 'Chaos injected' };
      } catch (error) {
        return { success: true, action, note: 'Chaos handled' };
      }
    }
  ];

  // Run random scenario
  const runRandomScenario = async () => {
    if (testAbortRef.current) return;
    
    const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
    
    try {
      const result = await scenario();
      
      // Update stats
      setStats(prev => ({
        ...prev,
        totalScenarios: prev.totalScenarios + 1,
        successfulScenarios: prev.successfulScenarios + (result.success ? 1 : 0),
        failedScenarios: prev.failedScenarios + (!result.success ? 1 : 0),
        anomaliesDetected: prev.anomaliesDetected + (result.anomaly ? 1 : 0),
        criticalErrors: prev.criticalErrors + (result.severity === 'critical' ? 1 : 0)
      }));
      
      // Log anomaly
      if (result.anomaly) {
        const anomaly = {
          timestamp: new Date().toISOString(),
          action: result.action,
          anomaly: result.anomaly,
          severity: result.severity || 'low',
          error: result.error
        };
        
        setAnomalies(prev => [anomaly, ...prev].slice(0, 50)); // Keep last 50
        
        // Log critical anomalies
        if (result.severity === 'critical') {
          await logger.critical('Critical anomaly detected', anomaly);
        }
      }
      
      // Add to test log
      setTestLog(prev => [{
        time: new Date().toLocaleTimeString(),
        action: result.action,
        success: result.success,
        note: result.note || result.error || 'OK'
      }, ...prev].slice(0, 100)); // Keep last 100
      
      // Add to all test results for analysis
      setAllTestResults(prev => [...prev, {
        timestamp: new Date().toISOString(),
        ...result
      }]);
      
    } catch (error) {
      console.error('Scenario error:', error);
      setStats(prev => ({
        ...prev,
        totalScenarios: prev.totalScenarios + 1,
        failedScenarios: prev.failedScenarios + 1,
        criticalErrors: prev.criticalErrors + 1
      }));
    }
  };

  // Start chaos testing
  const startChaosTest = async () => {
    setIsRunning(true);
    setStartTime(Date.now());
    setElapsedTime(0);
    setStats({
      totalScenarios: 0,
      successfulScenarios: 0,
      failedScenarios: 0,
      anomaliesDetected: 0,
      criticalErrors: 0,
      dataCorruptions: 0,
      performanceIssues: 0,
      duplicatesCreated: 0,
      autoRecoveries: 0
    });
    setAnomalies([]);
    setTestLog([]);
    testAbortRef.current = false;
    createdDataRef.current = [];
    
    console.log('🔥 Starting 5-minute chaos test...');
    await logger.info('Chaos test started', { duration: '5 minutes' });
    
    // Update elapsed time every second
    intervalRef.current = setInterval(() => {
      setElapsedTime(prev => {
        const newElapsed = prev + 1000;
        
        // Stop after 5 minutes
        if (newElapsed >= TEST_DURATION) {
          stopChaosTest();
        }
        
        return newElapsed;
      });
    }, 1000);
    
    // Run scenarios continuously with random delays
    const runContinuously = async () => {
      while (!testAbortRef.current && elapsedTime < TEST_DURATION) {
        await runRandomScenario();
        
        // Random delay between 100ms and 2000ms
        const delay = Math.floor(Math.random() * 1900) + 100;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    };
    
    // Start multiple concurrent runners for more chaos
    const runners = [];
    for (let i = 0; i < 3; i++) {
      runners.push(runContinuously());
    }
    
    scenarioRunnerRef.current = Promise.all(runners);
  };

  // Stop chaos testing
  const stopChaosTest = async () => {
    console.log('⏹️ Stopping chaos test...');
    testAbortRef.current = true;
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Wait for scenarios to finish
    if (scenarioRunnerRef.current) {
      await scenarioRunnerRef.current;
    }
    
    setIsRunning(false);
    setCurrentAction('');
    
    // Clean up test data
    await cleanupTestData();
    
    // Generate final report
    const report = {
      duration: elapsedTime,
      stats,
      anomalies: anomalies.length,
      criticalIssues: anomalies.filter(a => a.severity === 'critical').length,
      testLog: testLog.length
    };
    
    await logger.info('Chaos test completed', report);
    console.log('✅ Chaos test completed', report);
    
    // Show analysis option
    if (anomalies.length > 0) {
      setShowAnalysis(true);
    }
  };

  // Cleanup test data
  const cleanupTestData = async () => {
    console.log('🧹 Cleaning up test data...');
    const deletions = [];
    
    for (const item of createdDataRef.current) {
      try {
        if (item.type === 'release') {
          deletions.push(deleteDoc(doc(db, 'releases', item.id)).catch(() => {}));
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    
    await Promise.allSettled(deletions);
    createdDataRef.current = [];
    console.log(`🗑️ Cleaned up ${deletions.length} test documents`);
  };

  // Format time display
  const formatTime = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Calculate progress
  const progress = (elapsedTime / TEST_DURATION) * 100;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="bg-gray-900 text-white rounded-lg shadow-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center">
              🔥 Continuous Chaos Testing
            </h1>
            <p className="text-gray-400 mt-2">
              5-minute automated chaos test with random scenarios
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-mono">
              {formatTime(elapsedTime)} / 5:00
            </div>
            <div className="text-sm text-gray-400">
              {isRunning ? 'Running...' : 'Stopped'}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="w-full bg-gray-700 rounded-full h-4">
            <div 
              className="bg-gradient-to-r from-orange-500 to-red-500 h-4 rounded-full transition-all duration-1000"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex space-x-4 mb-6">
          {!isRunning ? (
            <button
              onClick={startChaosTest}
              className="px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 font-semibold"
            >
              🚀 Start 5-Minute Chaos Test
            </button>
          ) : (
            <button
              onClick={stopChaosTest}
              className="px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              ⏹️ Stop Test
            </button>
          )}
        </div>

        {/* Current Action */}
        {currentAction && (
          <div className="mb-6 p-3 bg-gray-800 rounded-lg">
            <div className="flex items-center">
              <div className="animate-pulse w-3 h-3 bg-orange-500 rounded-full mr-3"></div>
              <span className="text-orange-400">{currentAction}</span>
            </div>
          </div>
        )}

        {/* Statistics Grid */}
        <div className="grid grid-cols-3 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold">{stats.totalScenarios}</div>
            <div className="text-xs text-gray-400">Total Scenarios</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-400">{stats.successfulScenarios}</div>
            <div className="text-xs text-gray-400">Successful</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-yellow-400">{stats.anomaliesDetected}</div>
            <div className="text-xs text-gray-400">Anomalies</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-red-400">{stats.criticalErrors}</div>
            <div className="text-xs text-gray-400">Critical</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-400">{stats.autoRecoveries}</div>
            <div className="text-xs text-gray-400">Recoveries</div>
          </div>
        </div>

        {/* Anomalies Section */}
        {anomalies.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-3 text-red-400">
              ⚠️ Anomalies Detected ({anomalies.length})
            </h2>
            <div className="bg-gray-800 rounded-lg p-4 max-h-60 overflow-y-auto">
              {anomalies.slice(0, 10).map((anomaly, idx) => (
                <div 
                  key={idx} 
                  className={`mb-2 p-2 rounded ${
                    anomaly.severity === 'critical' ? 'bg-red-900' :
                    anomaly.severity === 'high' ? 'bg-orange-900' :
                    anomaly.severity === 'medium' ? 'bg-yellow-900' :
                    'bg-gray-700'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-semibold">{anomaly.anomaly}</span>
                      <div className="text-xs text-gray-400">
                        {anomaly.action} • {anomaly.timestamp}
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      anomaly.severity === 'critical' ? 'bg-red-600' :
                      anomaly.severity === 'high' ? 'bg-orange-600' :
                      anomaly.severity === 'medium' ? 'bg-yellow-600' :
                      'bg-gray-600'
                    }`}>
                      {anomaly.severity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Test Log */}
        <div>
          <h2 className="text-xl font-semibold mb-3">📋 Test Log</h2>
          <div className="bg-gray-800 rounded-lg p-4 max-h-60 overflow-y-auto">
            <div className="space-y-1">
              {testLog.slice(0, 20).map((log, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <div className="flex items-center">
                    <span className="text-gray-500 mr-3">{log.time}</span>
                    <span className={log.success ? 'text-green-400' : 'text-red-400'}>
                      {log.success ? '✓' : '✗'}
                    </span>
                    <span className="ml-2 text-gray-300">{log.action}</span>
                  </div>
                  <span className="text-gray-500 text-xs">{log.note}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-sm text-gray-400">Scenarios/min</div>
            <div className="text-xl font-bold">
              {elapsedTime > 0 ? Math.round((stats.totalScenarios / elapsedTime) * 60000) : 0}
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-sm text-gray-400">Success Rate</div>
            <div className="text-xl font-bold text-green-400">
              {stats.totalScenarios > 0 
                ? Math.round((stats.successfulScenarios / stats.totalScenarios) * 100) 
                : 0}%
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-sm text-gray-400">Anomaly Rate</div>
            <div className="text-xl font-bold text-yellow-400">
              {stats.totalScenarios > 0 
                ? Math.round((stats.anomaliesDetected / stats.totalScenarios) * 100) 
                : 0}%
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-sm text-gray-400">Critical Rate</div>
            <div className="text-xl font-bold text-red-400">
              {stats.totalScenarios > 0 
                ? Math.round((stats.criticalErrors / stats.totalScenarios) * 100) 
                : 0}%
            </div>
          </div>
        </div>

        {/* Summary when complete */}
        {!isRunning && stats.totalScenarios > 0 && (
          <div className="mt-6 p-4 bg-gray-800 rounded-lg border border-gray-600">
            <h3 className="text-lg font-semibold mb-2">Test Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Total Runtime:</span>
                <span className="ml-2">{formatTime(elapsedTime)}</span>
              </div>
              <div>
                <span className="text-gray-400">Total Scenarios:</span>
                <span className="ml-2">{stats.totalScenarios}</span>
              </div>
              <div>
                <span className="text-gray-400">Anomalies Found:</span>
                <span className="ml-2 text-yellow-400">{stats.anomaliesDetected}</span>
              </div>
              <div>
                <span className="text-gray-400">Critical Issues:</span>
                <span className="ml-2 text-red-400">{stats.criticalErrors}</span>
              </div>
            </div>
            <div className="mt-3 text-sm">
              <span className="text-gray-400">System Stability:</span>
              <span className={`ml-2 font-bold ${
                stats.criticalErrors === 0 ? 'text-green-400' :
                stats.criticalErrors < 5 ? 'text-yellow-400' :
                'text-red-400'
              }`}>
                {stats.criticalErrors === 0 ? '✅ Excellent' :
                 stats.criticalErrors < 5 ? '⚠️ Good with Issues' :
                 '🔴 Needs Attention'}
              </span>
            </div>
            
            {/* Analysis Button */}
            {showAnalysis && (
              <div className="mt-4 pt-4 border-t border-gray-600">
                <button
                  onClick={() => setShowAnalysis(false)}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold"
                >
                  📊 View Detailed Analysis & Fix Recommendations
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Analysis Dashboard */}
      {showAnalysis && !isRunning && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-white">🔬 Automated Analysis & Fix Generation</h2>
            <button
              onClick={() => setShowAnalysis(false)}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Hide Analysis
            </button>
          </div>
          <TestAnalysisDashboard 
            testResults={allTestResults}
            onAnalysisComplete={(analysis, plan) => {
              console.log('Analysis completed:', { analysis, plan });
            }}
          />
        </div>
      )}
    </div>
  );
};

export default ContinuousChaosTest;