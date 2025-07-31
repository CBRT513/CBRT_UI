// ItemModal.jsx - Modal for managing Items
import React from 'react';
import Modal from './Modal'; 

export default function ItemModal({ title, initialData, onClose, onSave }) {
  const fields = [
    { name: 'ItemCode', label: 'Item Code', type: 'text' },
    { name: 'ItemName', label: 'Item Name', type: 'text' },
    { name: 'Status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] }
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
