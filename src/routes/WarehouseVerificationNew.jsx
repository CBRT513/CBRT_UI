// Warehouse Verification Component
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFirestoreCollection } from '../hooks/useFirestore';
import { useWarehouseAuth } from '../components/WarehouseAuth';
import releaseWorkflowService, { RELEASE_STATUS } from '../services/releaseWorkflowService';
import { logger } from '../utils/logger';

const WarehouseVerificationNew = () => {
  const navigate = useNavigate();
  const { currentUser } = useWarehouseAuth();
  
  // State
  const [selectedRelease, setSelectedRelease] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [cannotVerifyMessage, setCannotVerifyMessage] = useState('');
  
  // Load data
  const { data: releases, loading: releasesLoading } = useFirestoreCollection('releases');
  const { data: customers } = useFirestoreCollection('customers');
  const { data: suppliers } = useFirestoreCollection('suppliers');
  const { data: items } = useFirestoreCollection('items');
  const { data: sizes } = useFirestoreCollection('sizes');
  const { data: auditLogs } = useFirestoreCollection('auditLogs');
  
  // Filter releases available for verification
  const availableReleases = releases?.filter(release => 
    (release.status === RELEASE_STATUS.STAGED || release.Status === 'Staged')
  ) || [];
  
  // Handle release selection
  const handleReleaseSelect = async (release) => {
    try {
      setError('');
      setCannotVerifyMessage('');
      setIsProcessing(true);
      
      // Check if user can verify this release
      const canVerify = releaseWorkflowService.canUserVerify(release, currentUser);
      
      if (!canVerify) {
        setCannotVerifyMessage(
          'You cannot verify a release that you staged. Please ask another team member to verify this release.'
        );
        return;
      }
      
      // Try to acquire lock
      await releaseWorkflowService.acquireLock(release.id, currentUser);
      
      setSelectedRelease(release);
      
      await logger.info('Release selected for verification', {
        releaseId: release.id,
        releaseNumber: release.releaseNumber || release.ReleaseNumber,
        userId: currentUser.id
      });
    } catch (error) {
      setError(error.message);
      await logger.error('Failed to select release for verification', {
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
    setError('');
    setCannotVerifyMessage('');
    setRejectionReason('');
  };
  
  // Handle verification approval
  const handleApprove = async () => {
    try {
      setError('');
      setIsProcessing(true);
      
      // Confirm with user
      if (!window.confirm('Confirm verification complete?')) {
        return;
      }
      
      // Verify the release
      await releaseWorkflowService.verifyRelease(selectedRelease.id, currentUser);
      
      await logger.info('Release verified successfully', {
        releaseId: selectedRelease.id,
        verifiedBy: currentUser.id
      });
      
      setSuccess('Release verified successfully!');
      
      // Reset after 2 seconds
      setTimeout(() => {
        handleBack();
      }, 2000);
      
    } catch (error) {
      setError(error.message || 'Failed to verify release');
      await logger.error('Verification failed', {
        error: error.message,
        releaseId: selectedRelease?.id
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Handle verification rejection
  const handleReject = () => {
    setShowRejectionDialog(true);
  };
  
  const confirmRejection = async () => {
    try {
      if (!rejectionReason.trim()) {
        setError('Rejection reason is required');
        return;
      }
      
      setError('');
      setIsProcessing(true);
      
      // Reject the verification
      await releaseWorkflowService.rejectVerification(
        selectedRelease.id, 
        rejectionReason, 
        currentUser
      );
      
      await logger.info('Release verification rejected', {
        releaseId: selectedRelease.id,
        reason: rejectionReason,
        rejectedBy: currentUser.id
      });
      
      setSuccess('Verification rejected. Release sent back for re-staging.');
      setShowRejectionDialog(false);
      
      // Reset after 2 seconds
      setTimeout(() => {
        handleBack();
      }, 2000);
      
    } catch (error) {
      setError(error.message || 'Failed to reject verification');
      await logger.error('Rejection failed', {
        error: error.message,
        releaseId: selectedRelease?.id
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Get staging details from audit logs
  const getStagingDetails = (releaseId) => {
    const stagingLog = auditLogs?.find(log => 
      log.releaseId === releaseId && log.action === 'STAGED'
    );
    return stagingLog?.details;
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
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Warehouse Verification</h1>
        
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}
        
        {cannotVerifyMessage && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800">{cannotVerifyMessage}</p>
          </div>
        )}
        
        {availableReleases.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <div className="text-gray-500 text-lg">No releases available for verification</div>
            <div className="text-sm text-gray-400 mt-2">
              Releases must be staged before they can be verified
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-lg font-medium text-gray-700 mb-4">
              Select a release to verify ({availableReleases.length} available):
            </div>
            
            {availableReleases.map((release) => {
              const canVerify = releaseWorkflowService.canUserVerify(release, currentUser);
              
              return (
                <div
                  key={release.id}
                  onClick={() => canVerify && handleReleaseSelect(release)}
                  className={`bg-white border rounded-lg p-4 transition-colors ${
                    canVerify 
                      ? 'border-gray-200 hover:bg-gray-50 cursor-pointer' 
                      : 'border-red-200 bg-red-50 cursor-not-allowed opacity-75'
                  }`}
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
                        Staged at: {release.stagedLocation || 'Unknown'}
                      </div>
                      <div className="text-sm text-gray-500">
                        Staged by: {release.stagedByName || 'Unknown'}
                      </div>
                    </div>
                    {!canVerify && (
                      <div className="text-sm text-red-600 font-medium">
                        You staged this
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }
  
  // Verification interface
  const releaseItems = selectedRelease.lineItems || selectedRelease.LineItems || [];
  const stagingDetails = getStagingDetails(selectedRelease.id);
  
  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Verify Release #{selectedRelease.ReleaseNumber || selectedRelease.releaseNumber}
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
        
        {/* Staging Information */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Staging Information</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Staged By</p>
              <p className="font-medium">{selectedRelease.stagedByName || 'Unknown'}</p>
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
              <p className="text-sm text-gray-600">Location</p>
              <p className="font-medium text-lg text-blue-600">
                {selectedRelease.stagedLocation || 'Unknown'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Pick Ticket</p>
              <p className="font-medium">
                {selectedRelease.pickTicketRevision > 0 
                  ? `${selectedRelease.ReleaseNumber || selectedRelease.releaseNumber}-${selectedRelease.pickTicketRevision}`
                  : selectedRelease.ReleaseNumber || selectedRelease.releaseNumber}
              </p>
            </div>
          </div>
        </div>
        
        {/* Staged Items */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Staged Items</h2>
          
          <div className="space-y-3">
            {stagingDetails?.items?.length > 0 ? (
              stagingDetails.items.map((item, index) => (
                <div key={index} className="p-3 bg-green-50 border border-green-300 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">
                        {item.itemCode} - {item.itemName}
                      </div>
                      <div className="text-sm text-gray-600">
                        Size: {item.sizeName || 'N/A'}
                      </div>
                      <div className="text-xs text-gray-500">
                        Barcode: {item.barcode} ({item.scanMethod})
                      </div>
                    </div>
                    <div className="text-sm font-medium">
                      Qty: {item.quantity}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              // Fallback to release line items if staging details not available
              releaseItems.map((item, index) => (
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
              ))
            )}
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
        
        {/* Action Buttons */}
        <div className="flex justify-center space-x-4">
          <button
            onClick={handleReject}
            className="px-8 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 text-lg font-medium"
            disabled={isProcessing}
          >
            Not Verified
          </button>
          
          <button
            onClick={handleApprove}
            className="px-8 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 text-lg font-medium"
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Verified'}
          </button>
        </div>
      </div>
      
      {/* Rejection Dialog */}
      {showRejectionDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Verification Rejection</h3>
            <p className="text-gray-600 mb-4">
              Please enter the reason for rejecting this verification:
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              rows={4}
              required
            />
            {error && (
              <p className="text-red-600 text-sm mt-2">{error}</p>
            )}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowRejectionDialog(false);
                  setRejectionReason('');
                  setError('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                onClick={confirmRejection}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                disabled={!rejectionReason.trim() || isProcessing}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WarehouseVerificationNew;