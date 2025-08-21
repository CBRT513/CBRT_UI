// Bulk operations component for multi-select actions across managers
import React from 'react';
import { logger } from '../utils/logger';

/**
 * BatchBar - Sticky bottom bar for bulk operations
 * @param {Object} props
 * @param {Array} props.selectedItems - Array of selected item IDs
 * @param {Function} props.onClearSelection - Callback to clear selection
 * @param {Array} props.actions - Array of bulk action objects
 * @param {string} props.entityType - Type of entity (releases, customers, etc.)
 */
export const BatchBar = ({ 
  selectedItems = [], 
  onClearSelection, 
  actions = [], 
  entityType = 'items' 
}) => {
  if (selectedItems.length === 0) return null;

  const handleAction = async (action) => {
    try {
      logger.info('Bulk action started', {
        action: action.key,
        entityType,
        selectedCount: selectedItems.length,
        selectedIds: selectedItems
      });

      await action.handler(selectedItems);
      
      logger.info('Bulk action completed', {
        action: action.key,
        entityType,
        selectedCount: selectedItems.length
      });

      // Clear selection after successful action
      onClearSelection();
    } catch (error) {
      logger.error('Bulk action failed', error, {
        action: action.key,
        entityType,
        selectedCount: selectedItems.length
      });
      
      // Show error to user
      alert(`Failed to ${action.label.toLowerCase()}: ${error.message}`);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3">
          {/* Selection summary */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded">
                {selectedItems.length} selected
              </div>
              <span className="text-sm text-gray-600">
                {entityType}
              </span>
            </div>
            
            <button
              onClick={onClearSelection}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Clear selection
            </button>
          </div>

          {/* Bulk actions */}
          <div className="flex items-center space-x-2">
            {actions.map((action) => (
              <button
                key={action.key}
                onClick={() => handleAction(action)}
                disabled={action.disabled}
                className={`
                  inline-flex items-center px-3 py-2 border text-sm font-medium rounded-md
                  ${action.variant === 'danger' 
                    ? 'border-red-300 text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50' 
                    : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50'
                  }
                  ${action.disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                {action.icon && (
                  <span className="mr-1">
                    {action.icon}
                  </span>
                )}
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * SelectableTable - Wrapper component that adds selection capabilities to tables
 * @param {Object} props
 * @param {Array} props.items - Array of data items
 * @param {Function} props.renderRow - Function to render each row
 * @param {Function} props.getItemId - Function to extract ID from item
 * @param {Array} props.bulkActions - Array of bulk action definitions
 * @param {string} props.entityType - Type of entity for logging
 * @param {React.ReactNode} props.children - Table header content
 */
export const SelectableTable = ({ 
  items = [], 
  renderRow, 
  getItemId, 
  bulkActions = [], 
  entityType = 'items',
  children 
}) => {
  const [selectedItems, setSelectedItems] = React.useState([]);

  const isAllSelected = items.length > 0 && selectedItems.length === items.length;
  const isPartiallySelected = selectedItems.length > 0 && selectedItems.length < items.length;

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedItems([]);
    } else {
      setSelectedItems(items.map(getItemId));
    }
  };

  const handleSelectItem = (itemId) => {
    setSelectedItems(prev => {
      if (prev.includes(itemId)) {
        return prev.filter(id => id !== itemId);
      } else {
        return [...prev, itemId];
      }
    });
  };

  const isItemSelected = (itemId) => selectedItems.includes(itemId);

  return (
    <div className="relative">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {/* Selection column */}
              <th scope="col" className="relative w-12 px-6 sm:w-16 sm:px-8">
                <input
                  type="checkbox"
                  className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 sm:left-6"
                  ref={(input) => {
                    if (input) input.indeterminate = isPartiallySelected;
                  }}
                  checked={isAllSelected}
                  onChange={handleSelectAll}
                />
              </th>
              
              {/* Table headers */}
              {children}
            </tr>
          </thead>
          
          <tbody className="divide-y divide-gray-200 bg-white">
            {items.map((item, index) => {
              const itemId = getItemId(item);
              const isSelected = isItemSelected(itemId);
              
              return (
                <tr 
                  key={itemId} 
                  className={isSelected ? 'bg-blue-50' : undefined}
                >
                  {/* Selection checkbox */}
                  <td className="relative w-12 px-6 sm:w-16 sm:px-8">
                    <input
                      type="checkbox"
                      className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 sm:left-6"
                      checked={isSelected}
                      onChange={() => handleSelectItem(itemId)}
                    />
                  </td>
                  
                  {/* Row content */}
                  {renderRow(item, index, isSelected)}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Batch operations bar */}
      <BatchBar
        selectedItems={selectedItems}
        onClearSelection={() => setSelectedItems([])}
        actions={bulkActions}
        entityType={entityType}
      />
    </div>
  );
};

/**
 * Bulk action definitions for different entity types
 */
export const BULK_ACTIONS = {
  releases: [
    {
      key: 'advance_status',
      label: 'Advance Status',
      icon: '▶️',
      variant: 'primary',
      handler: async (selectedIds) => {
        // Implementation will be added in specific manager
        throw new Error('Advance status handler not implemented');
      }
    },
    {
      key: 'export_pdf',
      label: 'Export PDF',
      icon: '📄',
      variant: 'secondary',
      handler: async (selectedIds) => {
        // Implementation will be added in export utilities
        throw new Error('Export PDF handler not implemented');
      }
    }
  ],
  
  customers: [
    {
      key: 'bulk_edit',
      label: 'Bulk Edit',
      icon: '✏️',
      variant: 'primary',
      handler: async (selectedIds) => {
        throw new Error('Bulk edit handler not implemented');
      }
    },
    {
      key: 'export_csv',
      label: 'Export CSV',
      icon: '📊',
      variant: 'secondary',
      handler: async (selectedIds) => {
        throw new Error('Export CSV handler not implemented');
      }
    },
    {
      key: 'delete',
      label: 'Delete',
      icon: '🗑️',
      variant: 'danger',
      handler: async (selectedIds) => {
        throw new Error('Delete handler not implemented');
      }
    }
  ],

  barcodes: [
    {
      key: 'update_status',
      label: 'Update Status',
      icon: '🔄',
      variant: 'primary',
      handler: async (selectedIds) => {
        throw new Error('Update status handler not implemented');
      }
    },
    {
      key: 'print_labels',
      label: 'Print Labels',
      icon: '🖨️',
      variant: 'secondary',
      handler: async (selectedIds) => {
        throw new Error('Print labels handler not implemented');
      }
    }
  ]
};

export default BatchBar;