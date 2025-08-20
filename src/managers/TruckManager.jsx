// TruckManager.jsx - Fixed with Truck Number + Trailer Number fields
// Path: /Users/cerion/CBRT_UI/src/managers/TruckManager.jsx
// Changes: Added Trailer Number field, removed Capacity, uses Carrier dropdown

import React, { useState } from 'react';
<<<<<<< Updated upstream
import { useFirestoreCollection } from '../hooks/useFirestore';
import { addDoc, updateDoc, deleteDoc, collection, doc } from 'firebase/firestore';
||||||| Stash base
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import { EditIcon, DeleteIcon } from '../components/Icons';
=======
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import { EditIcon, DeleteIcon } from '../components/Icons';
import { TableSkeleton, ErrorDisplay, EmptyState, LoadingSpinner } from '../components/LoadingStates';
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
  const resetForm = () => {
    setFormData({
      truckNumber: '',
      trailerNumber: '',
      carrierId: '',
      status: 'Active'
    });
    setEditingTruck(null);
  };
||||||| Stash base
export default function TruckManager() {
  const { trucks, carriers, isLoading } = useTrucksWithCarriers();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);
=======
export default function TruckManager() {
  const { trucks, carriers, isLoading, error } = useTrucksWithCarriers();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
>>>>>>> Stashed changes

  const closeModal = () => {
    setShowModal(false);
    resetForm();
    setIsSubmitting(false);
  };

  const handleAddTruck = () => {
    resetForm();
    setShowModal(true);
  };

<<<<<<< Updated upstream
  const handleEditTruck = (truck) => {
    setFormData({
      truckNumber: truck.TruckNumber || truck.truckNumber || '',
      trailerNumber: truck.TrailerNumber || truck.trailerNumber || '',
      carrierId: truck.CarrierId || truck.carrierId || '',
      status: truck.Status || truck.status || 'Active'
    });
    setEditingTruck(truck);
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    if (!formData.truckNumber.trim()) {
      alert('Truck Number is required');
      return false;
    }
    if (!formData.carrierId) {
      alert('Carrier is required');
      return false;
    }
    return true;
  };

  const checkForDuplicate = () => {
    if (!trucks) return false;
    
    const duplicate = trucks.find(truck => 
      (truck.TruckNumber || truck.truckNumber || '').toLowerCase() === formData.truckNumber.toLowerCase() &&
      (!editingTruck || truck.id !== editingTruck.id)
    );
    
    if (duplicate) {
      alert('A truck with this number already exists');
      return true;
    }
    return false;
  };

  const getCarrierName = (carrierId) => {
    if (!carriers) return 'Unknown';
    const carrier = carriers.find(c => c.id === carrierId);
    return carrier ? (carrier.CarrierName || carrier.carrierName) : 'Unknown';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    if (!validateForm()) return;
    if (checkForDuplicate()) return;

    setIsSubmitting(true);

    try {
      const selectedCarrier = carriers?.find(c => c.id === formData.carrierId);
      const truckData = {
        TruckNumber: formData.truckNumber,
        TrailerNumber: formData.trailerNumber,
        CarrierId: formData.carrierId,
        CarrierName: selectedCarrier ? (selectedCarrier.CarrierName || selectedCarrier.carrierName) : '',
        Status: formData.status
      };

      if (editingTruck) {
        await updateDoc(doc(db, 'trucks', editingTruck.id), {
          ...truckData,
          UpdatedAt: new Date()
        });
        console.log('Truck updated successfully');
      } else {
        await addDoc(collection(db, 'trucks'), {
          ...truckData,
          CreatedAt: new Date()
        });
        console.log('Truck added successfully');
      }
      closeModal();
    } catch (error) {
      console.error('Error saving truck:', error);
      alert('Error saving truck. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTruck = async (truckId) => {
    if (window.confirm('Are you sure you want to delete this truck?')) {
      try {
        await deleteDoc(doc(db, 'trucks', truckId));
        console.log('Truck deleted successfully');
      } catch (error) {
        console.error('Error deleting truck:', error);
        alert('Error deleting truck. Please try again.');
      }
    }
  };

  if (trucksLoading || carriersLoading) return <div className="flex justify-center p-8">Loading trucks...</div>;
  if (trucksError || carriersError) return <div className="text-red-600 p-8">Error loading data: {(trucksError || carriersError).message}</div>;
||||||| Stash base
  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading trucks...</div>;
  }
=======
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
>>>>>>> Stashed changes

  return (
<<<<<<< Updated upstream
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Trucks</h1>
        <button
          onClick={handleAddTruck}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          + Add Truck
        </button>
      </div>
||||||| Stash base
    <>
      <PageHeader
        title="Trucks Management"
        subtitle="Manage trucks and assign carriers"
        buttonText="Add New Truck"
        onAdd={() => {
          setCurrent(null);
          setOpen(true);
        }}
      />
=======
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
>>>>>>> Stashed changes

<<<<<<< Updated upstream
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Truck Number
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Trailer Number
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Carrier
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {trucks?.map((truck) => (
              <tr key={truck.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {truck.TruckNumber || truck.truckNumber}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {truck.TrailerNumber || truck.trailerNumber}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {truck.CarrierName || getCarrierName(truck.CarrierId || truck.carrierId)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    (truck.Status || truck.status) === 'Active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {truck.Status || truck.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleEditTruck(truck)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDeleteTruck(truck.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    🗑️
                  </button>
                </td>
||||||| Stash base
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
                      className="text-green-800 hover:text-green-600"
                      title="Edit"
                    >
                      <EditIcon />
                    </button>
                    <button
                      onClick={async () => {
                        if (window.confirm('Are you sure you want to delete this truck?')) {
                          await deleteDoc(doc(db, 'trucks', r.id));
                        }
                      }}
                      className="text-red-600 hover:text-red-800"
                      title="Delete"
                    >
                      <DeleteIcon />
                    </button>
                  </div>
                </td>
=======
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
>>>>>>> Stashed changes
              </tr>
<<<<<<< Updated upstream
            ))}
          </tbody>
        </table>

        {(!trucks || trucks.length === 0) && (
          <div className="text-center py-8 text-gray-500">
            No trucks found. Click "Add Truck" to get started.
          </div>
        )}
      </div>
||||||| Stash base
            ))}
          </tbody>
        </table>
      </div>
=======
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
>>>>>>> Stashed changes

<<<<<<< Updated upstream
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-screen overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingTruck ? 'Edit Truck' : 'Add New Truck'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Truck Number *
                </label>
                <input
                  type="text"
                  name="truckNumber"
                  value={formData.truckNumber}
                  onChange={handleInputChange}
                  placeholder="e.g., 397A"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Trailer Number
                </label>
                <input
                  type="text"
                  name="trailerNumber"
                  value={formData.trailerNumber}
                  onChange={handleInputChange}
                  placeholder="e.g., T123"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Carrier *
                </label>
                <select
                  name="carrierId"
                  value={formData.carrierId}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a carrier...</option>
                  {carriers?.map((carrier) => (
                    <option key={carrier.id} value={carrier.id}>
                      {carrier.CarrierName || carrier.carrierName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status *
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
||||||| Stash base
      {open && (
        <Modal
          title={`${current ? 'Edit' : 'Add'} Truck`}
          fields={fields}
          initialData={current}
          onClose={() => setOpen(false)}
          onSave={async data => {
            if (current?.id) {
              await updateDoc(doc(db, 'trucks', current.id), data);
            } else {
              await addDoc(collection(db, 'trucks'), data);
            }
            setOpen(false);
          }}
        />
=======
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
>>>>>>> Stashed changes
      )}
    </div>
  );
};

export default TruckManager;