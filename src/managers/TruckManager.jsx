import React, { useState } from 'react';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import { EditIcon, DeleteIcon } from '../components/Icons';
import { db } from '../firebase/config';
import {
  collection,
  doc,
  updateDoc,
  addDoc,
  deleteDoc,
} from 'firebase/firestore';

import useTrucksWithCarriers from '../hooks/useTrucksWithCarriers';

export default function TruckManager() {
  const { trucks, carriers, isLoading } = useTrucksWithCarriers();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);

  const fields = [
    { name: 'TruckNumber', label: 'Truck Number', type: 'text' },
    { name: 'TrailerNumber', label: 'Trailer Number', type: 'text' },
    { name: 'Carrier', label: 'Carrier', type: 'select', options: carriers },
    { name: 'Status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
  ];

  const displayFields = [
    { name: 'TruckNumber', label: 'Truck Number' },
    { name: 'TrailerNumber', label: 'Trailer Number' },
    { name: 'CarrierName', label: 'Carrier' },
    { name: 'Status', label: 'Status' },
  ];

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading trucks...</div>;
  }

  return (
    <>
      <PageHeader
        title="Trucks Management"
        subtitle="Manage trucks and assign carriers"
        buttonText="Add New Truck"
        onAdd={() => {
          setCurrent(null);
          setOpen(true);
        }}
      />

      <div className="bg-white shadow rounded overflow-x-auto">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-100 text-xs uppercase text-gray-600">
            <tr>
              {displayFields.map(f => (
                <th key={f.name} className="px-6 py-3 text-left">{f.label}</th>
              ))}
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {trucks.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                {displayFields.map(f => (
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
                        if (window.confirm('Are you sure you want to delete this truck?')) {
                          await deleteDoc(doc(db, 'trucks', r.id));
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
          title={`${current ? 'Edit' : 'Add'} Truck`}
          fields={fields}
          initialData={current}
          onClose={() => setOpen(false)}
          onSave={async data => {
            if (current?.id) {
              await updateDoc(doc(db, 'trucks', current.id), data);
            } else {
              await addDoc(collection(db, 'trucks'), data);
            }
            setOpen(false);
          }}
        />
      )}
    </>
  );
}