import React from 'react';

const StateBadge = ({ status }) => {
  const getStatusConfig = (status) => {
    const configs = {
      'Entered': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Entered' },
      'Staged': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Staged' },
      'Verified': { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'Verified' },
      'Loaded': { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Loaded' },
      'BOL Queue': { bg: 'bg-orange-100', text: 'text-orange-800', label: 'BOL Queue' },
      'Complete': { bg: 'bg-green-100', text: 'text-green-800', label: 'Complete' },
      'Voided': { bg: 'bg-red-100', text: 'text-red-800', label: 'Voided' },
      'Pending': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Pending' },
      'In Progress': { bg: 'bg-cyan-100', text: 'text-cyan-800', label: 'In Progress' }
    };
    
    return configs[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status || 'Unknown' };
  };
  
  const config = getStatusConfig(status);
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
};

export default StateBadge;