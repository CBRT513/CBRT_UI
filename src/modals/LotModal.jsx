
import React from 'react';
import Modal from './Modal'; 

export default function LotModal({ title, initialData, onClose, onSave }) {
  const fields = [
    { name: 'lotNumber', label: 'Lot Number', type: 'text' },
    { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] }
  ];

  return (
    <Modal
      title={title}
      fields={fields}
      initialData={initialData}
      onClose={onClose}
      onSave={onSave}
    />
  );
}
