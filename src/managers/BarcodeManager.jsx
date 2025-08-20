// Fixed BarcodeManager.jsx - Updated to handle new fields and correct field names
// Path: /Users/cerion/CBRT_UI/src/managers/BarcodeManager.jsx

import React, { useState, useEffect } from 'react';
import { addDoc, updateDoc, deleteDoc, collection, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import PageHeader from '../components/PageHeader';
import Modal from '../modals/BarcodeModal';
import BarcodeUploadModal from '../modals/BarcodeUploadModal';
import { EditIcon, DeleteIcon } from '../components/Icons';
import { TableSkeleton, ErrorDisplay, EmptyState, LoadingSpinner } from '../components/LoadingStates';

export default function BarcodeManager() {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [current, setCurrent] = useState(null);
  const [refs, setRefs] = useState({ barges: [], lots: [], customers: [], items: [], sizes: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [filters, setFilters] = useState({
    supplier: '',
    customer: '',
    item: '',
    status: 'all'
  });

  // Debug Firebase connection
  useEffect(() => {
    ['barges', 'lots', 'customers', 'items', 'sizes'].forEach(col => {
      onSnapshot(
        collection(db, col), 
        (snap) => {
          try {
            setRefs(r => ({ ...r, [col]: snap.docs.map(d => ({ id: d.id, ...d.data() })) }));
          } catch (err) {
            console.error(`Error processing ${col}:`, err);
            setError(err);
          }
        },
        (error) => {
          console.error(`Error fetching ${col}:`, error);
          setError(error);
        }
      );
    });
    setEditingId(barcode.id);
  };

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'barcodes'), 
      (snap) => {
        try {
          setRows(snap.docs.map(d => {
            const data = d.data();
            const b = refs.barges.find(x => x.id === data.BargeId);
            const l = refs.lots.find(x => x.id === data.LotId);
            const c = refs.customers.find(x => x.id === data.CustomerId);
            const i = refs.items.find(x => x.id === data.ItemId);
            const s = refs.sizes.find(x => x.id === data.SizeId);
            return {
              id: d.id,
              ...data,
              BargeName: b?.BargeName || '—',
              LotNumber: l?.LotNumber || '—',
              CustomerName: c?.CustomerName || '—',
              ItemCode: i?.ItemCode || '—',
              SizeName: s?.SizeName || '—',
              GeneratedBarcode: `${b?.BargeName || ''}${l?.LotNumber || ''}${c?.CustomerName || ''}${i?.ItemCode || ''}${s?.SizeName || ''}`.replace(/\s/g, '')
            };
          }));
          setLoading(false);
          setError(null);
        } catch (err) {
          console.error('Error processing barcodes:', err);
          setError(err);
          setLoading(false);
        }
      },
      (error) => {
        console.error('Error fetching barcodes:', error);
        setError(error);
        setLoading(false);
      }
    );

  // Filter barcodes
  const filteredBarcodes = barcodes?.filter(barcode => {
    const matchesSupplier = !filters.supplier || 
      (barcode.supplierName || barcode.SupplierName || '').toLowerCase().includes(filters.supplier.toLowerCase());
    const matchesCustomer = !filters.customer || 
      (barcode.customerName || barcode.CustomerName || '').toLowerCase().includes(filters.customer.toLowerCase());
    const matchesItem = !filters.item || 
      (barcode.itemName || barcode.ItemName || '').toLowerCase().includes(filters.item.toLowerCase()) ||
      (barcode.itemCode || '').toLowerCase().includes(filters.item.toLowerCase());
    const matchesStatus = filters.status === 'all' || 
      (barcode.status || barcode.Status) === filters.status;
    
    return matchesSupplier && matchesCustomer && matchesItem && matchesStatus;
  }) || [];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600">Loading barcodes...</span>
      </div>
    );
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this barcode?')) return;
    
    setActionLoading(id);
    try {
      await deleteDoc(doc(db, 'barcodes', id));
    } catch (error) {
      console.error('Error deleting barcode:', error);
      alert('Failed to delete barcode. Please try again.');
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
          title="Barcodes Management" 
          subtitle="Manage barcodes" 
        />
        <ErrorDisplay 
          error={error} 
          onRetry={handleRetry}
          title="Failed to load barcodes data"
        />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Barcodes Management"
        subtitle="Manage barcodes"
        buttonText="Add New Barcode"
        onAdd={() => {
          setCurrent(null);
          setOpen(true);
        }}
        disabled={loading}
      />

      <div className="flex justify-end mb-4">
        <button
          onClick={() => setUploadOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:opacity-90"
        >
          Retry
        </button>
      </div>
    );
  }

      {loading ? (
        <TableSkeleton rows={6} columns={7} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No barcodes found"
          description="Get started by adding a new barcode or uploading a CSV file."
          actionText="Add New Barcode"
          onAction={() => { setCurrent(null); setOpen(true); }}
        />
      ) : (
        <div className="bg-white shadow rounded overflow-x-auto">
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-100 text-xs uppercase text-gray-600">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Barcode
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  BOL Prefix
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Barge
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lot
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  {fields.map((f) => (
                    <td key={f.name} className="px-6 py-4 text-sm">
                      {f.name === 'GeneratedBarcode' ? (
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                          {r[f.name]}
                        </code>
                      ) : (
                        r[f.name] ?? '—'
                      )}
                    </td>
                  ))}
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
          
          {filteredBarcodes.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No barcodes found</p>
              <p className="text-gray-400 text-sm mt-1">
                {barcodes?.length === 0 
                  ? 'Add your first barcode above' 
                  : 'Try adjusting your filters'}
              </p>
            </div>
          )}
        </div>
      )}

      {open && (
        <Modal
          title={`${current ? 'Edit' : 'Add'} Barcode`}
          initialData={current}
          referenceData={refs}
          onClose={() => setOpen(false)}
          onSave={async (data) => {
            try {
              if (current?.id) {
                await updateDoc(doc(db, 'barcodes', current.id), data);
              } else {
                await addDoc(collection(db, 'barcodes'), data);
              }
              setOpen(false);
            } catch (error) {
              console.error('Error saving barcode:', error);
              alert('Failed to save barcode. Please try again.');
            }
          }}
        />
      )}

      {uploadOpen && (
        <BarcodeUploadModal onClose={() => setUploadOpen(false)} />
      )}
    </>
  );
};

export default BarcodeManager;
