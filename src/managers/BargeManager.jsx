import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import { EditIcon, DeleteIcon } from '../components/Icons';
import { TableSkeleton, ErrorDisplay, EmptyState, LoadingSpinner } from '../components/LoadingStates';

export default function BargeManager() {
  const [rows, setRows] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    return onSnapshot(
      collection(db, 'suppliers'), 
      (snap) => {
        try {
          setSuppliers(snap.docs.map(d => ({ id: d.id, name: d.data().SupplierName })));
        } catch (err) {
          console.error('Error processing suppliers:', err);
          setError(err);
        }
      },
      (error) => {
        console.error('Error fetching suppliers:', error);
        setError(error);
      }
    );
  }, []);

  return { barges, loading, error };
};

// Direct Firebase fetch for suppliers
const useSuppliersDirect = () => {
  const [suppliers, setSuppliers] = useState([]);
  
  useEffect(() => {
    if (!suppliers.length) return;
    return onSnapshot(
      collection(db, 'barges'), 
      (snap) => {
        try {
          setRows(snap.docs.map(d => {
            const data = { id: d.id, ...d.data() };
            return {
              ...data,
              SupplierName: suppliers.find(s => s.id === data.SupplierId)?.name || 'Unknown',
              ArrivalDateFormatted: data.ArrivalDate
                ? (data.ArrivalDate.seconds
                    ? new Date(data.ArrivalDate.seconds * 1000)
                    : new Date(data.ArrivalDate)
                  ).toLocaleDateString()
                : '—'
            };
          }));
          setLoading(false);
          setError(null);
        } catch (err) {
          console.error('Error processing barges:', err);
          setError(err);
          setLoading(false);
        }
      },
      (error) => {
        console.error('Error fetching barges:', error);
        setError(error);
        setLoading(false);
      }
    );
  }, [suppliers]);

  const closeModal = () => {
    setShowModal(false);
    resetForm();
    setIsSubmitting(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this barge?')) return;
    
    setActionLoading(id);
    try {
      await deleteDoc(doc(db, 'barges', id));
    } catch (error) {
      console.error('Error deleting barge:', error);
      alert('Failed to delete barge. Please try again.');
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
          title="Barges Management" 
          subtitle="Manage incoming barges" 
        />
        <ErrorDisplay 
          error={error} 
          onRetry={handleRetry}
          title="Failed to load barges data"
        />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Barges Management"
        subtitle="Manage incoming barges"
        buttonText="Add New Barge"
        onAdd={() => { setCurrent(null); setOpen(true); }}
        disabled={loading}
      />
      {loading ? (
        <TableSkeleton rows={6} columns={4} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No barges found"
          description="Get started by adding a new barge."
          actionText="Add New Barge"
          onAction={() => { setCurrent(null); setOpen(true); }}
        />
      ) : (
        <div className="bg-white shadow rounded overflow-x-auto">
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-100 text-xs uppercase text-gray-600">
              <tr>
                {fields.map(f => <th key={f.name} className="px-6 py-3 text-left">{f.label}</th>)}
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  {fields.map(f => <td key={f.name} className="px-6 py-4">{r[f.name] ?? '—'}</td>)}
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
          title={`${current ? 'Edit' : 'Add'} Barge`}
          fields={[
            { name: 'BargeName', label: 'Barge Name', type: 'text' },
            { name: 'SupplierId', label: 'Supplier', type: 'select', options: suppliers },
            { name: 'ArrivalDate', label: 'Arrival Date', type: 'date' },
            { name: 'Status', label: 'Status', type: 'select', options: ['Expected','Arrived','Processing','Complete'] },
            { name: 'Notes', label: 'Notes', type: 'text' },
          ]}
          initialData={current}
          onClose={() => setOpen(false)}
          onSave={async data => {
            try {
              if (data.ArrivalDate) data.ArrivalDate = new Date(data.ArrivalDate);
              if (current?.id) {
                await updateDoc(doc(db,'barges',current.id),data);
              } else {
                await addDoc(collection(db,'barges'),data);
              }
              setOpen(false);
            } catch (error) {
              console.error('Error saving barge:', error);
              alert('Failed to save barge. Please try again.');
            }
          }}
        />
      )}

      {/* Modal for Add/Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingBarge ? 'Edit Barge' : 'Add New Barge'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Barge Name
                </label>
                <input
                  type="text"
                  value={formData.bargeName}
                  onChange={(e) => setFormData({ ...formData, bargeName: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., RF707X"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supplier
                </label>
                <select
                  value={formData.supplierId}
                  onChange={(e) => handleSupplierChange(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.supplierName || supplier.SupplierName || 'Unknown Supplier'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingBarge ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BargeManager;
