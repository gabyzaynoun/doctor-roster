import { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { ShiftPosting, PostingType, PostingStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  ShoppingBag,
  Gift,
  ArrowRightLeft,
  HandCoins,
  Clock,
  MapPin,
  Calendar,
  AlertTriangle,
  CheckCircle,
  X,
  Filter,
  User,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export function MarketplacePage() {
  const { user } = useAuth();
  const [postings, setPostings] = useState<ShiftPosting[]>([]);
  const [myPostings, setMyPostings] = useState<ShiftPosting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<PostingType | 'all'>('all');
  const [showMyPostings, setShowMyPostings] = useState(false);
  const [claimingId, setClaimingId] = useState<number | null>(null);

  useEffect(() => {
    loadPostings();
    loadMyPostings();
  }, []);

  const loadPostings = async () => {
    setIsLoading(true);
    try {
      const data = await api.getMarketplacePostings('open');
      setPostings(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load marketplace');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMyPostings = async () => {
    try {
      const data = await api.getMyPostings();
      setMyPostings(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleClaim = async (postingId: number) => {
    setClaimingId(postingId);
    try {
      await api.claimPosting(postingId);
      toast.success('Shift claimed successfully!');
      loadPostings();
      loadMyPostings();
    } catch (err) {
      console.error(err);
      toast.error('Failed to claim shift');
    } finally {
      setClaimingId(null);
    }
  };

  const handleCancel = async (postingId: number) => {
    if (!confirm('Cancel this posting?')) return;
    try {
      await api.cancelPosting(postingId);
      toast.success('Posting cancelled');
      loadPostings();
      loadMyPostings();
    } catch (err) {
      console.error(err);
      toast.error('Failed to cancel posting');
    }
  };

  const getTypeIcon = (type: PostingType) => {
    switch (type) {
      case 'giveaway':
        return <Gift size={16} />;
      case 'pickup':
        return <HandCoins size={16} />;
      case 'swap':
        return <ArrowRightLeft size={16} />;
    }
  };

  const getTypeLabel = (type: PostingType) => {
    switch (type) {
      case 'giveaway':
        return 'Shift Giveaway';
      case 'pickup':
        return 'Looking for Shift';
      case 'swap':
        return 'Swap Request';
    }
  };

  const getStatusColor = (status: PostingStatus) => {
    switch (status) {
      case 'open':
        return 'status-open';
      case 'pending':
        return 'status-pending';
      case 'claimed':
        return 'status-claimed';
      case 'cancelled':
        return 'status-cancelled';
      case 'expired':
        return 'status-expired';
    }
  };

  const filteredPostings = filter === 'all'
    ? postings
    : postings.filter(p => p.posting_type === filter);

  const displayPostings = showMyPostings ? myPostings : filteredPostings;

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <p>Loading marketplace...</p>
      </div>
    );
  }

  return (
    <div className="marketplace-page">
      <header className="page-header">
        <div className="header-title">
          <ShoppingBag size={28} />
          <h1>Shift Marketplace</h1>
        </div>
        <div className="header-actions">
          <button
            className={`btn-secondary ${showMyPostings ? 'active' : ''}`}
            onClick={() => setShowMyPostings(!showMyPostings)}
          >
            <User size={16} />
            My Postings ({myPostings.length})
          </button>
        </div>
      </header>

      {!showMyPostings && (
        <div className="marketplace-filters">
          <span className="filter-label"><Filter size={14} /> Filter by:</span>
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={`filter-btn ${filter === 'giveaway' ? 'active' : ''}`}
            onClick={() => setFilter('giveaway')}
          >
            <Gift size={14} /> Giveaways
          </button>
          <button
            className={`filter-btn ${filter === 'pickup' ? 'active' : ''}`}
            onClick={() => setFilter('pickup')}
          >
            <HandCoins size={14} /> Pickups
          </button>
          <button
            className={`filter-btn ${filter === 'swap' ? 'active' : ''}`}
            onClick={() => setFilter('swap')}
          >
            <ArrowRightLeft size={14} /> Swaps
          </button>
        </div>
      )}

      {displayPostings.length === 0 ? (
        <div className="empty-state">
          <ShoppingBag size={48} />
          <p>{showMyPostings ? 'You have no postings' : 'No shifts available in the marketplace'}</p>
        </div>
      ) : (
        <div className="postings-grid">
          {displayPostings.map((posting) => (
            <div
              key={posting.id}
              className={`posting-card ${posting.is_urgent ? 'urgent' : ''}`}
            >
              {posting.is_urgent && (
                <div className="urgent-badge">
                  <AlertTriangle size={12} /> Urgent
                </div>
              )}

              <div className="posting-header">
                <span className={`posting-type type-${posting.posting_type}`}>
                  {getTypeIcon(posting.posting_type)}
                  {getTypeLabel(posting.posting_type)}
                </span>
                <span className={`posting-status ${getStatusColor(posting.status)}`}>
                  {posting.status}
                </span>
              </div>

              {posting.assignment && (
                <div className="posting-assignment">
                  <div className="assignment-date">
                    <Calendar size={14} />
                    {format(new Date(posting.assignment.date), 'EEE, MMM d')}
                  </div>
                  <div className="assignment-details">
                    <span className="center-badge">{posting.assignment.center_code}</span>
                    <span className="shift-badge">{posting.assignment.shift_code}</span>
                    <span className="hours-badge">
                      <Clock size={12} /> {posting.assignment.hours}h
                    </span>
                  </div>
                  <div className="assignment-location">
                    <MapPin size={12} /> {posting.assignment.center_name}
                  </div>
                </div>
              )}

              <div className="posting-poster">
                <User size={14} />
                <span>{posting.poster?.name || 'Anonymous'}</span>
                {posting.poster?.specialty && (
                  <span className="specialty-tag">{posting.poster.specialty}</span>
                )}
              </div>

              {posting.message && (
                <div className="posting-message">
                  "{posting.message}"
                </div>
              )}

              <div className="posting-footer">
                <span className="posting-time">
                  Posted {format(new Date(posting.created_at), 'MMM d, h:mm a')}
                </span>

                {posting.status === 'open' && posting.poster_id !== (user as any)?.doctor_id && (
                  <button
                    className="btn-primary btn-claim"
                    onClick={() => handleClaim(posting.id)}
                    disabled={claimingId === posting.id}
                  >
                    {claimingId === posting.id ? 'Claiming...' : 'Claim'}
                  </button>
                )}

                {posting.status === 'claimed' && posting.claimed_by && (
                  <div className="claimed-info">
                    <CheckCircle size={14} />
                    Claimed by {posting.claimed_by.name}
                  </div>
                )}

                {showMyPostings && posting.status === 'open' && (
                  <button
                    className="btn-icon danger"
                    onClick={() => handleCancel(posting.id)}
                    title="Cancel posting"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
