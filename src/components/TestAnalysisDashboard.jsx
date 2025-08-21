// Test Analysis Dashboard - Shows analysis results and fix recommendations
import React, { useState, useEffect } from 'react';
import testAnalysisService from '../services/testAnalysisService';

const TestAnalysisDashboard = ({ testResults, onAnalysisComplete }) => {
  const [analysis, setAnalysis] = useState(null);
  const [implementationPlan, setImplementationPlan] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [showCode, setShowCode] = useState(false);

  // Auto-analyze when test results are provided
  useEffect(() => {
    if (testResults && testResults.length > 0 && !analysis) {
      analyzeResults();
    }
  }, [testResults]);

  const analyzeResults = async () => {
    setIsAnalyzing(true);
    
    try {
      console.log('📊 Starting analysis of', testResults.length, 'test results');
      
      const analysisResult = await testAnalysisService.analyzeTestResults(testResults);
      setAnalysis(analysisResult);
      
      const plan = await testAnalysisService.generateImplementationPlan(analysisResult);
      setImplementationPlan(plan);
      
      // Save analysis
      await testAnalysisService.saveAnalysis(analysisResult, plan);
      
      if (onAnalysisComplete) {
        onAnalysisComplete(analysisResult, plan);
      }
      
      console.log('✅ Analysis complete');
    } catch (error) {
      console.error('❌ Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-green-600 bg-green-100';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '⚡';
      default: return 'ℹ️';
    }
  };

  if (!testResults || testResults.length === 0) {
    return (
      <div className="p-6 bg-gray-100 rounded-lg text-center">
        <p className="text-gray-600">No test results to analyze</p>
      </div>
    );
  }

  if (isAnalyzing) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-lg">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
          <span className="text-lg">Analyzing test results...</span>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-lg">
        <button
          onClick={analyzeResults}
          className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          📊 Analyze Test Results
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Analysis Summary */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-2xl font-bold">📊 Test Analysis Results</h2>
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getRiskColor(analysis.riskLevel)}`}>
            Risk Level: {analysis.riskLevel.toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{analysis.criticalIssues.length}</div>
            <div className="text-sm text-gray-600">Critical Issues</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{analysis.highPriorityIssues.length}</div>
            <div className="text-sm text-gray-600">High Priority</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{analysis.mediumPriorityIssues.length}</div>
            <div className="text-sm text-gray-600">Medium Priority</div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{analysis.estimatedFixTime.total}h</div>
            <div className="text-sm text-gray-600">Est. Fix Time</div>
          </div>
        </div>

        {/* Pattern Analysis */}
        {analysis.patterns.size > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Issue Patterns</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Array.from(analysis.patterns.entries()).map(([category, count]) => (
                <div key={category} className="bg-gray-100 p-3 rounded-lg">
                  <div className="font-semibold">{category}</div>
                  <div className="text-sm text-gray-600">{count} occurrences</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Critical Issues */}
      {analysis.criticalIssues.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-xl font-bold text-red-800 mb-4 flex items-center">
            🚨 Critical Issues Requiring Immediate Action
          </h3>
          <div className="space-y-3">
            {analysis.criticalIssues.map((issue, idx) => (
              <div key={idx} className="bg-white p-4 rounded-lg shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-semibold text-red-700">{issue.description}</div>
                    <div className="text-sm text-gray-600 mt-1">Impact: {issue.impact}</div>
                    <div className="text-sm text-blue-600 mt-1">Fix: {issue.fix}</div>
                  </div>
                  <div className="ml-4 text-right">
                    <div className="text-sm text-gray-500">{issue.estimatedHours}h</div>
                    <button
                      onClick={() => setSelectedIssue(issue)}
                      className="text-xs bg-blue-100 hover:bg-blue-200 px-2 py-1 rounded mt-1"
                    >
                      View Code
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {analysis.recommendations.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4">💡 Fix Recommendations</h3>
          <div className="space-y-4">
            {analysis.recommendations.map((rec, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-semibold text-lg">{rec.title}</h4>
                  <span className="text-sm bg-gray-100 px-2 py-1 rounded">
                    Priority {rec.priority}
                  </span>
                </div>
                <p className="text-gray-600 mb-3">{rec.description}</p>
                <div className="text-sm text-blue-600 mb-3">Timeline: {rec.timeline}</div>
                
                {rec.actions.map((action, actionIdx) => (
                  <div key={actionIdx} className="bg-gray-50 p-3 rounded mb-2">
                    <div className="font-medium">{action.issue}</div>
                    <div className="text-sm text-gray-600">{action.fix}</div>
                    {action.code && (
                      <button
                        onClick={() => {
                          setSelectedIssue({ codeTemplate: action.code });
                          setShowCode(true);
                        }}
                        className="text-xs bg-blue-100 hover:bg-blue-200 px-2 py-1 rounded mt-2"
                      >
                        📝 View Implementation Code
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Implementation Plan */}
      {implementationPlan && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4">🗓️ Implementation Plan</h3>
          <div className="mb-4">
            <div className="text-sm text-gray-600">
              Total Estimated Duration: <span className="font-semibold">{implementationPlan.totalDuration} hours</span>
            </div>
          </div>
          
          <div className="space-y-4">
            {implementationPlan.phases.map((phase, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-semibold">Phase {phase.phase}: {phase.title}</h4>
                  <div className="text-right">
                    <div className={`text-sm px-2 py-1 rounded ${
                      phase.priority === 'IMMEDIATE' ? 'bg-red-100 text-red-800' :
                      phase.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {phase.priority}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">{phase.duration}h</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="font-medium text-sm mb-2">Issues to Fix:</div>
                    <ul className="text-sm space-y-1">
                      {phase.issues.slice(0, 3).map((issue, issueIdx) => (
                        <li key={issueIdx} className="flex items-center">
                          <span className="mr-2">{getSeverityIcon(issue.severity)}</span>
                          {issue.description}
                        </li>
                      ))}
                      {phase.issues.length > 3 && (
                        <li className="text-gray-500">...and {phase.issues.length - 3} more</li>
                      )}
                    </ul>
                  </div>
                  
                  <div>
                    <div className="font-medium text-sm mb-2">Testing Required:</div>
                    <ul className="text-sm space-y-1">
                      {phase.testing.map((test, testIdx) => (
                        <li key={testIdx} className="flex items-center">
                          <span className="mr-2">🧪</span>
                          {test}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                
                {phase.risks.length > 0 && (
                  <div className="mt-3 p-2 bg-yellow-50 rounded">
                    <div className="font-medium text-sm text-yellow-800">Risks:</div>
                    <ul className="text-sm text-yellow-700 space-y-1 mt-1">
                      {phase.risks.map((risk, riskIdx) => (
                        <li key={riskIdx}>• {risk}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Code Modal */}
      {(selectedIssue || showCode) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-semibold">Implementation Code</h3>
              <button
                onClick={() => {
                  setSelectedIssue(null);
                  setShowCode(false);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-4 overflow-auto max-h-96">
              {selectedIssue?.codeTemplate && (
                <div>
                  <div className="text-sm text-gray-600 mb-2">
                    File: <code className="bg-gray-100 px-1">{selectedIssue.codeTemplate.file}</code>
                  </div>
                  <div className="text-sm text-gray-600 mb-4">
                    Function: <code className="bg-gray-100 px-1">{selectedIssue.codeTemplate.function}</code>
                  </div>
                  <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
                    <code>{selectedIssue.codeTemplate.code}</code>
                  </pre>
                </div>
              )}
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-end space-x-2">
              <button
                onClick={() => navigator.clipboard.writeText(selectedIssue?.codeTemplate?.code || '')}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                📋 Copy Code
              </button>
              <button
                onClick={() => {
                  setSelectedIssue(null);
                  setShowCode(false);
                }}
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

export default TestAnalysisDashboard;