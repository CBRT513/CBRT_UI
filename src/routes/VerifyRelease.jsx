import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { verifyService } from '../services/verify.service';
import { notificationsService } from '../services/notifications.service';
import StateBadge from '../components/StateBadge';
import AgingChip from '../components/AgingChip';

const VerifyRelease = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [release, setRelease] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [canVerify, setCanVerify] = useState(true);
  const [verifyError, setVerifyError] = useState('');
  
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
      
      // Check if current user can verify
      const currentUser = auth.currentUser;
      if (currentUser && releaseData.stagedBy === currentUser.uid) {
        setCanVerify(false);
        setVerifyError('You cannot verify your own staging');
      }
    } catch (error) {
      console.error('Error loading release:', error);
      notificationsService.showToast('Failed to load release', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const handleApprove = async () => {
    if (!canVerify) {
      notificationsService.showToast(verifyError, 'warning');
      return;
    }
    
    setSubmitting(true);
    
    try {
      await verifyService.approveStaging({ releaseId: id });
      notificationsService.showToast('Release verified successfully', 'success');
      navigate('/ops/queues');
    } catch (error) {
      console.error('Error verifying release:', error);
      notificationsService.showToast(error.message || 'Failed to verify release', 'error');
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleReject = async () => {
    if (!rejectReason.trim()) {
      notificationsService.showToast('Please provide a reason for rejection', 'warning');
      return;
    }
    
    setSubmitting(true);
    
    try {
      await verifyService.rejectStaging({ 
        releaseId: id, 
        reason: rejectReason 
      });
      notificationsService.showToast('Release rejected and returned to Entered status', 'warning');
      navigate('/ops/queues');
    } catch (error) {
      console.error('Error rejecting release:', error);
      notificationsService.showToast(error.message || 'Failed to reject release', 'error');
    } finally {
      setSubmitting(false);
      setShowRejectModal(false);
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
          <h1 className="text-2xl font-bold text-gray-900">Verify Release</h1>
          <button
            onClick={() => navigate('/ops/queues')}
            className="text-gray-600 hover:text-gray-900"
          >
            ✕
          </button>
        </div>
        
        {!canVerify && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">No Self-Verification</h3>
                <p className="mt-1 text-sm text-yellow-700">{verifyError}</p>
              </div>
            </div>
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
                <p className="text-sm text-gray-600">Age in Status</p>
                <AgingChip since={release.statusChangedAt} label={release.status} />
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-blue-50 rounded-lg">
            <h3 className="text-sm font-medium text-blue-900 mb-2">Staging Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-blue-700">Location</p>
                <p className="font-medium text-blue-900">{release.stagingLocation || 'N/A'}</p>
              </div>
              <div>
                <p className="text-blue-700">Staged By</p>
                <p className="font-medium text-blue-900">{release.stagedBy || 'N/A'}</p>
              </div>
              <div>
                <p className="text-blue-700">Staged At</p>
                <p className="font-medium text-blue-900">
                  {release.stagedAt ? new Date(release.stagedAt.toDate?.() || release.stagedAt).toLocaleString() : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Line Items</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requested</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Staged</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {release.LineItems?.map((line, index) => {
                  const requested = line.Quantity || 0;
                  const staged = line.qtyStaged || requested;
                  const isMatch = staged === requested;
                  
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {isMatch ? (
                          <span className="text-green-600">✓ Match</span>
                        ) : (
                          <span className="text-red-600">✗ Mismatch</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="flex justify-end space-x-4">
          <button
            onClick={() => navigate('/ops/queues')}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            onClick={() => setShowRejectModal(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400"
            disabled={submitting}
          >
            Reject
          </button>
          <button
            onClick={handleApprove}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
            disabled={submitting || !canVerify}
          >
            {submitting ? 'Processing...' : 'Approve'}
          </button>
        </div>
      </div>
      
      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Reject Staging</h3>
            <p className="text-sm text-gray-600 mb-4">
              This will return the release to "Entered" status. The reservations will remain in place.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Please provide a reason for rejection..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
              rows="3"
              required
            />
            <div className="mt-4 flex justify-end space-x-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400"
                disabled={submitting || !rejectReason.trim()}
              >
                {submitting ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VerifyRelease;