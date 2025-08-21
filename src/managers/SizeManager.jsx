import React, { useState } from 'react';
import { useFirestoreCollection } from '../hooks/useFirestore';
import { addDoc, updateDoc, deleteDoc, collection, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { TableSkeleton, ErrorDisplay, EmptyState } from '../components/LoadingStates';
import SizeModal from '../modals/SizeModal';

export default function SizeManager() {
  const { data: sizes, loading, error } = useFirestoreCollection('sizes');
  const [showModal, setShowModal] = useState(false);
  const [editingSize, setEditingSize] = useState(null);
  const [loadingId, setLoadingId] = useState(null);

  const handleAdd = () => {
    setEditingSize(null);
    setShowModal(true);
  };

  const handleEdit = (size) => {
    setEditingSize(size);
    setShowModal(true);
  };

  const handleSave = async (sizeData) => {
    try {
      if (editingSize) {
        await updateDoc(doc(db, 'sizes', editingSize.id), {
          ...sizeData,
          updatedAt: new Date()
        });
      } else {
        await addDoc(collection(db, 'sizes'), {
          ...sizeData,
          createdAt: new Date()
        });
      }
      setShowModal(false);
      setEditingSize(null);
    } catch (error) {
      console.error('Error saving size:', error);
      alert('Failed to save size');
    }
  };

  const handleDelete = async (size) => {
    if (!window.confirm(`Delete size ${size.sizeName || size.SizeName}?`)) return;

    setLoadingId(size.id);
    try {
      await deleteDoc(doc(db, 'sizes', size.id));
    } catch (error) {
      console.error('Error deleting size:', error);
      alert('Failed to delete size');
    } finally {
      setLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Sizes</h1>
          <TableSkeleton rows={5} columns={3} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <ErrorDisplay message="Failed to load sizes" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Sizes</h1>
          <button
            onClick={handleAdd}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            + Add Size
          </button>
        </div>

        {!sizes || sizes.length === 0 ? (
          <EmptyState
            title="No sizes found"
            description="Add your first size to get started"
            actionLabel="Add Size"
            onAction={handleAdd}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sort Order
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
                {sizes.map((size, index) => (
                  <tr key={size.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {size.sizeName || size.SizeName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {size.sortOrder || size.SortOrder || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${(size.status || size.Status) === 'Active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                        }`}>
                        {size.status || size.Status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEdit(size)}
                        className="text-green-600 hover:text-green-900 mr-3"
                        title="Edit size"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(size)}
                        disabled={loadingId === size.id}
                        className="text-red-600 hover:text-red-900"
                        title="Delete size"
                      >
                        {loadingId === size.id ? '⏳' : '🗑️'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <SizeModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingSize(null);
        }}
        onSave={handleSave}
        initialData={editingSize}
      />
    </div>
  );
}
