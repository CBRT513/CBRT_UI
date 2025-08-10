// File: /Users/cerion/CBRT_UI/src/routes/DataImportManager.jsx

import React, { useState } from 'react';
import { addDoc, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';

export default function DataImportManager() {
  const [csvFile, setCsvFile] = useState(null);
  const [stagedData, setStagedData] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [clearing, setClearing] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'text/csv') {
      setCsvFile(file);
      parseCSV(file);
    } else {
      alert('Please select a valid CSV file');
    }
  };

  const parseCSV = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());

      const data = [];
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = lines[i].split(',').map(v => v.trim());
          const row = {};
          headers.forEach((header, index) => {
            row[header] = values[index];
          });
          data.push(row);
        }
      }
      setStagedData(data);
    };
    reader.readAsText(file);
  };

  const clearTestingCollections = async () => {
    const collectionsToClear = ['barcodes', 'barges', 'items', 'lots', 'products', 'sizes'];
    const results = {};

    for (const collectionName of collectionsTolear) {
      const snapshot = await getDocs(collection(db, collectionName));
      const deletePromises = snapshot.docs.map(docSnapshot =>
        deleteDoc(doc(db, collectionName, docSnapshot.id))
      );
      await Promise.all(deletePromises);
      results[collectionName] = snapshot.docs.length;
    }

    return results;
  };

  const generateFromStaged = async () => {
    console.log("Sample row:", stagedData[0]);    if (!stagedData || stagedData.length === 0) {
      alert('No staged data to process');
      return;
    }

    setGenerating(true);
    try {
      // Fetch existing data to check for duplicates
      const [existingItems, existingSizes, existingBarges, existingLots, existingBarcodes] = await Promise.all([
        getDocs(collection(db, 'items')),
        getDocs(collection(db, 'sizes')),
        getDocs(collection(db, 'barges')),
        getDocs(collection(db, 'lots')),
        getDocs(collection(db, 'barcodes'))
      ]);

      // Create lookup maps for existing data
      const existingItemCodes = new Set(existingItems.docs.map(doc => doc.data().ItemCode));
      const existingSizeNames = new Set(existingSizes.docs.map(doc => doc.data().SizeName));
      const existingBargeNames = new Set(existingBarges.docs.map(doc => doc.data().BargeName));
      const existingLotNumbers = new Set(existingLots.docs.map(doc => doc.data().LotNumber));
      const existingBarcodeStrings = new Set(existingBarcodes.docs.map(doc => doc.data().Barcode));

      // Create maps for new data to avoid duplicates within this import
      const itemMap = new Map();
      const sizeMap = new Map();
      const bargeMap = new Map();
      const lotMap = new Map();
      const supplierMap = new Map();
      const customerMap = new Map();

      // Load existing suppliers and customers (these are created manually, not from CSV)
      const [suppliers, customers] = await Promise.all([
        getDocs(collection(db, 'suppliers')),
        getDocs(collection(db, 'customers'))
      ]);

      suppliers.docs.forEach(doc => {
        supplierMap.set(doc.data().SupplierName, doc.id);
      });
      customers.docs.forEach(doc => {
        customerMap.set(doc.data().CustomerName, doc.id);
      });

      const results = {
        items: 0,
        sizes: 0,
        barges: 0,
        lots: 0,
        barcodes: 0,
        skipped: {
          items: 0,
          sizes: 0,
          barges: 0,
          lots: 0,
          barcodes: 0
        }
      };

      // Process each staged row
      for (const row of stagedData) {
        // Check if supplier and customer exist
        const supplierId = supplierMap.get(row.BOLPrefix);
        const customerId = customerMap.get(row.CustomerName);

        if (!supplierId || !customerId) {
          continue;
        }

        // Create Item (if not exists)
        let itemId;
        if (existingItemCodes.has(row.ItemCode) || itemMap.has(row.ItemCode)) {
          results.skipped.items++;
          // Find existing item ID
          const existingItem = existingItems.docs.find(doc => doc.data().ItemCode === row.ItemCode);
          itemId = existingItem ? existingItem.id : itemMap.get(row.ItemCode);
        } else {
          const itemDoc = await addDoc(collection(db, 'items'), {
            ItemCode: row.ItemCode,
            ItemName: row.ItemName,
            StandardWeight: parseInt(row.StandardWeight) || 2200,
            Status: 'Active',
            CreatedAt: new Date()
          });
          itemMap.set(row.ItemCode, itemDoc.id);
          itemId = itemDoc.id;
          results.items++;
        }

        // Create Size (if not exists)
        let sizeId;
        if (existingSizeNames.has(row.SizeName) || sizeMap.has(row.SizeName)) {
          results.skipped.sizes++;
          // Find existing size ID
          const existingSize = existingSizes.docs.find(doc => doc.data().SizeName === row.SizeName);
          sizeId = existingSize ? existingSize.id : sizeMap.get(row.SizeName);
        } else {
          const sizeDoc = await addDoc(collection(db, 'sizes'), {
            SizeName: row.SizeName,
            Status: 'Active',
            CreatedAt: new Date()
          });
          sizeMap.set(row.SizeName, sizeDoc.id);
          sizeId = sizeDoc.id;
          results.sizes++;
        }

        // File: /Users/cerion/CBRT_UI/src/pages/DataImportManager.jsx
        // Find the "Create Barge (if not exists)" section around line 130 and replace with this:

        // Create Barge (if not exists)
        let bargeId;
        if (existingBargeNames.has(row.BargeName) || bargeMap.has(row.BargeName)) {
          results.skipped.barges++;
          // Find existing barge ID
          const existingBarge = existingBarges.docs.find(doc => doc.data().BargeName === row.BargeName);
          bargeId = existingBarge ? existingBarge.id : bargeMap.get(row.BargeName);
        } else {
          const bargeDoc = await addDoc(collection(db, 'barges'), {
            BargeName: row.BargeName,
            SupplierId: supplierId,
            SupplierName: row.BOLPrefix, // Store supplier name for easy display
            ArrivalDate: null, // Can be set later manually
            Status: 'Expected', // Default status for new barges
            CreatedAt: new Date()
          });
          bargeMap.set(row.BargeName, bargeDoc.id);
          bargeId = bargeDoc.id;
          results.barges++;
        }

        // Create Lot (if not exists) - Check by LotNumber only
        let lotId;
        const lotKey = row.LotNumber;
        if (existingLotNumbers.has(row.LotNumber) || lotMap.has(lotKey)) {
          results.skipped.lots++;
          // Find existing lot ID
          const existingLot = existingLots.docs.find(doc => doc.data().LotNumber === row.LotNumber);
          lotId = existingLot ? existingLot.id : lotMap.get(lotKey);
        } else {
          const lotDoc = await addDoc(collection(db, 'lots'), {
            LotNumber: row.LotNumber,
            BargeId: bargeId,
            CustomerId: customerId,
            Status: 'Active',
            CreatedAt: new Date()
          });
          lotMap.set(lotKey, lotDoc.id);
          lotId = lotDoc.id;
          results.lots++;
        }

        // Generate barcode string
        const barcodeString = `${row.BargeName}${row.ItemCode}${row.LotNumber}${row.CustomerName}${row.ItemName}${row.SizeName}`.replace(/\s+/g, '');

        // Create Barcode (if not exists)
        if (existingBarcodeStrings.has(barcodeString)) {
          results.skipped.barcodes++;
        } else {
          await addDoc(collection(db, 'barcodes'), {
            Barcode: barcodeString,
            BargeId: bargeId,
            LotId: lotId,
            CustomerId: customerId,
            ItemId: itemId,
            SizeId: sizeId,
            Quantity: parseInt(row.Quantity) || 1,
            StandardWeight: parseInt(row.StandardWeight) || 2200,
            TotalWeight: (parseInt(row.Quantity) || 1) * (parseInt(row.StandardWeight) || 2200),
            Status: 'Available',
            CreatedAt: new Date(),
            // Display fields for easy reference
            ItemCode: row.ItemCode,
            ItemName: row.ItemName,
            SizeName: row.SizeName,
            LotNumber: row.LotNumber,
            BargeName: row.BargeName,
            CustomerName: row.CustomerName,
            SupplierName: row.BOLPrefix
          });
          results.barcodes++;
        }
      }

      // Show results
      const message = `Import completed!\n\nCreated:\n- Items: ${results.items}\n- Sizes: ${results.sizes}\n- Barges: ${results.barges}\n- Lots: ${results.lots}\n- Barcodes: ${results.barcodes}\n\nSkipped (already exist):\n- Items: ${results.skipped.items}\n- Sizes: ${results.skipped.sizes}\n- Barges: ${results.skipped.barges}\n- Lots: ${results.skipped.lots}\n- Barcodes: ${results.skipped.barcodes}`;

      alert(message);
      setStagedData([]);

    } catch (error) {
      console.error('Error importing data:', error);
      alert(`Failed to import data: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleClearTestingData = async () => {
    if (!window.confirm('Clear all testing data? This will remove barcodes, barges, items, lots, products, and sizes.')) {
      return;
    }

    setClearing(true);
    try {
      const results = await clearTestingCollections();
      console.log('Clear results:', results);
      alert('Testing data cleared successfully!');
    } catch (error) {
      console.error('Error clearing data:', error);
      alert('Failed to clear testing data');
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Data Import Manager</h1>

        {/* File Upload Section */}
        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Upload CSV File</h2>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
            <div className="text-center">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="csv-upload"
              />
              <label
                htmlFor="csv-upload"
                className="cursor-pointer bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                Choose File
              </label>
              {csvFile && (
                <p className="mt-2 text-sm text-gray-600">
                  Selected: {csvFile.name}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Staged Data Section */}
        {stagedData.length > 0 && (
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">
                Staged Data ({stagedData.length} rows)
              </h2>
              <button
                onClick={generateFromStaged}
                disabled={generating}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
              >
                {generating ? 'Generating...' : 'Generate Barcodes'}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Barcode</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lot</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stagedData.slice(0, 10).map((row, index) => {
                    const barcode = `${row.BargeName}${row.ItemCode}${row.LotNumber}${row.CustomerName}${row.ItemName}${row.SizeName}`.replace(/\s+/g, '');
                    return (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-green-600">
                          {barcode}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {row.ItemCode}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {row.LotNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {row.CustomerName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {row.SizeName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {row.Quantity}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {stagedData.length > 10 && (
                <div className="text-center py-4 text-gray-500">
                  ... and {stagedData.length - 10} more rows
                </div>
              )}
            </div>
          </div>
        )}

        {/* Clear Data Section */}
        <div className="border-t pt-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Data Management</h2>
          <button
            onClick={handleClearTestingData}
            disabled={clearing}
            className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
          >
            {clearing ? 'Clearing...' : 'Clear Testing Data'}
          </button>
          <p className="text-sm text-gray-600 mt-2">
            Clears: barcodes, barges, items, lots, products, sizes
          </p>
        </div>
      </div>
    </div>
  );
}