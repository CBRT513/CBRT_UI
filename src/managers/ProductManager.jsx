import React, { useState } from 'react';
import { useFirestoreCollection } from '../hooks/useFirestore';
import { addDoc, updateDoc, deleteDoc, collection, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
<<<<<<< Updated upstream
||||||| Stash base
import PageHeader from '../components/PageHeader';
import ProductModal from '../modals/ProductModal';
import { EditIcon, DeleteIcon } from '../components/Icons';
=======
import PageHeader from '../components/PageHeader';
import ProductModal from '../modals/ProductModal';
import { EditIcon, DeleteIcon } from '../components/Icons';
import { TableSkeleton, ErrorDisplay, EmptyState, LoadingSpinner } from '../components/LoadingStates';
>>>>>>> Stashed changes

<<<<<<< Updated upstream
const ProductManager = () => {
  const { data: products, loading, error } = useFirestoreCollection('products');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    productName: '',
    description: '',
    category: '',
    status: 'Active'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
||||||| Stash base
export default function ProductManager() {
  const [products, setProducts] = useState([]);
  const [items, setItems] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(true);
=======
export default function ProductManager() {
  const [products, setProducts] = useState([]);
  const [items, setItems] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
>>>>>>> Stashed changes

  const resetForm = () => {
    setFormData({
      productName: '',
      description: '',
      category: '',
      status: 'Active'
    });
    setEditingProduct(null);
  };

<<<<<<< Updated upstream
  const closeModal = () => {
    setShowModal(false);
    resetForm();
    setIsSubmitting(false);
  };

  const handleAddProduct = () => {
    resetForm();
    setShowModal(true);
  };

  const handleEditProduct = (product) => {
    setFormData({
      productName: product.ProductName || '',
      description: product.Description || '',
      category: product.Category || '',
      status: product.Status || 'Active'
    });
    setEditingProduct(product);
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
    if (!formData.productName.trim()) {
      alert('Product Name is required');
      return false;
    }
    return true;
  };

  const checkForDuplicate = () => {
    if (!products) return false;
    
    const duplicate = products.find(product => 
      product.ProductName?.toLowerCase() === formData.productName.toLowerCase() &&
      (!editingProduct || product.id !== editingProduct.id)
||||||| Stash base
    // Subscribe to items
    const itemsUnsub = onSnapshot(
      collection(db, 'items'),
      (snapshot) => {
        setItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      },
      (error) => console.error('Error fetching items:', error)
=======
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
>>>>>>> Stashed changes
    );
    
    if (duplicate) {
      alert('A product with this name already exists');
      return true;
    }
    return false;
  };

<<<<<<< Updated upstream
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    if (!validateForm()) return;
    if (checkForDuplicate()) return;
||||||| Stash base
    // Subscribe to sizes
    const sizesUnsub = onSnapshot(
      collection(db, 'sizes'),
      (snapshot) => {
        setSizes(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      },
      (error) => console.error('Error fetching sizes:', error)
    );
    unsubscribes.push(sizesUnsub);
=======
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
>>>>>>> Stashed changes

<<<<<<< Updated upstream
    setIsSubmitting(true);

    try {
      const dbData = {
        ProductName: formData.productName,
        Description: formData.description,
        Category: formData.category,
        Status: formData.status
      };

      if (editingProduct) {
        await updateDoc(doc(db, 'products', editingProduct.id), {
          ...dbData,
          updatedAt: new Date()
        });
        console.log('Product updated successfully');
      } else {
        await addDoc(collection(db, 'products'), {
          ...dbData,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log('Product added successfully');
||||||| Stash base
    // Subscribe to products
    const productsUnsub = onSnapshot(
      collection(db, 'products'),
      (snapshot) => {
        const productData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setProducts(productData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching products:', error);
        setLoading(false);
=======
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
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
  if (loading) return <div className="flex justify-center p-8">Loading products...</div>;
  if (error) return <div className="text-red-600 p-8">Error loading products: {error.message}</div>;
||||||| Stash base
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading products...</div>
      </div>
    );
  }
=======
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
>>>>>>> Stashed changes

  return (
<<<<<<< Updated upstream
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Products</h1>
        <button
          onClick={handleAddProduct}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          + Add Product
        </button>
      </div>
||||||| Stash base
    <>
      <PageHeader
        title="Products Management"
        subtitle="Manage product combinations of items and sizes"
        buttonText="Add New Product"
        onAdd={() => {
          setCurrent(null);
          setOpen(true);
        }}
      />
=======
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
>>>>>>> Stashed changes

<<<<<<< Updated upstream
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
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
            {products?.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {product.ProductName || product.ItemNameDisplay || '-'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {product.Description || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {product.Category || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    product.Status === 'Active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {product.Status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleEditProduct(product)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDeleteProduct(product.id)}
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
                      className="text-green-800 hover:text-green-600"
                      title="Edit"
                    >
                      <EditIcon />
                    </button>
                    <button
                      onClick={async () => {
                        if (window.confirm('Are you sure you want to delete this product?')) {
                          await deleteDoc(doc(db, 'products', product.id));
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
>>>>>>> Stashed changes
              </tr>
<<<<<<< Updated upstream
            ))}
          </tbody>
        </table>

        {(!products || products.length === 0) && (
          <div className="text-center py-8 text-gray-500">
            No products found. Click "Add Product" to get started.
          </div>
        )}
      </div>
||||||| Stash base
            ))}
          </tbody>
        </table>

        {enhancedProducts.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No products found. Click "Add New Product" to get started.
          </div>
        )}
      </div>
=======
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
>>>>>>> Stashed changes

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