/**
 * Integration Health Panel Component
 * 
 * Real-time health monitoring dashboard for integrations
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  BoltIcon,
  CpuChipIcon,
  SignalIcon,
} from '@heroicons/react/24/outline';

const IntegrationHealthPanel = ({ integrationId }) => {
  const [healthData, setHealthData] = useState(null);
  const [metrics, setMetrics] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const intervalRef = useRef();

  useEffect(() => {
    loadHealthData();
    
    if (autoRefresh) {
      intervalRef.current = setInterval(loadHealthData, 30000); // 30 seconds
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [integrationId, autoRefresh]);

  const loadHealthData = async () => {
    try {
      const [healthRes, metricsRes, alertsRes] = await Promise.all([
        fetch(`/api/integrations/${integrationId}/health`),
        fetch(`/api/integrations/${integrationId}/metrics?timeRange=1h`),
        fetch(`/api/integrations/${integrationId}/alerts?active=true`),
      ]);

      const [health, metricsData, alertsData] = await Promise.all([
        healthRes.json(),
        metricsRes.json(),
        alertsRes.json(),
      ]);

      setHealthData(health);
      setMetrics(metricsData.timeSeries || []);
      setAlerts(alertsData.alerts || []);
    } catch (error) {
      console.error('Failed to load health data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHealthStatus = () => {
    if (!healthData) return 'unknown';
    
    const { status, checks } = healthData;
    if (status === 'healthy') return 'healthy';
    if (checks.some(check => check.status === 'critical')) return 'critical';
    if (checks.some(check => check.status === 'warning')) return 'warning';
    return 'degraded';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'critical':
        return 'text-red-600 bg-red-100';
      case 'degraded':
        return 'text-orange-600 bg-orange-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case 'critical':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'degraded':
        return <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatDuration = (ms) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatThroughput = (value) => {
    if (value < 1000) return `${value.toFixed(1)}/min`;
    return `${(value / 1000).toFixed(1)}k/min`;
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-center">
          <ArrowPathIcon className="h-6 w-6 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-600">Loading health data...</span>
        </div>
      </div>
    );
  }

  const overallStatus = getHealthStatus();

  return (
    <div className="space-y-6">
      {/* Overall Health Status */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Health Status</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`text-sm px-3 py-1 rounded-md ${
                autoRefresh
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
            </button>
            <button
              onClick={loadHealthData}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <ArrowPathIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {getStatusIcon(overallStatus)}
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-medium text-gray-900 capitalize">
                {overallStatus}
              </span>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(overallStatus)}`}>
                {overallStatus.toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              Last updated: {healthData?.lastChecked ? new Date(healthData.lastChecked).toLocaleTimeString() : 'Unknown'}
            </p>
          </div>
        </div>

        {/* Health Checks */}
        {healthData?.checks && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Health Checks</h3>
            <div className="space-y-2">
              {healthData.checks.map((check, index) => (
                <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-md">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(check.status)}
                    <div>
                      <p className="text-sm font-medium text-gray-900">{check.name}</p>
                      <p className="text-xs text-gray-500">{check.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-900">{formatDuration(check.responseTime)}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(check.lastChecked).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Response Time */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center">
            <ClockIcon className="h-6 w-6 text-blue-500" />
            <h3 className="ml-2 text-lg font-medium text-gray-900">Response Time</h3>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-gray-900">
              {healthData?.metrics?.averageResponseTime ? 
                formatDuration(healthData.metrics.averageResponseTime) : 'N/A'}
            </div>
            <p className="text-sm text-gray-500">Average over last hour</p>
            
            {/* Mini chart would go here */}
            <div className="mt-4 h-16 bg-gradient-to-r from-blue-50 to-blue-100 rounded flex items-end justify-center">
              <span className="text-xs text-gray-500">Chart placeholder</span>
            </div>
          </div>
        </div>

        {/* Throughput */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center">
            <BoltIcon className="h-6 w-6 text-green-500" />
            <h3 className="ml-2 text-lg font-medium text-gray-900">Throughput</h3>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-gray-900">
              {healthData?.metrics?.throughput ? 
                formatThroughput(healthData.metrics.throughput) : 'N/A'}
            </div>
            <p className="text-sm text-gray-500">Requests per minute</p>
            
            <div className="mt-4 h-16 bg-gradient-to-r from-green-50 to-green-100 rounded flex items-end justify-center">
              <span className="text-xs text-gray-500">Chart placeholder</span>
            </div>
          </div>
        </div>

        {/* Error Rate */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
            <h3 className="ml-2 text-lg font-medium text-gray-900">Error Rate</h3>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-gray-900">
              {healthData?.metrics?.errorRate ? 
                `${(healthData.metrics.errorRate * 100).toFixed(2)}%` : 'N/A'}
            </div>
            <p className="text-sm text-gray-500">Error percentage</p>
            
            <div className="mt-4 h-16 bg-gradient-to-r from-red-50 to-red-100 rounded flex items-end justify-center">
              <span className="text-xs text-gray-500">Chart placeholder</span>
            </div>
          </div>
        </div>
      </div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 mr-2" />
            Active Alerts ({alerts.length})
          </h3>
          <div className="space-y-3">
            {alerts.map((alert, index) => (
              <div key={index} className={`p-3 rounded-md border-l-4 ${
                alert.severity === 'critical' 
                  ? 'border-red-500 bg-red-50'
                  : alert.severity === 'warning'
                  ? 'border-yellow-500 bg-yellow-50'
                  : 'border-blue-500 bg-blue-50'
              }`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{alert.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{alert.description}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      Triggered: {new Date(alert.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    alert.severity === 'critical'
                      ? 'bg-red-100 text-red-800'
                      : alert.severity === 'warning'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {alert.severity.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dependency Status */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <SignalIcon className="h-5 w-5 text-gray-500 mr-2" />
          Dependencies
        </h3>
        
        {healthData?.dependencies ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {healthData.dependencies.map((dep, index) => (
              <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-md">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(dep.status)}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{dep.name}</p>
                    <p className="text-xs text-gray-500">{dep.type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-900">{formatDuration(dep.latency)}</p>
                  <p className="text-xs text-gray-500">latency</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No dependencies configured</p>
        )}
      </div>

      {/* System Resources */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <CpuChipIcon className="h-5 w-5 text-gray-500 mr-2" />
          System Resources
        </h3>
        
        {healthData?.resources ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">
                {(healthData.resources.cpuUsage * 100).toFixed(1)}%
              </p>
              <p className="text-sm text-gray-500">CPU Usage</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">
                {(healthData.resources.memoryUsage * 100).toFixed(1)}%
              </p>
              <p className="text-sm text-gray-500">Memory Usage</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">
                {healthData.resources.connections}
              </p>
              <p className="text-sm text-gray-500">Active Connections</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">
                {healthData.resources.queueLength}
              </p>
              <p className="text-sm text-gray-500">Queue Length</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Resource monitoring not available</p>
        )}
      </div>
    </div>
  );
};

export default IntegrationHealthPanel;