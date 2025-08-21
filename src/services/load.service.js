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
import { api } from '../lib/api';

class LoadService {
  /**
   * Mark release as loaded and decrement inventory
   */
  async markLoaded({ releaseId, truckNumber }) {
    // Check SSO flag and route to API if enabled
    if (String(import.meta.env.VITE_ENABLE_SSO) === "true") {
      return api(`/cbrt/releases/${releaseId}/load`, {
        method: 'POST',
        body: JSON.stringify({ truckNumber })
      });
    }
    
    // Legacy Firestore path
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      if (!truckNumber || truckNumber.trim() === '') {
        throw new Error('Truck number is required');
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
        if (release.status !== 'Verified' && release.status !== 'Staged') {
          throw new Error(`Cannot load release with status: ${release.status}. Release must be Verified.`);
        }
        
        // Get release lines to process inventory
        const linesRef = collection(db, 'releaseLines');
        const linesQuery = query(linesRef, where('releaseId', '==', releaseId));
        const linesSnapshot = await getDocs(linesQuery);
        
        const inventoryUpdates = new Map(); // Track inventory updates
        
        if (!linesSnapshot.empty) {
          // Process release lines from collection
          for (const lineDoc of linesSnapshot.docs) {
            const line = lineDoc.data();
            const qtyToLoad = line.qtyStaged || line.qtyRequested || line.Quantity || 0;
            
            if (qtyToLoad > 0 && line.lotId) {
              // Get current inventory for this lot
              const lotRef = doc(db, 'inventoryLots', line.lotId);
              const lotSnap = await transaction.get(lotRef);
              
              if (lotSnap.exists()) {
                const lot = lotSnap.data();
                const currentOnHand = lot.onHandQty || 0;
                const currentCommitted = lot.committedQty || 0;
                
                // Calculate new quantities
                const newOnHand = Math.max(0, currentOnHand - qtyToLoad);
                const newCommitted = Math.max(0, currentCommitted - qtyToLoad);
                
                inventoryUpdates.set(line.lotId, {
                  ref: lotRef,
                  onHandQty: newOnHand,
                  committedQty: newCommitted
                });
              }
            }
            
            // Update line with loaded quantity
            const lineRef = doc(db, 'releaseLines', lineDoc.id);
            transaction.update(lineRef, {
              qtyLoaded: qtyToLoad,
              qtyShipped: qtyToLoad,
              updatedAt: serverTimestamp()
            });
          }
        } else if (release.LineItems) {
          // Process LineItems array
          const updatedLineItems = release.LineItems.map((line) => {
            const qtyToLoad = line.qtyStaged || line.Quantity || 0;
            
            // For LineItems, we may not have lot IDs, so just update the quantities
            return {
              ...line,
              qtyLoaded: qtyToLoad,
              qtyShipped: qtyToLoad
            };
          });
          
          // Update LineItems in release
          transaction.update(releaseRef, {
            LineItems: updatedLineItems
          });
        }
        
        // Apply inventory updates
        for (const [lotId, updates] of inventoryUpdates) {
          transaction.update(updates.ref, {
            onHandQty: updates.onHandQty,
            committedQty: updates.committedQty,
            updatedAt: serverTimestamp()
          });
        }
        
        // Update release to Loaded
        transaction.update(releaseRef, {
          status: 'Loaded',
          loadedBy: currentUser.uid,
          loadedAt: serverTimestamp(),
          truckNumber: truckNumber,
          statusChangedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        // Add audit log
        const auditRef = doc(collection(db, 'auditLogs'));
        transaction.set(auditRef, {
          action: 'release.loaded',
          releaseId: releaseId,
          userId: currentUser.uid,
          details: {
            previousStatus: release.status,
            newStatus: 'Loaded',
            truckNumber: truckNumber,
            inventoryUpdates: Array.from(inventoryUpdates.entries()).map(([lotId, updates]) => ({
              lotId,
              onHandQty: updates.onHandQty,
              committedQty: updates.committedQty
            }))
          },
          timestamp: serverTimestamp()
        });
        
        // Add UMS event if enabled
        if (import.meta.env.VITE_ENABLE_UMS === 'true') {
          const umsEventRef = doc(collection(db, 'umsEvents'));
          transaction.set(umsEventRef, {
            eventType: 'release.loaded',
            releaseId: releaseId,
            userId: currentUser.uid,
            data: {
              releaseNumber: release.number || release.ReleaseNumber,
              customerName: release.customerName,
              truckNumber: truckNumber,
              inventoryDecremented: inventoryUpdates.size > 0
            },
            timestamp: serverTimestamp()
          });
        }
      });

      // Notify customer (outside transaction)
      if (releaseData) {
        await notificationsService.notifyCustomerLoaded(releaseData, truckNumber);
      }

      return { success: true };
    } catch (error) {
      console.error('Error marking release as loaded:', error);
      throw error;
    }
  }

  /**
   * Get loading statistics for a release
   */
  async getLoadingStats(releaseId) {
    try {
      const releaseRef = doc(db, 'releases', releaseId);
      const releaseSnap = await getDoc(releaseRef);
      
      if (!releaseSnap.exists()) {
        throw new Error('Release not found');
      }
      
      const release = releaseSnap.data();
      
      // Get release lines
      const linesRef = collection(db, 'releaseLines');
      const q = query(linesRef, where('releaseId', '==', releaseId));
      const linesSnapshot = await getDocs(q);
      
      let totalRequested = 0;
      let totalStaged = 0;
      let totalLoaded = 0;
      
      if (!linesSnapshot.empty) {
        linesSnapshot.docs.forEach((lineDoc) => {
          const line = lineDoc.data();
          totalRequested += line.qtyRequested || 0;
          totalStaged += line.qtyStaged || 0;
          totalLoaded += line.qtyLoaded || 0;
        });
      } else if (release.LineItems) {
        release.LineItems.forEach((line) => {
          totalRequested += line.Quantity || line.qtyRequested || 0;
          totalStaged += line.qtyStaged || 0;
          totalLoaded += line.qtyLoaded || 0;
        });
      }
      
      return {
        totalRequested,
        totalStaged,
        totalLoaded,
        isFullyStaged: totalStaged === totalRequested,
        isFullyLoaded: totalLoaded === totalRequested
      };
    } catch (error) {
      console.error('Error getting loading stats:', error);
      throw error;
    }
  }
}

export const loadService = new LoadService();