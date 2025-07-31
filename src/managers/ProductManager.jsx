// ProductManager.jsx
// Manages product data in Firestore with standardized CustomerManager styling.

import React, { useState } from 'react';
import { useFirestoreCollection, useFirestoreActions } from '../hooks/useFirestore';
import ProductModal from '../modals/ProductModal';
import { TableSkeleton, ErrorDisplay, EmptyState, LoadingSpinner } from '../components/LoadingStates';
import PageHeader from '../components/PageHeader';
import { EditIcon, DeleteIcon } from '../components/Icons';

export default function ProductManager() {
  const { data: products, loading, error, retry } = useFirestoreCollection('products');
  const { add, update, delete: deleteProduct } = useFirestoreActions('products');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [loadingId, setLoadingId] = useState(null);

  const handleAdd = () => { setEditTarget(null); setModalOpen(true); };
  const handleEdit = (item) => { setEditTarget(item); setModalOpen(true); };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this product?')) {
      setLoadingId(id);
      await deleteProduct(id);
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
      console.error('Failed to save product:', err);
      alert('There was an error saving the product.');
    } finally {
      setLoadingId(null);
    }
  };

  if (loading) return <TableSkeleton />;
  if (error) return <ErrorDisplay error={error} onRetry={retry} />;
  if (!products.length) return <EmptyState message="No products found." onAction={handleAdd} actionLabel="Add Product" />;

  return (
    <div className="p-4">
      <PageHeader
        title="Product Manager"
        subtitle="Manage the list of available products"
        buttonText="Add Product"
        onAdd={handleAdd}
        disabled={loadingId === 'save'}
      />
      <div className="bg-white shadow rounded overflow-x-auto">
        <table className="min-w-full text-sm" aria-label="Products Table">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="text-left px-4 py-2">Product Code</th>
              <th className="text-left px-4 py-2">Product Name</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-left px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map(item => (
              <tr key={item.id} className="border-t">
                <td className="px-4 py-2">{item.ProductCode}</td>
                <td className="px-4 py-2">{item.ProductName}</td>
                <td className="px-4 py-2">{item.Status}</td>
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
        <ProductModal
          title={editTarget ? 'Edit Product' : 'Add Product'}
          initialData={editTarget}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
        />
      )}
      {loadingId === 'save' && <LoadingSpinner />}
    </div>
  );
}
