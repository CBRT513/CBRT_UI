// src/modals/Modal.jsx
import React, { useState, useEffect } from 'react';

export default function Modal({ title, initialData, referenceData = {}, fields, onClose, onSave }) {
  const [form, setForm] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    setForm(initialData || {});
  }, [initialData]);

  const handleChange = (name, value) => {
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await onSave(form);
    } catch (err) {
      console.error('Save error:', err);
      setError(err.message || 'Save failed. Please try again.');
    }
  };

  const renderField = (field) => {
    const { name, label, type = 'text', options = [], getLabel } = field;

    const commonProps = {
      id: name,
      name,
      required: true,
      className: "w-full border px-3 py-2 rounded"
    };

    const fieldLabel = (
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
    );

    if (type === 'select') {
      const selectOptions = Array.isArray(options) ? options : referenceData[options] || [];
      return (
        <div key={name} className="space-y-1">
          {fieldLabel}
          <select
            {...commonProps}
            value={form[name] || ''}
            onChange={e => handleChange(name, e.target.value)}
          >
            <option value="">Select {label}</option>
            {selectOptions.map(opt => {
              const value = typeof opt === 'string' ? opt : opt.id;
              const text = typeof opt === 'string' ? opt : getLabel?.(opt) || opt.name || opt.label || value;
              return <option key={value} value={value}>{text}</option>;
            })}
          </select>
        </div>
      );
    }

    return (
      <div key={name} className="space-y-1">
        {fieldLabel}
        <input
          {...commonProps}
          type={type}
          value={form[name] || ''}
          onChange={e => handleChange(name, type === 'number' ? +e.target.value : e.target.value)}
          placeholder={label}
        />
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
        <h2 className="text-xl font-bold mb-4">{title}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map(renderField)}
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-green-800 text-white rounded">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}