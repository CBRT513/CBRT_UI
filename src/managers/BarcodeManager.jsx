import React, { useState } from 'react';
import { useFirestoreCollection } from '../hooks/useFirestore';
import { addDoc, updateDoc, deleteDoc, collection, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { TableSkeleton, ErrorDisplay, EmptyState } from '../components/LoadingStates';
import BarcodeModal from '../modals/BarcodeModal';

export default function BarcodeManager() {
  const { data: barcodes, loading, error } = useFirestoreCollection('barcodes');
  const [showModal, setShowModal] = useState(false);
  const [editingBarcode, setEditingBarcode] = useState(null);
  const [loadingId, setLoadingId] = useState(null);

  const handleAdd = () => {
    setEditingBarcode(null);
    setShowModal(true);
  };

  const handleEdit = (barcode) => {
    setEditingBarcode(barcode);
    setShowModal(true);
  };

  const handleSave = async (barcodeData) => {
    try {
      if (editingBarcode) {
        await updateDoc(doc(db, 'barcodes', editingBarcode.id), {
          ...barcodeData,
          updatedAt: new Date()
        });
      } else {
        await addDoc(collection(db, 'barcodes'), {
          ...barcodeData,
          createdAt: new Date()
        });
      }
      setShowModal(false);
      setEditingBarcode(null);
    } catch (error) {
      console.error('Error saving barcode:', error);
      throw error;
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this barcode?')) return;
    
    setLoadingId(id);
    try {
      await deleteDoc(doc(db, 'barcodes', id));
    } catch (error) {
      console.error('Error deleting barcode:', error);
      alert('Failed to delete barcode');
    } finally {
      setLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Barcodes Management</h1>
          <TableSkeleton rows={10} columns={8} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Barcodes Management</h1>
          <ErrorDisplay message="Failed to load barcodes" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Barcodes Management</h1>
          <button
            onClick={handleAdd}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            + Add New Barcode
          </button>
        </div>

        <div className="text-sm text-gray-600 mb-4">
          Manage barcodes
        </div>

        {!barcodes || barcodes.length === 0 ? (
          <EmptyState 
            message="No barcodes found"
            submessage="Start by adding new barcodes."
            actionLabel="Add New Barcode"
            onAction={handleAdd}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Barcode
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lot
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
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
                {barcodes.map((barcode, index) => (
                  <tr key={barcode.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-green-600">
                      {barcode.barcode || barcode.Barcode}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {barcode.itemCode || barcode.ItemCode} - {barcode.itemName || barcode.ItemName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {barcode.sizeName || barcode.SizeName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {barcode.lotNumber || barcode.LotNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {barcode.customerName || barcode.CustomerName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {barcode.quantity || barcode.Quantity} bags
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        (barcode.status || barcode.Status) === 'Available' 
                          ? 'bg-green-100 text-green-800' 
                          : (barcode.status || barcode.Status) === 'Scanned'
                          ? 'bg-blue-100 text-blue-800'
                          : (barcode.status || barcode.Status) === 'Shipped'
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {barcode.status || barcode.Status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEdit(barcode)}
                        className="text-green-600 hover:text-green-900 mr-3"
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(barcode.id)}
                        disabled={loadingId === barcode.id}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        {loadingId === barcode.id ? '⏳' : '🗑️'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {barcodes && barcodes.length > 0 && (
          <div className="mt-6 bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{barcodes.length}</span> barcode{barcodes.length !== 1 ? 's' : ''} total
              {' | '}
              <span className="font-medium">
                {barcodes.reduce((sum, b) => sum + (parseInt(b.Quantity) || 0), 0)}
              </span> total bags
              {' | '}
              <span className="font-medium">
                {barcodes.filter(b => b.Status === 'Available').length}
              </span> available
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <BarcodeModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setEditingBarcode(null);
          }}
          onSave={handleSave}
          initialData={editingBarcode}
        />
      )}
    </div>
  );
}