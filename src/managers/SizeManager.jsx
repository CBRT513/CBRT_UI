import React from 'react';
import Manager from '../components/Manager';

export default function SizeManager() {
  return (
    <Manager
      collectionName="sizes"
      fields={[
        { name: 'SizeName', label: 'Size Name', type: 'text' },
        { name: 'SizeType', label: 'Size Type', type: 'select', options: ['Dimensional', 'Mesh', 'Special'] },
        { name: 'SortOrder', label: 'Sort Order', type: 'number' },
        { name: 'Status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
      ]}
    />
  );
}
