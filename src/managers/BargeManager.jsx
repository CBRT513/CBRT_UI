// File: /Users/cerion/CBRT_UI/src/managers/BargeManager.jsx

import React, { useState } from 'react';
import { useFirestoreCollection } from '../hooks/useFirestore';
import { addDoc, updateDoc, deleteDoc, collection, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { TableSkeleton, ErrorDisplay, EmptyState } from '../components/LoadingStates';
import BargeModal from '../modals/BargeModal';

export default function BargeManager() {
  const { data: barges, loading, error } = useFirestoreCollection('barges');
  const [showModal, setShowModal] = useState(false);
  const [editingBarge, setEditingBarge] = useState(null);
  const [loadingId, setLoadingId] = useState(null);

  const handleAdd = () => {
    setEditingBarge(null);
    setShowModal(true);
  };

  const handleEdit = (barge) => {
    setEditingBarge(barge);
    setShowModal(true);
  };

  const handleSave = async (bargeData) => {
    try {
      if (editingBarge) {
        await updateDoc(doc(db, 'barges', editingBarge.id), {
          ...bargeData,
          updatedAt: new Date()
        });
      } else {
        await addDoc(collection(db, 'barges'), {
          ...bargeData,
          createdAt: new Date()
        });
      }
      setShowModal(false);
      setEditingBarge(null);
    } catch (error) {
      console.error('Error saving barge:', error);
      throw error;
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this barge?')) return;
    
    setLoadingId(id);
    try {
      await deleteDoc(doc(db, 'barges', id));
    } catch (error) {
      console.error('Error deleting barge:', error);
      alert('Failed to delete barge');
    } finally {
      setLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Barges Management</h1>
          <TableSkeleton rows={5} columns={5} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Barges Management</h1>
          <ErrorDisplay message="Failed to load barges" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Barges Management</h1>
          <button
            onClick={handleAdd}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            + Add Barge
          </button>
        </div>

        <div className="text-sm text-gray-600 mb-4">
          Manage barges
        </div>

        {!barges || barges.length === 0 ? (
          <EmptyState 
            message="No barges found"
            submessage="Start by adding new barges."
            actionLabel="Add Barge"
            onAction={handleAdd}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Barge Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Supplier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Arrival Date
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
                {barges.map((barge, index) => (
                  <tr key={barge.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {barge.bargeName || barge.BargeName || barge.bargeNumber || barge.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {barge.supplierName || barge.SupplierName || barge.bolPrefix || 'Unknown Supplier'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(barge.arrivalDate || barge.ArrivalDate) ? new Date(barge.arrivalDate || barge.ArrivalDate).toLocaleDateString() : 'Not set'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        (barge.status || barge.Status) === 'Expected' 
                          ? 'bg-yellow-100 text-yellow-800'
                          : (barge.status || barge.Status) === 'Working'
                          ? 'bg-blue-100 text-blue-800' 
                          : (barge.status || barge.Status) === 'Completed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {barge.status || barge.Status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEdit(barge)}
                        className="text-green-600 hover:text-green-900 mr-3"
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(barge.id)}
                        disabled={loadingId === barge.id}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        {loadingId === barge.id ? '⏳' : '🗑️'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {barges && barges.length > 0 && (
          <div className="mt-6 bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{barges.length}</span> barge{barges.length !== 1 ? 's' : ''} total
              {' | '}
              <span className="font-medium">
                {barges.filter(b => b.Status === 'Expected').length}
              </span> expected
              {' | '}
              <span className="font-medium">
                {barges.filter(b => b.Status === 'Working').length}
              </span> working
              {' | '}
              <span className="font-medium">
                {barges.filter(b => b.Status === 'Completed').length}
              </span> completed
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <BargeModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setEditingBarge(null);
          }}
          onSave={handleSave}
          initialData={editingBarge}
        />
      )}
    </div>
  );
}