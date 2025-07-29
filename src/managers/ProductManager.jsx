// src/managers/ProductManager.jsx - COMPLETE VERSION
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import PageHeader from '../components/PageHeader';
import ProductModal from '../modals/ProductModal';
import { EditIcon, DeleteIcon } from '../components/Icons';

export default function ProductManager() {
  const [products, setProducts] = useState([]);
  const [items, setItems] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribes = [];

    // Subscribe to items
    const itemsUnsub = onSnapshot(
      collection(db, 'items'),
      (snapshot) => {
        setItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      },
      (error) => console.error('Error fetching items:', error)
    );
    unsubscribes.push(itemsUnsub);

    // Subscribe to sizes
    const sizesUnsub = onSnapshot(
      collection(db, 'sizes'),
      (snapshot) => {
        setSizes(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      },
      (error) => console.error('Error fetching sizes:', error)
    );
    unsubscribes.push(sizesUnsub);

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
      }
    );
    unsubscribes.push(productsUnsub);

    return () => unsubscribes.forEach(unsub => unsub());
  }, []);

  // Get item name by ID
  const getItemName = (itemId) => {
    const item = items.find(i => i.id === itemId);
    return item ? `${item.ItemCode} - ${item.ItemName}` : '—';
  };

  // Get size name by ID
  const getSizeName = (sizeId) => {
    const size = sizes.find(s => s.id === sizeId);
    return size ? size.SizeName : '—';
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading products...</div>
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
      />

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
              </tr>
            ))}
          </tbody>
        </table>

        {enhancedProducts.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No products found. Click "Add New Product" to get started.
          </div>
        )}
      </div>

      {open && (
        <ProductModal
          title={`${current ? 'Edit' : 'Add'} Product`}
          initialData={current}
          items={items.filter(i => i.Status === 'Active')}
          sizes={sizes.filter(s => s.Status === 'Active')}
          onClose={() => setOpen(false)}
          onSave={async (data) => {
            try {
              // Find the selected item and size to populate display fields
              const selectedItem = items.find(i => i.id === data.ItemId);
              const selectedSize = sizes.find(s => s.id === data.SizeId);

              const productData = {
                ...data,
                ItemCodeDisplay: selectedItem?.ItemCode || data.ItemCodeDisplay,
                ItemNameDisplay: selectedItem?.ItemName || data.ItemNameDisplay,
                SizeNameDisplay: selectedSize?.SizeName || data.SizeNameDisplay,
                StandardWeight: parseInt(data.StandardWeight) || 1,
                Status: data.Status || 'Active'
              };

              if (current?.id) {
                await updateDoc(doc(db, 'products', current.id), productData);
              } else {
                await addDoc(collection(db, 'products'), productData);
              }
              setOpen(false);
            } catch (error) {
              console.error('Error saving product:', error);
              alert('Error saving product. Please try again.');
            }
          }}
        />
      )}
    </>
  );
}