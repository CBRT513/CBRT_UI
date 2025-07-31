// src/managers/TruckManager.jsx
import React, { useState } from 'react';
import { useFirestoreCollection, useFirestoreActions } from '../hooks/useFirestore';
import TruckModal from '../modals/TruckModal';
import PageHeader from '../components/PageHeader';
import { EditIcon, DeleteIcon } from '../components/Icons';
import { TableSkeleton, ErrorDisplay, EmptyState } from '../components/LoadingStates';

const fields = [
  { name: 'TruckNumber', label: 'Truck Number' },
  { name: 'TrailerNumber', label: 'Trailer Number' },
  { name: 'Status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] }
];

export default function TruckManager() {
  const { data: trucks, loading, error } = useFirestoreCollection('trucks');
  const { add, update, remove } = useFirestoreActions('trucks');
  const [selected, setSelected] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  const handleAdd = () => {
    console.log("Add truck clicked");
    setSelected(null);
    setIsOpen(true);
  };

  const handleEdit = (truck) => {
    setSelected(truck);
    setIsOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this truck?')) {
      await remove(id);
    }
  };

  const handleSave = async (data) => {
    if (selected?.id) {
      await update(selected.id, data);
    } else {
      await add(data);
    }
    setIsOpen(false);
  };

  return (
    <div className="p-4">
      <PageHeader title="Trucks" onAdd={handleAdd} buttonText="Add Truck" />


      {loading && <TableSkeleton />}
      {error && <ErrorDisplay message={error.message} />}
      {!loading && !error && trucks.length === 0 && <EmptyState label="trucks" />}

      {!loading && !error && trucks.length > 0 && (
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="px-4 py-2">Truck Number</th>
              <th className="px-4 py-2">Trailer Number</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {trucks.map(truck => (
              <tr key={truck.id} className="border-t">
                <td className="px-4 py-2">{truck.TruckNumber}</td>
                <td className="px-4 py-2">{truck.TrailerNumber}</td>
                <td className="px-4 py-2">{truck.Status}</td>
                <td className="px-4 py-2 flex gap-2">
                  <button onClick={() => handleEdit(truck)}><EditIcon /></button>
                  <button onClick={() => handleDelete(truck.id)}><DeleteIcon /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {isOpen && (
        <TruckModal
          title={selected ? 'Edit Truck' : 'Add Truck'}
          initialData={selected || {}}
          fields={fields}
          onClose={() => setIsOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
