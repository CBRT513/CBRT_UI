// File: /Users/cerion/CBRT_UI/src/features/bol-generation/BOLGenerator.jsx
// Updated to use actual staging records instead of fake data

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useFirestoreCollection } from '../../hooks/useFirestore';
import { addDoc, updateDoc, collection, doc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import BOLPreview from "../../components/BOLPreview";

export default function BOLGenerator() {
  const location = useLocation();
  const navigate = useNavigate();
  const preSelectedRelease = location.state?.selectedRelease;
  
  const { data: releases } = useFirestoreCollection('releases');
  const { data: carriers } = useFirestoreCollection('carriers');
  const { data: trucks } = useFirestoreCollection('trucks');
  const { data: suppliers } = useFirestoreCollection('suppliers');
  const { data: customers } = useFirestoreCollection('customers');
  
  const [selectedReleaseId, setSelectedReleaseId] = useState(preSelectedRelease?.id || '');
  const [selectedCarrierId, setSelectedCarrierId] = useState('');
  const [selectedTruckId, setSelectedTruckId] = useState('');
  const [trailerNumber, setTrailerNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [bolPreviewData, setBolPreviewData] = useState(null);

  // Get available releases (only verified releases can generate BOLs)
  const availableReleases = releases?.filter(r => 
    r.Status === 'Verified' && !r.BOLNumber 
  ) || [];

  // Get selected release
  const selectedRelease = availableReleases.find(r => r.id === selectedReleaseId);

  // Get supplier and customer names
  const getSupplierName = (supplierId) => suppliers?.find(s => s.id === supplierId)?.SupplierName || 'Unknown';
  const getCustomerName = (customerId) => customers?.find(c => c.id === customerId)?.CustomerName || 'Unknown';

  // Get trucks for selected carrier
  const availableTrucks = trucks?.filter(t => t.CarrierId === selectedCarrierId && t.Status === 'Active') || [];

  // Get selected truck details
  const selectedTruck = trucks?.find(t => t.id === selectedTruckId);

  // Auto-set trailer when truck is selected
  useEffect(() => {
    if (selectedTruck) {
      setTrailerNumber(selectedTruck.TrailerNumber || '');
    }
  }, [selectedTruck]);

  // Generate sequential BOL number for supplier
  const generateBOLNumber = async (supplier) => {
    try {
      // Query existing BOLs for this supplier to find the next number
      const bolQuery = query(
        collection(db, 'bols'), 
        where('SupplierId', '==', supplier.id)
      );
      const bolSnapshot = await getDocs(bolQuery);
      
      // Extract numbers from existing BOL numbers for this supplier
      const existingNumbers = bolSnapshot.docs
        .map(doc => doc.data().BOLNumber)
        .filter(bolNum => bolNum && bolNum.startsWith(supplier.BOLPrefix))
        .map(bolNum => {
          const numPart = bolNum.replace(supplier.BOLPrefix, '');
          return parseInt(numPart) || 0;
        });
      
      // Find the next sequential number
      const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
      
      // Format with leading zeros (4 digits)
      const formattedNumber = String(nextNumber).padStart(4, '0');
      
      return `${supplier.BOLPrefix}${formattedNumber}`;
    } catch (error) {
      console.error('Error generating BOL number:', error);
      // Fallback to timestamp-based number
      return `${supplier.BOLPrefix}${String(Date.now()).slice(-4)}`;
    }
  };

  // Load actual staging records for the verified release
  const loadStagingRecords = async (releaseId) => {
    try {
      const stagingQuery = query(
        collection(db, 'staging'),
        where('releaseId', '==', releaseId)
      );
      const stagingSnapshot = await getDocs(stagingQuery);
      
      const stagingRecords = stagingSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Verify this release has been verified (should have verification record)
      const verificationQuery = query(
        collection(db, 'verifications'),
        where('releaseId', '==', releaseId),
        where('status', '==', 'approved')
      );
      const verificationSnapshot = await getDocs(verificationQuery);
      
      if (verificationSnapshot.empty) {
        throw new Error('Release has not been verified');
      }
      
      return stagingRecords;
    } catch (error) {
      console.error('Error loading staging records:', error);
      throw error;
    }
  };

  const handlePreviewBOL = async () => {
    if (!selectedReleaseId || !selectedCarrierId || !selectedTruckId) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      // Get all related data
      const supplier = suppliers?.find(s => s.id === selectedRelease.SupplierId);
      const customer = customers?.find(c => c.id === selectedRelease.CustomerId);
      const carrier = carriers?.find(c => c.id === selectedCarrierId);
      const truck = trucks?.find(t => t.id === selectedTruckId);

      // Generate BOL number
      const bolNumber = await generateBOLNumber(supplier);

      // Load actual staging records (verified barcode data)
      const stagingRecords = await loadStagingRecords(selectedReleaseId);

      if (stagingRecords.length === 0) {
        throw new Error('No staging records found for this release');
      }

      // Format staging records as BOL line items
      const lineItemsWithDetails = stagingRecords.map(record => ({
        barcode: record.barcode,
        itemCode: record.itemCode,
        itemName: record.itemName,
        sizeName: record.sizeName,
        quantity: record.quantity,
        lotNumber: record.lotNumber,
        // Calculate total weight for this barcode (quantity * standard weight)
        weight: record.quantity * 2200, // TODO: Get actual weight from barcode record
        pallets: 'N' // As per your BOL example
      }));

      // Calculate totals
      const totalSacks = stagingRecords.reduce((sum, record) => sum + record.quantity, 0);
      const totalWeight = lineItemsWithDetails.reduce((sum, item) => sum + item.weight, 0);

      // Prepare preview data
      const previewData = {
        bolNumber,
        releaseNumber: selectedRelease.ReleaseNumber,
        release: selectedRelease,
        supplier,
        customer,
        carrier,
        truck: {
          ...truck,
          TrailerNumber: trailerNumber
        },
        items: lineItemsWithDetails,
        totals: {
          totalSacks,
          totalPallets: 0,
          totalWeight
        },
        // Store form state for approval
        formData: {
          selectedReleaseId,
          selectedCarrierId,
          selectedTruckId,
          trailerNumber
        }
      };

      console.log('BOL Preview Data with Real Staging Records:', previewData);
      setBolPreviewData(previewData);
      setShowPreview(true);

    } catch (error) {
      console.error('Error preparing BOL preview:', error);
      alert(`Failed to prepare BOL preview: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveBOL = async (previewData) => {
    setLoading(true);
    try {
      // Create BOL record
      const bolData = {
        BOLNumber: previewData.bolNumber,
        ReleaseId: selectedReleaseId,
        CarrierId: selectedCarrierId,
        TruckId: selectedTruckId,
        TrailerNumber: trailerNumber,
        Status: 'Generated',
        CreatedAt: new Date().toISOString(),
        SupplierId: selectedRelease.SupplierId,
        CustomerId: selectedRelease.CustomerId,
        LineItems: previewData.items,
        Totals: previewData.totals
      };

      const bolRef = await addDoc(collection(db, 'bols'), bolData);

      // Update release status
      await updateDoc(doc(db, 'releases', selectedReleaseId), {
        Status: 'Shipped',
        ShippedAt: new Date().toISOString(),
        BOLNumber: previewData.bolNumber,
        BOLId: bolRef.id
      });

      alert(`BOL ${previewData.bolNumber} generated and approved successfully!`);
      navigate('/bolmanager');
      
    } catch (error) {
      console.error('Error approving BOL:', error);
      alert('Failed to approve BOL');
    } finally {
      setLoading(false);
    }
  };

  const handleEditBOL = () => {
    setShowPreview(false);
    // User stays on current form to make changes
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Generate Bill of Lading</h1>
        
        <div className="space-y-6">
          {/* Release Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Verified Release *
            </label>
            <select
              value={selectedReleaseId}
              onChange={(e) => setSelectedReleaseId(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            >
              <option value="">Choose a verified release...</option>
              {availableReleases.map(release => (
                <option key={release.id} value={release.id}>
                  Release #{release.ReleaseNumber} - {getSupplierName(release.SupplierId)} → {getCustomerName(release.CustomerId)}
                </option>
              ))}
            </select>
            {selectedReleaseId && availableReleases.length === 0 && (
              <p className="text-sm text-amber-600 mt-1">
                No verified releases available. Releases must be staged and verified before BOL generation.
              </p>
            )}
          </div>

          {/* Carrier Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Carrier *
            </label>
            <select
              value={selectedCarrierId}
              onChange={(e) => {
                setSelectedCarrierId(e.target.value);
                setSelectedTruckId(''); // Reset truck selection
              }}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            >
              <option value="">Select Carrier</option>
              {carriers?.map(carrier => (
                <option key={carrier.id} value={carrier.id}>
                  {carrier.CarrierName}
                </option>
              ))}
            </select>
          </div>

          {/* Truck Selection */}
          {selectedCarrierId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Truck Number *
              </label>
              <select
                value={selectedTruckId}
                onChange={(e) => setSelectedTruckId(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              >
                <option value="">Select Truck</option>
                {availableTrucks.map(truck => (
                  <option key={truck.id} value={truck.id}>
                    {truck.TruckNumber}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Trailer Number */}
          {selectedTruckId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trailer Number
              </label>
              <input
                type="text"
                value={trailerNumber}
                onChange={(e) => setTrailerNumber(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Trailer number"
              />
            </div>
          )}

          {/* Release Details */}
          {selectedRelease && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">Release Details</h3>
              <div className="text-sm text-gray-600">
                <p>Release #: {selectedRelease.ReleaseNumber}</p>
                <p>Supplier: {getSupplierName(selectedRelease.SupplierId)}</p>
                <p>Customer: {getCustomerName(selectedRelease.CustomerId)}</p>
                <p>Status: <span className="font-medium text-green-600">{selectedRelease.Status}</span></p>
                <p>Verified: {selectedRelease.VerifiedAt ? new Date(selectedRelease.VerifiedAt).toLocaleDateString() : 'N/A'}</p>
              </div>
            </div>
          )}

          {/* Preview Button */}
          <div className="flex justify-end">
            <button
              onClick={handlePreviewBOL}
              disabled={loading || !selectedReleaseId || !selectedCarrierId || !selectedTruckId}
              className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading Staging Data...' : 'Preview Bill of Lading'}
            </button>
          </div>
        </div>
      </div>

      {/* BOL Preview Modal */}
      {showPreview && bolPreviewData && (
        <BOLPreview
          bolData={bolPreviewData}
          onApprove={() => handleApproveBOL(bolPreviewData)}
          onEdit={handleEditBOL}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}