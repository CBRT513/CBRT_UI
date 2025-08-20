// LotManager.jsx
// Manages lot entries in Firestore using CustomerManager UI conventions

import React, { useState } from 'react';
import { useFirestoreCollection, useFirestoreActions } from '../hooks/useFirestore';
import LotModal from '../modals/LotModal';
import { TableSkeleton, ErrorDisplay, EmptyState, LoadingSpinner } from '../components/LoadingStates';
import PageHeader from '../components/PageHeader';
import { EditIcon, DeleteIcon } from '../components/Icons';

export default function LotManager() {
  const { data: lots, loading, error, retry } = useFirestoreCollection('lots');
  const { add, update, delete: deleteLot } = useFirestoreActions('lots');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [loadingId, setLoadingId] = useState(null);

  const handleAdd = () => { setEditTarget(null); setModalOpen(true); };
  const handleEdit = (item) => { setEditTarget(item); setModalOpen(true); };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this lot?')) {
      setLoadingId(id);
      await deleteLot(id);
      setLoadingId(null);
    }
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
      console.error('Failed to save lot:', err);
      alert('There was an error saving the lot.');
    } finally {
      setLoadingId(null);
    }
  };

  if (loading) return <TableSkeleton />;
  if (error) return <ErrorDisplay error={error} onRetry={retry} />;
  if (!lots.length) return <EmptyState message="No lots found." onAction={handleAdd} actionLabel="Add Lot" />;

  return (
    <div className="p-4">
      <PageHeader
        title="Lot Manager"
        subtitle="Manage shipping and batch lots"
        buttonText="Add Lot"
        onAdd={handleAdd}
        disabled={loadingId === 'save'}
      />
      <div className="bg-white shadow rounded overflow-x-auto">
        <table className="min-w-full text-sm" aria-label="Lots Table">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="text-left px-4 py-2">Lot Number</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-left px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {lots.map(item => (
              <tr key={item.id} className="border-t">
                <td className="px-4 py-2">{item.LotNumber}</td>
                <td className="px-4 py-2">{item.Status}</td>
                <td className="px-4 py-2 space-x-2">
                  <EditIcon onClick={() => handleEdit(item)} disabled={loadingId === item.id || loadingId === 'save'} />
                  <DeleteIcon onClick={() => handleDelete(item.id)} disabled={loadingId === item.id || loadingId === 'save'} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modalOpen && (
        <LotModal
          title={editTarget ? 'Edit Lot' : 'Add Lot'}
          initialData={editTarget}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
        />
      )}
      {loadingId === 'save' && <LoadingSpinner />}
    </div>
  );
}
