// Fixed SizeManager.jsx - Using direct Firebase fetch
// Path: /Users/cerion/CBRT_UI/src/managers/SizeManager.jsx

import React, { useState, useEffect } from 'react';
import { addDoc, updateDoc, deleteDoc, collection, doc, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
<<<<<<< Updated upstream
||||||| Stash base
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
=======
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
>>>>>>> Stashed changes

// Direct Firebase fetch for sizes
const useSizesDirect = () => {
  const [sizes, setSizes] = useState([]);
<<<<<<< Updated upstream
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
||||||| Stash base
  const [form, setForm] = useState({ SizeName: '', Status: 'Active' });
  const [editingId, setEditingId] = useState(null);

  const fetchSizes = async () => {
    const q = query(collection(db, 'sizes'), orderBy('SizeName'));
    const snap = await getDocs(q);
    setSizes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };
=======
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
>>>>>>> Stashed changes

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

<<<<<<< Updated upstream
  return { sizes, loading, error };
};

const SizeManager = () => {
  const { sizes, loading, error } = useSizesDirect();
  
  const [showModal, setShowModal] = useState(false);
  const [editingSize, setEditingSize] = useState(null);
  const [formData, setFormData] = useState({
    sizeName: '',
    sortOrder: 'ascending',
    status: 'Active'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setFormData({
      sizeName: '',
      sortOrder: 'ascending',
      status: 'Active'
    });
    setEditingSize(null);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
    setIsSubmitting(false);
  };

  const handleAddSize = () => {
    resetForm();
    setShowModal(true);
  };

  const handleEditSize = (size) => {
    setFormData({
      sizeName: size.sizeName || '',
      sortOrder: size.sortOrder || 'ascending',
      status: size.status || 'Active'
    });
    setEditingSize(size);
    setShowModal(true);
  };

  const handleDeleteSize = async (sizeId) => {
    if (window.confirm('Are you sure you want to delete this size?')) {
      try {
        await deleteDoc(doc(db, 'sizes', sizeId));
        console.log('✅ Size deleted successfully');
        // Refresh data
        window.location.reload();
      } catch (error) {
        console.error('❌ Error deleting size:', error);
        alert('Error deleting size: ' + error.message);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const sizeData = {
        sizeName: formData.sizeName,
        sortOrder: formData.sortOrder,
        status: formData.status,
        updatedAt: new Date()
      };

      if (editingSize) {
        await updateDoc(doc(db, 'sizes', editingSize.id), sizeData);
        console.log('✅ Size updated successfully');
      } else {
        await addDoc(collection(db, 'sizes'), {
          ...sizeData,
          createdAt: new Date()
        });
        console.log('✅ Size added successfully');
      }

      closeModal();
      // Refresh data
      window.location.reload();
    } catch (error) {
      console.error('❌ Error saving size:', error);
      alert('Error saving size: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading sizes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Error Loading Sizes</h3>
          <p className="text-red-700 text-sm mt-1">{error.message}</p>
        </div>
      </div>
    );
  }
||||||| Stash base
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.SizeName.trim()) return;

    if (editingId) {
      await updateDoc(doc(db, 'sizes', editingId), {
        SizeName: form.SizeName.trim(),
        Status: form.Status,
      });
    } else {
      await addDoc(collection(db, 'sizes'), {
        SizeName: form.SizeName.trim(),
        Status: form.Status,
        SortOrder: 'ascending'
      });
    }
    setForm({ SizeName: '', Status: 'Active' });
    setEditingId(null);
    fetchSizes();
  };

  const handleEdit = (size) => {
    setForm({ SizeName: size.SizeName, Status: size.Status });
    setEditingId(size.id);
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, 'sizes', id));
    fetchSizes();
  };
=======
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
>>>>>>> Stashed changes

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
<<<<<<< Updated upstream
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Sizes</h1>
        <button
          onClick={handleAddSize}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
        >
          <span className="text-lg">+</span> Add Size
        </button>
      </div>
||||||| Stash base
    <div className="p-6">
      <h2 className="text-2xl font-bold text-green-600 mb-2">Sizes Management</h2>
      <p className="text-gray-600 mb-6">Manage sizes</p>

      <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 mb-6">
        <input
          name="SizeName"
          value={form.SizeName}
          onChange={handleChange}
          placeholder="Size Name"
          className="border px-3 py-2 rounded w-48"
          required
        />
        <select
          name="Status"
          value={form.Status}
          onChange={handleChange}
          className="border px-3 py-2 rounded w-32"
        >
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
        <button type="submit" className="bg-green-700 text-white px-4 py-2 rounded">
          {editingId ? 'Update Size' : 'Add New Size'}
        </button>
      </form>
=======
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
>>>>>>> Stashed changes

<<<<<<< Updated upstream
      {sizes && sizes.length > 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Size Name
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
              {sizes.map((size) => (
                <tr key={size.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {size.sizeName || 'No Name'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      size.status === 'Active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {size.status || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleEditSize(size)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteSize(size.id)}
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
          <p className="text-gray-600 mb-4">No sizes found</p>
          <button
            onClick={handleAddSize}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            Add First Size
          </button>
        </div>
      )}

      {/* Modal for Add/Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingSize ? 'Edit Size' : 'Add New Size'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Size Name
                </label>
                <input
                  type="text"
                  value={formData.sizeName}
                  onChange={(e) => setFormData({ ...formData, sizeName: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 3x6, 6x16, -28"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sort Order
                </label>
                <select
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="ascending">Ascending</option>
                  <option value="descending">Descending</option>
                </select>
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
                  {isSubmitting ? 'Saving...' : editingSize ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
||||||| Stash base
      <table className="w-full text-sm border border-gray-300">
        <thead className="bg-gray-800 text-white">
          <tr>
            <th className="p-2 text-left">Size Name</th>
            <th className="p-2 text-left">Status</th>
            <th className="p-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sizes.map(size => (
            <tr key={size.id} className="border-t border-gray-200">
              <td className="p-2">{size.SizeName}</td>
              <td className="p-2">{size.Status}</td>
              <td className="p-2">
                <button onClick={() => handleEdit(size)} className="text-green-600 mr-2">✏️</button>
                <button onClick={() => handleDelete(size.id)} className="text-red-600">🗑️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
=======
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
>>>>>>> Stashed changes
  );
};

export default SizeManager;