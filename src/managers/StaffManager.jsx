// StaffManager.jsx
// Manages staff member data using Firestore.
// Fully aligned with CustomerManager styling and structure.

import React, { useState } from 'react';
import { useFirestoreCollection, useFirestoreActions } from '../hooks/useFirestore';
import StaffModal from '../modals/StaffModal';
import { TableSkeleton, ErrorDisplay, EmptyState, LoadingSpinner } from '../components/LoadingStates';
import PageHeader from '../components/PageHeader';
import { EditIcon, DeleteIcon } from '../components/Icons';

export default function StaffManager() {
  const { data: staff, loading, error, retry } = useFirestoreCollection('staff');
  const { add, update, delete: deleteStaff } = useFirestoreActions('staff');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [loadingId, setLoadingId] = useState(null);

  const handleAdd = () => { setEditTarget(null); setModalOpen(true); };
  const handleEdit = (item) => { setEditTarget(item); setModalOpen(true); };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this staff member?')) {
      setLoadingId(id);
      await deleteStaff(id);
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
      console.error('Failed to save staff:', err);
      alert('There was an error saving the staff member.');
    } finally {
      setLoadingId(null);
    }
  };

  if (loading) return <TableSkeleton />;
  if (error) return <ErrorDisplay error={error} onRetry={retry} />;
  if (!staff.length) return <EmptyState message="No staff found." onAction={handleAdd} actionLabel="Add Staff" />;

  return (
    <div className="p-4">
      <PageHeader
        title="Staff Manager"
        subtitle="Manage your team and authentication access"
        buttonText="Add Staff"
        onAdd={handleAdd}
        disabled={loadingId === 'save'}
      />
      <div className="bg-white shadow rounded overflow-x-auto">
        <table className="min-w-full text-sm" aria-label="Staff Table">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="text-left px-4 py-2">Name</th>
              <th className="text-left px-4 py-2">Email</th>
              <th className="text-left px-4 py-2">Role</th>
              <th className="text-left px-4 py-2">Auth Type</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-left px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.map(item => (
              <tr key={item.id} className="border-t">
                <td className="px-4 py-2">{item.name}</td>
                <td className="px-4 py-2">{item.email}</td>
                <td className="px-4 py-2">{item.role}</td>
                <td className="px-4 py-2">{item.authType}</td>
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
        <StaffModal
          title={editTarget ? 'Edit Staff' : 'Add Staff'}
          initialData={editTarget}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
        />
      )}
      {loadingId === 'save' && <LoadingSpinner />}
    </div>
  );
}
