/**
 * Integration Configuration Panel Component
 * 
 * Advanced configuration UI for integration setup and management
 */

import React, { useState, useEffect } from 'react';
import {
  CogIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  KeyIcon,
  GlobeAltIcon,
  ClockIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

const IntegrationConfigPanel = ({ integration, onSave, onCancel }) => {
  const [config, setConfig] = useState(integration?.config || {});
  const [credentials, setCredentials] = useState([]);
  const [activeTab, setActiveTab] = useState('general');
  const [validation, setValidation] = useState({ errors: [], warnings: [] });
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (integration) {
      loadCredentials();
      validateConfiguration();
    }
  }, [integration]);

  useEffect(() => {
    validateConfiguration();
  }, [config]);

  const loadCredentials = async () => {
    try {
      const response = await fetch(`/api/integrations/${integration.id}/credentials`);
      const data = await response.json();
      setCredentials(data.data || []);
    } catch (error) {
      console.error('Failed to load credentials:', error);
    }
  };

  const validateConfiguration = () => {
    const errors = [];
    const warnings = [];

    // Basic validation
    if (!config.baseUrl && ['rest', 'graphql'].includes(integration?.connectorType)) {
      errors.push('Base URL is required for REST and GraphQL connectors');
    }

    if (config.baseUrl && !isValidUrl(config.baseUrl)) {
      errors.push('Base URL must be a valid URL');
    }

    if (config.timeout && (config.timeout < 1000 || config.timeout > 300000)) {
      warnings.push('Timeout should be between 1 second and 5 minutes');
    }

    if (config.retryPolicy?.maxRetries > 10) {
      warnings.push('High retry count may cause performance issues');
    }

    // Security validation
    if (config.headers && config.headers['Authorization']) {
      warnings.push('Avoid storing credentials in headers, use dedicated credential management');
    }

    setValidation({ errors, warnings });
  };

  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleConfigChange = (path, value) => {
    const newConfig = { ...config };
    const keys = path.split('.');
    let current = newConfig;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    setConfig(newConfig);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch(`/api/integrations/${integration.id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });
      
      const result = await response.json();
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        error: error.message,
        details: { connectionTest: 'Failed to connect to test endpoint' },
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (validation.errors.length > 0) {
      alert('Please fix validation errors before saving');
      return;
    }

    setSaving(true);
    try {
      await onSave({ ...integration, config });
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'general', name: 'General', icon: CogIcon },
    { id: 'auth', name: 'Authentication', icon: ShieldCheckIcon },
    { id: 'advanced', name: 'Advanced', icon: DocumentTextIcon },
    { id: 'test', name: 'Test', icon: CheckCircleIcon },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">
            Configure Integration
          </h2>
          <div className="flex space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || validation.errors.length > 0}
              className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin inline" />
                  Saving...
                </>
              ) : (
                'Save Configuration'
              )}
            </button>
          </div>
        </div>

        {/* Validation Messages */}
        {(validation.errors.length > 0 || validation.warnings.length > 0) && (
          <div className="mt-4 space-y-2">
            {validation.errors.map((error, index) => (
              <div key={index} className="flex items-center text-sm text-red-600">
                <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
                {error}
              </div>
            ))}
            {validation.warnings.map((warning, index) => (
              <div key={index} className="flex items-center text-sm text-yellow-600">
                <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
                {warning}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
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
      <div className="p-6">
        {activeTab === 'general' && (
          <GeneralConfig 
            config={config} 
            integration={integration}
            onChange={handleConfigChange}
          />
        )}
        {activeTab === 'auth' && (
          <AuthConfig 
            config={config}
            integration={integration}
            credentials={credentials}
            onChange={handleConfigChange}
            onCredentialsUpdate={loadCredentials}
          />
        )}
        {activeTab === 'advanced' && (
          <AdvancedConfig 
            config={config}
            integration={integration}
            onChange={handleConfigChange}
          />
        )}
        {activeTab === 'test' && (
          <TestConfig 
            integration={integration}
            config={config}
            testResult={testResult}
            testing={testing}
            onTest={handleTestConnection}
          />
        )}
      </div>
    </div>
  );
};

// General Configuration Tab
const GeneralConfig = ({ config, integration, onChange }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Settings</h3>
        
        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Integration Name
            </label>
            <input
              type="text"
              value={integration?.name || ''}
              disabled
              className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 text-gray-500 shadow-sm"
            />
            <p className="mt-1 text-sm text-gray-500">
              Name cannot be changed after creation
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              value={integration?.description || ''}
              onChange={(e) => onChange('description', e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Describe what this integration does..."
            />
          </div>

          {(integration?.connectorType === 'rest' || integration?.connectorType === 'graphql') && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Base URL *
              </label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                  <GlobeAltIcon className="h-4 w-4" />
                </span>
                <input
                  type="url"
                  value={config.baseUrl || ''}
                  onChange={(e) => onChange('baseUrl', e.target.value)}
                  className="flex-1 rounded-none rounded-r-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="https://api.example.com"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Request Timeout (ms)
            </label>
            <div className="mt-1 flex rounded-md shadow-sm">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                <ClockIcon className="h-4 w-4" />
              </span>
              <input
                type="number"
                value={config.timeout || 30000}
                onChange={(e) => onChange('timeout', parseInt(e.target.value))}
                className="flex-1 rounded-none rounded-r-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                min="1000"
                max="300000"
              />
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Timeout for API requests (1,000 - 300,000 ms)
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Retry Policy</h3>
        
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Max Retries
            </label>
            <input
              type="number"
              value={config.retryPolicy?.maxRetries || 3}
              onChange={(e) => onChange('retryPolicy.maxRetries', parseInt(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              min="0"
              max="10"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Backoff (ms)
            </label>
            <input
              type="number"
              value={config.retryPolicy?.backoffMs || 1000}
              onChange={(e) => onChange('retryPolicy.backoffMs', parseInt(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              min="100"
              max="60000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Backoff Multiplier
            </label>
            <input
              type="number"
              step="0.1"
              value={config.retryPolicy?.backoffMultiplier || 2}
              onChange={(e) => onChange('retryPolicy.backoffMultiplier', parseFloat(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              min="1"
              max="5"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Authentication Configuration Tab
const AuthConfig = ({ config, integration, credentials, onChange, onCredentialsUpdate }) => {
  const [showAddCredential, setShowAddCredential] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Authentication</h3>
        <button
          onClick={() => setShowAddCredential(true)}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200"
        >
          <PlusIcon className="h-4 w-4 mr-1" />
          Add Credential
        </button>
      </div>

      {/* Existing Credentials */}
      {credentials.length > 0 ? (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-900">Configured Credentials</h4>
          {credentials.map((credential) => (
            <CredentialCard 
              key={credential.id} 
              credential={credential}
              onUpdate={onCredentialsUpdate}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
          <KeyIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No credentials configured</h3>
          <p className="mt-1 text-sm text-gray-500">
            Add credentials to authenticate with external services
          </p>
          <button
            onClick={() => setShowAddCredential(true)}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add First Credential
          </button>
        </div>
      )}

      {/* Default Headers */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-3">Default Headers</h4>
        <HeadersEditor 
          headers={config.headers || {}}
          onChange={(headers) => onChange('headers', headers)}
        />
      </div>

      {showAddCredential && (
        <AddCredentialModal
          integrationId={integration.id}
          onClose={() => setShowAddCredential(false)}
          onAdd={onCredentialsUpdate}
        />
      )}
    </div>
  );
};

// Advanced Configuration Tab
const AdvancedConfig = ({ config, onChange }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Advanced Settings</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Query Parameters
            </label>
            <QueryParamsEditor 
              params={config.queryParams || {}}
              onChange={(params) => onChange('queryParams', params)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Custom Settings
            </label>
            <textarea
              value={JSON.stringify(config.customSettings || {}, null, 2)}
              onChange={(e) => {
                try {
                  const settings = JSON.parse(e.target.value);
                  onChange('customSettings', settings);
                } catch (error) {
                  // Invalid JSON, ignore
                }
              }}
              rows={8}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 font-mono text-sm"
              placeholder='{\n  "customOption": "value"\n}'
            />
            <p className="mt-1 text-sm text-gray-500">
              JSON configuration for connector-specific settings
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Test Configuration Tab
const TestConfig = ({ integration, config, testResult, testing, onTest }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Connection Test</h3>
        <button
          onClick={onTest}
          disabled={testing}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        >
          {testing ? (
            <>
              <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <CheckCircleIcon className="h-4 w-4 mr-2" />
              Test Connection
            </>
          )}
        </button>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-sm text-gray-600">
          Test the current configuration to verify connectivity and authentication.
          This will attempt to connect to the configured endpoint using your settings.
        </p>
      </div>

      {testResult && (
        <div className={`border rounded-lg p-4 ${
          testResult.success 
            ? 'border-green-200 bg-green-50' 
            : 'border-red-200 bg-red-50'
        }`}>
          <div className="flex items-center mb-3">
            {testResult.success ? (
              <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
            ) : (
              <XMarkIcon className="h-5 w-5 text-red-500 mr-2" />
            )}
            <span className={`font-medium ${
              testResult.success ? 'text-green-800' : 'text-red-800'
            }`}>
              {testResult.success ? 'Connection Successful' : 'Connection Failed'}
            </span>
          </div>

          {testResult.details && (
            <div className="space-y-2">
              {Object.entries(testResult.details).map(([key, value]) => (
                <div key={key} className="text-sm">
                  <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}: </span>
                  <span className={testResult.success ? 'text-green-700' : 'text-red-700'}>
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {testResult.error && (
            <div className="mt-3 text-sm text-red-700">
              <span className="font-medium">Error: </span>
              {testResult.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Helper Components
const CredentialCard = ({ credential, onUpdate }) => {
  const [showDetails, setShowDetails] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this credential?')) return;

    try {
      const response = await fetch(`/api/credentials/${credential.id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        onUpdate();
      }
    } catch (error) {
      alert(`Failed to delete credential: ${error.message}`);
    }
  };

  return (
    <div className="border border-gray-200 rounded-md p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <KeyIcon className="h-5 w-5 text-gray-400" />
          <div>
            <h4 className="text-sm font-medium text-gray-900">{credential.name}</h4>
            <p className="text-xs text-gray-500 capitalize">{credential.type}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            credential.status === 'active' 
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {credential.status}
          </span>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-gray-400 hover:text-gray-600"
          >
            {showDetails ? (
              <EyeSlashIcon className="h-4 w-4" />
            ) : (
              <EyeIcon className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={handleDelete}
            className="text-gray-400 hover:text-red-600"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {showDetails && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <dl className="text-xs space-y-1">
            <div>
              <dt className="inline font-medium text-gray-500">Created: </dt>
              <dd className="inline text-gray-700">
                {new Date(credential.createdAt).toLocaleDateString()}
              </dd>
            </div>
            {credential.expiresAt && (
              <div>
                <dt className="inline font-medium text-gray-500">Expires: </dt>
                <dd className="inline text-gray-700">
                  {new Date(credential.expiresAt).toLocaleDateString()}
                </dd>
              </div>
            )}
            <div>
              <dt className="inline font-medium text-gray-500">Last Used: </dt>
              <dd className="inline text-gray-700">
                {credential.lastUsed 
                  ? new Date(credential.lastUsed).toLocaleDateString()
                  : 'Never'
                }
              </dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
};

const HeadersEditor = ({ headers, onChange }) => {
  const [entries, setEntries] = useState(
    Object.entries(headers).map(([key, value]) => ({ key, value, id: Math.random() }))
  );

  const updateHeaders = (newEntries) => {
    const newHeaders = {};
    newEntries.forEach(entry => {
      if (entry.key && entry.value) {
        newHeaders[entry.key] = entry.value;
      }
    });
    onChange(newHeaders);
  };

  const addEntry = () => {
    const newEntries = [...entries, { key: '', value: '', id: Math.random() }];
    setEntries(newEntries);
  };

  const removeEntry = (id) => {
    const newEntries = entries.filter(entry => entry.id !== id);
    setEntries(newEntries);
    updateHeaders(newEntries);
  };

  const updateEntry = (id, field, value) => {
    const newEntries = entries.map(entry => 
      entry.id === id ? { ...entry, [field]: value } : entry
    );
    setEntries(newEntries);
    updateHeaders(newEntries);
  };

  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <div key={entry.id} className="flex space-x-2">
          <input
            type="text"
            value={entry.key}
            onChange={(e) => updateEntry(entry.id, 'key', e.target.value)}
            placeholder="Header name"
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
          />
          <input
            type="text"
            value={entry.value}
            onChange={(e) => updateEntry(entry.id, 'value', e.target.value)}
            placeholder="Header value"
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
          />
          <button
            onClick={() => removeEntry(entry.id)}
            className="text-gray-400 hover:text-red-600"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      ))}
      
      <button
        onClick={addEntry}
        className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
      >
        <PlusIcon className="h-4 w-4 mr-1" />
        Add Header
      </button>
    </div>
  );
};

const QueryParamsEditor = ({ params, onChange }) => {
  // Similar implementation to HeadersEditor
  return <div>Query parameters editor (similar to headers)</div>;
};

const AddCredentialModal = ({ integrationId, onClose, onAdd }) => {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Add Credential</h2>
        <p className="text-sm text-gray-500">Credential creation form coming soon...</p>
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

export default IntegrationConfigPanel;