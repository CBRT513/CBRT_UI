// Release Workflow Dashboard
// Shows releases in different stages of the workflow
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFirestoreCollection } from '../hooks/useFirestore';
import { RELEASE_STATUS } from '../services/releaseWorkflowService';

const ReleaseWorkflowDashboard = () => {
  const navigate = useNavigate();
  const { data: releases, loading } = useFirestoreCollection('releases');
  const { data: customers } = useFirestoreCollection('customers');
  const { data: suppliers } = useFirestoreCollection('suppliers');
  
  // Group releases by status
  const releasesByStatus = {
    [RELEASE_STATUS.ENTERED]: [],
    [RELEASE_STATUS.STAGED]: [],
    [RELEASE_STATUS.VERIFIED]: [],
    [RELEASE_STATUS.LOADED]: [],
    [RELEASE_STATUS.SHIPPED]: []
  };
  
  releases?.forEach(release => {
    const status = release.status || release.Status;
    if (releasesByStatus[status]) {
      releasesByStatus[status].push(release);
    }
  });
  
  // Helper functions
  const getSupplierName = (supplierId) => {
    const supplier = suppliers?.find(s => s.id === supplierId);
    return supplier?.SupplierName || supplier?.supplierName || 'Unknown';
  };
  
  const getCustomerName = (customerId) => {
    const customer = customers?.find(c => c.id === customerId);
    return customer?.CustomerName || customer?.customerName || 'Unknown';
  };
  
  // Status card component
  const StatusCard = ({ status, releases }) => {
    const statusColors = {
      [RELEASE_STATUS.ENTERED]: 'blue',
      [RELEASE_STATUS.STAGED]: 'yellow',
      [RELEASE_STATUS.VERIFIED]: 'green',
      [RELEASE_STATUS.LOADED]: 'purple',
      [RELEASE_STATUS.SHIPPED]: 'gray'
    };
    
    const statusActions = {
      [RELEASE_STATUS.ENTERED]: { label: 'Stage', route: '/warehouse-staging' },
      [RELEASE_STATUS.STAGED]: { label: 'Verify', route: '/warehouse-verification' },
      [RELEASE_STATUS.VERIFIED]: { label: 'Load', route: '/shipment-loading' },
      [RELEASE_STATUS.LOADED]: { label: 'Generate BOL', route: '/bolgenerator' },
      [RELEASE_STATUS.SHIPPED]: null
    };
    
    const bgColor = statusColors[status] || 'gray';
    const statusAction = statusActions[status];
    
    return (
      <div className="bg-white rounded-lg shadow-md border-t-4 border-${bgColor}-500">
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{status}</h3>
            <span className={`px-3 py-1 rounded-full text-sm font-medium bg-${bgColor}-100 text-${bgColor}-800`}>
              {releases.length}
            </span>
          </div>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {releases.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">No releases</p>
            ) : (
              releases.map(release => (
                <div
                  key={release.id}
                  className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                  onClick={() => navigate(`/release-details/${release.id}`)}
                >
                  <div className="font-medium text-sm">
                    #{release.releaseNumber || release.ReleaseNumber}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {getSupplierName(release.supplierId || release.SupplierId)}
                  </div>
                  <div className="text-xs text-gray-600">
                    → {getCustomerName(release.customerId || release.CustomerId)}
                  </div>
                  {release.lockedBy && (
                    <div className="text-xs text-orange-600 mt-1">
                      🔒 Locked by {release.lockedByName}
                    </div>
                  )}
                  {release.stagedLocation && (
                    <div className="text-xs text-blue-600 mt-1">
                      📍 {release.stagedLocation}
                    </div>
                  )}
                  {release.truckNumber && (
                    <div className="text-xs text-purple-600 mt-1">
                      🚚 Truck: {release.truckNumber}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          
          {statusAction && releases.length > 0 && (
            <button
              onClick={() => navigate(statusAction.route)}
              className={`w-full mt-4 px-4 py-2 bg-${bgColor}-600 text-white rounded-md hover:bg-${bgColor}-700 transition-colors`}
            >
              {statusAction.label} →
            </button>
          )}
        </div>
      </div>
    );
  };
  
  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Release Workflow Dashboard</h1>
        <p className="text-gray-600 mt-2">Track releases through the workflow stages</p>
      </div>
      
      {/* Workflow Progress Visualization */}
      <div className="mb-8 bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          {Object.keys(RELEASE_STATUS).map((key, index) => {
            const status = RELEASE_STATUS[key];
            const count = releasesByStatus[status]?.length || 0;
            const isLast = index === Object.keys(RELEASE_STATUS).length - 1;
            
            return (
              <React.Fragment key={status}>
                <div className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
                    count > 0 ? 'bg-blue-600' : 'bg-gray-400'
                  }`}>
                    {count}
                  </div>
                  <p className="text-sm font-medium mt-2">{status}</p>
                </div>
                {!isLast && (
                  <div className="flex-1 h-1 bg-gray-300 mx-2">
                    <div className={`h-full bg-blue-600 transition-all duration-500`}
                         style={{ width: count > 0 ? '100%' : '0%' }}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
      
      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {Object.keys(RELEASE_STATUS).map(key => {
          const status = RELEASE_STATUS[key];
          return (
            <StatusCard
              key={status}
              status={status}
              releases={releasesByStatus[status]}
            />
          );
        })}
      </div>
      
      {/* Quick Actions */}
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => navigate('/enterarelease')}
            className="px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            + New Release
          </button>
          <button
            onClick={() => navigate('/warehouse-staging')}
            className="px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Stage Releases
          </button>
          <button
            onClick={() => navigate('/warehouse-verification')}
            className="px-4 py-3 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
          >
            Verify Staged
          </button>
          <button
            onClick={() => navigate('/shipment-loading')}
            className="px-4 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            Load Shipments
          </button>
        </div>
      </div>
      
      {/* Statistics */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Today's Activity</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Releases Created</span>
              <span className="font-medium">
                {releases?.filter(r => {
                  const created = r.createdAt?.toDate?.();
                  return created && created.toDateString() === new Date().toDateString();
                }).length || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Releases Staged</span>
              <span className="font-medium">
                {releases?.filter(r => {
                  const staged = r.stagedAt?.toDate?.();
                  return staged && staged.toDateString() === new Date().toDateString();
                }).length || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Releases Loaded</span>
              <span className="font-medium">
                {releases?.filter(r => {
                  const loaded = r.loadedAt?.toDate?.();
                  return loaded && loaded.toDateString() === new Date().toDateString();
                }).length || 0}
              </span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Bottlenecks</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Awaiting Staging</span>
              <span className={`font-medium ${releasesByStatus[RELEASE_STATUS.ENTERED].length > 5 ? 'text-red-600' : ''}`}>
                {releasesByStatus[RELEASE_STATUS.ENTERED].length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Awaiting Verification</span>
              <span className={`font-medium ${releasesByStatus[RELEASE_STATUS.STAGED].length > 3 ? 'text-orange-600' : ''}`}>
                {releasesByStatus[RELEASE_STATUS.STAGED].length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Ready to Load</span>
              <span className="font-medium">
                {releasesByStatus[RELEASE_STATUS.VERIFIED].length}
              </span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Locations</h3>
          <div className="space-y-2">
            {['Allied', 'Red Ramp', 'Dock 2', 'Yard'].map(location => {
              const count = releases?.filter(r => r.stagedLocation === location && 
                (r.status === RELEASE_STATUS.STAGED || r.status === RELEASE_STATUS.VERIFIED)).length || 0;
              return (
                <div key={location} className="flex justify-between">
                  <span className="text-gray-600">{location}</span>
                  <span className="font-medium">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReleaseWorkflowDashboard;