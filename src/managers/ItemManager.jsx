import React, { useState } from 'react';
import PageHeader from '../components/PageHeader';
import Manager from '../components/Manager';
import ItemUploadModal from '../modals/ItemUploadModal';
import { PlusIcon } from '../components/Icons';

export default function ItemManager() {
  const [uploadOpen, setUploadOpen] = useState(false);

  return (
    <>
      <PageHeader
        title="Items Management"
        subtitle="Manage items"
        buttonText="Add New Item"
        onAdd={() => {}} // your add modal (if any) goes here
        extraButtons={
          <button
            onClick={() => setUploadOpen(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded shadow hover:opacity-90"
          >
            📁 Upload CSV
          </button>
        }
      />

      <Manager
        collectionName="items"
        fields={[
          { name: 'ItemCode', label: 'Item Code', type: 'text' },
          { name: 'ItemName', label: 'Item Name', type: 'text' },
          { name: 'Status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
        ]}
      />

      {uploadOpen && (
        <ItemUploadModal
          onClose={() => setUploadOpen(false)}
          onUpload={async (items) => {
            const promises = items.map((item) => addDoc(collection(db, 'items'), item));
            await Promise.all(promises);
            setUploadOpen(false);
          }}
        />
      )}
    </>
  );
}