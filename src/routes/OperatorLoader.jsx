// Mobile-first operator loader interface for warehouse staff
import React, { useState, useEffect } from 'react';
import { useFirestoreCollection } from '../hooks/useFirestore';
import { updateDoc, doc, serverTimestamp, collection, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../utils/logger';
import { RequireRole } from '../utils/RequireRole';

/**
 * OperatorLoader - Mobile-optimized UI for warehouse loaders
 * Focuses on quick status updates and essential information only
 */
const OperatorLoader = () => {
  const { user } = useAuth();
  const [selectedFilter, setSelectedFilter] = useState('staged');
  const [loadingActions, setLoadingActions] = useState(new Set());

  // Query releases based on current filter
  const releasesQuery = React.useMemo(() => {
    const baseQuery = collection(db, 'releases');
    
    switch (selectedFilter) {
      case 'staged':
        return query(
          baseQuery,
          where('status', '==', 'Staged'),
          orderBy('pickupDate', 'asc'),
          limit(20)
        );
      case 'verified':
        return query(
          baseQuery,
          where('status', '==', 'Verified'),
          orderBy('pickupDate', 'asc'),
          limit(20)
        );
      case 'loading':
        return query(
          baseQuery,
          where('status', '==', 'Loading'),
          orderBy('updatedAt', 'desc'),
          limit(20)
        );
      default:
        return query(
          baseQuery,
          where('status', 'in', ['Staged', 'Verified', 'Loading']),
          orderBy('pickupDate', 'asc'),
          limit(20)
        );
    }
  }, [selectedFilter]);

  const { data: releases, loading, error } = useFirestoreCollection(releasesQuery);

  const handleStatusUpdate = async (release, newStatus) => {
    const actionKey = `${release.id}-${newStatus}`;
    setLoadingActions(prev => new Set([...prev, actionKey]));

    try {
      logger.info('Loader updating release status', {
        releaseId: release.id,
        releaseNumber: release.releaseNumber || release.ReleaseNumber,
        fromStatus: release.status,
        toStatus: newStatus,
        userId: user.id
      });

      await updateDoc(doc(db, 'releases', release.id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
        [`${newStatus.toLowerCase()}At`]: serverTimestamp(),
        [`${newStatus.toLowerCase()}By`]: user.id
      });

      logger.info('Release status updated successfully', {
        releaseId: release.id,
        newStatus
      });

    } catch (error) {
      logger.error('Failed to update release status', error, {
        releaseId: release.id,
        newStatus,
        userId: user.id
      });
      
      alert(`Failed to update status: ${error.message}`);
    } finally {
      setLoadingActions(prev => {
        const newSet = new Set(prev);
        newSet.delete(actionKey);
        return newSet;
      });
    }
  };

  const isActionLoading = (releaseId, action) => {
    return loadingActions.has(`${releaseId}-${action}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-sm mx-auto">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-lg p-4 shadow">
                <div className="h-4 bg-gray-300 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded mb-4 w-3/4"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="max-w-sm w-full bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-red-400 text-xl mr-3">⚠️</div>
            <div>
              <h3 className="font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-600 mt-1">
                Failed to load releases. Check your connection.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 py-3">
          <h1 className="text-lg font-semibold text-gray-900">Loader Operations</h1>
          <p className="text-sm text-gray-600">Welcome, {user.name || user.email}</p>
        </div>

        {/* Filter tabs */}
        <div className="px-4 pb-3">
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            {[
              { key: 'staged', label: 'Staged', count: releases?.filter(r => r.status === 'Staged').length || 0 },
              { key: 'verified', label: 'Verified', count: releases?.filter(r => r.status === 'Verified').length || 0 },
              { key: 'loading', label: 'Loading', count: releases?.filter(r => r.status === 'Loading').length || 0 }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setSelectedFilter(tab.key)}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  selectedFilter === tab.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${
                    selectedFilter === tab.key
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Releases list */}
      <div className="p-4 space-y-3">
        {!releases || releases.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 text-4xl mb-3">📦</div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No releases found</h3>
            <p className="text-gray-600 text-sm">
              {selectedFilter === 'staged' && "No releases ready for loading"}
              {selectedFilter === 'verified' && "No verified releases"}
              {selectedFilter === 'loading' && "No releases currently loading"}
            </p>
          </div>
        ) : (
          releases.map(release => (
            <ReleaseCard
              key={release.id}
              release={release}
              onStatusUpdate={handleStatusUpdate}
              isActionLoading={isActionLoading}
            />
          ))
        )}
      </div>

      {/* Bottom padding for fixed elements */}
      <div className="h-20"></div>
    </div>
  );
};

/**
 * ReleaseCard - Mobile-optimized release card component
 */
const ReleaseCard = ({ release, onStatusUpdate, isActionLoading }) => {
  const releaseNumber = release.releaseNumber || release.ReleaseNumber;
  const customerName = release.customerName || release.CustomerName;
  const supplierName = release.supplierName || release.SupplierName;
  const pickupDate = release.pickupDate?.toDate ? release.pickupDate.toDate() : new Date(release.pickupDate);
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'Staged': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Verified': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Loading': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Loaded': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getNextActions = (status) => {
    switch (status) {
      case 'Staged':
        return [
          { label: 'Start Loading', action: 'Loading', color: 'bg-purple-600 hover:bg-purple-700' }
        ];
      case 'Verified':
        return [
          { label: 'Start Loading', action: 'Loading', color: 'bg-purple-600 hover:bg-purple-700' }
        ];
      case 'Loading':
        return [
          { label: 'Mark Loaded', action: 'Loaded', color: 'bg-green-600 hover:bg-green-700' }
        ];
      default:
        return [];
    }
  };

  const actions = getNextActions(release.status);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-900 text-lg">#{releaseNumber}</h3>
          <p className="text-sm text-gray-600">{customerName}</p>
        </div>
        <div className={`px-2 py-1 rounded-md text-xs font-medium border ${getStatusColor(release.status)}`}>
          {release.status}
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm">
          <span className="text-gray-500 w-20">Supplier:</span>
          <span className="text-gray-900 font-medium">{supplierName}</span>
        </div>
        <div className="flex items-center text-sm">
          <span className="text-gray-500 w-20">Pickup:</span>
          <span className="text-gray-900">{pickupDate.toLocaleDateString()}</span>
        </div>
        {release.TotalItems && (
          <div className="flex items-center text-sm">
            <span className="text-gray-500 w-20">Items:</span>
            <span className="text-gray-900">{release.TotalItems}</span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      {actions.length > 0 && (
        <div className="space-y-2">
          {actions.map(actionConfig => (
            <button
              key={actionConfig.action}
              onClick={() => onStatusUpdate(release, actionConfig.action)}
              disabled={isActionLoading(release.id, actionConfig.action)}
              className={`w-full py-3 px-4 rounded-lg text-white font-medium text-sm transition-colors ${
                isActionLoading(release.id, actionConfig.action)
                  ? 'bg-gray-400 cursor-not-allowed'
                  : actionConfig.color
              }`}
            >
              {isActionLoading(release.id, actionConfig.action) ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Updating...
                </span>
              ) : (
                actionConfig.label
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Wrap with role requirement
export default function ProtectedOperatorLoader() {
  return (
    <RequireRole permission="advanceStaged">
      <OperatorLoader />
    </RequireRole>
  );
}