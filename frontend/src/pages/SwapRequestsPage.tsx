import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import './SwapRequestsPage.css';

interface SwapRequest {
  id: number;
  requester_id: number;
  requester_name: string;
  target_id: number | null;
  target_name: string | null;
  requester_assignment_id: number;
  requester_assignment_date: string;
  requester_assignment_shift: string;
  requester_assignment_center: string;
  target_assignment_id: number | null;
  target_assignment_date: string | null;
  target_assignment_shift: string | null;
  target_assignment_center: string | null;
  request_type: string;
  status: string;
  message: string | null;
  response_message: string | null;
  created_at: string;
  responded_at: string | null;
  expires_at: string | null;
}

interface SwapListResponse {
  items: SwapRequest[];
  total: number;
  pending_count: number;
}

export function SwapRequestsPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'sent' | 'received' | 'open'>('all');
  const [responseModal, setResponseModal] = useState<SwapRequest | null>(null);
  const [responseMessage, setResponseMessage] = useState('');
  const queryClient = useQueryClient();

  const { data: swaps, isLoading } = useQuery<SwapListResponse>({
    queryKey: ['swap-requests', activeTab],
    queryFn: async (): Promise<SwapListResponse> => {
      if (activeTab === 'open') {
        const response = await api.get<SwapListResponse>('/swaps/open/available');
        return response.data;
      }
      const params = activeTab !== 'all' ? `?type=${activeTab}` : '';
      const response = await api.get<SwapListResponse>(`/swaps${params}`);
      return response.data;
    },
  });

  const respondMutation = useMutation({
    mutationFn: ({ id, accept, message }: { id: number; accept: boolean; message: string }) =>
      api.post(`/swaps/${id}/respond`, { accept, response_message: message }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['swap-requests'] });
      setResponseModal(null);
      setResponseMessage('');
      if (variables.accept) {
        toast.success('✓ Swap request accepted');
      } else {
        toast.success('Swap request declined');
      }
    },
    onError: () => {
      toast.error('Failed to respond to swap request');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => api.post(`/swaps/${id}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['swap-requests'] });
      toast.success('✓ Swap request cancelled');
    },
    onError: () => {
      toast.error('Failed to cancel swap request');
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="status-badge pending">Pending</span>;
      case 'accepted':
        return <span className="status-badge accepted">Accepted</span>;
      case 'declined':
        return <span className="status-badge declined">Declined</span>;
      case 'cancelled':
        return <span className="status-badge cancelled">Cancelled</span>;
      case 'expired':
        return <span className="status-badge expired">Expired</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'swap':
        return '🔄';
      case 'giveaway':
        return '🎁';
      case 'pickup':
        return '✋';
      default:
        return '📋';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="swap-requests-page">
      <div className="page-header">
        <div className="header-content">
          <h1>Shift Swaps</h1>
          <p className="header-subtitle">
            Request to swap shifts with colleagues or pick up available shifts
          </p>
        </div>
        <div className="header-stats">
          <div className="stat-card">
            <span className="stat-value">{swaps?.pending_count || 0}</span>
            <span className="stat-label">Pending</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{swaps?.total || 0}</span>
            <span className="stat-label">Total</span>
          </div>
        </div>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All Requests
        </button>
        <button
          className={`tab ${activeTab === 'sent' ? 'active' : ''}`}
          onClick={() => setActiveTab('sent')}
        >
          Sent
        </button>
        <button
          className={`tab ${activeTab === 'received' ? 'active' : ''}`}
          onClick={() => setActiveTab('received')}
        >
          Received
        </button>
        <button
          className={`tab ${activeTab === 'open' ? 'active' : ''}`}
          onClick={() => setActiveTab('open')}
        >
          Open Shifts
          {swaps?.pending_count && swaps.pending_count > 0 && activeTab === 'open' && (
            <span className="tab-badge">{swaps.pending_count}</span>
          )}
        </button>
      </div>

      <div className="swap-list">
        {isLoading ? (
          <div className="loading-state">
            <div className="spinner-large" />
            <p>Loading swap requests...</p>
          </div>
        ) : !swaps?.items?.length ? (
          <div className="empty-state">
            <div className="empty-icon">🔄</div>
            <h3>No swap requests</h3>
            <p>
              {activeTab === 'open'
                ? 'No open shifts available for pickup'
                : activeTab === 'sent'
                ? "You haven't sent any swap requests yet"
                : activeTab === 'received'
                ? "You haven't received any swap requests"
                : 'No swap requests to display'}
            </p>
          </div>
        ) : (
          swaps.items.map((swap) => (
            <div key={swap.id} className={`swap-card ${swap.status}`}>
              <div className="swap-header">
                <div className="swap-type">
                  <span className="type-icon">{getTypeIcon(swap.request_type)}</span>
                  <span className="type-label">
                    {swap.request_type === 'swap'
                      ? 'Shift Swap'
                      : swap.request_type === 'giveaway'
                      ? 'Shift Giveaway'
                      : 'Shift Pickup'}
                  </span>
                </div>
                {getStatusBadge(swap.status)}
              </div>

              <div className="swap-body">
                <div className="swap-shifts">
                  <div className="shift-card offering">
                    <div className="shift-label">
                      {swap.request_type === 'pickup' ? 'Available Shift' : 'Offering'}
                    </div>
                    <div className="shift-date">{formatDate(swap.requester_assignment_date)}</div>
                    <div className="shift-details">
                      <span className="shift-code">{swap.requester_assignment_shift}</span>
                      <span className="shift-center">{swap.requester_assignment_center}</span>
                    </div>
                    <div className="shift-owner">
                      <span className="owner-avatar">
                        {swap.requester_name.charAt(0).toUpperCase()}
                      </span>
                      <span className="owner-name">{swap.requester_name}</span>
                    </div>
                  </div>

                  {swap.request_type === 'swap' && swap.target_assignment_date && (
                    <>
                      <div className="swap-arrow">⇄</div>
                      <div className="shift-card wanting">
                        <div className="shift-label">Requesting</div>
                        <div className="shift-date">{formatDate(swap.target_assignment_date)}</div>
                        <div className="shift-details">
                          <span className="shift-code">{swap.target_assignment_shift}</span>
                          <span className="shift-center">{swap.target_assignment_center}</span>
                        </div>
                        {swap.target_name && (
                          <div className="shift-owner">
                            <span className="owner-avatar">
                              {swap.target_name.charAt(0).toUpperCase()}
                            </span>
                            <span className="owner-name">{swap.target_name}</span>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {swap.message && (
                  <div className="swap-message">
                    <strong>Message:</strong> {swap.message}
                  </div>
                )}

                {swap.response_message && (
                  <div className="swap-response">
                    <strong>Response:</strong> {swap.response_message}
                  </div>
                )}
              </div>

              <div className="swap-footer">
                <div className="swap-time">
                  <span className="time-label">Created</span>
                  <span className="time-value">{formatTime(swap.created_at)}</span>
                </div>

                {swap.status === 'pending' && (
                  <div className="swap-actions">
                    {/* Can respond if received or open pickup */}
                    {(activeTab === 'received' || activeTab === 'open') && (
                      <>
                        <button
                          className="btn-accept"
                          onClick={() => setResponseModal(swap)}
                        >
                          Accept
                        </button>
                        <button
                          className="btn-decline"
                          onClick={() =>
                            respondMutation.mutate({
                              id: swap.id,
                              accept: false,
                              message: '',
                            })
                          }
                        >
                          Decline
                        </button>
                      </>
                    )}
                    {/* Can cancel own requests */}
                    {activeTab === 'sent' && (
                      <button
                        className="btn-cancel"
                        onClick={() => cancelMutation.mutate(swap.id)}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Response Modal */}
      {responseModal && (
        <div className="modal-overlay" onClick={() => setResponseModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Accept Swap Request</h3>
              <button className="modal-close" onClick={() => setResponseModal(null)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>
                You are about to accept this shift{' '}
                {responseModal.request_type === 'swap' ? 'swap' : 'pickup'}.
              </p>
              <div className="form-group">
                <label>Message (optional)</label>
                <textarea
                  value={responseMessage}
                  onChange={(e) => setResponseMessage(e.target.value)}
                  placeholder="Add a message..."
                  rows={3}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setResponseModal(null)}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={() =>
                  respondMutation.mutate({
                    id: responseModal.id,
                    accept: true,
                    message: responseMessage,
                  })
                }
              >
                Accept Swap
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
