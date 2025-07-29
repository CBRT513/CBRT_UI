// src/managers/LotManager.jsx - COMPLETE FIXED VERSION
import React, { useState, useEffect } from 'react';
import {
  collection,
  doc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import PageHeader from '../components/PageHeader';
import { EditIcon, DeleteIcon } from '../components/Icons';

export default function LotManager() {
  const [lots, setLots] = useState([]);
  const [refs, setRefs] = useState({ customers: [], barges: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubLots = onSnapshot(collection(db, 'lots'), snap => {
      setLots(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    
    // Only subscribe to collections that lots actually reference
    const unsubCustomers = onSnapshot(collection(db, 'customers'), snap => {
      setRefs(r => ({ ...r, customers: snap.docs.map(d => ({ id: d.id, ...d.data() })) }));
    });
    
    const unsubBarges = onSnapshot(collection(db, 'barges'), snap => {
      setRefs(r => ({ ...r, barges: snap.docs.map(d => ({ id: d.id, ...d.data() })) }));
    });
    
    return () => {
      unsubLots();
      unsubCustomers();
      unsubBarges();
    };
  }, []);

  const getName = (id, col, field) => {
    const ref = refs[col].find(r => r.id === id);
    return ref ? ref[field] : '—';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading lots...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader 
        title="Lots Management" 
        subtitle="Manage lots (Items and Sizes managed via Barcodes)" 
      />

      <div className="bg-white shadow rounded overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left px-4 py-2">Lot Number</th>
              <th className="text-left px-4 py-2">Barge</th>
              <th className="text-left px-4 py-2">Customer</th>
              <th className="text-left px-4 py-2">Item</th>
              <th className="text-left px-4 py-2">Size</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-right px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {lots.sort((a, b) => a.LotNumber.localeCompare(b.LotNumber)).map(l => (
              <tr key={l.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2 font-medium">{l.LotNumber}</td>
                <td className="px-4 py-2">{getName(l.BargeId, 'barges', 'BargeName')}</td>
                <td className="px-4 py-2">{getName(l.CustomerId, 'customers', 'CustomerName')}</td>
                <td className="px-4 py-2 text-gray-500 italic">
                  — 
                  <span className="text-xs block">Via Barcodes</span>
                </td>
                <td className="px-4 py-2 text-gray-500 italic">
                  — 
                  <span className="text-xs block">Via Barcodes</span>
                </td>
                <td className="px-4 py-2">
                  <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                    l.Status === 'Active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {l.Status}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <div className="flex justify-end gap-2">
                    <button 
                      className="text-green-700 hover:text-green-500"
                      title="Edit functionality not available - lots are managed via data import"
                      disabled
                    >
                      <EditIcon />
                    </button>
                    <button 
                      onClick={async () => {
                        if (window.confirm(`Are you sure you want to delete lot ${l.LotNumber}? This will affect all related barcodes.`)) {
                          await deleteDoc(doc(db, 'lots', l.id));
                        }
                      }} 
                      className="text-red-600 hover:text-red-800"
                      title="Delete lot"
                    >
                      <DeleteIcon />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {lots.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No lots found. Import data via "Data Import" to create lots.
          </div>
        )}
      </div>

      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-blue-800 mb-2">ℹ️ About Lots Schema</h3>
        <p className="text-sm text-blue-700">
          Lots now use a <strong>clean schema</strong> containing only: LotNumber, BargeId, CustomerId, and Status.
          Item and Size relationships are managed through the <strong>Barcodes collection</strong>, 
          which provides the complete linking between Lots, Items, and Sizes.
        </p>
        <p className="text-sm text-blue-700 mt-2">
          Use <strong>Data Import</strong> or <strong>Barcode Upload</strong> to create lots with proper relationships.
        </p>
      </div>
    </div>
  );
}