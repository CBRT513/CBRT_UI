// ExpectedShipments.jsx - Expected Shipments View
import React from "react";
import { useFirestoreCollection } from "../hooks/useFirestore";

export default function ExpectedShipments() {
  const { data: releases } = useFirestoreCollection("releases");
  
  const expectedShipments = releases.filter(r => 
    (r.Status === "Entered" || r.status === "Entered") && 
    r.PickupDate && 
    new Date(r.PickupDate) >= new Date()
  ).sort((a, b) => new Date(a.PickupDate) - new Date(b.PickupDate));

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Expected Shipments</h1>
        
        {expectedShipments.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No scheduled shipments</h3>
            <p className="text-gray-500">Releases with pickup dates will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left px-4 py-2">Pickup Date</th>
                  <th className="text-left px-4 py-2">Release #</th>
                  <th className="text-left px-4 py-2">Supplier</th>
                  <th className="text-left px-4 py-2">Customer</th>
                  <th className="text-left px-4 py-2">Items</th>
                </tr>
              </thead>
              <tbody>
                {expectedShipments.map(release => (
                  <tr key={release.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2 font-semibold text-blue-600">{release.PickupDate}</td>
                    <td className="px-4 py-2 font-mono">{release.ReleaseNumber}</td>
                    <td className="px-4 py-2">{release.SupplierName}</td>
                    <td className="px-4 py-2">{release.CustomerName}</td>
                    <td className="px-4 py-2">{release.LineItems?.length || 0} line items</td>
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
