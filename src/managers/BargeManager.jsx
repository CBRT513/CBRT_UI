// BargeManager.jsx
// Manages barge records in Firestore, styled like CustomerManager.

import React, { useState } from 'react';
import { useFirestoreCollection, useFirestoreActions } from '../hooks/useFirestore';
import BargeModal from '../modals/BargeModal';
import { TableSkeleton, ErrorDisplay, EmptyState, LoadingSpinner } from '../components/LoadingStates';
import PageHeader from '../components/PageHeader';
import { EditIcon, DeleteIcon } from '../components/Icons';

export default function BargeManager() {
  const { data: barges, loading, error, retry } = useFirestoreCollection('barges');
  const { add, update, delete: deleteBarge } = useFirestoreActions('barges');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [loadingId, setLoadingId] = useState(null);

  const handleAdd = () => { setEditTarget(null); setModalOpen(true); };
  const handleEdit = (item) => { setEditTarget(item); setModalOpen(true); };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this barge?')) {
      setLoadingId(id);
      await deleteBarge(id);
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
      console.error('Failed to save barge:', err);
      alert('There was an error saving the barge.');
    } finally {
      setLoadingId(null);
    }
  };

  if (loading) return <TableSkeleton />;
  if (error) return <ErrorDisplay error={error} onRetry={retry} />;
  if (!barges.length) return <EmptyState message="No barges found." onAction={handleAdd} actionLabel="Add Barge" />;

  return (
    <div className="p-4">
      <PageHeader
        title="Barge Manager"
        subtitle="Manage the barges available for shipment"
        buttonText="Add Barge"
        onAdd={handleAdd}
        disabled={loadingId === 'save'}
      />
      <div className="bg-white shadow rounded overflow-x-auto">
        <table className="min-w-full text-sm" aria-label="Barges Table">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="text-left px-4 py-2">Name</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-left px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {barges.map(item => (
              <tr key={item.id} className="border-t">
                <td className="px-4 py-2">{item.name}</td>
                <td className="px-4 py-2">{item.status}</td>
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
        <BargeModal
          title={editTarget ? 'Edit Barge' : 'Add Barge'}
          initialData={editTarget}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
        />
      )}
      {loadingId === 'save' && <LoadingSpinner />}
    </div>
  );
}
