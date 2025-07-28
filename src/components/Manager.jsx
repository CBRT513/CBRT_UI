import React, { useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../firebase/config'; // 👈 Relative to components/
import Modal from './Modal';
import PageHeader from './PageHeader';
import { EditIcon, DeleteIcon } from './Icons';

export default function Manager({ collectionName, fields }) {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);

  useEffect(() =>
    onSnapshot(collection(db, collectionName), snap =>
      setRows(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    ),
    [collectionName]
  );

  const getValue = (obj, path) =>
    path.split('.').reduce((o, k) => (o && k in o ? o[k] : undefined), obj);

  return (
    <>
      <PageHeader
        title={`${collectionName[0].toUpperCase() + collectionName.slice(1)} Management`}
        subtitle={`Manage ${collectionName}`}
        buttonText={`Add New ${collectionName.slice(0, -1)}`}
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
                  <td key={f.name} className="px-6 py-4">{getValue(r, f.name) ?? '—'}</td>
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
                        if (window.confirm('Are you sure you want to delete this item?')) {
                          await deleteDoc(doc(db, collectionName, r.id));
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
          title={`${current ? 'Edit' : 'Add'} ${collectionName.slice(0, -1)}`}
          fields={fields}
          initialData={current}
          onClose={() => setOpen(false)}
          onSave={async data => {
            if (current?.id) {
              await updateDoc(doc(db, collectionName, current.id), data);
            } else {
              await addDoc(collection(db, collectionName), data);
            }
            setOpen(false);
          }}
        />
      )}
    </>
  );
}