// BarcodeManager.jsx - Hook-based version (CSV upload removed)
import React, { useState } from 'react';
import { useFirestoreMultiCollection, useFirestoreActions } from '../hooks/useFirestore';
import PageHeader from '../components/PageHeader';
import Modal from '../modals/BarcodeModal';
import { EditIcon, DeleteIcon } from '../components/Icons';
import { TableSkeleton, ErrorDisplay, EmptyState, LoadingSpinner } from '../components/LoadingStates';

export default function BarcodeManager() {
  const collectionNames = ['barcodes', 'barges', 'lots', 'customers', 'items', 'sizes'];
  const { data: collectionsData = {}, loading, error, retry } = useFirestoreMultiCollection(
    collectionNames.map(name => ({ name }))
  );
  const { add, update, delete: deleteDoc, actionLoading } = useFirestoreActions('barcodes');

  const [modalOpen, setModalOpen] = useState(false);
  const [current, setCurrent] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const { barcodes = [], barges = [], lots = [], customers = [], items = [], sizes = [] } = collectionsData;
  const referenceData = { barges, lots, customers, items, sizes };

  const rows = barcodes.map(d => {
    const b = barges.find(x => x.id === d.BargeId);
    const l = lots.find(x => x.id === d.LotId);
    const c = customers.find(x => x.id === d.CustomerId);
    const i = items.find(x => x.id === d.ItemId);
    const s = sizes.find(x => x.id === d.SizeId);
    return {
      ...d,
      BargeName: b?.BargeName || '—',
      LotNumber: l?.LotNumber || '—',
      CustomerName: c?.CustomerName || '—',
      ItemCode: i?.ItemCode || '—',
      SizeName: s?.SizeName || '—',
      GeneratedBarcode: `${b?.BargeName || ''}${l?.LotNumber || ''}${c?.CustomerName || ''}${i?.ItemCode || ''}${s?.SizeName || ''}`.replace(/\s/g, '')
    };
  });

  const fields = [
    { name: 'BargeName', label: 'Barge' },
    { name: 'LotNumber', label: 'Lot #' },
    { name: 'CustomerName', label: 'Customer' },
    { name: 'ItemCode', label: 'Item' },
    { name: 'SizeName', label: 'Size' },
    { name: 'GeneratedBarcode', label: 'Barcode' },
    { name: 'Quantity', label: 'Qty', type: 'number' },
  ];

  const handleAdd = () => {
    setCurrent(null);
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this barcode?')) return;
    setActionLoadingId(id);
    try {
      await deleteDoc(id);
    } catch (err) {
      console.error(err);
      alert('Delete failed.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSave = async (data) => {
    try {
      if (current?.id) {
        await update(current.id, data);
      } else {
        await add(data);
      }
      setModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Save failed.');
    }
  };

  if (error && !loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <PageHeader title="Barcodes Management" subtitle="Manage barcodes" />
        <ErrorDisplay error={error} onRetry={retry} title="Failed to load barcodes" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="Barcodes Management"
        subtitle="Manage barcodes"
        buttonText="Add New Barcode"
        onAdd={handleAdd}
        disabled={loading}
      />

      {loading ? (
        <TableSkeleton rows={6} columns={7} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No barcodes found"
          description="Start by adding new barcodes."
          actionText="Add New Barcode"
          onAction={handleAdd}
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
                    <td key={f.name} className="px-6 py-4 text-sm">
                      {f.name === 'GeneratedBarcode' ? (
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs">{r[f.name]}</code>
                      ) : (
                        r[f.name] ?? '—'
                      )}
                    </td>
                  ))}
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => { setCurrent(r); setModalOpen(true); }}
                        disabled={actionLoadingId === r.id || actionLoading}
                        className="text-green-800 hover:text-green-600 disabled:text-gray-400"
                        title="Edit"
                      >
                        <EditIcon />
                      </button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        disabled={actionLoadingId === r.id || actionLoading}
                        className="text-red-600 hover:text-red-800 disabled:text-gray-400"
                        title="Delete"
                      >
                        {actionLoadingId === r.id ? <LoadingSpinner size="sm" /> : <DeleteIcon />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <Modal
          title={`${current ? 'Edit' : 'Add'} Barcode`}
          initialData={current}
          referenceData={referenceData}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
