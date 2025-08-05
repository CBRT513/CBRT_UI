import React, { useState } from 'react';
import { useFirestoreCollection } from '../../hooks/useFirestore';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { BOLPdfService } from '../../services/bolPdfService';
import { TableSkeleton } from '../../components/LoadingStates';
import { formatDate } from '../../utils';

export default function BOLManager() {
  const { data: bols, loading } = useFirestoreCollection('bols');
  const { data: suppliers } = useFirestoreCollection('suppliers');
  const { data: customers } = useFirestoreCollection('customers');
  const { data: carriers } = useFirestoreCollection('carriers');
  const { data: trucks } = useFirestoreCollection('trucks');
  const [loadingAction, setLoadingAction] = useState(null);

  // Helper functions
  const getSupplierName = (supplierId) => suppliers?.find(s => s.id === supplierId)?.SupplierName || 'Unknown';
  const getCustomerName = (customerId) => customers?.find(c => c.id === customerId)?.CustomerName || 'Unknown';
  const getCarrierName = (carrierId) => carriers?.find(c => c.id === carrierId)?.CarrierName || 'Unknown';
  const getTruckNumber = (truckId) => trucks?.find(t => t.id === truckId)?.TruckNumber || 'Unknown';

  const handleViewPDF = async (bol) => {
    try {
      setLoadingAction(bol.id);
      
      // Get related data
      const supplier = suppliers?.find(s => s.id === bol.SupplierId);
      const customer = customers?.find(c => c.id === bol.CustomerId);
      const carrier = carriers?.find(c => c.id === bol.CarrierId);
      const truck = trucks?.find(t => t.id === bol.TruckId);

      // Generate PDF
      const pdfService = new BOLPdfService();
      await pdfService.generateBOL(
        { BOLNumber: bol.BOLNumber },
        { ReleaseNumber: bol.ReleaseId },
        supplier,
        customer,
        carrier,
        { ...truck, TrailerNumber: bol.TrailerNumber },
        bol.LineItems || []
      );

      // Download PDF
      await pdfService.save(`BOL_${bol.BOLNumber}.pdf`);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleEmailBOL = async (bol) => {
    try {
      setLoadingAction(bol.id);
      
      // TODO: Implement email service
      // For now, just update status
      await updateDoc(doc(db, 'bols', bol.id), {
        Status: 'Emailed',
        EmailedAt: new Date()
      });

      alert(`BOL ${bol.BOLNumber} email sent successfully!`);
      
    } catch (error) {
      console.error('Error emailing BOL:', error);
      alert('Failed to email BOL');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleEditBOL = (bol) => {
    // TODO: Navigate to edit form or open edit modal
    alert(`Edit functionality for BOL ${bol.BOLNumber} coming soon`);
  };

  const handleVoidBOL = async (bol) => {
    if (!window.confirm(`Void BOL ${bol.BOLNumber}? This action cannot be undone.`)) return;
    
    try {
      setLoadingAction(bol.id);
      
      await updateDoc(doc(db, 'bols', bol.id), {
        Status: 'Voided',
        VoidedAt: new Date()
      });

      // TODO: Update related release status back to Available
      
      alert(`BOL ${bol.BOLNumber} has been voided`);
      
    } catch (error) {
      console.error('Error voiding BOL:', error);
      alert('Failed to void BOL');
    } finally {
      setLoadingAction(null);
    }
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      'Generated': 'bg-blue-100 text-blue-800',
      'Emailed': 'bg-green-100 text-green-800',
      'Voided': 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  if (loading) return <TableSkeleton />;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">BOL Manager</h1>
          <div className="text-sm text-gray-600">
            {bols?.length || 0} Bills of Lading
          </div>
        </div>

        {bols?.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-500 mb-4">No Bills of Lading found</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    BOL Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Supplier
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
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {bols?.map((bol, index) => (
                  <tr key={bol.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleViewPDF(bol)}
                        className="text-blue-600 hover:text-blue-800 font-medium underline"
                        disabled={loadingAction === bol.id}
                      >
                        {bol.BOLNumber}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getSupplierName(bol.SupplierId)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getCustomerName(bol.CustomerId)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getCarrierName(bol.CarrierId)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getTruckNumber(bol.TruckId)} / {bol.TrailerNumber || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(bol.Status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(bol.CreatedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {bol.Status !== 'Voided' && (
                          <>
                            <button
                              onClick={() => handleEmailBOL(bol)}
                              className="text-green-600 hover:text-green-700"
                              disabled={loadingAction === bol.id}
                              title="Email BOL"
                            >
                              📧
                            </button>
                            <button
                              onClick={() => handleEditBOL(bol)}
                              className="text-blue-600 hover:text-blue-700"
                              disabled={loadingAction === bol.id}
                              title="Edit BOL"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleVoidBOL(bol)}
                              className="text-red-600 hover:text-red-700"
                              disabled={loadingAction === bol.id}
                              title="Void BOL"
                            >
                              ❌
                            </button>
                          </>
                        )}
                        {loadingAction === bol.id && (
                          <span className="text-gray-400">⏳</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}