// BOL Manager - View and manage generated BOLs
import React, { useState } from "react";
import { useFirestoreCollection } from "../hooks/useFirestore";
import { bolService } from "../services/bolService";
import { updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase/config";
import PageHeader from "../components/PageHeader";
import { getStatusColor } from "../utils";

export default function BOLManager() {
  const { data: bols } = useFirestoreCollection("bols");
  const { data: releases } = useFirestoreCollection("releases");
  const { data: customers } = useFirestoreCollection("customers");
  const { data: carriers } = useFirestoreCollection("carriers");
  const [loading, setLoading] = useState("");

  const handleVoidBOL = async (bolId, releaseId) => {
    if (!window.confirm("Are you sure you want to void this BOL?")) return;
    
    setLoading(bolId);
    try {
      // Void the BOL
      await bolService.voidBOL(bolId);
      
      // Update release status back to available
      await updateDoc(doc(db, "releases", releaseId), {
        Status: "Available",
        BOLId: null,
        ShippedAt: null
      });
      
    } catch (error) {
      console.error("Error voiding BOL:", error);
      alert("Failed to void BOL");
    } finally {
      setLoading("");
    }
  };

  const getBOLData = (bol) => {
    const release = releases.find(r => r.id === bol.ReleaseId);
    const customer = customers.find(c => c.id === bol.CustomerId);
    const carrier = carriers.find(c => c.id === bol.CarrierId);
    
    return { release, customer, carrier };
  };

  return (
    <div className="p-4">
      <PageHeader
        title="BOL Manager"
        subtitle="View and manage Bills of Lading"
      />
      
      <div className="bg-white shadow rounded overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="text-left px-4 py-2">BOL Number</th>
              <th className="text-left px-4 py-2">Customer</th>
              <th className="text-left px-4 py-2">Carrier</th>
              <th className="text-left px-4 py-2">Truck/Trailer</th>
              <th className="text-left px-4 py-2">Pickup Date</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-left px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {bols.map(bol => {
              const { release, customer, carrier } = getBOLData(bol);
              return (
                <tr key={bol.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-green-600">{bol.BOLNumber}</td>
                  <td className="px-4 py-2">{customer?.CustomerName || "Unknown"}</td>
                  <td className="px-4 py-2">{carrier?.CarrierName || "Unknown"}</td>
                  <td className="px-4 py-2">{bol.TruckNumber}/{bol.TrailerNumber}</td>
                  <td className="px-4 py-2">{bol.PickupDate}</td>
                  <td className="px-4 py-2">
                    <span className={"px-2 py-1 rounded text-xs " + getStatusColor(bol.Status)}>
                      {bol.Status}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {bol.Status === "Generated" && (
                      <button
                        onClick={() => handleVoidBOL(bol.id, bol.ReleaseId)}
                        disabled={loading === bol.id}
                        className="text-red-600 hover:text-red-800 disabled:opacity-50"
                      >
                        {loading === bol.id ? "Voiding..." : "Void BOL"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {bols.length === 0 && (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No BOLs generated</h3>
            <p className="text-gray-500">Generate your first BOL to see it here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
