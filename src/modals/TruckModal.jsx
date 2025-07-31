// TruckModal.jsx - Modal for managing Trucks
import React from 'react';
import Modal from './Modal'; 

export default function TruckModal({ title, initialData, onClose, onSave }) {
const fields = [
  { name: 'TruckNumber', label: 'Truck Number', type: 'text' },
  { name: 'TrailerNumber', label: 'Trailer Number', type: 'text' },
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
