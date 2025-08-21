import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFirestoreCollection } from '../hooks/useFirestore';
import { TableSkeleton } from '../components/LoadingStates';
import { formatDate } from '../utils';

export default function ReleaseDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: releases } = useFirestoreCollection('releases');
  const { data: suppliers } = useFirestoreCollection('suppliers');
  const { data: customers } = useFirestoreCollection('customers');
  const { data: items } = useFirestoreCollection('items');
  const { data: sizes } = useFirestoreCollection('sizes');

  const release = releases?.find(r => r.id === id);
  const supplier = suppliers?.find(s => s.id === release?.SupplierId);
  const customer = customers?.find(c => c.id === release?.CustomerId);

  if (!release) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Release Not Found</h1>
          <button
            onClick={() => navigate('/releases')}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
          >
            Back to Releases
          </button>
        </div>
      </div>
    );
  }

  const getItemName = (itemId) => items?.find(i => i.id === itemId)?.ItemName || 'Unknown';
  const getSizeName = (sizeId) => sizes?.find(s => s.id === sizeId)?.SizeName || 'Unknown';

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Release Details</h1>
          <button
            onClick={() => navigate('/releases')}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
          >
            Back to Releases
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Release Information</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Release #:</span> {release.ReleaseNumber}</p>
              <p><span className="font-medium">Status:</span> <span className="bg-green-100 text-green-800 px-2 py-1 rounded">{release.Status}</span></p>
              <p><span className="font-medium">Pickup Date:</span> {release.PickupDate ? formatDate(release.PickupDate) : 'Not scheduled'}</p>
              <p><span className="font-medium">Created:</span> {formatDate(release.CreatedAt)}</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Parties</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Supplier:</span> {supplier?.SupplierName || 'Unknown'}</p>
              <p><span className="font-medium">Customer:</span> {customer?.CustomerName || 'Unknown'}</p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Line Items</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {release.LineItems?.map((item, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getItemName(item.ItemId)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getSizeName(item.SizeId)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.Quantity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {release.attachments?.releaseDocUrl && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Attachments</h3>
            <a 
              href={release.attachments.releaseDocUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              View Release Document
            </a>
          </div>
        )}
        
        {release.carrierMode === 'CustomerArranged' && release.status === 'Loaded' && !release.attachments?.adjunctBolUrl && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800">Adjunct BOL pending - Customer arranged carrier</p>
          </div>
        )}
        
        <div className="mt-6 flex space-x-4">
          <button
            onClick={() => navigate('/bolgenerator', { state: { selectedRelease: release } })}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Generate BOL
          </button>
        </div>
      </div>
    </div>
  );
}