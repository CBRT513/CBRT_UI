import React, { useState } from 'react';
import { Role } from '../../lib/auth/roles';
import { userService } from '../../lib/auth/users';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (userId: string, role: Role) => void;
}

export default function LoginModal({ isOpen, onClose, onLogin }: LoginModalProps) {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role>(Role.VIEWER);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Check if user exists
      let user = await userService.getUserByEmail(email);
      
      if (!user) {
        // Create new user
        user = await userService.createUser(email, displayName || email, selectedRole);
      }

      // Create session
      const token = `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await userService.createSession(user, token);

      onLogin(user.id, user.role);
      onClose();
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-w-full">
        <h2 className="text-2xl font-bold mb-4">Login / Create User</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Optional"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Role</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as Role)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={Role.VIEWER}>Viewer (Read-only)</option>
              <option value={Role.EDITOR}>Editor (Can modify)</option>
              <option value={Role.ADMIN}>Admin (Full access)</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Login'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>

        <div className="mt-4 pt-4 border-t text-sm text-gray-600">
          <p>Test Users:</p>
          <ul className="mt-1 space-y-1">
            <li>• admin@test.com (Admin)</li>
            <li>• editor@test.com (Editor)</li>
            <li>• viewer@test.com (Viewer)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}