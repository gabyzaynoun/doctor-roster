import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import './NotificationCenter.css';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  priority: string;
  is_read: boolean;
  action_url: string | null;
  action_label: string | null;
  created_at: string;
}

interface NotificationListResponse {
  items: Notification[];
  total: number;
  unread_count: number;
}

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<NotificationListResponse>({
    queryKey: ['notifications'],
    queryFn: async (): Promise<NotificationListResponse> => {
      const response = await api.get<NotificationListResponse>('/notifications');
      return response.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const markReadMutation = useMutation({
    mutationFn: (id: number) => api.post(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Close panel when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = data?.unread_count || 0;
  const notifications = data?.items || [];

  const getIcon = (type: string) => {
    switch (type) {
      case 'swap_request_received':
        return '🔄';
      case 'swap_request_accepted':
        return '✅';
      case 'swap_request_declined':
        return '❌';
      case 'schedule_published':
        return '📅';
      case 'shift_assigned':
        return '👤';
      case 'announcement':
        return '📢';
      case 'leave_approved':
        return '🏖️';
      case 'leave_rejected':
        return '🚫';
      default:
        return '🔔';
    }
  };

  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'priority-urgent';
      case 'high':
        return 'priority-high';
      case 'low':
        return 'priority-low';
      default:
        return '';
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="notification-center" ref={panelRef}>
      <button
        className={`notification-bell ${unreadCount > 0 ? 'has-unread' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-panel">
          <div className="notification-header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button
                className="mark-all-read"
                onClick={() => markAllReadMutation.mutate()}
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="notification-list">
            {isLoading ? (
              <div className="notification-loading">
                <div className="spinner" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="notification-empty">
                <span className="empty-icon">🔔</span>
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item ${!notification.is_read ? 'unread' : ''} ${getPriorityClass(notification.priority)}`}
                  onClick={() => {
                    if (!notification.is_read) {
                      markReadMutation.mutate(notification.id);
                    }
                    if (notification.action_url) {
                      window.location.href = notification.action_url;
                    }
                  }}
                >
                  <span className="notification-icon">{getIcon(notification.type)}</span>
                  <div className="notification-content">
                    <div className="notification-title">{notification.title}</div>
                    <div className="notification-message">{notification.message}</div>
                    <div className="notification-time">{formatTime(notification.created_at)}</div>
                  </div>
                  {!notification.is_read && <span className="unread-dot" />}
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="notification-footer">
              <a href="/notifications">View all notifications</a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
