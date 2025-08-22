import { useEffect } from 'react';

export default function Toast({ message, type = 'error', onClose, duration = 5000 }) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bgColor = type === 'error' ? 'bg-red-600' : 
                  type === 'warning' ? 'bg-yellow-600' : 
                  type === 'success' ? 'bg-green-600' : 'bg-gray-600';

  return (
    <div className={`fixed bottom-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-3 z-50`}>
      <span>{message}</span>
      <button
        onClick={onClose}
        className="text-white hover:text-gray-200"
      >
        ×
      </button>
    </div>
  );
}