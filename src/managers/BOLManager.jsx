import React, { useState } from 'react';
import { useFirestoreCollection } from '../hooks/useFirestore';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';

const BOLManager = () => {
  const { data: bols, loading, error } = useFirestoreCollection('bols');
  const { data: releases } = useFirestoreCollection('releases');
  const { data: customers } = useFirestoreCollection('customers');
  const { data: carriers } = useFirestoreCollection('carriers');
  const [loadingId, setLoadingId] = useState(null);

  const handleVoidBOL = async (bolId, releaseId) => {
    if (!window.confirm('Are you sure you want to void this BOL?')) return;
    
    setLoadingId(bolId);
    try {
      // Update BOL status to voided
      await updateDoc(doc(db, 'bols', bolId), {
        Status: 'Voided',
        updatedAt: new Date()
      });
      
      // Update release status back to available if releaseId exists
      if (releaseId) {
        await updateDoc(doc(db, 'releases', releaseId), {
          Status: 'Available',
          BOLId: null,
          ShippedAt: null,
          updatedAt: new Date()
        });
      }
      
      console.log('BOL voided successfully');
    } catch (error) {
      console.error('Error voiding BOL:', error);
      alert('Error voiding BOL. Please try again.');
    } finally {
      setLoadingId(null);
    }
  };

  const getBOLData = (bol) => {
    const release = releases?.find(r => r.id === bol.ReleaseId);
    const customer = customers?.find(c => c.id === bol.CustomerId);
    const carrier = carriers?.find(c => c.id === bol.CarrierId);
    
    return { release, customer, carrier };
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (error) {
      return dateString;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Generated':
        return 'bg-green-100 text-green-800';
      case 'Voided':
        return 'bg-red-100 text-red-800';
      case 'Shipped':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) return <div className="flex justify-center p-8">Loading BOLs...</div>;
  if (error) return <div className="text-red-600 p-8">Error loading BOLs: {error.message}</div>;

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Bill of Lading Manager</h1>
      </div>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                BOL Number
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Carrier
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Truck/Trailer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pickup Date
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
            {bols?.map((bol) => {
              const { release, customer, carrier } = getBOLData(bol);
              return (
                <tr key={bol.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-green-600">
                    {bol.BOLNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {customer?.CustomerName || customer?.customerName || 'Unknown Customer'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {carrier?.CarrierName || carrier?.carrierName || 'Unknown Carrier'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {bol.TruckNumber || '-'}/{bol.TrailerNumber || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(bol.PickupDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(bol.Status)}`}>
                      {bol.Status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {bol.Status === 'Generated' && (
                      <button
                        onClick={() => handleVoidBOL(bol.id, bol.ReleaseId)}
                        disabled={loadingId === bol.id}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      >
                        {loadingId === bol.id ? '⏳ Voiding...' : '❌ Void BOL'}
                      </button>
                    )}
                    {bol.Status === 'Voided' && (
                      <span className="text-gray-400">Voided</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {(!bols || bols.length === 0) && (
          <div className="text-center py-8 text-gray-500">
            No BOLs found. Generate BOLs from the shipping process to see them here.
          </div>
        )}
      </div>

      {bols && bols.length > 0 && (
        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <div className="text-sm text-gray-600">
            <span className="font-medium">{bols.length}</span> BOL{bols.length !== 1 ? 's' : ''} total
            {' | '}
            <span className="font-medium">
              {bols.filter(b => b.Status === 'Generated').length}
            </span> generated
            {' | '}
            <span className="font-medium">
              {bols.filter(b => b.Status === 'Shipped').length}
            </span> shipped
            {' | '}
            <span className="font-medium">
              {bols.filter(b => b.Status === 'Voided').length}
            </span> voided
          </div>
        </div>
      )}
    </div>
  );
};

export default BOLManager;