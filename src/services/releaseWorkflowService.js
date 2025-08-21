// Release Workflow Service
// Manages the complete lifecycle of releases from Entered to Shipped
import { 
  doc, 
  updateDoc, 
  getDoc, 
  collection, 
  addDoc, 
  serverTimestamp,
  writeBatch,
  query,
  where,
  getDocs,
  onSnapshot,
  runTransaction
} from 'firebase/firestore';
import { db } from '../firebase/config';
import transactionHelper from '../utils/transactionHelper';

// Release Status Enum
export const RELEASE_STATUS = {
  ENTERED: 'Entered',
  STAGED: 'Staged',
  VERIFIED: 'Verified',
  LOADED: 'Loaded',
  SHIPPED: 'Shipped'
};

// Staging Locations
export const STAGING_LOCATIONS = [
  'Allied',
  'Red Ramp',
  'Dock 2',
  'Yard'
];

// Scan Methods
export const SCAN_METHODS = {
  SCANNED: 'Scanned',
  MANUAL: 'Manual'
};

class ReleaseWorkflowService {
  constructor() {
    this.lockTimeoutDuration = 5 * 60 * 1000; // 5 minutes (reduced from 15)
    this.activeLocks = new Map(); // Track active locks locally
    this.lockCleanupInterval = null;
    this.startLockCleanup();
  }
  
  // Start periodic lock cleanup
  startLockCleanup() {
    // Clean up stale locks every minute
    this.lockCleanupInterval = setInterval(async () => {
      await this.cleanupStaleLocks();
    }, 60000);
  }
  
  // Clean up stale locks
  async cleanupStaleLocks() {
    try {
      const releasesSnapshot = await getDocs(collection(db, 'releases'));
      const now = new Date();
      let cleanedCount = 0;
      
      for (const docSnapshot of releasesSnapshot.docs) {
        const data = docSnapshot.data();
        
        if (data.lockedBy && data.lockedAt) {
          const lockTime = data.lockedAt.toDate();
          const lockAge = now - lockTime;
          
          // Clean up locks older than timeout duration
          if (lockAge > this.lockTimeoutDuration) {
            await updateDoc(doc(db, 'releases', docSnapshot.id), {
              lockedBy: null,
              lockedByName: null,
              lockedAt: null
            });
            cleanedCount++;
            
            // Remove from local tracking
            this.activeLocks.delete(docSnapshot.id);
          }
        }
      }
      
      if (cleanedCount > 0) {
        console.log(`🧹 Cleaned up ${cleanedCount} stale locks`);
      }
    } catch (error) {
      console.error('Error cleaning up stale locks:', error);
    }
  }

  // ==================== LOCKING MECHANISM ====================
  
  /**
   * Acquire lock on a release
   * @param {string} releaseId - Release document ID
   * @param {object} user - Current user object
   * @returns {Promise<boolean>} - Success status
   */
  async acquireLock(releaseId, user) {
    try {
      // Use transaction helper with retry logic
      return await transactionHelper.runWithRetry(async (transaction) => {
        const releaseRef = doc(db, 'releases', releaseId);
        const releaseDoc = await transaction.get(releaseRef);
        
        if (!releaseDoc.exists()) {
          throw new Error('Release not found');
        }
        
        const releaseData = releaseDoc.data();
        const now = new Date();
        
        // Check if already locked by another user
        if (releaseData.lockedBy && releaseData.lockedBy !== user.id) {
          const lockTime = releaseData.lockedAt?.toDate();
          if (lockTime && (now - lockTime) < this.lockTimeoutDuration) {
            // Lock is still valid
            throw new Error(`Release is currently locked by another user`);
          }
        }
        
        // Acquire or refresh lock - only update if we can acquire it
        const updateData = {
          lockedBy: user.id,
          lockedByName: user.name || user.email,
          lockedAt: serverTimestamp()
        };
        
        transaction.update(releaseRef, updateData);
        
        // Set up auto-unlock timer
        this.setupAutoUnlock(releaseId, user.id);
        
        return true;
      });
    } catch (error) {
      console.error('Failed to acquire lock:', error);
      // Return false instead of throwing for race condition tests
      return false;
    }
  }
  
  /**
   * Release lock on a release
   * @param {string} releaseId - Release document ID
   * @param {string} userId - User ID releasing the lock
   */
  async releaseLock(releaseId, userId) {
    try {
      const releaseRef = doc(db, 'releases', releaseId);
      const releaseDoc = await getDoc(releaseRef);
      
      if (!releaseDoc.exists()) return;
      
      const releaseData = releaseDoc.data();
      
      // Only the user who locked it can release it (or system timeout)
      if (releaseData.lockedBy === userId) {
        await updateDoc(releaseRef, {
          lockedBy: null,
          lockedByName: null,
          lockedAt: null
        });
        
        // Clear auto-unlock timer
        this.clearAutoUnlock(releaseId);
      }
    } catch (error) {
      console.error('Failed to release lock:', error);
    }
  }
  
  /**
   * Set up auto-unlock timer
   */
  setupAutoUnlock(releaseId, userId) {
    // Clear existing timer if any
    this.clearAutoUnlock(releaseId);
    
    // Set new timer
    const timer = setTimeout(() => {
      this.releaseLock(releaseId, userId);
    }, this.lockTimeoutDuration);
    
    this.activeLocks.set(releaseId, timer);
  }
  
  /**
   * Clear auto-unlock timer
   */
  clearAutoUnlock(releaseId) {
    const timer = this.activeLocks.get(releaseId);
    if (timer) {
      clearTimeout(timer);
      this.activeLocks.delete(releaseId);
    }
  }
  
  /**
   * Check if release is locked
   */
  async isLocked(releaseId, userId) {
    try {
      const releaseRef = doc(db, 'releases', releaseId);
      const releaseDoc = await getDoc(releaseRef);
      
      if (!releaseDoc.exists()) return false;
      
      const releaseData = releaseDoc.data();
      
      if (!releaseData.lockedBy) return false;
      
      // Check if locked by another user
      if (releaseData.lockedBy !== userId) {
        const lockTime = releaseData.lockedAt?.toDate();
        const now = new Date();
        
        // Check if lock has expired
        if (lockTime && (now - lockTime) >= this.lockTimeoutDuration) {
          // Lock expired, release it
          await this.releaseLock(releaseId, releaseData.lockedBy);
          return false;
        }
        
        return {
          locked: true,
          lockedBy: releaseData.lockedByName || 'another user',
          lockedAt: lockTime
        };
      }
      
      return false;
    } catch (error) {
      console.error('Failed to check lock status:', error);
      return false;
    }
  }
  
  // ==================== STAGING WORKFLOW ====================
  
  /**
   * Stage a release
   */
  async stageRelease(releaseId, stagingData, user) {
    try {
      // Validate staging data
      if (!stagingData.location) {
        throw new Error('Location is required for staging');
      }
      
      if (!STAGING_LOCATIONS.includes(stagingData.location)) {
        throw new Error('Invalid staging location');
      }
      
      // Use transaction to ensure consistency
      return await runTransaction(db, async (transaction) => {
        const releaseRef = doc(db, 'releases', releaseId);
        const releaseDoc = await transaction.get(releaseRef);
        
        if (!releaseDoc.exists()) {
          throw new Error('Release not found');
        }
        
        const releaseData = releaseDoc.data();
        
        // Validate status
        if (releaseData.status !== RELEASE_STATUS.ENTERED) {
          throw new Error(`Cannot stage release with status: ${releaseData.status}`);
        }
        
        // Update release
        transaction.update(releaseRef, {
          status: RELEASE_STATUS.STAGED,
          stagedBy: user.id,
          stagedByName: user.name || user.email,
          stagedAt: serverTimestamp(),
          stagedLocation: stagingData.location,
          lockedBy: null,
          lockedByName: null,
          lockedAt: null
        });
        
        // Create audit log
        const auditRef = doc(collection(db, 'auditLogs'));
        transaction.set(auditRef, {
          releaseId,
          userId: user.id,
          userName: user.name || user.email,
          action: 'STAGED',
          oldStatus: RELEASE_STATUS.ENTERED,
          newStatus: RELEASE_STATUS.STAGED,
          details: {
            location: stagingData.location,
            items: stagingData.items
          },
          createdAt: serverTimestamp()
        });
        
        return true;
      }).then(async (success) => {
        if (success) {
          // Fire UMS hook for staging completion
          const releaseDoc = await getDoc(doc(db, 'releases', releaseId));
          if (releaseDoc.exists()) {
            await this.fireUMSHook('release.staged', {
              id: releaseId,
              ...releaseDoc.data(),
              status: RELEASE_STATUS.STAGED
            }, user);
          }
        }
        return success;
      });
    } catch (error) {
      console.error('Failed to stage release:', error);
      throw error;
    }
  }
  
  /**
   * Mark release as unable to stage
   */
  async unableToStage(releaseId, reason, user) {
    try {
      const batch = writeBatch(db);
      
      // Update release
      const releaseRef = doc(db, 'releases', releaseId);
      batch.update(releaseRef, {
        unableToStageReason: reason,
        unableToStageBy: user.id,
        unableToStageAt: serverTimestamp(),
        lockedBy: null,
        lockedByName: null,
        lockedAt: null
      });
      
      // Create audit log
      const auditRef = doc(collection(db, 'auditLogs'));
      batch.set(auditRef, {
        releaseId,
        userId: user.id,
        userName: user.name || user.email,
        action: 'UNABLE_TO_STAGE',
        details: { reason },
        createdAt: serverTimestamp()
      });
      
      await batch.commit();
      
      // Send notification
      await this.sendNotification('UNABLE_TO_STAGE', { releaseId, reason, user });
      
      return true;
    } catch (error) {
      console.error('Failed to mark as unable to stage:', error);
      throw error;
    }
  }
  
  // ==================== VERIFICATION WORKFLOW ====================
  
  /**
   * Verify a staged release
   */
  async verifyRelease(releaseId, user) {
    try {
      return await runTransaction(db, async (transaction) => {
        const releaseRef = doc(db, 'releases', releaseId);
        const releaseDoc = await transaction.get(releaseRef);
        
        if (!releaseDoc.exists()) {
          throw new Error('Release not found');
        }
        
        const releaseData = releaseDoc.data();
        
        // Validate status
        if (releaseData.status !== RELEASE_STATUS.STAGED) {
          throw new Error(`Cannot verify release with status: ${releaseData.status}`);
        }
        
        // Check if user staged this release (they cannot verify their own work)
        if (releaseData.stagedBy === user.id && user.role !== 'Admin' && user.role !== 'Office') {
          throw new Error('You cannot verify a release you staged yourself');
        }
        
        // Update release
        transaction.update(releaseRef, {
          status: RELEASE_STATUS.VERIFIED,
          verifiedBy: user.id,
          verifiedByName: user.name || user.email,
          verifiedAt: serverTimestamp(),
          lockedBy: null,
          lockedByName: null,
          lockedAt: null
        });
        
        // Create audit log
        const auditRef = doc(collection(db, 'auditLogs'));
        transaction.set(auditRef, {
          releaseId,
          userId: user.id,
          userName: user.name || user.email,
          action: 'VERIFIED',
          oldStatus: RELEASE_STATUS.STAGED,
          newStatus: RELEASE_STATUS.VERIFIED,
          createdAt: serverTimestamp()
        });
        
        return true;
      }).then(async (success) => {
        if (success) {
          // Fire UMS hook for verification completion
          const releaseDoc = await getDoc(doc(db, 'releases', releaseId));
          if (releaseDoc.exists()) {
            await this.fireUMSHook('release.verified', {
              id: releaseId,
              ...releaseDoc.data(),
              status: RELEASE_STATUS.VERIFIED
            }, user);
          }
        }
        return success;
      });
    } catch (error) {
      console.error('Failed to verify release:', error);
      throw error;
    }
  }
  
  /**
   * Reject verification
   */
  async rejectVerification(releaseId, reason, user) {
    try {
      if (!reason || reason.trim().length === 0) {
        throw new Error('Rejection reason is required');
      }
      
      return await runTransaction(db, async (transaction) => {
        const releaseRef = doc(db, 'releases', releaseId);
        const releaseDoc = await transaction.get(releaseRef);
        
        if (!releaseDoc.exists()) {
          throw new Error('Release not found');
        }
        
        const releaseData = releaseDoc.data();
        
        // Validate status
        if (releaseData.status !== RELEASE_STATUS.STAGED) {
          throw new Error(`Cannot reject verification for release with status: ${releaseData.status}`);
        }
        
        // Update release - revert to Entered
        transaction.update(releaseRef, {
          status: RELEASE_STATUS.ENTERED,
          verificationRejectedBy: user.id,
          verificationRejectedByName: user.name || user.email,
          verificationRejectedAt: serverTimestamp(),
          verificationRejectionReason: reason,
          pickTicketRevision: (releaseData.pickTicketRevision || 0) + 1,
          // Clear staging info
          stagedBy: null,
          stagedByName: null,
          stagedAt: null,
          stagedLocation: null,
          lockedBy: null,
          lockedByName: null,
          lockedAt: null
        });
        
        // Create audit log
        const auditRef = doc(collection(db, 'auditLogs'));
        transaction.set(auditRef, {
          releaseId,
          userId: user.id,
          userName: user.name || user.email,
          action: 'VERIFICATION_REJECTED',
          oldStatus: RELEASE_STATUS.STAGED,
          newStatus: RELEASE_STATUS.ENTERED,
          details: { reason },
          createdAt: serverTimestamp()
        });
        
        // Send notification
        await this.sendNotification('VERIFICATION_REJECTED', { 
          releaseId, 
          releaseNumber: releaseData.releaseNumber,
          reason, 
          user 
        });
        
        return true;
      });
    } catch (error) {
      console.error('Failed to reject verification:', error);
      throw error;
    }
  }
  
  // ==================== LOADING WORKFLOW ====================
  
  /**
   * Load a verified release onto a truck
   */
  async loadRelease(releaseId, truckNumber, user) {
    try {
      if (!truckNumber || truckNumber.trim().length === 0) {
        throw new Error('Truck number is required');
      }
      
      return await runTransaction(db, async (transaction) => {
        const releaseRef = doc(db, 'releases', releaseId);
        const releaseDoc = await transaction.get(releaseRef);
        
        if (!releaseDoc.exists()) {
          throw new Error('Release not found');
        }
        
        const releaseData = releaseDoc.data();
        
        // Validate status
        if (releaseData.status !== RELEASE_STATUS.VERIFIED) {
          throw new Error(`Cannot load release with status: ${releaseData.status}`);
        }
        
        // Update release
        transaction.update(releaseRef, {
          status: RELEASE_STATUS.LOADED,
          loadedBy: user.id,
          loadedByName: user.name || user.email,
          loadedAt: serverTimestamp(),
          truckNumber: truckNumber.trim(),
          lockedBy: null,
          lockedByName: null,
          lockedAt: null
        });
        
        // Create audit log
        const auditRef = doc(collection(db, 'auditLogs'));
        transaction.set(auditRef, {
          releaseId,
          userId: user.id,
          userName: user.name || user.email,
          action: 'LOADED',
          oldStatus: RELEASE_STATUS.VERIFIED,
          newStatus: RELEASE_STATUS.LOADED,
          details: { truckNumber: truckNumber.trim() },
          createdAt: serverTimestamp()
        });
        
        return true;
      }).then(async (success) => {
        if (success) {
          // Fire UMS hook for loading completion
          const releaseDoc = await getDoc(doc(db, 'releases', releaseId));
          if (releaseDoc.exists()) {
            await this.fireUMSHook('release.loaded', {
              id: releaseId,
              ...releaseDoc.data(),
              status: RELEASE_STATUS.LOADED,
              truckNumber: truckNumber.trim()
            }, user);
          }
        }
        return success;
      });
    } catch (error) {
      console.error('Failed to load release:', error);
      throw error;
    }
  }
  
  // ==================== UMS GRAPH INTEGRATION ====================
  
  /**
   * Fire UMS Graph hook for release status transitions
   * @param {string} event - Event type (release.created, release.staged, etc.)
   * @param {Object} releaseData - Release data object
   * @param {Object} user - User performing the action
   */
  async fireUMSHook(event, releaseData, user) {
    try {
      const hookData = {
        event,
        timestamp: new Date().toISOString(),
        releaseId: releaseData.id || releaseData.releaseId,
        releaseNumber: releaseData.releaseNumber || releaseData.ReleaseNumber,
        status: releaseData.status,
        userId: user.id,
        userName: user.name || user.email,
        metadata: {
          supplier: releaseData.supplierName || releaseData.SupplierName,
          customer: releaseData.customerName || releaseData.CustomerName,
          totalItems: releaseData.TotalItems,
          totalWeight: releaseData.TotalWeight
        }
      };

      // Store UMS event in Firestore for processing
      await addDoc(collection(db, 'umsEvents'), {
        ...hookData,
        processed: false,
        createdAt: serverTimestamp()
      });

      console.log(`🔗 UMS Hook fired: ${event}`, hookData);
      
      // Special processing for inventory decrement events
      if (event === 'release.verified') {
        await this.decrementInventory(releaseData);
      }

      return true;
    } catch (error) {
      console.error('Failed to fire UMS hook:', error);
      // Don't throw - UMS hooks should not block workflow
      return false;
    }
  }

  /**
   * Decrement inventory when release is verified
   */
  async decrementInventory(releaseData) {
    try {
      if (!releaseData.LineItems) return;

      const batch = writeBatch(db);
      
      for (const lineItem of releaseData.LineItems) {
        // Find matching barcodes to decrement
        const barcodesQuery = query(
          collection(db, 'barcodes'),
          where('ItemId', '==', lineItem.ItemId),
          where('SizeId', '==', lineItem.SizeId),
          where('LotId', '==', lineItem.LotId || null),
          where('Status', '==', 'Available')
        );
        
        const barcodesSnapshot = await getDocs(barcodesQuery);
        let remainingToDecrement = lineItem.Quantity;
        
        barcodesSnapshot.docs.forEach(barcodeDoc => {
          if (remainingToDecrement <= 0) return;
          
          const barcode = barcodeDoc.data();
          const currentQuantity = barcode.Quantity || 0;
          const decrementAmount = Math.min(remainingToDecrement, currentQuantity);
          const newQuantity = currentQuantity - decrementAmount;
          
          batch.update(doc(db, 'barcodes', barcodeDoc.id), {
            Quantity: newQuantity,
            UpdatedAt: serverTimestamp()
          });
          
          remainingToDecrement -= decrementAmount;
        });
      }
      
      await batch.commit();
      console.log('📦 Inventory decremented for verified release');
      
    } catch (error) {
      console.error('Failed to decrement inventory:', error);
    }
  }

  // ==================== NOTIFICATION SYSTEM ====================
  
  /**
   * Send notification based on action type
   */
  async sendNotification(type, data) {
    try {
      // Get users who should receive notifications
      const usersQuery = query(
        collection(db, 'users'),
        where('receiveNewRelease', '==', true)
      );
      const usersSnapshot = await getDocs(usersQuery);
      const recipients = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Filter recipients based on notification type
      let filteredRecipients = recipients;
      
      if (type === 'STAGING_COMPLETE' && data.stagedBy) {
        // Exclude the user who staged
        filteredRecipients = recipients.filter(u => u.id !== data.stagedBy);
      }
      
      if (type === 'VERIFICATION_REJECTED') {
        // Only send to Office and Admin users
        filteredRecipients = recipients.filter(u => 
          u.role === 'Office' || u.role === 'Admin'
        );
      }
      
      // Create notification records
      const batch = writeBatch(db);
      
      filteredRecipients.forEach(recipient => {
        const notificationRef = doc(collection(db, 'notifications'));
        batch.set(notificationRef, {
          type,
          recipientId: recipient.id,
          recipientEmail: recipient.email,
          data,
          sent: false,
          createdAt: serverTimestamp()
        });
      });
      
      await batch.commit();
      
      // Trigger email sending (this would connect to your email service)
      // For now, we'll just log it
      console.log(`Notification queued: ${type}`, { recipients: filteredRecipients, data });
      
      return true;
    } catch (error) {
      console.error('Failed to send notification:', error);
      // Don't throw - notifications should not block the main workflow
    }
  }
  
  // ==================== HELPER METHODS ====================
  
  /**
   * Get user by ID
   */
  async getUserById(userId) {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        return { id: userDoc.id, ...userDoc.data() };
      }
      return null;
    } catch (error) {
      console.error('Failed to get user:', error);
      return null;
    }
  }
  
  /**
   * Get release with lock status
   */
  async getReleaseWithLockStatus(releaseId, currentUserId) {
    try {
      const releaseDoc = await getDoc(doc(db, 'releases', releaseId));
      
      if (!releaseDoc.exists()) {
        return null;
      }
      
      const releaseData = { id: releaseDoc.id, ...releaseDoc.data() };
      
      // Check lock status
      const lockStatus = await this.isLocked(releaseId, currentUserId);
      
      return {
        ...releaseData,
        isLocked: lockStatus?.locked || false,
        lockedByOther: lockStatus?.locked || false,
        lockInfo: lockStatus
      };
    } catch (error) {
      console.error('Failed to get release with lock status:', error);
      throw error;
    }
  }
  
  /**
   * Can user verify this release?
   */
  canUserVerify(release, user) {
    // User cannot verify their own staging
    if (release.stagedBy === user.id) {
      // Unless they are Office or Admin
      return user.role === 'Office' || user.role === 'Admin';
    }
    return true;
  }
  
  /**
   * Get available actions for release based on status and user
   */
  getAvailableActions(release, user) {
    const actions = [];
    
    switch (release.status) {
      case RELEASE_STATUS.ENTERED:
        actions.push('STAGE');
        break;
        
      case RELEASE_STATUS.STAGED:
        if (this.canUserVerify(release, user)) {
          actions.push('VERIFY');
          actions.push('REJECT_VERIFICATION');
        }
        break;
        
      case RELEASE_STATUS.VERIFIED:
        actions.push('LOAD');
        break;
        
      case RELEASE_STATUS.LOADED:
        // Ready for BOL generation
        actions.push('GENERATE_BOL');
        break;
        
      default:
        break;
    }
    
    return actions;
  }
}

// Export singleton instance
export const releaseWorkflowService = new ReleaseWorkflowService();

// Export for component use
export default releaseWorkflowService;