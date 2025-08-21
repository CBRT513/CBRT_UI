// Automated Workflow Testing System with Self-Healing
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
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';
import releaseWorkflowService from '../services/releaseWorkflowService';
import releaseNotificationService from '../services/releaseNotificationService';
import { logger } from '../utils/logger';

const WorkflowAutomatedTest = () => {
  const [testResults, setTestResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState('');
  const [fixAttempts, setFixAttempts] = useState({});
  const [testData, setTestData] = useState({});
  const testAbortRef = useRef(false);

  // Test data generators
  const generateTestData = () => {
    const timestamp = Date.now();
    return {
      supplier: {
        supplierName: `Test Supplier ${timestamp}`,
        SupplierName: `Test Supplier ${timestamp}`,
        contactName: 'Test Contact',
        email: 'test@supplier.com',
        phone: '555-0100',
        status: 'Active'
      },
      customer: {
        customerName: `Test Customer ${timestamp}`,
        CustomerName: `Test Customer ${timestamp}`,
        contactName: 'Test Customer Contact',
        email: 'test@customer.com',
        phone: '555-0200',
        address: '123 Test St',
        city: 'Cincinnati',
        state: 'OH',
        zipCode: '45202',
        status: 'Active'
      },
      item: {
        itemCode: `TEST-${timestamp}`,
        ItemCode: `TEST-${timestamp}`,
        itemName: `Test Item ${timestamp}`,
        ItemName: `Test Item ${timestamp}`,
        status: 'Active'
      },
      size: {
        sizeName: `Size-${timestamp}`,
        SizeName: `Size-${timestamp}`,
        status: 'Active'
      },
      barcode: {
        Barcode: `BC${timestamp}`,
        Status: 'Available',
        Quantity: 10
      },
      release: {
        releaseNumber: `R-${timestamp}`,
        releaseDate: new Date().toISOString().split('T')[0],
        status: 'Entered',
        pickTicketRevision: 0
      },
      users: {
        warehouse1: {
          id: `test-warehouse-${timestamp}-1`,
          name: 'Test Warehouse User 1',
          email: 'warehouse1@test.com',
          role: 'Warehouse',
          receiveNewRelease: true
        },
        warehouse2: {
          id: `test-warehouse-${timestamp}-2`,
          name: 'Test Warehouse User 2',
          email: 'warehouse2@test.com',
          role: 'Warehouse',
          receiveNewRelease: true
        },
        office: {
          id: `test-office-${timestamp}`,
          name: 'Test Office User',
          email: 'office@test.com',
          role: 'Office',
          receiveNewRelease: true
        }
      }
    };
  };

  // Test Suite
  const testSuite = [
    {
      name: 'Setup Test Data',
      run: async (data) => {
        try {
          // Create supplier
          const supplierRef = await addDoc(collection(db, 'suppliers'), data.supplier);
          data.supplierId = supplierRef.id;
          
          // Create customer
          const customerRef = await addDoc(collection(db, 'customers'), data.customer);
          data.customerId = customerRef.id;
          
          // Create item
          const itemRef = await addDoc(collection(db, 'items'), data.item);
          data.itemId = itemRef.id;
          
          // Create size
          const sizeRef = await addDoc(collection(db, 'sizes'), data.size);
          data.sizeId = sizeRef.id;
          
          // Create barcode
          const barcodeData = {
            ...data.barcode,
            ItemId: data.itemId,
            SizeId: data.sizeId,
            CustomerId: data.customerId
          };
          const barcodeRef = await addDoc(collection(db, 'barcodes'), barcodeData);
          data.barcodeId = barcodeRef.id;
          
          return { success: true, message: 'Test data created successfully' };
        } catch (error) {
          return { success: false, error: error.message };
        }
      }
    },
    
    {
      name: 'Create Release',
      run: async (data) => {
        try {
          const releaseData = {
            ...data.release,
            supplierId: data.supplierId,
            customerId: data.customerId,
            supplierName: data.supplier.supplierName,
            customerName: data.customer.customerName,
            lineItems: [{
              itemId: data.itemId,
              itemCode: data.item.itemCode,
              itemName: data.item.itemName,
              sizeId: data.sizeId,
              sizeName: data.size.sizeName,
              requestedQuantity: 5,
              quantity: 5
            }],
            createdAt: serverTimestamp()
          };
          
          const releaseRef = await addDoc(collection(db, 'releases'), releaseData);
          data.releaseId = releaseRef.id;
          
          // Try to generate pick ticket
          try {
            const pickTicket = await releaseNotificationService.generatePickTicket(data.releaseId);
            data.pickTicketGenerated = true;
            data.pickTicketURL = pickTicket.downloadURL;
          } catch (error) {
            console.warn('Pick ticket generation failed (non-critical):', error);
            data.pickTicketGenerated = false;
          }
          
          return { success: true, message: 'Release created', releaseId: data.releaseId };
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      fix: async (error, data, suite) => {
        // Auto-fix: Ensure required fields are present
        if (error.includes('supplierId') || error.includes('customerId')) {
          await suite[0].run(data); // Re-run setup
          return true;
        }
        return false;
      }
    },
    
    {
      name: 'Test Release Locking',
      run: async (data) => {
        try {
          // User 1 acquires lock
          const lock1 = await releaseWorkflowService.acquireLock(
            data.releaseId, 
            data.users.warehouse1
          );
          
          // User 2 tries to acquire lock (should fail)
          let lock2Failed = false;
          try {
            await releaseWorkflowService.acquireLock(
              data.releaseId, 
              data.users.warehouse2
            );
          } catch (error) {
            lock2Failed = true;
          }
          
          // Release lock
          await releaseWorkflowService.releaseLock(
            data.releaseId, 
            data.users.warehouse1.id
          );
          
          // Now user 2 should be able to lock
          const lock2Success = await releaseWorkflowService.acquireLock(
            data.releaseId, 
            data.users.warehouse2
          );
          
          await releaseWorkflowService.releaseLock(
            data.releaseId, 
            data.users.warehouse2.id
          );
          
          if (!lock2Failed) {
            return { success: false, error: 'Lock collision not prevented' };
          }
          
          return { success: true, message: 'Locking mechanism working correctly' };
        } catch (error) {
          return { success: false, error: error.message };
        }
      }
    },
    
    {
      name: 'Stage Release',
      run: async (data) => {
        try {
          const stagingData = {
            location: 'Allied',
            items: [{
              barcode: data.barcode.Barcode,
              itemId: data.itemId,
              itemCode: data.item.itemCode,
              itemName: data.item.itemName,
              sizeId: data.sizeId,
              sizeName: data.size.sizeName,
              quantity: 5,
              scanMethod: 'Scanned',
              scannedAt: new Date().toISOString()
            }]
          };
          
          await releaseWorkflowService.stageRelease(
            data.releaseId,
            stagingData,
            data.users.warehouse1
          );
          
          // Verify status changed
          const releaseDoc = await getDoc(doc(db, 'releases', data.releaseId));
          const releaseData = releaseDoc.data();
          
          if (releaseData.status !== 'Staged') {
            return { success: false, error: 'Status not updated to Staged' };
          }
          
          if (releaseData.stagedLocation !== 'Allied') {
            return { success: false, error: 'Location not saved' };
          }
          
          return { success: true, message: 'Release staged successfully' };
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      fix: async (error, data, suite) => {
        // Auto-fix: Ensure release exists and is in correct status
        if (error.includes('not found')) {
          await suite[1].run(data); // Re-create release
          return true;
        }
        if (error.includes('Cannot stage')) {
          // Reset status to Entered
          await updateDoc(doc(db, 'releases', data.releaseId), {
            status: 'Entered'
          });
          return true;
        }
        return false;
      }
    },
    
    {
      name: 'Test Verification Restrictions',
      run: async (data) => {
        try {
          // User 1 (who staged) tries to verify (should fail)
          let verifyFailed = false;
          try {
            await releaseWorkflowService.verifyRelease(
              data.releaseId,
              data.users.warehouse1
            );
          } catch (error) {
            if (error.message.includes('cannot verify')) {
              verifyFailed = true;
            }
          }
          
          if (!verifyFailed) {
            return { success: false, error: 'User was able to verify own staging' };
          }
          
          // User 2 verifies (should succeed)
          await releaseWorkflowService.verifyRelease(
            data.releaseId,
            data.users.warehouse2
          );
          
          // Check status
          const releaseDoc = await getDoc(doc(db, 'releases', data.releaseId));
          const releaseData = releaseDoc.data();
          
          if (releaseData.status !== 'Verified') {
            return { success: false, error: 'Status not updated to Verified' };
          }
          
          return { success: true, message: 'Verification restrictions working' };
        } catch (error) {
          return { success: false, error: error.message };
        }
      }
    },
    
    {
      name: 'Test Verification Rejection',
      run: async (data) => {
        try {
          // First, re-stage the release
          await updateDoc(doc(db, 'releases', data.releaseId), {
            status: 'Staged',
            stagedBy: data.users.warehouse1.id,
            stagedByName: data.users.warehouse1.name,
            stagedAt: serverTimestamp(),
            stagedLocation: 'Red Ramp'
          });
          
          // Reject verification
          await releaseWorkflowService.rejectVerification(
            data.releaseId,
            'Items damaged',
            data.users.office
          );
          
          // Check status reverted to Entered
          const releaseDoc = await getDoc(doc(db, 'releases', data.releaseId));
          const releaseData = releaseDoc.data();
          
          if (releaseData.status !== 'Entered') {
            return { success: false, error: 'Status not reverted to Entered' };
          }
          
          if (releaseData.pickTicketRevision !== 1) {
            return { success: false, error: 'Pick ticket revision not incremented' };
          }
          
          return { success: true, message: 'Rejection process working' };
        } catch (error) {
          return { success: false, error: error.message };
        }
      }
    },
    
    {
      name: 'Load Shipment',
      run: async (data) => {
        try {
          // First ensure release is verified
          await updateDoc(doc(db, 'releases', data.releaseId), {
            status: 'Verified',
            verifiedBy: data.users.warehouse2.id,
            verifiedByName: data.users.warehouse2.name,
            verifiedAt: serverTimestamp()
          });
          
          // Load the release
          await releaseWorkflowService.loadRelease(
            data.releaseId,
            'TRUCK-123',
            data.users.warehouse1
          );
          
          // Check status and truck number
          const releaseDoc = await getDoc(doc(db, 'releases', data.releaseId));
          const releaseData = releaseDoc.data();
          
          if (releaseData.status !== 'Loaded') {
            return { success: false, error: 'Status not updated to Loaded' };
          }
          
          if (releaseData.truckNumber !== 'TRUCK-123') {
            return { success: false, error: 'Truck number not saved' };
          }
          
          return { success: true, message: 'Loading process working' };
        } catch (error) {
          return { success: false, error: error.message };
        }
      }
    },
    
    {
      name: 'Test Unable to Stage',
      run: async (data) => {
        try {
          // Create a new release for this test
          const releaseData = {
            releaseNumber: `R-UNABLE-${Date.now()}`,
            status: 'Entered',
            supplierId: data.supplierId,
            customerId: data.customerId,
            lineItems: [{
              itemId: data.itemId,
              sizeId: data.sizeId,
              quantity: 100 // More than available
            }],
            createdAt: serverTimestamp()
          };
          
          const releaseRef = await addDoc(collection(db, 'releases'), releaseData);
          
          // Mark as unable to stage
          await releaseWorkflowService.unableToStage(
            releaseRef.id,
            'Insufficient inventory',
            data.users.warehouse1
          );
          
          // Check that status remains Entered
          const checkDoc = await getDoc(doc(db, 'releases', releaseRef.id));
          const checkData = checkDoc.data();
          
          if (checkData.status !== 'Entered') {
            return { success: false, error: 'Status changed when it should remain Entered' };
          }
          
          if (!checkData.unableToStageReason) {
            return { success: false, error: 'Unable to stage reason not recorded' };
          }
          
          // Clean up
          await deleteDoc(doc(db, 'releases', releaseRef.id));
          
          return { success: true, message: 'Unable to stage process working' };
        } catch (error) {
          return { success: false, error: error.message };
        }
      }
    },
    
    {
      name: 'Cleanup Test Data',
      run: async (data) => {
        try {
          const deletions = [];
          
          // Delete test release
          if (data.releaseId) {
            deletions.push(deleteDoc(doc(db, 'releases', data.releaseId)));
          }
          
          // Delete test data
          if (data.supplierId) {
            deletions.push(deleteDoc(doc(db, 'suppliers', data.supplierId)));
          }
          if (data.customerId) {
            deletions.push(deleteDoc(doc(db, 'customers', data.customerId)));
          }
          if (data.itemId) {
            deletions.push(deleteDoc(doc(db, 'items', data.itemId)));
          }
          if (data.sizeId) {
            deletions.push(deleteDoc(doc(db, 'sizes', data.sizeId)));
          }
          if (data.barcodeId) {
            deletions.push(deleteDoc(doc(db, 'barcodes', data.barcodeId)));
          }
          
          // Delete audit logs for this test
          const auditQuery = query(
            collection(db, 'auditLogs'),
            where('releaseId', '==', data.releaseId)
          );
          const auditDocs = await getDocs(auditQuery);
          auditDocs.forEach(doc => {
            deletions.push(deleteDoc(doc.ref));
          });
          
          await Promise.all(deletions);
          
          return { success: true, message: 'Test data cleaned up' };
        } catch (error) {
          return { success: false, error: error.message, critical: false };
        }
      }
    }
  ];

  // Run all tests
  const runTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    testAbortRef.current = false;
    
    const data = generateTestData();
    setTestData(data);
    const results = [];
    
    for (let i = 0; i < testSuite.length; i++) {
      if (testAbortRef.current) {
        break;
      }
      
      const test = testSuite[i];
      setCurrentTest(test.name);
      
      let result = await test.run(data);
      
      // Auto-fix attempt
      if (!result.success && test.fix) {
        const fixKey = `${test.name}-${i}`;
        const attempts = fixAttempts[fixKey] || 0;
        
        if (attempts < 3) {
          console.log(`Attempting to auto-fix: ${test.name}`);
          const fixed = await test.fix(result.error, data, testSuite);
          
          if (fixed) {
            setFixAttempts(prev => ({ ...prev, [fixKey]: attempts + 1 }));
            // Retry the test
            result = await test.run(data);
            if (result.success) {
              result.message += ' (auto-fixed)';
            }
          }
        }
      }
      
      results.push({
        name: test.name,
        ...result,
        timestamp: new Date().toISOString()
      });
      
      setTestResults([...results]);
      
      // Stop on critical failure
      if (!result.success && result.critical !== false) {
        console.error(`Critical test failure: ${test.name}`, result.error);
      }
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setIsRunning(false);
    setCurrentTest('');
    
    // Log summary
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    await logger.info('Workflow test completed', {
      passed,
      failed,
      total: results.length,
      successRate: `${Math.round((passed / results.length) * 100)}%`
    });
  };

  // Abort tests
  const abortTests = () => {
    testAbortRef.current = true;
    setIsRunning(false);
    setCurrentTest('');
  };

  // Monitor and fix issues
  useEffect(() => {
    const checkInterval = setInterval(async () => {
      if (!isRunning) return;
      
      // Check for common issues and auto-fix
      try {
        // Check for stuck locks
        const releasesSnapshot = await getDocs(collection(db, 'releases'));
        const now = new Date();
        
        releasesSnapshot.forEach(async (doc) => {
          const data = doc.data();
          if (data.lockedAt) {
            const lockTime = data.lockedAt.toDate();
            const lockAge = now - lockTime;
            
            if (lockAge > 15 * 60 * 1000) { // 15 minutes
              console.log('Auto-releasing stuck lock:', doc.id);
              await updateDoc(doc.ref, {
                lockedBy: null,
                lockedByName: null,
                lockedAt: null
              });
            }
          }
        });
      } catch (error) {
        console.error('Monitor error:', error);
      }
    }, 5000); // Check every 5 seconds
    
    return () => clearInterval(checkInterval);
  }, [isRunning]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6">Automated Workflow Testing System</h1>
        
        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            This automated test suite will create test data, run through the entire workflow, 
            identify issues, and attempt to fix them automatically.
          </p>
          
          <div className="flex space-x-4">
            <button
              onClick={runTests}
              disabled={isRunning}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isRunning ? 'Running Tests...' : 'Start Automated Test'}
            </button>
            
            {isRunning && (
              <button
                onClick={abortTests}
                className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Abort Tests
              </button>
            )}
          </div>
        </div>
        
        {currentTest && (
          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
              <span className="text-blue-800">Running: {currentTest}</span>
            </div>
          </div>
        )}
        
        {/* Test Results */}
        <div className="space-y-2">
          <h2 className="text-lg font-semibold mb-3">Test Results</h2>
          
          {testResults.length === 0 && !isRunning && (
            <p className="text-gray-500">No test results yet. Click "Start Automated Test" to begin.</p>
          )}
          
          {testResults.map((result, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg border ${
                result.success 
                  ? 'bg-green-50 border-green-300' 
                  : 'bg-red-50 border-red-300'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center">
                  <span className={`text-lg mr-2 ${
                    result.success ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {result.success ? '✓' : '✗'}
                  </span>
                  <div>
                    <div className="font-medium">{result.name}</div>
                    <div className="text-sm text-gray-600">
                      {result.success ? result.message : result.error}
                    </div>
                    {result.message?.includes('auto-fixed') && (
                      <div className="text-xs text-blue-600 mt-1">
                        🔧 Auto-fixed issue
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(result.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Summary */}
        {testResults.length > 0 && !isRunning && (
          <div className="mt-6 p-4 bg-gray-100 rounded-lg">
            <h3 className="font-semibold mb-2">Test Summary</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Total Tests:</span>
                <span className="ml-2 font-medium">{testResults.length}</span>
              </div>
              <div>
                <span className="text-gray-600">Passed:</span>
                <span className="ml-2 font-medium text-green-600">
                  {testResults.filter(r => r.success).length}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Failed:</span>
                <span className="ml-2 font-medium text-red-600">
                  {testResults.filter(r => !r.success).length}
                </span>
              </div>
            </div>
            <div className="mt-3">
              <div className="text-gray-600 text-sm">Success Rate:</div>
              <div className="w-full bg-gray-200 rounded-full h-4 mt-1">
                <div
                  className="bg-green-600 h-4 rounded-full transition-all duration-500"
                  style={{
                    width: `${(testResults.filter(r => r.success).length / testResults.length) * 100}%`
                  }}
                />
              </div>
              <div className="text-right text-sm text-gray-600 mt-1">
                {Math.round((testResults.filter(r => r.success).length / testResults.length) * 100)}%
              </div>
            </div>
          </div>
        )}
        
        {/* Test Data Info */}
        {Object.keys(testData).length > 0 && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2 text-sm">Test Data IDs (for debugging)</h3>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
              {testData.releaseId && <div>Release: {testData.releaseId}</div>}
              {testData.supplierId && <div>Supplier: {testData.supplierId}</div>}
              {testData.customerId && <div>Customer: {testData.customerId}</div>}
              {testData.itemId && <div>Item: {testData.itemId}</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkflowAutomatedTest;