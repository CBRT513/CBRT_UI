import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { loadService } from '../services/load.service';
import { notificationsService } from '../services/notifications.service';
import StateBadge from '../components/StateBadge';

const LoadRelease = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [release, setRelease] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [truckNumber, setTruckNumber] = useState('');
  const [stats, setStats] = useState(null);
  
  useEffect(() => {
    loadRelease();
  }, [id]);
  
  const loadRelease = async () => {
    try {
      const releaseRef = doc(db, 'releases', id);
      const releaseSnap = await getDoc(releaseRef);
      
      if (!releaseSnap.exists()) {
        notificationsService.showToast('Release not found', 'error');
        navigate('/ops/queues');
        return;
      }
      
      const releaseData = { id: releaseSnap.id, ...releaseSnap.data() };
      setRelease(releaseData);
      
      // Get loading statistics
      const loadingStats = await loadService.getLoadingStats(id);
      setStats(loadingStats);
    } catch (error) {
      console.error('Error loading release:', error);
      notificationsService.showToast('Failed to load release', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!truckNumber.trim()) {
      notificationsService.showToast('Truck number is required', 'warning');
      return;
    }
    
    setSubmitting(true);
    
    try {
      await loadService.markLoaded({
        releaseId: id,
        truckNumber: truckNumber.trim()
      });
      
      notificationsService.showToast('Release loaded successfully', 'success');
      navigate('/ops/queues');
    } catch (error) {
      console.error('Error loading release:', error);
      notificationsService.showToast(error.message || 'Failed to load release', 'error');
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }
  
  if (!release) {
    return null;
  }
  
  const canLoad = release.status === 'Verified' || release.status === 'Staged';
  
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Load Release</h1>
          <button
            onClick={() => navigate('/ops/queues')}
            className="text-gray-600 hover:text-gray-900"
          >
            ✕
          </button>
        </div>
        
        {!canLoad && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800">
              This release cannot be loaded. Status must be "Verified" or "Staged".
              Current status: <strong>{release.status}</strong>
            </p>
          </div>
        )}
        
        <div className="mb-6 space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Release Number</p>
                <p className="font-medium">{release.number || release.ReleaseNumber || release.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Customer</p>
                <p className="font-medium">{release.customerName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <StateBadge status={release.status} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Carrier Mode</p>
                <p className="font-medium">{release.carrierMode || 'Supplier Arranged'}</p>
              </div>
            </div>
          </div>
          
          {stats && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="text-sm font-medium text-blue-900 mb-2">Loading Summary</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-blue-700">Total Requested</p>
                  <p className="font-medium text-blue-900">{stats.totalRequested}</p>
                </div>
                <div>
                  <p className="text-blue-700">Total Staged</p>
                  <p className="font-medium text-blue-900">{stats.totalStaged}</p>
                </div>
                <div>
                  <p className="text-blue-700">Ready to Load</p>
                  <p className="font-medium text-blue-900">
                    {stats.isFullyStaged ? (
                      <span className="text-green-600">✓ Yes</span>
                    ) : (
                      <span className="text-red-600">✗ No</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Line Items to Load</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requested</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Staged</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">To Load</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {release.LineItems?.map((line, index) => {
                  const requested = line.Quantity || 0;
                  const staged = line.qtyStaged || requested;
                  
                  return (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {line.ItemName || `Item ${index + 1}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {requested}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {staged}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {staged}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Important</h3>
              <p className="mt-1 text-sm text-yellow-700">
                Loading this release will:
                <ul className="list-disc list-inside mt-1">
                  <li>Decrement inventory quantities from the system</li>
                  <li>Mark the release as "Loaded" status</li>
                  <li>Record the truck number for tracking</li>
                </ul>
              </p>
            </div>
          </div>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Truck Number *
            </label>
            <input
              type="text"
              value={truckNumber}
              onChange={(e) => setTruckNumber(e.target.value)}
              placeholder="Enter truck number or identifier"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
              disabled={!canLoad}
            />
          </div>
          
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/ops/queues')}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400"
              disabled={submitting || !canLoad}
            >
              {submitting ? 'Loading...' : 'Mark Loaded'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoadRelease;