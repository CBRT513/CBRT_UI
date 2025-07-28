// src/managers/BarcodeManager.jsx
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import PageHeader from '../components/PageHeader';
import Modal from '../modals/BarcodeModal';
import BarcodeUploadModal from '../modals/BarcodeUploadModal';
import { EditIcon, DeleteIcon } from '../components/Icons';

export default function BarcodeManager() {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [current, setCurrent] = useState(null);
  const [refs, setRefs] = useState({ barges: [], lots: [], customers: [], items: [], sizes: [] });

  useEffect(() => {
    ['barges', 'lots', 'customers', 'items', 'sizes'].forEach(col => {
      onSnapshot(collection(db, col), snap => {
        setRefs(r => ({ ...r, [col]: snap.docs.map(d => ({ id: d.id, ...d.data() })) }));
      });
    });
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'barcodes'), snap => {
      setRows(snap.docs.map(d => {
        const data = d.data();
        const b = refs.barges.find(x => x.id === data.BargeId);
        const l = refs.lots.find(x => x.id === data.LotId);
        const c = refs.customers.find(x => x.id === data.CustomerId);
        const i = refs.items.find(x => x.id === data.ItemId);
        const s = refs.sizes.find(x => x.id === data.SizeId);
        return {
          id: d.id,
          ...data,
          BargeName: b?.BargeName || '—',
          LotNumber: l?.LotNumber || '—',
          CustomerName: c?.CustomerName || '—',
          ItemCode: i?.ItemCode || '—',
          SizeName: s?.SizeName || '—',
          GeneratedBarcode: `${b?.BargeName || ''}${l?.LotNumber || ''}${c?.CustomerName || ''}${i?.ItemCode || ''}${s?.SizeName || ''}`.replace(/\s/g, '')
        };
      }));
    });

    return unsubscribe;
  }, [refs]);

  const fields = [
    { name: 'BargeName', label: 'Barge' },
    { name: 'LotNumber', label: 'Lot #' },
    { name: 'CustomerName', label: 'Customer' },
    { name: 'ItemCode', label: 'Item' },
    { name: 'SizeName', label: 'Size' },
    { name: 'GeneratedBarcode', label: 'Barcode' },
    { name: 'Quantity', label: 'Qty', type: 'number' },
  ];

  const isLoading = ![refs.barges, refs.lots, refs.customers, refs.items, refs.sizes].every(a => a.length);

  return (
    <>
      <PageHeader
        title="Barcodes Management"
        subtitle="Manage barcodes"
        buttonText="Add New Barcode"
        onAdd={() => {
          setCurrent(null);
          setOpen(true);
        }}
      />

      <div className="flex justify-end mb-4">
        <button
          onClick={() => setUploadOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:opacity-90"
        >
          📁 Upload CSV
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">Loading barcodes...</div>
      ) : (
        <div className="bg-white shadow rounded overflow-x-auto">
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-100 text-xs uppercase text-gray-600">
              <tr>
                {fields.map((f) => (
                  <th key={f.name} className="px-6 py-3 text-left">
                    {f.label}
                  </th>
                ))}
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  {fields.map((f) => (
                    <td key={f.name} className="px-6 py-4 text-sm">
                      {f.name === 'GeneratedBarcode' ? (
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                          {r[f.name]}
                        </code>
                      ) : (
                        r[f.name] ?? '—'
                      )}
                    </td>
                  ))}
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setCurrent(r);
                          setOpen(true);
                        }}
                        className="text-green-800 hover:text-green-600"
                        title="Edit"
                      >
                        <EditIcon />
                      </button>
                      <button
                        onClick={async () => {
                          if (window.confirm('Are you sure you want to delete this barcode?')) {
                            await deleteDoc(doc(db, 'barcodes', r.id));
                          }
                        }}
                        className="text-red-600 hover:text-red-800"
                        title="Delete"
                      >
                        <DeleteIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <Modal
          title={`${current ? 'Edit' : 'Add'} Barcode`}
          initialData={current}
          referenceData={refs}
          onClose={() => setOpen(false)}
          onSave={async (data) => {
            if (current?.id) await updateDoc(doc(db, 'barcodes', current.id), data);
            else await addDoc(collection(db, 'barcodes'), data);
            setOpen(false);
          }}
        />
      )}

      {uploadOpen && (
        <BarcodeUploadModal onClose={() => setUploadOpen(false)} />
      )}
    </>
  );
}