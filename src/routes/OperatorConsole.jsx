// KPI dashboard and operational console for managers and administrators
import React, { useState, useEffect } from 'react';
import { useFirestoreCollection } from '../hooks/useFirestore';
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { RequireRole } from '../utils/RequireRole';
import { logger } from '../utils/logger';

/**
 * OperatorConsole - Executive dashboard with KPIs and operational metrics
 */
const OperatorConsole = () => {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState('today');
  const [metrics, setMetrics] = useState({
    loading: true,
    data: null,
    error: null
  });

  // Load metrics based on date range
  useEffect(() => {
    loadMetrics();
  }, [dateRange]);

  const getDateRange = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (dateRange) {
      case 'today':
        return {
          start: today,
          end: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        };
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        return {
          start: weekStart,
          end: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
        };
      case 'month':
        return {
          start: new Date(now.getFullYear(), now.getMonth(), 1),
          end: new Date(now.getFullYear(), now.getMonth() + 1, 1)
        };
      default:
        return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
    }
  };

  const loadMetrics = async () => {
    setMetrics({ loading: true, data: null, error: null });

    try {
      const { start, end } = getDateRange();
      const startTimestamp = Timestamp.fromDate(start);
      const endTimestamp = Timestamp.fromDate(end);

      logger.info('Loading dashboard metrics', {
        dateRange,
        start: start.toISOString(),
        end: end.toISOString()
      });

      // Parallel queries for performance
      const [
        releasesSnapshot,
        barcodesSnapshot,
        recentReleasesSnapshot,
        statusCountsSnapshot
      ] = await Promise.all([
        // Total releases in date range
        getDocs(query(
          collection(db, 'releases'),
          where('createdAt', '>=', startTimestamp),
          where('createdAt', '<', endTimestamp)
        )),
        
        // Barcode activity in date range
        getDocs(query(
          collection(db, 'barcodes'),
          where('updatedAt', '>=', startTimestamp),
          where('updatedAt', '<', endTimestamp)
        )),
        
        // Recent releases for activity feed
        getDocs(query(
          collection(db, 'releases'),
          orderBy('createdAt', 'desc'),
          limit(10)
        )),
        
        // All releases for status breakdown
        getDocs(collection(db, 'releases'))
      ]);

      // Process metrics
      const releases = releasesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const barcodes = barcodesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const recentReleases = recentReleasesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const allReleases = statusCountsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Calculate metrics
      const metricsData = {
        releases: {
          total: releases.length,
          completed: releases.filter(r => r.status === 'Complete').length,
          inProgress: releases.filter(r => ['Staged', 'Verified', 'Loading', 'Loaded'].includes(r.status)).length,
          totalWeight: releases.reduce((sum, r) => sum + (parseFloat(r.TotalWeight) || 0), 0),
          totalItems: releases.reduce((sum, r) => sum + (parseInt(r.TotalItems) || 0), 0)
        },
        
        barcodes: {
          scanned: barcodes.length,
          available: barcodes.filter(b => b.status === 'Available').length,
          reserved: barcodes.filter(b => b.status === 'Reserved').length,
          shipped: barcodes.filter(b => b.status === 'Shipped').length
        },
        
        status: {
          entered: allReleases.filter(r => r.status === 'Entered').length,
          staged: allReleases.filter(r => r.status === 'Staged').length,
          verified: allReleases.filter(r => r.status === 'Verified').length,
          loading: allReleases.filter(r => r.status === 'Loading').length,
          loaded: allReleases.filter(r => r.status === 'Loaded').length,
          complete: allReleases.filter(r => r.status === 'Complete').length
        },
        
        recent: recentReleases.slice(0, 5),
        
        performance: {
          avgProcessingTime: calculateAvgProcessingTime(releases),
          bottlenecks: identifyBottlenecks(allReleases),
          efficiency: calculateEfficiency(releases)
        }
      };

      setMetrics({ loading: false, data: metricsData, error: null });

      logger.info('Dashboard metrics loaded successfully', {
        dateRange,
        totalReleases: metricsData.releases.total,
        totalBarcodes: metricsData.barcodes.scanned
      });

    } catch (error) {
      logger.error('Failed to load dashboard metrics', error);
      setMetrics({ loading: false, data: null, error: error.message });
    }
  };

  const calculateAvgProcessingTime = (releases) => {
    const completedReleases = releases.filter(r => 
      r.status === 'Complete' && r.createdAt && r.completedAt
    );

    if (completedReleases.length === 0) return 0;

    const totalTime = completedReleases.reduce((sum, release) => {
      const start = release.createdAt.toDate ? release.createdAt.toDate() : new Date(release.createdAt);
      const end = release.completedAt.toDate ? release.completedAt.toDate() : new Date(release.completedAt);
      return sum + (end - start);
    }, 0);

    return Math.round(totalTime / completedReleases.length / (1000 * 60 * 60)); // Hours
  };

  const identifyBottlenecks = (releases) => {
    const statusCounts = releases.reduce((acc, release) => {
      acc[release.status] = (acc[release.status] || 0) + 1;
      return acc;
    }, {});

    // Find status with highest count (potential bottleneck)
    const maxStatus = Object.entries(statusCounts)
      .sort(([,a], [,b]) => b - a)[0];

    return maxStatus ? { status: maxStatus[0], count: maxStatus[1] } : null;
  };

  const calculateEfficiency = (releases) => {
    if (releases.length === 0) return 0;
    const completed = releases.filter(r => r.status === 'Complete').length;
    return Math.round((completed / releases.length) * 100);
  };

  if (metrics.loading) {
    return <DashboardSkeleton />;
  }

  if (metrics.error) {
    return <DashboardError error={metrics.error} onRetry={loadMetrics} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Operations Console</h1>
                <p className="text-gray-600">Real-time warehouse metrics and KPIs</p>
              </div>
              
              {/* Date range selector */}
              <div className="flex space-x-2">
                {[
                  { key: 'today', label: 'Today' },
                  { key: 'week', label: 'This Week' },
                  { key: 'month', label: 'This Month' }
                ].map(range => (
                  <button
                    key={range.key}
                    onClick={() => setDateRange(range.key)}
                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      dateRange === range.key
                        ? 'bg-green-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* KPI Cards */}
          <KPICard
            title="Total Releases"
            value={metrics.data.releases.total}
            change="+12%"
            changeType="positive"
            icon="📦"
          />
          <KPICard
            title="Completed"
            value={metrics.data.releases.completed}
            percentage={metrics.data.releases.total > 0 ? Math.round((metrics.data.releases.completed / metrics.data.releases.total) * 100) : 0}
            icon="✅"
          />
          <KPICard
            title="Total Weight"
            value={`${metrics.data.releases.totalWeight.toLocaleString()} lbs`}
            icon="⚖️"
          />
          <KPICard
            title="Efficiency"
            value={`${metrics.data.performance.efficiency}%`}
            changeType={metrics.data.performance.efficiency > 80 ? "positive" : "negative"}
            icon="📊"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Status Pipeline */}
          <div className="lg:col-span-2">
            <StatusPipeline statusCounts={metrics.data.status} />
          </div>

          {/* Recent Activity */}
          <div>
            <RecentActivity releases={metrics.data.recent} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          {/* Barcode Status */}
          <BarcodeStatus barcodes={metrics.data.barcodes} />

          {/* Performance Metrics */}
          <PerformanceMetrics performance={metrics.data.performance} />
        </div>
      </div>
    </div>
  );
};

// KPI Card Component
const KPICard = ({ title, value, change, changeType, percentage, icon }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
          {percentage !== undefined && (
            <p className="text-sm text-gray-500 mt-1">{percentage}% completion</p>
          )}
          {change && (
            <p className={`text-sm mt-1 ${
              changeType === 'positive' ? 'text-green-600' : 'text-red-600'
            }`}>
              {change}
            </p>
          )}
        </div>
        <div className="text-3xl">{icon}</div>
      </div>
    </div>
  );
};

// Status Pipeline Component
const StatusPipeline = ({ statusCounts }) => {
  const statuses = [
    { key: 'entered', label: 'Entered', color: 'bg-gray-400' },
    { key: 'staged', label: 'Staged', color: 'bg-yellow-400' },
    { key: 'verified', label: 'Verified', color: 'bg-blue-400' },
    { key: 'loading', label: 'Loading', color: 'bg-purple-400' },
    { key: 'loaded', label: 'Loaded', color: 'bg-green-400' },
    { key: 'complete', label: 'Complete', color: 'bg-green-600' }
  ];

  const total = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-6">Release Pipeline</h3>
      
      <div className="space-y-4">
        {statuses.map(status => {
          const count = statusCounts[status.key] || 0;
          const percentage = total > 0 ? (count / total) * 100 : 0;
          
          return (
            <div key={status.key} className="flex items-center">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">{status.label}</span>
                  <span className="text-sm text-gray-900">{count}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${status.color}`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Recent Activity Component
const RecentActivity = ({ releases }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-6">Recent Releases</h3>
      
      <div className="space-y-4">
        {releases.map(release => {
          const releaseNumber = release.releaseNumber || release.ReleaseNumber;
          const customerName = release.customerName || release.CustomerName;
          const createdAt = release.createdAt?.toDate ? release.createdAt.toDate() : new Date(release.createdAt);
          
          return (
            <div key={release.id} className="flex items-center space-x-3">
              <div className={`w-2 h-2 rounded-full ${
                release.status === 'Complete' ? 'bg-green-400' :
                release.status === 'Loading' ? 'bg-purple-400' :
                release.status === 'Verified' ? 'bg-blue-400' :
                'bg-yellow-400'
              }`}></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  #{releaseNumber}
                </p>
                <p className="text-sm text-gray-500 truncate">{customerName}</p>
              </div>
              <div className="text-xs text-gray-400">
                {createdAt.toLocaleDateString()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Barcode Status Component
const BarcodeStatus = ({ barcodes }) => {
  const total = Object.values(barcodes).reduce((sum, count) => sum + count, 0);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-6">Barcode Inventory</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{barcodes.available}</div>
          <div className="text-sm text-gray-600">Available</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-600">{barcodes.reserved}</div>
          <div className="text-sm text-gray-600">Reserved</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{barcodes.shipped}</div>
          <div className="text-sm text-gray-600">Shipped</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-600">{total}</div>
          <div className="text-sm text-gray-600">Total</div>
        </div>
      </div>
    </div>
  );
};

// Performance Metrics Component
const PerformanceMetrics = ({ performance }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-6">Performance</h3>
      
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Avg Processing Time</span>
          <span className="text-sm font-medium text-gray-900">
            {performance.avgProcessingTime}h
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Efficiency Rate</span>
          <span className={`text-sm font-medium ${
            performance.efficiency > 80 ? 'text-green-600' : 'text-red-600'
          }`}>
            {performance.efficiency}%
          </span>
        </div>
        
        {performance.bottlenecks && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Current Bottleneck</span>
            <span className="text-sm font-medium text-yellow-600">
              {performance.bottlenecks.status} ({performance.bottlenecks.count})
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// Loading skeleton
const DashboardSkeleton = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded mb-8 w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-lg p-6 shadow-sm">
                <div className="h-4 bg-gray-300 rounded mb-2 w-2/3"></div>
                <div className="h-6 bg-gray-300 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Error display
const DashboardError = ({ error, onRetry }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center">
          <div className="text-red-400 text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Dashboard</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={onRetry}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  );
};

// Wrap with role requirement
export default function ProtectedOperatorConsole() {
  return (
    <RequireRole role={['admin', 'office']}>
      <OperatorConsole />
    </RequireRole>
  );
}