// src/managers/ItemManager.jsx - COMPLETE FIXED VERSION
import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import ItemUploadModal from '../modals/ItemUploadModal';
import { EditIcon, DeleteIcon } from '../components/Icons';

export default function ItemManager() {
  const [items, setItems] = useState([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'items'),
      (snapshot) => {
        setItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching items:', error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  const fields = [
    { name: 'ItemCode', label: 'Item Code', type: 'text' },
    { name: 'ItemName', label: 'Item Name', type: 'text' },
    { name: 'Status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading items...</div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Items Management"
        subtitle="Manage items"
        buttonText="Add New Item"
        onAdd={() => {
          setCurrent(null);
          setModalOpen(true);
        }}
        extraButtons={
          <button
            onClick={() => setUploadOpen(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded shadow hover:opacity-90"
          >
            📁 Upload CSV
          </button>
        }
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
            {items.map(item => (
              <tr key={item.id} className="hover:bg-gray-50">
                {fields.map(f => (
                  <td key={f.name} className="px-6 py-4">{item[f.name] ?? '—'}</td>
                ))}
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => { 
                        setCurrent(item); 
                        setModalOpen(true); 
                      }}
                      className="text-green-800 hover:text-green-600"
                      title="Edit"
                    >
                      <EditIcon />
                    </button>
                    <button
                      onClick={async () => {
                        if (window.confirm('Are you sure you want to delete this item?')) {
                          await deleteDoc(doc(db, 'items', item.id));
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

        {items.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No items found. Click "Add New Item" or "Upload CSV" to get started.
          </div>
        )}
      </div>

      {modalOpen && (
        <Modal
          title={`${current ? 'Edit' : 'Add'} Item`}
          fields={fields}
          initialData={current}
          onClose={() => setModalOpen(false)}
          onSave={async data => {
            if (current?.id) {
              await updateDoc(doc(db, 'items', current.id), data);
            } else {
              await addDoc(collection(db, 'items'), data);
            }
            setModalOpen(false);
          }}
        />
      )}

      {uploadOpen && (
        <ItemUploadModal
          onClose={() => setUploadOpen(false)}
          onUpload={async (items) => {
            const promises = items.map((item) => addDoc(collection(db, 'items'), item));
            await Promise.all(promises);
            setUploadOpen(false);
          }}
        />
      )}
    </>
  );
}