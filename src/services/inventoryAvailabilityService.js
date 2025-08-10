// src/services/inventoryAvailabilityService.js

import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

// Inline logger (matching NewRelease.jsx pattern)
const timestamp = () => new Date().toISOString();
const logger = {
  debug: (msg, extra) => console.debug(`[DEBUG ${timestamp()}] ${msg}`, extra || ""),
  info: (msg, extra) => console.info(`[INFO  ${timestamp()}] ${msg}`, extra || ""),
  error: (msg, extra) => console.error(`[ERROR ${timestamp()}] ${msg}`, extra || "")
};

/**
 * Service for calculating real-time inventory availability
 * Available Quantity = barcode.Quantity - (Entered + Staged + Verified + Shipped)
 */
class InventoryAvailabilityService {
  
  /**
   * Calculate available quantity for a specific item/size/lot combination
   * @param {string} itemId - The item ID
   * @param {string} sizeId - The size ID  
   * @param {string} lotId - The lot ID
   * @returns {Promise<Object>} Availability data
   */
  async getAvailableQuantity(itemId, sizeId, lotId) {
    try {
      logger.debug('Calculating available quantity', { itemId, sizeId, lotId });

      // Get total on-hand quantity from barcodes
      const onHandQuantity = await this.getOnHandQuantity(itemId, sizeId, lotId);
      
      // Get committed quantities from releases  
      const committedQuantity = await this.getCommittedQuantity(itemId, sizeId, lotId);
      
      // Get shipped quantities from completed BOLs
      const shippedQuantity = await this.getShippedQuantity(itemId, sizeId, lotId);
      
      const availableQuantity = Math.max(0, onHandQuantity - committedQuantity - shippedQuantity);
      
      const result = {
        onHand: onHandQuantity,
        committed: committedQuantity,
        shipped: shippedQuantity,
        available: availableQuantity,
        status: availableQuantity > 0 ? 'Available' : 'Not Available'
      };

      logger.debug('Available quantity calculated', { 
        itemId, 
        sizeId, 
        lotId, 
        ...result 
      });

      return result;

    } catch (error) {
      logger.error('Error calculating available quantity', { 
        error: error.message, 
        itemId, 
        sizeId, 
        lotId 
      });
      throw error;
    }
  }

  /**
   * Get total on-hand quantity from barcodes collection
   */
  async getOnHandQuantity(itemId, sizeId, lotId) {
    try {
      const barcodesRef = collection(db, 'barcodes');
      const q = query(
        barcodesRef,
        where('ItemId', '==', itemId),
        where('SizeId', '==', sizeId),
        where('LotId', '==', lotId)
      );

      const querySnapshot = await getDocs(q);
      let totalQuantity = 0;

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        totalQuantity += data.Quantity || 0;
      });

      logger.debug('On-hand quantity calculated', { 
        itemId, 
        sizeId, 
        lotId, 
        totalQuantity,
        barcodeCount: querySnapshot.size 
      });

      return totalQuantity;

    } catch (error) {
      logger.error('Error getting on-hand quantity', { error: error.message });
      return 0;
    }
  }

  /**
   * Get committed quantities from releases (Entered, Staged, Verified statuses)
   */
  async getCommittedQuantity(itemId, sizeId, lotId) {
    try {
      const releasesRef = collection(db, 'releases');
      const q = query(
        releasesRef,
        where('Status', 'in', ['Entered', 'Staged', 'Verified'])
      );

      const querySnapshot = await getDocs(q);
      let totalCommitted = 0;

      querySnapshot.forEach((doc) => {
        const release = doc.data();
        if (release.LineItems && Array.isArray(release.LineItems)) {
          release.LineItems.forEach((lineItem) => {
            if (
              lineItem.ItemId === itemId &&
              lineItem.SizeId === sizeId &&
              lineItem.LotId === lotId
            ) {
              totalCommitted += lineItem.Quantity || 0;
            }
          });
        }
      });

      logger.debug('Committed quantity calculated', { 
        itemId, 
        sizeId, 
        lotId, 
        totalCommitted,
        releaseCount: querySnapshot.size 
      });

      return totalCommitted;

    } catch (error) {
      logger.error('Error getting committed quantity', { error: error.message });
      return 0;
    }
  }

  /**
   * Get shipped quantities from completed BOLs
   */
  async getShippedQuantity(itemId, sizeId, lotId) {
    try {
      const bolsRef = collection(db, 'bols');
      const q = query(
        bolsRef,
        where('Status', '==', 'Completed')
      );

      const querySnapshot = await getDocs(q);
      let totalShipped = 0;

      // For each completed BOL, get the associated release and its line items
      for (const bolDoc of querySnapshot.docs) {
        const bol = bolDoc.data();
        if (bol.ReleaseId) {
          // Get the release associated with this BOL
          const releaseSnapshot = await getDocs(
            query(collection(db, 'releases'), where('__name__', '==', bol.ReleaseId))
          );
          
          releaseSnapshot.forEach((releaseDoc) => {
            const release = releaseDoc.data();
            if (release.LineItems && Array.isArray(release.LineItems)) {
              release.LineItems.forEach((lineItem) => {
                if (
                  lineItem.ItemId === itemId &&
                  lineItem.SizeId === sizeId &&
                  lineItem.LotId === lotId
                ) {
                  totalShipped += lineItem.Quantity || 0;
                }
              });
            }
          });
        }
      }

      logger.debug('Shipped quantity calculated', { 
        itemId, 
        sizeId, 
        lotId, 
        totalShipped,
        bolCount: querySnapshot.size 
      });

      return totalShipped;

    } catch (error) {
      logger.error('Error getting shipped quantity', { error: error.message });
      return 0;
    }
  }

  /**
   * Get availability summary for multiple item/size/lot combinations
   * Useful for displaying availability in dropdowns
   */
  async getAvailabilitySummary(combinations) {
    try {
      logger.debug('Getting availability summary', { combinationCount: combinations.length });

      const results = await Promise.all(
        combinations.map(async ({ itemId, sizeId, lotId, itemName, sizeName }) => {
          const availability = await this.getAvailableQuantity(itemId, sizeId, lotId);
          return {
            itemId,
            sizeId,
            lotId,
            itemName,
            sizeName,
            ...availability
          };
        })
      );

      logger.debug('Availability summary completed', { resultCount: results.length });
      return results;

    } catch (error) {
      logger.error('Error getting availability summary', { error: error.message });
      throw error;
    }
  }

  /**
   * Check if a specific quantity can be allocated for an item/size/lot
   */
  async canAllocate(itemId, sizeId, lotId, requestedQuantity) {
    try {
      const availability = await this.getAvailableQuantity(itemId, sizeId, lotId);
      const canAllocate = availability.available >= requestedQuantity;
      
      logger.debug('Allocation check', { 
        itemId, 
        sizeId, 
        lotId, 
        requestedQuantity,
        availableQuantity: availability.available,
        canAllocate 
      });

      return {
        canAllocate,
        availability,
        shortfall: canAllocate ? 0 : requestedQuantity - availability.available
      };

    } catch (error) {
      logger.error('Error checking allocation', { error: error.message });
      throw error;
    }
  }
}

// Export singleton instance
export default new InventoryAvailabilityService();