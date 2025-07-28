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
      setRows(snap.docs.map(d => {
        const data = { id: d.id, ...d.data() };
        return {
          ...data,
          SupplierName: suppliers.find(s => s.id === data.SupplierId)?.name || 'Unknown',
          ArrivalDateFormatted: data.ArrivalDate
            ? (data.ArrivalDate.seconds
                ? new Date(data.ArrivalDate.seconds * 1000)
                : new Date(data.ArrivalDate)
              ).toLocaleDateString()
            : '—'
        };
      }));
    });
  }, [suppliers]);

  const fields = [
    { name: 'BargeName', label: 'Barge Name', type: 'text' },
    { name: 'SupplierName', label: 'Supplier', type: 'display' },
    { name: 'ArrivalDateFormatted', label: 'Arrival Date', type: 'display' },
    { name: 'Status', label: 'Status', type: 'select', options: ['Expected','Arrived','Processing','Complete'] },
  ];

  if (!suppliers.length) {
    return <div className="flex justify-center p-8">Loading barges...</div>;
  }

  return (
    <>
      <PageHeader
        title="Barges Management"
        subtitle="Manage incoming barges"
        buttonText="Add New Barge"
        onAdd={() => { setCurrent(null); setOpen(true); }}
      />
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
                  <button onClick={() => { setCurrent(r); setOpen(true); }} className="text-green-800 hover:text-green-600" title="Edit"><EditIcon /></button>
                  <button onClick={async () => { if (confirm('Delete this barge?')) await deleteDoc(doc(db,'barges',r.id)); }} className="text-red-600 hover:text-red-800" title="Delete"><DeleteIcon /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open && (
        <Modal
          title={`${current ? 'Edit' : 'Add'} Barge`}
          fields={[
            { name: 'BargeName', label: 'Barge Name', type: 'text' },
            { name: 'SupplierId', label: 'Supplier', type: 'select', options: suppliers },
            { name: 'ArrivalDate', label: 'Arrival Date', type: 'date' },
            { name: 'Status', label: 'Status', type: 'select', options: ['Expected','Arrived','Processing','Complete'] },
            { name: 'Notes', label: 'Notes', type: 'text' },
          ]}
          initialData={current}
          onClose={() => setOpen(false)}
          onSave={async data => {
            if (data.ArrivalDate) data.ArrivalDate = new Date(data.ArrivalDate);
            if (current?.id) await updateDoc(doc(db,'barges',current.id),data);
            else await addDoc(collection(db,'barges'),data);
            setOpen(false);
          }}
        />
      )}
    </>
  );
}
