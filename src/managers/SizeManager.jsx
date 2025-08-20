// Fixed SizeManager.jsx - Using direct Firebase fetch
// Path: /Users/cerion/CBRT_UI/src/managers/SizeManager.jsx

import React, { useState, useEffect } from 'react';
import { addDoc, updateDoc, deleteDoc, collection, doc, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  orderBy,
  query,
} from 'firebase/firestore';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import { EditIcon, DeleteIcon } from '../components/Icons';
import { TableSkeleton, ErrorDisplay, EmptyState, LoadingSpinner } from '../components/LoadingStates';

// Direct Firebase fetch for sizes
const useSizesDirect = () => {
  const [sizes, setSizes] = useState([]);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchSizes = async () => {
    try {
      setLoading(true);
      setError(null);
      const q = query(collection(db, 'sizes'), orderBy('SizeName'));
      const snap = await getDocs(q);
      setSizes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Error fetching sizes:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchSizes = async () => {
      try {
        console.log('🔍 Fetching sizes directly from Firestore...');
        const snapshot = await getDocs(collection(db, 'sizes'));
        const sizesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Sort by sizeName (ascending) since sortOrder field might be missing
        sizesData.sort((a, b) => {
          const nameA = a.sizeName || '';
          const nameB = b.sizeName || '';
          return nameA.localeCompare(nameB);
        });
        
        console.log('🔍 Sizes data:', sizesData);
        console.log('🔍 Sizes count:', sizesData.length);
        
        setSizes(sizesData);
        setLoading(false);
      } catch (err) {
        console.error('❌ Error fetching sizes:', err);
        setError(err);
        setLoading(false);
      }
    };

    fetchSizes();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this size?')) return;
    
    setActionLoading(id);
    try {
      await deleteDoc(doc(db, 'sizes', id));
      fetchSizes();
    } catch (error) {
      console.error('Error deleting size:', error);
      alert('Failed to delete size. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRetry = () => {
    fetchSizes();
  };

  const fields = [
    { name: 'SizeName', label: 'Size Name', type: 'text' },
    { name: 'Status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
  ];

  // Error state
  if (error && !loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <PageHeader 
          title="Sizes Management" 
          subtitle="Manage sizes" 
        />
        <ErrorDisplay 
          error={error} 
          onRetry={handleRetry}
          title="Failed to load sizes data"
        />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Sizes Management"
        subtitle="Manage sizes"
        buttonText="Add New Size"
        onAdd={() => {
          setCurrent(null);
          setOpen(true);
        }}
        disabled={loading}
      />

      {loading ? (
        <TableSkeleton rows={6} columns={2} />
      ) : sizes.length === 0 ? (
        <EmptyState
          title="No sizes found"
          description="Get started by adding a new size."
          actionText="Add New Size"
          onAction={() => { setCurrent(null); setOpen(true); }}
        />
      ) : (
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
              {sizes.map(size => (
                <tr key={size.id} className="hover:bg-gray-50">
                  {fields.map(f => (
                    <td key={f.name} className="px-6 py-4">{size[f.name] ?? '—'}</td>
                  ))}
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setCurrent(size);
                          setOpen(true);
                        }}
                        disabled={actionLoading === size.id}
                        className="text-green-800 hover:text-green-600 disabled:text-gray-400 disabled:cursor-not-allowed"
                        title="Edit"
                      >
                        <EditIcon />
                      </button>
                      <button
                        onClick={() => handleDelete(size.id)}
                        disabled={actionLoading === size.id}
                        className="text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center"
                        title="Delete"
                      >
                        {actionLoading === size.id ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <DeleteIcon />
                        )}
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
          title={`${current ? 'Edit' : 'Add'} Size`}
          fields={fields}
          initialData={current}
          onClose={() => setOpen(false)}
          onSave={async data => {
            try {
              const sizeData = {
                ...data,
                SortOrder: 'ascending'
              };
              
              if (current?.id) {
                await updateDoc(doc(db, 'sizes', current.id), sizeData);
              } else {
                await addDoc(collection(db, 'sizes'), sizeData);
              }
              setOpen(false);
              fetchSizes();
            } catch (error) {
              console.error('Error saving size:', error);
              alert('Failed to save size. Please try again.');
            }
          }}
        />
      )}
    </>
  );
};

export default SizeManager;
