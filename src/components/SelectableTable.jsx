import React, { useState, useEffect } from 'react';
import { BatchBar } from './BatchBar';

export const SelectableTable = ({ 
  data = [], 
  children, 
  onSelectionChange,
  batchActions = [],
  entityType = 'items',
  className = '',
  getItemId = (item) => item.id,
  isSelectable = (item) => true
}) => {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const selectableItems = data.filter(isSelectable);
  const selectableIds = selectableItems.map(getItemId);

  // Update select all state when data changes
  useEffect(() => {
    if (selectableIds.length === 0) {
      setSelectAll(false);
      return;
    }
    
    const allSelected = selectableIds.every(id => selectedIds.has(id));
    setSelectAll(allSelected);
  }, [selectableIds, selectedIds]);

  // Notify parent of selection changes
  useEffect(() => {
    const selectedItems = data.filter(item => selectedIds.has(getItemId(item)));
    onSelectionChange?.(Array.from(selectedIds), selectedItems);
  }, [selectedIds, data, onSelectionChange, getItemId]);

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(new Set(selectableIds));
    } else {
      setSelectedIds(new Set());
    }
    setSelectAll(checked);
  };

  const handleSelectItem = (itemId, checked) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(itemId);
    } else {
      newSelected.delete(itemId);
    }
    setSelectedIds(newSelected);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setSelectAll(false);
  };

  const selectedItems = data.filter(item => selectedIds.has(getItemId(item)));

  return (
    <div className={`relative ${className}`}>
      {/* Table with selection capabilities */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {/* Select all checkbox */}
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  disabled={selectableIds.length === 0}
                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded disabled:opacity-50"
                />
              </th>
              {/* Render custom header columns */}
              {React.Children.map(children, (child, index) => {
                if (child?.type === 'thead') {
                  return React.Children.map(child.props.children, (tr) => 
                    React.Children.map(tr.props.children, (th, thIndex) => 
                      thIndex > 0 ? th : null // Skip first column since we add checkbox
                    )
                  );
                }
                return null;
              })}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item, index) => {
              const itemId = getItemId(item);
              const isItemSelectable = isSelectable(item);
              const isSelected = selectedIds.has(itemId);
              
              return (
                <tr key={itemId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  {/* Selection checkbox */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => handleSelectItem(itemId, e.target.checked)}
                      disabled={!isItemSelectable}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded disabled:opacity-50"
                    />
                  </td>
                  {/* Render custom row content */}
                  {React.Children.map(children, (child) => {
                    if (child?.type === 'tbody') {
                      return React.Children.map(child.props.children, (tr) => {
                        if (typeof tr.type === 'function' && tr.props.item) {
                          // This is a row renderer function
                          return React.Children.map(
                            tr.type({ ...tr.props, item }).props.children,
                            (td, tdIndex) => tdIndex > 0 ? td : null // Skip first column
                          );
                        }
                        return null;
                      });
                    }
                    return null;
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Batch action bar */}
      {selectedIds.size > 0 && (
        <BatchBar
          selectedItems={selectedItems}
          onClearSelection={clearSelection}
          actions={batchActions}
          entityType={entityType}
        />
      )}
    </div>
  );
};

// Helper component for defining table structure
export const TableHeaders = ({ children }) => (
  <thead className="bg-gray-50">
    <tr>{children}</tr>
  </thead>
);

export const TableRows = ({ children, renderRow }) => (
  <tbody className="bg-white divide-y divide-gray-200">
    {children}
  </tbody>
);

export const TableHeader = ({ children, className = '' }) => (
  <th className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${className}`}>
    {children}
  </th>
);

export const TableCell = ({ children, className = '' }) => (
  <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${className}`}>
    {children}
  </td>
);