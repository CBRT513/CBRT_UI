import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import QueueTable from '../components/QueueTable';
import { listReleasesByStatus } from '../services/releases.repo';

const OpsQueues = () => {
  const [activeTab, setActiveTab] = useState('pick');
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  const tabs = [
    { id: 'pick', label: 'Pick', status: 'Entered' },
    { id: 'verify', label: 'Verify', status: 'Staged' },
    { id: 'bol', label: 'BOL', status: 'Loaded' }
  ];
  
  if (import.meta.env.VITE_ENABLE_SUPERSACK && import.meta.env.NODE_ENV === 'development') {
    tabs.push({ id: 'all', label: 'All', status: null });
  }
  
  useEffect(() => {
    loadReleases();
  }, [activeTab]);
  
  const loadReleases = async () => {
    setLoading(true);
    try {
      const activeTabConfig = tabs.find(t => t.id === activeTab);
      
      if (activeTab === 'all') {
        const allStatuses = ['Entered', 'Staged', 'Loaded'];
        const allReleases = await Promise.all(
          allStatuses.map(status => listReleasesByStatus(status))
        );
        setReleases(allReleases.flat());
      } else if (activeTabConfig) {
        const data = await listReleasesByStatus(activeTabConfig.status);
        setReleases(data);
      }
    } catch (error) {
      console.error('Error loading releases:', error);
      setReleases([]);
    } finally {
      setLoading(false);
    }
  };
  
  const handleOpenRelease = (releaseId) => {
    navigate(`/releases/${releaseId}`);
  };
  
  if (!import.meta.env.VITE_ENABLE_SUPERSACK) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Ops Queues feature is not enabled.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Operations Queues</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage releases through pick, verify, and BOL workflows
        </p>
      </div>
      
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.label}
              {releases.length > 0 && activeTab === tab.id && (
                <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
                  {releases.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>
      
      <div className="mt-6">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <QueueTable
            rows={releases}
            onOpenRelease={handleOpenRelease}
            queueType={activeTab}
          />
        )}
      </div>
    </div>
  );
};

export default OpsQueues;