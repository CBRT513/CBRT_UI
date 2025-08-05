import React from 'react';
import Modal from './Modal';
import { ENTITY_FIELDS } from '../constants';

export default function CustomerModal({ isOpen, onClose, onSave, initialData }) {
  return (
    <Modal
      isOpen={isOpen}
      title={initialData ? 'Edit Customer' : 'Add Customer'}
      fields={ENTITY_FIELDS.customer}
      initialData={initialData}
      onClose={onClose}
      onSave={onSave}
    />
  );
}