import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { stagingService } from '../services/staging.service';
import { notificationsService } from '../services/notifications.service';

const StageRelease = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [release, setRelease] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [stagingLocation, setStagingLocation] = useState('');
  const [stagedQuantities, setStagedQuantities] = useState({});
  const [errors, setErrors] = useState([]);
  
  const locations = stagingService.getStagingLocations();
  
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
      
      // Initialize staged quantities to match requested
      const initialQuantities = {};
      if (releaseData.LineItems) {
        releaseData.LineItems.forEach((line, index) => {
          initialQuantities[index] = line.Quantity || 0;
        });
      }
      setStagedQuantities(initialQuantities);
    } catch (error) {
      console.error('Error loading release:', error);
      notificationsService.showToast('Failed to load release', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const handleQuantityChange = (index, value) => {
    const qty = parseInt(value) || 0;
    setStagedQuantities(prev => ({
      ...prev,
      [index]: qty
    }));
  };
  
  const validateStaging = () => {
    const errors = [];
    
    if (!stagingLocation) {
      errors.push('Staging location is required');
    }
    
    // Check that all quantities match requested
    if (release.LineItems) {
      release.LineItems.forEach((line, index) => {
        const requested = line.Quantity || 0;
        const staged = stagedQuantities[index] || 0;
        
        if (staged !== requested) {
          const itemName = line.ItemName || `Item ${index + 1}`;
          errors.push(`${itemName}: Must stage exactly ${requested} (currently ${staged})`);
        }
      });
    }
    
    setErrors(errors);
    return errors.length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateStaging()) {
      return;
    }
    
    setSubmitting(true);
    
    try {
      await stagingService.markStaged({
        releaseId: id,
        location: stagingLocation,
        stagedQuantities
      });
      
      notificationsService.showToast('Release staged successfully', 'success');
      navigate('/ops/queues');
    } catch (error) {
      console.error('Error staging release:', error);
      notificationsService.showToast(error.message || 'Failed to stage release', 'error');
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
  
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Stage Release</h1>
          <button
            onClick={() => navigate('/ops/queues')}
            className="text-gray-600 hover:text-gray-900"
          >
            ✕
          </button>
        </div>
        
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
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
              <p className="text-sm text-gray-600">Ship To</p>
              <p className="font-medium">{release.shipToName || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Current Status</p>
              <p className="font-medium">{release.status}</p>
            </div>
          </div>
        </div>
        
        {errors.length > 0 && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm font-medium text-red-800 mb-2">Please correct the following errors:</p>
            <ul className="list-disc list-inside text-sm text-red-700">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Staging Location *
            </label>
            <select
              value={stagingLocation}
              onChange={(e) => setStagingLocation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            >
              <option value="">Select location...</option>
              {locations.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>
          
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Line Items</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-yellow-800 bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
                ⚠️ All items must be staged in full. Partial staging is not allowed.
              </div>
              
              {release.LineItems && release.LineItems.length > 0 ? (
                <div className="space-y-4">
                  {release.LineItems.map((line, index) => (
                    <div key={index} className="bg-white p-4 rounded border border-gray-200">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Item</p>
                          <p className="font-medium">{line.ItemName || `Item ${index + 1}`}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Requested Qty</p>
                          <p className="font-medium">{line.Quantity || 0}</p>
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Staged Qty</label>
                          <input
                            type="number"
                            min="0"
                            value={stagedQuantities[index] || 0}
                            onChange={(e) => handleQuantityChange(index, e.target.value)}
                            className="w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No line items found</p>
              )}
            </div>
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
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
              disabled={submitting}
            >
              {submitting ? 'Staging...' : 'Mark Staged'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StageRelease;