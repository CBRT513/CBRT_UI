// CustomerModal.jsx - Modal for managing Customers
import React from 'react';
import Modal from './Modal'; 

export default function CustomerModal({ title, initialData, onClose, onSave }) {
  const fields = [
    { name: 'CustomerName', label: 'Customer Name', type: 'text' },
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
