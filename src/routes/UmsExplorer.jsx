import React, { useState, useCallback } from 'react';
import { useUmsQuery } from '../hooks/useUmsQuery';
import { getDocuments, getEntities, postExtract } from '../lib/ums';
import { hybridExtract } from '../lib/ums/hybrid';
import { toast } from 'react-toastify';

export default function UmsExplorer() {
  const [activeTab, setActiveTab] = useState('documents');
  const [searchQuery, setSearchQuery] = useState('');
  const [extractText, setExtractText] = useState('');
  const [extractMode, setExtractMode] = useState('rule');
  const [extracting, setExtracting] = useState(false);
  const [extractResults, setExtractResults] = useState(null);
  const [explainMode, setExplainMode] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);

  // Documents query
  const {
    data: documents,
    loading: docsLoading,
    error: docsError,
    refetch: refetchDocs,
  } = useUmsQuery(
    (signal) => getDocuments(searchQuery, 20, signal),
    [searchQuery],
    {
      enabled: activeTab === 'documents' && searchQuery.length > 0,
      onError: (error) => toast.error(`Documents: ${error.message}`),
    }
  );

  // Entities query
  const {
    data: entities,
    loading: entitiesLoading,
    error: entitiesError,
    refetch: refetchEntities,
  } = useUmsQuery(
    (signal) => getEntities(searchQuery, 20, signal),
    [searchQuery],
    {
      enabled: activeTab === 'entities' && searchQuery.length > 0,
      onError: (error) => toast.error(`Entities: ${error.message}`),
    }
  );

  // Extract handler
  const handleExtract = useCallback(async () => {
    if (!extractText.trim()) {
      toast.warning('Please enter text to extract');
      return;
    }

    setExtracting(true);
    setExtractResults(null);
    setShowReasoning(false);

    try {
      let result;
      
      if (extractMode === 'hybrid' || explainMode) {
        // Use hybrid extraction with explainability
        result = await hybridExtract(extractText, {
          project: 'test',
          persist: false,
          explainReasoning: explainMode,
          confidenceThreshold: 0.7,
        });
        
        if (result.metrics) {
          toast.info(`Hybrid extraction: Rule ${result.metrics.ruleMs}ms, LLM ${result.metrics.llmMs}ms`);
        }
      } else {
        // Use simple extraction
        result = await postExtract(extractText, extractMode);
      }
      
      setExtractResults(result);
      toast.success(`Extracted ${result.entities.length} entities, ${result.edges?.length || 0} edges`);
    } catch (error) {
      toast.error(`Extraction failed: ${error.message}`);
    } finally {
      setExtracting(false);
    }
  }, [extractText, extractMode, explainMode]);

  // Search handler
  const handleSearch = useCallback((e) => {
    e.preventDefault();
    if (activeTab === 'documents') {
      refetchDocs();
    } else if (activeTab === 'entities') {
      refetchEntities();
    }
  }, [activeTab, refetchDocs, refetchEntities]);

  const isLoading = docsLoading || entitiesLoading;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">UMS Explorer</h1>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {['documents', 'entities', 'extract'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                activeTab === tab
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Search Section */}
      {(activeTab === 'documents' || activeTab === 'entities') && (
        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab}...`}
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              type="submit"
              disabled={isLoading || !searchQuery}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Search
            </button>
          </div>
        </form>
      )}

      {/* Documents Tab */}
      {activeTab === 'documents' && (
        <div>
          {docsLoading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              <p className="mt-2 text-gray-600">Loading documents...</p>
            </div>
          )}

          {docsError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              Error: {docsError.message}
            </div>
          )}

          {documents && documents.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No documents found
            </div>
          )}

          {documents && documents.length > 0 && (
            <div className="space-y-4">
              {documents.map((doc) => (
                <div key={doc.id} className="bg-white p-4 rounded-lg shadow border">
                  <h3 className="font-semibold text-lg mb-2">{doc.title}</h3>
                  {doc.url && (
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      {doc.url}
                    </a>
                  )}
                  <p className="mt-2 text-gray-600 text-sm">{doc.snippet}</p>
                  <div className="mt-2 flex gap-4 text-xs text-gray-500">
                    <span>Score: {doc.match_score.toFixed(4)}</span>
                    <span>Project: {doc.project_id}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Entities Tab */}
      {activeTab === 'entities' && (
        <div>
          {entitiesLoading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              <p className="mt-2 text-gray-600">Loading entities...</p>
            </div>
          )}

          {entitiesError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              Error: {entitiesError.message}
            </div>
          )}

          {entities && entities.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No entities found
            </div>
          )}

          {entities && entities.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {entities.map((entity) => (
                <div key={entity.id} className="bg-white p-4 rounded-lg shadow border">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold">{entity.name}</h4>
                      <p className="text-sm text-gray-500">{entity.normalized}</p>
                    </div>
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                      {entity.type}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    <span>Confidence: {(entity.confidence * 100).toFixed(0)}%</span>
                    {entity.project && <span className="ml-2">• {entity.project}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Extract Tab */}
      {activeTab === 'extract' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Extraction Mode
            </label>
            <div className="flex gap-4">
              {['rule', 'llm', 'hybrid'].map((mode) => (
                <label key={mode} className="flex items-center">
                  <input
                    type="radio"
                    value={mode}
                    checked={extractMode === mode}
                    onChange={(e) => setExtractMode(e.target.value)}
                    className="mr-2"
                  />
                  <span className="capitalize">{mode}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={explainMode}
                onChange={(e) => setExplainMode(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm font-medium">Explainability Mode</span>
            </label>
            <span className="text-xs text-gray-500">
              (Shows AI reasoning path and decision process)
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Text to Extract
            </label>
            <textarea
              value={extractText}
              onChange={(e) => setExtractText(e.target.value)}
              placeholder="Enter text to extract entities and relationships..."
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              rows={6}
            />
          </div>

          <button
            onClick={handleExtract}
            disabled={extracting || !extractText.trim()}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {extracting ? 'Extracting...' : 'Extract'}
          </button>

          {/* Results */}
          {extractResults && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">Entities ({extractResults.entities.length})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {extractResults.entities.map((entity, idx) => (
                    <div key={idx} className="bg-gray-50 p-3 rounded border">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{entity.name}</div>
                          <div className="text-sm text-gray-600">{entity.normalized}</div>
                        </div>
                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                          {entity.type}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        Confidence: {(entity.confidence * 100).toFixed(0)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {extractResults.edges.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Relationships ({extractResults.edges.length})</h3>
                  <div className="space-y-2">
                    {extractResults.edges.map((edge, idx) => (
                      <div key={idx} className="bg-gray-50 p-3 rounded border">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">#{edge.source_id}</span>
                          <span className="text-gray-500">→</span>
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                            {edge.type}
                          </span>
                          <span className="text-gray-500">→</span>
                          <span className="font-medium">#{edge.target_id}</span>
                        </div>
                        {edge.context && (
                          <div className="mt-1 text-sm text-gray-600">{edge.context}</div>
                        )}
                        <div className="mt-1 text-xs text-gray-500">
                          Confidence: {(edge.confidence * 100).toFixed(0)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {extractResults.metadata && (
                <div className="text-sm text-gray-500">
                  Mode: {extractResults.metadata.mode} • 
                  Processing time: {extractResults.metadata.processing_ms}ms
                </div>
              )}

              {/* Metrics Display */}
              {extractResults.metrics && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2">Extraction Metrics</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Rule Entities:</span>
                      <span className="ml-1 font-medium">{extractResults.metrics.ruleEntities}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">LLM Entities:</span>
                      <span className="ml-1 font-medium">{extractResults.metrics.llmEntities}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Merged Total:</span>
                      <span className="ml-1 font-medium">{extractResults.metrics.mergedEntities}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Fallback Rate:</span>
                      <span className="ml-1 font-medium">
                        {(extractResults.metrics.fallbackRate * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Rule Time:</span>
                      <span className="ml-1 font-medium">{extractResults.metrics.ruleMs}ms</span>
                    </div>
                    <div>
                      <span className="text-gray-600">LLM Time:</span>
                      <span className="ml-1 font-medium">{extractResults.metrics.llmMs}ms</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Total Time:</span>
                      <span className="ml-1 font-medium">{extractResults.metrics.totalMs}ms</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Reasoning Display */}
              {extractResults.reasoning && extractResults.reasoning.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold">AI Reasoning Path</h4>
                    <button
                      onClick={() => setShowReasoning(!showReasoning)}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      {showReasoning ? 'Hide' : 'Show'} Details
                    </button>
                  </div>
                  
                  {showReasoning && (
                    <div className="space-y-3">
                      {extractResults.reasoning.map((step, idx) => (
                        <div key={idx} className="bg-white p-3 rounded border-l-4 border-blue-400">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-medium text-sm">{step.step}</div>
                              <div className="text-sm text-gray-600 mt-1">{step.details}</div>
                            </div>
                            <div className="flex gap-2 ml-3">
                              <span className={`px-2 py-1 text-xs rounded ${
                                step.method === 'rule' ? 'bg-green-100 text-green-800' :
                                step.method === 'llm' ? 'bg-purple-100 text-purple-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {step.method}
                              </span>
                              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                                {(step.confidence * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                          
                          {step.entities && step.entities.length > 0 && (
                            <div className="mt-2 text-xs text-gray-500">
                              Found: {step.entities.map(e => e.name).join(', ')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}