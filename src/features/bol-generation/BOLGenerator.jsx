import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useFirestoreCollection } from '../../hooks/useFirestore';
import { addDoc, updateDoc, collection, doc } from 'firebase/firestore';
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
  const { data: items } = useFirestoreCollection('items');
  const { data: sizes } = useFirestoreCollection('sizes');

  const [selectedReleaseId, setSelectedReleaseId] = useState(preSelectedRelease?.id || '');
  const [selectedCarrierId, setSelectedCarrierId] = useState('');
  const [selectedTruckId, setSelectedTruckId] = useState('');
  const [trailerNumber, setTrailerNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [bolPreviewData, setBolPreviewData] = useState(null);

  // Get available releases
 // Get available releases (exclude already shipped releases)
  const availableReleases = releases?.filter(r => 
  r.Status === 'Available' && !r.BOLNumber
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
      const prefix = supplier?.BOLPrefix || 'BOL';
      const bolNumber = `${prefix}${String(Date.now()).slice(-5)}`;

      // Prepare line items with full details
      const lineItemsWithDetails = selectedRelease.LineItems?.map(lineItem => {
        const item = items?.find(i => i.id === lineItem.ItemId);
        const size = sizes?.find(s => s.id === lineItem.SizeId);
        
        return {
          itemCode: item?.ItemCode || 'Unknown',
          itemName: item?.ItemName || 'Unknown Item',
          sizeName: size?.SizeName || 'Unknown Size',
          quantity: lineItem.Quantity,
          lotNumber: lineItem.LotId ? `LOT${lineItem.LotId.slice(-6)}` : 'TBD',
          barcode: `Y${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`
        };
      }) || [];

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
        // Store form state for approval
        formData: {
          selectedReleaseId,
          selectedCarrierId,
          selectedTruckId,
          trailerNumber
        }
      };

      setBolPreviewData(previewData);
      setShowPreview(true);

    } catch (error) {
      console.error('Error preparing BOL preview:', error);
      alert('Failed to prepare BOL preview');
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
        CreatedAt: new Date(),
        SupplierId: selectedRelease.SupplierId,
        CustomerId: selectedRelease.CustomerId,
        LineItems: previewData.items
      };

      await addDoc(collection(db, 'bols'), bolData);

      // Update release status
      await updateDoc(doc(db, 'releases', selectedReleaseId), {
        Status: 'Shipped',
        ShippedAt: new Date(),
        BOLNumber: previewData.bolNumber
      });

      alert('BOL generated and approved successfully!');
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
              Select Release *
            </label>
            <select
              value={selectedReleaseId}
              onChange={(e) => setSelectedReleaseId(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            >
              <option value="">Choose a release...</option>
              {availableReleases.map(release => (
                <option key={release.id} value={release.id}>
                  Release #{release.ReleaseNumber} - {getSupplierName(release.SupplierId)} → {getCustomerName(release.CustomerId)}
                </option>
              ))}
            </select>
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
                <p>Line Items: {selectedRelease.TotalItems || selectedRelease.LineItems?.length || 0}</p>
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
              {loading ? 'Preparing Preview...' : 'Preview Bill of Lading'}
            </button>
          </div>
        </div>
      </div>

      {/* BOL Preview Modal */}
      {showPreview && bolPreviewData && (
        <BOLPreview
          bolData={bolPreviewData}
          onApprove={handleApproveBOL}
          onEdit={handleEditBOL}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}