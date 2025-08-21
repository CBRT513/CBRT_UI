import React from 'react';
import { useNavigate } from 'react-router-dom';
import StateBadge from './StateBadge';
import AgingChip from './AgingChip';

const QueueTable = ({ rows, onOpenRelease, columnsOverride, queueType }) => {
  const navigate = useNavigate();
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
      render: (row) => {
        const getActionButton = () => {
          switch (queueType) {
            case 'pick':
              return (
                <button
                  onClick={() => navigate(`/stage/${row.id}`)}
                  className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700"
                >
                  Stage
                </button>
              );
            case 'verify':
              return (
                <button
                  onClick={() => navigate(`/verify/${row.id}`)}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                >
                  Verify
                </button>
              );
            case 'bol':
              return (
                <button
                  onClick={() => navigate(`/load/${row.id}`)}
                  className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700"
                >
                  Load
                </button>
              );
            default:
              return null;
          }
        };

        return (
          <div className="flex space-x-2">
            {getActionButton()}
            <button
              onClick={() => onOpenRelease(row.id)}
              className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
            >
              View
            </button>
          </div>
        );
      }
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