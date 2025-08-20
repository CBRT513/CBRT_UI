import React, { useState } from 'react';
import { useFirestoreCollection } from '../hooks/useFirestore';
import { addDoc, updateDoc, deleteDoc, collection, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import PageHeader from '../components/PageHeader';
import ProductModal from '../modals/ProductModal';
import { EditIcon, DeleteIcon } from '../components/Icons';
import { TableSkeleton, ErrorDisplay, EmptyState, LoadingSpinner } from '../components/LoadingStates';

export default function ProductManager() {
  const [products, setProducts] = useState([]);
  const [items, setItems] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const resetForm = () => {
    setFormData({
      productName: '',
      description: '',
      category: '',
      status: 'Active'
    });
    setEditingProduct(null);
  };

    // Subscribe to items
    const itemsUnsub = onSnapshot(
      collection(db, 'items'),
      (snapshot) => {
        try {
          setItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (err) {
          console.error('Error processing items:', err);
          setError(err);
        }
      },
      (error) => {
        console.error('Error fetching items:', error);
        setError(error);
      }
    );
    
    if (duplicate) {
      alert('A product with this name already exists');
      return true;
    }
    return false;
  };

    // Subscribe to sizes
    const sizesUnsub = onSnapshot(
      collection(db, 'sizes'),
      (snapshot) => {
        try {
          setSizes(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (err) {
          console.error('Error processing sizes:', err);
          setError(err);
        }
      },
      (error) => {
        console.error('Error fetching sizes:', error);
        setError(error);
      }
    );
    unsubscribes.push(sizesUnsub);

    // Subscribe to products
    const productsUnsub = onSnapshot(
      collection(db, 'products'),
      (snapshot) => {
        try {
          const productData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          setProducts(productData);
          setLoading(false);
          setError(null);
        } catch (err) {
          console.error('Error processing products:', err);
          setError(err);
          setLoading(false);
        }
      },
      (error) => {
        console.error('Error fetching products:', error);
        setError(error);
        setLoading(false);
      }
      closeModal();
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Error saving product. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteDoc(doc(db, 'products', productId));
        console.log('Product deleted successfully');
      } catch (error) {
        console.error('Error deleting product:', error);
        alert('Error deleting product. Please try again.');
      }
    }
  };

  // Enhanced products with item and size names
  const enhancedProducts = products.map(product => ({
    ...product,
    ItemName: getItemName(product.ItemId),
    SizeName: getSizeName(product.SizeId),
  }));

  const fields = [
    { name: 'ItemName', label: 'Item' },
    { name: 'SizeName', label: 'Size' },
    { name: 'ItemCodeDisplay', label: 'Item Code' },
    { name: 'ItemNameDisplay', label: 'Item Name' },
    { name: 'SizeNameDisplay', label: 'Size Display' },
    { name: 'StandardWeight', label: 'Weight (lbs)' },
    { name: 'Status', label: 'Status' },
  ];

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    
    setActionLoading(id);
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product. Please try again.');
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
          title="Products Management" 
          subtitle="Manage product combinations of items and sizes" 
        />
        <ErrorDisplay 
          error={error} 
          onRetry={handleRetry}
          title="Failed to load products data"
        />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Products Management"
        subtitle="Manage product combinations of items and sizes"
        buttonText="Add New Product"
        onAdd={() => {
          setCurrent(null);
          setOpen(true);
        }}
        disabled={loading}
      />

      {loading ? (
        <TableSkeleton rows={6} columns={7} />
      ) : enhancedProducts.length === 0 ? (
        <EmptyState
          title="No products found"
          description="Get started by adding a new product."
          actionText="Add New Product"
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
              {enhancedProducts.map(product => (
                <tr key={product.id} className="hover:bg-gray-50">
                  {fields.map(f => (
                    <td key={f.name} className="px-6 py-4 text-sm">
                      {f.name === 'StandardWeight' ? `${product[f.name]} lbs` : product[f.name] ?? '—'}
                    </td>
                  ))}
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setCurrent(product);
                          setOpen(true);
                        }}
                        disabled={actionLoading === product.id}
                        className="text-green-800 hover:text-green-600 disabled:text-gray-400 disabled:cursor-not-allowed"
                        title="Edit"
                      >
                        <EditIcon />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        disabled={actionLoading === product.id}
                        className="text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center"
                        title="Delete"
                      >
                        {actionLoading === product.id ? (
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

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-screen overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  name="productName"
                  value={formData.productName}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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
      )}
    </div>
  );
};

export default ProductManager;
