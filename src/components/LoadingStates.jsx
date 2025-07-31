// src/components/LoadingStates.jsx - Reusable Loading Components
import React from 'react';

// Loading spinner component
export const LoadingSpinner = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  };

  return (
    <div className={`animate-spin rounded-full border-2 border-blue-500 border-t-transparent ${sizeClasses[size]} ${className}`}></div>
  );
};

// Table skeleton for loading states
export const TableSkeleton = ({ rows = 5, columns = 4 }) => {
  return (
    <div className="bg-white shadow rounded overflow-hidden">
      {/* Header skeleton */}
      <div className="bg-gray-100 px-6 py-3">
        <div className="flex space-x-4">
          {Array.from({ length: columns }).map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 rounded flex-1 animate-pulse"></div>
          ))}
          <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
        </div>
      </div>
      
      {/* Body skeleton */}
      <div className="divide-y divide-gray-200">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="px-6 py-4">
            <div className="flex space-x-4">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <div 
                  key={colIndex} 
                  className={`h-4 bg-gray-200 rounded flex-1 animate-pulse`}
                  style={{ 
                    animationDelay: `${(rowIndex * columns + colIndex) * 0.1}s` 
                  }}
                ></div>
              ))}
              <div className="flex space-x-2">
                <div className="h-6 w-6 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-6 w-6 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Error display component
export const ErrorDisplay = ({ error, onRetry, title = "Something went wrong" }) => {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
      <div className="text-red-600 text-lg font-semibold mb-2">{title}</div>
      <div className="text-red-700 mb-4">
        {error?.message || "An unexpected error occurred. Please try again."}
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          Try Again
        </button>
      )}
    </div>
  );
};

// Loading overlay for forms/modals
export const LoadingOverlay = ({ isVisible, message = "Loading..." }) => {
  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
      <div className="flex items-center space-x-3">
        <LoadingSpinner size="lg" />
        <span className="text-gray-700 font-medium">{message}</span>
      </div>
    </div>
  );
};

// Empty state component
export const EmptyState = ({ 
  title = "No items found", 
  description = "Get started by adding a new item.", 
  actionText,
  onAction 
}) => {
  return (
    <div className="text-center py-12">
      <div className="text-gray-400 text-6xl mb-4">📋</div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 mb-6">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};

// Page loading state
export const PageLoading = ({ title = "Loading..." }) => {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="xl" className="mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">{title}</h2>
        <p className="text-gray-500">Please wait while we load your data.</p>
      </div>
    </div>
  );
};

