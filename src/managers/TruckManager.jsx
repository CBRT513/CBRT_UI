// TruckManager.jsx - Fixed with Truck Number + Trailer Number fields
// Path: /Users/cerion/CBRT_UI/src/managers/TruckManager.jsx
// Changes: Added Trailer Number field, removed Capacity, uses Carrier dropdown

import React, { useState } from 'react';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import { EditIcon, DeleteIcon } from '../components/Icons';
import { TableSkeleton, ErrorDisplay, EmptyState, LoadingSpinner } from '../components/LoadingStates';
import { db } from '../firebase/config';

const TruckManager = () => {
  const { data: trucks, loading: trucksLoading, error: trucksError } = useFirestoreCollection('trucks');
  const { data: carriers, loading: carriersLoading, error: carriersError } = useFirestoreCollection('carriers');
  const [showModal, setShowModal] = useState(false);
  const [editingTruck, setEditingTruck] = useState(null);
  const [formData, setFormData] = useState({
    truckNumber: '',
    trailerNumber: '',
    carrierId: '',
    status: 'Active'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

export default function TruckManager() {
  const { trucks, carriers, isLoading, error } = useTrucksWithCarriers();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const closeModal = () => {
    setShowModal(false);
    resetForm();
    setIsSubmitting(false);
  };

  const handleAddTruck = () => {
    resetForm();
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this truck?')) return;
    
    setActionLoading(id);
    try {
      await deleteDoc(doc(db, 'trucks', id));
    } catch (error) {
      console.error('Error deleting truck:', error);
      alert('Failed to delete truck. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  // Error state
  if (error && !isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <PageHeader title="Trucks Management" subtitle="Manage trucks and assign carriers" />
        <ErrorDisplay 
          error={error} 
          title="Failed to load truck data"
        />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Trucks Management"
        subtitle="Manage trucks and assign carriers"
        buttonText="Add New Truck"
        onAdd={() => {
          setCurrent(null);
          setOpen(true);
        }}
        disabled={isLoading}
      />

      {isLoading ? (
        <TableSkeleton rows={6} columns={4} />
      ) : trucks.length === 0 ? (
        <EmptyState
          title="No trucks found"
          description="Get started by adding a new truck."
          actionText="Add New Truck"
          onAction={() => { setCurrent(null); setOpen(true); }}
        />
      ) : (
        <div className="bg-white shadow rounded overflow-x-auto">
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-100 text-xs uppercase text-gray-600">
              <tr>
                {displayFields.map(f => (
                  <th key={f.name} className="px-6 py-3 text-left">{f.label}</th>
                ))}
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {trucks.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  {displayFields.map(f => (
                    <td key={f.name} className="px-6 py-4">{r[f.name] ?? '—'}</td>
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
          title={`${current ? 'Edit' : 'Add'} Truck`}
          fields={fields}
          initialData={current}
          onClose={() => setOpen(false)}
          onSave={async data => {
            try {
              if (current?.id) {
                await updateDoc(doc(db, 'trucks', current.id), data);
              } else {
                await addDoc(collection(db, 'trucks'), data);
              }
              setOpen(false);
            } catch (error) {
              console.error('Error saving truck:', error);
              alert('Failed to save truck. Please try again.');
            }
          }}
        />
      )}
    </div>
  );
};

export default TruckManager;
