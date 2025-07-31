// SizeModal.jsx - Modal for managing Sizes
import React from 'react';
import Modal from './Modal'; 

export default function SizeModal({ title, initialData, onClose, onSave }) {
  const fields = [
    { name: 'SizeName', label: 'Size Name', type: 'text' },
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
