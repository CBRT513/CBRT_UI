import React from 'react';
import Manager from '../components/Manager';

export default function ItemManager() {
  return (
    <Manager
      collectionName="items"
      fields={[
        { name: 'ItemCode', label: 'Item Code', type: 'text' },
        { name: 'ItemName', label: 'Item Name', type: 'text' },
        { name: 'Status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
      ]}
    />
  );
}
