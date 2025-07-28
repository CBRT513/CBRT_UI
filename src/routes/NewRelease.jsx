import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import PageHeader from '../components/PageHeader';
import { v4 as uuid } from 'uuid';

export default function NewRelease() {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ customerId: '', items: [] });

  useEffect(() => {
    const unsubC = onSnapshot(collection(db, 'customers'), snap => setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubP = onSnapshot(collection(db, 'products'), snap => setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { unsubC(); unsubP(); };
  }, []);

  const addLine = () => setForm(f => ({ ...f, items: [...f.items, { id: uuid(), productId: '', qty: 1 }] }));
  const updateLine = (i, key, val) => setForm(f => {
    const items = f.items.map((line, idx) => idx === i ? { ...line, [key]: val } : line);
    return { ...f, items };
  });

  const submit = async e => {
    e.preventDefault();
    await addDoc(collection(db, 'releases'), { ...form, status: 'open', createdAt: new Date() });
    setForm({ customerId: '', items: [] });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader title="Create New Release" subtitle="" />
      <form onSubmit={submit} className="bg-white shadow rounded p-6 space-y-4">
        <select value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value })} required className="w-full border px-3 py-2">
          <option value="">Select Customer</option>
          {customers.map(c => <option key={c.id} value={c.id}>{c.CustomerName}</option>)}
        </select>
        {form.items.map((l, idx) => (
          <div key={l.id} className="flex gap-2">
            <select value={l.productId} onChange={e => updateLine(idx, 'productId', e.target.value)} required className="flex-1 border px-3 py-2">
              <option value="">Select Product</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.ItemCode} - {p.ItemName}</option>)}
            </select>
            <input type="number" min="1" value={l.qty} onChange={e => updateLine(idx, 'qty', +e.target.value)} className="w-20 border px-3 py-2" required />
            <button type="button" onClick={() => setForm(f => ({ ...f, items: f.items.filter((_,i) => i!==idx) }))} className="text-red-600">×</button>
          </div>
        ))}
        <div className="flex justify-between">
          <button type="button" onClick={addLine} className="border px-3 py-1 rounded">+ Line</button>
          <button type="submit" className="bg-green-800 text-white px-4 py-2 rounded">Save</button>
        </div>
      </form>
    </div>
  );
}
