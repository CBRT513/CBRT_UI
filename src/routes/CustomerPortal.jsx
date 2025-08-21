import React, { useState, useEffect } from 'react';
import { useFirestoreCollection } from '../hooks/useFirestore';
import { TableSkeleton, ErrorDisplay, EmptyState } from '../components/LoadingStates';
import { formatDate } from '../utils';
import { auth } from '../firebase/config';
import { query, where, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { generateSingleBOL } from '../services/bolService';

export default function CustomerPortal() {
  const [customerData, setCustomerData] = useState(null);
  const [customerReleases, setCustomerReleases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const { data: allCustomers } = useFirestoreCollection('customers');
  const user = auth.currentUser || { id: 'anonymous', displayName: 'Customer Portal User' };

  // For demo purposes, allow selection of customer. In production, this would be based on authenticated user
  const handleCustomerSelect = async (customerId) => {
    if (!customerId) {
      setSelectedCustomerId(null);
      setCustomerData(null);
      setCustomerReleases([]);
      return;
    }

    setLoading(true);
    setSelectedCustomerId(customerId);
    
    try {
      // Find customer data
      const customer = allCustomers?.find(c => c.id === customerId);
      setCustomerData(customer);

      // Fetch releases for this customer
      const releasesQuery = query(
        collection(db, 'releases'),
        where('CustomerId', '==', customerId)
      );
      
      const releasesSnapshot = await getDocs(releasesQuery);
      const releases = releasesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setCustomerReleases(releases);
    } catch (err) {
      console.error('Error fetching customer data:', err);
      setError('Failed to load customer data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedCustomerId) {
      setLoading(false);
    }
  }, [selectedCustomerId]);

  const handleDownloadBOL = async (release) => {
    try {
      await generateSingleBOL(release.id, user);
    } catch (error) {
      console.error('Error generating BOL:', error);
      alert('Failed to generate BOL: ' + error.message);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'available':
      case 'entered':
        return 'bg-yellow-100 text-yellow-800';
      case 'staged':
        return 'bg-blue-100 text-blue-800';
      case 'verified':
        return 'bg-green-100 text-green-800';
      case 'loading':
        return 'bg-orange-100 text-orange-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && selectedCustomerId) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Customer Portal</h1>
          <TableSkeleton rows={5} columns={6} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <ErrorDisplay message={error} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Customer Portal</h1>
          
          {/* Customer Selection - In production, this would be automatic based on auth */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Customer (Demo Mode)
            </label>
            <select
              value={selectedCustomerId || ''}
              onChange={(e) => handleCustomerSelect(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
            >
              <option value="">-- Select Customer --</option>
              {allCustomers?.map(customer => (
                <option key={customer.id} value={customer.id}>
                  {customer.CustomerName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!selectedCustomerId ? (
          <EmptyState
            title="Welcome to Customer Portal"
            description="Select your company above to view your releases and BOL documents"
            actionLabel="Select Customer"
            onAction={() => {}} // No action needed, selection is above
          />
        ) : !customerData ? (
          <ErrorDisplay message="Customer not found" />
        ) : (
          <>
            {/* Customer Info Section */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                {customerData.CustomerName}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                {customerData.ContactName && (
                  <div>
                    <span className="font-medium">Contact:</span> {customerData.ContactName}
                  </div>
                )}
                {customerData.Phone && (
                  <div>
                    <span className="font-medium">Phone:</span> {customerData.Phone}
                  </div>
                )}
                {customerData.Address && (
                  <div>
                    <span className="font-medium">Address:</span> {customerData.Address}
                  </div>
                )}
                {(customerData.City || customerData.State) && (
                  <div>
                    <span className="font-medium">Location:</span> {customerData.City}, {customerData.State}
                  </div>
                )}
              </div>
            </div>

            {/* Releases Section */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Releases</h2>
              
              {customerReleases.length === 0 ? (
                <EmptyState
                  title="No releases found"
                  description="You don't have any releases in the system yet"
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Release #
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Pickup Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Items
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Weight
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {customerReleases.map((release, index) => (
                        <tr key={release.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {release.ReleaseNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(release.Status)}`}>
                              {release.Status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {release.PickupDate ? formatDate(release.PickupDate) : 'Not scheduled'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {release.TotalItems || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {release.TotalWeight ? `${release.TotalWeight} lbs` : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {(release.Status === 'Completed' || release.Status === 'Loading') && (
                              <button
                                onClick={() => handleDownloadBOL(release)}
                                className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                Download BOL
                              </button>
                            )}
                            {release.Status === 'Available' && (
                              <span className="text-gray-500 text-sm">BOL not ready</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Summary Stats */}
            {customerReleases.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-600">Total Releases:</span>
                    <div className="text-lg font-semibold text-gray-900">{customerReleases.length}</div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Completed:</span>
                    <div className="text-lg font-semibold text-green-600">
                      {customerReleases.filter(r => r.Status === 'Completed').length}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">In Progress:</span>
                    <div className="text-lg font-semibold text-blue-600">
                      {customerReleases.filter(r => ['Staged', 'Verified', 'Loading'].includes(r.Status)).length}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Pending:</span>
                    <div className="text-lg font-semibold text-yellow-600">
                      {customerReleases.filter(r => ['Available', 'Entered'].includes(r.Status)).length}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}