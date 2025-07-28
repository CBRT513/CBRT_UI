import React, { useState, useEffect } from 'react';
// ... full StaffModal code as before ...
export default function StaffModal({ title, initialData, onClose, onSave }) {
  // paste code from your previous StaffModal implementation
}
import React, { useState, useEffect } from 'react';

export default function StaffModal({ title, initialData, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    name: initialData?.name ?? '',
    email: initialData?.email ?? '',
    role: initialData?.role ?? '',
    authType: initialData?.authType ?? '',
    status: initialData?.status ?? 'Active',
  }));

  const [error, setError] = useState('');

  // Auto-set authType based on selected role
  useEffect(() => {
    if (form.role) {
      const authType = form.role === 'Warehouse' ? 'PIN' : 'Google';
      setForm(prev => ({ ...prev, authType }));
    }
  }, [form.role]);

  const handleChange = (name, value) => {
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const submit = async e => {
    e.preventDefault();
    setError('');

    // Validation
    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }
    if (!form.role) {
      setError('Role is required');
      return;
    }
    if (form.authType === 'Google' && !form.email.trim()) {
      setError('Email is required for Google auth');
      return;
    }

    // Build payload
    const dataToSave = {
      name: form.name,
      email: form.email,
      role: form.role,
      authType: form.authType,
      status: form.status,
    };

    // For warehouse users, initialize PIN setup fields
    if (form.authType === 'PIN') {
      dataToSave.pinSetup = false;
      dataToSave.pinHash = null;
    }

    try {
      await onSave(dataToSave);
    } catch (err) {
      console.error(err);
      setError('Failed to save staff member');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">{title}</h2>
        <form onSubmit={submit} className="space-y-3">
          {/* Name */}
          <input
            type="text"
            placeholder="Full Name"
            value={form.name}
            onChange={e => handleChange('name', e.target.value)}
            className="w-full border px-3 py-2 rounded"
            required
          />

          {/* Email */}
          <input
            type="email"
            placeholder="Email Address"
            value={form.email}
            onChange={e => handleChange('email', e.target.value)}
            className="w-full border px-3 py-2 rounded"
            disabled={form.authType === 'PIN'}
          />

          {/* Role */}
          <select
            value={form.role}
            onChange={e => handleChange('role', e.target.value)}
            className="w-full border px-3 py-2 rounded"
            required
          >
            <option value="">Select Role</option>
            <option value="Admin">Admin</option>
            <option value="Office">Office</option>
            <option value="Warehouse">Warehouse</option>
          </select>

          {/* Auth Type Display */}
          {form.authType && (
            <div className="p-3 bg-gray-50 rounded">
              <label className="text-sm text-gray-600">Authentication Type:</label>
              <span
                className={`inline-block px-2 py-1 rounded text-xs ml-2 ${
                  form.authType === 'Google'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-green-100 text-green-800'
                }`}
              >
                {form.authType}
              </span>
              <p className="text-xs text-gray-500 mt-1">
                {form.authType === 'Google'
                  ? 'Will use Google OAuth for authentication'
                  : 'Will set PIN on first login'}
              </p>
            </div>
          )}

          {/* Status */}
          <select
            value={form.status}
            onChange={e => handleChange('status', e.target.value)}
            className="w-full border px-3 py-2 rounded"
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-800 text-white rounded"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}