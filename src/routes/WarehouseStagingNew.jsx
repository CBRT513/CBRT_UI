// Enhanced Warehouse Staging with Barcode Scanning
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFirestoreCollection } from '../hooks/useFirestore';
import { useWarehouseAuth } from '../components/WarehouseAuth';
import releaseWorkflowService, { 
  RELEASE_STATUS, 
  STAGING_LOCATIONS, 
  SCAN_METHODS 
} from '../services/releaseWorkflowService';
import { logger } from '../utils/logger';

const WarehouseStagingNew = () => {
  const navigate = useNavigate();
  const { currentUser } = useWarehouseAuth();
  const barcodeInputRef = useRef(null);
  
  // State
  const [selectedRelease, setSelectedRelease] = useState(null);
  const [stagingLocation, setStagingLocation] = useState('');
  const [scannedItems, setScannedItems] = useState([]);
  const [currentBarcode, setCurrentBarcode] = useState('');
  const [scanMethod, setScanMethod] = useState(SCAN_METHODS.SCANNED);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lockError, setLockError] = useState('');
  const [showUnableToStageDialog, setShowUnableToStageDialog] = useState(false);
  
  // Load data
  const { data: releases, loading: releasesLoading } = useFirestoreCollection('releases');
  const { data: customers } = useFirestoreCollection('customers');
  const { data: suppliers } = useFirestoreCollection('suppliers');
  const { data: items } = useFirestoreCollection('items');
  const { data: sizes } = useFirestoreCollection('sizes');
  const { data: barcodes } = useFirestoreCollection('barcodes');
  
  // Filter releases available for staging
  const availableReleases = releases?.filter(
    release => (release.status === RELEASE_STATUS.ENTERED || 
                release.Status === 'Entered') && // Handle both cases
               !release.lockedBy // Not locked
  ) || [];
  
  // Auto-focus barcode input
  useEffect(() => {
    if (selectedRelease && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [selectedRelease]);
  
  // Handle release selection
  const handleReleaseSelect = async (release) => {
    try {
      setError('');
      setLockError('');
      setIsProcessing(true);
      
      // Try to acquire lock
      await releaseWorkflowService.acquireLock(release.id, currentUser);
      
      setSelectedRelease(release);
      setScannedItems([]);
      setStagingLocation('');
      
      await logger.info('Release selected for staging', {
        releaseId: release.id,
        releaseNumber: release.releaseNumber || release.ReleaseNumber,
        userId: currentUser.id
      });
    } catch (error) {
      setLockError(error.message);
      await logger.error('Failed to select release', {
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
    setScannedItems([]);
    setStagingLocation('');
    setError('');
    setLockError('');
  };
  
  // Handle barcode scan
  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    
    if (!currentBarcode.trim()) return;
    
    const barcode = currentBarcode.trim();
    
    // Check if already scanned
    if (scannedItems.some(item => item.barcode === barcode)) {
      setError('This barcode has already been scanned');
      setCurrentBarcode('');
      return;
    }
    
    // Find barcode in system
    const barcodeData = barcodes.find(b => b.Barcode === barcode || b.barcode === barcode);
    
    if (!barcodeData) {
      setError(`Barcode not found: ${barcode}`);
      setCurrentBarcode('');
      return;
    }
    
    // Validate barcode belongs to this release
    const releaseItems = selectedRelease.lineItems || selectedRelease.LineItems || [];
    const matchingItem = releaseItems.find(item => {
      const itemId = item.itemId || item.ItemId;
      const sizeId = item.sizeId || item.SizeId;
      return (
        (barcodeData.ItemId === itemId || barcodeData.itemId === itemId) &&
        (barcodeData.SizeId === sizeId || barcodeData.sizeId === sizeId)
      );
    });
    
    if (!matchingItem) {
      setError('This barcode does not belong to items in this release');
      setCurrentBarcode('');
      return;
    }
    
    // Get item details
    const itemData = items.find(i => i.id === (matchingItem.itemId || matchingItem.ItemId));
    const sizeData = sizes.find(s => s.id === (matchingItem.sizeId || matchingItem.SizeId));
    
    // Add to scanned items
    const scannedItem = {
      barcode,
      itemId: matchingItem.itemId || matchingItem.ItemId,
      itemCode: itemData?.ItemCode || itemData?.itemCode,
      itemName: itemData?.ItemName || itemData?.itemName,
      sizeId: matchingItem.sizeId || matchingItem.SizeId,
      sizeName: sizeData?.SizeName || sizeData?.sizeName,
      quantity: matchingItem.Quantity || matchingItem.requestedQuantity || matchingItem.quantity,
      scanMethod,
      scannedAt: new Date().toISOString()
    };
    
    setScannedItems([...scannedItems, scannedItem]);
    setCurrentBarcode('');
    setError('');
    setSuccess(`Scanned: ${scannedItem.itemCode} - ${scannedItem.itemName}`);
    
    // Clear success message after 2 seconds
    setTimeout(() => setSuccess(''), 2000);
    
    // Log scan
    logger.info('Barcode scanned', {
      barcode,
      itemCode: scannedItem.itemCode,
      scanMethod
    });
  };
  
  // Check if all items are scanned
  const areAllItemsScanned = () => {
    const releaseItems = selectedRelease?.lineItems || selectedRelease?.LineItems || [];
    
    return releaseItems.every(releaseItem => {
      const itemId = releaseItem.itemId || releaseItem.ItemId;
      const sizeId = releaseItem.sizeId || releaseItem.SizeId;
      const requiredQty = releaseItem.Quantity || releaseItem.requestedQuantity || releaseItem.quantity;
      
      const scannedQty = scannedItems
        .filter(s => 
          (s.itemId === itemId) && 
          (s.sizeId === sizeId)
        )
        .reduce((sum, item) => sum + (item.quantity || 0), 0);
      
      return scannedQty === requiredQty;
    });
  };
  
  // Handle staging completion
  const handleCompleteStaging = async () => {
    try {
      setError('');
      setIsProcessing(true);
      
      // Validate all requirements
      if (!stagingLocation) {
        setError('Please select a staging location');
        return;
      }
      
      if (!areAllItemsScanned()) {
        setError('Not all items have been scanned. Please scan all items or mark as "Unable to Stage"');
        return;
      }
      
      // Confirm with user
      if (!window.confirm(`Confirm staging complete at ${stagingLocation}?`)) {
        return;
      }
      
      // Prepare staging data
      const stagingData = {
        location: stagingLocation,
        items: scannedItems
      };
      
      // Complete staging
      await releaseWorkflowService.stageRelease(
        selectedRelease.id,
        stagingData,
        currentUser
      );
      
      await logger.info('Release staged successfully', {
        releaseId: selectedRelease.id,
        location: stagingLocation,
        itemCount: scannedItems.length
      });
      
      setSuccess('Release staged successfully!');
      
      // Reset after 2 seconds
      setTimeout(() => {
        handleBack();
      }, 2000);
      
    } catch (error) {
      setError(error.message || 'Failed to complete staging');
      await logger.error('Staging failed', {
        error: error.message,
        releaseId: selectedRelease?.id
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Handle unable to stage
  const handleUnableToStage = async () => {
    setShowUnableToStageDialog(true);
  };
  
  const confirmUnableToStage = async () => {
    try {
      setIsProcessing(true);
      
      await releaseWorkflowService.unableToStage(
        selectedRelease.id,
        'Items not available for staging - brought to office',
        currentUser
      );
      
      await logger.info('Release marked as unable to stage', {
        releaseId: selectedRelease.id
      });
      
      alert('Please bring this release to the office for assistance');
      
      handleBack();
    } catch (error) {
      setError('Failed to mark as unable to stage');
    } finally {
      setIsProcessing(false);
      setShowUnableToStageDialog(false);
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
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Warehouse Staging</h1>
        
        {lockError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{lockError}</p>
          </div>
        )}
        
        {availableReleases.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <div className="text-gray-500 text-lg">No releases available for staging</div>
            <div className="text-sm text-gray-400 mt-2">
              Releases must have status "Entered" and not be locked by another user
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-lg font-medium text-gray-700 mb-4">
              Select a release to stage ({availableReleases.length} available):
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
                      {(release.LineItems || release.lineItems)?.length || 0} line items
                    </div>
                  </div>
                  {release.pickTicketRevision > 0 && (
                    <div className="text-sm text-orange-600 font-medium">
                      Rev {release.pickTicketRevision}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
  
  // Staging interface
  const releaseItems = selectedRelease.lineItems || selectedRelease.LineItems || [];
  
  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Staging Release #{selectedRelease.ReleaseNumber || selectedRelease.releaseNumber}
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
        
        {/* Progress */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Staging Progress</span>
            <span className="text-sm text-gray-500">
              {scannedItems.length} of {releaseItems.length} items scanned
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${(scannedItems.length / Math.max(releaseItems.length, 1)) * 100}%` 
              }}
            />
          </div>
        </div>
        
        {/* Barcode Scanning */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Scan Items</h2>
          
          <form onSubmit={handleBarcodeSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Barcode
              </label>
              <div className="flex space-x-2">
                <input
                  ref={barcodeInputRef}
                  type="text"
                  value={currentBarcode}
                  onChange={(e) => setCurrentBarcode(e.target.value)}
                  placeholder="Scan or type barcode"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isProcessing}
                />
                <select
                  value={scanMethod}
                  onChange={(e) => setScanMethod(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value={SCAN_METHODS.SCANNED}>Scanned</option>
                  <option value={SCAN_METHODS.MANUAL}>Manual</option>
                </select>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  disabled={!currentBarcode || isProcessing}
                >
                  Add
                </button>
              </div>
            </div>
          </form>
          
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}
          
          {success && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-800 text-sm">{success}</p>
            </div>
          )}
        </div>
        
        {/* Location Selection */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Staging Location</h2>
          
          <select
            value={stagingLocation}
            onChange={(e) => setStagingLocation(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isProcessing}
          >
            <option value="">Select Location</option>
            {STAGING_LOCATIONS.map(location => (
              <option key={location} value={location}>{location}</option>
            ))}
          </select>
        </div>
        
        {/* Required Items */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Required Items</h2>
          
          <div className="space-y-3">
            {releaseItems.map((item, index) => {
              const itemData = items.find(i => i.id === (item.itemId || item.ItemId));
              const sizeData = sizes.find(s => s.id === (item.sizeId || item.SizeId));
              const isScanned = scannedItems.some(s => 
                s.itemId === (item.itemId || item.ItemId) && 
                s.sizeId === (item.sizeId || item.SizeId)
              );
              
              return (
                <div 
                  key={index} 
                  className={`p-3 rounded-lg border ${
                    isScanned 
                      ? 'bg-green-50 border-green-300' 
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">
                        {itemData?.ItemCode || itemData?.itemCode} - 
                        {' '}{itemData?.ItemName || itemData?.itemName}
                      </div>
                      <div className="text-sm text-gray-600">
                        Size: {sizeData?.SizeName || sizeData?.sizeName || 'N/A'}
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-sm font-medium">
                        Qty: {item.Quantity || item.requestedQuantity || item.quantity}
                      </div>
                      {isScanned && (
                        <span className="text-green-600">✓</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex justify-between">
          <button
            onClick={handleUnableToStage}
            className="px-6 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
            disabled={isProcessing}
          >
            Unable to Stage
          </button>
          
          <button
            onClick={handleCompleteStaging}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            disabled={!areAllItemsScanned() || !stagingLocation || isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Complete Staging'}
          </button>
        </div>
      </div>
      
      {/* Unable to Stage Dialog */}
      {showUnableToStageDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md">
            <h3 className="text-lg font-semibold mb-4">Unable to Stage</h3>
            <p className="text-gray-600 mb-6">
              This will notify the office that this release cannot be staged. 
              Please bring the release paperwork to the office for assistance.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowUnableToStageDialog(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={confirmUnableToStage}
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WarehouseStagingNew;