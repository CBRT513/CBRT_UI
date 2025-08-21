/**
 * Notification Panel Component
 */

import React, { useState, useEffect, useCallback } from 'react';
import { notificationService, NotificationType, NotificationChannel } from '../lib/notifications';
import { useAuth } from '../contexts/AuthContext';

export default function NotificationPanel() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [preferences, setPreferences] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [filter, setFilter] = useState('all');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    // Subscribe to real-time notifications
    const unsubscribe = notificationService.subscribeToRealtime(
      user.id,
      (notification) => {
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        // Show browser notification if permitted
        if (Notification.permission === 'granted') {
          new Notification(notification.subject, {
            body: notification.body,
            icon: '/favicon.ico',
          });
        }
      }
    );

    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => unsubscribe();
  }, [user]);

  const handleMarkAsRead = useCallback((notificationId) => {
    setNotifications(prev => prev.map(n => 
      n.id === notificationId ? { ...n, read: true } : n
    ));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const handleMarkAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const handleDelete = useCallback((notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  const handleClearAll = useCallback(() => {
    if (confirm('Clear all notifications?')) {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, []);

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.read;
    return n.type === filter;
  });

  const getNotificationIcon = (type) => {
    switch (type) {
      case NotificationType.WORKFLOW:
        return '📋';
      case NotificationType.APPROVAL_REQUEST:
        return '✓';
      case NotificationType.CONFLICT_DETECTED:
        return '⚠️';
      case NotificationType.SYSTEM_ALERT:
        return '🔔';
      case NotificationType.MENTION:
        return '@';
      case NotificationType.DEADLINE:
        return '⏰';
      case NotificationType.ESCALATION:
        return '🔺';
      default:
        return '📨';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'border-red-500 bg-red-50';
      case 'high':
        return 'border-orange-500 bg-orange-50';
      case 'normal':
        return 'border-blue-500 bg-blue-50';
      case 'low':
        return 'border-gray-300 bg-gray-50';
      default:
        return 'border-gray-300';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold">Notifications</h2>
            {unreadCount > 0 && (
              <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={handleMarkAllAsRead}
              className="text-sm text-blue-600 hover:underline"
            >
              Mark all read
            </button>
            <button
              onClick={handleClearAll}
              className="text-sm text-gray-600 hover:underline"
            >
              Clear all
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="text-gray-600 hover:text-gray-800"
            >
              ⚙️
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-2">
          {['all', 'unread', NotificationType.WORKFLOW, NotificationType.APPROVAL_REQUEST, NotificationType.CONFLICT_DETECTED].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-sm rounded ${
                filter === f 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {f === 'all' ? 'All' : f === 'unread' ? 'Unread' : f.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      <div className="flex-grow overflow-y-auto">
        {filteredNotifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="text-lg mb-2">No notifications</p>
            <p className="text-sm">You're all caught up!</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredNotifications.map(notification => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={handleMarkAsRead}
                onDelete={handleDelete}
                getIcon={getNotificationIcon}
                getPriorityColor={getPriorityColor}
              />
            ))}
          </div>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <NotificationSettings
          preferences={preferences}
          onSave={(prefs) => {
            notificationService.setPreferences(user.id, prefs);
            setPreferences(prefs);
            setShowSettings(false);
          }}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

function NotificationItem({ notification, onMarkAsRead, onDelete, getIcon, getPriorityColor }) {
  const [expanded, setExpanded] = useState(false);

  const timeAgo = (date) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div 
      className={`p-4 hover:bg-gray-50 cursor-pointer border-l-4 ${
        getPriorityColor(notification.priority)
      } ${!notification.read ? 'bg-blue-50' : ''}`}
      onClick={() => {
        if (!notification.read) {
          onMarkAsRead(notification.id);
        }
        setExpanded(!expanded);
      }}
    >
      <div className="flex justify-between items-start">
        <div className="flex-grow">
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-lg">{getIcon(notification.type)}</span>
            <h3 className="font-semibold text-sm">
              {notification.subject}
            </h3>
            {!notification.read && (
              <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
            )}
          </div>
          
          <p className="text-sm text-gray-600 line-clamp-2">
            {notification.body}
          </p>

          {expanded && notification.metadata && (
            <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
              <pre className="whitespace-pre-wrap">
                {JSON.stringify(notification.metadata, null, 2)}
              </pre>
            </div>
          )}

          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-500">
              {timeAgo(notification.sentAt || notification.timestamp)}
            </span>
            
            {notification.metadata?.instanceId && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Navigate to workflow instance
                  window.location.href = `/workflow/${notification.metadata.instanceId}`;
                }}
                className="text-xs text-blue-600 hover:underline"
              >
                View Workflow →
              </button>
            )}
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(notification.id);
          }}
          className="ml-2 text-gray-400 hover:text-red-600"
        >
          ×
        </button>
      </div>
    </div>
  );
}

function NotificationSettings({ preferences, onSave, onClose }) {
  const [formData, setFormData] = useState(preferences || {
    channels: {
      email: { enabled: true, types: [] },
      webhook: { enabled: false, types: [] },
      realtime: { enabled: true, types: [] },
      sms: { enabled: false, types: [] },
      slack: { enabled: false, types: [] },
    },
    digest: {
      enabled: false,
      frequency: 'daily',
      types: [],
    },
    muted: [],
    filters: [],
  });

  const handleChannelToggle = (channel) => {
    setFormData({
      ...formData,
      channels: {
        ...formData.channels,
        [channel]: {
          ...formData.channels[channel],
          enabled: !formData.channels[channel].enabled,
        },
      },
    });
  };

  const handleDigestToggle = () => {
    setFormData({
      ...formData,
      digest: {
        ...formData.digest,
        enabled: !formData.digest.enabled,
      },
    });
  };

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md p-6">
        <h3 className="text-lg font-bold mb-4">Notification Settings</h3>

        {/* Channels */}
        <div className="space-y-3 mb-6">
          <h4 className="font-semibold text-sm">Notification Channels</h4>
          
          {Object.keys(formData.channels).map(channel => (
            <label key={channel} className="flex items-center justify-between">
              <span className="capitalize">{channel}</span>
              <input
                type="checkbox"
                checked={formData.channels[channel].enabled}
                onChange={() => handleChannelToggle(channel)}
                className="w-4 h-4"
              />
            </label>
          ))}
        </div>

        {/* Digest */}
        <div className="mb-6">
          <h4 className="font-semibold text-sm mb-2">Digest Settings</h4>
          
          <label className="flex items-center justify-between mb-2">
            <span>Enable digest</span>
            <input
              type="checkbox"
              checked={formData.digest.enabled}
              onChange={handleDigestToggle}
              className="w-4 h-4"
            />
          </label>

          {formData.digest.enabled && (
            <select
              value={formData.digest.frequency}
              onChange={(e) => setFormData({
                ...formData,
                digest: { ...formData.digest, frequency: e.target.value },
              })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}