import { 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  addDoc, 
  serverTimestamp,
  runTransaction,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { auth } from '../firebase/config';
import { notificationsService } from './notifications.service';

class StagingService {
  /**
   * Validate that all lines are fully staged
   */
  async validateFullStaging(releaseId, stagedQuantities) {
    try {
      const releaseRef = doc(db, 'releases', releaseId);
      const releaseSnap = await getDoc(releaseRef);
      
      if (!releaseSnap.exists()) {
        return { ok: false, errors: ['Release not found'] };
      }
      
      const release = releaseSnap.data();
      const errors = [];
      
      // Get release lines
      const linesRef = collection(db, 'releaseLines');
      const q = query(linesRef, where('releaseId', '==', releaseId));
      const linesSnapshot = await getDocs(q);
      
      if (linesSnapshot.empty) {
        // If no lines exist, check LineItems array
        if (!release.LineItems || release.LineItems.length === 0) {
          errors.push('No line items found for this release');
        } else {
          // Validate each line item
          release.LineItems.forEach((line, index) => {
            const requestedQty = line.Quantity || line.qtyRequested || 0;
            const stagedQty = stagedQuantities[index] || 0;
            
            if (stagedQty !== requestedQty) {
              errors.push(`Line ${index + 1}: Staged ${stagedQty} but requested ${requestedQty}`);
            }
          });
        }
      } else {
        // Validate release lines from collection
        linesSnapshot.docs.forEach((lineDoc) => {
          const line = lineDoc.data();
          const requestedQty = line.qtyRequested || line.Quantity || 0;
          const stagedQty = stagedQuantities[lineDoc.id] || 0;
          
          if (stagedQty !== requestedQty) {
            errors.push(`Line ${line.itemName || lineDoc.id}: Staged ${stagedQty} but requested ${requestedQty}`);
          }
        });
      }
      
      return { ok: errors.length === 0, errors };
    } catch (error) {
      console.error('Error validating staging:', error);
      return { ok: false, errors: [error.message] };
    }
  }

  /**
   * Mark release as staged
   */
  async markStaged({ releaseId, location, stagedQuantities }) {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Validate staging quantities
      const validation = await this.validateFullStaging(releaseId, stagedQuantities);
      if (!validation.ok) {
        throw new Error(`Staging validation failed: ${validation.errors.join(', ')}`);
      }

      // Use transaction to ensure consistency
      await runTransaction(db, async (transaction) => {
        const releaseRef = doc(db, 'releases', releaseId);
        const releaseSnap = await transaction.get(releaseRef);
        
        if (!releaseSnap.exists()) {
          throw new Error('Release not found');
        }
        
        const release = releaseSnap.data();
        
        if (release.status !== 'Entered') {
          throw new Error(`Cannot stage release with status: ${release.status}`);
        }
        
        // Update release with staging info
        transaction.update(releaseRef, {
          status: 'Staged',
          stagedBy: currentUser.uid,
          stagedAt: serverTimestamp(),
          stagingLocation: location,
          statusChangedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        // Update release lines with staged quantities
        const linesRef = collection(db, 'releaseLines');
        const q = query(linesRef, where('releaseId', '==', releaseId));
        const linesSnapshot = await getDocs(q);
        
        if (!linesSnapshot.empty) {
          linesSnapshot.docs.forEach((lineDoc) => {
            const lineRef = doc(db, 'releaseLines', lineDoc.id);
            const stagedQty = stagedQuantities[lineDoc.id] || 0;
            transaction.update(lineRef, {
              qtyStaged: stagedQty,
              updatedAt: serverTimestamp()
            });
          });
        } else if (release.LineItems) {
          // Update LineItems array with staged quantities
          const updatedLineItems = release.LineItems.map((line, index) => ({
            ...line,
            qtyStaged: stagedQuantities[index] || line.Quantity || 0
          }));
          transaction.update(releaseRef, {
            LineItems: updatedLineItems
          });
        }
        
        // Add audit log
        const auditRef = doc(collection(db, 'auditLogs'));
        transaction.set(auditRef, {
          action: 'release.staged',
          releaseId: releaseId,
          userId: currentUser.uid,
          details: {
            location,
            stagedQuantities,
            previousStatus: 'Entered',
            newStatus: 'Staged'
          },
          timestamp: serverTimestamp()
        });
      });

      // Notify verifiers (outside transaction)
      const releaseDoc = await getDoc(doc(db, 'releases', releaseId));
      const releaseData = { id: releaseId, ...releaseDoc.data() };
      await notificationsService.notifyVerifiersStaged(releaseData);

      return { success: true };
    } catch (error) {
      console.error('Error marking release as staged:', error);
      throw error;
    }
  }

  /**
   * Get staging locations
   */
  getStagingLocations() {
    return ['Allied', 'Tent', 'Warehouse', 'Yard'];
  }
}

export const stagingService = new StagingService();