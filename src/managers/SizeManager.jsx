// Fixed SizeManager.jsx - Using direct Firebase fetch
// Path: /Users/cerion/CBRT_UI/src/managers/SizeManager.jsx

import React, { useState, useEffect } from 'react';
import { addDoc, updateDoc, deleteDoc, collection, doc, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

// Direct Firebase fetch for sizes
const useSizesDirect = () => {
  const [sizes, setSizes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  return (
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
  );
};

export default SizeManager;