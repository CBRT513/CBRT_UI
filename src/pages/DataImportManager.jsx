// src/pages/DataImportManager.jsx - COMPLETE FIXED VERSION
import React, { useState, useEffect } from 'react';
import {
  collection,
  addDoc,
  doc,
  getDocs,
  query,
  where,
  onSnapshot,
  deleteDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';

export default function DataImportManager() {
  const [csvData, setCsvData] = useState([]);
  const [stagedData, setStagedData] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'stagedBarcodes'), snap => {
      const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setStagedData(rows);
    });
    return () => unsub();
  }, []);

  const parseCSV = async (e) => {
    const file = e.target.files[0];
    if (!file || !file.name.endsWith('.csv')) return;
    const text = await file.text();
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const rows = lines.slice(1).map(l => {
      const values = l.split(',');
      return headers.reduce((obj, h, i) => {
        obj[h] = values[i]?.trim();
        return obj;
      }, {});
    });

    for (const row of rows) {
      row.Barcode = `${row.BargeName}${row.LotNumber}${row.CustomerName}${row.ItemCode}${row.SizeName}`.replace(/\s/g, '');
      await addDoc(collection(db, 'stagedBarcodes'), row);
    }

    setCsvData(rows);
  };

  const findOrCreate = async (col, field, value, extra = {}) => {
    const q = query(collection(db, col), where(field, '==', value));
    const snap = await getDocs(q);
    if (!snap.empty) return snap.docs[0];
    const docRef = await addDoc(collection(db, col), { [field]: value, Status: 'Active', ...extra });
    return await getDocs(query(collection(db, col), where(field, '==', value))).then(s => s.docs[0]);
  };

  const generateBarcodes = async () => {
    setUploading(true);
    setError('');
    const existing = await getDocs(collection(db, 'barcodes'));
    const barcodes = existing.docs.map(d => d.data().Barcode);

    try {
      for (const row of stagedData) {
        if (barcodes.includes(row.Barcode)) {
          throw new Error(`Duplicate barcode: ${row.Barcode}`);
        }

        const barge = await findOrCreate('barges', 'BargeName', row.BargeName, { Status: 'Expected', ArrivalDateFormatted: new Date().toISOString().split('T')[0] });
        const supplier = await findOrCreate('suppliers', 'SupplierName', row.SupplierName);
        const customer = await findOrCreate('customers', 'CustomerName', row.CustomerName);
        const item = await findOrCreate('items', 'ItemCode', row.ItemCode, { ItemName: row.ItemName });
        const size = await findOrCreate('sizes', 'SizeName', row.SizeName, { SortOrder: 'ascending' });

        const productQuery = query(
          collection(db, 'products'),
          where('ItemId', '==', item.id),
          where('SizeId', '==', size.id),
          where('StandardWeight', '==', parseInt(row.StandardWeight))
        );
        const existingProduct = await getDocs(productQuery);
        if (existingProduct.empty) {
          await addDoc(collection(db, 'products'), {
            ItemId: item.id,
            SizeId: size.id,
            StandardWeight: parseInt(row.StandardWeight),
            ItemCodeDisplay: row.ItemCode,
            ItemNameDisplay: row.ItemName,
            SizeNameDisplay: row.SizeName,
            Status: 'Active'
          });
        }

        // ✅ FIXED: Clean lots schema - REMOVED ItemId and SizeId
        const lotQuery = query(collection(db, 'lots'), where('LotNumber', '==', row.LotNumber));
        const lotSnap = await getDocs(lotQuery);
        const lotData = {
          LotNumber: row.LotNumber,
          BargeId: barge.id,
          CustomerId: customer.id,
          // ❌ REMOVED: ItemId: item.id,
          // ❌ REMOVED: SizeId: size.id,
          Status: 'Active'
        };

        let lotDoc;
        if (!lotSnap.empty) {
          await setDoc(doc(db, 'lots', lotSnap.docs[0].id), lotData, { merge: true });
          lotDoc = lotSnap.docs[0];
        } else {
          const newLotRef = await addDoc(collection(db, 'lots'), lotData);
          const newLotSnap = await getDocs(query(collection(db, 'lots'), where('LotNumber', '==', row.LotNumber)));
          lotDoc = newLotSnap.docs[0];
        }

        await addDoc(collection(db, 'barcodes'), {
          BargeId: barge.id,
          LotId: lotDoc.id,
          CustomerId: customer.id,
          ItemId: item.id,
          SizeId: size.id,
          Quantity: parseInt(row.Quantity),
          Barcode: row.Barcode
        });
      }

      for (const staged of stagedData) {
        await deleteDoc(doc(db, 'stagedBarcodes', staged.id));
      }

      setSuccess(true);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto text-white">
      <h1 className="text-2xl font-bold mb-2">Data Import & Barcode Staging</h1>

      <div className="flex items-center gap-2 mb-4">
        <input type="file" accept=".csv" onChange={parseCSV} className="px-2 py-1" />
        {csvData.length > 0 && <span>{csvData.length} rows ready</span>}
      </div>

      {error && <div className="bg-red-700 px-4 py-2 rounded mb-2">Error: {error}</div>}

      {stagedData.length > 0 && (
        <div className="bg-gray-900 rounded shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-800 text-gray-400">
              <tr>
                <th className="px-4 py-2 text-left">Barcode</th>
                <th className="px-4 py-2 text-left">ItemCode</th>
                <th className="px-4 py-2 text-left">ItemName</th>
                <th className="px-4 py-2 text-left">LotNumber</th>
                <th className="px-4 py-2 text-left">BargeName</th>
                <th className="px-4 py-2 text-left">CustomerName</th>
                <th className="px-4 py-2 text-left">SupplierName</th>
                <th className="px-4 py-2 text-left">SizeName</th>
                <th className="px-4 py-2 text-left">Std Weight</th>
                <th className="px-4 py-2 text-left">Quantity</th>
                <th className="px-4 py-2 text-right">Delete</th>
              </tr>
            </thead>
            <tbody>
              {stagedData.map((row, i) => (
                <tr key={i} className="border-t border-gray-800 hover:bg-gray-800">
                  <td className="px-4 py-1 font-mono text-green-400">{row.Barcode}</td>
                  <td className="px-4 py-1">{row.ItemCode}</td>
                  <td className="px-4 py-1">{row.ItemName}</td>
                  <td className="px-4 py-1">{row.LotNumber}</td>
                  <td className="px-4 py-1">{row.BargeName}</td>
                  <td className="px-4 py-1">{row.CustomerName}</td>
                  <td className="px-4 py-1">{row.SupplierName}</td>
                  <td className="px-4 py-1">{row.SizeName}</td>
                  <td className="px-4 py-1">{row.StandardWeight}</td>
                  <td className="px-4 py-1">{row.Quantity}</td>
                  <td className="px-4 py-1 text-right">
                    <button onClick={() => deleteDoc(doc(db, 'stagedBarcodes', row.id))} className="text-red-400">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-between p-4">
            <button
              onClick={generateBarcodes}
              className="bg-green-700 text-white px-4 py-2 rounded disabled:opacity-50"
              disabled={uploading}
            >
              Generate Barcodes
            </button>
            <button
              onClick={async () => {
                for (const staged of stagedData) await deleteDoc(doc(db, 'stagedBarcodes', staged.id));
              }}
              className="bg-red-700 text-white px-4 py-2 rounded"
            >
              Cancel Upload
            </button>
          </div>
        </div>
      )}
    </div>
  );
}