// File: /Users/cerion/CBRT_UI/src/components/BOLPreview.jsx
// Updated to work with ES module jsPDF

import React, { useState, useEffect } from 'react';
import BOLPDFService from '../services/bolPDFService';

export default function BOLPreview({ bolData, onApprove, onEdit, onClose }) {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    generatePreview();
  }, [bolData]);

  const generatePreview = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('BOL Data structure:', JSON.stringify(bolData, null, 2));
      
      // Generate PDF document
      const pdfDoc = await BOLPDFService.generateBOL(bolData);
      
      // Get blob and convert to URL manually
      const pdfBlob = BOLPDFService.getPDFBlob(pdfDoc);
      console.log('Generated PDF Blob:', pdfBlob);
      
      // Convert blob to URL for iframe
      const previewUrl = URL.createObjectURL(pdfBlob);
      console.log('Created PDF URL:', previewUrl);
      setPdfUrl(previewUrl);
      
    } catch (error) {
      console.error('Error generating PDF preview:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (pdfUrl) {
      // Open PDF in new window for printing
      const printWindow = window.open(pdfUrl, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
          printWindow.print(); // Print second copy
          printWindow.print(); // Print third copy
        };
      }
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg">
          <div className="text-center">Generating BOL Preview...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg max-w-md">
          <div className="text-red-600 mb-4">Error: {error}</div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Close
            </button>
            <button
              onClick={generatePreview}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-11/12 h-5/6 flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-bold">BOL Preview - {bolData.bolNumber}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* PDF Preview */}
        <div className="flex-1 p-4">
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full border rounded"
              title="BOL Preview"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500">No preview available</div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center p-4 border-t bg-gray-50">
          {/* BOL Summary */}
          <div className="text-sm text-gray-600">
            <div>BOL: {bolData.bolNumber}</div>
            <div>{bolData.customer?.CustomerName} | {bolData.carrier?.CarrierName}</div>
            <div>{bolData.totals?.totalSacks} sacks, {bolData.totals?.totalWeight?.toLocaleString()} lbs</div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={onEdit}
              className="px-6 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
            >
              Edit BOL
            </button>
            <button
              onClick={() => {
                handlePrint();
                onApprove();
              }}
              className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Approve & Print (3 copies)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}