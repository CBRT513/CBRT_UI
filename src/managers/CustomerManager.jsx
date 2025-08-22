import React, { useState, useEffect } from 'react';
import { useFirestoreCollection } from '../hooks/useFirestore';
import { addDoc, updateDoc, deleteDoc, collection, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { TableSkeleton, ErrorDisplay, EmptyState } from '../components/LoadingStates';
import Modal from '../components/Modal';

const EMPTY_FORM = {
  customerName: '',
  contactName: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  status: 'active',
  shipToAddress: ''
};

export default function CustomerManager() {
  const { data: customers, loading, error } = useFirestoreCollection('customers');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [loadingId, setLoadingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Update form when editing customer changes
  useEffect(() => {
    if (editingCustomer) {
      setForm({
        customerName: editingCustomer.customerName || editingCustomer.CustomerName || '',
        contactName: editingCustomer.contactName || editingCustomer.ContactName || '',
        phone: editingCustomer.phone || editingCustomer.Phone || '',
        address: editingCustomer.address || editingCustomer.Address || '',
        city: editingCustomer.city || editingCustomer.City || '',
        state: editingCustomer.state || editingCustomer.State || '',
        zip: editingCustomer.zip || editingCustomer.Zip || '',
        status: (editingCustomer.status || editingCustomer.Status || 'active').toLowerCase(),
        shipToAddress: editingCustomer.shipToAddress || editingCustomer.ShipToAddress || ''
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [editingCustomer]);

  const canSave = form.customerName?.trim().length > 0 && !saving;

  const closeModal = () => {
    setShowModal(false);
    setEditingCustomer(null);
    setForm(EMPTY_FORM);
    setSaving(false);
  };

  const handleAdd = () => {
    setEditingCustomer(null);
    setShowModal(true);
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSave) return;
    
    setSaving(true);
    try {
      // Build ship-to address if not provided
      const shipToAddress = form.shipToAddress?.trim() || 
        (form.address?.trim() 
          ? `${form.address}${form.city ? ', ' + form.city : ''}${form.state ? ', ' + form.state : ''}${form.zip ? ' ' + form.zip : ''}`
          : '');

      const payload = {
        customerName: form.customerName.trim(),
        shipToAddress,
        status: (form.status || 'active').toLowerCase(),
        contactName: form.contactName?.trim() || null,
        phone: form.phone?.trim() || null,
        address: form.address?.trim() || null,
        city: form.city?.trim() || null,
        state: form.state?.trim() || null,
        zip: form.zip?.trim() || null,
        updatedAt: serverTimestamp()
      };

      if (editingCustomer) {
        await updateDoc(doc(db, 'customers', editingCustomer.id), payload);
      } else {
        await addDoc(collection(db, 'customers'), {
          ...payload,
          createdAt: serverTimestamp()
        });
      }
      
      closeModal();
    } catch (err) {
      console.error('Save customer failed:', err);
      setSaving(false);
      // Could add toast notification here
    }
  };

  const handleDelete = async (customer) => {
    const name = customer.customerName || customer.CustomerName;
    if (!window.confirm(`Delete customer ${name}?`)) return;

    setLoadingId(customer.id);
    try {
      await deleteDoc(doc(db, 'customers', customer.id));
    } catch (error) {
      console.error('Error deleting customer:', error);
      alert('Failed to delete customer');
    } finally {
      setLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Customers</h1>
          <TableSkeleton rows={5} columns={8} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <ErrorDisplay message="Failed to load customers" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <button
            onClick={handleAdd}
            type="button"
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            + Add Customer
          </button>
        </div>

        {!customers || customers.length === 0 ? (
          <EmptyState
            title="No customers found"
            description="Add your first customer to get started"
            actionLabel="Add Customer"
            onAction={handleAdd}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    City
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    State
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
                {customers.map((customer, index) => {
                  // Handle both camelCase and PascalCase field names
                  const name = customer.customerName || customer.CustomerName;
                  const contact = customer.contactName || customer.ContactName;
                  const phone = customer.phone || customer.Phone;
                  const address = customer.address || customer.Address;
                  const city = customer.city || customer.City;
                  const state = customer.state || customer.State;
                  const status = customer.status || customer.Status || 'active';
                  
                  return (
                    <tr key={customer.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {contact || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {phone || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {address || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {city || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {state || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          status.toLowerCase() === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleEdit(customer)}
                          type="button"
                          className="text-green-600 hover:text-green-900 mr-3"
                          title="Edit customer"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(customer)}
                          type="button"
                          disabled={loadingId === customer.id}
                          className="text-red-600 hover:text-red-900"
                          title="Delete customer"
                        >
                          {loadingId === customer.id ? '⏳' : '🗑️'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal 
        open={showModal} 
        onClose={closeModal} 
        title={editingCustomer ? 'Edit Customer' : 'Add Customer'}
      >
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Customer Name *</label>
            <input
              autoFocus
              value={form.customerName}
              onChange={(e) => setForm({ ...form, customerName: e.target.value })}
              className="w-full rounded border px-3 py-2"
              placeholder="Acme Steel"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Contact Name</label>
            <input
              value={form.contactName}
              onChange={(e) => setForm({ ...form, contactName: e.target.value })}
              className="w-full rounded border px-3 py-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full rounded border px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full rounded border px-3 py-2"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Address</label>
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full rounded border px-3 py-2"
              placeholder="123 Main St"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">City</label>
              <input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full rounded border px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">State</label>
              <input
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                className="w-full rounded border px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Zip Code</label>
              <input
                value={form.zip}
                onChange={(e) => setForm({ ...form, zip: e.target.value })}
                className="w-full rounded border px-3 py-2"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t pt-4">
            <button
              type="button"
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              onClick={closeModal}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              disabled={!canSave}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}