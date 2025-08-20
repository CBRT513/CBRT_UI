<<<<<<< Updated upstream
// Fixed ItemManager.jsx - Using direct Firebase fetch
// Path: /Users/cerion/CBRT_UI/src/managers/ItemManager.jsx
||||||| Stash base
// src/managers/ItemManager.jsx - COMPLETE FIXED VERSION
import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import ItemUploadModal from '../modals/ItemUploadModal';
import { EditIcon, DeleteIcon } from '../components/Icons';
=======
// src/managers/ItemManager.jsx - COMPLETE FIXED VERSION
import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import ItemUploadModal from '../modals/ItemUploadModal';
import { EditIcon, DeleteIcon } from '../components/Icons';
import { TableSkeleton, ErrorDisplay, EmptyState, LoadingSpinner } from '../components/LoadingStates';
>>>>>>> Stashed changes

import React, { useState, useEffect } from 'react';
import { addDoc, updateDoc, deleteDoc, collection, doc, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

// Direct Firebase fetch for items
const useItemsDirect = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
<<<<<<< Updated upstream
  const [error, setError] = useState(null);
||||||| Stash base
=======
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
>>>>>>> Stashed changes

  useEffect(() => {
<<<<<<< Updated upstream
    const fetchItems = async () => {
      try {
        console.log('🔍 Fetching items directly from Firestore...');
        const snapshot = await getDocs(collection(db, 'items'));
        const itemsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        console.log('🔍 Items data:', itemsData);
        console.log('🔍 Items count:', itemsData.length);
        
        setItems(itemsData);
        setLoading(false);
      } catch (err) {
        console.error('❌ Error fetching items:', err);
        setError(err);
||||||| Stash base
    const unsubscribe = onSnapshot(
      collection(db, 'items'),
      (snapshot) => {
        setItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching items:', error);
=======
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
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
      <div className="p-6">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading items...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Error Loading Items</h3>
          <p className="text-red-700 text-sm mt-1">{error.message}</p>
        </div>
||||||| Stash base
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading items...</div>
=======
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
>>>>>>> Stashed changes
      </div>
    );
  }

  return (
<<<<<<< Updated upstream
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Items</h1>
        <button
          onClick={handleAddItem}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
        >
          <span className="text-lg">+</span> Add Item
        </button>
      </div>
||||||| Stash base
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
=======
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
>>>>>>> Stashed changes

<<<<<<< Updated upstream
      {items && items.length > 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.itemCode || 'No Code'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.itemName || 'No Name'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      item.status === 'Active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {item.status || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleEditItem(item)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-600 mb-4">No items found</p>
          <button
            onClick={handleAddItem}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            Add First Item
          </button>
        </div>
||||||| Stash base
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
=======
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
>>>>>>> Stashed changes
      )}

<<<<<<< Updated upstream
      {/* Modal for Add/Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingItem ? 'Edit Item' : 'Add New Item'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item Code
                </label>
                <input
                  type="text"
                  value={formData.itemCode}
                  onChange={(e) => setFormData({ ...formData, itemCode: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item Name
                </label>
                <input
                  type="text"
                  value={formData.itemName}
                  onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingItem ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
||||||| Stash base
      {uploadOpen && (
        <ItemUploadModal
          onClose={() => setUploadOpen(false)}
          onUpload={async (items) => {
            const promises = items.map((item) => addDoc(collection(db, 'items'), item));
            await Promise.all(promises);
            setUploadOpen(false);
          }}
        />
=======
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
>>>>>>> Stashed changes
      )}
    </div>
  );
};

export default ItemManager;