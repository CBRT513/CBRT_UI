// File: /Users/cerion/CBRT_UI/src/routes/WarehouseStaging.jsx
import React, { useState, useEffect } from 'react';
import { useFirestoreCollection } from '../hooks/useFirestore';
import { collection, addDoc, updateDoc, doc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { logger } from '../utils/logger';

const WarehouseStaging = () => {
  const [selectedRelease, setSelectedRelease] = useState(null);
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [quantity, setQuantity] = useState('');
  const [stagedItems, setStagedItems] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [barcodeInfo, setBarcodeInfo] = useState(null);

  // Load releases available for staging
  const { data: releases, loading: releasesLoading } = useFirestoreCollection('releases');
  const { data: customers } = useFirestoreCollection('customers');
  const { data: suppliers } = useFirestoreCollection('suppliers');
  const { data: items } = useFirestoreCollection('items');
  const { data: sizes } = useFirestoreCollection('sizes');

  // Filter releases that need staging
  const availableReleases = releases?.filter(
    release => release.Status === 'Entered' || release.Status === 'Partially Staged'
  ) || [];

  // Load staged items for selected release
  useEffect(() => {
    if (selectedRelease) {
      loadStagedItems();
    }
  }, [selectedRelease]);

  // Check barcode as user types
  useEffect(() => {
    if (scannedBarcode && scannedBarcode.length > 10) {
      checkBarcodeInfo();
    } else {
      setBarcodeInfo(null);
      setError('');
      setQuantity('');
    }
  }, [scannedBarcode]);

  const loadStagedItems = async () => {
    try {
      const stagingQuery = query(
        collection(db, 'staging'),
        where('releaseId', '==', selectedRelease.id)
      );
      const stagingSnapshot = await getDocs(stagingQuery);
      const staged = stagingSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setStagedItems(staged);
    } catch (error) {
      await logger.error('Failed to load staged items', { error: error.message, releaseId: selectedRelease.id });
    }
  };

  const checkBarcodeInfo = async () => {
    try {
      const barcodesQuery = query(collection(db, 'barcodes'), where('Barcode', '==', scannedBarcode));
      const barcodeSnapshot = await getDocs(barcodesQuery);
      
      if (barcodeSnapshot.empty) {
        setBarcodeInfo(null);
        setError('Barcode not found in inventory');
        return;
      }

      const barcodeDoc = barcodeSnapshot.docs[0];
      const barcodeData = barcodeDoc.data();

      // Check if barcode belongs to the correct customer
      if (barcodeData.CustomerId !== selectedRelease.CustomerId) {
        setBarcodeInfo(null);
        setError(`This barcode belongs to ${barcodeData.CustomerName}, not the selected release customer`);
        return;
      }

      // Check if barcode is available (not checking for "staged" anymore)
      if (barcodeData.Status !== 'Available') {
        setBarcodeInfo(null);
        setError(`Barcode is not active (Status: ${barcodeData.Status})`);
        return;
      }

      // Check if already staged for this specific release
      const existingStaging = stagedItems.find(item => item.barcode === scannedBarcode);
      if (existingStaging) {
        setBarcodeInfo(null);
        setError('This barcode has already been staged for this release');
        return;
      }

      // Valid barcode - set info
      setBarcodeInfo({
        ...barcodeData,
        barcodeId: barcodeDoc.id
      });
      setError('');
      
    } catch (error) {
      setBarcodeInfo(null);
      setError('Error checking barcode');
    }
  };

  const validateBarcode = async (barcode, quantity) => {
    if (!barcodeInfo) {
      setError('Invalid barcode');
      return false;
    }

    // Find the required quantity from release line items
    const requiredItem = selectedRelease.LineItems.find(item => 
      item.ItemId === barcodeInfo.ItemId && item.SizeId === barcodeInfo.SizeId
    );

    if (!requiredItem) {
      setError('This item is not required for this release');
      return false;
    }

    // Validate exact quantity match against release requirement, not barcode inventory
    if (quantity !== requiredItem.Quantity) {
      setError(`Must stage exact quantity of ${requiredItem.Quantity} units as required by this release - no partial staging allowed`);
      return false;
    }

    // Check if barcode has enough inventory for this quantity
    if (quantity > barcodeInfo.Quantity) {
      setError(`Not enough inventory: barcode has ${barcodeInfo.Quantity} units, need ${quantity}`);
      return false;
    }

    return { valid: true, barcodeData: barcodeInfo, barcodeId: barcodeInfo.barcodeId };
  };

  const handleScanBarcode = async (e) => {
    e.preventDefault();
    if (!scannedBarcode || !quantity || !selectedRelease) return;

    setIsProcessing(true);
    setError('');
    setSuccess('');

    await logger.info('Processing scanned barcode', {
      barcode: scannedBarcode,
      releaseId: selectedRelease.id,
      quantity: parseInt(quantity)
    });

    const validation = await validateBarcode(scannedBarcode, parseInt(quantity));
    
    if (!validation) {
      setIsProcessing(false);
      return;
    }

    try {
      // Create staging record (this tracks what's staged for which release)
      const stagingData = {
        releaseId: selectedRelease.id,
        barcode: scannedBarcode,
        quantity: parseInt(quantity),
        itemCode: validation.barcodeData.ItemCode,
        itemName: validation.barcodeData.ItemName,
        sizeName: validation.barcodeData.SizeName,
        lotNumber: validation.barcodeData.LotNumber || 'TBD',
        customerName: validation.barcodeData.CustomerName,
        stagedAt: new Date().toISOString(),
        stagedBy: 'Warehouse User' // TODO: Get from auth context
      };

      await addDoc(collection(db, 'staging'), stagingData);

      // DO NOT change barcode status - it stays Active/Inactive only
      // Barcode availability is determined by staging records, not barcode status

      await logger.info('Barcode staged successfully', {
        barcode: scannedBarcode
      });

      setSuccess(`Successfully staged ${validation.barcodeData.ItemName} - ${validation.barcodeData.SizeName} (${quantity} units)`);
      
      // Reload staged items
      await loadStagedItems();
      
      // Clear form
      setScannedBarcode('');
      setQuantity('');
      setBarcodeInfo(null);

    } catch (error) {
      await logger.error('Failed to stage barcode', {
        error: error.message,
        barcode: scannedBarcode,
        releaseId: selectedRelease.id
      });
      setError('Failed to stage barcode. Please try again.');
    }

    setIsProcessing(false);
  };

  const handleCompleteStaging = async () => {
    if (!selectedRelease || stagedItems.length === 0) return;

    try {
      // Update release status to 'Staged' (this drives the workflow)
      await updateDoc(doc(db, 'releases', selectedRelease.id), {
        Status: 'Staged',
        StagedAt: new Date().toISOString(),
        StagedItemCount: stagedItems.length
      });

      await logger.info('Release staging completed', {
        releaseId: selectedRelease.id,
        stagedItemCount: stagedItems.length
      });

      setSuccess(`Release ${selectedRelease.ReleaseNumber} staging completed!`);
      
      // Reset view
      setTimeout(() => {
        setSelectedRelease(null);
        setStagedItems([]);
        setSuccess('');
      }, 2000);

    } catch (error) {
      await logger.error('Failed to complete staging', {
        error: error.message,
        releaseId: selectedRelease.id
      });
      setError('Failed to complete staging. Please try again.');
    }
  };

  const getItemName = (itemId) => {
    return items?.find(i => i.id === itemId)?.ItemName || 'Unknown Item';
  };

  const getItemCode = (itemId) => {
    return items?.find(i => i.id === itemId)?.ItemCode || 'Unknown';
  };

  const getSizeName = (sizeId) => {
    return sizes?.find(s => s.id === sizeId)?.SizeName || 'Unknown Size';
  };

  const getCustomerName = (customerId) => {
    return customers?.find(c => c.id === customerId)?.CustomerName || 'Unknown';
  };

  const getSupplierName = (supplierId) => {
    return suppliers?.find(s => s.id === supplierId)?.SupplierName || 'Unknown';
  };

  const calculateProgress = () => {
    if (!selectedRelease?.LineItems) return 0;
    const totalRequired = selectedRelease.LineItems.reduce((sum, item) => sum + (item.Quantity || 0), 0);
    const totalStaged = stagedItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
    return totalRequired > 0 ? Math.round((totalStaged / totalRequired) * 100) : 0;
  };

  if (releasesLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!selectedRelease) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Warehouse Staging</h1>
        
        {availableReleases.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg">No releases available for staging</div>
            <div className="text-sm text-gray-400 mt-2">
              Releases must have status "Entered" or "Partially Staged"
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-lg font-medium text-gray-700 mb-4">
              Select a release to stage ({availableReleases.length} available):
            </div>
            
            {availableReleases.map((release) => (
              <div
                key={release.id}
                onClick={() => setSelectedRelease(release)}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-lg text-blue-600">
                      Release #{release.ReleaseNumber}
                    </div>
                    <div className="text-gray-600 mt-1">
                      {getSupplierName(release.SupplierId)} → {getCustomerName(release.CustomerId)}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {release.LineItems?.length || 0} line items • Status: {release.Status}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">
                      {release.PickupDate && `Pickup: ${new Date(release.PickupDate).toLocaleDateString()}`}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Staging Release #{selectedRelease.ReleaseNumber}
          </h1>
          <div className="text-gray-600 mt-1">
            {getSupplierName(selectedRelease.SupplierId)} → {getCustomerName(selectedRelease.CustomerId)}
          </div>
        </div>
        <button
          onClick={() => setSelectedRelease(null)}
          className="text-gray-500 hover:text-gray-700 text-sm"
        >
          ← Back to Releases
        </button>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Staging Progress</span>
          <span className="text-sm text-gray-500">{calculateProgress()}% Complete</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${calculateProgress()}%` }}
          ></div>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {stagedItems.length} items staged • {selectedRelease.LineItems?.length || 0} line items total
        </div>
      </div>

      {/* Barcode Scanning Form */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Scan Barcode</h2>
        
        <form onSubmit={handleScanBarcode} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Barcode
              </label>
              <input
                type="text"
                value={scannedBarcode}
                onChange={(e) => setScannedBarcode(e.target.value)}
                placeholder="Scan or type barcode"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isProcessing}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity {barcodeInfo && selectedRelease.LineItems && (() => {
                  const requiredItem = selectedRelease.LineItems.find(item => 
                    item.ItemId === barcodeInfo.ItemId && item.SizeId === barcodeInfo.SizeId
                  );
                  return requiredItem ? `(Required: ${requiredItem.Quantity})` : '';
                })()}
              </label>
              <select
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isProcessing}
              >
                <option value="">Select quantity</option>
                {Array.from({length: 20}, (_, i) => i + 1).map(num => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={!scannedBarcode || !quantity || isProcessing}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Processing...' : 'Stage Item'}
            </button>
            
            <button
              type="button"
              className="bg-gray-200 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-300"
              disabled={isProcessing}
            >
              📷 Camera Scan
            </button>
          </div>
        </form>

        {barcodeInfo && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="text-green-800 text-sm">
              ✅ Valid barcode: {barcodeInfo.ItemCode} - {barcodeInfo.ItemName} ({barcodeInfo.SizeName}) - Quantity: {barcodeInfo.Quantity}
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="text-red-800 text-sm">{error}</div>
          </div>
        )}

        {success && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="text-green-800 text-sm">{success}</div>
          </div>
        )}
      </div>

      {/* Staged Items List */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Staged Items ({stagedItems.length})
          </h2>
          
          {stagedItems.length > 0 && (
            <button
              onClick={handleCompleteStaging}
              className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700"
            >
              Complete Staging
            </button>
          )}
        </div>

        {stagedItems.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            No items staged yet. Scan barcodes to begin staging.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Barcode
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Item
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Staged At
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stagedItems.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 text-sm font-mono text-gray-900">
                      {item.barcode}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {item.itemCode} - {item.itemName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {item.sizeName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(item.stagedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Required Items (for reference) */}
      {selectedRelease.LineItems && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Required Items (Reference)
          </h2>
          
          <div className="space-y-2">
            {selectedRelease.LineItems.map((item, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                <div className="text-sm text-gray-700">
                  <div className="font-medium">{getItemCode(item.ItemId)} - {getItemName(item.ItemId)}</div>
                  <div className="text-xs text-gray-500">Size: {getSizeName(item.SizeId)}</div>
                </div>
                <div className="text-sm font-medium text-gray-900">
                  Quantity: {item.Quantity}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WarehouseStaging;