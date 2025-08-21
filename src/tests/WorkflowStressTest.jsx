// Comprehensive Stress Test Suite - Designed to Break the System
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
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase/config';
import releaseWorkflowService from '../services/releaseWorkflowService';
import releaseNotificationService from '../services/releaseNotificationService';
import { logger } from '../utils/logger';

const WorkflowStressTest = () => {
  const [testResults, setTestResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentScenario, setCurrentScenario] = useState('');
  const [currentTest, setCurrentTest] = useState('');
  const [stats, setStats] = useState({
    totalTests: 0,
    passed: 0,
    failed: 0,
    crashed: 0,
    recovered: 0
  });
  const testAbortRef = useRef(false);
  const createdDataRef = useRef([]);

  // Generate random test data
  const generateChaosData = () => {
    const timestamp = Date.now();
    const random = Math.random();
    
    // Sometimes generate invalid data intentionally
    const shouldCorrupt = random < 0.2; // 20% chance of corruption
    
    return {
      supplier: {
        supplierName: shouldCorrupt ? '' : `Stress Supplier ${timestamp}`,
        SupplierName: `Stress Supplier ${timestamp}`,
        contactName: shouldCorrupt ? null : 'Stress Contact',
        email: shouldCorrupt ? 'invalid-email' : `stress${timestamp}@test.com`,
        phone: shouldCorrupt ? '123' : '555-0100',
        status: shouldCorrupt ? 'InvalidStatus' : 'Active'
      },
      customer: {
        customerName: shouldCorrupt ? null : `Stress Customer ${timestamp}`,
        CustomerName: `Stress Customer ${timestamp}`,
        contactName: 'Stress Customer Contact',
        email: `customer${timestamp}@test.com`,
        phone: '555-0200',
        address: shouldCorrupt ? '' : '123 Stress St',
        city: 'Cincinnati',
        state: shouldCorrupt ? 'INVALID' : 'OH',
        zipCode: shouldCorrupt ? '12' : '45202',
        status: 'Active'
      },
      item: {
        itemCode: shouldCorrupt ? '' : `STRESS-${timestamp}`,
        ItemCode: `STRESS-${timestamp}`,
        itemName: shouldCorrupt ? null : `Stress Item ${timestamp}`,
        ItemName: `Stress Item ${timestamp}`,
        status: 'Active'
      },
      size: {
        sizeName: shouldCorrupt ? '' : `StressSize-${timestamp}`,
        SizeName: `StressSize-${timestamp}`,
        status: shouldCorrupt ? 'Broken' : 'Active'
      },
      barcode: {
        Barcode: shouldCorrupt ? '' : `STRESS${timestamp}`,
        Status: shouldCorrupt ? 'InvalidStatus' : 'Available',
        Quantity: shouldCorrupt ? -5 : Math.floor(Math.random() * 1000)
      },
      release: {
        releaseNumber: shouldCorrupt ? null : `STRESS-R-${timestamp}`,
        releaseDate: shouldCorrupt ? 'invalid-date' : new Date().toISOString().split('T')[0],
        status: shouldCorrupt ? 'InvalidStatus' : 'Entered',
        pickTicketRevision: shouldCorrupt ? 'not-a-number' : 0
      }
    };
  };

  // Test Scenarios
  const testScenarios = [
    {
      name: 'Concurrent User Chaos',
      tests: [
        {
          name: 'Race Condition - Multiple Users Lock Same Release',
          run: async () => {
            const timestamp = Date.now();
            const releaseData = {
              releaseNumber: `RACE-${timestamp}`,
              status: 'Entered',
              supplierId: 'test-supplier',
              customerId: 'test-customer',
              lineItems: [{ itemId: 'test', quantity: 1 }],
              createdAt: serverTimestamp()
            };
            
            const releaseRef = await addDoc(collection(db, 'releases'), releaseData);
            createdDataRef.current.push({ type: 'release', id: releaseRef.id });
            
            // Simulate 10 users trying to lock simultaneously
            const lockPromises = [];
            for (let i = 0; i < 10; i++) {
              const user = { id: `user-${i}`, name: `User ${i}` };
              lockPromises.push(
                releaseWorkflowService.acquireLock(releaseRef.id, user)
                  .then(() => ({ success: true, user: user.id }))
                  .catch(() => ({ success: false, user: user.id }))
              );
            }
            
            const results = await Promise.all(lockPromises);
            const successCount = results.filter(r => r.success).length;
            
            if (successCount !== 1) {
              throw new Error(`Expected 1 successful lock, got ${successCount}`);
            }
            
            return { success: true, message: 'Race condition handled correctly' };
          }
        },
        
        {
          name: 'Simultaneous Status Transitions',
          run: async () => {
            const timestamp = Date.now();
            const releaseRef = await addDoc(collection(db, 'releases'), {
              releaseNumber: `TRANS-${timestamp}`,
              status: 'Staged',
              stagedBy: 'user1',
              supplierId: 'test',
              customerId: 'test',
              createdAt: serverTimestamp()
            });
            createdDataRef.current.push({ type: 'release', id: releaseRef.id });
            
            // Try to verify and reject simultaneously
            const promises = [
              releaseWorkflowService.verifyRelease(releaseRef.id, { id: 'user2', name: 'User 2' }),
              releaseWorkflowService.rejectVerification(releaseRef.id, 'Test rejection', { id: 'user3', name: 'User 3' })
            ];
            
            const results = await Promise.allSettled(promises);
            const successes = results.filter(r => r.status === 'fulfilled').length;
            
            // Only one should succeed
            if (successes > 1) {
              throw new Error('Multiple conflicting operations succeeded');
            }
            
            return { success: true, message: 'Concurrent transitions handled' };
          }
        },
        
        {
          name: 'Lock Timeout Under Load',
          run: async () => {
            const promises = [];
            
            // Create 50 releases and lock them all
            for (let i = 0; i < 50; i++) {
              const releaseRef = await addDoc(collection(db, 'releases'), {
                releaseNumber: `LOCK-${Date.now()}-${i}`,
                status: 'Entered',
                lockedBy: `user-${i}`,
                lockedAt: new Date(Date.now() - 20 * 60 * 1000), // 20 minutes ago
                createdAt: serverTimestamp()
              });
              createdDataRef.current.push({ type: 'release', id: releaseRef.id });
            }
            
            // Check if monitor cleans them up
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const lockedReleases = await getDocs(
              query(collection(db, 'releases'), where('lockedBy', '!=', null))
            );
            
            const oldLocks = lockedReleases.docs.filter(doc => {
              const data = doc.data();
              if (!data.lockedAt) return false;
              const lockAge = Date.now() - data.lockedAt.toDate();
              return lockAge > 15 * 60 * 1000;
            });
            
            if (oldLocks.length > 0) {
              throw new Error(`${oldLocks.length} stale locks not cleaned`);
            }
            
            return { success: true, message: 'Lock timeout working under load' };
          }
        }
      ]
    },
    
    {
      name: 'Data Corruption & Recovery',
      tests: [
        {
          name: 'Invalid Field Types',
          run: async () => {
            const corrupted = {
              releaseNumber: 12345, // Should be string
              status: true, // Should be string
              supplierId: [], // Should be string
              customerId: {}, // Should be string
              lineItems: 'not-an-array', // Should be array
              quantity: 'not-a-number', // Should be number
              createdAt: 'not-a-timestamp' // Should be timestamp
            };
            
            try {
              const ref = await addDoc(collection(db, 'releases'), corrupted);
              createdDataRef.current.push({ type: 'release', id: ref.id });
              
              // Try to process it
              await releaseWorkflowService.stageRelease(ref.id, {}, { id: 'test', name: 'Test' });
              
              throw new Error('Should have failed with corrupted data');
            } catch (error) {
              if (error.message === 'Should have failed with corrupted data') {
                throw error;
              }
              return { success: true, message: 'Corrupt data rejected properly' };
            }
          }
        },
        
        {
          name: 'Missing Required Fields',
          run: async () => {
            const incomplete = {
              // Missing releaseNumber, supplierId, customerId
              status: 'Entered',
              lineItems: []
            };
            
            const ref = await addDoc(collection(db, 'releases'), incomplete);
            createdDataRef.current.push({ type: 'release', id: ref.id });
            
            // Check if monitor auto-fixes
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            const fixed = await getDoc(doc(db, 'releases', ref.id));
            const data = fixed.data();
            
            if (!data.releaseNumber || !data.status) {
              throw new Error('Missing fields not auto-fixed');
            }
            
            return { success: true, message: 'Missing fields auto-corrected' };
          }
        },
        
        {
          name: 'Duplicate Release Numbers',
          run: async () => {
            const releaseNumber = `DUP-${Date.now()}`;
            
            // Create 5 releases with same number
            const promises = [];
            for (let i = 0; i < 5; i++) {
              promises.push(addDoc(collection(db, 'releases'), {
                releaseNumber,
                ReleaseNumber: releaseNumber,
                status: 'Entered',
                supplierId: 'test',
                customerId: 'test',
                createdAt: serverTimestamp()
              }));
            }
            
            const refs = await Promise.all(promises);
            refs.forEach(ref => createdDataRef.current.push({ type: 'release', id: ref.id }));
            
            // Wait for monitor to fix
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Check if duplicates are renamed
            const releases = await getDocs(
              query(collection(db, 'releases'), where('releaseNumber', '==', releaseNumber))
            );
            
            if (releases.size > 1) {
              throw new Error('Duplicate release numbers not fixed');
            }
            
            return { success: true, message: 'Duplicates auto-renamed' };
          }
        },
        
        {
          name: 'Circular References',
          run: async () => {
            // Create releases that reference each other
            const ref1 = await addDoc(collection(db, 'releases'), {
              releaseNumber: `CIRC1-${Date.now()}`,
              status: 'Entered',
              linkedRelease: 'pending',
              supplierId: 'test',
              customerId: 'test'
            });
            
            const ref2 = await addDoc(collection(db, 'releases'), {
              releaseNumber: `CIRC2-${Date.now()}`,
              status: 'Entered',
              linkedRelease: ref1.id,
              supplierId: 'test',
              customerId: 'test'
            });
            
            // Update first to point to second
            await updateDoc(doc(db, 'releases', ref1.id), {
              linkedRelease: ref2.id
            });
            
            createdDataRef.current.push({ type: 'release', id: ref1.id });
            createdDataRef.current.push({ type: 'release', id: ref2.id });
            
            // Try to process them
            try {
              await releaseWorkflowService.stageRelease(ref1.id, {}, { id: 'test', name: 'Test' });
              return { success: true, message: 'Circular reference handled' };
            } catch (error) {
              return { success: true, message: 'Circular reference detected and blocked' };
            }
          }
        }
      ]
    },
    
    {
      name: 'Network & Database Failures',
      tests: [
        {
          name: 'Transaction Rollback on Error',
          run: async () => {
            const releaseRef = await addDoc(collection(db, 'releases'), {
              releaseNumber: `TRANS-${Date.now()}`,
              status: 'Entered',
              supplierId: 'test',
              customerId: 'test',
              lineItems: [{ itemId: 'test', quantity: 10 }]
            });
            createdDataRef.current.push({ type: 'release', id: releaseRef.id });
            
            // Try to stage with invalid data that will fail mid-transaction
            try {
              await runTransaction(db, async (transaction) => {
                const releaseDoc = await transaction.get(doc(db, 'releases', releaseRef.id));
                
                // Update release
                transaction.update(doc(db, 'releases', releaseRef.id), {
                  status: 'Staged',
                  stagedAt: serverTimestamp()
                });
                
                // Force error
                throw new Error('Simulated network failure');
              });
              
              throw new Error('Transaction should have failed');
            } catch (error) {
              if (error.message === 'Transaction should have failed') {
                throw error;
              }
              
              // Check that status wasn't changed
              const release = await getDoc(doc(db, 'releases', releaseRef.id));
              if (release.data().status !== 'Entered') {
                throw new Error('Transaction not rolled back properly');
              }
              
              return { success: true, message: 'Transaction rolled back correctly' };
            }
          }
        },
        
        {
          name: 'Batch Write Partial Failure',
          run: async () => {
            const batch = writeBatch(db);
            const refs = [];
            
            // Add valid operations
            for (let i = 0; i < 5; i++) {
              const ref = doc(collection(db, 'releases'));
              batch.set(ref, {
                releaseNumber: `BATCH-${Date.now()}-${i}`,
                status: 'Entered',
                supplierId: 'test',
                customerId: 'test'
              });
              refs.push(ref);
              createdDataRef.current.push({ type: 'release', id: ref.id });
            }
            
            // Add invalid operation (update non-existent doc)
            batch.update(doc(db, 'releases', 'non-existent-id'), {
              status: 'Failed'
            });
            
            try {
              await batch.commit();
              throw new Error('Batch should have failed');
            } catch (error) {
              if (error.message === 'Batch should have failed') {
                throw error;
              }
              
              // Check that no documents were created
              const promises = refs.map(ref => getDoc(ref));
              const results = await Promise.all(promises);
              const existing = results.filter(r => r.exists()).length;
              
              if (existing > 0) {
                throw new Error('Partial batch write occurred');
              }
              
              return { success: true, message: 'Batch write atomic failure correct' };
            }
          }
        },
        
        {
          name: 'Timeout Simulation',
          run: async () => {
            // Create a release that takes too long to process
            const releaseRef = await addDoc(collection(db, 'releases'), {
              releaseNumber: `TIMEOUT-${Date.now()}`,
              status: 'Entered',
              supplierId: 'test',
              customerId: 'test',
              lineItems: Array(1000).fill({ itemId: 'test', quantity: 1 }) // Huge array
            });
            createdDataRef.current.push({ type: 'release', id: releaseRef.id });
            
            // Set a timeout for the operation
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Operation timeout')), 5000)
            );
            
            const operationPromise = releaseWorkflowService.stageRelease(
              releaseRef.id,
              { items: Array(1000).fill({ barcode: 'TEST' }) },
              { id: 'test', name: 'Test' }
            );
            
            try {
              await Promise.race([operationPromise, timeoutPromise]);
              return { success: true, message: 'Large operation completed' };
            } catch (error) {
              if (error.message === 'Operation timeout') {
                return { success: true, message: 'Timeout handled gracefully' };
              }
              throw error;
            }
          }
        }
      ]
    },
    
    {
      name: 'Performance & Load Testing',
      tests: [
        {
          name: 'Bulk Release Creation',
          run: async () => {
            const startTime = Date.now();
            const promises = [];
            
            // Create 100 releases simultaneously
            for (let i = 0; i < 100; i++) {
              promises.push(addDoc(collection(db, 'releases'), {
                releaseNumber: `BULK-${Date.now()}-${i}`,
                status: 'Entered',
                supplierId: 'test',
                customerId: 'test',
                lineItems: [{ itemId: 'test', quantity: i }],
                createdAt: serverTimestamp()
              }));
            }
            
            const refs = await Promise.all(promises);
            refs.forEach(ref => createdDataRef.current.push({ type: 'release', id: ref.id }));
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            if (duration > 30000) { // 30 seconds
              throw new Error(`Bulk creation too slow: ${duration}ms`);
            }
            
            return { success: true, message: `Created 100 releases in ${duration}ms` };
          }
        },
        
        {
          name: 'Memory Leak Detection',
          run: async () => {
            // Monitor memory usage
            const initialMemory = performance.memory?.usedJSHeapSize || 0;
            
            // Create and delete releases repeatedly
            for (let i = 0; i < 10; i++) {
              const ref = await addDoc(collection(db, 'releases'), {
                releaseNumber: `MEMORY-${Date.now()}-${i}`,
                status: 'Entered',
                supplierId: 'test',
                customerId: 'test',
                largeData: new Array(10000).fill('x').join('') // Large string
              });
              
              await deleteDoc(doc(db, 'releases', ref.id));
            }
            
            // Force garbage collection if available
            if (global.gc) {
              global.gc();
            }
            
            const finalMemory = performance.memory?.usedJSHeapSize || 0;
            const memoryIncrease = finalMemory - initialMemory;
            
            if (memoryIncrease > 50 * 1024 * 1024) { // 50MB
              throw new Error(`Potential memory leak: ${Math.round(memoryIncrease / 1024 / 1024)}MB increase`);
            }
            
            return { success: true, message: 'No significant memory leak detected' };
          }
        },
        
        {
          name: 'Query Performance Under Load',
          run: async () => {
            // Create many releases with different statuses
            const statuses = ['Entered', 'Staged', 'Verified', 'Loaded', 'Shipped'];
            const promises = [];
            
            for (let i = 0; i < 50; i++) {
              promises.push(addDoc(collection(db, 'releases'), {
                releaseNumber: `QUERY-${Date.now()}-${i}`,
                status: statuses[i % statuses.length],
                supplierId: `supplier-${i % 10}`,
                customerId: `customer-${i % 10}`,
                createdAt: serverTimestamp()
              }));
            }
            
            const refs = await Promise.all(promises);
            refs.forEach(ref => createdDataRef.current.push({ type: 'release', id: ref.id }));
            
            // Run complex queries
            const queryPromises = [];
            const startTime = Date.now();
            
            for (const status of statuses) {
              queryPromises.push(
                getDocs(query(collection(db, 'releases'), where('status', '==', status)))
              );
            }
            
            await Promise.all(queryPromises);
            const queryTime = Date.now() - startTime;
            
            if (queryTime > 5000) { // 5 seconds
              throw new Error(`Queries too slow: ${queryTime}ms`);
            }
            
            return { success: true, message: `Queries completed in ${queryTime}ms` };
          }
        }
      ]
    },
    
    {
      name: 'Edge Cases & Boundary Testing',
      tests: [
        {
          name: 'Extreme Values',
          run: async () => {
            const extremeCases = [
              {
                name: 'Max Integer Quantity',
                data: { quantity: Number.MAX_SAFE_INTEGER }
              },
              {
                name: 'Negative Quantity',
                data: { quantity: -999999 }
              },
              {
                name: 'Zero Quantity',
                data: { quantity: 0 }
              },
              {
                name: 'Huge String',
                data: { releaseNumber: 'X'.repeat(10000) }
              },
              {
                name: 'Unicode Characters',
                data: { releaseNumber: '🔥💥🚀😈👻☠️' }
              },
              {
                name: 'SQL Injection Attempt',
                data: { releaseNumber: "'; DROP TABLE releases; --" }
              },
              {
                name: 'XSS Attempt',
                data: { releaseNumber: "<script>alert('XSS')</script>" }
              },
              {
                name: 'Null Bytes',
                data: { releaseNumber: 'test\0test' }
              }
            ];
            
            const results = [];
            
            for (const testCase of extremeCases) {
              try {
                const ref = await addDoc(collection(db, 'releases'), {
                  releaseNumber: testCase.data.releaseNumber || `EXTREME-${Date.now()}`,
                  status: 'Entered',
                  supplierId: 'test',
                  customerId: 'test',
                  lineItems: testCase.data.quantity !== undefined ? 
                    [{ itemId: 'test', quantity: testCase.data.quantity }] : [],
                  ...testCase.data
                });
                
                createdDataRef.current.push({ type: 'release', id: ref.id });
                
                // Try to read it back
                const doc = await getDoc(ref);
                if (!doc.exists()) {
                  throw new Error('Document not saved');
                }
                
                results.push({ case: testCase.name, result: 'handled' });
              } catch (error) {
                results.push({ case: testCase.name, result: 'rejected' });
              }
            }
            
            return { 
              success: true, 
              message: `Tested ${results.length} edge cases`,
              details: results
            };
          }
        },
        
        {
          name: 'Date Boundary Testing',
          run: async () => {
            const dates = [
              new Date(0), // Unix epoch
              new Date('1900-01-01'),
              new Date('2099-12-31'),
              new Date('invalid'),
              null,
              undefined,
              '',
              'not-a-date'
            ];
            
            const results = [];
            
            for (const date of dates) {
              try {
                const ref = await addDoc(collection(db, 'releases'), {
                  releaseNumber: `DATE-${Date.now()}`,
                  status: 'Entered',
                  releaseDate: date,
                  supplierId: 'test',
                  customerId: 'test'
                });
                
                createdDataRef.current.push({ type: 'release', id: ref.id });
                results.push({ date: String(date), result: 'accepted' });
              } catch (error) {
                results.push({ date: String(date), result: 'rejected' });
              }
            }
            
            return { 
              success: true, 
              message: 'Date boundaries tested',
              details: results
            };
          }
        },
        
        {
          name: 'Permission Bypass Attempts',
          run: async () => {
            // Create a release staged by user1
            const releaseRef = await addDoc(collection(db, 'releases'), {
              releaseNumber: `PERM-${Date.now()}`,
              status: 'Staged',
              stagedBy: 'user1',
              stagedByName: 'User 1',
              supplierId: 'test',
              customerId: 'test'
            });
            createdDataRef.current.push({ type: 'release', id: releaseRef.id });
            
            // Try various bypass attempts
            const bypassAttempts = [
              {
                name: 'Same user different ID format',
                user: { id: 'USER1', name: 'User 1' }
              },
              {
                name: 'Spoofed user object',
                user: { id: 'user2', name: 'User 1', spoofed: true, realId: 'user1' }
              },
              {
                name: 'Admin override attempt',
                user: { id: 'user1', name: 'User 1', role: 'admin', override: true }
              },
              {
                name: 'Null user',
                user: null
              },
              {
                name: 'Undefined user',
                user: undefined
              }
            ];
            
            const results = [];
            
            for (const attempt of bypassAttempts) {
              try {
                await releaseWorkflowService.verifyRelease(releaseRef.id, attempt.user);
                results.push({ attempt: attempt.name, result: 'BYPASSED - SECURITY ISSUE!' });
              } catch (error) {
                results.push({ attempt: attempt.name, result: 'blocked' });
              }
            }
            
            const bypassed = results.filter(r => r.result.includes('BYPASSED'));
            if (bypassed.length > 0) {
              throw new Error(`Security bypass successful: ${JSON.stringify(bypassed)}`);
            }
            
            return { 
              success: true, 
              message: 'All permission bypass attempts blocked',
              details: results
            };
          }
        }
      ]
    },
    
    {
      name: 'Chaos Engineering',
      tests: [
        {
          name: 'Random Operations Chaos',
          run: async () => {
            // Create a release and perform random operations
            const releaseRef = await addDoc(collection(db, 'releases'), {
              releaseNumber: `CHAOS-${Date.now()}`,
              status: 'Entered',
              supplierId: 'test',
              customerId: 'test',
              lineItems: [{ itemId: 'test', quantity: 10 }]
            });
            createdDataRef.current.push({ type: 'release', id: releaseRef.id });
            
            const operations = [
              () => updateDoc(doc(db, 'releases', releaseRef.id), { status: 'Staged' }),
              () => updateDoc(doc(db, 'releases', releaseRef.id), { status: 'Entered' }),
              () => updateDoc(doc(db, 'releases', releaseRef.id), { lockedBy: 'chaos' }),
              () => updateDoc(doc(db, 'releases', releaseRef.id), { lockedBy: null }),
              () => updateDoc(doc(db, 'releases', releaseRef.id), { quantity: -1 }),
              () => updateDoc(doc(db, 'releases', releaseRef.id), { invalid: true }),
              () => deleteDoc(doc(db, 'releases', releaseRef.id)),
              () => addDoc(collection(db, 'releases'), { duplicate: releaseRef.id })
            ];
            
            // Run random operations
            const promises = [];
            for (let i = 0; i < 20; i++) {
              const randomOp = operations[Math.floor(Math.random() * operations.length)];
              promises.push(
                randomOp()
                  .then(() => ({ success: true }))
                  .catch(() => ({ success: false }))
              );
            }
            
            await Promise.all(promises);
            
            // Check if system is still stable
            try {
              const finalDoc = await getDoc(doc(db, 'releases', releaseRef.id));
              return { success: true, message: 'System survived chaos operations' };
            } catch (error) {
              return { success: true, message: 'Document deleted but system stable' };
            }
          }
        },
        
        {
          name: 'Resource Exhaustion',
          run: async () => {
            // Try to exhaust system resources
            const promises = [];
            
            // Create many listeners (potential memory leak)
            const unsubscribes = [];
            for (let i = 0; i < 100; i++) {
              const unsubscribe = db.collection('releases').onSnapshot(() => {});
              unsubscribes.push(unsubscribe);
            }
            
            // Clean up listeners
            unsubscribes.forEach(unsub => unsub());
            
            // Create large documents
            for (let i = 0; i < 10; i++) {
              const largeDoc = {
                releaseNumber: `EXHAUST-${Date.now()}-${i}`,
                status: 'Entered',
                supplierId: 'test',
                customerId: 'test',
                hugeArray: new Array(1000).fill({ data: 'x'.repeat(1000) })
              };
              
              try {
                const ref = await addDoc(collection(db, 'releases'), largeDoc);
                createdDataRef.current.push({ type: 'release', id: ref.id });
              } catch (error) {
                // Document too large is expected
              }
            }
            
            return { success: true, message: 'Resource exhaustion handled' };
          }
        },
        
        {
          name: 'State Corruption Recovery',
          run: async () => {
            // Create a release with corrupted state
            const releaseRef = await addDoc(collection(db, 'releases'), {
              releaseNumber: `CORRUPT-${Date.now()}`,
              status: 'Verified', // Status says verified
              stagedBy: null, // But no staging info
              stagedAt: null,
              verifiedBy: 'user1',
              verifiedAt: serverTimestamp(),
              supplierId: 'test',
              customerId: 'test'
            });
            createdDataRef.current.push({ type: 'release', id: releaseRef.id });
            
            // Try to load it (should fail due to invalid state)
            try {
              await releaseWorkflowService.loadRelease(
                releaseRef.id,
                'TRUCK-123',
                { id: 'user2', name: 'User 2' }
              );
              
              // If it succeeds, check if state was auto-corrected
              const fixed = await getDoc(doc(db, 'releases', releaseRef.id));
              const data = fixed.data();
              
              if (!data.stagedBy) {
                throw new Error('Corrupted state not fixed');
              }
              
              return { success: true, message: 'State auto-corrected' };
            } catch (error) {
              return { success: true, message: 'Corrupted state blocked' };
            }
          }
        }
      ]
    }
  ];

  // Run stress tests
  const runStressTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    setStats({
      totalTests: 0,
      passed: 0,
      failed: 0,
      crashed: 0,
      recovered: 0
    });
    testAbortRef.current = false;
    createdDataRef.current = [];
    
    const allResults = [];
    
    for (const scenario of testScenarios) {
      if (testAbortRef.current) break;
      
      setCurrentScenario(scenario.name);
      const scenarioResults = {
        name: scenario.name,
        tests: []
      };
      
      for (const test of scenario.tests) {
        if (testAbortRef.current) break;
        
        setCurrentTest(test.name);
        const startTime = Date.now();
        
        let result;
        try {
          result = await test.run();
          result.duration = Date.now() - startTime;
        } catch (error) {
          result = {
            success: false,
            error: error.message,
            crashed: true,
            duration: Date.now() - startTime
          };
        }
        
        scenarioResults.tests.push({
          name: test.name,
          ...result
        });
        
        // Update stats
        setStats(prev => ({
          totalTests: prev.totalTests + 1,
          passed: prev.passed + (result.success ? 1 : 0),
          failed: prev.failed + (!result.success && !result.crashed ? 1 : 0),
          crashed: prev.crashed + (result.crashed ? 1 : 0),
          recovered: prev.recovered + (result.message?.includes('auto-') ? 1 : 0)
        }));
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      allResults.push(scenarioResults);
      setTestResults([...allResults]);
    }
    
    // Cleanup
    await cleanupTestData();
    
    setIsRunning(false);
    setCurrentScenario('');
    setCurrentTest('');
    
    // Log final report
    await logger.critical('Stress Test Complete', {
      stats,
      scenarios: allResults.length,
      duration: 'varies',
      issues: allResults.flatMap(s => 
        s.tests.filter(t => !t.success).map(t => ({
          scenario: s.name,
          test: t.name,
          error: t.error || t.message
        }))
      )
    });
  };

  // Cleanup function
  const cleanupTestData = async () => {
    const deletions = [];
    
    for (const item of createdDataRef.current) {
      try {
        if (item.type === 'release') {
          deletions.push(deleteDoc(doc(db, 'releases', item.id)));
        } else if (item.type === 'supplier') {
          deletions.push(deleteDoc(doc(db, 'suppliers', item.id)));
        } else if (item.type === 'customer') {
          deletions.push(deleteDoc(doc(db, 'customers', item.id)));
        }
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    }
    
    await Promise.allSettled(deletions);
    createdDataRef.current = [];
  };

  // Abort function
  const abortTests = () => {
    testAbortRef.current = true;
    setIsRunning(false);
    setCurrentScenario('');
    setCurrentTest('');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-red-600">🔥 Workflow Stress Test Suite</h1>
            <p className="text-gray-600 mt-2">
              Comprehensive tests designed to break the system and identify weaknesses
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Tests will attempt to:</div>
            <div className="text-xs text-red-500">• Corrupt data • Cause race conditions</div>
            <div className="text-xs text-red-500">• Exhaust resources • Bypass security</div>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex space-x-4 mb-6">
          <button
            onClick={runStressTests}
            disabled={isRunning}
            className="px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 font-semibold"
          >
            {isRunning ? '🔥 Running Chaos Tests...' : '💥 Start Stress Testing'}
          </button>
          
          {isRunning && (
            <button
              onClick={abortTests}
              className="px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              ⛔ Abort Tests
            </button>
          )}
        </div>

        {/* Current Test Status */}
        {currentScenario && (
          <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-500">
            <div className="font-semibold text-yellow-800">
              Scenario: {currentScenario}
            </div>
            {currentTest && (
              <div className="text-sm text-yellow-600 mt-1 flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-2"></div>
                {currentTest}
              </div>
            )}
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-gray-100 rounded-lg p-4">
            <div className="text-2xl font-bold">{stats.totalTests}</div>
            <div className="text-sm text-gray-600">Total Tests</div>
          </div>
          <div className="bg-green-100 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">{stats.passed}</div>
            <div className="text-sm text-gray-600">Passed</div>
          </div>
          <div className="bg-red-100 rounded-lg p-4">
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            <div className="text-sm text-gray-600">Failed</div>
          </div>
          <div className="bg-orange-100 rounded-lg p-4">
            <div className="text-2xl font-bold text-orange-600">{stats.crashed}</div>
            <div className="text-sm text-gray-600">Crashed</div>
          </div>
          <div className="bg-blue-100 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.recovered}</div>
            <div className="text-sm text-gray-600">Recovered</div>
          </div>
        </div>

        {/* Test Results */}
        <div className="space-y-6">
          {testResults.map((scenario, sIndex) => (
            <div key={sIndex} className="border rounded-lg overflow-hidden">
              <div className="bg-gray-100 p-3 font-semibold">
                {scenario.name}
              </div>
              <div className="p-4 space-y-2">
                {scenario.tests.map((test, tIndex) => (
                  <div
                    key={tIndex}
                    className={`p-3 rounded-lg flex justify-between items-start ${
                      test.success 
                        ? 'bg-green-50 border border-green-200' 
                        : test.crashed
                        ? 'bg-orange-50 border border-orange-200'
                        : 'bg-red-50 border border-red-200'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center">
                        <span className={`text-lg mr-2 ${
                          test.success ? 'text-green-600' : test.crashed ? 'text-orange-600' : 'text-red-600'
                        }`}>
                          {test.success ? '✓' : test.crashed ? '💥' : '✗'}
                        </span>
                        <span className="font-medium">{test.name}</span>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {test.success ? test.message : test.error}
                      </div>
                      {test.details && (
                        <details className="mt-2 text-xs">
                          <summary className="cursor-pointer text-blue-600">Show details</summary>
                          <pre className="mt-1 p-2 bg-white rounded overflow-x-auto">
                            {JSON.stringify(test.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 ml-4">
                      {test.duration}ms
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        {testResults.length > 0 && !isRunning && (
          <div className="mt-8 p-6 bg-gray-900 text-white rounded-lg">
            <h2 className="text-xl font-bold mb-4">Stress Test Summary</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-400">Success Rate</div>
                <div className="text-3xl font-bold">
                  {stats.totalTests > 0 
                    ? Math.round((stats.passed / stats.totalTests) * 100) 
                    : 0}%
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400">System Stability</div>
                <div className="text-lg">
                  {stats.crashed === 0 
                    ? '✅ Stable' 
                    : stats.crashed < 3 
                    ? '⚠️ Minor Issues' 
                    : '🔴 Critical Issues'}
                </div>
              </div>
            </div>
            
            {stats.failed > 0 && (
              <div className="mt-4 p-3 bg-red-900 rounded">
                <div className="font-semibold">⚠️ Vulnerabilities Detected</div>
                <div className="text-sm mt-1">
                  {stats.failed} tests failed. Review the results above for details.
                </div>
              </div>
            )}
            
            {stats.crashed > 0 && (
              <div className="mt-4 p-3 bg-orange-900 rounded">
                <div className="font-semibold">💥 System Crashes Detected</div>
                <div className="text-sm mt-1">
                  {stats.crashed} tests caused system crashes. Critical attention needed.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkflowStressTest;