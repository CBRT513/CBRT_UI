import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import { EditIcon, DeleteIcon } from '../components/Icons';

export default function ProductManager() {
  const [items, setItems] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);

  useEffect(() => {
    const unsub1 = onSnapshot(collection(db, 'items'), snap =>
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    const unsub2 = onSnapshot(collection(db, 'sizes'), snap =>
      setSizes(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => { unsub1(); unsub2(); };
  }, []);

  useEffect(() => {
    if (!items.length || !sizes.length) return;
    return onSnapshot(collection(db, 'products'), snap => {
      const prods = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setRows(prods.map(p => ({
        ...p,
        ItemCodeDisplay: items.find(i => i.id === p.ItemId)?.ItemCode || 'Unknown',
        ItemNameDisplay: items.find(i => i.id === p.ItemId)?.ItemName || 'Unknown',
        SizeNameDisplay: sizes.find(s => s.id === p.SizeId)?.SizeName || 'Unknown',
      })));
    });
  }, [items, sizes]);

  const fields = [
    { name: 'ItemCodeDisplay', label: 'Item Code', type: 'display' },
    { name: 'ItemNameDisplay', label: 'Item Name', type: 'display' },
    { name: 'SizeNameDisplay', label: 'Size', type: 'display' },
    { name: 'StandardWeight', label: 'Standard Weight (lbs)', type: 'number' },
    { name: 'Status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
  ];

  if (!items.length || !sizes.length) {
    return <div className="flex justify-center p-8">Loading products...</div>;
  }

  return (
    <>
      <PageHeader
        title="Products Management"
        subtitle="Manage item + size + weight combinations"
        buttonText="Add New Product"
        onAdd={() => { setCurrent(null); setOpen(true); }}
      />
      <div className="bg-white shadow rounded overflow-x-auto">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-100 text-xs uppercase text-gray-600">
            <tr>
              {fields.map(f => (
                <th key={f.name} className="px-6 py-3 text-left">{f.label}</th>
              ))}
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                {fields.map(f => (
                  <td key={f.name} className="px-6 py-4">{r[f.name] ?? '—'}</td>
                ))}
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => { setCurrent(r); setOpen(true); }}
                    className="text-green-800 hover:text-green-600"
                    title="Edit"
                  >
                    <EditIcon />
                  </button>
                  <button
                    onClick={async () => {
                      if (window.confirm('Delete this product?')) {
                        await deleteDoc(doc(db, 'products', r.id));
                      }
                    }}
                    className="text-red-600 hover:text-red-800"
                    title="Delete"
                  >
                    <DeleteIcon />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open && (
        <Modal
          title={`${current ? 'Edit' : 'Add'} Product`}
          fields={[
            { name: 'ItemId', label: 'Item', type: 'select', options: items.map(i => ({ id: i.id, name: `${i.ItemCode} - ${i.ItemName}` })) },
            { name: 'SizeId', label: 'Size', type: 'select', options: sizes.map(s => ({ id: s.id, name: s.SizeName })) },
            { name: 'StandardWeight', label: 'Standard Weight (lbs)', type: 'number' },
            { name: 'Status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
          ]}
          initialData={current}
          onClose={() => setOpen(false)}
          onSave={async data => {
            if (current?.id) {
              await updateDoc(doc(db, 'products', current.id), data);
            } else {
              await addDoc(collection(db, 'products'), data);
            }
            setOpen(false);
          }}
        />
      )}
    </>
  );
}
