// src/components/Modal.jsx
import React, { useState } from 'react';

const Modal = ({ title, onClose, onSave, initialData, fields }) => {
  const setNestedValue = (obj, path, value) => {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  };

  const getNestedValue = (obj, path) => {
    const value = path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : '';
    }, obj);
    if (value instanceof Date) {
      return value.toISOString().split('T')[0];
    }
    return value;
  };

  const [form, setForm] = useState(() => {
    const initialForm = {};
    fields.forEach(field => {
      let value;
      if (initialData) {
        value = getNestedValue(initialData, field.name);
        if (field.type === 'date' && value?.seconds) {
          value = new Date(value.seconds * 1000).toISOString().split('T')[0];
        }
      } else {
        value = (field.type === 'select' && field.options?.includes('Active')) ? 'Active' : '';
      }
      setNestedValue(initialForm, field.name, value || '');
    });
    return initialForm;
  });

  const [error, setError] = useState('');

  const handleChange = (name, value) => {
    setForm(prev => {
      const newForm = { ...prev };
      setNestedValue(newForm, name, value);
      return newForm;
    });
  };

  const submit = e => {
    e.preventDefault();
    for (const f of fields) {
      if (f.name === 'Notes') continue;
      const value = getNestedValue(form, f.name);
      if (!String(value || '').trim()) {
        setError(`${f.label} is required`);
        return;
      }
    }
    onSave(form);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">{title}</h2>
        <form onSubmit={submit} className="space-y-3">
          {fields.map(f => f.type === 'select' ? (
            <select
              key={f.name}
              value={getNestedValue(form, f.name)}
              onChange={e => handleChange(f.name, e.target.value)}
              className="w-full border px-3 py-2"
            >
              <option value="">Select {f.label}</option>
              {f.options.map(opt =>
                typeof opt === 'string'
                  ? <option key={opt} value={opt}>{opt}</option>
                  : <option key={opt.id} value={opt.id}>{opt.name}</option>
              )}
            </select>
          ) : f.type === 'date' ? (
            <input
              key={f.name}
              type="date"
              placeholder={f.label}
              value={getNestedValue(form, f.name)}
              onChange={e => handleChange(f.name, e.target.value)}
              className="w-full border px-3 py-2"
            />
          ) : (
            <input
              key={f.name}
              type={f.type}
              placeholder={f.label}
              value={getNestedValue(form, f.name)}
              onChange={e => handleChange(f.name, e.target.value)}
              className="w-full border px-3 py-2"
            />
          ))}
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex justify-end gap-2 mt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-green-800 text-white rounded">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Modal;