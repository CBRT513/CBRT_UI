import React from 'react';

export const BatchBar = ({ 
  selectedItems = [], 
  onClearSelection, 
  actions = [], 
  entityType = 'items' 
}) => {
  const count = selectedItems.length;

  if (count === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Selection info */}
          <div className="flex items-center space-x-4">
            <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
              {count} {entityType} selected
            </div>
            <button
              onClick={onClearSelection}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              Clear selection
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={() => action.action(selectedItems.map(item => item.id))}
                disabled={action.disabled}
                className={`
                  flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium
                  focus:outline-none focus:ring-2 focus:ring-offset-2
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${action.variant === 'primary' 
                    ? 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500' 
                    : action.variant === 'danger'
                    ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
                    : 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500'
                  }
                `}
              >
                {action.icon && <span>{action.icon}</span>}
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};