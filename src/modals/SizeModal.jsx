// SizeModal.jsx - Modal for managing Sizes
import React from 'react';
import Modal from './Modal'; 

export default function SizeModal({ title, initialData, onClose, onSave }) {
  const fields = [
    { name: 'sizeName', label: 'Size Name', type: 'text' },
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
