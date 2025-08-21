// File: /Users/cerion/CBRT_UI/src/routes/NewRelease.jsx
// Barcode-Based Release Entry (No Products Collection)
import React, { useState, useMemo, useEffect } from 'react';
import { useFirestoreCollection } from '../hooks/useFirestore';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase/config';
import { PickTicketService } from '../services/pickTicketService';
import { SMSService } from '../services/smsService';
import inventoryAvailabilityService from "../services/inventoryAvailabilityService";

/**
 * Simple logger helper. Replace or extend sendRemoteLog to ship logs externally.
 */
const timestamp = () => new Date().toISOString();
const sendRemoteLog = async (level, message, extra = {}) => {
  // Placeholder: hook into an external logging service here if desired.
  // Example: fetch('/api/log', { method: 'POST', body: JSON.stringify({ level, message, extra, ts: timestamp() }) })
  // For now, it's a no-op.
  return;
};

const log = {
  debug: (msg, extra) => {
    console.debug(`[DEBUG ${timestamp()}] ${msg}`, extra || '');
    sendRemoteLog('debug', msg, extra);
  },
  info: (msg, extra) => {
    console.info(`[INFO  ${timestamp()}] ${msg}`, extra || '');
    sendRemoteLog('info', msg, extra);
  },
  warn: (msg, extra) => {
    console.warn(`[WARN  ${timestamp()}] ${msg}`, extra || '');
    sendRemoteLog('warn', msg, extra);
  },
  error: (msg, extra) => {
    console.error(`[ERROR ${timestamp()}] ${msg}`, extra || '');
    sendRemoteLog('error', msg, extra);
  },
};

export default function NewRelease() {
  // Attach global error handler for this component lifespan
  useEffect(() => {
    const handleGlobalError = (message, source, lineno, colno, error) => {
      log.error('Global uncaught error', {
        message,
        source,
        lineno,
        colno,
        stack: error?.stack || null,
      });
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', (ev) => {
      log.error('Unhandled promise rejection', { reason: ev.reason });
    });


    return () => {
      window.removeEventListener('error', handleGlobalError);
    };
  }, []);

  const { data: suppliers } = useFirestoreCollection('suppliers');
  const { data: customers } = useFirestoreCollection('customers');
  const { data: items } = useFirestoreCollection('items');
  const { data: sizes } = useFirestoreCollection('sizes');
  const { data: lots } = useFirestoreCollection('lots');
  const { data: barcodes } = useFirestoreCollection('barcodes');
  const { data: staff } = useFirestoreCollection('staff');

  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  
  // Filter customers based on selected supplier using barcode relationships
  const filteredCustomers = useMemo(() => {
    if (!selectedSupplier || !customers || !suppliers || !barcodes) return [];
    
    // Find the selected supplier's BOL prefix
    const supplier = suppliers.find(s => s.id === selectedSupplier);
    if (!supplier) return [];
    
    const supplierBOLPrefix = supplier.bolPrefix || supplier.BOLPrefix;
    const supplierName = supplier.supplierName || supplier.SupplierName;
    
    // Find all unique customer names that have barcodes with this supplier's BOL prefix
    const customerNamesFromBarcodes = new Set();
    barcodes.forEach(barcode => {
      if ((barcode.BOLPrefix === supplierBOLPrefix || barcode.bolPrefix === supplierBOLPrefix) && 
          barcode.customerName) {
        customerNamesFromBarcodes.add(barcode.customerName);
      }
    });
    
    // Return customers that match the names found in barcodes
    return customers.filter(customer => {
      const customerName = customer.customerName || customer.CustomerName;
      return customerNamesFromBarcodes.has(customerName);
    });
  }, [selectedSupplier, customers, suppliers, barcodes]);
  
  // Auto-select when only one option
  useEffect(() => {
    if (suppliers && suppliers.length === 1 && !selectedSupplier) {
      setSelectedSupplier(suppliers[0].id);
      log.debug('Auto-selected single supplier', { id: suppliers[0].id });
    }
  }, [suppliers]);
  
  useEffect(() => {
    if (filteredCustomers && filteredCustomers.length === 1 && !selectedCustomer) {
      setSelectedCustomer(filteredCustomers[0].id);
      log.debug('Auto-selected single customer', { id: filteredCustomers[0].id });
    }
  }, [filteredCustomers]);

  const [releaseNumber, setReleaseNumber] = useState('');
  const [pickupDate, setPickupDate] = useState('');
  const [lineItems, setLineItems] = useState([
    {
      ItemId: '',
      SizeId: '',
      LotId: '',
      Quantity: 1,
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [availability, setAvailability] = useState(new Map());
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // BARCODE-BASED: Get available items using barcodes directly
  const getAvailableItems = useMemo(() => {
    log.debug('Computing available items', {
      selectedSupplier,
      selectedCustomer,
      hasBarcodes: !!barcodes,
      hasItems: !!items,
    });

    if (
      !selectedSupplier ||
      !selectedCustomer ||
      !barcodes ||
      !items ||
      !suppliers ||
      !customers
    ) {
      log.debug('Missing required data to compute available items');
      return [];
    }

    const supplier = suppliers.find((s) => s.id === selectedSupplier);
    const customer = customers.find((c) => c.id === selectedCustomer);

    if (!supplier || !customer) {
      log.warn('Supplier or customer not found while computing available items', {
        selectedSupplier,
        selectedCustomer,
      });
      return [];
    }

    const supplierBOLPrefix = supplier.bolPrefix || supplier.BOLPrefix;
    const customerName = customer.customerName || customer.CustomerName;

    const supplierBarcodes = barcodes.filter(
      (barcode) =>
        (barcode.BOLPrefix === supplierBOLPrefix || barcode.bolPrefix === supplierBOLPrefix) &&
        (barcode.CustomerName === customerName || barcode.customerName === customerName) &&
        (barcode.Status === 'Available' || barcode.status === 'Active')
    );

    // Get unique item codes from barcodes
    const itemCodes = [...new Set(supplierBarcodes.map((b) => b.itemCode).filter(Boolean))];
    
    // Match items by itemCode
    const result = items.filter((item) => 
      itemCodes.includes(item.itemCode || item.ItemCode)
    );

    log.debug('Available items resolved', { count: result.length, itemCodes });
    return result;
  }, [
    selectedSupplier,
    selectedCustomer,
    barcodes,
    items,
    suppliers,
    customers,
  ]);

  const getAvailableSizes = (itemId) => {
    log.debug('Computing available sizes', {
      itemId,
      selectedSupplier,
      selectedCustomer,
    });

    if (
      !itemId ||
      !selectedSupplier ||
      !selectedCustomer ||
      !barcodes ||
      !sizes ||
      !suppliers ||
      !customers ||
      !items
    ) {
      log.debug('Missing data for available sizes');
      return [];
    }

    const supplier = suppliers.find((s) => s.id === selectedSupplier);
    const customer = customers.find((c) => c.id === selectedCustomer);
    const item = items.find((i) => i.id === itemId);

    if (!supplier || !customer || !item) {
      log.warn('Supplier, customer, or item missing for sizes lookup');
      return [];
    }

    const supplierBOLPrefix = supplier.bolPrefix || supplier.BOLPrefix;
    const customerName = customer.customerName || customer.CustomerName;
    const itemCode = item.itemCode || item.ItemCode;

    const itemBarcodes = barcodes.filter(
      (barcode) =>
        (barcode.BOLPrefix === supplierBOLPrefix || barcode.bolPrefix === supplierBOLPrefix) &&
        (barcode.CustomerName === customerName || barcode.customerName === customerName) &&
        barcode.itemCode === itemCode &&
        (barcode.Status === 'Available' || barcode.status === 'Active')
    );

    // Get unique size names from barcodes
    const sizeNames = [...new Set(itemBarcodes.map((b) => b.sizeName).filter(Boolean))];
    
    // Match sizes by sizeName
    const result = sizes.filter((size) => 
      sizeNames.includes(size.sizeName || size.SizeName)
    );

    log.debug('Available sizes result', { sizeNames, count: result.length });
    return result;
  };

  const getAvailableLots = (itemId, sizeId) => {
    log.debug('Computing available lots', {
      itemId,
      sizeId,
      selectedSupplier,
      selectedCustomer,
    });

    if (
      !itemId ||
      !selectedSupplier ||
      !selectedCustomer ||
      !barcodes ||
      !lots ||
      !suppliers ||
      !customers ||
      !items
    ) {
      log.debug('Missing data for available lots');
      return [];
    }

    const supplier = suppliers.find((s) => s.id === selectedSupplier);
    const customer = customers.find((c) => c.id === selectedCustomer);
    const item = items.find((i) => i.id === itemId);

    if (!supplier || !customer || !item) {
      log.warn('Supplier, customer, or item missing for lots lookup');
      return [];
    }

    const supplierBOLPrefix = supplier.bolPrefix || supplier.BOLPrefix;
    const customerName = customer.customerName || customer.CustomerName;
    const itemCode = item.itemCode || item.ItemCode;

    // Filter barcodes - if sizeId is provided, also match by size
    let matchingBarcodes = barcodes.filter(
      (barcode) =>
        (barcode.BOLPrefix === supplierBOLPrefix || barcode.bolPrefix === supplierBOLPrefix) &&
        (barcode.CustomerName === customerName || barcode.customerName === customerName) &&
        barcode.itemCode === itemCode &&
        (barcode.Status === 'Available' || barcode.status === 'Active')
    );

    // If sizeId is provided, also filter by size
    if (sizeId && sizes) {
      const size = sizes.find((s) => s.id === sizeId);
      if (size) {
        const sizeName = size.sizeName || size.SizeName;
        matchingBarcodes = matchingBarcodes.filter(
          (barcode) => barcode.sizeName === sizeName
        );
      }
    }

    // Get unique lot numbers from barcodes
    const lotNumbers = [...new Set(matchingBarcodes.map((b) => b.lotNumber).filter(Boolean))];
    
    // Match lots by lotNumber
    const result = lots.filter((lot) => 
      lotNumbers.includes(lot.lotNumber || lot.LotNumber)
    );

    log.debug('Available lots result', { lotNumbers, count: result.length });
    return result;
  };

  const handleLineItemChange = (index, field, value) => {
    log.debug('Line item change', { index, field, value });
    try {
      const updatedItems = [...lineItems];
      updatedItems[index] = { ...updatedItems[index], [field]: value };

      if (field === 'ItemId') {
        updatedItems[index].SizeId = '';
        updatedItems[index].LotId = '';
        
        // Auto-select size if only one available
        const availableSizes = getAvailableSizes(value);
        if (availableSizes.length === 1) {
          updatedItems[index].SizeId = availableSizes[0].id;
          log.debug('Auto-selected single size', { sizeId: availableSizes[0].id });
          
          // Check for single lot after auto-selecting size
          const availableLots = getAvailableLots(value, availableSizes[0].id);
          if (availableLots.length === 1) {
            updatedItems[index].LotId = availableLots[0].id;
            log.debug('Auto-selected single lot', { lotId: availableLots[0].id });
          }
        }
      }
      if (field === 'SizeId') {
        updatedItems[index].LotId = '';
        
        // Auto-select lot if only one available
        const availableLots = getAvailableLots(updatedItems[index].ItemId, value);
        if (availableLots.length === 1) {
          updatedItems[index].LotId = availableLots[0].id;
          log.debug('Auto-selected single lot', { lotId: availableLots[0].id });
        }
      }

      setLineItems(updatedItems);

      // Update availability when selections change
      if (field === "ItemId" || field === "SizeId" || field === "LotId") {
        const item = updatedItems[index];
        updateAvailability(item.ItemId, item.SizeId, item.LotId);
      }    } catch (e) {
      log.error('Error in handleLineItemChange', { error: e, index, field, value });
    }
  };

  const addLineItem = () => {
    log.info('Adding new line item');
    setLineItems([
      ...lineItems,
      { ItemId: '', SizeId: '', LotId: '', Quantity: 1 },
    ]);
  };


  // Calculate availability for an item/size/lot combination
  const updateAvailability = async (itemId, sizeId, lotId) => {
    if (!itemId) return;
    
    // For now, let's calculate availability directly from barcodes instead of using the service
    try {
      if (!selectedSupplier || !selectedCustomer || !barcodes || !suppliers || !customers || !items) {
        return;
      }

      const supplier = suppliers.find((s) => s.id === selectedSupplier);
      const customer = customers.find((c) => c.id === selectedCustomer);
      const item = items.find((i) => i.id === itemId);

      if (!supplier || !customer || !item) return;

      const supplierBOLPrefix = supplier.bolPrefix || supplier.BOLPrefix;
      const customerName = customer.customerName || customer.CustomerName;
      const itemCode = item.itemCode || item.ItemCode;

      // Filter barcodes for this item
      let matchingBarcodes = barcodes.filter(
        (barcode) =>
          (barcode.BOLPrefix === supplierBOLPrefix || barcode.bolPrefix === supplierBOLPrefix) &&
          (barcode.CustomerName === customerName || barcode.customerName === customerName) &&
          barcode.itemCode === itemCode &&
          (barcode.Status === 'Available' || barcode.status === 'Active')
      );

      // If sizeId is provided, also filter by size
      if (sizeId && sizes) {
        const size = sizes.find((s) => s.id === sizeId);
        if (size) {
          const sizeName = size.sizeName || size.SizeName;
          matchingBarcodes = matchingBarcodes.filter(
            (barcode) => barcode.sizeName === sizeName
          );
        }
      }

      // If lotId is provided, also filter by lot
      if (lotId && lots) {
        const lot = lots.find((l) => l.id === lotId);
        if (lot) {
          const lotNumber = lot.lotNumber || lot.LotNumber;
          matchingBarcodes = matchingBarcodes.filter(
            (barcode) => barcode.lotNumber === lotNumber
          );
        }
      }

      // Calculate total available quantity
      const totalQuantity = matchingBarcodes.reduce((sum, barcode) => {
        return sum + (parseInt(barcode.quantity) || 1);
      }, 0);

      const result = { available: totalQuantity };
      const key = itemId + "-" + (sizeId || "any") + "-" + (lotId || "any");
      
      setAvailability(prev => {
        const newMap = new Map(prev);
        newMap.set(key, result);
        return newMap;
      });

      log.debug('Updated availability', { key, totalQuantity, matchingBarcodes: matchingBarcodes.length });
    } catch (error) {
      log.error("Error calculating availability", { error: error.message });
    }
  };

  // Format item display with availability info
  const formatItemWithAvailability = (item, itemId, sizeId, lotId) => {
    const key = itemId + "-" + (sizeId || "any") + "-" + (lotId || "any");
    const avail = availability.get(key);
    const itemCode = item.itemCode || item.ItemCode || 'Unknown';
    const itemName = item.itemName || item.ItemName || 'Unknown';
    
    if (avail) {
      const status = avail.available > 0 ? "✅" : "⚠️";
      return itemCode + " - " + itemName + " " + status + " Avail: " + avail.available;
    }
    return itemCode + " - " + itemName;
  };
  const removeLineItem = (index) => {
    log.info('Removing line item', { index });
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    } else {
      log.warn('Attempted to remove last line item; ignored');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    log.info('Submit invoked', {
      selectedSupplier,
      selectedCustomer,
      releaseNumber,
      pickupDate,
      lineItems,
    });

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!selectedSupplier || !selectedCustomer || !releaseNumber.trim()) {
        throw new Error('Please fill in all required fields');
      }

      if (
        lineItems.some((item) => {
          if (!item.ItemId || !item.Quantity) return true;
          
          // Only require SizeId if there are available sizes for this item
          const availableSizes = getAvailableSizes(item.ItemId);
          if (availableSizes.length > 0 && !item.SizeId) return true;
          
          return false;
        })
      ) {
        throw new Error('Please complete all required line item fields');
      }

      const totalItems = lineItems.reduce(
        (sum, item) => sum + parseInt(item.Quantity, 10),
        0
      );
      const totalWeight = totalItems * 2200;

      const releaseData = {
        releaseNumber: releaseNumber.trim(),
        SupplierId: selectedSupplier,
        CustomerId: selectedCustomer,
        PickupDate: pickupDate || null,
        LineItems: lineItems,
        TotalItems: totalItems,
        TotalWeight: totalWeight,
        Status: 'Entered',
        CreatedAt: new Date(),
        CreatedBy: 'Office',
      };

      log.debug('Prepared releaseData', { releaseData });
      await addDoc(collection(db, 'releases'), releaseData);
      log.info('Release document created in Firestore');

      // Post-creation: pick ticket + notifications
      try {
        const supplier = suppliers?.find((s) => s.id === selectedSupplier);
        const customer = customers?.find((c) => c.id === selectedCustomer);

        // Generate pick ticket PDF
        const pickTicketDoc = await PickTicketService.generatePickTicket(
          releaseData,
          supplier,
          customer,
          lineItems.map((item) => ({
            ...item,
            itemName:
              items?.find((i) => i.id === item.ItemId)?.ItemName || 'Unknown',
            itemCode:
              items?.find((i) => i.id === item.ItemId)?.ItemCode || 'Unknown',
            sizeName:
              sizes?.find((s) => s.id === item.SizeId)?.SizeName || 'Unknown',
            lotNumber:
              lots?.find((l) => l.id === item.LotId)?.LotNumber || 'TBD',
          }))
        );

        const pickTicketBlob = PickTicketService.getPDFBlob(pickTicketDoc);

        log.debug('Pick ticket generated successfully');

        const warehouseStaff =
          (staff
            ?.filter(
              (s) =>
                s.receivesNewRelease &&
                s.phone &&
                s.status?.toLowerCase() !== 'inactive'
            )
            .map((s) => ({
              ...s,
              phone: s.phone,
            })) || []);

        log.debug('Filtered warehouse staff for notification', {
          count: warehouseStaff.length,
          warehouseStaff,
        });

        if (warehouseStaff.length > 0) {
          await SMSService.sendNewReleaseNotification(
            releaseData,
            supplier,
            customer,
            warehouseStaff,
            pickTicketBlob  // Restore PDF attachment
          );

          log.info('SMS notifications sent', {
            recipients: warehouseStaff.map((w) => w.phone),
          });

          setSuccess(
            `Release created successfully! Pick ticket sent to ${warehouseStaff.length} warehouse staff member${warehouseStaff.length !== 1 ? 's' : ''
            }.`
          );
        } else {
          log.warn('No warehouse staff configured or eligible for notification');
          setSuccess(
            'Release created successfully! No warehouse staff configured for notifications.'
          );
        }
      } catch (notifErr) {
        log.error('Error during pick ticket / notification phase', {
          error: notifErr,
        });
        setSuccess(
          'Release created successfully! (Pick ticket/notification failed)'
        );
      }

      // Reset form
      log.info('Resetting form state after success');
      setSelectedSupplier('');
      setSelectedCustomer('');
      setReleaseNumber('');
      setPickupDate('');
      setLineItems([{ ItemId: '', SizeId: '', LotId: '', Quantity: 1 }]);
    } catch (err) {
      log.error('Error in handleSubmit', { error: err });
      setError(err.message || 'Unexpected error');
    } finally {
      setLoading(false);
      log.debug('Submit finished, loading cleared');
    }
  };

  // Test availability function
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Enter a Release
        </h1>


        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Supplier and Customer */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Supplier *
              </label>
              <select
                value={selectedSupplier}
                onChange={(e) => {
                  setSelectedSupplier(e.target.value);
                  setSelectedCustomer(''); // Reset customer when supplier changes
                  log.debug('Supplier selected', { value: e.target.value });
                }}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              >
                <option value="">
                  {!suppliers || suppliers.length === 0 
                    ? 'None available'
                    : 'Select Supplier'
                  }
                </option>
                {suppliers?.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.supplierName || supplier.SupplierName}
                  </option>
                ))}
              </select>
              {!suppliers && (
                <p className="text-xs text-yellow-600 mt-1">
                  Suppliers data not loaded yet.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer *
              </label>
              <select
                value={selectedCustomer}
                onChange={(e) => {
                  setSelectedCustomer(e.target.value);
                  log.debug('Customer selected', { value: e.target.value });
                }}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
                required
                disabled={!selectedSupplier}
              >
                <option value="">
                  {!selectedSupplier 
                    ? 'Select a supplier first' 
                    : filteredCustomers.length === 0 
                    ? 'None available'
                    : 'Select Customer'
                  }
                </option>
                {filteredCustomers?.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.customerName || customer.CustomerName}
                  </option>
                ))}
              </select>
              {!customers && (
                <p className="text-xs text-yellow-600 mt-1">
                  Customers data not loaded yet.
                </p>
              )}
            </div>
          </div>

          {/* Release Number and Pickup Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Release Number *
              </label>
              <input
                type="text"
                value={releaseNumber}
                onChange={(e) => {
                  setReleaseNumber(e.target.value);
                  log.debug('Release number changed', {
                    value: e.target.value,
                  });
                }}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Enter release number"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pickup Date (Optional)
              </label>
              <input
                type="date"
                value={pickupDate}
                onChange={(e) => {
                  setPickupDate(e.target.value);
                  log.debug('Pickup date changed', {
                    value: e.target.value,
                  });
                }}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Line Items</h3>
              <button
                type="button"
                onClick={addLineItem}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                + Add Line Item
              </button>
            </div>

            {lineItems.map((lineItem, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-4 mb-4"
              >
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-medium text-gray-800">
                    Line Item {index + 1}
                  </h4>
                  {lineItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLineItem(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Item */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Item *
                    </label>
                    <select
                      value={lineItem.ItemId}
                      onChange={(e) =>
                        handleLineItemChange(index, 'ItemId', e.target.value)
                      }
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    >
                      <option value="">
                        {getAvailableItems.length === 0 ? 'None available' : 'Select Item'}
                      </option>
                      {getAvailableItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {formatItemWithAvailability(item, item.id, lineItem.SizeId, lineItem.LotId)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Size */}
                  <div>
                    {(() => {
                      const availableSizes = getAvailableSizes(lineItem.ItemId);
                      const sizeRequired = availableSizes.length > 0;
                      return (
                        <>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Size {sizeRequired ? '*' : '(Optional)'}
                          </label>
                          <select
                            value={lineItem.SizeId}
                            onChange={(e) =>
                              handleLineItemChange(index, 'SizeId', e.target.value)
                            }
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                            required={sizeRequired}
                            disabled={!lineItem.ItemId}
                          >
                            <option value="">
                              {!lineItem.ItemId 
                                ? 'Select item first'
                                : availableSizes.length === 0 
                                ? 'None available' 
                                : 'Select Size'
                              }
                            </option>
                            {availableSizes.map((size) => (
                              <option key={size.id} value={size.id}>
                                {size.sizeName || size.SizeName}
                              </option>
                            ))}
                          </select>
                        </>
                      );
                    })()}
                  </div>

                  {/* Lot */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Lot (Optional)
                    </label>
                    <select
                      value={lineItem.LotId}
                      onChange={(e) =>
                        handleLineItemChange(index, 'LotId', e.target.value)
                      }
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                      disabled={!lineItem.ItemId}
                    >
                      <option value="">
                        {!lineItem.ItemId
                          ? 'Select item first'
                          : (() => {
                              const availableLots = getAvailableLots(lineItem.ItemId, lineItem.SizeId);
                              return availableLots.length === 0 ? 'None available' : 'Select Lot';
                            })()
                        }
                      </option>
                      {getAvailableLots(lineItem.ItemId, lineItem.SizeId).map(
                        (lot) => (
                          <option key={lot.id} value={lot.id}>
                            {lot.lotNumber || lot.LotNumber}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={lineItem.Quantity}
                      onChange={(e) =>
                        handleLineItemChange(
                          index,
                          'Quantity',
                          parseInt(e.target.value, 10) || 1
                        )
                      }
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    />
                    {/* Availability Warning */}
                    {(() => {
                      const key = lineItem.ItemId + "-" + lineItem.SizeId + "-" + (lineItem.LotId || "any");
                      const avail = availability.get(key);
                      if (avail && lineItem.Quantity > avail.available) {
                        return (
                          <div className="text-red-600 text-xs mt-1 font-medium">
                            ⚠️ Requested: {lineItem.Quantity} | Available: {avail.available} | Short: {lineItem.Quantity - avail.available}
                          </div>
                        );
                      }
                      return null;
                    })()}                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              {success}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Release...' : 'Create Release'}
            </button>
          </div>

          {/* Debug Info */}
          {selectedSupplier && selectedCustomer && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-700 mb-2">Debug Info:</h4>
              <div className="text-sm text-gray-600">
                <p>
                  Supplier:{' '}
                  {
                    suppliers?.find((s) => s.id === selectedSupplier)
                      ?.SupplierName
                  }
                </p>
                <p>
                  Customer:{' '}
                  {
                    customers?.find((c) => c.id === selectedCustomer)
                      ?.CustomerName
                  }
                </p>
                <p>
                  Available barcodes:{' '}
                  {barcodes
                    ?.filter(
                      (b) =>
                        b.SupplierName ===
                        suppliers?.find((s) => s.id === selectedSupplier)
                          ?.SupplierName &&
                        b.CustomerName ===
                        customers?.find((c) => c.id === selectedCustomer)
                          ?.CustomerName
                    )
                    .length || 0}
                </p>
                <p>Available items: {getAvailableItems.length}</p>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}