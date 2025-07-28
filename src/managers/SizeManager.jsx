// src/managers/SizeManager.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  orderBy,
  query,
} from 'firebase/firestore';

export default function SizeManager() {
  const [sizes, setSizes] = useState([]);
  const [form, setForm] = useState({ SizeName: '', Status: 'Active' });
  const [editingId, setEditingId] = useState(null);

  const fetchSizes = async () => {
    const q = query(collection(db, 'sizes'), orderBy('SizeName'));
    const snap = await getDocs(q);
    setSizes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => {
    fetchSizes();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.SizeName.trim()) return;

    if (editingId) {
      await updateDoc(doc(db, 'sizes', editingId), {
        SizeName: form.SizeName.trim(),
        Status: form.Status,
      });
    } else {
      await addDoc(collection(db, 'sizes'), {
        SizeName: form.SizeName.trim(),
        Status: form.Status,
        SortOrder: 'ascending'
      });
    }
    setForm({ SizeName: '', Status: 'Active' });
    setEditingId(null);
    fetchSizes();
  };

  const handleEdit = (size) => {
    setForm({ SizeName: size.SizeName, Status: size.Status });
    setEditingId(size.id);
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, 'sizes', id));
    fetchSizes();
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-green-600 mb-2">Sizes Management</h2>
      <p className="text-gray-600 mb-6">Manage sizes</p>

      <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 mb-6">
        <input
          name="SizeName"
          value={form.SizeName}
          onChange={handleChange}
          placeholder="Size Name"
          className="border px-3 py-2 rounded w-48"
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
          {editingId ? 'Update Size' : 'Add New Size'}
        </button>
      </form>

      <table className="w-full text-sm border border-gray-300">
        <thead className="bg-gray-800 text-white">
          <tr>
            <th className="p-2 text-left">Size Name</th>
            <th className="p-2 text-left">Status</th>
            <th className="p-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sizes.map(size => (
            <tr key={size.id} className="border-t border-gray-200">
              <td className="p-2">{size.SizeName}</td>
              <td className="p-2">{size.Status}</td>
              <td className="p-2">
                <button onClick={() => handleEdit(size)} className="text-green-600 mr-2">✏️</button>
                <button onClick={() => handleDelete(size.id)} className="text-red-600">🗑️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
