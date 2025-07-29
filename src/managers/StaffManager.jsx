// src/managers/StaffManager.jsx - COMPLETE FIXED VERSION
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import PageHeader from '../components/PageHeader';
import StaffModal from '../modals/StaffModal';
import { EditIcon, DeleteIcon } from '../components/Icons';

export default function StaffManager() {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'staff'),
      (snapshot) => {
        setRows(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching staff:', error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  const fields = [
    { name: 'name', label: 'Name' },
    { name: 'email', label: 'Email' },
    { name: 'role', label: 'Role' },
    { name: 'authType', label: 'Auth Type' },
    { name: 'status', label: 'Status' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading staff...</div>
      </div>
    );
  }

  return (
    <>
      <PageHeader 
        title="Staff Management" 
        subtitle="Manage staff members" 
        buttonText="Add New Staff" 
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
                <td className="px-6 py-4 font-medium">{r.name ?? '—'}</td>
                <td className="px-6 py-4">{r.email ?? '—'}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2 py-1 text-xs rounded-full font-medium ${
                    r.role === 'Admin' ? 'bg-red-100 text-red-800' :
                    r.role === 'Office' ? 'bg-blue-100 text-blue-800' :
                    r.role === 'Warehouse' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {r.role ?? '—'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                    r.authType === 'Google' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {r.authType ?? '—'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                    r.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {r.status ?? '—'}
                  </span>
                </td>
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
                        if (window.confirm('Are you sure you want to delete this staff member?')) {
                          await deleteDoc(doc(db, 'staff', r.id));
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

        {rows.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No staff members found. Click "Add New Staff" to get started.
          </div>
        )}
      </div>

      {open && (
        <StaffModal 
          title={`${current ? 'Edit' : 'Add'} Staff`} 
          initialData={current} 
          onClose={() => setOpen(false)} 
          onSave={async data => {
            if (current?.id) {
              await updateDoc(doc(db, 'staff', current.id), data);
            } else {
              await addDoc(collection(db, 'staff'), data);
            }
            setOpen(false);
          }}
        />
      )}
    </>
  );
}