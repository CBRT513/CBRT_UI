// Fixed BarcodeManager.jsx - Updated to handle new fields and correct field names
// Path: /Users/cerion/CBRT_UI/src/managers/BarcodeManager.jsx

import React, { useState, useEffect } from 'react';
import { addDoc, updateDoc, deleteDoc, collection, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useFirestoreCollection } from '../hooks/useFirestore';

const BarcodeManager = () => {
  const { data: barcodes, loading, error } = useFirestoreCollection('barcodes');
  
  const [formData, setFormData] = useState({
    supplierName: '',
    customerName: '',
    itemCode: '',        // ✅ ADD: New required field
    itemName: '',
    bargeName: '',       // ✅ ADD: New optional field
    sizeName: '',
    lotNumber: '',       // ✅ CHANGE: from 'lotName' to 'lotNumber'
    quantity: '',
    barcode: '',         // ✅ CHANGE: from 'barcodeContent' to 'barcode'
    BOLPrefix: '',       // ✅ ADD: New required field
    status: 'Active'
  });

  const [editingId, setEditingId] = useState(null);
  const [filters, setFilters] = useState({
    supplier: '',
    customer: '',
    item: '',
    status: 'all'
  });

  // Debug Firebase connection
  useEffect(() => {
    console.log('🔍 BarcodeManager mounted');
    console.log('📊 Barcodes data:', barcodes?.length || 0, 'records');
    console.log('⏳ Loading state:', loading);
    console.log('❌ Error state:', error);
  }, [barcodes, loading, error]);

  // Generate unique barcode content
  const generateBarcodeContent = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `BC${timestamp}${random}`;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Generate barcode content if not provided
      const barcodeContent = formData.barcode || generateBarcodeContent();
      
      const barcodeData = {
        ...formData,
        barcode: barcodeContent,        // ✅ CHANGE: from barcodeContent
        lotNumber: formData.lotNumber,  // ✅ CHANGE: from lotName
        quantity: parseInt(formData.quantity) || 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      if (editingId) {
        // Update existing barcode
        await updateDoc(doc(db, 'barcodes', editingId), {
          ...barcodeData,
          updatedAt: new Date()
        });
        setEditingId(null);
        console.log('✅ Barcode updated successfully');
      } else {
        // Add new barcode
        await addDoc(collection(db, 'barcodes'), barcodeData);
        console.log('✅ Barcode added successfully');
      }

      // Reset form
      setFormData({
        supplierName: '',
        customerName: '',
        itemCode: '',
        itemName: '',
        bargeName: '',
        sizeName: '',
        lotNumber: '',
        quantity: '',
        barcode: '',
        BOLPrefix: '',
        status: 'Active'
      });
    } catch (error) {
      console.error('❌ Error saving barcode:', error);
      alert('Error saving barcode. Please try again.');
    }
  };

  // Handle edit
  const handleEdit = (barcode) => {
    setFormData({
      supplierName: barcode.supplierName || barcode.SupplierName || '',
      customerName: barcode.customerName || barcode.CustomerName || '',
      itemCode: barcode.itemCode || '',        // ✅ ADD: Handle itemCode
      itemName: barcode.itemName || barcode.ItemName || '',
      bargeName: barcode.bargeName || '',      // ✅ ADD: Handle bargeName
      sizeName: barcode.sizeName || barcode.SizeName || '',
      lotNumber: barcode.lotNumber || '',      // ✅ CHANGE: from lotName to lotNumber
      quantity: barcode.quantity || barcode.Quantity || '',
      barcode: barcode.barcode || '',          // ✅ CHANGE: from barcodeContent to barcode
      BOLPrefix: barcode.BOLPrefix || '',      // ✅ ADD: Handle BOLPrefix
      status: barcode.status || barcode.Status || 'Active'
    });
    setEditingId(barcode.id);
  };

  // Handle delete
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this barcode?')) {
      try {
        await deleteDoc(doc(db, 'barcodes', id));
        console.log('✅ Barcode deleted successfully');
      } catch (error) {
        console.error('❌ Error deleting barcode:', error);
        alert('Error deleting barcode. Please try again.');
      }
    }
  };

  // Filter barcodes
  const filteredBarcodes = barcodes?.filter(barcode => {
    const matchesSupplier = !filters.supplier || 
      (barcode.supplierName || barcode.SupplierName || '').toLowerCase().includes(filters.supplier.toLowerCase());
    const matchesCustomer = !filters.customer || 
      (barcode.customerName || barcode.CustomerName || '').toLowerCase().includes(filters.customer.toLowerCase());
    const matchesItem = !filters.item || 
      (barcode.itemName || barcode.ItemName || '').toLowerCase().includes(filters.item.toLowerCase()) ||
      (barcode.itemCode || '').toLowerCase().includes(filters.item.toLowerCase());
    const matchesStatus = filters.status === 'all' || 
      (barcode.status || barcode.Status) === filters.status;
    
    return matchesSupplier && matchesCustomer && matchesItem && matchesStatus;
  }) || [];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600">Loading barcodes...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-red-800 font-medium">Error Loading Barcodes</h3>
        <p className="text-red-600 mt-1">{error.message}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-3 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Barcode Manager</h1>
        <p className="text-gray-600">Manage warehouse barcodes and tracking</p>
      </div>

      {/* Add/Edit Form */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">
          {editingId ? 'Edit Barcode' : 'Add New Barcode'}
        </h2>
        
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Supplier Name
            </label>
            <input
              type="text"
              value={formData.supplierName}
              onChange={(e) => setFormData({...formData, supplierName: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer Name *
            </label>
            <input
              type="text"
              value={formData.customerName}
              onChange={(e) => setFormData({...formData, customerName: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              BOL Prefix *
            </label>
            <input
              type="text"
              value={formData.BOLPrefix}
              onChange={(e) => setFormData({...formData, BOLPrefix: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Item Code *
            </label>
            <input
              type="text"
              value={formData.itemCode}
              onChange={(e) => setFormData({...formData, itemCode: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Item Name *
            </label>
            <input
              type="text"
              value={formData.itemName}
              onChange={(e) => setFormData({...formData, itemName: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Size Name
            </label>
            <input
              type="text"
              value={formData.sizeName}
              onChange={(e) => setFormData({...formData, sizeName: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Barge Name
            </label>
            <input
              type="text"
              value={formData.bargeName}
              onChange={(e) => setFormData({...formData, bargeName: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lot Number
            </label>
            <input
              type="text"
              value={formData.lotNumber}
              onChange={(e) => setFormData({...formData, lotNumber: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity *
            </label>
            <input
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData({...formData, quantity: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Barcode Content
            </label>
            <input
              type="text"
              value={formData.barcode}
              onChange={(e) => setFormData({...formData, barcode: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Auto-generated if empty"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({...formData, status: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Archived">Archived</option>
            </select>
          </div>

          <div className="md:col-span-2 lg:col-span-4 flex gap-3">
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {editingId ? 'Update Barcode' : 'Add Barcode'}
            </button>
            
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setFormData({
                    supplierName: '',
                    customerName: '',
                    itemCode: '',
                    itemName: '',
                    bargeName: '',
                    sizeName: '',
                    lotNumber: '',
                    quantity: '',
                    barcode: '',
                    BOLPrefix: '',
                    status: 'Active'
                  });
                }}
                className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Filters */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-medium mb-3">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
            <input
              type="text"
              value={filters.supplier}
              onChange={(e) => setFilters({...filters, supplier: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Filter by supplier..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
            <input
              type="text"
              value={filters.customer}
              onChange={(e) => setFilters({...filters, customer: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Filter by customer..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Item</label>
            <input
              type="text"
              value={filters.item}
              onChange={(e) => setFilters({...filters, item: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Filter by item name or code..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Archived">Archived</option>
            </select>
          </div>
        </div>
      </div>

      {/* Barcodes Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium">
            Barcodes ({filteredBarcodes.length} total)
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Barcode
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  BOL Prefix
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Barge
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lot
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
              {filteredBarcodes.map((barcode) => (
                <tr key={barcode.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                    {barcode.barcode || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {barcode.BOLPrefix || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {barcode.customerName || barcode.CustomerName || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {barcode.itemCode || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {barcode.itemName || barcode.ItemName || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {barcode.sizeName || barcode.SizeName || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {barcode.bargeName || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {barcode.lotNumber || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {barcode.quantity || barcode.Quantity || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      (barcode.status || barcode.Status) === 'Active' 
                        ? 'bg-green-100 text-green-800'
                        : (barcode.status || barcode.Status) === 'Inactive'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {barcode.status || barcode.Status || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEdit(barcode)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(barcode.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredBarcodes.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No barcodes found</p>
              <p className="text-gray-400 text-sm mt-1">
                {barcodes?.length === 0 
                  ? 'Add your first barcode above' 
                  : 'Try adjusting your filters'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BarcodeManager;