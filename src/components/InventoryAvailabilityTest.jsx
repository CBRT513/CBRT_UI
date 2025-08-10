// src/components/InventoryAvailabilityTest.jsx
// Test component to verify the inventory availability service works

import React, { useState } from 'react';
import inventoryAvailabilityService from '../services/inventoryAvailabilityService';

const InventoryAvailabilityTest = () => {
  const [testResults, setTestResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Test with known data from your system
  const testAvailability = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Test with the data from your recent release: ItemId: "Pjs11xCw7cy9LFRQqMBL"
      const itemId = "Pjs11xCw7cy9LFRQqMBL";
      const sizeId = "bctJ3wnvvdr3lWxU4W54";
      const lotId = "9joHPxBGapiH8TxBpKl";

      console.log('Testing availability for:', { itemId, sizeId, lotId });

      const availability = await inventoryAvailabilityService.getAvailableQuantity(
        itemId,
        sizeId,
        lotId
      );

      setTestResults(availability);

    } catch (err) {
      console.error('Test error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Inventory Availability Test</h2>
      
      <button
        onClick={testAvailability}
        disabled={loading}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Test Availability Calculation'}
      </button>

      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}

      {testResults && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">Test Results:</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><strong>On Hand:</strong> {testResults.onHand}</div>
            <div><strong>Committed:</strong> {testResults.committed}</div>
            <div><strong>Shipped:</strong> {testResults.shipped}</div>
            <div><strong>Available:</strong> {testResults.available}</div>
            <div className="col-span-2">
              <strong>Status:</strong> 
              <span className={`ml-2 px-2 py-1 rounded text-xs ${
                testResults.status === 'Available' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {testResults.status}
              </span>
            </div>
          </div>

          <div className="mt-3 p-2 bg-blue-50 rounded text-xs">
            <strong>Formula:</strong> Available = On Hand ({testResults.onHand}) - Committed ({testResults.committed}) - Shipped ({testResults.shipped}) = {testResults.available}
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryAvailabilityTest;