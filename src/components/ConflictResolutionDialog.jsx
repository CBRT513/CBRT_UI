/**
 * Conflict Resolution Dialog Component
 */

import React, { useState, useEffect, useCallback } from 'react';
import { aiResolutionService, ConflictType } from '../lib/resolution';

export default function ConflictResolutionDialog({ 
  conflict, 
  onResolve, 
  onCancel 
}) {
  const [analysis, setAnalysis] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedStrategy, setSelectedStrategy] = useState(null);
  const [preview, setPreview] = useState(null);
  const [customResolution, setCustomResolution] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showComparison, setShowComparison] = useState(false);
  const [feedback, setFeedback] = useState({ rating: 0, comment: '' });

  useEffect(() => {
    loadAnalysis();
  }, [conflict]);

  const loadAnalysis = async () => {
    setIsLoading(true);
    try {
      const result = await aiResolutionService.getSuggestions(conflict);
      setAnalysis(result.analysis);
      setSuggestions(result.strategies);
      
      // Auto-select highest confidence strategy
      if (result.strategies.length > 0) {
        setSelectedStrategy(result.strategies[0]);
        setPreview(result.strategies[0].preview);
      }
    } catch (error) {
      console.error('Failed to analyze conflict:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStrategySelect = useCallback((strategy) => {
    setSelectedStrategy(strategy);
    setPreview(strategy.preview);
  }, []);

  const handleAutoResolve = useCallback(async () => {
    if (!selectedStrategy) return;

    try {
      const result = await aiResolutionService.autoResolve(
        conflict,
        selectedStrategy.id
      );

      if (result.success) {
        onResolve(result.mergedValue);
        
        // Provide positive feedback for successful auto-resolution
        if (feedback.rating > 0) {
          aiResolutionService.provideFeedback(selectedStrategy.id, {
            rating: feedback.rating,
            wasHelpful: true,
            comment: feedback.comment,
          });
        }
      } else {
        alert(`Auto-resolution failed: ${result.explanation}`);
      }
    } catch (error) {
      console.error('Auto-resolution error:', error);
      alert('Failed to auto-resolve conflict');
    }
  }, [selectedStrategy, conflict, onResolve, feedback]);

  const handleManualResolve = useCallback(() => {
    if (customResolution) {
      onResolve(customResolution);
    } else if (preview !== null) {
      onResolve(preview);
    }
  }, [customResolution, preview, onResolve]);

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-50';
      case 'high':
        return 'text-orange-600 bg-orange-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'low':
        return 'text-green-600 bg-green-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getConflictTypeIcon = (type) => {
    switch (type) {
      case ConflictType.SIMPLE_VALUE:
        return '📝';
      case ConflictType.ARRAY_MODIFICATION:
        return '📚';
      case ConflictType.NESTED_OBJECT:
        return '🗂️';
      case ConflictType.SEMANTIC_DIFFERENCE:
        return '💭';
      case ConflictType.BUSINESS_RULE:
        return '⚖️';
      case ConflictType.CONCURRENT_DELETE:
        return '🗑️';
      default:
        return '❓';
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Analyzing conflict...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold mb-2">Conflict Resolution</h2>
              <p className="text-gray-600">
                Field: <span className="font-mono font-semibold">{conflict.field}</span>
              </p>
            </div>
            
            {analysis && (
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${getSeverityColor(analysis.severity)}`}>
                {analysis.severity.toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-grow overflow-y-auto p-6">
          {/* AI Analysis */}
          {analysis && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold mb-2 flex items-center">
                <span className="mr-2">{getConflictTypeIcon(analysis.conflictType)}</span>
                AI Analysis
              </h3>
              
              <div className="space-y-2 text-sm">
                <p>
                  <strong>Type:</strong> {analysis.conflictType.replace('_', ' ')}
                </p>
                <p>
                  <strong>Business Impact:</strong> {analysis.businessImpact}
                </p>
                <p>
                  <strong>Semantic Difference:</strong> {Math.round(analysis.semanticDifference * 100)}%
                </p>
                <p className="text-blue-800 font-medium mt-2">
                  {analysis.recommendation}
                </p>
              </div>
            </div>
          )}

          {/* Value Comparison */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold">Value Comparison</h3>
              <button
                onClick={() => setShowComparison(!showComparison)}
                className="text-sm text-blue-600 hover:underline"
              >
                {showComparison ? 'Hide' : 'Show'} Details
              </button>
            </div>

            {showComparison && (
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-gray-50 rounded">
                  <h4 className="text-xs font-semibold text-gray-500 mb-1">BASE VALUE</h4>
                  <pre className="text-sm whitespace-pre-wrap font-mono">
                    {JSON.stringify(conflict.baseValue, null, 2)}
                  </pre>
                </div>
                
                <div className="p-3 bg-green-50 rounded">
                  <h4 className="text-xs font-semibold text-green-600 mb-1">YOUR CHANGE</h4>
                  <pre className="text-sm whitespace-pre-wrap font-mono">
                    {JSON.stringify(conflict.ourChange.value, null, 2)}
                  </pre>
                </div>
                
                <div className="p-3 bg-orange-50 rounded">
                  <h4 className="text-xs font-semibold text-orange-600 mb-1">THEIR CHANGE</h4>
                  <pre className="text-sm whitespace-pre-wrap font-mono">
                    {JSON.stringify(conflict.theirChange.value, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {/* Resolution Strategies */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3">Resolution Strategies</h3>
            
            <div className="space-y-2">
              {suggestions.map((strategy) => (
                <div
                  key={strategy.id}
                  onClick={() => handleStrategySelect(strategy)}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedStrategy?.id === strategy.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-grow">
                      <h4 className="font-medium">{strategy.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{strategy.description}</p>
                    </div>
                    
                    <div className="ml-4 text-right">
                      <div className="text-sm font-medium">
                        {Math.round(strategy.confidence * 100)}%
                      </div>
                      <div className="text-xs text-gray-500">confidence</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resolution Preview */}
          {preview !== null && (
            <div className="mb-6">
              <h3 className="font-semibold mb-2">Resolution Preview</h3>
              <div className="p-4 bg-purple-50 rounded-lg">
                <pre className="text-sm whitespace-pre-wrap font-mono">
                  {typeof preview === 'object' 
                    ? JSON.stringify(preview, null, 2)
                    : preview}
                </pre>
              </div>
            </div>
          )}

          {/* Manual Resolution */}
          <div className="mb-6">
            <h3 className="font-semibold mb-2">Manual Resolution</h3>
            <textarea
              value={customResolution}
              onChange={(e) => setCustomResolution(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
              rows={4}
              placeholder="Enter custom resolution value..."
            />
          </div>

          {/* Feedback */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2">Help Us Improve</h3>
            
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-sm">Rate this suggestion:</span>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setFeedback({ ...feedback, rating: star })}
                  className={`text-2xl ${
                    star <= feedback.rating ? 'text-yellow-500' : 'text-gray-300'
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
            
            <input
              type="text"
              value={feedback.comment}
              onChange={(e) => setFeedback({ ...feedback, comment: e.target.value })}
              className="w-full px-3 py-2 border rounded text-sm"
              placeholder="Optional comment..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-between items-center">
            <button
              onClick={onCancel}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-white"
            >
              Cancel
            </button>
            
            <div className="flex space-x-3">
              <button
                onClick={handleAutoResolve}
                disabled={!selectedStrategy}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Auto-Resolve with {selectedStrategy?.name || 'Selected'}
              </button>
              
              <button
                onClick={handleManualResolve}
                disabled={!customResolution && preview === null}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Apply {customResolution ? 'Custom' : 'Preview'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}