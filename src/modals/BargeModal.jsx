// BargeModal.jsx - Modal for managing Barges
import React from 'react';
import Modal from './Modal'; 

export default function BargeModal({ title, initialData, onClose, onSave }) {
  const fields = [
    { name: 'BargeName', label: 'Barge Name', type: 'text' },
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
