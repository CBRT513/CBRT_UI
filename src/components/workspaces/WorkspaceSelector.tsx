import React, { useState, useEffect } from 'react';
import { workspaceService, Workspace } from '../../lib/workspaces';

interface WorkspaceSelectorProps {
  userId: string;
  currentWorkspace?: string;
  onWorkspaceChange: (workspaceId: string) => void;
}

export default function WorkspaceSelector({
  userId,
  currentWorkspace,
  onWorkspaceChange,
}: WorkspaceSelectorProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadWorkspaces();
  }, [userId]);

  const loadWorkspaces = async () => {
    try {
      const userWorkspaces = await workspaceService.getUserWorkspaces(userId);
      setWorkspaces(userWorkspaces);
      
      // If no current workspace, select the first one
      if (!currentWorkspace && userWorkspaces.length > 0) {
        onWorkspaceChange(userWorkspaces[0].id);
      }
    } catch (error) {
      console.error('Failed to load workspaces:', error);
    }
  };

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) return;
    
    setLoading(true);
    try {
      const workspace = await workspaceService.createWorkspace(
        newWorkspaceName,
        userId
      );
      
      setWorkspaces([...workspaces, workspace]);
      onWorkspaceChange(workspace.id);
      setNewWorkspaceName('');
      setShowCreateModal(false);
    } catch (error) {
      console.error('Failed to create workspace:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">Workspace:</label>
        <select
          value={currentWorkspace || ''}
          onChange={(e) => onWorkspaceChange(e.target.value)}
          className="px-3 py-1 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {workspaces.length === 0 && (
            <option value="">No workspaces</option>
          )}
          {workspaces.map(ws => (
            <option key={ws.id} value={ws.id}>
              {ws.name}
            </option>
          ))}
        </select>
        
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + New
        </button>
      </div>

      {/* Create Workspace Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Create Workspace</h3>
            
            <input
              type="text"
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              placeholder="Workspace name"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleCreateWorkspace}
                disabled={loading || !newWorkspaceName.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create'}
              </button>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewWorkspaceName('');
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}