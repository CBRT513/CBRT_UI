// CarrierManager.jsx - Hook-based refactor with export fix
import React, { useState } from 'react';
import { useFirestoreCollection, useFirestoreActions } from '../hooks/useFirestore';
import CarrierModal from '../modals/CarrierModal';
import PageHeader from '../components/PageHeader';
import { TableSkeleton, ErrorDisplay, EmptyState, LoadingSpinner } from '../components/LoadingStates';
import { EditIcon, DeleteIcon } from '../components/Icons';

export default function CarrierManager() {
  const { data: carriers, loading, error, retry } = useFirestoreCollection('carriers');
  const { add, update, delete: deleteCarrier } = useFirestoreActions('carriers');

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [loadingId, setLoadingId] = useState(null);

  const handleAdd = () => { setEditTarget(null); setModalOpen(true); };
  const handleEdit = (item) => { setEditTarget(item); setModalOpen(true); };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this carrier?')) return;
    setLoadingId(id);
    await deleteCarrier(id);
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
      alert('There was an error saving the carrier.');
    } finally {
      setLoadingId(null);
    }
  };

  if (loading) return <TableSkeleton />;
  if (error) return <ErrorDisplay error={error} onRetry={retry} />;
  if (!carriers.length) return <EmptyState message="No carriers found." onAction={handleAdd} actionLabel="Add Carrier" />;

  return (
    <div className="p-4">
      <PageHeader
        title="Carrier Manager"
        subtitle="Manage your carrier records"
        buttonText="Add Carrier"
        onAdd={handleAdd}
        disabled={loadingId === 'save'}
      />
      <div className="bg-white shadow rounded overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="text-left px-4 py-2">Carrier Name</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-left px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {carriers.map(c => (
              <tr key={c.id} className="border-t">
                <td className="px-4 py-2">{c.CarrierName}</td>
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
        <CarrierModal
          title={editTarget ? 'Edit Carrier' : 'Add Carrier'}
          initialData={editTarget}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
        />
      )}
      {loadingId === 'save' && <LoadingSpinner />}
    </div>
  );
}
