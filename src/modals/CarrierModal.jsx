// CarrierModal.jsx - Modal for managing Carriers
import React from 'react';
import Modal from './Modal';

export default function CarrierModal({ title, initialData, onClose, onSave }) {
  const fields = [
    { name: 'CarrierName', label: 'Carrier Name', type: 'text' },
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
