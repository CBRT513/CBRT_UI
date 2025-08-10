// src/hooks/useInventoryAvailability.js

import { useState, useEffect, useCallback } from 'react';
import inventoryAvailabilityService from '../services/inventoryAvailabilityService';
import logger from '../utils/logger';

/**
 * React hook for inventory availability calculations
 */
export function useInventoryAvailability() {
  const [availabilityCache, setAvailabilityCache] = useState(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Get availability for a single item/size/lot combination
   */
  const getAvailability = useCallback(async (itemId, sizeId, lotId) => {
    const cacheKey = `${itemId}-${sizeId}-${lotId}`;
    
    // Return cached result if available and recent (within 30 seconds)
    const cached = availabilityCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 30000) {
      return cached.data;
    }

    try {
      setLoading(true);
      setError(null);
      
      const availability = await inventoryAvailabilityService.getAvailableQuantity(
        itemId, 
        sizeId, 
        lotId
      );

      // Cache the result
      setAvailabilityCache(prev => new Map(prev).set(cacheKey, {
        data: availability,
        timestamp: Date.now()
      }));

      return availability;

    } catch (err) {
      logger.error('Hook error getting availability', { error: err.message });
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [availabilityCache]);

  /**
   * Get availability for multiple combinations (for dropdowns)
   */
  const getAvailabilitySummary = useCallback(async (combinations) => {
    try {
      setLoading(true);
      setError(null);

      const results = await inventoryAvailabilityService.getAvailabilitySummary(combinations);
      
      // Cache individual results
      results.forEach(result => {
        const cacheKey = `${result.itemId}-${result.sizeId}-${result.lotId}`;
        setAvailabilityCache(prev => new Map(prev).set(cacheKey, {
          data: {
            onHand: result.onHand,
            committed: result.committed,
            shipped: result.shipped,
            available: result.available,
            status: result.status
          },
          timestamp: Date.now()
        }));
      });

      return results;

    } catch (err) {
      logger.error('Hook error getting availability summary', { error: err.message });
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Check if quantity can be allocated
   */
  const checkAllocation = useCallback(async (itemId, sizeId, lotId, quantity) => {
    try {
      setError(null);
      return await inventoryAvailabilityService.canAllocate(itemId, sizeId, lotId, quantity);
    } catch (err) {
      logger.error('Hook error checking allocation', { error: err.message });
      setError(err.message);
      throw err;
    }
  }, []);

  /**
   * Clear cache (useful when data changes)
   */
  const clearCache = useCallback(() => {
    setAvailabilityCache(new Map());
    logger.debug('Availability cache cleared');
  }, []);

  /**
   * Format availability for display in dropdowns
   */
  const formatAvailabilityDisplay = useCallback((availability, itemName, sizeName) => {
    if (!availability) return itemName;

    const { onHand, committed, available, status } = availability;
    const statusIcon = status === 'Available' ? '✅' : '⚠️';
    
    return `${itemName} ${sizeName ? `- ${sizeName}` : ''} ${statusIcon} (Available: ${available} | On-hand: ${onHand} | Committed: ${committed})`;
  }, []);

  return {
    getAvailability,
    getAvailabilitySummary,
    checkAllocation,
    clearCache,
    formatAvailabilityDisplay,
    loading,
    error,
    availabilityCache: availabilityCache.size // For debugging
  };
}

/**
 * Hook specifically for real-time availability of a single item
 */
export function useItemAvailability(itemId, sizeId, lotId) {
  const [availability, setAvailability] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refreshAvailability = useCallback(async () => {
    if (!itemId || !sizeId || !lotId) {
      setAvailability(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const result = await inventoryAvailabilityService.getAvailableQuantity(
        itemId, 
        sizeId, 
        lotId
      );
      
      setAvailability(result);
      
    } catch (err) {
      logger.error('Error in useItemAvailability', { error: err.message });
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [itemId, sizeId, lotId]);

  useEffect(() => {
    refreshAvailability();
  }, [refreshAvailability]);

  return {
    availability,
    loading,
    error,
    refresh: refreshAvailability
  };
}