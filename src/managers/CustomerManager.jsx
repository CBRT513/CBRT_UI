import React, { useState } from 'react';
import { useFirestoreCollection } from '../hooks/useFirestore';
import { addDoc, updateDoc, deleteDoc, collection, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { TableSkeleton, ErrorDisplay, EmptyState } from '../components/LoadingStates';
import { SelectableTable, BULK_ACTIONS } from '../components/BatchBar';
import CustomerModal from '../modals/CustomerModal';

export default function CustomerManager() {
  const { data: customers, loading, error } = useFirestoreCollection('customers');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [loadingId, setLoadingId] = useState(null);

  const handleAdd = () => {
    setEditingCustomer(null);
    setShowModal(true);
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setShowModal(true);
  };

  const handleSave = async (customerData) => {
  if (editingCustomer) {
    await updateDoc(doc(db, 'customers', editingCustomer.id), {
      ...customerData,
      UpdatedAt: new Date()
    });
  } else {
    await addDoc(collection(db, 'customers'), {
      ...customerData,
      CreatedAt: new Date()
    });
  }
};

  const handleDelete = async (customer) => {
    if (!window.confirm(`Delete customer ${customer.CustomerName}?`)) return;

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

  // Bulk operations handlers
  const handleBulkDelete = async (selectedIds) => {
    const selectedCustomers = customers.filter(c => selectedIds.includes(c.id));
    const customerNames = selectedCustomers.map(c => c.CustomerName).join(', ');
    
    if (!window.confirm(`Delete ${selectedIds.length} customers: ${customerNames}?`)) {
      return;
    }

    for (const id of selectedIds) {
      try {
        await deleteDoc(doc(db, 'customers', id));
      } catch (error) {
        console.error('Error deleting customer:', error);
        throw new Error(`Failed to delete customer with ID: ${id}`);
      }
    }
  };

  const handleBulkExport = async (selectedIds) => {
    const selectedCustomers = customers.filter(c => selectedIds.includes(c.id));
    
    // Create CSV content
    const headers = ['Customer Name', 'Contact Name', 'Phone', 'Address', 'City', 'State', 'Status'];
    const csvContent = [
      headers.join(','),
      ...selectedCustomers.map(customer => [
        customer.CustomerName || '',
        customer.ContactName || '',
        customer.Phone || '',
        customer.Address || '',
        customer.City || '',
        customer.State || '',
        customer.Status || ''
      ].map(field => `"${field}"`).join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `customers_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  // Configure bulk actions for customers
  const customerBulkActions = [
    {
      ...BULK_ACTIONS.customers.find(a => a.key === 'export_csv'),
      handler: handleBulkExport
    },
    {
      ...BULK_ACTIONS.customers.find(a => a.key === 'delete'),
      handler: handleBulkDelete
    }
  ];

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
          <SelectableTable
            items={customers}
            getItemId={(customer) => customer.id}
            bulkActions={customerBulkActions}
            entityType="customers"
            renderRow={(customer, index, isSelected) => (
              <>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {customer.CustomerName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {customer.ContactName || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {customer.Phone || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {customer.Address || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {customer.City || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {customer.State || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${customer.Status === 'Active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                    }`}>
                    {customer.Status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleEdit(customer)}
                    className="text-green-600 hover:text-green-900 mr-3"
                    title="Edit customer"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(customer)}
                    disabled={loadingId === customer.id}
                    className="text-red-600 hover:text-red-900"
                    title="Delete customer"
                  >
                    {loadingId === customer.id ? '⏳' : '🗑️'}
                  </button>
                </td>
              </>
            )}
          >
            {/* Table headers */}
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
          </SelectableTable>
        )}
      </div>

      <CustomerModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingCustomer(null);
        }}
        onSave={handleSave}
        initialData={editingCustomer}
      />
    </div>
  );
}