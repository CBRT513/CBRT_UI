// Shipment Loading Component
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFirestoreCollection } from '../hooks/useFirestore';
import { useWarehouseAuth } from '../components/WarehouseAuth';
import releaseWorkflowService, { RELEASE_STATUS } from '../services/releaseWorkflowService';
import { logger } from '../utils/logger';

const ShipmentLoading = () => {
  const navigate = useNavigate();
  const { currentUser } = useWarehouseAuth();
  
  // State
  const [selectedRelease, setSelectedRelease] = useState(null);
  const [truckNumber, setTruckNumber] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Load data
  const { data: releases, loading: releasesLoading } = useFirestoreCollection('releases');
  const { data: customers } = useFirestoreCollection('customers');
  const { data: suppliers } = useFirestoreCollection('suppliers');
  const { data: items } = useFirestoreCollection('items');
  const { data: sizes } = useFirestoreCollection('sizes');
  
  // Filter releases available for loading
  const availableReleases = releases?.filter(release => 
    release.status === RELEASE_STATUS.VERIFIED || release.Status === 'Verified'
  ) || [];
  
  // Handle release selection
  const handleReleaseSelect = async (release) => {
    try {
      setError('');
      setIsProcessing(true);
      
      // Try to acquire lock
      await releaseWorkflowService.acquireLock(release.id, currentUser);
      
      setSelectedRelease(release);
      setTruckNumber('');
      
      await logger.info('Release selected for loading', {
        releaseId: release.id,
        releaseNumber: release.releaseNumber || release.ReleaseNumber,
        userId: currentUser.id
      });
    } catch (error) {
      setError(error.message);
      await logger.error('Failed to select release for loading', {
        error: error.message,
        releaseId: release.id
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Handle going back
  const handleBack = async () => {
    if (selectedRelease) {
      // Release lock
      await releaseWorkflowService.releaseLock(selectedRelease.id, currentUser.id);
    }
    setSelectedRelease(null);
    setTruckNumber('');
    setError('');
    setSuccess('');
  };
  
  // Handle loading confirmation
  const handleLoadShipment = async () => {
    try {
      setError('');
      
      // Validate truck number
      if (!truckNumber.trim()) {
        setError('Truck number is required');
        return;
      }
      
      setIsProcessing(true);
      
      // Confirm with user
      if (!window.confirm(`Confirm shipment loaded on truck ${truckNumber}?`)) {
        return;
      }
      
      // Load the release
      await releaseWorkflowService.loadRelease(
        selectedRelease.id, 
        truckNumber, 
        currentUser
      );
      
      await logger.info('Release loaded successfully', {
        releaseId: selectedRelease.id,
        truckNumber,
        loadedBy: currentUser.id
      });
      
      setSuccess('Shipment loaded successfully!');
      
      // Reset after 2 seconds
      setTimeout(() => {
        handleBack();
      }, 2000);
      
    } catch (error) {
      setError(error.message || 'Failed to load shipment');
      await logger.error('Loading failed', {
        error: error.message,
        releaseId: selectedRelease?.id
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Helper functions
  const getSupplierName = (supplierId) => {
    const supplier = suppliers?.find(s => s.id === supplierId);
    return supplier?.SupplierName || supplier?.supplierName || 'Unknown';
  };
  
  const getCustomerName = (customerId) => {
    const customer = customers?.find(c => c.id === customerId);
    return customer?.CustomerName || customer?.customerName || 'Unknown';
  };
  
  const getItemName = (itemId) => {
    const item = items?.find(i => i.id === itemId);
    return item?.ItemName || item?.itemName || 'Unknown';
  };
  
  const getItemCode = (itemId) => {
    const item = items?.find(i => i.id === itemId);
    return item?.ItemCode || item?.itemCode || '';
  };
  
  const getSizeName = (sizeId) => {
    const size = sizes?.find(s => s.id === sizeId);
    return size?.SizeName || size?.sizeName || 'Unknown';
  };
  
  // Loading state
  if (releasesLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  // No release selected - show list
  if (!selectedRelease) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Load Shipment</h1>
        
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}
        
        {availableReleases.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <div className="text-gray-500 text-lg">No releases available for loading</div>
            <div className="text-sm text-gray-400 mt-2">
              Releases must be verified before they can be loaded
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-lg font-medium text-gray-700 mb-4">
              Select a release to load ({availableReleases.length} available):
            </div>
            
            {availableReleases.map((release) => (
              <div
                key={release.id}
                onClick={() => handleReleaseSelect(release)}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-lg text-blue-600">
                      Release #{release.ReleaseNumber || release.releaseNumber}
                    </div>
                    <div className="text-gray-600 mt-1">
                      {getSupplierName(release.SupplierId || release.supplierId)} → 
                      {' '}{getCustomerName(release.CustomerId || release.customerId)}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      Location: <span className="font-medium">{release.stagedLocation || 'Unknown'}</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      Verified by: {release.verifiedByName || 'Unknown'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-green-600 font-medium">
                      Ready to Load
                    </div>
                    {release.verifiedAt && (
                      <div className="text-xs text-gray-500 mt-1">
                        Verified: {new Date(release.verifiedAt.toDate()).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
  
  // Loading interface
  const releaseItems = selectedRelease.lineItems || selectedRelease.LineItems || [];
  
  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Load Release #{selectedRelease.ReleaseNumber || selectedRelease.releaseNumber}
            </h1>
            <div className="text-gray-600 mt-1">
              {getSupplierName(selectedRelease.SupplierId || selectedRelease.supplierId)} → 
              {' '}{getCustomerName(selectedRelease.CustomerId || selectedRelease.customerId)}
            </div>
          </div>
          <button
            onClick={handleBack}
            className="text-gray-500 hover:text-gray-700 text-sm"
            disabled={isProcessing}
          >
            ← Back to Releases
          </button>
        </div>
        
        {/* Release Information */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Release Information</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Staging Location</p>
              <p className="font-medium text-lg text-blue-600">
                {selectedRelease.stagedLocation || 'Unknown'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Verified By</p>
              <p className="font-medium">{selectedRelease.verifiedByName || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Staged At</p>
              <p className="font-medium">
                {selectedRelease.stagedAt 
                  ? new Date(selectedRelease.stagedAt.toDate()).toLocaleString() 
                  : 'Unknown'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Verified At</p>
              <p className="font-medium">
                {selectedRelease.verifiedAt 
                  ? new Date(selectedRelease.verifiedAt.toDate()).toLocaleString() 
                  : 'Unknown'}
              </p>
            </div>
          </div>
        </div>
        
        {/* Items to Load */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Items to Load</h2>
          
          <div className="space-y-3">
            {releaseItems.map((item, index) => (
              <div key={index} className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">
                      {getItemCode(item.itemId || item.ItemId)} - 
                      {' '}{getItemName(item.itemId || item.ItemId)}
                    </div>
                    <div className="text-sm text-gray-600">
                      Size: {getSizeName(item.sizeId || item.SizeId)}
                    </div>
                  </div>
                  <div className="text-sm font-medium">
                    Qty: {item.Quantity || item.requestedQuantity || item.quantity}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Truck Number Input */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Truck Information</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Truck Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={truckNumber}
              onChange={(e) => setTruckNumber(e.target.value)}
              placeholder="Enter truck number..."
              className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isProcessing}
            />
            <p className="text-sm text-gray-500 mt-2">
              Enter the truck number or identifier for this shipment
            </p>
          </div>
        </div>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800">{success}</p>
          </div>
        )}
        
        {/* Action Button */}
        <div className="flex justify-center">
          <button
            onClick={handleLoadShipment}
            className="px-8 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-lg font-medium"
            disabled={!truckNumber.trim() || isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Shipment Loaded'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShipmentLoading;