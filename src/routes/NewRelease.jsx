// src/routes/NewRelease.jsx - FULLY OPTIMIZED with React Performance
import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { collection, onSnapshot, addDoc, query, where } from 'firebase/firestore';
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
  const [customers, setCustomers] = useState([]);
  const [customerBarcodes, setCustomerBarcodes] = useState([]); // Only barcodes for selected customer
  const [lots, setLots] = useState([]);
  const [items, setItems] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [form, setForm] = useState({ customerId: '', items: [] });
  const [loading, setLoading] = useState({
    customers: true,
    barcodes: false,
    items: false,
    sizes: false,
    lots: false
  });

  // ✅ OPTIMIZATION 1: Only fetch active customers on mount
  useEffect(() => {
    const customersQuery = query(
      collection(db, 'customers'),
      where('Status', '==', 'Active')
    );
    
    const unsubCustomers = onSnapshot(customersQuery, snap => {
      setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(prev => ({ ...prev, customers: false }));
    });

    return () => unsubCustomers();
  }, []);

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
      }
      
      updated[idx] = currentLine;
      return { ...f, items: updated };
    });
  }, []);

  const addLine = useCallback(() => {
    setForm(f => ({
      ...f,
      items: [...f.items, { id: uuid(), itemId: '', sizeId: '', lotId: '', qty: 1 }]
    }));
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
            </div>
          )}
        </div>

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
    </div>
  );
};

export default NewRelease;
