export const formatAging = (since: Date | number | string): string => {
  if (!since) return '';
  
  const sinceDate = since instanceof Date ? since : new Date(since);
  
  if (isNaN(sinceDate.getTime())) {
    return 'Invalid Date';
  }
  
  const now = new Date();
  const diffMs = now.getTime() - sinceDate.getTime();
  
  if (diffMs < 0) return 'Future';
  
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 0) {
    const remainingHours = diffHours % 24;
    return remainingHours > 0 ? `${diffDays}d ${remainingHours}h` : `${diffDays}d`;
  } else if (diffHours > 0) {
    const remainingMins = diffMins % 60;
    return remainingMins > 0 ? `${diffHours}h ${remainingMins}m` : `${diffHours}h`;
  } else {
    return `${diffMins}m`;
  }
};

export const getAgingInMinutes = (since: Date | number | string): number => {
  if (!since) return 0;
  
  const sinceDate = since instanceof Date ? since : new Date(since);
  
  if (isNaN(sinceDate.getTime())) {
    return 0;
  }
  
  const now = new Date();
  const diffMs = now.getTime() - sinceDate.getTime();
  
  return Math.max(0, Math.floor(diffMs / 60000));
};

export const isAged = (since: Date | number | string, thresholdMinutes: number): boolean => {
  return getAgingInMinutes(since) >= thresholdMinutes;
};