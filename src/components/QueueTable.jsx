import React from 'react';
import StateBadge from './StateBadge';
import AgingChip from './AgingChip';

const QueueTable = ({ rows, onOpenRelease, columnsOverride }) => {
  const defaultColumns = [
    { key: 'number', label: 'Release #', render: (row) => row.number || row.id },
    { key: 'customerName', label: 'Customer', render: (row) => row.customerName || 'N/A' },
    { 
      key: 'location', 
      label: 'Location', 
      render: (row) => row.stagingLocation || row.shipToName || 'N/A' 
    },
    { key: 'status', label: 'Status', render: (row) => <StateBadge status={row.status} /> },
    { 
      key: 'aging', 
      label: 'Age', 
      render: (row) => <AgingChip since={row.statusChangedAt} label={row.status} /> 
    },
    { 
      key: 'actions', 
      label: 'Actions', 
      render: (row) => (
        <button
          onClick={() => onOpenRelease(row.id)}
          className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
        >
          View
        </button>
      )
    }
  ];
  
  const columns = columnsOverride || defaultColumns;
  
  if (!rows || rows.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-gray-500">No releases in this queue yet</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-gray-50">
              {columns.map(col => (
                <td key={col.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default QueueTable;