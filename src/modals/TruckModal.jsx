import React, { useState } from 'react';
import Modal from './Modal';

const fields = [
  { name: 'CarrierId', label: 'Carrier', type: 'select', required: true, collection: 'carriers', displayField: 'CarrierName' },
  { name: 'TruckNumber', label: 'Truck Number', type: 'text', required: true },
  { name: 'TrailerNumber', label: 'Trailer Number', type: 'text', required: false },
  { name: 'Status', label: 'Status', type: 'select', required: true, options: [
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' }
  ], defaultValue: 'Active' }
];

export default function TruckModal({ isOpen, onClose, onSave, initialData }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onSave={onSave}
      title={initialData ? 'Edit Truck' : 'Add Truck'}
      fields={fields}
      initialData={initialData}
      collection="trucks"
    />
  );
}