import React from 'react';
import { useFirestoreCollection } from '../hooks/useFirestore';
import { useNavigate } from 'react-router-dom';
import { TableSkeleton } from '../components/LoadingStates';
import { formatDate } from '../utils';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';

export default function Releases() {
  const navigate = useNavigate();
  const { data: releases, loading: releasesLoading } = useFirestoreCollection('releases');
  const { data: suppliers } = useFirestoreCollection('suppliers');
  const { data: customers } = useFirestoreCollection('customers');

  const getSupplierName = (supplierId) => {
    if (!suppliers || !supplierId) return 'Unknown';
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier?.SupplierName || 'Unknown';
  };

  const getCustomerName = (customerId) => {
    if (!customers || !customerId) return 'Unknown';
    const customer = customers.find(c => c.id === customerId);
    return customer?.CustomerName || 'Unknown';
  };

  const handleReleaseClick = (release) => {
    navigate(`/release-details/${release.id}`);
  };

  const handleGenerateBOL = (release) => {
    navigate('/bolgenerator', { state: { selectedRelease: release } });
  };

  const handleCancelRelease = async (release) => {
    if (!window.confirm(`Cancel release ${release.ReleaseNumber}?`)) return;
    try {
      await updateDoc(doc(db, 'releases', release.id), {
        Status: 'Cancelled',
        CancelledAt: new Date()
      });
    } catch (error) {
      console.error('Error cancelling release:', error);
      alert('Failed to cancel release');
    }
  };

  if (releasesLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Open Releases</h1>
          <TableSkeleton rows={5} columns={6} />
        </div>
      </div>
    );
  }

  // Updated filter to include both 'Available' and 'Entered' status releases
  const openReleases = releases?.filter(release =>
    (release.Status === 'Available' || release.Status === 'Entered') && !release.BOLNumber
  ) || [];

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Open Releases</h1>
          <button
            onClick={() => navigate('/enterarelease')}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            + Add Release
          </button>
        </div>

        {openReleases.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-500 mb-4">No open releases found</div>
            <button
              onClick={() => navigate('/enterarelease')}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              Create First Release
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Release #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pickup Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Line Items</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {openReleases.map((release, index) => (
                  <tr key={release.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleReleaseClick(release)}
                        className="text-green-600 hover:text-green-800 font-medium underline"
                      >
                        {release.ReleaseNumber}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getSupplierName(release.SupplierId)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getCustomerName(release.CustomerId)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {release.PickupDate ? formatDate(release.PickupDate) : 'Not scheduled'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {release.TotalItems || release.LineItems?.length || 0} items
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleGenerateBOL(release)}
                        className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        Generate BOL
                      </button>
                      <button
                        onClick={() => handleCancelRelease(release)}
                        className="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleReleaseClick(release)}
                        className="text-green-600 hover:text-green-800"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {openReleases.length > 0 && (
          <div className="mt-6 bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{openReleases.length}</span> open release{openReleases.length !== 1 ? 's' : ''} ready for BOL generation
            </div>
          </div>
        )}
      </div>
    </div>
  );
}