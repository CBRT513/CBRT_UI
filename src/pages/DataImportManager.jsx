import React, { useState } from 'react';
import Papa from 'papaparse';
import { collection, addDoc, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';

const DataImportManager = () => {
  const [csvData, setCsvData] = useState([]);
  const [importResults, setImportResults] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'text/csv') {
      Papa.parse(file, {
        complete: (results) => {
          console.log('CSV parsed successfully:', results.data);
          setCsvData(results.data);
        },
        header: true,
        skipEmptyLines: true,
      });
    }
  };

  const clearCollections = async () => {
    setIsClearing(true);
    try {
      const collections = ['barcodes', 'barges', 'items', 'lots', 'sizes'];
      
      for (const collectionName of collections) {
        const querySnapshot = await getDocs(collection(db, collectionName));
        const deletePromises = querySnapshot.docs.map(document => 
          deleteDoc(doc(db, collectionName, document.id))
        );
        await Promise.all(deletePromises);
        console.log(`✅ Cleared ${collectionName}: ${querySnapshot.docs.length} documents deleted`);
      }

      setImportResults({ cleared: true });
      console.log('✅ All collections cleared successfully');
    } catch (error) {
      console.error('❌ Error clearing collections:', error);
      setImportResults({ 
        errors: [`Failed to clear collections: ${error.message}`] 
      });
    } finally {
      setIsClearing(false);
    }
  };

  const processImport = async () => {
    if (csvData.length === 0) {
      alert('Please upload a CSV file first');
      return;
    }

    setIsProcessing(true);
    setImportResults(null);

    // Clear existing data first
    await clearCollections();

    try {
      // First pass: Get unique suppliers and customers
      const supplierMap = new Map();
      const customerMap = new Map();
      
      // Get existing suppliers and customers from database
      const [suppliersSnapshot, customersSnapshot] = await Promise.all([
        getDocs(collection(db, 'suppliers')),
        getDocs(collection(db, 'customers'))
      ]);

      // Map existing suppliers by BOL prefix
      suppliersSnapshot.docs.forEach(doc => {
        const supplier = doc.data();
        if (supplier.BOLPrefix) {
          supplierMap.set(supplier.BOLPrefix, { id: doc.id, name: supplier.companyName });
        }
      });

      // Map existing customers by company name
      customersSnapshot.docs.forEach(doc => {
        const customer = doc.data();
        customerMap.set(customer.companyName, { id: doc.id, name: customer.companyName });
      });

      console.log('📊 Found suppliers:', supplierMap);
      console.log('📊 Found customers:', customerMap);

      // Initialize counters
      const counters = {
        sizes: 0,
        barges: 0,
        items: 0,
        lots: 0,
        barcodes: 0
      };

      const errors = [];
      const processedEntities = {
        sizes: new Set(),
        barges: new Set(),
        items: new Set(),
        lots: new Set(),
        barcodes: new Set()
      };

      // Process each row
      for (const row of csvData) {
        try {
          // Skip rows with empty required fields (only itemCode is truly required)
          if (!row.itemCode) {
            console.log('⚠️ Skipping row with missing itemCode:', row);
            continue;
          }

          // ✅ NORMALIZE all key fields FIRST (before any duplicate checking)
          const normalizedSizeName = (row.sizeName || '')
            .replace(/\s+/g, '')  // Remove all spaces
            .replace(/\\/g, '/')  // Convert backslashes to forward slashes
            .toUpperCase()         // Convert to uppercase
            .trim();

          const normalizedItemCode = (row.itemCode || '')
            .replace(/\s+/g, '')  // Remove all spaces
            .replace(/\\/g, '/')  // Convert backslashes to forward slashes
            .toUpperCase()         // Convert to uppercase
            .trim();

          const normalizedItemName = (row.itemName || '')
            .replace(/\s+/g, ' ') // Single spaces only
            .replace(/\\/g, '/')  // Convert backslashes to forward slashes
            .toUpperCase()         // Convert to uppercase
            .trim();

          const normalizedBargeName = (row.bargeName || '')
            .replace(/\s+/g, '')  // Remove all spaces
            .replace(/\\/g, '/')  // Convert backslashes to forward slashes
            .toUpperCase()         // Convert to uppercase
            .trim();

          const normalizedLotNumber = (row.lotNumber || '')
            .replace(/\s+/g, '')  // Remove all spaces
            .replace(/\\/g, '/')  // Convert backslashes to forward slashes
            .toUpperCase()         // Convert to uppercase
            .trim();

          const normalizedBarcodeIdentifier = (row.barcodeIdentifier || '')
            .replace(/\s+/g, '')  // Remove all spaces
            .toUpperCase()         // Convert to uppercase
            .trim();

          console.log(`Normalizing row data:`);
          console.log(`  Size: "${row.sizeName}" → "${normalizedSizeName}"`);
          console.log(`  Item: "${row.itemCode}" → "${normalizedItemCode}"`);
          console.log(`  Barge: "${row.bargeName}" → "${normalizedBargeName}"`);
          console.log(`  Lot: "${row.lotNumber}" → "${normalizedLotNumber}"`);

          // 1. Process Size (with sortOrder field) - using NORMALIZED values
          if (normalizedSizeName && !processedEntities.sizes.has(normalizedSizeName)) {
            const sizeDoc = await addDoc(collection(db, 'sizes'), {
              sizeName: normalizedSizeName,  // Store normalized version
              originalSizeName: row.sizeName || '',  // Keep original for reference
              sortOrder: 'ascending',
              status: 'Active',
              createdAt: new Date(),
              updatedAt: new Date()
            });
            processedEntities.sizes.add(normalizedSizeName);
            counters.sizes++;
            console.log(`✅ Created size: ${normalizedSizeName} (original: ${row.sizeName})`);
          } else if (normalizedSizeName && processedEntities.sizes.has(normalizedSizeName)) {
            console.log(`⚠️ Skipping duplicate size: ${normalizedSizeName}`);
          }

          // 2. Process Barge (only if bargeName exists and not empty) - using NORMALIZED values
          if (normalizedBargeName && !processedEntities.barges.has(normalizedBargeName)) {
            const bargeDoc = await addDoc(collection(db, 'barges'), {
              bargeName: normalizedBargeName,  // Store normalized version
              originalBargeName: row.bargeName || '',  // Keep original for reference
              status: 'Active',
              createdAt: new Date(),
              updatedAt: new Date()
            });
            processedEntities.barges.add(normalizedBargeName);
            counters.barges++;
            console.log(`✅ Created barge: ${normalizedBargeName} (original: ${row.bargeName})`);
          } else if (normalizedBargeName && processedEntities.barges.has(normalizedBargeName)) {
            console.log(`⚠️ Skipping duplicate barge: ${normalizedBargeName}`);
          }

          // 3. Process Item - using NORMALIZED values
          const itemKey = `${normalizedItemCode}|||${normalizedItemName}`; // Use ||| separator to avoid false matches
          if (normalizedItemCode && normalizedItemName && !processedEntities.items.has(itemKey)) {
            const itemDoc = await addDoc(collection(db, 'items'), {
              itemCode: normalizedItemCode,  // Store normalized version
              itemName: normalizedItemName,  // Store normalized version
              originalItemCode: row.itemCode || '',  // Keep original for reference
              originalItemName: row.itemName || '',  // Keep original for reference
              status: 'Active',
              createdAt: new Date(),
              updatedAt: new Date()
            });
            processedEntities.items.add(itemKey);
            counters.items++;
            console.log(`✅ Created item: ${normalizedItemCode} - ${normalizedItemName}`);
          } else if (normalizedItemCode && normalizedItemName && processedEntities.items.has(itemKey)) {
            console.log(`⚠️ Skipping duplicate item: ${normalizedItemCode} - ${normalizedItemName}`);
          }

          // 4. Process Lot (only if lotNumber exists) - using NORMALIZED values
          if (normalizedLotNumber) {
            const lotKey = `${normalizedLotNumber}|||${normalizedItemCode}`;
            if (!processedEntities.lots.has(lotKey)) {
              const lotDoc = await addDoc(collection(db, 'lots'), {
                lotNumber: normalizedLotNumber,  // Store normalized version
                itemCode: normalizedItemCode,    // Store normalized version
                originalLotNumber: row.lotNumber || '',  // Keep original for reference
                status: 'Active',
                createdAt: new Date(),
                updatedAt: new Date()
              });
              processedEntities.lots.add(lotKey);
              counters.lots++;
              console.log(`✅ Created lot: ${normalizedLotNumber} for item ${normalizedItemCode}`);
            } else {
              console.log(`⚠️ Skipping duplicate lot: ${normalizedLotNumber}`);
            }
          }

          // 5. Process Barcode with CORRECT assembly order using NORMALIZED values
          const barcodeValue = `${normalizedBargeName}${normalizedItemCode}${normalizedLotNumber}${normalizedBarcodeIdentifier}${normalizedSizeName}`;
          
          console.log('🔧 Barcode Assembly Debug (ALL NORMALIZED):', {
            part1_bargeName: `"${normalizedBargeName}"`,
            part2_itemCode: `"${normalizedItemCode}"`,
            part3_lotNumber: `"${normalizedLotNumber}"`,
            part4_barcodeIdentifier: `"${normalizedBarcodeIdentifier}"`,
            part5_sizeName: `"${normalizedSizeName}"`,
            FINAL_BARCODE: `"${barcodeValue}"`
          });

          // Check for duplicate barcodes
          if (processedEntities.barcodes.has(barcodeValue)) {
            console.log(`⚠️ Skipping duplicate barcode: ${barcodeValue}`);
            continue;
          }

          // Get supplier and customer info
          const supplierInfo = supplierMap.get(row.BOLPrefix);
          const customerInfo = customerMap.get(row.customerName);

          const barcodeDoc = await addDoc(collection(db, 'barcodes'), {
            barcode: barcodeValue,
            // Normalized values for consistency
            bargeName: normalizedBargeName,
            itemCode: normalizedItemCode,
            itemName: normalizedItemName,
            lotNumber: normalizedLotNumber,
            sizeName: normalizedSizeName,
            barcodeIdentifier: normalizedBarcodeIdentifier,
            // Original values for reference
            originalBargeName: row.bargeName || '',
            originalItemCode: row.itemCode || '',
            originalItemName: row.itemName || '',
            originalLotNumber: row.lotNumber || '',
            originalSizeName: row.sizeName || '',
            originalBarcodeIdentifier: row.barcodeIdentifier || '',
            // Other fields
            customerName: (row.customerName || '').trim(),
            supplierId: supplierInfo?.id || '',
            supplierName: supplierInfo?.name || row.BOLPrefix || '',
            customerId: customerInfo?.id || '',
            BOLPrefix: row.BOLPrefix || '',
            standardWeight: parseFloat(row.standardWeight) || 0,
            quantity: parseInt(row.quantity) || 1,
            status: 'Active',
            createdAt: new Date(),
            updatedAt: new Date()
          });

          processedEntities.barcodes.add(barcodeValue);
          counters.barcodes++;
          console.log(`✅ Created barcode: ${barcodeValue}`);

        } catch (rowError) {
          console.error('❌ Error processing row:', rowError, row);
          errors.push(`Row error: ${rowError.message}`);
        }
      }

      // ✅ FIX: Use different variable name to avoid duplicate declaration
      const finalResults = {
        sizes: counters.sizes,
        barges: counters.barges,
        items: counters.items,
        lots: counters.lots,
        barcodes: counters.barcodes,
        errors: errors.length > 0 ? errors : null
      };

      setImportResults(finalResults);
      console.log('✅ Import completed:', finalResults);

    } catch (error) {
      console.error('❌ Import failed:', error);
      setImportResults({
        sizes: 0,
        barges: 0,
        items: 0,
        lots: 0,
        barcodes: 0,
        errors: [`Import failed: ${error.message}`]
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Data Import Manager</h2>
      
      {/* File Upload Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Upload CSV File</h3>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="w-full p-2 border border-gray-300 rounded"
        />
        {csvData.length > 0 && (
          <p className="mt-2 text-sm text-gray-600">
            ✅ Loaded {csvData.length} rows from CSV
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={processImport}
          disabled={isProcessing || csvData.length === 0}
          className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-6 py-2 rounded font-medium"
        >
          {isProcessing ? 'Processing...' : 'Import Data'}
        </button>

        <button
          onClick={clearCollections}
          disabled={isClearing}
          className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white px-6 py-2 rounded font-medium"
        >
          {isClearing ? 'Clearing...' : 'Clear Testing Data'}
        </button>
      </div>

      {/* Clear Data Info */}
      <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">Testing Data Management</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>The import process automatically clears existing data before importing new records.</p>
              <p className="font-medium">Collections cleared: barcodes, barges, items, lots, sizes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Results Section */}
      {importResults && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">
            {importResults.cleared && !importResults.barcodes ? 'Collections Cleared' : 'Import Results'}
          </h3>
          
          {importResults.cleared && !importResults.barcodes ? (
            <div className="bg-green-50 border border-green-200 rounded p-3 mb-4">
              <p className="text-green-800 font-medium">✅ Collections successfully cleared!</p>
              <p className="text-green-700 text-sm mt-1">
                All data has been removed from: barcodes, barges, items, lots, and sizes collections.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{importResults.sizes}</div>
                <div className="text-sm text-gray-600">Sizes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{importResults.barges}</div>
                <div className="text-sm text-gray-600">Barges</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{importResults.items}</div>
                <div className="text-sm text-gray-600">Items</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{importResults.lots}</div>
                <div className="text-sm text-gray-600">Lots</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{importResults.barcodes}</div>
                <div className="text-sm text-gray-600">Barcodes</div>
              </div>
            </div>
          )}

          {importResults.errors && importResults.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <h4 className="font-medium text-red-800 mb-2">Errors:</h4>
              <ul className="text-sm text-red-700 list-disc list-inside">
                {importResults.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DataImportManager;