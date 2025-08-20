import React, { useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import Modal from './Modal';
import PageHeader from './PageHeader';
import { EditIcon, DeleteIcon } from './Icons';
import { TableSkeleton, ErrorDisplay, EmptyState, LoadingSpinner } from './LoadingStates';

export default function Manager({ collectionName, fields }) {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, collectionName),
      (snapshot) => {
        try {
          setRows(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
          setLoading(false);
          setError(null);
        } catch (err) {
          console.error(`Error processing ${collectionName}:`, err);
          setError(err);
          setLoading(false);
        }
      },
      (error) => {
        console.error(`Error fetching ${collectionName}:`, error);
        setError(error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [collectionName]);

  const getValue = (obj, path) =>
    path.split('.').reduce((o, k) => (o && k in o ? o[k] : undefined), obj);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    
    setActionLoading(id);
    try {
      await deleteDoc(doc(db, collectionName, id));
    } catch (error) {
      console.error(`Error deleting ${collectionName.slice(0, -1)}:`, error);
      alert(`Failed to delete ${collectionName.slice(0, -1)}. Please try again.`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
  };

  const entityName = collectionName.slice(0, -1);
  const entityTitle = entityName[0].toUpperCase() + entityName.slice(1);

  // Error state
  if (error && !loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <PageHeader 
          title={`${collectionName[0].toUpperCase() + collectionName.slice(1)} Management`}
          subtitle={`Manage ${collectionName}`}
        />
        <ErrorDisplay 
          error={error} 
          onRetry={handleRetry}
          title={`Failed to load ${collectionName}`}
        />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={`${collectionName[0].toUpperCase() + collectionName.slice(1)} Management`}
        subtitle={`Manage ${collectionName}`}
        buttonText={`Add New ${entityTitle}`}
        onAdd={() => {
          setCurrent(null);
          setOpen(true);
        }}
        disabled={loading}
      />

      {loading ? (
        <TableSkeleton rows={6} columns={fields.length} />
      ) : rows.length === 0 ? (
        <EmptyState
          title={`No ${collectionName} found`}
          description={`Get started by adding a new ${entityName}.`}
          actionText={`Add New ${entityTitle}`}
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
                  {fields.map(f => (
                    <td key={f.name} className="px-6 py-4">{getValue(r, f.name) ?? '—'}</td>
                  ))}
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => { setCurrent(r); setOpen(true); }}
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
        <Modal
          title={`${current ? 'Edit' : 'Add'} ${entityTitle}`}
          fields={fields}
          initialData={current}
          onClose={() => setOpen(false)}
          onSave={async data => {
            try {
              if (current?.id) {
                await updateDoc(doc(db, collectionName, current.id), data);
              } else {
                await addDoc(collection(db, collectionName), data);
              }
              setOpen(false);
            } catch (error) {
              console.error(`Error saving ${entityName}:`, error);
              alert(`Failed to save ${entityName}. Please try again.`);
            }
          }}
        />
      )}
    </>
  );
}