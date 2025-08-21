// Audit and compliance dashboard for tracking system activities
import React, { useState, useEffect } from 'react';
import { auditService } from '../services/auditService';
import { useAuth } from '../contexts/AuthContext';
import { RequireRole } from '../utils/RequireRole';
import { logger } from '../utils/logger';

/**
 * AuditDashboard - Interface for viewing and analyzing audit logs
 */
const AuditDashboard = () => {
  const { user } = useAuth();
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    resource: '',
    action: '',
    userId: '',
    limit: 100
  });
  const [complianceReport, setComplianceReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  // Load audit logs on component mount and filter changes
  useEffect(() => {
    loadAuditLogs();
  }, [filters]);

  const loadAuditLogs = async () => {
    setLoading(true);
    setError(null);

    try {
      logger.info('Loading audit logs', { filters });

      const logs = await auditService.queryAuditLogs(filters);
      setAuditLogs(logs);

      logger.info('Audit logs loaded successfully', { 
        count: logs.length,
        filters 
      });

    } catch (err) {
      logger.error('Failed to load audit logs', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateComplianceReport = async (days = 30) => {
    setReportLoading(true);

    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);

      logger.info('Generating compliance report', { 
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });

      const report = await auditService.generateComplianceReport(startDate, endDate);
      setComplianceReport(report);

      logger.info('Compliance report generated', {
        totalEvents: report.summary.totalEvents,
        dateRange: report.summary.dateRange
      });

    } catch (err) {
      logger.error('Failed to generate compliance report', err);
      alert(`Failed to generate report: ${err.message}`);
    } finally {
      setReportLoading(false);
    }
  };

  const exportAuditLogs = () => {
    try {
      const csvContent = convertLogsToCSV(auditLogs);
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      logger.info('Audit logs exported', { count: auditLogs.length });

    } catch (err) {
      logger.error('Failed to export audit logs', err);
      alert(`Export failed: ${err.message}`);
    }
  };

  const convertLogsToCSV = (logs) => {
    const headers = [
      'Timestamp',
      'Action',
      'Resource',
      'Resource ID',
      'User Email',
      'User Role',
      'Changes',
      'Metadata',
      'Severity'
    ];

    const csvRows = [
      headers.join(','),
      ...logs.map(log => {
        const timestamp = log.createdAt?.toDate ? 
          log.createdAt.toDate().toISOString() : 
          new Date(log.createdAt).toISOString();

        return [
          timestamp,
          log.action,
          log.resource,
          log.resourceId,
          log.userEmail,
          log.userRole,
          JSON.stringify(log.changes).replace(/"/g, '""'),
          JSON.stringify(log.metadata).replace(/"/g, '""'),
          log.severity
        ].map(field => `"${field}"`).join(',');
      })
    ];

    return csvRows.join('\n');
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      resource: '',
      action: '',
      userId: '',
      limit: 100
    });
  };

  if (loading) {
    return <AuditDashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Audit Dashboard</h1>
                <p className="text-gray-600">System activity monitoring and compliance</p>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => generateComplianceReport(30)}
                  disabled={reportLoading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {reportLoading ? 'Generating...' : 'Generate Report'}
                </button>
                <button
                  onClick={exportAuditLogs}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                >
                  Export CSV
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Filters</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resource Type
              </label>
              <select
                value={filters.resource}
                onChange={(e) => handleFilterChange('resource', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">All Resources</option>
                <option value="release">Releases</option>
                <option value="customer">Customers</option>
                <option value="barcode">Barcodes</option>
                <option value="authentication">Authentication</option>
                <option value="security">Security</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Action
              </label>
              <select
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">All Actions</option>
                <option value="create">Create</option>
                <option value="update">Update</option>
                <option value="delete">Delete</option>
                <option value="login">Login</option>
                <option value="logout">Logout</option>
                <option value="status_change">Status Change</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                User ID
              </label>
              <input
                type="text"
                value={filters.userId}
                onChange={(e) => handleFilterChange('userId', e.target.value)}
                placeholder="Enter user ID"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Limit
              </label>
              <select
                value={filters.limit}
                onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value={50}>50 records</option>
                <option value={100}>100 records</option>
                <option value={500}>500 records</option>
                <option value={1000}>1000 records</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex space-x-3">
            <button
              onClick={loadAuditLogs}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
            >
              Apply Filters
            </button>
            <button
              onClick={clearFilters}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Compliance Report */}
        {complianceReport && (
          <ComplianceReportView 
            report={complianceReport} 
            onClose={() => setComplianceReport(null)}
          />
        )}

        {/* Audit Logs Table */}
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center">
              <div className="text-red-400 text-xl mr-3">⚠️</div>
              <div>
                <h3 className="text-red-800 font-medium">Error Loading Audit Logs</h3>
                <p className="text-red-600 mt-1">{error}</p>
              </div>
            </div>
          </div>
        ) : (
          <AuditLogsTable logs={auditLogs} />
        )}
      </div>
    </div>
  );
};

// Audit Logs Table Component
const AuditLogsTable = ({ logs }) => {
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };

  if (logs.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center">
          <div className="text-gray-400 text-4xl mb-3">📋</div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No audit logs found</h3>
          <p className="text-gray-600">Try adjusting your filters or date range</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">
          Audit Logs ({logs.length} records)
        </h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Timestamp
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Resource
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Severity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Details
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {logs.map((log, index) => (
              <tr key={log.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatTimestamp(log.createdAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {log.action}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {log.resource}
                  {log.resourceId !== 'bulk' && (
                    <div className="text-xs text-gray-500">ID: {log.resourceId}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {log.userName || log.userEmail}
                  <div className="text-xs text-gray-500">{log.userRole}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(log.severity)}`}>
                    {log.severity}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {Object.keys(log.changes).length > 0 && (
                    <details className="cursor-pointer">
                      <summary className="text-blue-600 hover:text-blue-800">
                        View Changes
                      </summary>
                      <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                        {JSON.stringify(log.changes, null, 2)}
                      </pre>
                    </details>
                  )}
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <details className="cursor-pointer mt-1">
                      <summary className="text-gray-600 hover:text-gray-800">
                        Metadata
                      </summary>
                      <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    </details>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Compliance Report View Component
const ComplianceReportView = ({ report, onClose }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900">Compliance Report</h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{report.summary.totalEvents}</div>
          <div className="text-sm text-gray-600">Total Events</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{report.summary.securityEvents}</div>
          <div className="text-sm text-gray-600">Security Events</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-600">{report.summary.criticalEvents}</div>
          <div className="text-sm text-gray-600">Critical Events</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="font-medium text-gray-900 mb-3">User Activity</h4>
          <div className="space-y-2">
            {Object.entries(report.summary.userActivity).slice(0, 5).map(([userId, stats]) => (
              <div key={userId} className="flex justify-between">
                <span className="text-sm text-gray-600 truncate">{stats.email}</span>
                <span className="text-sm font-medium">{stats.actions} actions</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-medium text-gray-900 mb-3">Resource Activity</h4>
          <div className="space-y-2">
            {Object.entries(report.summary.resourceActivity).map(([resource, stats]) => (
              <div key={resource} className="flex justify-between">
                <span className="text-sm text-gray-600 capitalize">{resource}</span>
                <span className="text-sm font-medium">{stats.total} events</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Loading skeleton
const AuditDashboardSkeleton = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded mb-8 w-1/3"></div>
          <div className="bg-white rounded-lg p-6 mb-8">
            <div className="h-6 bg-gray-300 rounded mb-4 w-1/4"></div>
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-10 bg-gray-300 rounded"></div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-lg p-6">
            <div className="h-6 bg-gray-300 rounded mb-4 w-1/4"></div>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-4 bg-gray-300 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Wrap with role requirement
export default function ProtectedAuditDashboard() {
  return (
    <RequireRole role={['admin', 'office']}>
      <AuditDashboard />
    </RequireRole>
  );
}