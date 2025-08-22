import React, { useState, useEffect } from 'react';

const AgingChip = ({ since, label = '' }) => {
  const [aging, setAging] = useState('');
  
  const calculateAging = () => {
    if (!since || !import.meta.env.VITE_SHOW_AGING) return '';
    
    const sinceDate = since instanceof Date ? since : 
                      typeof since === 'number' ? new Date(since) :
                      since?.toDate ? since.toDate() : new Date(since);
    
    const now = new Date();
    const diffMs = now - sinceDate;
    
    if (diffMs < 0) return 'Future';
    
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      const remainingHours = diffHours % 24;
      return `${diffDays}d ${remainingHours}h`;
    } else if (diffHours > 0) {
      const remainingMins = diffMins % 60;
      return `${diffHours}h ${remainingMins}m`;
    } else {
      return `${diffMins}m`;
    }
  };
  
  useEffect(() => {
    if (!import.meta.env.VITE_SHOW_AGING) return;
    
    const updateAging = () => setAging(calculateAging());
    updateAging();
    
    const interval = setInterval(updateAging, 60000);
    return () => clearInterval(interval);
  }, [since]);
  
  if (!import.meta.env.VITE_SHOW_AGING || !aging) return null;
  
  return (
    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
      {label && <span className="mr-1">{label}</span>}
      <span className="text-gray-500">·</span>
      <span className="ml-1">{aging}</span>
    </span>
  );
};

export default AgingChip;