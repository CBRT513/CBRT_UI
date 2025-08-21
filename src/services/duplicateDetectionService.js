// Duplicate Pick Ticket Detection Service
import { 
  collection, 
  query, 
  where, 
  getDocs,
  and,
  or
} from 'firebase/firestore';
import { db } from '../firebase/config';

class DuplicateDetectionService {
  /**
   * Check if a release with the same key fields already exists
   * Key fields: supplier, customer, release number, and line items (item, size, lot, quantity)
   */
  async checkForDuplicate(releaseData) {
    try {
      // Extract key fields
      const { 
        supplierId, 
        customerId, 
        releaseNumber,
        lineItems = []
      } = releaseData;

      if (!supplierId || !customerId || !releaseNumber) {
        return { isDuplicate: false, reason: 'Missing required fields' };
      }

      // Query for releases with same supplier, customer, and release number
      const q = query(
        collection(db, 'releases'),
        and(
          or(
            where('supplierId', '==', supplierId),
            where('SupplierId', '==', supplierId)
          ),
          or(
            where('customerId', '==', customerId),
            where('CustomerId', '==', customerId)
          ),
          or(
            where('releaseNumber', '==', releaseNumber),
            where('ReleaseNumber', '==', releaseNumber)
          )
        )
      );

      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return { isDuplicate: false };
      }

      // Check line items for exact match
      for (const doc of snapshot.docs) {
        const existingData = doc.data();
        const existingItems = existingData.lineItems || existingData.LineItems || [];
        
        // Skip if draft or different ID (updating existing)
        if (releaseData.id && doc.id === releaseData.id) {
          continue;
        }

        // Check if line items match exactly
        if (this.compareLineItems(lineItems, existingItems)) {
          return {
            isDuplicate: true,
            duplicateId: doc.id,
            duplicateData: existingData,
            message: `Duplicate found: Release ${releaseNumber} already exists with the same items`
          };
        }
      }

      return { isDuplicate: false };
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      // On error, allow save but log the issue
      return { 
        isDuplicate: false, 
        error: error.message,
        warning: 'Could not verify duplicates due to error'
      };
    }
  }

  /**
   * Compare two sets of line items for exact match
   */
  compareLineItems(items1, items2) {
    // Normalize and sort items for comparison
    const normalize = (items) => {
      return items.map(item => ({
        itemId: item.itemId || item.ItemId || '',
        itemCode: item.itemCode || item.ItemCode || '',
        sizeId: item.sizeId || item.SizeId || '',
        sizeName: item.sizeName || item.SizeName || '',
        lotNumber: item.lotNumber || item.LotNumber || '',
        quantity: parseInt(item.quantity || item.Quantity || 0)
      })).sort((a, b) => {
        // Sort by item, then size, then lot
        if (a.itemId !== b.itemId) return a.itemId.localeCompare(b.itemId);
        if (a.sizeId !== b.sizeId) return a.sizeId.localeCompare(b.sizeId);
        return (a.lotNumber || '').localeCompare(b.lotNumber || '');
      });
    };

    const normalized1 = normalize(items1);
    const normalized2 = normalize(items2);

    // Different number of items
    if (normalized1.length !== normalized2.length) {
      return false;
    }

    // Compare each item
    for (let i = 0; i < normalized1.length; i++) {
      const item1 = normalized1[i];
      const item2 = normalized2[i];

      if (
        item1.itemId !== item2.itemId ||
        item1.sizeId !== item2.sizeId ||
        (item1.lotNumber || '') !== (item2.lotNumber || '') ||
        item1.quantity !== item2.quantity
      ) {
        return false;
      }
    }

    return true; // Exact match
  }

  /**
   * Get similar releases (same supplier/customer but different items)
   */
  async findSimilarReleases(releaseData) {
    try {
      const { supplierId, customerId, releaseNumber } = releaseData;

      if (!supplierId || !customerId) {
        return [];
      }

      // Query for releases with same supplier and customer
      const q = query(
        collection(db, 'releases'),
        and(
          or(
            where('supplierId', '==', supplierId),
            where('SupplierId', '==', supplierId)
          ),
          or(
            where('customerId', '==', customerId),
            where('CustomerId', '==', customerId)
          )
        )
      );

      const snapshot = await getDocs(q);
      
      const similar = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        const docReleaseNumber = data.releaseNumber || data.ReleaseNumber;
        
        // Skip if same release number (already checked for exact duplicate)
        if (docReleaseNumber === releaseNumber) {
          return;
        }

        // Skip if it's the same document being edited
        if (releaseData.id && doc.id === releaseData.id) {
          return;
        }

        similar.push({
          id: doc.id,
          releaseNumber: docReleaseNumber,
          status: data.status || data.Status,
          createdAt: data.createdAt,
          itemCount: (data.lineItems || data.LineItems || []).length
        });
      });

      // Sort by creation date (newest first)
      return similar.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB - dateA;
      }).slice(0, 5); // Return up to 5 similar releases
    } catch (error) {
      console.error('Error finding similar releases:', error);
      return [];
    }
  }

  /**
   * Check for potential data entry errors
   */
  validateDataIntegrity(releaseData) {
    const warnings = [];
    const errors = [];

    // Check for suspicious patterns
    const { lineItems = [] } = releaseData;

    // Check for duplicate items within the same release
    const itemMap = new Map();
    lineItems.forEach((item, index) => {
      const key = `${item.itemId}-${item.sizeId}-${item.lotNumber || 'none'}`;
      if (itemMap.has(key)) {
        warnings.push({
          type: 'duplicate_item',
          message: `Line ${index + 1} appears to be a duplicate of line ${itemMap.get(key) + 1}`,
          severity: 'warning'
        });
      }
      itemMap.set(key, index);
    });

    // Check for unusual quantities
    lineItems.forEach((item, index) => {
      const qty = parseInt(item.quantity || 0);
      if (qty <= 0) {
        errors.push({
          type: 'invalid_quantity',
          message: `Line ${index + 1} has invalid quantity: ${qty}`,
          severity: 'error'
        });
      } else if (qty > 10000) {
        warnings.push({
          type: 'large_quantity',
          message: `Line ${index + 1} has unusually large quantity: ${qty}`,
          severity: 'warning'
        });
      }
    });

    // Check release number format
    const releaseNumber = releaseData.releaseNumber;
    if (releaseNumber) {
      // Check for common typos or issues
      if (releaseNumber.includes('  ')) {
        warnings.push({
          type: 'format_issue',
          message: 'Release number contains double spaces',
          severity: 'warning'
        });
      }
      if (releaseNumber !== releaseNumber.trim()) {
        warnings.push({
          type: 'format_issue',
          message: 'Release number has leading or trailing spaces',
          severity: 'warning'
        });
      }
    }

    return { warnings, errors };
  }

  /**
   * Generate a hash for quick duplicate detection
   */
  generateReleaseHash(releaseData) {
    const { supplierId, customerId, releaseNumber, lineItems = [] } = releaseData;
    
    // Create a deterministic string representation
    const itemsHash = lineItems
      .map(item => `${item.itemId}-${item.sizeId}-${item.lotNumber || 'none'}-${item.quantity}`)
      .sort()
      .join('|');
    
    return `${supplierId}-${customerId}-${releaseNumber}-${itemsHash}`;
  }

  /**
   * Check if user is trying to create multiple releases rapidly (potential mistake)
   */
  async checkRapidCreation(userId) {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      const q = query(
        collection(db, 'releases'),
        where('createdBy', '==', userId),
        where('createdAt', '>=', fiveMinutesAgo)
      );

      const snapshot = await getDocs(q);
      
      if (snapshot.size >= 5) {
        return {
          warning: true,
          message: `You've created ${snapshot.size} releases in the last 5 minutes. Please verify this is intentional.`,
          count: snapshot.size
        };
      }

      return { warning: false };
    } catch (error) {
      console.error('Error checking rapid creation:', error);
      return { warning: false };
    }
  }
}

// Export singleton instance
export const duplicateDetectionService = new DuplicateDetectionService();
export default duplicateDetectionService;