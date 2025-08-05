// File: /Users/cerion/CBRT_UI/src/routes/PDFTestPage.jsx
import React, { useState } from 'react';
import { PickTicketService } from '../services/pickTicketService';

export default function PDFTestPage() {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [error, setError] = useState('');

  // Sample data for testing
  const sampleReleaseData = {
    ReleaseNumber: 'TEST-001',
    PickupDate: '2025-08-05',
    TotalItems: 3,
    TotalWeight: 6600
  };

  const sampleSupplier = {
    SupplierName: 'YAS (Your American Supplier)'
  };

  const sampleCustomer = {
    CustomerName: 'URC Manufacturing',
    ContactName: 'John Smith',
    Address: '123 Industrial Way',
    City: 'Cincinnati',
    State: 'OH',
    ZipCode: '45202'
  };

  const sampleLineItems = [
    {
      Barcode: 'BC001234567890',
      itemCode: 'STEEL',
      itemName: 'Steel Reinforcement Bars',
      sizeName: '12mm x 6m',
      lotNumber: 'LOT-2025-001',
      Quantity: 10
    },
    {
      Barcode: 'BC001234567891',
      itemCode: 'CONC',
      itemName: 'Concrete Mix Premium Grade',
      sizeName: '50kg bags',
      lotNumber: 'LOT-2025-002',
      Quantity: 25
    },
    {
      Barcode: 'BC001234567892',
      itemCode: 'PIPE',
      itemName: 'PVC Pipe Schedule 40',
      sizeName: '4 inch x 10ft',
      lotNumber: 'LOT-2025-003',
      Quantity: 15
    }
  ];

  const generateTestPDF = () => {
    try {
      setError('');
      
      console.log('Generating test PDF with data:', {
        releaseData: sampleReleaseData,
        supplier: sampleSupplier,
        customer: sampleCustomer,
        lineItems: sampleLineItems
      });

      const doc = PickTicketService.generatePickTicket(
        sampleReleaseData,
        sampleSupplier,
        sampleCustomer,
        sampleLineItems
      );

      const blob = PickTicketService.getPDFBlob(doc);
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      
      console.log('PDF generated successfully');
    } catch (err) {
      console.error('PDF generation error:', err);
      setError(err.message);
    }
  };

  const downloadPDF = () => {
    if (pdfUrl) {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = 'test-pick-ticket.pdf';
      link.click();
    }
  };

  const clearPDF = () => {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          PDF Test Generator
        </h1>
        
        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            Test the pick ticket PDF generation with sample data to debug table width issues.
          </p>
          
          <div className="space-x-4">
            <button
              onClick={generateTestPDF}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Generate Test PDF
            </button>
            
            {pdfUrl && (
              <>
                <button
                  onClick={downloadPDF}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                >
                  Download PDF
                </button>
                
                <button
                  onClick={clearPDF}
                  className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
                >
                  Clear PDF
                </button>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            Error: {error}
          </div>
        )}

        {pdfUrl && (
          <div className="border border-gray-300 rounded-lg">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-300">
              <h3 className="font-medium text-gray-900">PDF Preview</h3>
            </div>
            <div className="p-4">
              <iframe
                src={pdfUrl}
                className="w-full h-96 border border-gray-200 rounded"
                title="PDF Preview"
              />
            </div>
          </div>
        )}

        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-700 mb-2">Sample Data:</h4>
          <div className="text-sm text-gray-600 space-y-2">
            <p><strong>Release:</strong> {sampleReleaseData.ReleaseNumber}</p>
            <p><strong>Supplier:</strong> {sampleSupplier.SupplierName}</p>
            <p><strong>Customer:</strong> {sampleCustomer.CustomerName}</p>
            <p><strong>Line Items:</strong> {sampleLineItems.length} items with varying text lengths</p>
          </div>
        </div>
      </div>
    </div>
  );
}