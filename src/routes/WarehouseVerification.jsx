// File: /Users/cerion/CBRT_UI/src/routes/WarehouseVerification.jsx
import React, { useState, useEffect } from 'react';
import { useFirestoreCollection } from '../hooks/useFirestore';
import { collection, addDoc, updateDoc, doc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { logger } from '../utils/logger';
import { useWarehouseAuth } from '../components/WarehouseAuth';

const WarehouseVerification = () => {
  const [selectedRelease, setSelectedRelease] = useState(null);
  const [stagedItems, setStagedItems] = useState([]);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionCategory, setRejectionCategory] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRejectionForm, setShowRejectionForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { currentUser } = useWarehouseAuth();
  const { data: releases, loading: releasesLoading } = useFirestoreCollection('releases');
  const { data: customers } = useFirestoreCollection('customers');
  const { data: suppliers } = useFirestoreCollection('suppliers');
  const { data: items } = useFirestoreCollection('items');
  const { data: sizes } = useFirestoreCollection('sizes');

  // Filter releases that need verification
  const stagedReleases = releases?.filter(
    release => release.Status === 'Staged'
  ) || [];

  // Load staged items and check who staged them
  useEffect(() => {
    if (selectedRelease) {
      loadStagedItems();
    }
  }, [selectedRelease]);

  const loadStagedItems = async () => {
    try {
      const stagingQuery = query(
        collection(db, 'staging'),
        where('releaseId', '==', selectedRelease.id)
      );
      const stagingSnapshot = await getDocs(stagingQuery);
      const staged = stagingSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setStagedItems(staged);
    } catch (error) {
      await logger.error('Failed to load staged items', { error: error.message, releaseId: selectedRelease.id });
    }
  };

  const checkCanVerify = () => {
    if (!stagedItems.length) return { canVerify: false, reason: 'No staged items found' };
    
    // Get the user who staged this release (from first staging record)
    const stagedBy = stagedItems[0]?.stagedBy;
    
    if (!stagedBy) {
      return { canVerify: false, reason: 'Cannot determine who staged this release' };
    }
    
    if (stagedBy === currentUser.name || stagedBy === currentUser.id) {
      return { 
        canVerify: false, 
        reason: `You cannot verify a release you staged. This release was staged by ${stagedBy}.` 
      };
    }
    
    return { canVerify: true, stagedBy };
  };

  const handleApproveVerification = async () => {
    const verification = checkCanVerify();
    if (!verification.canVerify) {
      setError(verification.reason);
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      // Create verification record
      const verificationData = {
        releaseId: selectedRelease.id,
        releaseNumber: selectedRelease.ReleaseNumber,
        verifiedBy: {
          id: currentUser.id,
          name: currentUser.name
        },
        stagedBy: verification.stagedBy,
        verifiedAt: new Date().toISOString(),
        status: 'approved',
        itemsVerified: stagedItems.length,
        notes: verificationNotes || null,
        verificationDetails: {
          totalItemsStaged: stagedItems.length,
          stagingCompletedAt: selectedRelease.StagedAt,
          verificationDuration: new Date() - new Date(selectedRelease.StagedAt)
        }
      };

      await addDoc(collection(db, 'verifications'), verificationData);

      // Update release status to Verified
      await updateDoc(doc(db, 'releases', selectedRelease.id), {
        Status: 'Verified',
        VerifiedAt: new Date().toISOString(),
        VerifiedBy: {
          id: currentUser.id,
          name: currentUser.name
        }
      });

      await logger.info('Release verification approved', {
        releaseId: selectedRelease.id,
        releaseNumber: selectedRelease.ReleaseNumber,
        verifiedBy: currentUser.name,
        stagedBy: verification.stagedBy
      });

      setSuccess(`Release ${selectedRelease.ReleaseNumber} verified successfully! Now available for BOL generation.`);
      
      // Reset after delay
      setTimeout(() => {
        setSelectedRelease(null);
        setStagedItems([]);
        setVerificationNotes('');
        setSuccess('');
      }, 3000);

    } catch (error) {
      await logger.error('Failed to verify release', {
        error: error.message,
        releaseId: selectedRelease.id
      });
      setError('Failed to verify release. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectVerification = async () => {
    if (!rejectionReason.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }

    const verification = checkCanVerify();
    if (!verification.canVerify) {
      setError(verification.reason);
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      // Create rejection record
      const rejectionData = {
        releaseId: selectedRelease.id,
        releaseNumber: selectedRelease.ReleaseNumber,
        rejectedBy: {
          id: currentUser.id,
          name: currentUser.name
        },
        stagedBy: verification.stagedBy,
        rejectedAt: new Date().toISOString(),
        reason: rejectionReason,
        category: rejectionCategory,
        status: 'rejected',
        itemsStaged: stagedItems.length
      };

      await addDoc(collection(db, 'verifications'), rejectionData);

      // Update release status back to Entered for re-staging
      await updateDoc(doc(db, 'releases', selectedRelease.id), {
        Status: 'Entered',
        RejectedAt: new Date().toISOString(),
        RejectedBy: {
          id: currentUser.id,
          name: currentUser.name
        },
        RejectionReason: rejectionReason
      });

      await logger.warn('Release verification rejected', {
        releaseId: selectedRelease.id,
        releaseNumber: selectedRelease.ReleaseNumber,
        rejectedBy: currentUser.name,
        stagedBy: verification.stagedBy,
        reason: rejectionReason
      });

      // TODO: Send alerts to office/admin and staging person
      await logger.info('Verification rejection alerts should be sent', {
        releaseId: selectedRelease.id,
        alertRecipients: ['office', 'admin', verification.stagedBy]
      });

      setSuccess(`Release ${selectedRelease.ReleaseNumber} rejected and returned for re-staging. Alerts have been sent.`);
      
      // Reset after delay
      setTimeout(() => {
        setSelectedRelease(null);
        setStagedItems([]);
        setRejectionReason('');
        setRejectionCategory('');
        setVerificationNotes('');
        setShowRejectionForm(false);
        setSuccess('');
      }, 3000);

    } catch (error) {
      await logger.error('Failed to reject release verification', {
        error: error.message,
        releaseId: selectedRelease.id
      });
      setError('Failed to reject release. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getCustomerName = (customerId) => {
    return customers?.find(c => c.id === customerId)?.CustomerName || 'Unknown';
  };

  const getSupplierName = (supplierId) => {
    return suppliers?.find(s => s.id === supplierId)?.SupplierName || 'Unknown';
  };

  const getItemName = (itemId) => {
    return items?.find(i => i.id === itemId)?.ItemName || 'Unknown Item';
  };

  const getItemCode = (itemId) => {
    return items?.find(i => i.id === itemId)?.ItemCode || 'Unknown';
  };

  const getSizeName = (sizeId) => {
    return sizes?.find(s => s.id === sizeId)?.SizeName || 'Unknown Size';
  };

  const calculateRequiredVsStaged = () => {
    if (!selectedRelease?.LineItems || !stagedItems.length) return { total: 0, staged: 0, match: true };
    
    const totalRequired = selectedRelease.LineItems.reduce((sum, item) => sum + (item.Quantity || 0), 0);
    const totalStaged = stagedItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
    
    return {
      total: totalRequired,
      staged: totalStaged,
      match: totalRequired === totalStaged
    };
  };

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

  if (!selectedRelease) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Warehouse Verification</h1>
        
        {stagedReleases.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg">No releases available for verification</div>
            <div className="text-sm text-gray-400 mt-2">
              Releases must have status "Staged" to be verified
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-lg font-medium text-gray-700 mb-4">
              Select a release to verify ({stagedReleases.length} available):
            </div>
            
            {stagedReleases.map((release) => (
              <div
                key={release.id}
                onClick={() => setSelectedRelease(release)}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-lg text-blue-600">
                      Release #{release.ReleaseNumber}
                    </div>
                    <div className="text-gray-600 mt-1">
                      {getSupplierName(release.SupplierId)} → {getCustomerName(release.CustomerId)}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      Staged: {new Date(release.StagedAt).toLocaleDateString()} • {release.StagedItemCount || 0} items
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                      {release.Status}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const verification = checkCanVerify();
  const requiredVsStaged = calculateRequiredVsStaged();

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Verify Release #{selectedRelease.ReleaseNumber}
          </h1>
          <div className="text-gray-600 mt-1">
            {getSupplierName(selectedRelease.SupplierId)} → {getCustomerName(selectedRelease.CustomerId)}
          </div>
        </div>
        <button
          onClick={() => setSelectedRelease(null)}
          className="text-gray-500 hover:text-gray-700 text-sm"
        >
          ← Back to Releases
        </button>
      </div>

      {/* Verification Status */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-gray-900">Verification Status</div>
            <div className="text-sm text-gray-600 mt-1">
              Staged: {new Date(selectedRelease.StagedAt).toLocaleString()}
            </div>
          </div>
          <div className={`px-3 py-1 rounded text-sm font-medium ${
            requiredVsStaged.match 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {requiredVsStaged.match ? '✓ Quantities Match' : '⚠ Quantity Mismatch'}
          </div>
        </div>
        
        <div className="mt-3 text-sm text-gray-600">
          Required: {requiredVsStaged.total} units • Staged: {requiredVsStaged.staged} units
        </div>
      </div>

      {/* Authorization Check */}
      {!verification.canVerify && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <div className="text-red-500 text-xl mr-3">🚫</div>
            <div>
              <div className="font-medium text-red-800">Cannot Verify This Release</div>
              <div className="text-red-700 text-sm mt-1">{verification.reason}</div>
            </div>
          </div>
        </div>
      )}

      {/* Staged Items Review */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Staged Items Review ({stagedItems.length})
        </h2>

        {stagedItems.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            No staged items found for this release.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Barcode
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Item
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Staged By
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stagedItems.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 text-sm font-mono text-gray-900">
                      {item.barcode}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {item.itemCode} - {item.itemName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {item.sizeName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {item.stagedBy || 'Unknown'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Required Items Comparison */}
      {selectedRelease.LineItems && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Required Items (Original Release)
          </h2>
          
          <div className="space-y-2">
            {selectedRelease.LineItems.map((item, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                <div className="text-sm text-gray-700">
                  <div className="font-medium">{getItemCode(item.ItemId)} - {getItemName(item.ItemId)}</div>
                  <div className="text-xs text-gray-500">Size: {getSizeName(item.SizeId)}</div>
                </div>
                <div className="text-sm font-medium text-gray-900">
                  Quantity: {item.Quantity}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Verification Actions */}
      {verification.canVerify && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Verification Decision</h2>
          
          {!showRejectionForm ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Verification Notes (Optional)
                </label>
                <textarea
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  placeholder="Add any notes about this verification..."
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={handleApproveVerification}
                  disabled={isProcessing}
                  className="flex-1 bg-green-600 text-white py-3 px-6 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {isProcessing ? 'Verifying...' : '✓ Approve & Verify Release'}
                </button>
                
                <button
                  onClick={() => setShowRejectionForm(true)}
                  disabled={isProcessing}
                  className="flex-1 bg-red-600 text-white py-3 px-6 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  ✗ Reject Release
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Issue Category
                </label>
                <select
                  value={rejectionCategory}
                  onChange={(e) => setRejectionCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Select issue category...</option>
                  <option value="wrong-items">Wrong items staged</option>
                  <option value="incorrect-quantities">Incorrect quantities</option>
                  <option value="damaged-materials">Damaged materials</option>
                  <option value="missing-items">Missing items</option>
                  <option value="quality-issues">Quality issues</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for Rejection *
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain what is wrong with this staging..."
                  rows="4"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={() => setShowRejectionForm(false)}
                  disabled={isProcessing}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-6 rounded-md hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                
                <button
                  onClick={handleRejectVerification}
                  disabled={isProcessing || !rejectionReason.trim()}
                  className="flex-1 bg-red-600 text-white py-2 px-6 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {isProcessing ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="text-red-800 text-sm">{error}</div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="text-green-800 text-sm">{success}</div>
        </div>
      )}
    </div>
  );
};

export default WarehouseVerification;