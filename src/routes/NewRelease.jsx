// src/routes/NewRelease.jsx - COMPLETE FIXED VERSION
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import PageHeader from '../components/PageHeader';
import { v4 as uuid } from 'uuid';

export default function NewRelease() {
  const [customers, setCustomers] = useState([]);
  const [barcodes, setBarcodes] = useState([]);  // ✅ ADD: Barcodes collection
  const [lots, setLots] = useState([]);
  const [items, setItems] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [form, setForm] = useState({ customerId: '', items: [] });

  useEffect(() => {
    const unsub = [
      onSnapshot(collection(db, 'customers'), snap => setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'barcodes'), snap => setBarcodes(snap.docs.map(d => ({ id: d.id, ...d.data() })))), // ✅ ADD: Barcodes subscription
      onSnapshot(collection(db, 'lots'), snap => setLots(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'items'), snap => setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'sizes'), snap => setSizes(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
    ];
    return () => unsub.forEach(fn => fn());
  }, []);

  const updateLine = (idx, key, value) => {
    setForm(f => {
      const updated = [...f.items];
      const currentLine = { ...updated[idx], [key]: value };
      
      // Auto-reset downstream selects when upstream changes
      if (key === 'itemId') {
        currentLine.sizeId = '';
        currentLine.lotId = '';
      } else if (key === 'sizeId') {
        currentLine.lotId = '';
      }
      
      updated[idx] = currentLine;
      return { ...f, items: updated };
    });
  };

  const addLine = () => {
    setForm(f => ({
      ...f,
      items: [...f.items, { id: uuid(), itemId: '', sizeId: '', lotId: '', qty: 1 }]
    }));
  };

  const submit = async e => {
    e.preventDefault();
    await addDoc(collection(db, 'releases'), { ...form, status: 'open', createdAt: new Date() });
    setForm({ customerId: '', items: [] });
  };

  // ✅ FIXED: Step 1 - Items for Customer (using barcodes)
  const getItemsForCustomer = () => {
    if (!form.customerId) return [];
    
    // Get unique item IDs from barcodes that match the customer
    const itemIds = new Set(
      barcodes
        .filter(b => b.CustomerId === form.customerId)
        .map(b => b.ItemId)
        .filter(Boolean)
    );
    
    // Get items that match these IDs and are active, then deduplicate
    const itemMap = new Map();
    items
      .filter(i => itemIds.has(i.id) && i.Status === 'Active')
      .forEach(i => {
        if (!itemMap.has(i.id)) {
          itemMap.set(i.id, {
            id: i.id,
            code: i.ItemCode,
            name: i.ItemName
          });
        }
      });
    
    // Return sorted array
    return Array.from(itemMap.values()).sort((a, b) => (a.code || '').localeCompare(b.code || ''));
  };

  // ✅ FIXED: Step 2 - Sizes for Customer + Item (using barcodes)
  const getSizesForItem = itemId => {
    if (!form.customerId || !itemId) return [];
    
    // Get unique size IDs from barcodes that match customer + item
    const sizeIds = new Set(
      barcodes
        .filter(b => b.CustomerId === form.customerId && b.ItemId === itemId)
        .map(b => b.SizeId)
        .filter(Boolean)
    );
    
    // Get sizes that match these IDs and are active, then deduplicate
    const sizeMap = new Map();
    sizes
      .filter(s => sizeIds.has(s.id) && s.Status === 'Active')
      .forEach(s => {
        if (!sizeMap.has(s.id)) {
          sizeMap.set(s.id, {
            id: s.id,
            name: s.SizeName,
            sortOrder: s.SortOrder || 0
          });
        }
      });
    
    // Return sorted array (by SortOrder, then by name)
    return Array.from(sizeMap.values()).sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }
      return (a.name || '').localeCompare(b.name || '');
    });
  };

  // ✅ FIXED: Step 3 - Lots for Customer + Item + Size (using barcodes)
  const getLotsForItem = (customerId, itemId, sizeId) => {
    if (!customerId || !itemId || !sizeId) return [];
    
    // Get unique lot IDs from barcodes that match customer + item + size
    const lotIds = new Set(
      barcodes
        .filter(b => 
          b.CustomerId === customerId && 
          b.ItemId === itemId && 
          b.SizeId === sizeId
        )
        .map(b => b.LotId)
        .filter(Boolean)
    );
    
    // Get lots that match these IDs and are active, then deduplicate
    const lotMap = new Map();
    lots
      .filter(l => lotIds.has(l.id) && l.Status === 'Active')
      .forEach(l => {
        if (!lotMap.has(l.id)) {
          lotMap.set(l.id, {
            id: l.id,
            number: l.LotNumber
          });
        }
      });
    
    // Return sorted array
    return Array.from(lotMap.values()).sort((a, b) => (a.number || '').localeCompare(b.number || ''));
  };

  // Get active customers sorted alphabetically
  const getActiveCustomers = () => {
    return customers
      .filter(c => c.Status === 'Active')
      .sort((a, b) => (a.CustomerName || '').localeCompare(b.CustomerName || ''));
  };

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader title="Create New Release" subtitle="" />
      <form onSubmit={submit} className="bg-white shadow rounded p-6 space-y-4">
        <select
          value={form.customerId}
          onChange={e => setForm({ customerId: e.target.value, items: [] })}
          required
          className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select Customer</option>
          {getActiveCustomers().map(c => (
            <option key={c.id} value={c.id}>{c.CustomerName}</option>
          ))}
        </select>

        {form.items.map((line, idx) => {
          const availableItems = getItemsForCustomer();
          const availableSizes = getSizesForItem(line.itemId);
          const availableLots = getLotsForItem(form.customerId, line.itemId, line.sizeId);

          return (
            <div key={line.id} className="flex gap-2 items-center">
              <select
                value={line.itemId}
                onChange={e => updateLine(idx, 'itemId', e.target.value)}
                required
                className="flex-1 border px-3 py-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Item</option>
                {availableItems.map(i => (
                  <option key={i.id} value={i.id}>{i.code}</option>
                ))}
              </select>

              <select
                value={line.sizeId}
                onChange={e => updateLine(idx, 'sizeId', e.target.value)}
                disabled={!line.itemId}
                required
                className="flex-1 border px-3 py-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Select Size</option>
                {availableSizes.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>

              <select
                value={line.lotId}
                onChange={e => updateLine(idx, 'lotId', e.target.value)}
                disabled={!line.itemId || !line.sizeId}
                required
                className="flex-1 border px-3 py-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Select Lot</option>
                {availableLots.map(l => (
                  <option key={l.id} value={l.id}>{l.number}</option>
                ))}
              </select>

              <input
                type="number"
                min="1"
                value={line.qty}
                onChange={e => updateLine(idx, 'qty', parseInt(e.target.value, 10))}
                className="w-16 border px-3 py-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />

              <button
                type="button"
                onClick={() => setForm(f => ({
                  ...f,
                  items: f.items.filter((_, i2) => i2 !== idx)
                }))}
                className="text-red-600 hover:text-red-800 font-bold text-xl w-8 h-8 flex items-center justify-center"
                title="Remove line"
              >×</button>
            </div>
          );
        })}

        <div className="flex justify-between">
          <button 
            type="button" 
            onClick={addLine} 
            className="border border-gray-300 px-3 py-1 rounded hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            + Line
          </button>
          <button 
            type="submit" 
            disabled={!form.customerId || form.items.length === 0}
            className="bg-green-800 text-white px-4 py-2 rounded hover:bg-green-900 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}