import React, { useState } from 'react';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';

export default function BarcodeUploadModal({ onClose }) {
  const [csvData, setCsvData] = useState([]);
  const [errors, setErrors] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [successCount, setSuccessCount] = useState(0);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.includes('csv')) return alert('Please upload a valid CSV');

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      const data = lines.slice(1).map(l => {
        const values = l.split(',');
        return headers.reduce((obj, h, i) => {
          obj[h] = values[i]?.trim();
          return obj;
        }, {});
      });
      setCsvData(data);
    };
    reader.readAsText(file);
  };

  const findOrCreateDoc = async (collectionName, matchField, matchValue, extraFields = {}) => {
    const q = query(collection(db, collectionName), where(matchField, '==', matchValue));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) return snapshot.docs[0].id;

    const docRef = await addDoc(collection(db, collectionName), {
      [matchField]: matchValue,
      Status: 'Active',
      ...extraFields
    });
    return docRef.id;
  };

  const processUpload = async () => {
    setProcessing(true);
    let success = 0;
    const errs = [];

    for (let row of csvData) {
      const { BargeName, LotNo, CustomerName, ProductName, SizeName, Quantity } = row;

      if (!BargeName || !LotNo || !CustomerName || !ProductName || !SizeName || !Quantity) {
        errs.push(`Missing required field in row: ${JSON.stringify(row)}`);
        continue;
      }

      try {
        const bargeId = await findOrCreateDoc('barges', 'BargeName', BargeName);
        const customerId = await findOrCreateDoc('customers', 'CustomerName', CustomerName);
        
        // ✅ FIXED: Clean lots creation - no ItemId or SizeId
        const lotId = await findOrCreateDoc('lots', 'LotNumber', LotNo, {
          BargeId: bargeId,
          CustomerId: customerId,
        });
        
        const itemId = await findOrCreateDoc('items', 'ItemCode', ProductName, {
          ItemName: ProductName,
        });
        const sizeId = await findOrCreateDoc('sizes', 'SizeName', SizeName);

        // ✅ ADD: Create product combinations (this was missing!)
        const productQuery = query(
          collection(db, 'products'),
          where('ItemId', '==', itemId),
          where('SizeId', '==', sizeId)
        );
        const existingProduct = await getDocs(productQuery);
        if (existingProduct.empty) {
          await addDoc(collection(db, 'products'), {
            ItemId: itemId,
            SizeId: sizeId,
            StandardWeight: parseInt(row.StandardWeight) || 1, // Add default weight
            ItemCodeDisplay: ProductName,
            ItemNameDisplay: ProductName,
            SizeNameDisplay: SizeName,
            Status: 'Active'
          });
        }

        // ✅ Create barcode with all relationships
        await addDoc(collection(db, 'barcodes'), {
          BargeId: bargeId,
          LotId: lotId,
          CustomerId: customerId,
          ItemId: itemId,
          SizeId: sizeId,
          Quantity: parseInt(Quantity),
        });

        success++;
      } catch (err) {
        errs.push(`Error processing row ${JSON.stringify(row)}: ${err.message}`);
      }
    }

    setErrors(errs);
    setSuccessCount(success);
    setProcessing(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Upload Barcode CSV</h2>

        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="mb-4 border rounded px-3 py-2 w-full"
        />

        <button
          disabled={csvData.length === 0 || processing}
          onClick={processUpload}
          className="bg-green-800 text-white px-4 py-2 rounded mb-4"
        >
          {processing ? 'Processing...' : `Upload ${csvData.length} rows`}
        </button>

        {successCount > 0 && (
          <p className="text-green-700 text-sm mb-2">✅ {successCount} rows uploaded successfully</p>
        )}

        {errors.length > 0 && (
          <div className="bg-red-50 p-3 rounded border border-red-200">
            <h3 className="text-red-800 font-semibold">Errors:</h3>
            <ul className="list-disc ml-4 text-red-700 text-sm">
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        )}

        <div className="flex justify-end mt-4">
          <button onClick={onClose} className="border px-4 py-2 rounded">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}