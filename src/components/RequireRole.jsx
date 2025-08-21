import React from 'react';

// Simple role-based access control component
// In production, this would integrate with proper authentication system
export const RequireRole = ({ roles = [], children, fallback = null, user = null }) => {
  // For demo purposes, we'll allow all access
  // In production, this would check user.role against the required roles array
  const userRole = user?.role || 'admin'; // Default to admin for demo
  const hasAccess = roles.length === 0 || roles.includes(userRole);

  if (!hasAccess) {
    return fallback || (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="text-red-800">
          <h3 className="font-medium">Access Denied</h3>
          <p className="text-sm mt-1">
            You don't have permission to access this feature. Required role: {roles.join(' or ')}
          </p>
        </div>
      </div>
    );
  }

  return children;
};

// Customer-only access wrapper for portal features
export const CustomerOnly = ({ children, fallback = null }) => (
  <RequireRole roles={['customer']} fallback={fallback}>
    {children}
  </RequireRole>
);

// Admin-only access wrapper for management features  
export const AdminOnly = ({ children, fallback = null }) => (
  <RequireRole roles={['admin', 'office']} fallback={fallback}>
    {children}
  </RequireRole>
);

// Warehouse staff access wrapper
export const WarehouseOnly = ({ children, fallback = null }) => (
  <RequireRole roles={['admin', 'office', 'loader']} fallback={fallback}>
    {children}
  </RequireRole>
);