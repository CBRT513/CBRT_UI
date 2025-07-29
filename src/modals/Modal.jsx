// src/modals/Modal.jsx
import React, { useState } from 'react';

export default function Modal({ title, initialData, referenceData = {}, fields, onClose, onSave }) {
  const [form, setForm] = useState(initialData);
  const [error, setError] = useState('');

  const handleChange = (name, value) => {
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await onSave(form);
    } catch (err) {
      console.error(err);
      setError('Save failed. Please try again.');
    }
  };

  const renderField = (field) => {
    const { name, label, type = 'text', options = [], getLabel } = field;

    if (type === 'select') {
      const selectOptions = Array.isArray(options) ? options : referenceData[options] || [];

      return (
        <select
          key={name}
          value={form[name] || ''}
          onChange={e => handleChange(name, e.target.value)}
          className="w-full border px-3 py-2 rounded"
          required
        >
          <option value="">Select {label}</option>
          {selectOptions.map(opt => {
            const value = typeof opt === 'string' ? opt : opt.id;
            const text = typeof opt === 'string' ? opt : getLabel?.(opt) || opt.name || opt.label || value;
            return <option key={value} value={value}>{text}</option>;
          })}
        </select>
      );
    }

    return (
      <input
        key={name}
        type={type}
        value={form[name] || ''}
        onChange={e => handleChange(name, type === 'number' ? +e.target.value : e.target.value)}
        placeholder={label}
        className="w-full border px-3 py-2 rounded"
        required
      />
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