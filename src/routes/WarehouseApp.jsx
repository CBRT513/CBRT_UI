// File: /Users/cerion/CBRT_UI/src/routes/WarehouseApp.jsx
import React, { useState } from 'react';
import { WarehouseAuthProvider, useWarehouseAuth } from '../components/WarehouseAuth';
import WarehouseAuth from '../components/WarehouseAuth';
import WarehouseStaging from './WarehouseStaging';
import WarehouseVerification from './WarehouseVerification';

// Warehouse Header Component
const WarehouseHeader = ({ activeTab, setActiveTab }) => {
  const { currentUser, logout } = useWarehouseAuth();
  
  return (
    <div className="bg-blue-600 text-white">
      <div className="p-4">
        <div className="flex justify-between items-center max-w-6xl mx-auto">
          <div>
            <h1 className="text-xl font-bold">CBRT Warehouse</h1>
            <p className="text-blue-100 text-sm">Staging & Verification System</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="font-medium">{currentUser.name}</div>
              <div className="text-xs text-blue-200">Warehouse Staff</div>
            </div>
            
            <button
              onClick={logout}
              className="bg-blue-700 hover:bg-blue-800 px-3 py-1 rounded text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
      
      {/* Navigation Tabs */}
      <div className="border-t border-blue-500">
        <div className="max-w-6xl mx-auto">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('staging')}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'staging'
                  ? 'border-white text-white'
                  : 'border-transparent text-blue-200 hover:text-white hover:border-blue-300'
              }`}
            >
              📦 Staging
            </button>
            <button
              onClick={() => setActiveTab('verification')}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'verification'
                  ? 'border-white text-white'
                  : 'border-transparent text-blue-200 hover:text-white hover:border-blue-300'
              }`}
            >
              ✓ Verification
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
};

// Main Warehouse App Content
const WarehouseAppContent = () => {
  const [activeTab, setActiveTab] = useState('staging');
  
  return (
    <div className="min-h-screen bg-gray-50">
      <WarehouseHeader activeTab={activeTab} setActiveTab={setActiveTab} />
      
      {/* Main Content */}
      <div className="max-w-6xl mx-auto">
        {activeTab === 'staging' && <WarehouseStaging />}
        {activeTab === 'verification' && <WarehouseVerification />}
      </div>
    </div>
  );
};

// Complete Warehouse App with Authentication
export default function WarehouseApp() {
  return (
    <WarehouseAuthProvider>
      <WarehouseAuth>
        <WarehouseAppContent />
      </WarehouseAuth>
    </WarehouseAuthProvider>
  );
}