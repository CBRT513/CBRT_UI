/**
 * Integration Manager Component
 * 
 * Main UI for managing integrations, credentials, and monitoring
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  PlusIcon, 
  CogIcon, 
  ChartBarIcon, 
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  EyeIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

const IntegrationManager = () => {
  const [integrations, setIntegrations] = useState([]);
  const [selectedIntegration, setSelectedIntegration] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: 'all', type: 'all' });
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Load integrations on mount
  useEffect(() => {
    loadIntegrations();
  }, [filter]);

  const loadIntegrations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/integrations?' + new URLSearchParams({
        ...(filter.status !== 'all' && { status: filter.status }),
        ...(filter.type !== 'all' && { connectorType: filter.type }),
      }));
      const data = await response.json();
      setIntegrations(data.data || []);
    } catch (error) {
      console.error('Failed to load integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredIntegrations = useMemo(() => {
    return integrations.filter(integration => {
      const statusMatch = filter.status === 'all' || integration.status === filter.status;
      const typeMatch = filter.type === 'all' || integration.connectorType === filter.type;
      return statusMatch && typeMatch;
    });
  }, [integrations, filter]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'pending':
        return <ArrowPathIcon className="h-5 w-5 text-yellow-500 animate-spin" />;
      default:
        return <ExclamationTriangleIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const handleCreateIntegration = () => {
    setShowCreateModal(true);
  };

  const handleTestConnection = async (integrationId) => {
    try {
      const response = await fetch(`/api/integrations/${integrationId}/test`, {
        method: 'POST',
      });
      const result = await response.json();
      
      if (result.success) {
        alert('Connection test successful!');
      } else {
        alert(`Connection test failed: ${result.error}`);
      }
    } catch (error) {
      alert(`Test failed: ${error.message}`);
    }
  };

  const handleDeleteIntegration = async (integrationId) => {
    if (!confirm('Are you sure you want to delete this integration?')) return;

    try {
      const response = await fetch(`/api/integrations/${integrationId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setIntegrations(prev => prev.filter(i => i.id !== integrationId));
        if (selectedIntegration?.id === integrationId) {
          setSelectedIntegration(null);
        }
      } else {
        const error = await response.json();
        alert(`Failed to delete: ${error.message}`);
      }
    } catch (error) {
      alert(`Delete failed: ${error.message}`);
    }
  };

  const tabs = [
    { id: 'overview', name: 'Overview', icon: ChartBarIcon },
    { id: 'config', name: 'Configuration', icon: CogIcon },
    { id: 'credentials', name: 'Credentials', icon: ShieldCheckIcon },
    { id: 'monitoring', name: 'Monitoring', icon: ChartBarIcon },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <ArrowPathIcon className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Loading integrations...</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Integration Manager</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage external system integrations and connections
            </p>
          </div>
          <button
            onClick={handleCreateIntegration}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            New Integration
          </button>
        </div>

        {/* Filters */}
        <div className="mt-4 flex space-x-4">
          <select
            value={filter.status}
            onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value }))}
            className="rounded-md border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="error">Error</option>
            <option value="pending">Pending</option>
          </select>

          <select
            value={filter.type}
            onChange={(e) => setFilter(prev => ({ ...prev, type: e.target.value }))}
            className="rounded-md border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="rest">REST API</option>
            <option value="graphql">GraphQL</option>
            <option value="grpc">gRPC</option>
            <option value="stream">Stream</option>
          </select>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Integration List */}
        <div className="w-1/3 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Integrations ({filteredIntegrations.length})
            </h2>
            
            {filteredIntegrations.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No integrations found</p>
                <button
                  onClick={handleCreateIntegration}
                  className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                >
                  Create your first integration
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredIntegrations.map((integration) => (
                  <div
                    key={integration.id}
                    onClick={() => setSelectedIntegration(integration)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedIntegration?.id === integration.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center">
                          {getStatusIcon(integration.status)}
                          <h3 className="ml-2 text-sm font-medium text-gray-900 truncate">
                            {integration.name}
                          </h3>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {integration.connectorType} • {integration.connectorVersion}
                        </p>
                        {integration.description && (
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                            {integration.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                      <span>Updated {new Date(integration.updatedAt).toLocaleDateString()}</span>
                      <div className="flex space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTestConnection(integration.id);
                          }}
                          className="p-1 hover:text-blue-600"
                          title="Test Connection"
                        >
                          <EyeIcon className="h-3 w-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteIntegration(integration.id);
                          }}
                          className="p-1 hover:text-red-600"
                          title="Delete Integration"
                        >
                          <TrashIcon className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Integration Details */}
        <div className="flex-1 flex flex-col">
          {selectedIntegration ? (
            <>
              {/* Tab Navigation */}
              <div className="bg-white border-b border-gray-200">
                <nav className="flex space-x-8 px-6" aria-label="Tabs">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                          activeTab === tab.id
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <Icon className="h-4 w-4 mr-2" />
                        {tab.name}
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto">
                {activeTab === 'overview' && (
                  <IntegrationOverview integration={selectedIntegration} />
                )}
                {activeTab === 'config' && (
                  <IntegrationConfig 
                    integration={selectedIntegration}
                    onUpdate={loadIntegrations}
                  />
                )}
                {activeTab === 'credentials' && (
                  <IntegrationCredentials integration={selectedIntegration} />
                )}
                {activeTab === 'monitoring' && (
                  <IntegrationMonitoring integration={selectedIntegration} />
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No integration selected</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Select an integration from the list to view details
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Integration Modal */}
      {showCreateModal && (
        <CreateIntegrationModal
          onClose={() => setShowCreateModal(false)}
          onCreate={loadIntegrations}
        />
      )}
    </div>
  );
};

// Sub-components
const IntegrationOverview = ({ integration }) => {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    loadMetrics();
  }, [integration.id]);

  const loadMetrics = async () => {
    try {
      const response = await fetch(`/api/integrations/${integration.id}/metrics`);
      const data = await response.json();
      setMetrics(data);
    } catch (error) {
      console.error('Failed to load metrics:', error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Status Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Status</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Current Status</dt>
            <dd className="mt-1 flex items-center text-sm text-gray-900">
              {getStatusIcon(integration.status)}
              <span className="ml-2 capitalize">{integration.status}</span>
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {new Date(integration.updatedAt).toLocaleString()}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Created By</dt>
            <dd className="mt-1 text-sm text-gray-900">{integration.createdBy}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Connector Version</dt>
            <dd className="mt-1 text-sm text-gray-900">{integration.connectorVersion}</dd>
          </div>
        </div>
      </div>

      {/* Metrics Card */}
      {metrics && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Metrics</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <dt className="text-sm font-medium text-gray-500">Total Requests</dt>
              <dd className="mt-1 text-2xl font-semibold text-gray-900">
                {metrics.totalRequests?.toLocaleString() || 0}
              </dd>
            </div>
            <div className="text-center">
              <dt className="text-sm font-medium text-gray-500">Success Rate</dt>
              <dd className="mt-1 text-2xl font-semibold text-green-600">
                {((metrics.successfulRequests / metrics.totalRequests) * 100 || 0).toFixed(1)}%
              </dd>
            </div>
            <div className="text-center">
              <dt className="text-sm font-medium text-gray-500">Avg Response Time</dt>
              <dd className="mt-1 text-2xl font-semibold text-blue-600">
                {metrics.averageResponseTime?.toFixed(0) || 0}ms
              </dd>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Summary */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Configuration</h3>
        <dl className="space-y-2">
          {integration.config.baseUrl && (
            <div>
              <dt className="inline text-sm font-medium text-gray-500">Base URL: </dt>
              <dd className="inline text-sm text-gray-900">{integration.config.baseUrl}</dd>
            </div>
          )}
          {integration.config.timeout && (
            <div>
              <dt className="inline text-sm font-medium text-gray-500">Timeout: </dt>
              <dd className="inline text-sm text-gray-900">{integration.config.timeout}ms</dd>
            </div>
          )}
          <div>
            <dt className="inline text-sm font-medium text-gray-500">Credentials: </dt>
            <dd className="inline text-sm text-gray-900">
              {integration.credentials?.length || 0} configured
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
};

const IntegrationConfig = ({ integration, onUpdate }) => {
  const [config, setConfig] = useState(integration.config);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch(`/api/integrations/${integration.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });

      if (response.ok) {
        onUpdate();
        alert('Configuration saved successfully');
      } else {
        const error = await response.json();
        alert(`Failed to save: ${error.message}`);
      }
    } catch (error) {
      alert(`Save failed: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Integration Configuration
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Base URL</label>
              <input
                type="url"
                value={config.baseUrl || ''}
                onChange={(e) => setConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="https://api.example.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Timeout (ms)</label>
                <input
                  type="number"
                  value={config.timeout || 30000}
                  onChange={(e) => setConfig(prev => ({ ...prev, timeout: parseInt(e.target.value) }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Max Retries</label>
                <input
                  type="number"
                  value={config.retryPolicy?.maxRetries || 3}
                  onChange={(e) => setConfig(prev => ({ 
                    ...prev, 
                    retryPolicy: { ...prev.retryPolicy, maxRetries: parseInt(e.target.value) }
                  }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Custom Headers</label>
              <textarea
                value={JSON.stringify(config.headers || {}, null, 2)}
                onChange={(e) => {
                  try {
                    const headers = JSON.parse(e.target.value);
                    setConfig(prev => ({ ...prev, headers }));
                  } catch (error) {
                    // Invalid JSON, ignore
                  }
                }}
                rows={4}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 font-mono text-sm"
                placeholder='{\n  "X-Custom-Header": "value"\n}'
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {saving ? (
                <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const IntegrationCredentials = ({ integration }) => {
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCredentials();
  }, [integration.id]);

  const loadCredentials = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/integrations/${integration.id}/credentials`);
      const data = await response.json();
      setCredentials(data.data || []);
    } catch (error) {
      console.error('Failed to load credentials:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center">
          <ArrowPathIcon className="h-5 w-5 animate-spin text-blue-500" />
          <span className="ml-2">Loading credentials...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Credentials</h3>
            <button
              onClick={() => {/* Handle add credential */}}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Credential
            </button>
          </div>

          {credentials.length === 0 ? (
            <div className="text-center py-8">
              <ShieldCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">No credentials configured</p>
            </div>
          ) : (
            <div className="space-y-3">
              {credentials.map((credential) => (
                <div key={credential.id} className="border border-gray-200 rounded-md p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">{credential.name}</h4>
                      <p className="text-xs text-gray-500 capitalize">{credential.type}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        credential.status === 'active' 
                          ? 'bg-green-100 text-green-800'
                          : credential.status === 'expired'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {credential.status}
                      </span>
                      <button className="text-gray-400 hover:text-gray-600">
                        <CogIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {credential.expiresAt && (
                    <p className="text-xs text-gray-500 mt-1">
                      Expires: {new Date(credential.expiresAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const IntegrationMonitoring = ({ integration }) => {
  return (
    <div className="p-6">
      <div className="text-center py-8">
        <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-500">Monitoring dashboard coming soon</p>
      </div>
    </div>
  );
};

const CreateIntegrationModal = ({ onClose, onCreate }) => {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Create Integration</h2>
        <p className="text-sm text-gray-500">Integration creation form coming soon...</p>
        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default IntegrationManager;