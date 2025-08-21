// BargeModal.jsx - Modal for managing Barges with Supplier linkage
import React, { useState, useEffect } from 'react';
import { useFirestoreCollection } from '../hooks/useFirestore';

export default function BargeModal({ isOpen, onClose, onSave, initialData }) {
  const { data: suppliers } = useFirestoreCollection('suppliers');
  
  const [formData, setFormData] = useState({
    bargeName: '',
    supplierName: '',
    supplierId: '',
    arrivalDate: '',
    status: 'Expected'
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        bargeName: initialData.bargeName || initialData.BargeName || initialData.bargeNumber || '',
        supplierName: initialData.supplierName || initialData.SupplierName || '',
        supplierId: initialData.supplierId || initialData.SupplierId || '',
        arrivalDate: initialData.arrivalDate || initialData.ArrivalDate || '',
        status: initialData.status || initialData.Status || 'Expected'
      });
    } else if (suppliers && suppliers.length === 1 && !formData.supplierId) {
      // Auto-select if only one supplier
      const singleSupplier = suppliers[0];
      setFormData(prev => ({
        ...prev,
        supplierId: singleSupplier.id,
        supplierName: singleSupplier.supplierName || singleSupplier.SupplierName
      }));
    }
  }, [initialData, suppliers]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // If supplier selection changes, update both name and ID
    if (name === 'supplierId') {
      const selectedSupplier = suppliers?.find(s => s.id === value);
      setFormData(prev => ({
        ...prev,
        supplierId: value,
        supplierName: selectedSupplier ? 
          (selectedSupplier.supplierName || selectedSupplier.SupplierName) : ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.bargeName) {
      alert('Barge name is required');
      return;
    }

    await onSave(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">
          {initialData ? 'Edit Barge' : 'Add New Barge'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Barge Name *
            </label>
            <input
              type="text"
              name="bargeName"
              value={formData.bargeName}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              placeholder="e.g., RF707X"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Supplier *
            </label>
            <select
              name="supplierId"
              value={formData.supplierId}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">
                {!suppliers || suppliers.length === 0 ? 'None available' : 'Select a supplier...'}
              </option>
              {suppliers?.map(supplier => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.supplierName || supplier.SupplierName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Arrival Date (Optional)
            </label>
            <input
              type="date"
              name="arrivalDate"
              value={formData.arrivalDate}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave blank if arrival date is not yet known
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status *
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="Expected">Expected</option>
              <option value="Working">Working</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}