// src/managers/ProductManager.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
} from 'firebase/firestore';

export default function ProductManager() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    ItemCodeDisplay: '',
    ItemNameDisplay: '',
    SizeNameDisplay: '',
    StandardWeight: '',
    Status: 'Active',
  });
  const [editingId, setEditingId] = useState(null);

  const fetchProducts = async () => {
    console.log('🔁 Fetching products...');
    const snap = await getDocs(collection(db, 'products'));
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const sorted = data.sort((a, b) => {
      const aKey = `${a.ItemCodeDisplay}-${a.SizeNameDisplay}-${a.StandardWeight}`;
      const bKey = `${b.ItemCodeDisplay}-${b.SizeNameDisplay}-${b.StandardWeight}`;
      return aKey.localeCompare(bKey);
    });
    setProducts([...sorted]);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { ItemCodeDisplay, SizeNameDisplay, StandardWeight } = form;
    if (!ItemCodeDisplay || !SizeNameDisplay || !StandardWeight) return;

    const q = query(
      collection(db, 'products'),
      where('ItemCodeDisplay', '==', ItemCodeDisplay),
      where('SizeNameDisplay', '==', SizeNameDisplay),
      where('StandardWeight', '==', StandardWeight)
    );
    const existing = await getDocs(q);
    if (!existing.empty && !editingId) {
      alert('Product combination already exists.');
      return;
    }

    if (editingId) {
      await updateDoc(doc(db, 'products', editingId), form);
    } else {
      await addDoc(collection(db, 'products'), form);
    }

    setForm({
      ItemCodeDisplay: '',
      ItemNameDisplay: '',
      SizeNameDisplay: '',
      StandardWeight: '',
      Status: 'Active',
    });
    setEditingId(null);
    fetchProducts();
  };

  const handleEdit = (product) => {
    setForm({ ...product });
    setEditingId(product.id);
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, 'products', id));
    fetchProducts();
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-green-600 mb-2">Products Management</h2>
      <p className="text-gray-600 mb-6">Manage item + size + weight combinations</p>

      <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 mb-6 items-center">
        <input
          name="ItemCodeDisplay"
          value={form.ItemCodeDisplay}
          onChange={handleChange}
          placeholder="Item Code"
          className="border px-3 py-2 rounded w-40"
          required
        />
        <input
          name="ItemNameDisplay"
          value={form.ItemNameDisplay}
          onChange={handleChange}
          placeholder="Item Name"
          className="border px-3 py-2 rounded w-48"
        />
        <input
          name="SizeNameDisplay"
          value={form.SizeNameDisplay}
          onChange={handleChange}
          placeholder="Size"
          className="border px-3 py-2 rounded w-32"
          required
        />
        <input
          name="StandardWeight"
          value={form.StandardWeight}
          onChange={handleChange}
          placeholder="Weight"
          type="number"
          className="border px-3 py-2 rounded w-32"
          required
        />
        <select
          name="Status"
          value={form.Status}
          onChange={handleChange}
          className="border px-3 py-2 rounded w-32"
        >
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
        <button type="submit" className="bg-green-700 text-white px-4 py-2 rounded">
          {editingId ? 'Update Product' : 'Add New Product'}
        </button>
        <button
          type="button"
          onClick={fetchProducts}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          🔁 Refresh
        </button>
      </form>

      <table className="w-full text-sm border border-gray-300">
        <thead className="bg-gray-800 text-white">
          <tr>
            <th className="p-2 text-left">Item Code</th>
            <th className="p-2 text-left">Item Name</th>
            <th className="p-2 text-left">Size</th>
            <th className="p-2 text-left">Standard Weight (lbs)</th>
            <th className="p-2 text-left">Status</th>
            <th className="p-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map(product => (
            <tr key={product.id} className="border-t border-gray-200">
              <td className="p-2">{product.ItemCodeDisplay || '—'}</td>
              <td className="p-2">{product.ItemNameDisplay || '—'}</td>
              <td className="p-2">{product.SizeNameDisplay || '—'}</td>
              <td className="p-2">{product.StandardWeight || '—'}</td>
              <td className="p-2">{product.Status}</td>
              <td className="p-2">
                <button onClick={() => handleEdit(product)} className="text-green-600 mr-2">✏️</button>
                <button onClick={() => handleDelete(product.id)} className="text-red-600">🗑️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
