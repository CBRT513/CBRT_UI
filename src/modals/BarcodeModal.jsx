import React, { useState, useEffect } from 'react';
import { useFirestoreCollection } from '../hooks/useFirestore';
import { generateBarcode } from '../utils';

export default function BarcodeModal({ isOpen, onClose, onSave, initialData }) {
  const { data: barges } = useFirestoreCollection('barges');
  const { data: lots } = useFirestoreCollection('lots');
  const { data: customers } = useFirestoreCollection('customers');
  const { data: items } = useFirestoreCollection('items');
  const { data: sizes } = useFirestoreCollection('sizes');

  const [form, setForm] = useState({
    bargeId: '',
    lotId: '',
    customerId: '',
    itemId: '',
    sizeId: '',
    quantity: 0,
    barcode: '',
    status: 'Active'
  });

  // Safety check - don't render if form is null
  if (!form) return null;

  useEffect(() => {
    if (initialData) {
      setForm(initialData);
    } else {
      setForm({
        bargeId: '',
        lotId: '',
        customerId: '',
        itemId: '',
        sizeId: '',
        quantity: 0,
        barcode: '',
        status: 'Active'
      });
    }
  }, [initialData, isOpen]);

  // Safe access to form properties
  const selectedBarge = barges?.find(b => b.id === form?.bargeId);
  const selectedLot = lots?.find(l => l.id === form?.lotId);
  const selectedCustomer = customers?.find(c => c.id === form?.customerId);
  const selectedItem = items?.find(i => i.id === form?.itemId);
  const selectedSize = sizes?.find(s => s.id === form?.sizeId);

  // Auto-generate barcode when all fields are selected
  useEffect(() => {
    if (selectedBarge && selectedLot && selectedCustomer && selectedItem && selectedSize) {
      const newBarcode = generateBarcode({
        barge: selectedBarge.bargeName || selectedBarge.bargeId,
        lot: selectedLot.lotNumber,
        customer: selectedCustomer.customerCode || selectedCustomer.customerName,
        item: selectedItem.itemCode,
        size: selectedSize.sizeCode || selectedSize.sizeName
      });
      setForm(prev => ({ ...prev, barcode: newBarcode }));
    }
  }, [selectedBarge, selectedLot, selectedCustomer, selectedItem, selectedSize]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await onSave(form);
      onClose();
    } catch (error) {
      console.error('Error saving barcode:', error);
      alert('Failed to save barcode');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            {initialData ? 'Edit Barcode' : 'Add Barcode'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Barge Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Barge *
            </label>
            <select
              value={form.bargeId}
              onChange={(e) => setForm(prev => ({ ...prev, bargeId: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            >
              <option value="">Select Barge</option>
              {barges?.map(barge => (
                <option key={barge.id} value={barge.id}>
                  {barge.bargeName || barge.bargeId}
                </option>
              ))}
            </select>
          </div>

          {/* Lot Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lot *
            </label>
            <select
              value={form.lotId}
              onChange={(e) => setForm(prev => ({ ...prev, lotId: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            >
              <option value="">Select Lot</option>
              {lots?.map(lot => (
                <option key={lot.id} value={lot.id}>
                  {lot.lotNumber}
                </option>
              ))}
            </select>
          </div>

          {/* Customer Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer *
            </label>
            <select
              value={form.customerId}
              onChange={(e) => setForm(prev => ({ ...prev, customerId: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            >
              <option value="">Select Customer</option>
              {customers?.map(customer => (
                <option key={customer.id} value={customer.id}>
                  {customer.customerName}
                </option>
              ))}
            </select>
          </div>

          {/* Item Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Item *
            </label>
            <select
              value={form.itemId}
              onChange={(e) => setForm(prev => ({ ...prev, itemId: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            >
              <option value="">Select Item</option>
              {items?.map(item => (
                <option key={item.id} value={item.id}>
                  {item.itemCode} - {item.itemName}
                </option>
              ))}
            </select>
          </div>

          {/* Size Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Size *
            </label>
            <select
              value={form.sizeId}
              onChange={(e) => setForm(prev => ({ ...prev, sizeId: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            >
              <option value="">Select Size</option>
              {sizes?.map(size => (
                <option key={size.id} value={size.id}>
                  {size.sizeName}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity *
            </label>
            <input
              type="number"
              value={form.quantity}
              onChange={(e) => setForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              required
              min="1"
            />
          </div>

          {/* Auto-generated Barcode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Barcode (Auto-generated)
            </label>
            <input
              type="text"
              value={form.barcode}
              onChange={(e) => setForm(prev => ({ ...prev, barcode: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Barcode will be auto-generated"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status *
            </label>
            <select
              value={form.status}
              onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {initialData ? 'Update' : 'Create'} Barcode
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}