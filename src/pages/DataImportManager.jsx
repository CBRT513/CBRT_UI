// src/pages/DataImportManager.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';

export default function DataImportManager() {
  const [csvData, setCsvData] = useState([]);
  const [stagedData, setStagedData] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'stagedBarcodes'), (snap) => {
      const sorted = snap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => {
          const aKey = `${a.CustomerName || ''}${a.ItemCode || ''}${a.SizeName || ''}`;
          const bKey = `${b.CustomerName || ''}${b.ItemCode || ''}${b.SizeName || ''}`;
          return aKey.localeCompare(bKey);
        });
      setStagedData(sorted);
    });
    return () => unsub();
  }, []);

  const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map((h) => h.trim());
    return lines.slice(1).map((line) => {
      const values = line.split(',');
      const row = headers.reduce((acc, h, i) => {
        acc[h] = values[i]?.trim();
        return acc;
      }, {});
      row.GeneratedBarcode = `${row.BargeName}${row.LotNumber}${row.CustomerName}${row.ItemCode}${row.SizeName}`.replace(/\s/g, '');
      return row;
    });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      const parsed = parseCSV(text);
      setUploading(true);
      for (const row of parsed) {
        await addDoc(collection(db, 'stagedBarcodes'), {
          ...row,
          status: 'PENDING',
          createdAt: serverTimestamp(),
        });
      }
      setUploading(false);
    };
    reader.readAsText(file);
  };

  const findOrCreate = async (col, matchField, matchValue, extra = {}) => {
    const q = query(collection(db, col), where(matchField, '==', matchValue));
    const snap = await getDocs(q);
    if (!snap.empty) return snap.docs[0].id;
    const docRef = await addDoc(collection(db, col), {
      [matchField]: matchValue,
      Status: 'Active',
      ...extra,
    });
    return docRef.id;
  };

  const ensureProductExists = async (row) => {
    const q = query(
      collection(db, 'products'),
      where('ItemCodeDisplay', '==', row.ItemCode),
      where('SizeNameDisplay', '==', row.SizeName),
      where('StandardWeight', '==', row.StandardWeight)
    );
    const snap = await getDocs(q);
    if (snap.empty) {
      await addDoc(collection(db, 'products'), {
        ItemCodeDisplay: row.ItemCode,
        ItemNameDisplay: row.ItemName,
        SizeNameDisplay: row.SizeName,
        StandardWeight: row.StandardWeight,
        Status: 'Active'
      });
    }
  };

  const generateBarcodes = async () => {
    setGenerating(true);
    try {
      for (const row of stagedData) {
        const customerId = await findOrCreate('customers', 'CustomerName', row.CustomerName);
        const supplierId = await findOrCreate('suppliers', 'SupplierName', row.SupplierName);

        const bargeId = await findOrCreate('barges', 'BargeName', row.BargeName, {
          SupplierName: row.SupplierName,
          ArrivalDateFormatted: new Date().toISOString().split('T')[0],
          Status: 'Expected'
        });

        const lotId = await findOrCreate('lots', 'LotNumber', row.LotNumber, {
          BargeId: bargeId,
          CustomerId: customerId,
        });

        const itemId = await findOrCreate('items', 'ItemCode', row.ItemCode, {
          ItemName: row.ItemName,
        });

        const sizeId = await findOrCreate('sizes', 'SizeName', row.SizeName, {
          SortOrder: 'ascending'
        });

        await ensureProductExists(row);

        const barcodeSnap = await getDocs(
          query(collection(db, 'barcodes'), where('GeneratedBarcode', '==', row.GeneratedBarcode))
        );

        if (barcodeSnap.empty) {
          await addDoc(collection(db, 'barcodes'), {
            BargeId: bargeId,
            LotId: lotId,
            CustomerId: customerId,
            ItemId: itemId,
            SizeId: sizeId,
            Quantity: parseInt(row.Quantity, 10),
            GeneratedBarcode: row.GeneratedBarcode,
          });
        }

        await deleteDoc(doc(db, 'stagedBarcodes', row.id));
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
    setGenerating(false);
  };

  const cancelUpload = async () => {
    for (const row of stagedData) {
      await deleteDoc(doc(db, 'stagedBarcodes', row.id));
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Data Import & Barcode Staging</h1>

      <input type="file" accept=".csv" onChange={handleFileUpload} className="mb-4" />

      {uploading && <p>Uploading data...</p>}
      {error && <p className="text-red-600">Error: {error}</p>}

      {stagedData.length > 0 && (
        <>
          <table className="w-full text-sm border border-gray-300 mb-4">
            <thead className="bg-gray-100">
              <tr>
                <th>Barcode</th>
                <th>ItemCode</th>
                <th>ItemName</th>
                <th>LotNumber</th>
                <th>BargeName</th>
                <th>CustomerName</th>
                <th>SupplierName</th>
                <th>SizeName</th>
                <th>Std Weight</th>
                <th>Quantity</th>
                <th>Delete</th>
              </tr>
            </thead>
            <tbody>
              {stagedData.map((row) => (
                <tr key={row.id}>
                  <td><code>{row.GeneratedBarcode}</code></td>
                  <td>{row.ItemCode}</td>
                  <td>{row.ItemName}</td>
                  <td>{row.LotNumber}</td>
                  <td>{row.BargeName}</td>
                  <td>{row.CustomerName}</td>
                  <td>{row.SupplierName}</td>
                  <td>{row.SizeName}</td>
                  <td>{row.StandardWeight}</td>
                  <td>{row.Quantity}</td>
                  <td>
                    <button
                      className="text-red-600 hover:underline"
                      onClick={() => deleteDoc(doc(db, 'stagedBarcodes', row.id))}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex gap-4">
            <button
              disabled={generating}
              onClick={generateBarcodes}
              className="bg-green-800 text-white px-4 py-2 rounded shadow hover:opacity-90"
            >
              {generating ? 'Generating…' : 'Generate Barcodes'}
            </button>
            <button
              onClick={cancelUpload}
              className="bg-red-600 text-white px-4 py-2 rounded shadow hover:opacity-90"
            >
              Cancel Upload
            </button>
          </div>
        </>
      )}
    </div>
  );
}
