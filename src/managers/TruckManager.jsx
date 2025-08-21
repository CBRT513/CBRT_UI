import React, { useState } from 'react';
import { useFirestoreCollection } from '../hooks/useFirestore';
import { addDoc, updateDoc, deleteDoc, collection, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { TableSkeleton, ErrorDisplay, EmptyState } from '../components/LoadingStates';
import TruckModal from '../modals/TruckModal';

export default function TruckManager() {
  const { data: trucks, loading, error } = useFirestoreCollection('trucks');
  const { data: carriers } = useFirestoreCollection('carriers');
  const [showModal, setShowModal] = useState(false);
  const [editingTruck, setEditingTruck] = useState(null);
  const [loadingId, setLoadingId] = useState(null);
  const [selectedCarrierId, setSelectedCarrierId] = useState('');

  // Group trucks by carrier
  const groupedTrucks = React.useMemo(() => {
    if (!trucks || !carriers) return [];

    // Filter by selected carrier if one is chosen
    const carriersToShow = selectedCarrierId 
      ? carriers.filter(carrier => carrier.id === selectedCarrierId)
      : carriers;

    const grouped = carriersToShow.map(carrier => ({
      carrier,
      trucks: trucks.filter(truck => (truck.carrierId || truck.CarrierId) === carrier.id)
    })).filter(group => group.trucks.length > 0);

    // Sort by carrier name
    return grouped.sort((a, b) => (a.carrier.carrierName || a.carrier.CarrierName || '').localeCompare(b.carrier.carrierName || b.carrier.CarrierName || ''));
  }, [trucks, carriers, selectedCarrierId]);

  const handleAdd = () => {
    setEditingTruck(null);
    setShowModal(true);
  };

  const handleEdit = (truck) => {
    setEditingTruck(truck);
    setShowModal(true);
  };

  const handleSave = async (truckData) => {
    try {
      if (editingTruck) {
        await updateDoc(doc(db, 'trucks', editingTruck.id), {
          ...truckData,
          updatedAt: new Date()
        });
      } else {
        await addDoc(collection(db, 'trucks'), {
          ...truckData,
          createdAt: new Date()
        });
      }
    } catch (error) {
      console.error('Error saving truck:', error);
      throw error;
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this truck?')) return;
    
    setLoadingId(id);
    try {
      await deleteDoc(doc(db, 'trucks', id));
    } catch (error) {
      console.error('Error deleting truck:', error);
      alert('Failed to delete truck');
    } finally {
      setLoadingId(null);
    }
  };

  if (loading) return <TableSkeleton />;
  if (error) return <ErrorDisplay message={error} />;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md">
        <div className="flex justify-between items-center p-6 border-b">
          <h1 className="text-2xl font-bold text-gray-900">Trucks</h1>
          <div className="flex items-center space-x-4">
            {/* Carrier Filter */}
            <select
              value={selectedCarrierId}
              onChange={(e) => setSelectedCarrierId(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">All Carriers</option>
              {carriers?.map(carrier => (
                <option key={carrier.id} value={carrier.id}>
                  {carrier.carrierName || carrier.CarrierName}
                </option>
              ))}
            </select>
            
            <button
              onClick={handleAdd}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              + Add Truck
            </button>
          </div>
        </div>

        <div className="p-6">
          {groupedTrucks.length === 0 ? (
            <EmptyState 
              title="No trucks found"
              description="Add your first truck to get started"
              actionLabel="Add Truck"
              onAction={handleAdd}
            />
          ) : (
            <div className="space-y-8">
              {groupedTrucks.map(({ carrier, trucks }) => (
                <div key={carrier.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Carrier Header */}
                  <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {carrier.carrierName || carrier.CarrierName}
                    </h2>
                    <p className="text-sm text-gray-600">
                      {trucks.length} truck{trucks.length !== 1 ? 's' : ''}
                    </p>
                  </div>

                  {/* Trucks Table */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Truck Number
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Trailer Number
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {trucks.map((truck, index) => (
                          <tr key={truck.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {truck.truckNumber || truck.TruckNumber}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {(truck.trailerNumber || truck.TrailerNumber) || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                (truck.status || truck.Status) === 'Active' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {truck.status || truck.Status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                              <button
                                onClick={() => handleEdit(truck)}
                                className="text-blue-600 hover:text-blue-700"
                                disabled={loadingId === truck.id}
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDelete(truck.id)}
                                className="text-red-600 hover:text-red-700"
                                disabled={loadingId === truck.id}
                              >
                                {loadingId === truck.id ? '⏳' : '🗑️'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <TruckModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
          initialData={editingTruck}
        />
      )}
    </div>
  );
}