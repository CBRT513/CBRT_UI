// SupplierModal.jsx - Modal for managing Suppliers
import React from 'react';
import Modal from './Modal'; 

export default function SupplierModal({ title, initialData, onClose, onSave }) {
  const fields = [
    { name: 'supplierName', label: 'Supplier Name', type: 'text' },
    { name: 'bolPrefix', label: 'BOL Prefix', type: 'text' },
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
