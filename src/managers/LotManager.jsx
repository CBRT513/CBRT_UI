// src/managers/LotManager.jsx - COMPLETE FIXED VERSION
import React, { useState, useEffect } from 'react';
import {
  collection,
  doc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import PageHeader from '../components/PageHeader';
import { EditIcon, DeleteIcon } from '../components/Icons';
import { TableSkeleton, ErrorDisplay, EmptyState, LoadingSpinner } from '../components/LoadingStates';

import React, { useState, useEffect } from 'react';
import { addDoc, updateDoc, deleteDoc, collection, doc, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

// Direct Firebase fetch for lots
const useLotsDirect = () => {
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    const unsubLots = onSnapshot(
      collection(db, 'lots'), 
      (snap) => {
        try {
          setLots(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          setLoading(false);
          setError(null);
        } catch (err) {
          console.error('Error processing lots:', err);
          setError(err);
          setLoading(false);
        }
      },
      (error) => {
        console.error('Error fetching lots:', error);
        setError(error);
        setLoading(false);
      }
    );
    
    // Only subscribe to collections that lots actually reference
    const unsubCustomers = onSnapshot(
      collection(db, 'customers'), 
      (snap) => {
        try {
          setRefs(r => ({ ...r, customers: snap.docs.map(d => ({ id: d.id, ...d.data() })) }));
        } catch (err) {
          console.error('Error processing customers:', err);
          setError(err);
        }
      },
      (error) => {
        console.error('Error fetching customers:', error);
        setError(error);
      }
    );
    
    const unsubBarges = onSnapshot(
      collection(db, 'barges'), 
      (snap) => {
        try {
          setRefs(r => ({ ...r, barges: snap.docs.map(d => ({ id: d.id, ...d.data() })) }));
        } catch (err) {
          console.error('Error processing barges:', err);
          setError(err);
        }
      },
      (error) => {
        console.error('Error fetching barges:', error);
        setError(error);
      }
    );
    
    return () => {
      unsubLots();
      unsubCustomers();
      unsubBarges();
    };

    fetchLots();
  }, []);

  return { lots, loading, error };
};

// Direct Firebase fetch for customers
const useCustomersDirect = () => {
  const [customers, setCustomers] = useState([]);
  
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'customers'));
        const customersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCustomers(customersData);
      } catch (err) {
        console.error('❌ Error fetching customers:', err);
      }
    };

    fetchCustomers();
  }, []);

  return customers;
};

const LotManager = () => {
  const { lots, loading, error } = useLotsDirect();
  const customers = useCustomersDirect();
  
  const [showModal, setShowModal] = useState(false);
  const [editingLot, setEditingLot] = useState(null);
  const [formData, setFormData] = useState({
    lotNumber: '',
    customerId: '',
    customerName: '',
    itemCode: '',
    itemName: '',
    standardWeight: '',
    quantity: '',
    status: 'Active'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setFormData({
      lotNumber: '',
      customerId: '',
      customerName: '',
      itemCode: '',
      itemName: '',
      standardWeight: '',
      quantity: '',
      status: 'Active'
    });
    setEditingLot(null);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
    setIsSubmitting(false);
  };

  const handleAddLot = () => {
    resetForm();
    setShowModal(true);
  };

  const handleEditLot = (lot) => {
    setFormData({
      lotNumber: lot.lotNumber || '',
      customerId: lot.customerId || '',
      customerName: lot.customerName || '',
      itemCode: lot.itemCode || '',
      itemName: lot.itemName || '',
      standardWeight: lot.standardWeight?.toString() || '',
      quantity: lot.quantity?.toString() || '',
      status: lot.status || 'Active'
    });
    setEditingLot(lot);
    setShowModal(true);
  };

  const handleDeleteLot = async (lotId) => {
    if (window.confirm('Are you sure you want to delete this lot?')) {
      try {
        await deleteDoc(doc(db, 'lots', lotId));
        console.log('✅ Lot deleted successfully');
        // Refresh data
        window.location.reload();
      } catch (error) {
        console.error('❌ Error deleting lot:', error);
        alert('Error deleting lot: ' + error.message);
      }
    }
  };

  const handleCustomerChange = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    setFormData({
      ...formData,
      customerId: customerId,
      customerName: customer ? (customer.customerName || customer.CustomerName || '') : ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const lotData = {
        lotNumber: formData.lotNumber,
        customerId: formData.customerId,
        customerName: formData.customerName,
        itemCode: formData.itemCode,
        itemName: formData.itemName,
        standardWeight: parseFloat(formData.standardWeight) || 0,
        quantity: parseInt(formData.quantity) || 0,
        status: formData.status,
        updatedAt: new Date()
      };

      if (editingLot) {
        await updateDoc(doc(db, 'lots', editingLot.id), lotData);
        console.log('✅ Lot updated successfully');
      } else {
        await addDoc(collection(db, 'lots'), {
          ...lotData,
          createdAt: new Date()
        });
        console.log('✅ Lot added successfully');
      }

      closeModal();
      // Refresh data
      window.location.reload();
    } catch (error) {
      console.error('❌ Error saving lot:', error);
      alert('Error saving lot: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this lot? This will affect all related barcodes.')) return;
    
    setActionLoading(id);
    try {
      await deleteDoc(doc(db, 'lots', id));
    } catch (error) {
      console.error('Error deleting lot:', error);
      alert('Failed to delete lot. Please try again.');
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
          title="Lots Management" 
          subtitle="Manage lots (Items and Sizes managed via Barcodes)" 
        />
        <ErrorDisplay 
          error={error} 
          onRetry={handleRetry}
          title="Failed to load lots data"
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Lots</h1>
        <button
          onClick={handleAddLot}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
        >
          <span className="text-lg">+</span> Add Lot
        </button>
      </div>

      {loading ? (
        <TableSkeleton rows={6} columns={6} />
      ) : lots.length === 0 ? (
        <EmptyState
          title="No lots found"
          description="Import data via 'Data Import' to create lots."
          actionText="Go to Data Import"
          onAction={() => window.location.href = '/data-import'}
        />
      ) : (
        <div className="bg-white shadow rounded overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left px-4 py-2">Lot Number</th>
                <th className="text-left px-4 py-2">Barge</th>
                <th className="text-left px-4 py-2">Customer</th>
                <th className="text-left px-4 py-2">Item</th>
                <th className="text-left px-4 py-2">Size</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="text-right px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {lots.sort((a, b) => a.LotNumber.localeCompare(b.LotNumber)).map(l => (
                <tr key={l.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">{l.LotNumber}</td>
                  <td className="px-4 py-2">{getName(l.BargeId, 'barges', 'BargeName')}</td>
                  <td className="px-4 py-2">{getName(l.CustomerId, 'customers', 'CustomerName')}</td>
                  <td className="px-4 py-2 text-gray-500 italic">
                    — 
                    <span className="text-xs block">Via Barcodes</span>
                  </td>
                  <td className="px-4 py-2 text-gray-500 italic">
                    — 
                    <span className="text-xs block">Via Barcodes</span>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                      l.Status === 'Active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {l.Status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        className="text-green-700 hover:text-green-500 disabled:text-gray-400 disabled:cursor-not-allowed"
                        title="Edit functionality not available - lots are managed via data import"
                        disabled
                      >
                        <EditIcon />
                      </button>
                      <button 
                        onClick={() => handleDelete(l.id)}
                        disabled={actionLoading === l.id}
                        className="text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center"
                        title="Delete lot"
                      >
                        {actionLoading === l.id ? (
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

      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-blue-800 mb-2">ℹ️ About Lots Schema</h3>
        <p className="text-sm text-blue-700">
          Lots now use a <strong>clean schema</strong> containing only: LotNumber, BargeId, CustomerId, and Status.
          Item and Size relationships are managed through the <strong>Barcodes collection</strong>, 
          which provides the complete linking between Lots, Items, and Sizes.
        </p>
        <p className="text-sm text-blue-700 mt-2">
          Use <strong>Data Import</strong> or <strong>Barcode Upload</strong> to create lots with proper relationships.
        </p>
      </div>
    </div>
  );
};

export default LotManager;
