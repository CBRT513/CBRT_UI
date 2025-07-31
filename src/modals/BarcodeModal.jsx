// BarcodeModal.jsx - Handles Barcode creation/editing
import React, { useEffect, useState } from 'react';
import Modal from './Modal'; 

export default function BarcodeModal({ title, initialData = {}, referenceData = {}, onClose, onSave }) {
  const [data, setData] = useState(initialData);

  const { barges = [], lots = [], customers = [], items = [], sizes = [] } = referenceData;

  useEffect(() => {
    const b = barges.find(x => x.id === data.BargeId)?.BargeName || '';
    const l = lots.find(x => x.id === data.LotId)?.LotNumber || '';
    const c = customers.find(x => x.id === data.CustomerId)?.CustomerName || '';
    const i = items.find(x => x.id === data.ItemId)?.ItemCode || '';
    const s = sizes.find(x => x.id === data.SizeId)?.SizeName || '';
    setData(prev => ({ ...prev, GeneratedBarcode: `${b}${l}${c}${i}${s}`.replace(/\s/g, '') }));
  }, [data.BargeId, data.LotId, data.CustomerId, data.ItemId, data.SizeId]);

  const fields = [
    { name: 'BargeId', label: 'Barge', type: 'select', options: barges.map(b => ({ label: b.BargeName, value: b.id })) },
    { name: 'LotId', label: 'Lot #', type: 'select', options: lots.map(l => ({ label: l.LotNumber, value: l.id })) },
    { name: 'CustomerId', label: 'Customer', type: 'select', options: customers.map(c => ({ label: c.CustomerName, value: c.id })) },
    { name: 'ItemId', label: 'Item', type: 'select', options: items.map(i => ({ label: i.ItemCode, value: i.id })) },
    { name: 'SizeId', label: 'Size', type: 'select', options: sizes.map(s => ({ label: s.SizeName, value: s.id })) },
    { name: 'Quantity', label: 'Quantity', type: 'number' },
    { name: 'GeneratedBarcode', label: 'Barcode', type: 'readonly' },
  ];

  return (
    <Modal
      title={title}
      fields={fields}
      initialData={data}
      onClose={onClose}
      onSave={onSave}
    />
  );
}
