// File: /Users/cerion/CBRT_UI/src/modals/StaffModal.jsx
import React, { useState, useEffect } from "react";

export default function StaffModal({ title, initialData, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    name: initialData?.name ?? "",
    email: initialData?.email ?? "",
    phone: initialData?.phone ?? "",
    receivesNewRelease: initialData?.receivesNewRelease ?? false,
    role: initialData?.role ?? "",
    authType: initialData?.authType ?? "",
    status: initialData?.status ?? "Active",
  }));

  const [error, setError] = useState("");

  useEffect(() => {
    if (form.role) {
      const authType = form.role === "Warehouse" ? "PIN" : "Google";
      setForm(prev => ({
        ...prev,
        authType,
        email: authType === "PIN" ? "" : prev.email
      }));
    }
  }, [form.role]);

  // Format phone number function
  const formatPhoneNumber = (phone) => {
    if (!phone) return "";
    
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, "");
    
    // If it's exactly 10 digits, add +1 prefix
    if (digits.length === 10) {
      return `+1${digits}`;
    }
    
    // If it's 11 digits and starts with 1, add + prefix
    if (digits.length === 11 && digits.startsWith("1")) {
      return `+${digits}`;
    }
    
    // If it already has + and looks valid, keep it
    if (phone.startsWith("+") && digits.length >= 10) {
      return phone;
    }
    
    // Otherwise return as-is (could be international or partial)
    return phone;
  };

  const handleChange = (name, value) => {
    if (name === "phone") {
      // Format phone number on change
      value = formatPhoneNumber(value);
    }
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const needsEmail = form.role && form.role !== "Warehouse";
  const showAuthInfo = form.role !== "";

  const submit = async e => {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }

    if (!form.role) {
      setError("Role is required");
      return;
    }

    if (needsEmail && !form.email.trim()) {
      setError("Email is required for Admin and Office roles");
      return;
    }

    // Validate phone format if provided
    if (form.phone && !form.phone.startsWith("+")) {
      setError("Phone number should be in international format (e.g., +15134567890)");
      return;
    }

    const dataToSave = {
      name: form.name,
      phone: form.phone,
      receivesNewRelease: form.receivesNewRelease,
      role: form.role,
      authType: form.authType,
      status: form.status,
    };

    if (needsEmail) {
      dataToSave.email = form.email;
    }

    if (form.authType === "PIN") {
      dataToSave.pinSetup = false;
      dataToSave.pinHash = null;
    }

    try {
      await onSave(dataToSave);
    } catch (err) {
      console.error(err);
      setError("Failed to save staff member");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">{title}</h2>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              placeholder="Enter full name"
              value={form.name}
              onChange={e => handleChange("name", e.target.value)}
              className="w-full border border-gray-300 px-3 py-2 rounded"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role *
            </label>
            <select
              value={form.role}
              onChange={e => handleChange("role", e.target.value)}
              className="w-full border border-gray-300 px-3 py-2 rounded"
              required
            >
              <option value="">Choose a role...</option>
              <option value="Admin">Admin (Full Access)</option>
              <option value="Office">Office (Management Access)</option>
              <option value="Warehouse">Warehouse (Limited Access)</option>
            </select>
          </div>

          {needsEmail && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                placeholder="Enter email address"
                value={form.email}
                onChange={e => handleChange("email", e.target.value)}
                className="w-full border border-gray-300 px-3 py-2 rounded"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Required for Google OAuth authentication
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              placeholder="Enter 10-digit phone (e.g., 5134567890)"
              value={form.phone}
              onChange={e => handleChange("phone", e.target.value)}
              className="w-full border border-gray-300 px-3 py-2 rounded"
            />
            <p className="text-xs text-gray-500 mt-1">
              10 digits will be automatically formatted as +1XXXXXXXXXX
            </p>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={form.receivesNewRelease}
              onChange={e => handleChange("receivesNewRelease", e.target.checked)}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              id="receivesNewRelease"
            />
            <label htmlFor="receivesNewRelease" className="ml-2 text-sm text-gray-700">
              Receives New Release Notifications
            </label>
          </div>

          {showAuthInfo && (
            <div className="p-3 bg-gray-50 rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Authentication:</label>
                <span className={"px-2 py-1 rounded text-xs font-semibold " + (form.authType === "Google" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800")}>
                  {form.authType}
                </span>
              </div>
              <p className="text-xs text-gray-600">
                {form.authType === "Google"
                  ? "🔐 Will use Google OAuth with email login"
                  : "📱 Will set up PIN code on first login"}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={form.status}
              onChange={e => handleChange("status", e.target.value)}
              className="w-full border border-gray-300 px-3 py-2 rounded"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Save Staff Member
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}