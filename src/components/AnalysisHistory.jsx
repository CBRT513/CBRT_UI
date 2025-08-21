// Analysis History - Retrieve previously saved test analyses
import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { db } from '../firebase/config';

const AnalysisHistory = () => {
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);

  useEffect(() => {
    loadAnalysisHistory();
  }, []);

  const loadAnalysisHistory = async () => {
    try {
      console.log('📚 Loading analysis history...');
      
      // Try to get test analyses
      const analysesQuery = query(
        collection(db, 'test_analyses'),
        orderBy('timestamp', 'desc'),
        limit(10)
      );
      
      const snapshot = await getDocs(analysesQuery);
      const analysisData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setAnalyses(analysisData);
      console.log('Found', analysisData.length, 'previous analyses');
      
      // Also check audit logs for test results
      const auditQuery = query(
        collection(db, 'auditLogs'),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
      
      const auditSnapshot = await getDocs(auditQuery);
      const auditLogs = auditSnapshot.docs.map(doc => doc.data());
      
      // Filter for chaos test related logs
      const testLogs = auditLogs.filter(log => 
        log.action?.includes('Chaos') || 
        log.message?.includes('test') ||
        log.message?.includes('anomaly')
      );
      
      console.log('Found', testLogs.length, 'test-related audit logs');
      
      if (testLogs.length > 0) {
        // Create a synthetic analysis from audit logs
        setAnalyses(prev => [...prev, {
          id: 'audit-log-analysis',
          timestamp: new Date(),
          analysis: {
            totalTests: testLogs.length,
            criticalIssues: testLogs.filter(log => log.level === 'critical'),
            anomalies: testLogs.filter(log => log.message?.includes('anomaly')),
            source: 'audit-logs'
          },
          auditLogs: testLogs
        }]);
      }
      
    } catch (error) {
      console.error('❌ Error loading analysis history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown';
    
    try {
      if (timestamp.toDate) {
        return timestamp.toDate().toLocaleString();
      }
      return new Date(timestamp).toLocaleString();
    } catch (error) {
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-lg">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
          <span>Loading analysis history...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4">📚 Test Analysis History</h2>
        
        {analyses.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">No previous test analyses found</p>
            <p className="text-sm text-gray-400">
              Run a chaos test to generate analysis data
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {analyses.map((analysis, idx) => (
              <div 
                key={analysis.id || idx}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelectedAnalysis(analysis)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold">
                      Analysis #{idx + 1}
                      {analysis.analysis?.source === 'audit-logs' && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          From Audit Logs
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatTimestamp(analysis.timestamp)}
                    </div>
                    {analysis.analysis && (
                      <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Total Tests:</span>
                          <span className="ml-1 font-medium">
                            {analysis.analysis.totalTests || 0}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Critical:</span>
                          <span className="ml-1 font-medium text-red-600">
                            {analysis.analysis.criticalIssues?.length || 0}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Anomalies:</span>
                          <span className="ml-1 font-medium text-yellow-600">
                            {analysis.analysis.anomaliesDetected || 
                             analysis.analysis.anomalies?.length || 0}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Risk:</span>
                          <span className={`ml-1 font-medium ${
                            analysis.analysis.riskLevel === 'critical' ? 'text-red-600' :
                            analysis.analysis.riskLevel === 'high' ? 'text-orange-600' :
                            analysis.analysis.riskLevel === 'medium' ? 'text-yellow-600' :
                            'text-green-600'
                          }`}>
                            {analysis.analysis.riskLevel || 'Unknown'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  <button className="text-blue-600 hover:text-blue-800 text-sm">
                    View Details →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected Analysis Details */}
      {selectedAnalysis && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-semibold text-lg">Analysis Details</h3>
              <button
                onClick={() => setSelectedAnalysis(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-auto max-h-[70vh]">
              {selectedAnalysis.analysis?.source === 'audit-logs' ? (
                <div>
                  <h4 className="font-semibold mb-4">Audit Log Analysis</h4>
                  <div className="space-y-3">
                    {selectedAnalysis.auditLogs?.map((log, idx) => (
                      <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">{log.action || log.message}</div>
                            <div className="text-sm text-gray-600">
                              {formatTimestamp(log.timestamp)}
                            </div>
                            {log.metadata && (
                              <pre className="text-xs text-gray-500 mt-2 overflow-x-auto">
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            )}
                          </div>
                          <span className={`text-xs px-2 py-1 rounded ${
                            log.level === 'critical' ? 'bg-red-100 text-red-800' :
                            log.level === 'error' ? 'bg-orange-100 text-orange-800' :
                            log.level === 'warn' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {log.level || 'info'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <h4 className="font-semibold mb-4">Full Analysis Data</h4>
                  <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                    {JSON.stringify(selectedAnalysis, null, 2)}
                  </pre>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t bg-gray-50 flex justify-end">
              <button
                onClick={() => setSelectedAnalysis(null)}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalysisHistory;