// src/managers/ItemManager.jsx - COMPLETE FIXED VERSION
import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import ItemUploadModal from '../modals/ItemUploadModal';
import { EditIcon, DeleteIcon } from '../components/Icons';
import { TableSkeleton, ErrorDisplay, EmptyState, LoadingSpinner } from '../components/LoadingStates';

import React, { useState, useEffect } from 'react';
import { addDoc, updateDoc, deleteDoc, collection, doc, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

// Direct Firebase fetch for items
const useItemsDirect = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'items'),
      (snapshot) => {
        try {
          setItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
          setLoading(false);
          setError(null);
        } catch (err) {
          console.error('Error processing items:', err);
          setError(err);
          setLoading(false);
        }
      },
      (error) => {
        console.error('Error fetching items:', error);
        setError(error);
        setLoading(false);
      }
    };

    fetchItems();
  }, []);

  return { items, loading, error };
};

const ItemManager = () => {
  const { items, loading, error } = useItemsDirect();
  
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    itemCode: '',
    itemName: '',
    status: 'Active'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setFormData({
      itemCode: '',
      itemName: '',
      status: 'Active'
    });
    setEditingItem(null);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
    setIsSubmitting(false);
  };

  const handleAddItem = () => {
    resetForm();
    setShowModal(true);
  };

  const handleEditItem = (item) => {
    setFormData({
      itemCode: item.itemCode || '',
      itemName: item.itemName || '',
      status: item.status || 'Active'
    });
    setEditingItem(item);
    setShowModal(true);
  };

  const handleDeleteItem = async (itemId) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await deleteDoc(doc(db, 'items', itemId));
        console.log('✅ Item deleted successfully');
        // Refresh data
        window.location.reload();
      } catch (error) {
        console.error('❌ Error deleting item:', error);
        alert('Error deleting item: ' + error.message);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const itemData = {
        itemCode: formData.itemCode,
        itemName: formData.itemName,
        status: formData.status,
        updatedAt: new Date()
      };

      if (editingItem) {
        await updateDoc(doc(db, 'items', editingItem.id), itemData);
        console.log('✅ Item updated successfully');
      } else {
        await addDoc(collection(db, 'items'), {
          ...itemData,
          createdAt: new Date()
        });
        console.log('✅ Item added successfully');
      }

      closeModal();
      // Refresh data
      window.location.reload();
    } catch (error) {
      console.error('❌ Error saving item:', error);
      alert('Error saving item: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    
    setActionLoading(id);
    try {
      await deleteDoc(doc(db, 'items', id));
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
  };

  // Error state
  if (error && !loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <PageHeader 
          title="Items Management" 
          subtitle="Manage items" 
        />
        <ErrorDisplay 
          error={error} 
          onRetry={handleRetry}
          title="Failed to load items data"
        />
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
        disabled={loading}
        extraButtons={
          <button
            onClick={() => setUploadOpen(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded shadow hover:opacity-90"
          >
            📁 Upload CSV
          </button>
        }
      />

      {loading ? (
        <TableSkeleton rows={6} columns={3} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No items found"
          description="Get started by adding a new item or uploading a CSV file."
          actionText="Add New Item"
          onAction={() => { setCurrent(null); setModalOpen(true); }}
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
                        disabled={actionLoading === item.id}
                        className="text-green-800 hover:text-green-600 disabled:text-gray-400 disabled:cursor-not-allowed"
                        title="Edit"
                      >
                        <EditIcon />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={actionLoading === item.id}
                        className="text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center"
                        title="Delete"
                      >
                        {actionLoading === item.id ? (
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

      {modalOpen && (
        <Modal
          title={`${current ? 'Edit' : 'Add'} Item`}
          fields={fields}
          initialData={current}
          onClose={() => setModalOpen(false)}
          onSave={async data => {
            try {
              if (current?.id) {
                await updateDoc(doc(db, 'items', current.id), data);
              } else {
                await addDoc(collection(db, 'items'), data);
              }
              setModalOpen(false);
            } catch (error) {
              console.error('Error saving item:', error);
              alert('Failed to save item. Please try again.');
            }
          }}
        />
      )}

      {uploadOpen && (
        <ItemUploadModal
          onClose={() => setUploadOpen(false)}
          onUpload={async (items) => {
            try {
              const promises = items.map((item) => addDoc(collection(db, 'items'), item));
              await Promise.all(promises);
              setUploadOpen(false);
            } catch (error) {
              console.error('Error uploading items:', error);
              alert('Failed to upload items. Please try again.');
            }
          }}
        />
      )}
    </div>
  );
};

export default ItemManager;
