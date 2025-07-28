#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const base = './src';

const filesToWrite = {
  // Managers
  'managers/ItemManager.jsx': `
import React from 'react';
import Manager from '../components/Manager';

export default function ItemManager() {
  return (
    <Manager
      collectionName="items"
      fields={[
        { name: 'ItemCode', label: 'Item Code', type: 'text' },
        { name: 'ItemName', label: 'Item Name', type: 'text' },
        { name: 'Status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
      ]}
    />
  );
}
`,

  'managers/SizeManager.jsx': `
import React from 'react';
import Manager from '../components/Manager';

export default function SizeManager() {
  return (
    <Manager
      collectionName="sizes"
      fields={[
        { name: 'SizeName', label: 'Size Name', type: 'text' },
        { name: 'SizeType', label: 'Size Type', type: 'select', options: ['Dimensional', 'Mesh', 'Special'] },
        { name: 'SortOrder', label: 'Sort Order', type: 'number' },
        { name: 'Status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
      ]}
    />
  );
}
`,

  'managers/ProductManager.jsx': `
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
    const unsubItems = onSnapshot(collection(db, 'items'), snap => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubSizes = onSnapshot(collection(db, 'sizes'), snap => {
      setSizes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => {
      unsubItems();
      unsubSizes();
    };
  }, []);

  useEffect(() => {
    if (!items.length || !sizes.length) return;
    return onSnapshot(collection(db, 'products'), snap => {
      const prods = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const withNames = prods.map(p => ({
        ...p,
        ItemCodeDisplay: items.find(i => i.id === p.ItemId)?.ItemCode || 'Unknown',
        ItemNameDisplay: items.find(i => i.id === p.ItemId)?.ItemName || 'Unknown',
        SizeNameDisplay: sizes.find(s => s.id === p.SizeId)?.SizeName || 'Unknown',
      }));
      setRows(withNames);
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
        onAdd={() => {
          setCurrent(null);
          setOpen(true);
        }}
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
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => { setCurrent(r); setOpen(true); }}
                      className="text-green-800 hover:text-green-600"
                      title="Edit"
                    >
                      <EditIcon />
                    </button>
                    <button
                      onClick={async () => {
                        if (window.confirm('Are you sure you want to delete this product?')) {
                          await deleteDoc(doc(db, 'products', r.id));
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

      {open && (
        <Modal
          title={\`\${current ? 'Edit' : 'Add'} Product\`}
          fields={[
            { name: 'ItemId', label: 'Item', type: 'select', options: items.map(i => ({ id: i.id, name: \`\${i.ItemCode} - \${i.ItemName}\` })) },
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
`,

  'managers/BargeManager.jsx': `
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import { EditIcon, DeleteIcon } from '../components/Icons';

export default function BargeManager() {
  const [rows, setRows] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);

  useEffect(() => {
    return onSnapshot(collection(db, 'suppliers'), snap => {
      setSuppliers(snap.docs.map(d => ({ id: d.id, name: d.data().SupplierName })));
    });
  }, []);

  useEffect(() => {
    if (!suppliers.length) return;
    return onSnapshot(collection(db, 'barges'), snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setRows(data.map(b => ({
        ...b,
        SupplierName: suppliers.find(s => s.id === b.SupplierId)?.name || 'Unknown',
        ArrivalDateFormatted: b.ArrivalDate
          ? (b.ArrivalDate.seconds ? new Date(b.ArrivalDate.seconds * 1000) : new Date(b.ArrivalDate)).toLocaleDateString()
          : '—'
      })));
    });
  }, [suppliers]);

  const fields = [
    { name: 'BargeName', label: 'Barge Name', type: 'text' },
    { name: 'SupplierName', label: 'Supplier', type: 'display' },
    { name: 'ArrivalDateFormatted', label: 'Arrival Date', type: 'display' },
    { name: 'Status', label: 'Status', type: 'select', options: ['Expected', 'Arrived', 'Processing', 'Complete'] },
  ];

  if (!suppliers.length) {
    return <div className="flex justify-center p-8">Loading barges...</div>;
  }

  return (
    <>
      <PageHeader title="Barges Management" subtitle="Manage incoming barges" buttonText="Add New Barge" onAdd={() => { setCurrent(null); setOpen(true); }} />
      <div className="bg-white shadow rounded overflow-x-auto">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-100 text-xs uppercase text-gray-600">
            <tr>
              {fields.map(f => <th key={f.name} className="px-6 py-3 text-left">{f.label}</th>)}
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                {fields.map(f => <td key={f.name} className="px-6 py-4">{r[f.name] ?? '—'}</td>)}
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => { setCurrent(r); setOpen(true); }} className="text-green-800 hover:text-green-600" title="Edit"><EditIcon /></button>
                    <button onClick={async () => { if (confirm('Delete this barge?')) await deleteDoc(doc(db, 'barges', r.id)); }} className="text-red-600 hover:text-red-800" title="Delete"><DeleteIcon /></button>
                  </div>
                </td>
              </>
            ))}
          </tbody>
        </table>
      </div>
      {open && (
        <Modal
          title={\`\${current ? 'Edit' : 'Add'} Barge\`}
          fields={[
            { name: 'BargeName', label: 'Barge Name', type: 'text' },
            { name: 'SupplierId', label: 'Supplier', type: 'select', options: suppliers },
            { name: 'ArrivalDate', label: 'Arrival Date', type: 'date' },
            { name: 'Status', label: 'Status', type: 'select', options: ['Expected', 'Arrived', 'Processing', 'Complete'] },
            { name: 'Notes', label: 'Notes', type: 'text' },
          ]}
          initialData={current}
          onClose={() => setOpen(false)}
          onSave={async data => {
            if (data.ArrivalDate) data.ArrivalDate = new Date(data.ArrivalDate);
            if (current?.id) await updateDoc(doc(db, 'barges', current.id), data); else await addDoc(collection(db, 'barges'), data);
            setOpen(false);
          }}
        />
      )}
    </>
  );
}
`,

  // ... add remaining manager, modal, and route entries similarly
};

Object.entries(filesToWrite).forEach(([relativePath, content]) => {
  const filePath = path.join(base, relativePath);
  fs.writeFileSync(filePath, content.trimStart(), 'utf8');
  console.log(`Wrote ${relativePath}`);
});
