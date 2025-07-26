import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';          // will create next
import { collection, addDoc, onSnapshot } from 'firebase/firestore';
import { v4 as uuid } from 'uuid';

export default function NewRelease() {
  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ customerId: '', items: [] });

  useEffect(() => {
    onSnapshot(collection(db, 'customers'), s => setCustomers(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    onSnapshot(collection(db, 'products'), s => setItems(s.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  const addLine = () => setForm({ ...form, items: [...form.items, { id: uuid(), productId: '', qty: 1 }] });
  const updateLine = (i, key, val) => {
    const newItems = [...form.items];
    newItems[i][key] = val;
    setForm({ ...form, items: newItems });
  };
  const removeLine = (i) => setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, 'releases'), {
      customerId: form.customerId,
      items: form.items,
      status: 'open',
      createdAt: new Date()
    });
    alert('Release created!');
    setForm({ customerId: '', items: [] });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Create New Release</h2>
      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded shadow">
        <select required value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value })} className="w-full border px-3 py-2">
          <option value="">Select Customer</option>
          {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        {form.items.map((line, idx) => (
          <div key={line.id} className="flex gap-2 items-center">
            <select required value={line.productId} onChange={e => updateLine(idx, 'productId', e.target.value)} className="flex-1 border px-3 py-2">
              <option value="">Select Product</option>
              {items.map(p => <option key={p.id} value={p.id}>{p.itemCode} - {p.itemName} ({p.sizeName})</option>)}
            </select>
            <input required type="number" min="1" value={line.qty} onChange={e => updateLine(idx, 'qty', +e.target.value)} className="w-20 border px-3 py-2" />
            <button type="button" onClick={() => removeLine(idx)} className="text-red-500"><TrashIcon /></button>
          </div>
        ))}

        <div className="flex justify-between items-center">
          <button type="button" onClick={addLine} className="bg-gray-200 px-3 py-1 rounded">+ Add Line</button>
          <button type="submit" className="bg-[#01522F] text-white px-4 py-2 rounded">Save Release</button>
        </div>
      </form>
    </div>
  );
}