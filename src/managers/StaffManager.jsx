// File: /Users/cerion/CBRT_UI/src/managers/StaffManager.jsx

import React, { useState } from 'react';
import { useFirestoreCollection } from '../hooks/useFirestore';
import { addDoc, updateDoc, deleteDoc, collection, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { TableSkeleton, ErrorDisplay, EmptyState } from '../components/LoadingStates';
import StaffModal from '../modals/StaffModal';
import { EditIcon, DeleteIcon } from '../components/Icons';
import { TableSkeleton, ErrorDisplay, EmptyState, LoadingSpinner } from '../components/LoadingStates';

export default function StaffManager() {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'staff'),
      (snapshot) => {
        try {
          setRows(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
          setLoading(false);
          setError(null);
        } catch (err) {
          console.error('Error processing staff:', err);
          setError(err);
          setLoading(false);
        }
      },
      (error) => {
        console.error('Error fetching staff:', error);
        setError(error);
        setLoading(false);
      }
      setShowModal(false);
      setEditingStaff(null);
    } catch (error) {
      console.error('Error saving staff:', error);
      throw error;
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this staff member?')) return;
    
    setLoadingId(id);
    try {
      await deleteDoc(doc(db, 'staff', id));
    } catch (error) {
      console.error('Error deleting staff:', error);
      alert('Failed to delete staff member');
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this staff member?')) return;
    
    setActionLoading(id);
    try {
      await deleteDoc(doc(db, 'staff', id));
    } catch (error) {
      console.error('Error deleting staff:', error);
      alert('Failed to delete staff member. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
  };

  // Error state
  if (error && !loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <PageHeader 
          title="Staff Management" 
          subtitle="Manage staff members" 
        />
        <ErrorDisplay 
          error={error} 
          onRetry={handleRetry}
          title="Failed to load staff data"
        />
      </div>
    );
  }

  return (
    <>
      <PageHeader 
        title="Staff Management" 
        subtitle="Manage staff members" 
        buttonText="Add New Staff" 
        onAdd={() => {
          setCurrent(null);
          setOpen(true);
        }}
        disabled={loading}
      />

      {loading ? (
        <TableSkeleton rows={6} columns={5} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No staff members found"
          description="Get started by adding a new staff member."
          actionText="Add New Staff"
          onAction={() => { setCurrent(null); setOpen(true); }}
        />
      ) : (
        <div className="bg-white shadow rounded overflow-x-auto">
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-100 text-xs uppercase text-gray-600">
              <tr>
                {fields.map(f => (
                  <th key={f.name} className="px-6 py-3 text-left">{f.label}</th>
                ))}
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{r.name ?? '—'}</td>
                  <td className="px-6 py-4">{r.email ?? '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full font-medium ${
                      r.role === 'Admin' ? 'bg-red-100 text-red-800' :
                      r.role === 'Office' ? 'bg-blue-100 text-blue-800' :
                      r.role === 'Warehouse' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {r.role ?? '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                      r.authType === 'Google' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {r.authType ?? '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                      r.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {r.status ?? '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => { 
                          setCurrent(r); 
                          setOpen(true); 
                        }}
                        disabled={actionLoading === r.id}
                        className="text-green-800 hover:text-green-600 disabled:text-gray-400 disabled:cursor-not-allowed"
                        title="Edit"
                      >
                        <EditIcon />
                      </button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        disabled={actionLoading === r.id}
                        className="text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center"
                        title="Delete"
                      >
                        {actionLoading === r.id ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <DeleteIcon />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <StaffModal 
          title={`${current ? 'Edit' : 'Add'} Staff`} 
          initialData={current} 
          onClose={() => setOpen(false)} 
          onSave={async data => {
            try {
              if (current?.id) {
                await updateDoc(doc(db, 'staff', current.id), data);
              } else {
                await addDoc(collection(db, 'staff'), data);
              }
              setOpen(false);
            } catch (error) {
              console.error('Error saving staff:', error);
              alert('Failed to save staff member. Please try again.');
            }
          }}
          onSave={handleSave}
          initialData={editingStaff}
        />
      )}
    </div>
  );
}
