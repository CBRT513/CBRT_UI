// Quick System Health Check
import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  limit,
  orderBy
} from 'firebase/firestore';
import { db } from '../firebase/config';
import duplicateDetectionService from '../services/duplicateDetectionService';

const QuickSystemCheck = () => {
  const [results, setResults] = useState({});
  const [isChecking, setIsChecking] = useState(false);
  const [issues, setIssues] = useState([]);

  const runQuickCheck = async () => {
    setIsChecking(true);
    setResults({});
    setIssues([]);
    
    const checkResults = {};
    const foundIssues = [];

    try {
      // Check 1: Database connectivity
      console.log('🔍 Checking database connectivity...');
      const start = Date.now();
      const testQuery = await getDocs(query(collection(db, 'releases'), limit(1)));
      checkResults.database = {
        status: 'healthy',
        responseTime: Date.now() - start,
        message: 'Database connection working'
      };

      // Check 2: Duplicate releases
      console.log('🔍 Checking for duplicate releases...');
      const releases = await getDocs(query(collection(db, 'releases'), limit(100)));
      const releaseNumbers = new Map();
      
      releases.docs.forEach(doc => {
        const data = doc.data();
        const releaseNumber = data.releaseNumber || data.ReleaseNumber;
        if (releaseNumber) {
          if (releaseNumbers.has(releaseNumber)) {
            releaseNumbers.get(releaseNumber).push(doc.id);
          } else {
            releaseNumbers.set(releaseNumber, [doc.id]);
          }
        }
      });

      const duplicates = Array.from(releaseNumbers.entries()).filter(([_, ids]) => ids.length > 1);
      checkResults.duplicates = {
        status: duplicates.length > 0 ? 'warning' : 'healthy',
        count: duplicates.length,
        message: duplicates.length > 0 ? `Found ${duplicates.length} duplicate release numbers` : 'No duplicates found'
      };

      if (duplicates.length > 0) {
        foundIssues.push({
          severity: 'medium',
          category: 'data_integrity',
          description: `${duplicates.length} duplicate release numbers found`,
          fix: 'Run duplicate cleanup process'
        });
      }

      // Check 3: Stuck locks
      console.log('🔍 Checking for stuck locks...');
      const lockedReleases = await getDocs(
        query(collection(db, 'releases'), where('lockedBy', '!=', null))
      );
      
      const now = new Date();
      let stuckLocks = 0;
      
      lockedReleases.docs.forEach(doc => {
        const data = doc.data();
        if (data.lockedAt) {
          const lockTime = data.lockedAt.toDate();
          const lockAge = now - lockTime;
          if (lockAge > 15 * 60 * 1000) { // 15 minutes
            stuckLocks++;
          }
        }
      });

      checkResults.locks = {
        status: stuckLocks > 0 ? 'warning' : 'healthy',
        stuckCount: stuckLocks,
        totalLocked: lockedReleases.size,
        message: stuckLocks > 0 ? `${stuckLocks} stuck locks found` : 'No stuck locks'
      };

      if (stuckLocks > 0) {
        foundIssues.push({
          severity: 'high',
          category: 'concurrency',
          description: `${stuckLocks} releases have stuck locks`,
          fix: 'Release stuck locks automatically'
        });
      }

      // Check 4: Invalid statuses
      console.log('🔍 Checking for invalid statuses...');
      const validStatuses = ['Entered', 'Staged', 'Verified', 'Loaded', 'Shipped'];
      let invalidStatuses = 0;
      
      releases.docs.forEach(doc => {
        const data = doc.data();
        const status = data.status || data.Status;
        if (status && !validStatuses.includes(status)) {
          invalidStatuses++;
        }
      });

      checkResults.statuses = {
        status: invalidStatuses > 0 ? 'warning' : 'healthy',
        invalidCount: invalidStatuses,
        message: invalidStatuses > 0 ? `${invalidStatuses} invalid statuses found` : 'All statuses valid'
      };

      if (invalidStatuses > 0) {
        foundIssues.push({
          severity: 'medium',
          category: 'validation',
          description: `${invalidStatuses} releases have invalid status values`,
          fix: 'Normalize status values to valid options'
        });
      }

      // Check 5: Missing required fields
      console.log('🔍 Checking for missing required fields...');
      let missingFields = 0;
      
      releases.docs.forEach(doc => {
        const data = doc.data();
        if (!data.releaseNumber && !data.ReleaseNumber) missingFields++;
        if (!data.supplierId && !data.SupplierId) missingFields++;
        if (!data.customerId && !data.CustomerId) missingFields++;
      });

      checkResults.requiredFields = {
        status: missingFields > 0 ? 'error' : 'healthy',
        missingCount: missingFields,
        message: missingFields > 0 ? `${missingFields} releases missing required fields` : 'All required fields present'
      };

      if (missingFields > 0) {
        foundIssues.push({
          severity: 'high',
          category: 'data_integrity',
          description: `${missingFields} releases missing required fields`,
          fix: 'Add default values or fix data entry validation'
        });
      }

      // Check 6: Performance - large documents
      console.log('🔍 Checking for performance issues...');
      let largeDocuments = 0;
      
      releases.docs.forEach(doc => {
        const data = doc.data();
        const lineItems = data.lineItems || data.LineItems || [];
        if (lineItems.length > 50) {
          largeDocuments++;
        }
      });

      checkResults.performance = {
        status: largeDocuments > 0 ? 'warning' : 'healthy',
        largeDocCount: largeDocuments,
        message: largeDocuments > 0 ? `${largeDocuments} releases with many line items` : 'Document sizes normal'
      };

      setResults(checkResults);
      setIssues(foundIssues);

    } catch (error) {
      console.error('❌ System check failed:', error);
      checkResults.error = {
        status: 'error',
        message: error.message
      };
      setResults(checkResults);
    } finally {
      setIsChecking(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return 'ℹ️';
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">🔍 Quick System Health Check</h1>
          <button
            onClick={runQuickCheck}
            disabled={isChecking}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isChecking ? 'Checking...' : 'Run Check'}
          </button>
        </div>

        {isChecking && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
              <span>Running system health checks...</span>
            </div>
          </div>
        )}

        {Object.keys(results).length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Check Results</h2>
            
            {Object.entries(results).map(([check, result]) => (
              <div key={check} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <span className="mr-3 text-xl">{getStatusIcon(result.status)}</span>
                    <div>
                      <div className="font-semibold capitalize">{check.replace(/([A-Z])/g, ' $1')}</div>
                      <div className="text-sm text-gray-600">{result.message}</div>
                      {result.responseTime && (
                        <div className="text-xs text-gray-500">Response time: {result.responseTime}ms</div>
                      )}
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(result.status)}`}>
                    {result.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {issues.length > 0 && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-4">Issues Found ({issues.length})</h2>
            <div className="space-y-3">
              {issues.map((issue, idx) => (
                <div key={idx} className="p-4 border-l-4 border-yellow-500 bg-yellow-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold">{issue.description}</div>
                      <div className="text-sm text-gray-600 mt-1">Fix: {issue.fix}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Category: {issue.category} | Severity: {issue.severity}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {Object.keys(results).length > 0 && issues.length === 0 && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <span className="text-green-600 text-xl mr-3">🎉</span>
              <div>
                <div className="font-semibold text-green-800">System Health: Excellent</div>
                <div className="text-sm text-green-600">No issues detected in quick health check</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuickSystemCheck;