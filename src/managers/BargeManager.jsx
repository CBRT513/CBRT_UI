<<<<<<< Updated upstream
// Fixed BargeManager.jsx - Using direct Firebase fetch
// Path: /Users/cerion/CBRT_UI/src/managers/BargeManager.jsx
||||||| Stash base
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import { EditIcon, DeleteIcon } from '../components/Icons';
=======
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import { EditIcon, DeleteIcon } from '../components/Icons';
import { TableSkeleton, ErrorDisplay, EmptyState, LoadingSpinner } from '../components/LoadingStates';
>>>>>>> Stashed changes

<<<<<<< Updated upstream
import React, { useState, useEffect } from 'react';
import { addDoc, updateDoc, deleteDoc, collection, doc, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

// Direct Firebase fetch for barges
const useBargesDirect = () => {
  const [barges, setBarges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
||||||| Stash base
export default function BargeManager() {
  const [rows, setRows] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);
=======
export default function BargeManager() {
  const [rows, setRows] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
>>>>>>> Stashed changes

  useEffect(() => {
<<<<<<< Updated upstream
    const fetchBarges = async () => {
      try {
        console.log('🔍 Fetching barges directly from Firestore...');
        const snapshot = await getDocs(collection(db, 'barges'));
        const bargesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        console.log('🔍 Barges data:', bargesData);
        console.log('🔍 Barges count:', bargesData.length);
        
        setBarges(bargesData);
        setLoading(false);
      } catch (err) {
        console.error('❌ Error fetching barges:', err);
        setError(err);
        setLoading(false);
      }
    };

    fetchBarges();
||||||| Stash base
    return onSnapshot(collection(db, 'suppliers'), snap => {
      setSuppliers(snap.docs.map(d => ({ id: d.id, name: d.data().SupplierName })));
    });
=======
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
>>>>>>> Stashed changes
  }, []);

  return { barges, loading, error };
};

// Direct Firebase fetch for suppliers
const useSuppliersDirect = () => {
  const [suppliers, setSuppliers] = useState([]);
  
  useEffect(() => {
<<<<<<< Updated upstream
    const fetchSuppliers = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'suppliers'));
        const suppliersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSuppliers(suppliersData);
      } catch (err) {
        console.error('❌ Error fetching suppliers:', err);
      }
    };

    fetchSuppliers();
  }, []);

  return suppliers;
};

const BargeManager = () => {
  const { barges, loading, error } = useBargesDirect();
  const suppliers = useSuppliersDirect();
  
  const [showModal, setShowModal] = useState(false);
  const [editingBarge, setEditingBarge] = useState(null);
  const [formData, setFormData] = useState({
    bargeName: '',
    supplierId: '',
    supplierName: '',
    status: 'Active'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setFormData({
      bargeName: '',
      supplierId: '',
      supplierName: '',
      status: 'Active'
    });
    setEditingBarge(null);
  };
||||||| Stash base
    if (!suppliers.length) return;
    return onSnapshot(collection(db, 'barges'), snap => {
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
    });
  }, [suppliers]);
=======
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
>>>>>>> Stashed changes

  const closeModal = () => {
    setShowModal(false);
    resetForm();
    setIsSubmitting(false);
  };

<<<<<<< Updated upstream
  const handleAddBarge = () => {
    resetForm();
    setShowModal(true);
  };

  const handleEditBarge = (barge) => {
    setFormData({
      bargeName: barge.bargeName || '',
      supplierId: barge.supplierId || '',
      supplierName: barge.supplierName || '',
      status: barge.status || 'Active'
    });
    setEditingBarge(barge);
    setShowModal(true);
  };

  const handleDeleteBarge = async (bargeId) => {
    if (window.confirm('Are you sure you want to delete this barge?')) {
      try {
        await deleteDoc(doc(db, 'barges', bargeId));
        console.log('✅ Barge deleted successfully');
        // Refresh data
        window.location.reload();
      } catch (error) {
        console.error('❌ Error deleting barge:', error);
        alert('Error deleting barge: ' + error.message);
      }
    }
  };

  const handleSupplierChange = (supplierId) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    setFormData({
      ...formData,
      supplierId: supplierId,
      supplierName: supplier ? (supplier.supplierName || supplier.SupplierName || '') : ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const bargeData = {
        bargeName: formData.bargeName,
        supplierId: formData.supplierId,
        supplierName: formData.supplierName,
        status: formData.status,
        updatedAt: new Date()
      };

      if (editingBarge) {
        await updateDoc(doc(db, 'barges', editingBarge.id), bargeData);
        console.log('✅ Barge updated successfully');
      } else {
        await addDoc(collection(db, 'barges'), {
          ...bargeData,
          createdAt: new Date()
        });
        console.log('✅ Barge added successfully');
      }

      closeModal();
      // Refresh data
      window.location.reload();
    } catch (error) {
      console.error('❌ Error saving barge:', error);
      alert('Error saving barge: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading barges...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Error Loading Barges</h3>
          <p className="text-red-700 text-sm mt-1">{error.message}</p>
        </div>
      </div>
    );
||||||| Stash base
  if (!suppliers.length) {
    return <div className="flex justify-center p-8">Loading barges...</div>;
=======
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
>>>>>>> Stashed changes
  }

  return (
<<<<<<< Updated upstream
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Barges</h1>
        <button
          onClick={handleAddBarge}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
        >
          <span className="text-lg">+</span> Add Barge
        </button>
      </div>

      {barges && barges.length > 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Barge Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Supplier
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
              {barges.map((barge) => (
                <tr key={barge.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {barge.bargeName || 'No Name'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {barge.supplierName || 'No Supplier'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      barge.status === 'Active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {barge.status || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleEditBarge(barge)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteBarge(barge.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-600 mb-4">No barges found</p>
          <button
            onClick={handleAddBarge}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            Add First Barge
          </button>
        </div>
||||||| Stash base
    <>
      <PageHeader
        title="Barges Management"
        subtitle="Manage incoming barges"
        buttonText="Add New Barge"
        onAdd={() => { setCurrent(null); setOpen(true); }}
      />
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
                  <button onClick={() => { setCurrent(r); setOpen(true); }} className="text-green-800 hover:text-green-600" title="Edit"><EditIcon /></button>
                  <button onClick={async () => { if (confirm('Delete this barge?')) await deleteDoc(doc(db,'barges',r.id)); }} className="text-red-600 hover:text-red-800" title="Delete"><DeleteIcon /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
            if (data.ArrivalDate) data.ArrivalDate = new Date(data.ArrivalDate);
            if (current?.id) await updateDoc(doc(db,'barges',current.id),data);
            else await addDoc(collection(db,'barges'),data);
            setOpen(false);
          }}
        />
=======
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
>>>>>>> Stashed changes
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