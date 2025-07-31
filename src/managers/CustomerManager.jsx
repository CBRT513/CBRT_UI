// CustomerManager.jsx - Hook-based refactor with default export
import React, { useState } from 'react';
import { useFirestoreCollection, useFirestoreActions } from '../hooks/useFirestore';
import CustomerModal from '../modals/CustomerModal';
import PageHeader from '../components/PageHeader';
import { TableSkeleton, ErrorDisplay, EmptyState, LoadingSpinner } from '../components/LoadingStates';
import { EditIcon, DeleteIcon } from '../components/Icons';

export default function CustomerManager() {
  const { data: customers, loading, error, retry } = useFirestoreCollection('customers');
  const { add, update, delete: deleteCustomer } = useFirestoreActions('customers');

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [loadingId, setLoadingId] = useState(null);

  const handleAdd = () => { setEditTarget(null); setModalOpen(true); };
  const handleEdit = (item) => { setEditTarget(item); setModalOpen(true); };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this customer?')) return;
    setLoadingId(id);
    await deleteCustomer(id);
    setLoadingId(null);
  };

  const handleSave = async (data) => {
    try {
      setLoadingId('save');
      if (editTarget) {
        await update(editTarget.id, data);
      } else {
        await add(data);
      }
      setModalOpen(false);
    } catch (err) {
      console.error('Save failed:', err);
      alert('There was an error saving the customer.');
    } finally {
      setLoadingId(null);
    }
  };

  if (loading) return <TableSkeleton />;
  if (error) return <ErrorDisplay error={error} onRetry={retry} />;
  if (!customers.length) return <EmptyState message="No customers found." onAction={handleAdd} actionLabel="Add Customer" />;

  return (
    <div className="p-4">
      <PageHeader
        title="Customer Manager"
        subtitle="Manage your customer records"
        buttonText="Add Customer"
        onAdd={handleAdd}
        disabled={loadingId === 'save'}
      />
      <div className="bg-white shadow rounded overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="text-left px-4 py-2">Customer Name</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-left px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.map(c => (
              <tr key={c.id} className="border-t">
                <td className="px-4 py-2">{c.CustomerName}</td>
                <td className="px-4 py-2">{c.Status}</td>
                <td className="px-4 py-2 space-x-2">
                  <EditIcon onClick={() => handleEdit(c)} disabled={loadingId === c.id || loadingId === 'save'} />
                  <DeleteIcon onClick={() => handleDelete(c.id)} disabled={loadingId === c.id || loadingId === 'save'} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <CustomerModal
          title={editTarget ? 'Edit Customer' : 'Add Customer'}
          initialData={editTarget}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
        />
      )}
      {loadingId === 'save' && <LoadingSpinner />}
    </div>
  );
}
