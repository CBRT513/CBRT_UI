import { 
  doc, 
  getDoc,
  updateDoc, 
  collection, 
  addDoc, 
  serverTimestamp,
  runTransaction
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { auth } from '../firebase/config';
import { notificationsService } from './notifications.service';
import { api } from '../lib/api';

class VerifyService {
  /**
   * Approve staging - move to Verified status
   */
  async approveStaging({ releaseId }) {
    // Check SSO flag and route to API if enabled
    if (String(import.meta.env.VITE_ENABLE_SSO) === "true") {
      try {
        return await api(`/cbrt/releases/${releaseId}/verify`, {
          method: 'POST'
        });
      } catch (error) {
        if (error.message.includes('403')) {
          throw new Error('You do not have permission to verify releases (requires supervisor role)');
        }
        throw error;
      }
    }
    
    // Legacy Firestore path
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      await runTransaction(db, async (transaction) => {
        const releaseRef = doc(db, 'releases', releaseId);
        const releaseSnap = await transaction.get(releaseRef);
        
        if (!releaseSnap.exists()) {
          throw new Error('Release not found');
        }
        
        const release = releaseSnap.data();
        
        // Validate current status
        if (release.status !== 'Staged') {
          throw new Error(`Cannot verify release with status: ${release.status}`);
        }
        
        // Enforce no self-verify
        if (release.stagedBy === currentUser.uid) {
          throw new Error('Cannot verify your own staging');
        }
        
        // Update release to Verified
        transaction.update(releaseRef, {
          status: 'Verified',
          verifiedBy: currentUser.uid,
          verifiedAt: serverTimestamp(),
          statusChangedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        // Add audit log
        const auditRef = doc(collection(db, 'auditLogs'));
        transaction.set(auditRef, {
          action: 'release.verified',
          releaseId: releaseId,
          userId: currentUser.uid,
          details: {
            previousStatus: 'Staged',
            newStatus: 'Verified',
            stagedBy: release.stagedBy,
            stagingLocation: release.stagingLocation
          },
          timestamp: serverTimestamp()
        });
        
        // Add UMS event if enabled
        if (import.meta.env.VITE_ENABLE_UMS === 'true') {
          const umsEventRef = doc(collection(db, 'umsEvents'));
          transaction.set(umsEventRef, {
            eventType: 'release.verified',
            releaseId: releaseId,
            userId: currentUser.uid,
            data: {
              releaseNumber: release.number || release.ReleaseNumber,
              customerName: release.customerName,
              stagingLocation: release.stagingLocation
            },
            timestamp: serverTimestamp()
          });
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Error approving staging:', error);
      throw error;
    }
  }

  /**
   * Reject staging - return to Entered status
   */
  async rejectStaging({ releaseId, reason }) {
    // Check SSO flag and route to API if enabled
    if (String(import.meta.env.VITE_ENABLE_SSO) === "true") {
      try {
        return await api(`/cbrt/releases/${releaseId}/reject`, {
          method: 'POST',
          body: JSON.stringify({ reason })
        });
      } catch (error) {
        if (error.message.includes('403')) {
          throw new Error('You do not have permission to reject releases (requires supervisor role)');
        }
        throw error;
      }
    }
    
    // Legacy Firestore path
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      if (!reason || reason.trim() === '') {
        throw new Error('Rejection reason is required');
      }

      let releaseData;

      await runTransaction(db, async (transaction) => {
        const releaseRef = doc(db, 'releases', releaseId);
        const releaseSnap = await transaction.get(releaseRef);
        
        if (!releaseSnap.exists()) {
          throw new Error('Release not found');
        }
        
        const release = releaseSnap.data();
        releaseData = { id: releaseId, ...release };
        
        // Validate current status
        if (release.status !== 'Staged') {
          throw new Error(`Cannot reject release with status: ${release.status}`);
        }
        
        // Update release back to Entered
        transaction.update(releaseRef, {
          status: 'Entered',
          rejectedBy: currentUser.uid,
          rejectedAt: serverTimestamp(),
          rejectReason: reason,
          statusChangedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          // Keep staging info for reference
          lastStagedBy: release.stagedBy,
          lastStagedAt: release.stagedAt,
          lastStagingLocation: release.stagingLocation,
          // Clear current staging info
          stagedBy: null,
          stagedAt: null,
          stagingLocation: null
        });
        
        // Add audit log
        const auditRef = doc(collection(db, 'auditLogs'));
        transaction.set(auditRef, {
          action: 'release.rejected',
          releaseId: releaseId,
          userId: currentUser.uid,
          details: {
            previousStatus: 'Staged',
            newStatus: 'Entered',
            reason: reason,
            stagedBy: release.stagedBy,
            stagingLocation: release.stagingLocation
          },
          timestamp: serverTimestamp()
        });
        
        // Add UMS event if enabled
        if (import.meta.env.VITE_ENABLE_UMS === 'true') {
          const umsEventRef = doc(collection(db, 'umsEvents'));
          transaction.set(umsEventRef, {
            eventType: 'release.rejected',
            releaseId: releaseId,
            userId: currentUser.uid,
            data: {
              releaseNumber: release.number || release.ReleaseNumber,
              customerName: release.customerName,
              reason: reason
            },
            timestamp: serverTimestamp()
          });
        }
      });

      // Notify office (outside transaction)
      if (releaseData) {
        releaseData.rejectedBy = currentUser.uid;
        await notificationsService.notifyOfficeRejected(releaseData, reason);
      }

      return { success: true };
    } catch (error) {
      console.error('Error rejecting staging:', error);
      throw error;
    }
  }

  /**
   * Check if current user can verify a release
   */
  async canUserVerify(releaseId) {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        return { canVerify: false, reason: 'User not authenticated' };
      }

      const releaseRef = doc(db, 'releases', releaseId);
      const releaseSnap = await getDoc(releaseRef);
      
      if (!releaseSnap.exists()) {
        return { canVerify: false, reason: 'Release not found' };
      }
      
      const release = releaseSnap.data();
      
      if (release.status !== 'Staged') {
        return { canVerify: false, reason: 'Release is not in Staged status' };
      }
      
      if (release.stagedBy === currentUser.uid) {
        return { canVerify: false, reason: 'Cannot verify your own staging' };
      }
      
      // Check if user has verifier permission
      const staffRef = doc(db, 'staff', currentUser.uid);
      const staffSnap = await getDoc(staffRef);
      
      if (!staffSnap.exists()) {
        return { canVerify: false, reason: 'Staff record not found' };
      }
      
      const staff = staffSnap.data();
      if (!staff.isVerifier && !staff.perms?.canVerify) {
        return { canVerify: false, reason: 'User does not have verifier permission' };
      }
      
      return { canVerify: true };
    } catch (error) {
      console.error('Error checking verify permission:', error);
      return { canVerify: false, reason: error.message };
    }
  }
}

export const verifyService = new VerifyService();