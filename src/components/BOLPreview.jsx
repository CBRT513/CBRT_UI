import React, { useState, useEffect } from 'react';
import { BOLPdfService } from '../services/bolPdfService';

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

      // Generate PDF using static method - adjust data structure
      const pdfDoc = BOLPdfService.generateBOL(
        bolData, // The BOL data itself
        bolData.release || {},
        bolData.supplier || {},
        bolData.customer || {},
        bolData.carrier || {},
        bolData.truck || {}
      );

      // Convert to blob URL for preview
      const pdfBlob = BOLPdfService.getPDFBlob(pdfDoc);
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);

    } catch (error) {
      console.error('Error generating PDF preview:', error);
      setError(`Failed to generate PDF preview: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh]">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">BOL Preview - {bolData?.BOLNumber}</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
          </div>
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Generating PDF preview...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh]">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">BOL Preview - {bolData?.BOLNumber}</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
          </div>
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded mb-4">
            {error}
          </div>
          <div className="flex justify-end space-x-3">
            <button onClick={onEdit} className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
              Edit BOL
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[95vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">BOL Preview - {bolData?.BOLNumber}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        {pdfUrl && (
          <div className="flex-1 mb-4 flex items-center justify-center border rounded bg-gray-50">
            <div className="text-center">
              <div className="text-lg font-medium mb-4">PDF Generated Successfully</div>
              <button
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = pdfUrl;
                  link.download = `BOL-${bolData?.BOLNumber || 'preview'}.pdf`;
                  link.click();
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mb-2"
              >
                Download PDF to View
              </button>
              <div className="text-sm text-gray-600">
                (PDF preview in browser not supported - download to view)
              </div>
            </div>
          </div>
        )}

        <div className="border-t pt-4">
          <div className="grid grid-cols-4 gap-4 text-sm mb-4">
            <div><strong>Release:</strong> {bolData.release?.ReleaseNumber}</div>
            <div><strong>Supplier:</strong> {bolData.supplier?.SupplierName}</div>
            <div><strong>Customer:</strong> {bolData.customer?.CustomerName}</div>
            <div><strong>Carrier:</strong> {bolData.carrier?.CarrierName}</div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={onEdit}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Edit BOL
            </button>
            <button
              onClick={onApprove}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Approve & Generate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}