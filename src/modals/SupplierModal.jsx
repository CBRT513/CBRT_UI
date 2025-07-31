// SupplierModal.jsx - Modal for managing Suppliers
import React from 'react';
import Modal from './Modal'; 

export default function SupplierModal({ title, initialData, onClose, onSave }) {
  const fields = [
    { name: 'SupplierName', label: 'Supplier Name', type: 'text' },
    { name: 'BOLPrefix', label: 'BOL Prefix', type: 'text' },
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
