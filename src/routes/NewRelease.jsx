<<<<<<< Updated upstream
import React, { useState, useEffect } from 'react';
||||||| Stash base
// src/routes/NewRelease.jsx - COMPLETE FIXED VERSION
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc } from 'firebase/firestore';
=======
// src/routes/NewRelease.jsx - FULLY OPTIMIZED with React Performance
import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { collection, onSnapshot, addDoc, query, where } from 'firebase/firestore';
>>>>>>> Stashed changes
import { db } from '../firebase/config';
import { 
  collection, 
  getDocs, 
  addDoc, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  updateDoc,
  doc,
  deleteDoc,
  runTransaction
} from 'firebase/firestore';
import releaseNotificationService from '../services/releaseNotificationService';
import duplicateDetectionService from '../services/duplicateDetectionService';

<<<<<<< Updated upstream
const NewRelease = () => {
  // Core state
  const [suppliers, setSuppliers] = useState([]);
||||||| Stash base
export default function NewRelease() {
=======
// ✅ REACT OPTIMIZATION: Memoized Line Item Component
const LineItem = memo(({ 
  line, 
  idx, 
  availableItems, 
  availableSizes, 
  availableLots, 
  updateLine, 
  removeLine, 
  isDataLoading 
}) => {
  const handleItemChange = useCallback((e) => {
    updateLine(idx, 'itemId', e.target.value);
  }, [idx, updateLine]);

  const handleSizeChange = useCallback((e) => {
    updateLine(idx, 'sizeId', e.target.value);
  }, [idx, updateLine]);

  const handleLotChange = useCallback((e) => {
    updateLine(idx, 'lotId', e.target.value);
  }, [idx, updateLine]);

  const handleQtyChange = useCallback((e) => {
    updateLine(idx, 'qty', parseInt(e.target.value, 10));
  }, [idx, updateLine]);

  const handleRemove = useCallback(() => {
    removeLine(idx);
  }, [idx, removeLine]);

  return (
    <div className="flex gap-2 items-center">
      <select
        value={line.itemId}
        onChange={handleItemChange}
        required
        disabled={isDataLoading}
        className="flex-1 border px-3 py-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        <option value="">
          {isDataLoading ? 'Loading...' : 'Select Item'}
        </option>
        {availableItems.map(i => (
          <option key={i.id} value={i.id}>{i.code}</option>
        ))}
      </select>

      <select
        value={line.sizeId}
        onChange={handleSizeChange}
        disabled={!line.itemId || isDataLoading}
        required
        className="flex-1 border px-3 py-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        <option value="">
          {!line.itemId ? 'Select Item First' : isDataLoading ? 'Loading...' : 'Select Size'}
        </option>
        {availableSizes.map(s => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>

      <select
        value={line.lotId}
        onChange={handleLotChange}
        disabled={!line.itemId || !line.sizeId || isDataLoading}
        required
        className="flex-1 border px-3 py-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        <option value="">
          {!line.itemId || !line.sizeId ? 'Select Size First' : isDataLoading ? 'Loading...' : 'Select Lot'}
        </option>
        {availableLots.map(l => (
          <option key={l.id} value={l.id}>{l.number}</option>
        ))}
      </select>

      <input
        type="number"
        min="1"
        value={line.qty}
        onChange={handleQtyChange}
        disabled={isDataLoading}
        className="w-16 border px-3 py-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        required
      />

      <button
        type="button"
        onClick={handleRemove}
        disabled={isDataLoading}
        className="text-red-600 hover:text-red-800 font-bold text-xl w-8 h-8 flex items-center justify-center disabled:text-gray-400 disabled:cursor-not-allowed"
        title="Remove line"
      >×</button>
    </div>
  );
});

LineItem.displayName = 'LineItem';

export default function NewRelease() {
>>>>>>> Stashed changes
  const [customers, setCustomers] = useState([]);
<<<<<<< Updated upstream
  const [filteredCustomers, setFilteredCustomers] = useState([]);
||||||| Stash base
  const [barcodes, setBarcodes] = useState([]);  // ✅ ADD: Barcodes collection
  const [lots, setLots] = useState([]);
=======
  const [customerBarcodes, setCustomerBarcodes] = useState([]); // Only barcodes for selected customer
  const [lots, setLots] = useState([]);
>>>>>>> Stashed changes
  const [items, setItems] = useState([]);
  const [sizes, setSizes] = useState([]);
<<<<<<< Updated upstream
  const [barcodes, setBarcodes] = useState([]);
  
  // Form state
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [releaseNumber, setReleaseNumber] = useState('');
  const [releaseDate, setReleaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [lineItems, setLineItems] = useState([{
    itemId: '',
    sizeId: '',
    lotNumber: '',
    requestedQuantity: '',
    availableQuantity: 0,
    availableItems: [],
    availableSizes: [],
    availableLots: []
  }]);
  
  // Loading and UI state
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDebug, setShowDebug] = useState(process.env.NODE_ENV === 'development');
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [validationWarnings, setValidationWarnings] = useState([]);
  
  // Allocation tracking state
  const [draftReleaseId, setDraftReleaseId] = useState(null);
  const [allocations, setAllocations] = useState([]);
  const [lastActivity, setLastActivity] = useState(new Date());
  
  // In-memory inventory cache for fast calculations
  const [inventoryCache, setInventoryCache] = useState(new Map());
  const [isInventoryLoaded, setIsInventoryLoaded] = useState(false);
||||||| Stash base
  const [form, setForm] = useState({ customerId: '', items: [] });
=======
  const [form, setForm] = useState({ customerId: '', items: [] });
  const [loading, setLoading] = useState({
    customers: true,
    barcodes: false,
    items: false,
    sizes: false,
    lots: false
  });
>>>>>>> Stashed changes

<<<<<<< Updated upstream
  // Initialize draft release and activity tracking
||||||| Stash base
=======
  // ✅ OPTIMIZATION 1: Only fetch active customers on mount
>>>>>>> Stashed changes
  useEffect(() => {
<<<<<<< Updated upstream
    const initializeDraftRelease = async () => {
      // Create a temporary draft release ID for allocation tracking
      const tempReleaseId = `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setDraftReleaseId(tempReleaseId);
      
      // Create initial activity record
      try {
        await addDoc(collection(db, 'release_activity'), {
          releaseId: tempReleaseId,
          status: 'draft',
          lastActivity: serverTimestamp(),
          createdAt: serverTimestamp()
        });
        console.log('🆔 Draft release initialized:', tempReleaseId);
      } catch (error) {
        console.error('❌ Error creating draft activity:', error);
      }
    };

    initializeDraftRelease();

    // Cleanup on component unmount
    return () => {
      if (draftReleaseId) {
        cleanupDraftAllocations(draftReleaseId);
      }
    };
||||||| Stash base
    const unsub = [
      onSnapshot(collection(db, 'customers'), snap => setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'barcodes'), snap => setBarcodes(snap.docs.map(d => ({ id: d.id, ...d.data() })))), // ✅ ADD: Barcodes subscription
      onSnapshot(collection(db, 'lots'), snap => setLots(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'items'), snap => setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'sizes'), snap => setSizes(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
    ];
    return () => unsub.forEach(fn => fn());
=======
    const customersQuery = query(
      collection(db, 'customers'),
      where('Status', '==', 'Active')
    );
    
    const unsubCustomers = onSnapshot(customersQuery, snap => {
      setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(prev => ({ ...prev, customers: false }));
    });

    return () => unsubCustomers();
>>>>>>> Stashed changes
  }, []);

<<<<<<< Updated upstream
  // Check for duplicates when key fields change
  useEffect(() => {
    const checkForPotentialDuplicates = async () => {
      if (!selectedSupplier || !selectedCustomer || !releaseNumber) {
        setDuplicateWarning(null);
        return;
||||||| Stash base
  const updateLine = (idx, key, value) => {
    setForm(f => {
      const updated = [...f.items];
      const currentLine = { ...updated[idx], [key]: value };
      
      // Auto-reset downstream selects when upstream changes
      if (key === 'itemId') {
        currentLine.sizeId = '';
        currentLine.lotId = '';
      } else if (key === 'sizeId') {
        currentLine.lotId = '';
=======
  // ✅ OPTIMIZATION 2: Fetch data only when customer changes
  useEffect(() => {
    if (!form.customerId) {
      setCustomerBarcodes([]);
      setItems([]);
      setSizes([]);
      setLots([]);
      return;
    }

    setLoading({
      customers: false,
      barcodes: true,
      items: true,
      sizes: true,
      lots: true
    });

    // Query barcodes for selected customer only
    const barcodesQuery = query(
      collection(db, 'barcodes'),
      where('CustomerId', '==', form.customerId)
    );

    // Query lots for selected customer only
    const lotsQuery = query(
      collection(db, 'lots'),
      where('CustomerId', '==', form.customerId),
      where('Status', '==', 'Active')
    );

    // Query active items and sizes (we'll filter these in memory for now)
    const itemsQuery = query(
      collection(db, 'items'),
      where('Status', '==', 'Active')
    );

    const sizesQuery = query(
      collection(db, 'sizes'),
      where('Status', '==', 'Active')
    );

    const unsubscribers = [
      onSnapshot(barcodesQuery, snap => {
        setCustomerBarcodes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(prev => ({ ...prev, barcodes: false }));
      }),
      
      onSnapshot(lotsQuery, snap => {
        setLots(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(prev => ({ ...prev, lots: false }));
      }),
      
      onSnapshot(itemsQuery, snap => {
        setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(prev => ({ ...prev, items: false }));
      }),
      
      onSnapshot(sizesQuery, snap => {
        setSizes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(prev => ({ ...prev, sizes: false }));
      })
    ];

    return () => unsubscribers.forEach(fn => fn());
  }, [form.customerId]);

  // ✅ OPTIMIZATION 3: useMemo for expensive filtering operations
  const itemsForCustomer = useMemo(() => {
    if (!form.customerId || !customerBarcodes.length) return [];
    
    // Get unique item IDs from customer's barcodes
    const itemIds = new Set(
      customerBarcodes
        .map(b => b.ItemId)
        .filter(Boolean)
    );
    
    // Filter and deduplicate items
    const itemMap = new Map();
    items
      .filter(i => itemIds.has(i.id))
      .forEach(i => {
        if (!itemMap.has(i.id)) {
          itemMap.set(i.id, {
            id: i.id,
            code: i.ItemCode,
            name: i.ItemName
          });
        }
      });
    
    return Array.from(itemMap.values()).sort((a, b) => (a.code || '').localeCompare(b.code || ''));
  }, [form.customerId, customerBarcodes, items]);

  // ✅ OPTIMIZATION: Create lookup maps for better performance
  const sizeLookupByItem = useMemo(() => {
    if (!form.customerId || !customerBarcodes.length) return new Map();
    
    const lookupMap = new Map();
    
    // Group barcodes by ItemId for faster lookups
    const barcodesByItem = new Map();
    customerBarcodes.forEach(b => {
      if (!b.ItemId) return;
      if (!barcodesByItem.has(b.ItemId)) {
        barcodesByItem.set(b.ItemId, []);
      }
      barcodesByItem.get(b.ItemId).push(b);
    });
    
    // Build size lookup for each item
    barcodesByItem.forEach((itemBarcodes, itemId) => {
      const sizeIds = new Set(
        itemBarcodes
          .map(b => b.SizeId)
          .filter(Boolean)
      );
      
      const sizeMap = new Map();
      sizes
        .filter(s => sizeIds.has(s.id))
        .forEach(s => {
          if (!sizeMap.has(s.id)) {
            sizeMap.set(s.id, {
              id: s.id,
              name: s.SizeName,
              sortOrder: s.SortOrder || 0
            });
          }
        });
      
      const sortedSizes = Array.from(sizeMap.values()).sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) {
          return a.sortOrder - b.sortOrder;
        }
        return (a.name || '').localeCompare(b.name || '');
      });
      
      lookupMap.set(itemId, sortedSizes);
    });
    
    return lookupMap;
  }, [form.customerId, customerBarcodes, sizes]);

  const lotLookupByItemSize = useMemo(() => {
    if (!form.customerId || !customerBarcodes.length) return new Map();
    
    const lookupMap = new Map();
    
    // Group barcodes by ItemId + SizeId for faster lookups
    const barcodesByItemSize = new Map();
    customerBarcodes.forEach(b => {
      if (!b.ItemId || !b.SizeId) return;
      const key = `${b.ItemId}_${b.SizeId}`;
      if (!barcodesByItemSize.has(key)) {
        barcodesByItemSize.set(key, []);
      }
      barcodesByItemSize.get(key).push(b);
    });
    
    // Build lot lookup for each item+size combination
    barcodesByItemSize.forEach((itemSizeBarcodes, key) => {
      const lotIds = new Set(
        itemSizeBarcodes
          .map(b => b.LotId)
          .filter(Boolean)
      );
      
      const lotMap = new Map();
      lots
        .filter(l => lotIds.has(l.id))
        .forEach(l => {
          if (!lotMap.has(l.id)) {
            lotMap.set(l.id, {
              id: l.id,
              number: l.LotNumber
            });
          }
        });
      
      const sortedLots = Array.from(lotMap.values()).sort((a, b) => (a.number || '').localeCompare(b.number || ''));
      lookupMap.set(key, sortedLots);
    });
    
    return lookupMap;
  }, [customerBarcodes, lots]);

  // ✅ OPTIMIZATION: Fast lookup functions using memoized maps
  const getSizesForItem = useCallback((itemId) => {
    if (!itemId) return [];
    return sizeLookupByItem.get(itemId) || [];
  }, [sizeLookupByItem]);

  const getLotsForItem = useCallback((customerId, itemId, sizeId) => {
    if (!customerId || !itemId || !sizeId) return [];
    const key = `${itemId}_${sizeId}`;
    return lotLookupByItemSize.get(key) || [];
  }, [lotLookupByItemSize]);

  // ✅ OPTIMIZATION 4: Memoized customer list
  const activeCustomers = useMemo(() => {
    return customers.sort((a, b) => (a.CustomerName || '').localeCompare(b.CustomerName || ''));
  }, [customers]);

  // ✅ OPTIMIZATION 5: Optimized form handlers
  const updateLine = useCallback((idx, key, value) => {
    setForm(f => {
      const updated = [...f.items];
      const currentLine = { ...updated[idx], [key]: value };
      
      // Auto-reset downstream selects when upstream changes
      if (key === 'itemId') {
        currentLine.sizeId = '';
        currentLine.lotId = '';
      } else if (key === 'sizeId') {
        currentLine.lotId = '';
>>>>>>> Stashed changes
      }
      
<<<<<<< Updated upstream
      try {
        const checkData = {
          supplierId: selectedSupplier,
          customerId: selectedCustomer,
          releaseNumber: releaseNumber,
          lineItems: lineItems.filter(item => item.itemId).map(item => ({
            itemId: item.itemId,
            sizeId: item.sizeId || '',
            lotNumber: item.lotNumber || '',
            quantity: parseInt(item.requestedQuantity) || 0
          }))
        };
        
        const duplicateCheck = await duplicateDetectionService.checkForDuplicate(checkData);
        
        if (duplicateCheck.isDuplicate) {
          setDuplicateWarning({
            message: `⚠️ Potential duplicate of Release ${duplicateCheck.duplicateData?.releaseNumber}`,
            releaseId: duplicateCheck.duplicateId,
            status: duplicateCheck.duplicateData?.status
          });
        } else {
          setDuplicateWarning(null);
        }
        
        // Also check for similar releases
        const similar = await duplicateDetectionService.findSimilarReleases(checkData);
        if (similar.length > 0 && !duplicateCheck.isDuplicate) {
          setDuplicateWarning({
            message: `ℹ️ ${similar.length} similar release(s) found for this supplier/customer`,
            similar: similar,
            type: 'info'
          });
        }
      } catch (error) {
        console.error('Error checking for duplicates:', error);
      }
    };
    
    // Debounce the check
    const timer = setTimeout(checkForPotentialDuplicates, 500);
    return () => clearTimeout(timer);
  }, [selectedSupplier, selectedCustomer, releaseNumber, lineItems]);

  // Activity tracking for 10-minute timeout
  const updateActivity = async () => {
    if (!draftReleaseId) return;
    
    try {
      const activityQuery = query(
        collection(db, 'release_activity'),
        where('releaseId', '==', draftReleaseId)
      );
      const activitySnapshot = await getDocs(activityQuery);
      
      if (!activitySnapshot.empty) {
        const activityDoc = activitySnapshot.docs[0];
        await updateDoc(doc(db, 'release_activity', activityDoc.id), {
          lastActivity: serverTimestamp()
        });
        setLastActivity(new Date());
        console.log('⏰ Activity updated for draft:', draftReleaseId);
      }
    } catch (error) {
      console.error('❌ Error updating activity:', error);
    }
  };
||||||| Stash base
      updated[idx] = currentLine;
      return { ...f, items: updated };
    });
  };
=======
      updated[idx] = currentLine;
      return { ...f, items: updated };
    });
  }, []);
>>>>>>> Stashed changes

<<<<<<< Updated upstream
  // Cleanup draft allocations
  const cleanupDraftAllocations = async (releaseId) => {
    try {
      // Remove all allocations for this draft
      const allocationsQuery = query(
        collection(db, 'allocations'),
        where('releaseId', '==', releaseId)
      );
      const allocationsSnapshot = await getDocs(allocationsQuery);
      
      const deletePromises = allocationsSnapshot.docs.map(doc => 
        deleteDoc(doc.ref)
      );
      await Promise.all(deletePromises);
      
      // Remove activity record
      const activityQuery = query(
        collection(db, 'release_activity'),
        where('releaseId', '==', releaseId)
      );
      const activitySnapshot = await getDocs(activityQuery);
      
      const activityDeletePromises = activitySnapshot.docs.map(doc => 
        deleteDoc(doc.ref)
      );
      await Promise.all(activityDeletePromises);
      
      console.log('🧹 Cleaned up draft allocations for:', releaseId);
    } catch (error) {
      console.error('❌ Error cleaning up draft:', error);
    }
  };

  // Load initial data after draft is initialized
  useEffect(() => {
    if (draftReleaseId) {
      const loadInitialData = async () => {
        try {
          console.log('🔄 Loading initial data...');
          await Promise.all([
            loadSuppliers(),
            loadCustomers(), 
            loadItems(),
            loadSizes(),
            loadBarcodes()
          ]);
          console.log('✅ Initial data loaded successfully');
        } catch (error) {
          console.error('❌ Error loading initial data:', error);
        }
      };

      loadInitialData();
    }
  }, [draftReleaseId]);

  // Build inventory cache after barcodes are loaded
  useEffect(() => {
    if (barcodes.length > 0) {
      buildInventoryCache();
    }
  }, [barcodes, draftReleaseId]);

  // Build in-memory inventory cache for fast lookups
  const buildInventoryCache = async () => {
    if (!barcodes.length) return;
    
    console.log('🏗️ Building inventory cache...');
    const cache = new Map();
    
    // Group barcodes by customer/item/size/lot
    barcodes.forEach(barcode => {
      const key = `${barcode.customerName}|${barcode.itemCode}|${barcode.sizeName || 'none'}|${barcode.lotNumber}`;
      const quantity = parseInt(barcode.quantity) || 0;
      
      if (cache.has(key)) {
        cache.set(key, cache.get(key) + quantity);
      } else {
        cache.set(key, quantity);
      }
    });
    
    // Load existing allocations from database
    try {
      const allocationsSnapshot = await getDocs(query(
        collection(db, 'allocations'),
        where('status', '==', 'committed')
      ));
      
      // Subtract committed quantities from cache
      allocationsSnapshot.docs.forEach(doc => {
        const allocation = doc.data();
        if (allocation.releaseId !== draftReleaseId) {
          const key = `${allocation.customerName}|${allocation.itemCode}|${allocation.sizeName || 'none'}|${allocation.lotNumber}`;
          const current = cache.get(key) || 0;
          cache.set(key, Math.max(0, current - (allocation.allocatedQuantity || 0)));
        }
      });
      
    } catch (error) {
      console.error('❌ Error loading existing allocations:', error);
    }
    
    setInventoryCache(cache);
    setIsInventoryLoaded(true);
    console.log('✅ Inventory cache built with', cache.size, 'entries');
  };

  // Get available quantity from cache (fast, synchronous)
  const getAvailableQuantitySync = (customerName, itemCode, sizeName, lotNumber, excludeLineItemIndex = -1, currentLineItems = null) => {
    if (!isInventoryLoaded) return 0;
    
    const key = `${customerName}|${itemCode}|${sizeName || 'none'}|${lotNumber}`;
    const physicalQuantity = inventoryCache.get(key) || 0;
    
    // Use passed line items or fallback to state
    const itemsToCheck = currentLineItems || lineItems;
    
    // Subtract current draft allocations from ALL line items (including the current one being edited)
    let currentDraftCommitted = 0;
    itemsToCheck.forEach((lineItem, index) => {
      // Only exclude if explicitly specified, otherwise include all line items
      if (index !== excludeLineItemIndex && 
          lineItem.requestedQuantity && 
          parseInt(lineItem.requestedQuantity) > 0) {
        
        const customer = customers.find(c => c.id === selectedCustomer);
        const item = items.find(i => i.id === lineItem.itemId);
        const size = sizes.find(s => s.id === lineItem.sizeId);
        
        if (customer && item) {
          const lineCustomerName = customer.customerName || customer.CustomerName;
          const lineItemCode = item.itemCode || item.ItemCode;
          const lineSizeName = size ? (size.sizeName || size.SizeName) : 'none';
          
          // Check if this line item matches the same product/lot we're checking
          const lotsMatch = lineItem.lotNumber === lotNumber;
          
          if (lineCustomerName === customerName && 
              lineItemCode === itemCode && 
              (sizeName === 'none' || !sizeName || lineSizeName === sizeName) &&
              lotsMatch) {
            const qty = parseInt(lineItem.requestedQuantity);
            currentDraftCommitted += qty;
            console.log(`    🔴 Line ${index + 1} is using ${qty} of ${itemCode}/${lotNumber} (excluding line ${excludeLineItemIndex + 1})`);
          }
        }
      }
    });
    
    const available = Math.max(0, physicalQuantity - currentDraftCommitted);
    console.log(`  📊 ${itemCode}/${lotNumber}: Physical=${physicalQuantity}, Committed=${currentDraftCommitted}, Available=${available} (excluding line ${excludeLineItemIndex + 1})`);
    return available;
  };

  // Data loading functions
  const loadSuppliers = async () => {
    try {
      const suppliersSnapshot = await getDocs(collection(db, 'suppliers'));
      const suppliersData = suppliersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSuppliers(suppliersData);
      console.log('📦 Loaded suppliers:', suppliersData.length);
    } catch (error) {
      console.error('❌ Error loading suppliers:', error);
    }
  };

  const loadCustomers = async () => {
    try {
      const customersSnapshot = await getDocs(collection(db, 'customers'));
      const customersData = customersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCustomers(customersData);
      console.log('👥 Loaded customers:', customersData.length);
    } catch (error) {
      console.error('❌ Error loading customers:', error);
    }
  };

  const loadItems = async () => {
    try {
      const itemsSnapshot = await getDocs(collection(db, 'items'));
      const itemsData = itemsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setItems(itemsData);
      console.log('📋 Loaded items:', itemsData.length);
    } catch (error) {
      console.error('❌ Error loading items:', error);
    }
  };

  const loadSizes = async () => {
    try {
      const sizesSnapshot = await getDocs(collection(db, 'sizes'));
      const sizesData = sizesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSizes(sizesData);
      console.log('📏 Loaded sizes:', sizesData.length);
    } catch (error) {
      console.error('❌ Error loading sizes:', error);
    }
  };

  const loadBarcodes = async () => {
    try {
      const barcodesSnapshot = await getDocs(collection(db, 'barcodes'));
      const barcodesData = barcodesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBarcodes(barcodesData);
      console.log('🏷️ Loaded barcodes:', barcodesData.length);
    } catch (error) {
      console.error('❌ Error loading barcodes:', error);
    }
  };

  // Create or update allocation for a line item
  const createAllocation = async (lineItemIndex, customerName, itemCode, sizeName, lotNumber, quantity) => {
    if (!draftReleaseId || !quantity || quantity <= 0) return;
    
    try {
      // Check if allocation already exists for this line item
      const existingAllocationQuery = query(
        collection(db, 'allocations'),
        where('releaseId', '==', draftReleaseId),
        where('lineItemIndex', '==', lineItemIndex)
      );
      
      const existingSnapshot = await getDocs(existingAllocationQuery);
      
      if (!existingSnapshot.empty) {
        // Update existing allocation
        const existingDoc = existingSnapshot.docs[0];
        await updateDoc(doc(db, 'allocations', existingDoc.id), {
          customerName,
          itemCode,
          sizeName: sizeName || 'none',
          lotNumber,
          allocatedQuantity: parseInt(quantity),
          updatedAt: serverTimestamp()
        });
        console.log(`📝 Updated allocation for line ${lineItemIndex + 1}:`, {
          lotNumber,
          quantity: parseInt(quantity)
        });
      } else {
        // Create new allocation
        await addDoc(collection(db, 'allocations'), {
          releaseId: draftReleaseId,
          lineItemIndex,
          customerName,
          itemCode,
          sizeName: sizeName || 'none',
          lotNumber,
          allocatedQuantity: parseInt(quantity),
          status: 'committed',
          createdAt: serverTimestamp(),
          allocatedBy: 'current_user' // TODO: Replace with actual user
        });
        console.log(`✅ Created allocation for line ${lineItemIndex + 1}:`, {
          lotNumber,
          quantity: parseInt(quantity)
        });
      }
      
      // Update activity
      // await updateActivity();
      
    } catch (error) {
      console.error('❌ Error creating allocation:', error);
      throw error;
    }
  };

  // Remove allocation for a line item
  const removeAllocation = async (lineItemIndex) => {
    if (!draftReleaseId) return;
    
    try {
      const allocationQuery = query(
        collection(db, 'allocations'),
        where('releaseId', '==', draftReleaseId),
        where('lineItemIndex', '==', lineItemIndex)
      );
      
      const snapshot = await getDocs(allocationQuery);
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      console.log(`🗑️ Removed allocation for line ${lineItemIndex + 1}`);
      
      // Update activity
      // await updateActivity();
      
    } catch (error) {
      console.error('❌ Error removing allocation:', error);
    }
  };

  // Get available items for a specific customer (fast, synchronous)
  const getAvailableItemsForCustomerSync = (customerId, excludeLineItemIndex = -1, currentLineItems = null) => {
    if (!isInventoryLoaded || !customerId) return [];
    
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return [];
    
    const customerName = customer.customerName || customer.CustomerName;
    
    console.log(`🔍 Getting available items for customer ${customerName}, excluding line ${excludeLineItemIndex}`);
    
    // Find all items that have available inventory for this customer
    const availableItems = new Set();
    
    for (const [key, quantity] of inventoryCache.entries()) {
      const [keyCustomer, keyItem, keySize, keyLot] = key.split('|');
      
      if (keyCustomer === customerName && quantity > 0) {
        const available = getAvailableQuantitySync(customerName, keyItem, keySize, keyLot, excludeLineItemIndex, currentLineItems);
        if (available > 0) {
          console.log(`  ✅ ${keyItem} has ${available} available (lot: ${keyLot})`);
          availableItems.add(keyItem);
        }
      }
    }
    
    console.log(`  Found ${availableItems.size} available items:`, Array.from(availableItems));
    
    // Return items that match available item codes
    return items.filter(item => 
      availableItems.has(item.itemCode || item.ItemCode)
    );
  };

  // Get available sizes for a specific customer and item
  const getAvailableSizesForCustomerItem = (customerId, itemId) => {
    if (!customerId || !itemId) return [];
    
    const customer = customers.find(c => c.id === customerId);
    const item = items.find(i => i.id === itemId);
    
    if (!customer || !item) return [];
    
    const customerName = customer.customerName || customer.CustomerName;
    const itemCode = item.itemCode || item.ItemCode;
    
    // Find barcodes for this customer and item
    const customerItemBarcodes = barcodes.filter(barcode => 
      barcode.customerName === customerName && barcode.itemCode === itemCode
    );
    
    // Get unique size names
    const uniqueSizeNames = [...new Set(customerItemBarcodes.map(b => b.sizeName))];
    
    // Return sizes that match these size names, with deduplication
    const seenSizes = new Set();
    const uniqueSizes = [];
    sizes.forEach(size => {
      const sizeName = size.sizeName || size.SizeName;
      if (uniqueSizeNames.includes(sizeName) && !seenSizes.has(sizeName)) {
        seenSizes.add(sizeName);
        uniqueSizes.push(size);
      }
    });
    return uniqueSizes;
  };

  // Get available lots for customer/item/size (fast, synchronous)
  const getAvailableLotsSync = (customerId, itemId, sizeId, excludeLineItemIndex = -1, currentLineItems = null) => {
    if (!isInventoryLoaded || !customerId || !itemId) return [];
    
    const customer = customers.find(c => c.id === customerId);
    const item = items.find(i => i.id === itemId);
    
    if (!customer || !item) return [];
    
    const customerName = customer.customerName || customer.CustomerName;
    const itemCode = item.itemCode || item.ItemCode;
    const sizeName = sizeId === 'none' ? 'none' : 
      (sizes.find(s => s.id === sizeId)?.sizeName || sizes.find(s => s.id === sizeId)?.SizeName || 'none');
    
    const lotMap = new Map(); // Use Map to aggregate quantities by lot number
    
    for (const [key, quantity] of inventoryCache.entries()) {
      const [keyCustomer, keyItem, keySize, keyLot] = key.split('|');
      
      if (keyCustomer === customerName && keyItem === itemCode && 
          (sizeName === 'none' || keySize === sizeName) && quantity > 0) {
        
        const available = getAvailableQuantitySync(customerName, itemCode, sizeName, keyLot, excludeLineItemIndex, currentLineItems);
        if (available > 0) {
          // Keep the original lot key (empty string or actual lot number)
          // Aggregate if lot already exists, otherwise add new
          if (lotMap.has(keyLot)) {
            const existing = lotMap.get(keyLot);
            lotMap.set(keyLot, Math.max(existing, available)); // Use max quantity
          } else {
            lotMap.set(keyLot, available);
          }
        }
      }
    }
    
    // Convert Map to array
    const availableLots = Array.from(lotMap, ([lotNumber, availableQuantity]) => ({
      lotNumber,
      availableQuantity
||||||| Stash base
  const addLine = () => {
    setForm(f => ({
      ...f,
      items: [...f.items, { id: uuid(), itemId: '', sizeId: '', lotId: '', qty: 1 }]
=======
  const addLine = useCallback(() => {
    setForm(f => ({
      ...f,
      items: [...f.items, { id: uuid(), itemId: '', sizeId: '', lotId: '', qty: 1 }]
>>>>>>> Stashed changes
    }));
<<<<<<< Updated upstream
    
    console.log("🔍 Available lots debug:", availableLots);
    return availableLots;
  };
||||||| Stash base
  };
=======
  }, []);

  const removeLine = useCallback((idx) => {
    setForm(f => ({
      ...f,
      items: f.items.filter((_, i2) => i2 !== idx)
    }));
  }, []);

  const handleCustomerChange = useCallback((customerId) => {
    setForm({ customerId, items: [] });
  }, []);
>>>>>>> Stashed changes

<<<<<<< Updated upstream
  // Update all line items when any change affects availability
  const updateAllLineItems = () => {
    if (!isInventoryLoaded) return;
    
    console.log('🔄 Starting updateAllLineItems...');
    
    setLineItems(currentItems => {
      const newLineItems = currentItems.map((lineItem, index) => {
        // Pass currentItems to functions so they see the latest state
        const availableItems = getAvailableItemsForCustomerSync(selectedCustomer, index, currentItems);
        
        console.log(`📋 Line ${index + 1} - Available items count:`, availableItems.length);
        if (availableItems.length > 0) {
          console.log(`   Items:`, availableItems.map(i => i.itemCode || i.ItemCode).join(', '));
        }
        
        let updatedItem = {
          ...lineItem,
          availableItems: availableItems
        };
        
        // Reset if current item no longer available
        if (updatedItem.itemId && 
            updatedItem.itemId !== 'none' && 
            !availableItems.some(item => item.id === updatedItem.itemId)) {
          console.log(`🔄 Item no longer available for line ${index + 1}, resetting...`);
          updatedItem = {
            ...updatedItem,
            itemId: '',
            sizeId: '',
            lotNumber: '',
            requestedQuantity: '',
            availableSizes: [],
            availableLots: [],
            availableQuantity: 0
          };
        } else if (updatedItem.itemId && updatedItem.itemId !== 'none') {
          // Update sizes
          const availableSizes = getAvailableSizesForCustomerItem(selectedCustomer, updatedItem.itemId);
          updatedItem.availableSizes = availableSizes;
          
          // Update lots if size is selected
          if (updatedItem.sizeId && updatedItem.sizeId !== 'none') {
            const availableLots = getAvailableLotsSync(selectedCustomer, updatedItem.itemId, updatedItem.sizeId, index, currentItems);
            updatedItem.availableLots = availableLots;
            
            // Update available quantity for current lot
            if (updatedItem.lotNumber && updatedItem.lotNumber !== 'none') {
              const currentLot = availableLots.find(lot => lot.lotNumber === updatedItem.lotNumber);
              if (currentLot) {
                updatedItem.availableQuantity = currentLot.availableQuantity;
              } else {
                // Lot no longer available, reset
                updatedItem = {
                  ...updatedItem,
                  lotNumber: '',
                  requestedQuantity: '',
                  availableQuantity: 0
                };
              }
            }
          }
        }
        
        return updatedItem;
      });
      
      console.log('🔄 Completed updating all line items');
      return newLineItems;
    });
  };

  // Update all line items with specific data passed in
  const updateAllLineItemsWithData = (itemsData) => {
    if (!isInventoryLoaded) return;
    
    console.log('🔄 Starting updateAllLineItemsWithData with fresh data...');
    
    setLineItems(currentItems => {
      const newLineItems = currentItems.map((lineItem, index) => {
        // Use the passed data instead of currentItems for calculations
        const availableItems = getAvailableItemsForCustomerSync(selectedCustomer, index, itemsData);
        
        console.log(`📋 Line ${index + 1} - Available items count:`, availableItems.length);
        if (availableItems.length > 0) {
          console.log(`   Items:`, availableItems.map(i => i.itemCode || i.ItemCode).join(', '));
        }
        
        let updatedItem = {
          ...lineItem,
          availableItems: availableItems
        };
        
        // Reset if current item no longer available
        if (updatedItem.itemId && 
            updatedItem.itemId !== 'none' && 
            !availableItems.some(item => item.id === updatedItem.itemId)) {
          console.log(`🔄 Item no longer available for line ${index + 1}, resetting...`);
          updatedItem = {
            ...updatedItem,
            itemId: '',
            sizeId: '',
            lotNumber: '',
            requestedQuantity: '',
            availableSizes: [],
            availableLots: [],
            availableQuantity: 0
          };
        } else if (updatedItem.itemId && updatedItem.itemId !== 'none') {
          // Update sizes
          const availableSizes = getAvailableSizesForCustomerItem(selectedCustomer, updatedItem.itemId);
          updatedItem.availableSizes = availableSizes;
          
          // Update lots if size is selected
          if (updatedItem.sizeId && updatedItem.sizeId !== 'none') {
            const availableLots = getAvailableLotsSync(selectedCustomer, updatedItem.itemId, updatedItem.sizeId, index, itemsData);
            updatedItem.availableLots = availableLots;
            
            // Update available quantity for current lot
            if (updatedItem.lotNumber && updatedItem.lotNumber !== 'none') {
              const currentLot = availableLots.find(lot => lot.lotNumber === updatedItem.lotNumber);
              if (currentLot) {
                updatedItem.availableQuantity = currentLot.availableQuantity;
              } else {
                // Lot no longer available, reset
                updatedItem = {
                  ...updatedItem,
                  lotNumber: '',
                  requestedQuantity: '',
                  availableQuantity: 0
                };
              }
            }
          }
        }
        
        return updatedItem;
      });
      
      console.log('🔄 Completed updating all line items with fresh data');
      return newLineItems;
    });
  };

  // Supplier change handler with customer filtering
  const handleSupplierChange = async (e) => {
    const supplierId = e.target.value;
    setSelectedSupplier(supplierId);
    setSelectedCustomer(''); // Reset customer selection
    setFilteredCustomers([]);
    
    // Reset all line items
    setLineItems([{
      itemId: '',
      sizeId: '',
      lotNumber: '',
      requestedQuantity: '',
      availableQuantity: 0,
      availableItems: [],
      availableSizes: [],
      availableLots: []
    }]);

    if (!supplierId) {
      return;
    }

    try {
      setIsLoadingCustomers(true);
      console.log('🔍 Supplier changed to:', supplierId);
      
      // Find the selected supplier to get its BOLPrefix
      const supplier = suppliers.find(s => s.id === supplierId);
      if (!supplier || !supplier.BOLPrefix) {
        console.warn('❌ Supplier not found or missing BOLPrefix:', supplier);
        alert('Error: Selected supplier is missing BOLPrefix. Please check supplier configuration.');
        return;
      }

      const bolPrefix = supplier.BOLPrefix;
      console.log(`📦 Looking for customers with BOLPrefix: "${bolPrefix}"`);

      // Query barcodes collection for this BOLPrefix
      const barcodesQuery = query(
        collection(db, 'barcodes'),
        where('BOLPrefix', '==', bolPrefix)
      );
      
      const barcodeSnapshot = await getDocs(barcodesQuery);
      const supplierBarcodes = barcodeSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log(`📊 Found ${supplierBarcodes.length} barcode records for BOLPrefix "${bolPrefix}"`);

      // Extract unique customer names from these barcodes
      const customersWithSupplier = new Set();
      
      supplierBarcodes.forEach((barcode, index) => {
        const customerName = barcode.customerName;
        
        // Debug first few barcodes
        if (index < 5) {
          console.log(`Barcode ${index + 1}:`, {
            BOLPrefix: barcode.BOLPrefix,
            customerName: customerName,
            itemCode: barcode.itemCode,
            lotNumber: barcode.lotNumber
          });
        }

        if (customerName && customerName.trim()) {
          customersWithSupplier.add(customerName.trim());
        }
      });

      console.log(`🎯 Unique customers for supplier "${supplier.supplierName || supplier.SupplierName}" (${bolPrefix}):`, 
                 Array.from(customersWithSupplier));

      // Filter customers to only those who have inventory with this supplier
      const availableCustomers = customers.filter(customer => 
        customersWithSupplier.has(customer.customerName || customer.CustomerName)
      );

      console.log('📋 Filtered customer objects:', 
                 availableCustomers.map(c => ({ id: c.id, name: c.customerName || c.CustomerName })));
      
      setFilteredCustomers(availableCustomers);
      
      // Auto-select logic for customers
      if (availableCustomers.length === 0) {
        console.warn(`⚠️ No customers found for supplier "${supplier.supplierName || supplier.SupplierName}" (${bolPrefix})`);
        setSelectedCustomer('none'); // Default to 'none' when no options
      } else if (availableCustomers.length === 1) {
        console.log(`🎯 Auto-selecting single customer: ${availableCustomers[0].customerName || availableCustomers[0].CustomerName}`);
        setSelectedCustomer(availableCustomers[0].id);
        // Trigger customer change to load items
        setTimeout(() => {
          const event = { target: { value: availableCustomers[0].id } };
          handleCustomerChange(event);
        }, 0);
      }

    } catch (error) {
      console.error('❌ Error filtering customers by supplier:', error);
      alert(`Error loading customers for selected supplier: ${error.message}`);
    } finally {
      setIsLoadingCustomers(false);
    }
  };
||||||| Stash base
  const submit = async e => {
    e.preventDefault();
    await addDoc(collection(db, 'releases'), { ...form, status: 'open', createdAt: new Date() });
    setForm({ customerId: '', items: [] });
  };

  // ✅ FIXED: Step 1 - Items for Customer (using barcodes)
  const getItemsForCustomer = () => {
    if (!form.customerId) return [];
    
    // Get unique item IDs from barcodes that match the customer
    const itemIds = new Set(
      barcodes
        .filter(b => b.CustomerId === form.customerId)
        .map(b => b.ItemId)
        .filter(Boolean)
    );
    
    // Get items that match these IDs and are active, then deduplicate
    const itemMap = new Map();
    items
      .filter(i => itemIds.has(i.id) && i.Status === 'Active')
      .forEach(i => {
        if (!itemMap.has(i.id)) {
          itemMap.set(i.id, {
            id: i.id,
            code: i.ItemCode,
            name: i.ItemName
          });
        }
      });
    
    // Return sorted array
    return Array.from(itemMap.values()).sort((a, b) => (a.code || '').localeCompare(b.code || ''));
  };

  // ✅ FIXED: Step 2 - Sizes for Customer + Item (using barcodes)
  const getSizesForItem = itemId => {
    if (!form.customerId || !itemId) return [];
    
    // Get unique size IDs from barcodes that match customer + item
    const sizeIds = new Set(
      barcodes
        .filter(b => b.CustomerId === form.customerId && b.ItemId === itemId)
        .map(b => b.SizeId)
        .filter(Boolean)
    );
    
    // Get sizes that match these IDs and are active, then deduplicate
    const sizeMap = new Map();
    sizes
      .filter(s => sizeIds.has(s.id) && s.Status === 'Active')
      .forEach(s => {
        if (!sizeMap.has(s.id)) {
          sizeMap.set(s.id, {
            id: s.id,
            name: s.SizeName,
            sortOrder: s.SortOrder || 0
          });
        }
      });
    
    // Return sorted array (by SortOrder, then by name)
    return Array.from(sizeMap.values()).sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }
      return (a.name || '').localeCompare(b.name || '');
    });
  };

  // ✅ FIXED: Step 3 - Lots for Customer + Item + Size (using barcodes)
  const getLotsForItem = (customerId, itemId, sizeId) => {
    if (!customerId || !itemId || !sizeId) return [];
    
    // Get unique lot IDs from barcodes that match customer + item + size
    const lotIds = new Set(
      barcodes
        .filter(b => 
          b.CustomerId === customerId && 
          b.ItemId === itemId && 
          b.SizeId === sizeId
        )
        .map(b => b.LotId)
        .filter(Boolean)
    );
    
    // Get lots that match these IDs and are active, then deduplicate
    const lotMap = new Map();
    lots
      .filter(l => lotIds.has(l.id) && l.Status === 'Active')
      .forEach(l => {
        if (!lotMap.has(l.id)) {
          lotMap.set(l.id, {
            id: l.id,
            number: l.LotNumber
          });
        }
      });
    
    // Return sorted array
    return Array.from(lotMap.values()).sort((a, b) => (a.number || '').localeCompare(b.number || ''));
  };

  // Get active customers sorted alphabetically
  const getActiveCustomers = () => {
    return customers
      .filter(c => c.Status === 'Active')
      .sort((a, b) => (a.CustomerName || '').localeCompare(b.CustomerName || ''));
  };
=======
  const submit = async e => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'releases'), { 
        ...form, 
        status: 'open', 
        createdAt: new Date() 
      });
      setForm({ customerId: '', items: [] });
    } catch (error) {
      console.error('Error creating release:', error);
      alert('Failed to create release. Please try again.');
    }
  };

  // ✅ OPTIMIZATION 6: Loading states for better UX
  const isDataLoading = loading.barcodes || loading.items || loading.sizes || loading.lots;
>>>>>>> Stashed changes

  // Customer change handler
  const handleCustomerChange = (e) => {
    const customerId = e.target.value;
    setSelectedCustomer(customerId);
    
    if (customerId && customerId !== 'none' && isInventoryLoaded) {
      // Reset line items and update available items for first line item
      const availableItems = getAvailableItemsForCustomerSync(customerId, 0);
      
      const updatedLineItems = lineItems.map((item, index) => {
        if (index === 0) {
          return {
            ...item,
            itemId: '',
            sizeId: '',
            lotNumber: '',
            requestedQuantity: '',
            availableQuantity: 0,
            availableItems: availableItems,
            availableSizes: [],
            availableLots: []
          };
        }
        return item;
      });
      
      setLineItems(updatedLineItems);
    }
  };

  // Line item handlers with allocation management (fast synchronous updates)
  const handleLineItemChange = async (index, field, value) => {
    const updatedLineItems = [...lineItems];
    const oldValue = updatedLineItems[index][field];
    updatedLineItems[index] = { ...updatedLineItems[index], [field]: value };
    
    try {
      // Handle cascading updates based on field changed
      if (field === 'itemId' && value !== 'none' && isInventoryLoaded) {
        const availableSizes = getAvailableSizesForCustomerItem(selectedCustomer, value);
        updatedLineItems[index] = {
          ...updatedLineItems[index],
          sizeId: '',
          lotNumber: '',
          requestedQuantity: '',
          availableQuantity: 0,
          availableSizes: availableSizes,
          availableLots: []
        };
        
        // Remove old allocation when item changes
        await removeAllocation(index);
        
        // Auto-select sizes and lots
        if (availableSizes.length === 0) {
          updatedLineItems[index].sizeId = 'none';
          const availableLots = getAvailableLotsSync(selectedCustomer, value, 'none', index);
          updatedLineItems[index].availableLots = availableLots;
          
          if (availableLots.length === 1) {
            updatedLineItems[index].lotNumber = availableLots[0].lotNumber || '';
            updatedLineItems[index].availableQuantity = availableLots[0].availableQuantity;
          } else if (availableLots.length === 0) {
            // No lots available - for items with no size/lot structure, use empty string
            updatedLineItems[index].lotNumber = '';
            // Get the available quantity directly from inventory
            const customer = customers.find(c => c.id === selectedCustomer);
            const item = items.find(i => i.id === value);
            if (customer && item) {
              const customerName = customer.customerName || customer.CustomerName;
              const itemCode = item.itemCode || item.ItemCode;
              // Check if there's inventory without specific lot numbers
              const baseKey = `${customerName}|${itemCode}|none|`;
              const available = inventoryCache.get(baseKey) || 0;
              updatedLineItems[index].availableQuantity = available;
            }
          } else {
            // Multiple lots available, don't auto-select
            updatedLineItems[index].lotNumber = '';
            updatedLineItems[index].availableQuantity = 0;
          }
        } else if (availableSizes.length === 1) {
          updatedLineItems[index].sizeId = availableSizes[0].id;
          const availableLots = getAvailableLotsSync(selectedCustomer, value, availableSizes[0].id, index);
          updatedLineItems[index].availableLots = availableLots;
          
          if (availableLots.length === 1) {
            updatedLineItems[index].lotNumber = availableLots[0].lotNumber || '';
            updatedLineItems[index].availableQuantity = availableLots[0].availableQuantity;
          } else if (availableLots.length === 0) {
            updatedLineItems[index].lotNumber = '';
            updatedLineItems[index].availableQuantity = 0;
          }
        }
        
        setLineItems(updatedLineItems);
        setTimeout(() => updateAllLineItems(), 50); // Update other line items
        
      } else if (field === 'sizeId' && isInventoryLoaded) {
        const availableLots = getAvailableLotsSync(selectedCustomer, updatedLineItems[index].itemId, value, index);
        updatedLineItems[index] = {
          ...updatedLineItems[index],
          lotNumber: '',
          requestedQuantity: '',
          availableQuantity: 0,
          availableLots: availableLots
        };
        
        await removeAllocation(index);
        
        if (availableLots.length === 1) {
          // Auto-select the single lot
          updatedLineItems[index].lotNumber = availableLots[0].lotNumber || '';
          updatedLineItems[index].availableQuantity = availableLots[0].availableQuantity;
        } else if (availableLots.length === 0) {
          // No lots available - set to empty string (which represents "None")
          updatedLineItems[index].lotNumber = '';
          updatedLineItems[index].availableQuantity = 0;
          
          // If size is "none", this is expected - calculate available quantity for the item
          if (value === 'none') {
            const customer = customers.find(c => c.id === selectedCustomer);
            const item = items.find(i => i.id === updatedLineItems[index].itemId);
            if (customer && item) {
              const customerName = customer.customerName || customer.CustomerName;
              const itemCode = item.itemCode || item.ItemCode;
              // Get available quantity for item with no size/lot specification
              const available = getAvailableQuantitySync(customerName, itemCode, 'none', '', index);
              updatedLineItems[index].availableQuantity = available;
            }
          }
        } else {
          // Multiple lots available, user must select
          updatedLineItems[index].lotNumber = '';
          updatedLineItems[index].availableQuantity = 0;
        }
        
        setLineItems(updatedLineItems);
        setTimeout(() => updateAllLineItems(), 50); // Update other line items
        
      } else if (field === 'lotNumber' && value !== 'none' && isInventoryLoaded) {
        const selectedLot = updatedLineItems[index].availableLots.find(lot => lot.lotNumber === value);
        updatedLineItems[index] = {
          ...updatedLineItems[index],
          availableQuantity: selectedLot ? selectedLot.availableQuantity : 0,
          requestedQuantity: ''
        };
        
        await removeAllocation(index);
        setLineItems(updatedLineItems);
        setTimeout(() => updateAllLineItems(), 50); // Update other line items
        
      } else if (field === 'requestedQuantity') {
        // Calculate the new available quantity for this line item
        if (isInventoryLoaded && (updatedLineItems[index].lotNumber !== undefined && updatedLineItems[index].lotNumber !== null)) {
          const customer = customers.find(c => c.id === selectedCustomer);
          const item = items.find(i => i.id === updatedLineItems[index].itemId);
          const size = sizes.find(s => s.id === updatedLineItems[index].sizeId);
          
          if (customer && item) {
            const customerName = customer.customerName || customer.CustomerName;
            const itemCode = item.itemCode || item.ItemCode;
            const sizeName = size ? (size.sizeName || size.SizeName) : 'none';
            
            // Calculate available quantity considering the new value
            const baseAvailable = getAvailableQuantitySync(customerName, itemCode, sizeName, updatedLineItems[index].lotNumber, index);
            const requestedQty = parseInt(value) || 0;
            
            // Validate against base available quantity
            if (requestedQty > baseAvailable) {
              alert(`Only ${baseAvailable} available. Cannot allocate ${requestedQty}.`);
              // Reset to old value after alert
              updatedLineItems[index].requestedQuantity = oldValue;
              setLineItems(updatedLineItems);
              return;
            }
            
            // Update the available quantity display (what's left after this allocation)
            // This is not used for validation, just for display
            updatedLineItems[index].availableQuantity = baseAvailable;
            
            // Always update the value immediately for better UX
            // AND trigger update of other line items with the new state
            setLineItems(prevItems => {
              // This callback runs with the updated state
              const newItems = [...updatedLineItems];
              
              // Schedule update of other line items with the CORRECT updated data
              setTimeout(() => {
                // Now update all line items with the correct quantities
                setLineItems(currentItems => {
                  const refreshedItems = currentItems.map((lineItem, idx) => {
                    if (idx === index) return lineItem; // Skip the current line
                    
                    // Recalculate available items for this line
                    const availableItems = getAvailableItemsForCustomerSync(selectedCustomer, idx, currentItems);
                    
                    console.log(`📋 Line ${idx + 1} - Available items after qty change:`, availableItems.length);
                    if (availableItems.length > 0) {
                      console.log(`   Items:`, availableItems.map(i => i.itemCode || i.ItemCode).join(', '));
                    }
                    
                    return {
                      ...lineItem,
                      availableItems: availableItems
                    };
                  });
                  
                  return refreshedItems;
                });
              }, 50);
              
              return newItems;
            });
            
            // Handle allocation if value is provided and valid
            if (requestedQty > 0) {
              createAllocation(index, customerName, itemCode, sizeName, updatedLineItems[index].lotNumber, requestedQty);
            } else {
              removeAllocation(index);
            }
          } else {
            setLineItems(updatedLineItems);
          }
        } else {
          setLineItems(updatedLineItems);
        }
      } else {
        setLineItems(updatedLineItems);
      }
      
      // await updateActivity();
      
    } catch (error) {
      console.error('❌ Error handling line item change:', error);
      alert(`Error updating line item: ${error.message}`);
      setLineItems(lineItems);
    }
  };

  const addLineItem = () => {
    if (!isInventoryLoaded) return;
    
    const availableItems = getAvailableItemsForCustomerSync(selectedCustomer, lineItems.length);
    const newItem = {
      itemId: '',
      sizeId: '',
      lotNumber: '',
      requestedQuantity: '',
      availableQuantity: 0,
      availableItems: availableItems,
      availableSizes: [],
      availableLots: []
    };
    
    // Auto-select logic for new line item
    if (availableItems.length === 0) {
      newItem.itemId = 'none';
    } else if (availableItems.length === 1) {
      newItem.itemId = availableItems[0].id;
      
      // Get sizes for this item
      const availableSizes = getAvailableSizesForCustomerItem(selectedCustomer, availableItems[0].id);
      newItem.availableSizes = availableSizes;
      
      if (availableSizes.length === 0) {
        newItem.sizeId = 'none';
        
        // Get lots directly for this item (no size filtering)
        const availableLots = getAvailableLotsSync(selectedCustomer, availableItems[0].id, 'none', lineItems.length);
        newItem.availableLots = availableLots;
        
        if (availableLots.length === 0) {
          newItem.lotNumber = '';
        } else if (availableLots.length === 1) {
          newItem.lotNumber = availableLots[0].lotNumber || '';
          newItem.availableQuantity = availableLots[0].availableQuantity;
        }
      } else if (availableSizes.length === 1) {
        newItem.sizeId = availableSizes[0].id;
        
        // Get lots for this item and size
        const availableLots = getAvailableLotsSync(selectedCustomer, availableItems[0].id, availableSizes[0].id, lineItems.length);
        newItem.availableLots = availableLots;
        
        if (availableLots.length === 0) {
          newItem.lotNumber = '';
        } else if (availableLots.length === 1) {
          newItem.lotNumber = availableLots[0].lotNumber || '';
          newItem.availableQuantity = availableLots[0].availableQuantity;
        }
      }
    }
    
    setLineItems([...lineItems, newItem]);
  };

  const removeLineItem = async (index) => {
    if (lineItems.length > 1) {
      // Remove allocation for this line item
      await removeAllocation(index);
      
      const updatedLineItems = lineItems.filter((_, i) => i !== index);
      setLineItems(updatedLineItems);
    }
  };

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedSupplier || !selectedCustomer || !releaseNumber || selectedCustomer === 'none') {
      alert('Please fill in all required fields');
      return;
    }

    // Validate line items - only require selections when data is available
    if (lineItems.length === 0) {
      alert('Please add at least one line item');
      return;
    }
    
    for (let i = 0; i < lineItems.length; i++) {
      const item = lineItems[i];
      
      // Item is always required
      if (!item.itemId || item.itemId === 'none') {
        alert(`Line ${i + 1}: Please select an item`);
        return;
      }
      
      // Size is required only if there are sizes available
      if (item.availableSizes && item.availableSizes.length > 0 && !item.sizeId) {
        alert(`Line ${i + 1}: Please select a size`);
        return;
      }
      
      // Lot is required only if there are lots available
      if (item.availableLots && item.availableLots.length > 0 && 
          (item.lotNumber === undefined || item.lotNumber === null || item.lotNumber === '')) {
        alert(`Line ${i + 1}: Please select a lot number`);
        return;
      }
      
      // Quantity is always required
      if (!item.requestedQuantity) {
        alert(`Line ${i + 1}: Please enter a quantity`);
        return;
      }
    }

    try {
      setIsSubmitting(true);
      console.log('📝 Creating release...');

      const supplier = suppliers.find(s => s.id === selectedSupplier);
      const customer = customers.find(c => c.id === selectedCustomer);
      
      // Prepare release data for duplicate check
      const releaseDataForCheck = {
        supplierId: selectedSupplier,
        customerId: selectedCustomer,
        releaseNumber: releaseNumber,
        lineItems: lineItems.map(item => ({
          itemId: item.itemId,
          sizeId: item.sizeId,
          lotNumber: item.lotNumber || '',
          quantity: parseInt(item.requestedQuantity)
        }))
      };
      
      // Check for duplicates
      console.log('🔍 Checking for duplicate releases...');
      const duplicateCheck = await duplicateDetectionService.checkForDuplicate(releaseDataForCheck);
      
      if (duplicateCheck.isDuplicate) {
        const confirmMessage = `⚠️ DUPLICATE DETECTED!\n\n${duplicateCheck.message}\n\nDuplicate Release ID: ${duplicateCheck.duplicateId}\nStatus: ${duplicateCheck.duplicateData?.status || 'Unknown'}\n\nAre you sure you want to create this duplicate release?`;
        
        if (!window.confirm(confirmMessage)) {
          console.log('❌ User cancelled due to duplicate detection');
          setIsSubmitting(false);
          return;
        }
        console.log('⚠️ User confirmed creation despite duplicate');
      }
      
      // Check data integrity
      const integrity = duplicateDetectionService.validateDataIntegrity(releaseDataForCheck);
      if (integrity.errors.length > 0) {
        alert(`❌ Data validation errors:\n${integrity.errors.map(e => e.message).join('\n')}`);
        setIsSubmitting(false);
        return;
      }
      
      if (integrity.warnings.length > 0) {
        const warningMessage = `⚠️ Data warnings:\n${integrity.warnings.map(w => w.message).join('\n')}\n\nContinue anyway?`;
        if (!window.confirm(warningMessage)) {
          setIsSubmitting(false);
          return;
        }
      }

      const releaseData = {
        releaseNumber,
        releaseDate,
        supplierId: selectedSupplier,
        supplierName: supplier?.supplierName || supplier?.SupplierName,
        customerId: selectedCustomer,
        customerName: customer?.customerName || customer?.CustomerName,
        lineItems: lineItems.map(item => {
          const itemData = items.find(i => i.id === item.itemId);
          const sizeData = sizes.find(s => s.id === item.sizeId);
          
          return {
            itemId: item.itemId,
            itemCode: itemData?.itemCode || itemData?.ItemCode,
            itemName: itemData?.itemName || itemData?.ItemName,
            sizeId: item.sizeId,
            sizeName: sizeData?.sizeName || sizeData?.SizeName,
            lotNumber: item.lotNumber,
            requestedQuantity: parseInt(item.requestedQuantity),
            availableQuantity: item.availableQuantity
          };
        }),
        status: 'Entered', // Capitalized to match system expectations for open releases
        createdAt: serverTimestamp(),
        createdBy: 'system' // TODO: Replace with actual user
      };

      // Add release to Firestore
      const docRef = await addDoc(collection(db, 'releases'), releaseData);
      console.log('✅ Release created with ID:', docRef.id);

      // Update allocations to point to the real release
      const allocationsQuery = query(
        collection(db, 'allocations'),
        where('releaseId', '==', draftReleaseId)
      );
      const allocationsSnapshot = await getDocs(allocationsQuery);
      
      const updatePromises = allocationsSnapshot.docs.map(allocDoc => 
        updateDoc(allocDoc.ref, {
          releaseId: docRef.id,
          status: 'committed' // Status remains committed for entered releases
        })
      );
      await Promise.all(updatePromises);

      // Clean up draft activity record
      await cleanupDraftAllocations(draftReleaseId);

      // Generate pick ticket and send notifications
      try {
        console.log('🎫 Generating pick ticket...');
        const pickTicketData = await releaseNotificationService.generatePickTicket(docRef.id);
        
        console.log('📧 Sending notifications...');
        await releaseNotificationService.sendNewReleaseNotification(docRef.id, pickTicketData);
        
        alert('Release created successfully! Pick ticket generated and notifications sent.');
      } catch (notificationError) {
        console.error('Failed to generate pick ticket or send notifications:', notificationError);
        alert('Release created successfully! However, there was an issue with notifications.');
      }
      
      // Reset form
      setSelectedSupplier('');
      setSelectedCustomer('');
      setReleaseNumber('');
      setReleaseDate(new Date().toISOString().split('T')[0]);
      setFilteredCustomers([]);
      setLineItems([{
        itemId: '',
        sizeId: '',
        lotNumber: '',
        requestedQuantity: '',
        availableQuantity: 0,
        availableItems: [],
        availableSizes: [],
        availableLots: []
      }]);

      // Initialize new draft release
      const newTempReleaseId = `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setDraftReleaseId(newTempReleaseId);

    } catch (error) {
      console.error('❌ Error creating release:', error);
      alert(`Error creating release: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
<<<<<<< Updated upstream
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Create New Release</h1>

        {/* Duplicate Warning Banner */}
        {duplicateWarning && (
          <div className={`mb-6 p-4 rounded-lg border-l-4 ${
            duplicateWarning.type === 'info' 
              ? 'bg-blue-50 border-blue-500 text-blue-800'
              : 'bg-yellow-50 border-yellow-500 text-yellow-800'
          }`}>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {duplicateWarning.type === 'info' ? 'ℹ️' : '⚠️'}
              </div>
              <div className="ml-3 flex-1">
                <p className="font-semibold">{duplicateWarning.message}</p>
                {duplicateWarning.releaseId && (
                  <p className="text-sm mt-1">
                    Release ID: {duplicateWarning.releaseId} | Status: {duplicateWarning.status}
                  </p>
                )}
                {duplicateWarning.similar && duplicateWarning.similar.length > 0 && (
                  <div className="mt-2 text-sm">
                    <p className="font-medium">Recent releases:</p>
                    <ul className="mt-1 space-y-1">
                      {duplicateWarning.similar.map((release, idx) => (
                        <li key={idx} className="flex justify-between">
                          <span>#{release.releaseNumber}</span>
                          <span className="text-gray-600">
                            {release.itemCount} items | {release.status}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header Information */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Release Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Supplier Dropdown */}
              <div>
                <label htmlFor="supplier" className="block text-sm font-medium text-gray-700 mb-2">
                  Supplier *
                </label>
                <select
                  id="supplier"
                  value={selectedSupplier}
                  onChange={handleSupplierChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.supplierName || supplier.SupplierName} ({supplier.BOLPrefix})
                    </option>
                  ))}
                </select>
              </div>

              {/* Customer Dropdown */}
              <div>
                <label htmlFor="customer" className="block text-sm font-medium text-gray-700 mb-2">
                  Customer *
                </label>
                <select
                  id="customer"
                  value={selectedCustomer}
                  onChange={handleCustomerChange}
                  disabled={!selectedSupplier || isLoadingCustomers}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {!selectedSupplier 
                      ? "Select Supplier First" 
                      : isLoadingCustomers
                        ? "Loading customers..."
                        : filteredCustomers.length === 0 
                          ? "None"
                          : "Select Customer"
                    }
                  </option>
                  {filteredCustomers.length === 0 && selectedSupplier && !isLoadingCustomers && (
                    <option value="none">None</option>
                  )}
                  {filteredCustomers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.customerName || customer.CustomerName}
                    </option>
                  ))}
                </select>
                {isLoadingCustomers && (
                  <div className="text-xs text-gray-500 mt-1">
                    🔄 Loading customers for selected supplier...
                  </div>
                )}
              </div>

              {/* Release Number */}
              <div>
                <label htmlFor="releaseNumber" className="block text-sm font-medium text-gray-700 mb-2">
                  Release Number *
                </label>
                <input
                  type="text"
                  id="releaseNumber"
                  value={releaseNumber}
                  onChange={(e) => setReleaseNumber(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter release number"
                />
              </div>
            </div>

            <div className="mt-4">
              <label htmlFor="releaseDate" className="block text-sm font-medium text-gray-700 mb-2">
                Release Date *
              </label>
              <input
                type="date"
                id="releaseDate"
                value={releaseDate}
                onChange={(e) => setReleaseDate(e.target.value)}
                required
                className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Line Items</h2>
              <button
                type="button"
                onClick={addLineItem}
                disabled={!selectedCustomer || !isInventoryLoaded}
                className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Add Line Item
              </button>
||||||| Stash base
    <div className="max-w-2xl mx-auto">
      <PageHeader title="Create New Release" subtitle="" />
      <form onSubmit={submit} className="bg-white shadow rounded p-6 space-y-4">
        <select
          value={form.customerId}
          onChange={e => setForm({ customerId: e.target.value, items: [] })}
          required
          className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select Customer</option>
          {getActiveCustomers().map(c => (
            <option key={c.id} value={c.id}>{c.CustomerName}</option>
          ))}
        </select>

        {form.items.map((line, idx) => {
          const availableItems = getItemsForCustomer();
          const availableSizes = getSizesForItem(line.itemId);
          const availableLots = getLotsForItem(form.customerId, line.itemId, line.sizeId);

          return (
            <div key={line.id} className="flex gap-2 items-center">
              <select
                value={line.itemId}
                onChange={e => updateLine(idx, 'itemId', e.target.value)}
                required
                className="flex-1 border px-3 py-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Item</option>
                {availableItems.map(i => (
                  <option key={i.id} value={i.id}>{i.code}</option>
                ))}
              </select>

              <select
                value={line.sizeId}
                onChange={e => updateLine(idx, 'sizeId', e.target.value)}
                disabled={!line.itemId}
                required
                className="flex-1 border px-3 py-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Select Size</option>
                {availableSizes.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>

              <select
                value={line.lotId}
                onChange={e => updateLine(idx, 'lotId', e.target.value)}
                disabled={!line.itemId || !line.sizeId}
                required
                className="flex-1 border px-3 py-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Select Lot</option>
                {availableLots.map(l => (
                  <option key={l.id} value={l.id}>{l.number}</option>
                ))}
              </select>

              <input
                type="number"
                min="1"
                value={line.qty}
                onChange={e => updateLine(idx, 'qty', parseInt(e.target.value, 10))}
                className="w-16 border px-3 py-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />

              <button
                type="button"
                onClick={() => setForm(f => ({
                  ...f,
                  items: f.items.filter((_, i2) => i2 !== idx)
                }))}
                className="text-red-600 hover:text-red-800 font-bold text-xl w-8 h-8 flex items-center justify-center"
                title="Remove line"
              >×</button>
=======
    <div className="max-w-2xl mx-auto">
      <PageHeader title="Create New Release" subtitle="" />
      <form onSubmit={submit} className="bg-white shadow rounded p-6 space-y-4">
        {/* Customer Selection */}
        <div className="relative">
          <select
            value={form.customerId}
            onChange={e => handleCustomerChange(e.target.value)}
            required
            disabled={loading.customers}
            className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">
              {loading.customers ? 'Loading customers...' : 'Select Customer'}
            </option>
            {activeCustomers.map(c => (
              <option key={c.id} value={c.id}>{c.CustomerName}</option>
            ))}
          </select>
          {loading.customers && (
            <div className="absolute right-3 top-3">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
>>>>>>> Stashed changes
            </div>
<<<<<<< Updated upstream
||||||| Stash base
          );
        })}
=======
          )}
        </div>
>>>>>>> Stashed changes

<<<<<<< Updated upstream
            {lineItems.map((lineItem, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-medium text-gray-700">Item {index + 1}</h3>
                  {lineItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLineItem(index)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Item Dropdown */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Item *
                    </label>
                    <select
                      value={lineItem.itemId}
                      onChange={(e) => handleLineItemChange(index, 'itemId', e.target.value)}
                      disabled={!selectedCustomer || !isInventoryLoaded}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                    >
                      <option value="">
                        {lineItem.availableItems.length === 0 ? "None" : "Select Item"}
                      </option>
                      {lineItem.availableItems.length === 0 && (
                        <option value="none">None</option>
                      )}
                      {lineItem.availableItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.itemCode || item.ItemCode} - {item.itemName || item.ItemName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Size Dropdown */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Size *
                    </label>
                    <select
                      value={lineItem.sizeId}
                      onChange={(e) => handleLineItemChange(index, 'sizeId', e.target.value)}
                      disabled={!lineItem.itemId || lineItem.itemId === 'none'}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                    >
                      <option value="">
                        {lineItem.availableSizes.length === 0 ? "None" : "Select Size"}
                      </option>
                      {lineItem.availableSizes.length === 0 && lineItem.itemId && lineItem.itemId !== 'none' && lineItem.sizeId !== 'none' && (
                        <option value="none">None</option>
                      )}
                      {lineItem.availableSizes.map((size) => (
                        <option key={size.id} value={size.id}>
                          {size.sizeName || size.SizeName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Lot Dropdown */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Lot Number *
                    </label>
                    <select
                      value={lineItem.lotNumber || ''}
                      onChange={(e) => handleLineItemChange(index, 'lotNumber', e.target.value)}
                      disabled={!lineItem.sizeId && lineItem.availableLots.length === 0}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                    >
                      {lineItem.availableLots.length === 0 && lineItem.sizeId ? (
                        // When there are no lots but size is selected, show "None" as selected
                        <option value="">None</option>
                      ) : (
                        <>
                          <option value="">
                            {lineItem.availableLots.length === 0 ? "None" : "Select Lot"}
                          </option>
                          {lineItem.availableLots.map((lot) => (
                            <option key={lot.lotNumber || 'empty'} value={lot.lotNumber || ''}>
                              {!lot.lotNumber || lot.lotNumber === '' ? 'None' : `${lot.lotNumber} (Available: ${lot.availableQuantity})`}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                  </div>

                  {/* Requested Quantity */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Requested Quantity *
                    </label>
                    <input
                      type="number"
                      value={lineItem.requestedQuantity}
                      onChange={(e) => handleLineItemChange(index, 'requestedQuantity', e.target.value)}
                      min="1"
                      max={lineItem.availableQuantity || 999}
                      disabled={(lineItem.lotNumber === undefined || lineItem.lotNumber === null) && lineItem.availableQuantity === 0}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                      placeholder="Enter quantity"
                    />
                    {lineItem.availableQuantity > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        Available: {Math.max(0, lineItem.availableQuantity - (parseInt(lineItem.requestedQuantity) || 0))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="bg-gray-300 text-gray-700 px-6 py-3 rounded-md text-lg font-medium hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 text-white px-6 py-3 rounded-md text-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating Release...' : 'Create Release'}
            </button>
          </div>
        </form>

        {/* Debug Information */}
        {showDebug && (selectedSupplier || selectedCustomer) && (
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-medium text-gray-900">Debug Information</h4>
              <button
                type="button"
                onClick={() => setShowDebug(!showDebug)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Hide
              </button>
            </div>
            <div className="text-xs text-gray-600 space-y-1 font-mono">
              <p>Draft Release ID: {draftReleaseId}</p>
              <p>Inventory Cache: {isInventoryLoaded ? `${inventoryCache.size} entries` : 'Loading...'}</p>
              {selectedSupplier && (
                <p>
                  Supplier: {suppliers?.find((s) => s.id === selectedSupplier)?.supplierName ||
                            suppliers?.find((s) => s.id === selectedSupplier)?.SupplierName}
                  {' '}({suppliers?.find((s) => s.id === selectedSupplier)?.BOLPrefix})
                </p>
              )}
              {selectedCustomer && (
                <p>
                  Customer: {customers?.find((c) => c.id === selectedCustomer)?.customerName ||
                            customers?.find((c) => c.id === selectedCustomer)?.CustomerName}
                </p>
              )}
              <p>Filtered customers: {filteredCustomers.length}</p>
              {filteredCustomers.length > 0 && (
                <p>
                  Available: {filteredCustomers.map(c => c.customerName || c.CustomerName).join(', ')}
                </p>
              )}
              {lineItems.length > 0 && lineItems[0].availableItems && (
                <p>Available items: {lineItems[0].availableItems.length}</p>
              )}
              {lineItems.length > 0 && lineItems[0].availableSizes && (
                <p>Available sizes: {lineItems[0].availableSizes.length}</p>
              )}
              {lineItems.length > 0 && lineItems[0].availableLots && (
                <p>Available lots: {lineItems[0].availableLots.length}</p>
              )}
              <p>Last Activity: {lastActivity.toLocaleTimeString()}</p>
            </div>
          </div>
        )}
      </div>
||||||| Stash base
        <div className="flex justify-between">
          <button 
            type="button" 
            onClick={addLine} 
            className="border border-gray-300 px-3 py-1 rounded hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            + Line
          </button>
          <button 
            type="submit" 
            disabled={!form.customerId || form.items.length === 0}
            className="bg-green-800 text-white px-4 py-2 rounded hover:bg-green-900 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </div>
      </form>
=======
        {/* Data Loading Indicator */}
        {form.customerId && isDataLoading && (
          <div className="bg-blue-50 border border-blue-200 rounded p-3 flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
            <span className="text-blue-700 text-sm">Loading inventory data...</span>
          </div>
        )}

        {/* Line Items - Using Memoized Component */}
        {form.items.map((line, idx) => (
          <LineItem
            key={line.id}
            line={line}
            idx={idx}
            availableItems={itemsForCustomer}
            availableSizes={getSizesForItem(line.itemId)}
            availableLots={getLotsForItem(form.customerId, line.itemId, line.sizeId)}
            updateLine={updateLine}
            removeLine={removeLine}
            isDataLoading={isDataLoading}
          />
        ))}

        {/* Action Buttons */}
        <div className="flex justify-between">
          <button 
            type="button" 
            onClick={addLine} 
            disabled={!form.customerId || isDataLoading}
            className="border border-gray-300 px-3 py-1 rounded hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            + Line
          </button>
          <button 
            type="submit" 
            disabled={!form.customerId || form.items.length === 0 || isDataLoading}
            className="bg-green-800 text-white px-4 py-2 rounded hover:bg-green-900 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </div>
      </form>
>>>>>>> Stashed changes
    </div>
  );
};

export default NewRelease;