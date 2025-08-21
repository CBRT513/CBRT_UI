import React, { useState } from 'react';
import { useFirestoreCollection } from '../hooks/useFirestore';
import { addDoc, updateDoc, deleteDoc, collection, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { TableSkeleton, ErrorDisplay, EmptyState } from '../components/LoadingStates';
import ItemModal from '../modals/ItemModal';

export default function ItemManager() {
  const { data: items, loading, error } = useFirestoreCollection('items');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [loadingId, setLoadingId] = useState(null);

  const handleAdd = () => {
    setEditingItem(null);
    setShowModal(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setShowModal(true);
  };

  const handleSave = async (itemData) => {
    try {
      if (editingItem) {
        await updateDoc(doc(db, 'items', editingItem.id), {
          ...itemData,
          updatedAt: new Date()
        });
      } else {
        await addDoc(collection(db, 'items'), {
          ...itemData,
          createdAt: new Date()
        });
      }
      setShowModal(false);
      setEditingItem(null);
    } catch (error) {
      console.error('Error saving item:', error);
      alert('Failed to save item');
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete item ${item.itemCode || item.ItemCode}?`)) return;

    setLoadingId(item.id);
    try {
      await deleteDoc(doc(db, 'items', item.id));
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item');
    } finally {
      setLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Items</h1>
          <TableSkeleton rows={5} columns={4} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <ErrorDisplay message="Failed to load items" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Items</h1>
          <button
            onClick={handleAdd}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            + Add Item
          </button>
        </div>

        {!items || items.length === 0 ? (
          <EmptyState
            title="No items found"
            description="Add your first item to get started"
            actionLabel="Add Item"
            onAction={handleAdd}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
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
                {items.map((item, index) => (
                  <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.itemCode || item.ItemCode}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.itemName || item.ItemName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${(item.status || item.Status) === 'Active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                        }`}>
                        {item.status || item.Status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEdit(item)}
                        className="text-green-600 hover:text-green-900 mr-3"
                        title="Edit item"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        disabled={loadingId === item.id}
                        className="text-red-600 hover:text-red-900"
                        title="Delete item"
                      >
                        {loadingId === item.id ? '⏳' : '🗑️'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ItemModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingItem(null);
        }}
        onSave={handleSave}
        initialData={editingItem}
      />
    </div>
  );
}
