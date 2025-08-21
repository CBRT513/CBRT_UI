import React, { useEffect, useState } from 'react';
import { concurrencyService, PresenceInfo } from '../../lib/concurrency';

interface PresenceIndicatorProps {
  entityId: string;
  currentUserId: string;
  currentUserName?: string;
}

const PRESENCE_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-yellow-500',
  'bg-indigo-500',
];

export default function PresenceIndicator({
  entityId,
  currentUserId,
  currentUserName,
}: PresenceIndicatorProps) {
  const [presence, setPresence] = useState<PresenceInfo[]>([]);

  useEffect(() => {
    // Update own presence
    concurrencyService.updatePresence(
      currentUserId,
      entityId,
      'entity',
      'viewing',
      currentUserName
    );

    // Load presence info
    const interval = setInterval(() => {
      const currentPresence = concurrencyService.getPresence(entityId);
      setPresence(currentPresence.filter(p => p.userId !== currentUserId));
    }, 2000);

    return () => {
      clearInterval(interval);
      concurrencyService.clearPresence(currentUserId, entityId);
    };
  }, [entityId, currentUserId, currentUserName]);

  if (presence.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">Also here:</span>
      <div className="flex -space-x-2">
        {presence.slice(0, 5).map((p, idx) => (
          <div
            key={p.userId}
            className={`w-8 h-8 rounded-full ${PRESENCE_COLORS[idx % PRESENCE_COLORS.length]} 
              flex items-center justify-center text-white text-xs font-semibold
              ring-2 ring-white relative group`}
            title={`${p.userName} - ${p.action}`}
          >
            {p.userName.charAt(0).toUpperCase()}
            
            {/* Tooltip */}
            <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 
              bg-gray-800 text-white px-2 py-1 rounded text-xs whitespace-nowrap
              opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              {p.userName}
              <span className="block text-gray-400">
                {p.action === 'editing' ? '✏️ Editing' : '👁 Viewing'}
              </span>
            </div>
          </div>
        ))}
        
        {presence.length > 5 && (
          <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center 
            text-white text-xs font-semibold ring-2 ring-white">
            +{presence.length - 5}
          </div>
        )}
      </div>
      
      {presence.some(p => p.action === 'editing') && (
        <span className="text-xs text-orange-600 animate-pulse">
          ⚠️ Someone is editing
        </span>
      )}
    </div>
  );
}