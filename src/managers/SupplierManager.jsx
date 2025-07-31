// SupplierManager.jsx - Hook-based refactor with default export
import React, { useState } from 'react';
import { useFirestoreCollection, useFirestoreActions } from '../hooks/useFirestore';
import SupplierModal from '../modals/SupplierModal';
import PageHeader from '../components/PageHeader';
import { TableSkeleton, ErrorDisplay, EmptyState, LoadingSpinner } from '../components/LoadingStates';
import { EditIcon, DeleteIcon } from '../components/Icons';

export default function SupplierManager() {
  const { data: suppliers, loading, error, retry } = useFirestoreCollection('suppliers');
  const { add, update, delete: deleteSupplier } = useFirestoreActions('suppliers');

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [loadingId, setLoadingId] = useState(null);

  const handleAdd = () => { setEditTarget(null); setModalOpen(true); };
  const handleEdit = (item) => { setEditTarget(item); setModalOpen(true); };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this supplier?')) return;
    setLoadingId(id);
    await deleteSupplier(id);
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
      alert('There was an error saving the supplier.');
    } finally {
      setLoadingId(null);
    }
  };

  if (loading) return <TableSkeleton />;
  if (error) return <ErrorDisplay error={error} onRetry={retry} />;
  if (!suppliers.length) return <EmptyState message="No suppliers found." onAction={handleAdd} actionLabel="Add Supplier" />;

  return (
    <div className="p-4">
      <PageHeader
        title="Supplier Manager"
        subtitle="Manage your supplier records"
        buttonText="Add Supplier"
        onAdd={handleAdd}
        disabled={loadingId === 'save'}
      />
      <div className="bg-white shadow rounded overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="text-left px-4 py-2">Supplier Name</th>
              <th className="text-left px-4 py-2">BOL Prefix</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-left px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map(s => (
              <tr key={s.id} className="border-t">
                <td className="px-4 py-2">{s.SupplierName}</td>
                <td className="px-4 py-2">{s.BOLPrefix}</td>
                <td className="px-4 py-2">{s.Status}</td>
                <td className="px-4 py-2 space-x-2">
                  <EditIcon onClick={() => handleEdit(s)} disabled={loadingId === s.id || loadingId === 'save'} />
                  <DeleteIcon onClick={() => handleDelete(s.id)} disabled={loadingId === s.id || loadingId === 'save'} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <SupplierModal
          title={editTarget ? 'Edit Supplier' : 'Add Supplier'}
          initialData={editTarget}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
        />
      )}
      {loadingId === 'save' && <LoadingSpinner />}
    </div>
  );
}
