import React, { useState } from 'react';
import { useFirestoreCollection } from '../hooks/useFirestore';
import { useNavigate } from 'react-router-dom';
import { TableSkeleton } from '../components/LoadingStates';
import { formatDate } from '../utils';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { SelectableTable, TableHeaders, TableHeader, TableCell } from '../components/SelectableTable';
import { generateBulkBOLs, generateSingleBOL } from '../services/bolService';
import { auth } from '../firebase/config';

export default function Releases() {
  const navigate = useNavigate();
  const user = auth.currentUser || { id: 'anonymous', displayName: 'Anonymous User' };
  const { data: releases, loading: releasesLoading } = useFirestoreCollection('releases');
  const { data: suppliers } = useFirestoreCollection('suppliers');
  const { data: customers } = useFirestoreCollection('customers');
  const [bulkOperationsLoading, setBulkOperationsLoading] = useState(false);
  const [selectedReleases, setSelectedReleases] = useState([]);

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

  const handleGenerateBOL = async (release) => {
    try {
      await generateSingleBOL(release.id, user);
    } catch (error) {
      console.error('Error generating BOL:', error);
      alert('Failed to generate BOL: ' + error.message);
    }
  };

  const handleBulkGenerateBOL = async (selectedIds) => {
    if (selectedIds.length === 0) {
      alert('Please select releases to generate BOLs for');
      return;
    }

    if (!window.confirm(`Generate BOLs for ${selectedIds.length} release${selectedIds.length === 1 ? '' : 's'}?`)) {
      return;
    }

    setBulkOperationsLoading(true);
    try {
      await generateBulkBOLs(selectedIds, user);
    } catch (error) {
      console.error('Error generating bulk BOLs:', error);
      alert('Failed to generate bulk BOLs: ' + error.message);
    } finally {
      setBulkOperationsLoading(false);
    }
  };

  const handleSelectionChange = (selectedIds, selectedItems) => {
    setSelectedReleases(selectedItems);
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
          <SelectableTable
            data={openReleases}
            onSelectionChange={handleSelectionChange}
            entityType="releases"
            batchActions={[
              {
                label: 'Generate BOLs',
                icon: '📄',
                action: handleBulkGenerateBOL,
                disabled: bulkOperationsLoading,
                variant: 'primary'
              }
            ]}
          >
            <TableHeaders>
              <TableHeader>Release #</TableHeader>
              <TableHeader>Supplier</TableHeader>
              <TableHeader>Customer</TableHeader>
              <TableHeader>Pickup Date</TableHeader>
              <TableHeader>Line Items</TableHeader>
              <TableHeader>Actions</TableHeader>
            </TableHeaders>
            <tbody className="bg-white divide-y divide-gray-200">
              {openReleases.map((release, index) => (
                <tr key={release.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <TableCell>
                    <button
                      onClick={() => handleReleaseClick(release)}
                      className="text-green-600 hover:text-green-800 font-medium underline"
                    >
                      {release.ReleaseNumber}
                    </button>
                  </TableCell>
                  <TableCell>
                    {getSupplierName(release.SupplierId)}
                  </TableCell>
                  <TableCell>
                    {getCustomerName(release.CustomerId)}
                  </TableCell>
                  <TableCell>
                    {release.PickupDate ? formatDate(release.PickupDate) : 'Not scheduled'}
                  </TableCell>
                  <TableCell>
                    {release.TotalItems || release.LineItems?.length || 0} items
                  </TableCell>
                  <TableCell className="space-x-2">
                    <button
                      onClick={() => handleGenerateBOL(release)}
                      disabled={bulkOperationsLoading}
                      className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      Generate BOL
                    </button>
                    <button
                      onClick={() => handleCancelRelease(release)}
                      disabled={bulkOperationsLoading}
                      className="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleReleaseClick(release)}
                      className="text-green-600 hover:text-green-800"
                    >
                      View Details
                    </button>
                  </TableCell>
                </tr>
              ))}
            </tbody>
          </SelectableTable>
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