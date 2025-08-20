// Fixed LotManager.jsx - Using direct Firebase fetch
// Path: /Users/cerion/CBRT_UI/src/managers/LotManager.jsx

import React, { useState, useEffect } from 'react';
import { addDoc, updateDoc, deleteDoc, collection, doc, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

// Direct Firebase fetch for lots
const useLotsDirect = () => {
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLots = async () => {
      try {
        console.log('🔍 Fetching lots directly from Firestore...');
        const snapshot = await getDocs(collection(db, 'lots'));
        const lotsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        console.log('🔍 Lots data:', lotsData);
        console.log('🔍 Lots count:', lotsData.length);
        
        setLots(lotsData);
        setLoading(false);
      } catch (err) {
        console.error('❌ Error fetching lots:', err);
        setError(err);
        setLoading(false);
      }
    };

    fetchLots();
  }, []);

  return { lots, loading, error };
};

// Direct Firebase fetch for customers
const useCustomersDirect = () => {
  const [customers, setCustomers] = useState([]);
  
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'customers'));
        const customersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCustomers(customersData);
      } catch (err) {
        console.error('❌ Error fetching customers:', err);
      }
    };

    fetchCustomers();
  }, []);

  return customers;
};

const LotManager = () => {
  const { lots, loading, error } = useLotsDirect();
  const customers = useCustomersDirect();
  
  const [showModal, setShowModal] = useState(false);
  const [editingLot, setEditingLot] = useState(null);
  const [formData, setFormData] = useState({
    lotNumber: '',
    customerId: '',
    customerName: '',
    itemCode: '',
    itemName: '',
    standardWeight: '',
    quantity: '',
    status: 'Active'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setFormData({
      lotNumber: '',
      customerId: '',
      customerName: '',
      itemCode: '',
      itemName: '',
      standardWeight: '',
      quantity: '',
      status: 'Active'
    });
    setEditingLot(null);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
    setIsSubmitting(false);
  };

  const handleAddLot = () => {
    resetForm();
    setShowModal(true);
  };

  const handleEditLot = (lot) => {
    setFormData({
      lotNumber: lot.lotNumber || '',
      customerId: lot.customerId || '',
      customerName: lot.customerName || '',
      itemCode: lot.itemCode || '',
      itemName: lot.itemName || '',
      standardWeight: lot.standardWeight?.toString() || '',
      quantity: lot.quantity?.toString() || '',
      status: lot.status || 'Active'
    });
    setEditingLot(lot);
    setShowModal(true);
  };

  const handleDeleteLot = async (lotId) => {
    if (window.confirm('Are you sure you want to delete this lot?')) {
      try {
        await deleteDoc(doc(db, 'lots', lotId));
        console.log('✅ Lot deleted successfully');
        // Refresh data
        window.location.reload();
      } catch (error) {
        console.error('❌ Error deleting lot:', error);
        alert('Error deleting lot: ' + error.message);
      }
    }
  };

  const handleCustomerChange = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    setFormData({
      ...formData,
      customerId: customerId,
      customerName: customer ? (customer.customerName || customer.CustomerName || '') : ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const lotData = {
        lotNumber: formData.lotNumber,
        customerId: formData.customerId,
        customerName: formData.customerName,
        itemCode: formData.itemCode,
        itemName: formData.itemName,
        standardWeight: parseFloat(formData.standardWeight) || 0,
        quantity: parseInt(formData.quantity) || 0,
        status: formData.status,
        updatedAt: new Date()
      };

      if (editingLot) {
        await updateDoc(doc(db, 'lots', editingLot.id), lotData);
        console.log('✅ Lot updated successfully');
      } else {
        await addDoc(collection(db, 'lots'), {
          ...lotData,
          createdAt: new Date()
        });
        console.log('✅ Lot added successfully');
      }

      closeModal();
      // Refresh data
      window.location.reload();
    } catch (error) {
      console.error('❌ Error saving lot:', error);
      alert('Error saving lot: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading lots...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Error Loading Lots</h3>
          <p className="text-red-700 text-sm mt-1">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Lots</h1>
        <button
          onClick={handleAddLot}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
        >
          <span className="text-lg">+</span> Add Lot
        </button>
      </div>

      {lots && lots.length > 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lot Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Weight
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
              {lots.map((lot) => (
                <tr key={lot.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {lot.lotNumber || 'No Number'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {lot.customerName || 'No Customer'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div className="font-medium">{lot.itemName || 'No Item'}</div>
                      <div className="text-gray-500 text-xs">{lot.itemCode}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {lot.standardWeight || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {lot.quantity || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      lot.status === 'Active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {lot.status || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleEditLot(lot)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteLot(lot.id)}
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
          <p className="text-gray-600 mb-4">No lots found</p>
          <button
            onClick={handleAddLot}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            Add First Lot
          </button>
        </div>
      )}

      {/* Modal for Add/Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">
              {editingLot ? 'Edit Lot' : 'Add New Lot'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lot Number
                  </label>
                  <input
                    type="text"
                    value={formData.lotNumber}
                    onChange={(e) => setFormData({ ...formData, lotNumber: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer
                  </label>
                  <select
                    value={formData.customerId}
                    onChange={(e) => handleCustomerChange(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Customer</option>
                    {customers.map(customer => (
                      <option key={customer.id} value={customer.id}>
                        {customer.customerName || customer.CustomerName || 'Unknown Customer'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Standard Weight
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.standardWeight}
                    onChange={(e) => setFormData({ ...formData, standardWeight: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
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
                  {isSubmitting ? 'Saving...' : editingLot ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LotManager;