// src/modals/ProductModal.jsx - COMPLETE UPDATED VERSION
import React, { useState } from 'react';

export default function ProductModal({
  title,
  initialData,
  items = [],
  sizes = [],
  onClose,
  onSave,
}) {
  const [form, setForm] = useState({
    itemId: initialData?.itemId || '',
    sizeId: initialData?.sizeId || '',
    itemCodeDisplay: initialData?.itemCodeDisplay || '',
    itemNameDisplay: initialData?.itemNameDisplay || '',
    sizeNameDisplay: initialData?.sizeNameDisplay || '',
    standardWeight: initialData?.standardWeight || 1,
    status: initialData?.status || 'Active',
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Auto-populate display fields when item or size is selected
    if (name === 'itemId') {
      const selectedItem = items.find(i => i.id === value);
      setForm(prev => ({
        ...prev,
        [name]: value,
        itemCodeDisplay: selectedItem?.itemCode || '',
        itemNameDisplay: selectedItem?.itemName || '',
      }));
    } else if (name === 'sizeId') {
      const selectedSize = sizes.find(s => s.id === value);
      setForm(prev => ({
        ...prev,
        [name]: value,
        sizeNameDisplay: selectedSize?.sizeName || '',
      }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: parseInt(value, 10) || 0 }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!form.itemId) {
      setError('Please select an item');
      return;
    }
    if (!form.sizeId) {
      setError('Please select a size');
      return;
    }
    if (!form.itemCodeDisplay || !form.itemNameDisplay || !form.sizeNameDisplay) {
      setError('Item Code, Item Name, and Size are required');
      return;
    }
    if (form.standardWeight <= 0) {
      setError('Standard Weight must be greater than 0');
      return;
    }

    try {
      await onSave(form);
    } catch (err) {
      console.error(err);
      setError('Failed to save product');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">{title}</h2>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Item *</label>
            <select
              name="itemId"
              value={form.itemId}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select Item</option>
              {items.map(item => (
                <option key={item.id} value={item.id}>
                  {item.itemCode} - {item.itemName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Size *</label>
            <select
              name="sizeId"
              value={form.sizeId}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select Size</option>
              {sizes.map(size => (
                <option key={size.id} value={size.id}>
                  {size.sizeName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Item Code Display</label>
            <input
              name="itemCodeDisplay"
              value={form.itemCodeDisplay}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Auto-populated from item selection"
              readOnly
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Item Name Display</label>
            <input
              name="itemNameDisplay"
              value={form.itemNameDisplay}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Auto-populated from item selection"
              readOnly
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Size Display</label>
            <input
              name="sizeNameDisplay"
              value={form.sizeNameDisplay}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Auto-populated from size selection"
              readOnly
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Standard Weight (lbs) *</label>
            <input
              name="standardWeight"
              type="number"
              min="0"
              step="0.1"
              value={form.standardWeight}
              onChange={handleNumberChange}
              className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-800 text-white rounded hover:bg-green-900 focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}