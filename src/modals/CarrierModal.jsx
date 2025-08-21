// CarrierModal.jsx - Modal for managing Carriers
import React from 'react';
import Modal from './Modal';

export default function CarrierModal({ title, initialData, onClose, onSave }) {
  const fields = [
    { name: 'carrierName', label: 'Carrier Name', type: 'text' },
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
