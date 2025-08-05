// File: /Users/cerion/CBRT_UI/src/modals/Modal.jsx

import React, { useState, useEffect } from 'react';
import { useFirestoreCollection } from '../hooks/useFirestore';

export default function Modal({ title, initialData, fields, onClose, onSave, collection }) {
  const [form, setForm] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Load reference data for dropdowns
  const referenceCollections = {};
  fields.forEach(field => {
    if (field.collection) {
      referenceCollections[field.collection] = useFirestoreCollection(field.collection);
    }
  });

  useEffect(() => {
    // Initialize form data with defaults
    const initializeFormData = () => {
      const data = initialData || {};
      const defaults = {};
      
      fields.forEach(field => {
        if (field.name === 'Status' && !data[field.name]) {
          defaults[field.name] = 'Active';
        } else if (field.defaultValue && !data[field.name]) {
          defaults[field.name] = field.defaultValue;
        }
      });
      
      return { ...defaults, ...data };
    };

    setForm(initializeFormData());
  }, [initialData, fields]);

  const handleChange = (name, value) => {
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleCancel = () => {
    setError('');
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate required fields
    const missingFields = fields
      .filter(field => field.required && !form[field.name])
      .map(field => field.label);

    if (missingFields.length > 0) {
      setError(`Please fill in: ${missingFields.join(', ')}`);
      setLoading(false);
      return;
    }

    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setError('Failed to save. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!form) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">{title || (initialData ? 'Edit' : 'Add New')}</h2>
          <button 
            onClick={handleCancel}
            className="text-gray-500 hover:text-gray-700 text-xl font-bold"
          >
            ✕
          </button>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map(field => (
            <div key={field.name}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label} {field.required && '*'}
              </label>
              
              {field.type === 'select' ? (
                <select
                  value={form[field.name] || ''}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  required={field.required}
                >
                  <option value="">Select {field.label}</option>
                  {field.options ? (
                    field.options.map((option, index) => (
                      <option key={option.value || index} value={option.value}>
                        {option.label}
                      </option>
                    ))
                  ) : field.collection ? (
                    referenceCollections[field.collection]?.data?.map(item => (
                      <option key={item.id} value={item.id}>
                        {item[field.displayField] || item.name || item.id}
                      </option>
                    ))
                  ) : null}
                </select>
              ) : field.type === 'textarea' ? (
                <textarea
                  value={form[field.name] || ''}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  rows={3}
                  required={field.required}
                />
              ) : field.type === 'checkbox' ? (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={form[field.name] || false}
                    onChange={(e) => handleChange(field.name, e.target.checked)}
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    id={field.name}
                  />
                  <label htmlFor={field.name} className="ml-2 text-sm text-gray-700">
                    {field.label}
                  </label>
                </div>
              ) : (
                <input
                  type={field.type || 'text'}
                  value={form[field.name] || ''}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  required={field.required}
                />
              )}
            </div>
          ))}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleCancel}
              disabled={false}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}