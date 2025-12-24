import { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { Doctor, DoctorStats, Assignment, Leave } from '../types';
import {
  X,
  User,
  Mail,
  Briefcase,
  Moon,
  Baby,
  Clock,
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Activity,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';

interface DoctorDetailModalProps {
  doctor: Doctor;
  stats?: DoctorStats;
  onClose: () => void;
  onRequestSwap?: (assignmentId: number) => void;
}

export function DoctorDetailModal({
  doctor,
  stats,
  onClose,
  onRequestSwap,
}: DoctorDetailModalProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'schedule' | 'leaves'>('overview');

  useEffect(() => {
    loadDoctorData();
  }, [doctor.id]);

  const loadDoctorData = async () => {
    setIsLoading(true);
    try {
      // Load current month's assignments
      const now = new Date();
      const start = format(startOfMonth(now), 'yyyy-MM-dd');
      const end = format(endOfMonth(now), 'yyyy-MM-dd');

      const [assignmentsData, leavesData] = await Promise.all([
        api.getAssignments({ doctor_id: doctor.id, date_from: start, date_to: end }),
        api.getLeaves({ doctor_id: doctor.id }),
      ]);

      setAssignments(assignmentsData);
      setLeaves(leavesData);
    } catch (err) {
      console.error('Failed to load doctor data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const hoursPercentage = stats?.hours_percentage || 0;
  const isOverLimit = stats?.is_over_limit || false;
  const isBurnoutRisk = hoursPercentage >= 85 && !isOverLimit;

  const getStatusColor = () => {
    if (isOverLimit) return 'var(--danger)';
    if (isBurnoutRisk) return 'var(--warning)';
    if (hoursPercentage >= 60) return 'var(--primary)';
    return 'var(--success)';
  };

  const getStatusLabel = () => {
    if (isOverLimit) return 'Over Limit';
    if (isBurnoutRisk) return 'High Workload';
    if (hoursPercentage >= 60) return 'Normal';
    return 'Available';
  };

  const initials = doctor.user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2) || 'DR';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal doctor-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <User size={20} />
            Doctor Profile
          </h2>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="doctor-detail-content">
          {/* Profile Header */}
          <div className="doctor-profile-header">
            <div className="doctor-avatar-large">{initials}</div>
            <div className="doctor-profile-info">
              <h3>{doctor.user?.name}</h3>
              <p className="doctor-email">
                <Mail size={14} />
                {doctor.user?.email}
              </p>
              {doctor.specialty && (
                <p className="doctor-specialty">
                  <Briefcase size={14} />
                  {doctor.specialty}
                </p>
              )}
              <div className="doctor-badges-row">
                {doctor.can_work_nights && (
                  <span className="profile-badge night">
                    <Moon size={12} /> Night Shifts
                  </span>
                )}
                {doctor.is_pediatrics_certified && (
                  <span className="profile-badge peds">
                    <Baby size={12} /> Pediatrics
                  </span>
                )}
                <span className={`profile-badge nationality-${doctor.user?.nationality}`}>
                  {doctor.user?.nationality === 'saudi' ? 'Saudi' : 'Non-Saudi'}
                </span>
              </div>
            </div>
            <div className="doctor-status-card" style={{ borderColor: getStatusColor() }}>
              <div className="status-value" style={{ color: getStatusColor() }}>
                {stats?.total_hours || 0}h
              </div>
              <div className="status-label">of {stats?.max_hours || 0}h</div>
              <div className="status-badge" style={{ background: getStatusColor() }}>
                {getStatusLabel()}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="detail-tabs">
            <button
              className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <Activity size={14} />
              Overview
            </button>
            <button
              className={`tab-btn ${activeTab === 'schedule' ? 'active' : ''}`}
              onClick={() => setActiveTab('schedule')}
            >
              <Calendar size={14} />
              Schedule ({assignments.length})
            </button>
            <button
              className={`tab-btn ${activeTab === 'leaves' ? 'active' : ''}`}
              onClick={() => setActiveTab('leaves')}
            >
              <Clock size={14} />
              Leaves ({leaves.length})
            </button>
          </div>

          {/* Tab Content */}
          <div className="detail-tab-content">
            {isLoading ? (
              <div className="loading-mini">
                <div className="spinner-small" />
                Loading...
              </div>
            ) : (
              <>
                {activeTab === 'overview' && (
                  <div className="overview-tab">
                    {/* Hours Progress */}
                    <div className="stat-section">
                      <h4>
                        <Clock size={16} /> Hours This Month
                      </h4>
                      <div className="hours-progress-large">
                        <div className="hours-bar-large">
                          <div
                            className="hours-fill-large"
                            style={{
                              width: `${Math.min(hoursPercentage, 100)}%`,
                              background: getStatusColor(),
                            }}
                          />
                        </div>
                        <div className="hours-labels">
                          <span>{stats?.total_hours || 0}h worked</span>
                          <span>{(stats?.max_hours || 0) - (stats?.total_hours || 0)}h remaining</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="quick-stats-grid">
                      <div className="quick-stat">
                        <Calendar size={18} />
                        <div className="quick-stat-value">{stats?.assignment_count || 0}</div>
                        <div className="quick-stat-label">Assignments</div>
                      </div>
                      <div className="quick-stat">
                        <Moon size={18} />
                        <div className="quick-stat-value">{stats?.overnight_count || 0}</div>
                        <div className="quick-stat-label">Night Shifts</div>
                      </div>
                      <div className="quick-stat">
                        <TrendingUp size={18} />
                        <div className="quick-stat-value">{hoursPercentage}%</div>
                        <div className="quick-stat-label">Utilization</div>
                      </div>
                    </div>

                    {/* Warnings */}
                    {(isOverLimit || isBurnoutRisk) && (
                      <div className={`warning-banner ${isOverLimit ? 'danger' : 'warning'}`}>
                        <AlertTriangle size={18} />
                        <div>
                          <strong>
                            {isOverLimit ? 'Hours Limit Exceeded' : 'High Workload Alert'}
                          </strong>
                          <p>
                            {isOverLimit
                              ? 'This doctor has exceeded their monthly hours limit. Consider reassigning some shifts.'
                              : 'This doctor is approaching their hours limit. Monitor closely.'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'schedule' && (
                  <div className="schedule-tab">
                    {assignments.length === 0 ? (
                      <div className="empty-tab">
                        <Calendar size={32} />
                        <p>No assignments this month</p>
                      </div>
                    ) : (
                      <div className="assignment-list">
                        {assignments.map((assignment) => (
                          <div key={assignment.id} className="assignment-item">
                            <div className="assignment-date">
                              {format(parseISO(assignment.date), 'EEE, MMM d')}
                            </div>
                            <div className="assignment-details">
                              <span className="center-badge">
                                {assignment.center?.code || 'N/A'}
                              </span>
                              <span className="shift-badge">
                                {assignment.shift?.code || 'N/A'}
                              </span>
                              <span className="hours-badge">
                                {assignment.shift?.hours || 0}h
                              </span>
                            </div>
                            {onRequestSwap && (
                              <button
                                className="btn-icon-small"
                                onClick={() => onRequestSwap(assignment.id)}
                                title="Request swap for this shift"
                              >
                                <RefreshCw size={14} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'leaves' && (
                  <div className="leaves-tab">
                    {leaves.length === 0 ? (
                      <div className="empty-tab">
                        <Clock size={32} />
                        <p>No leave requests</p>
                      </div>
                    ) : (
                      <div className="leave-list">
                        {leaves.map((leave) => (
                          <div key={leave.id} className="leave-item">
                            <div className={`leave-status status-${leave.status}`}>
                              {leave.status === 'approved' ? (
                                <CheckCircle size={14} />
                              ) : leave.status === 'rejected' ? (
                                <X size={14} />
                              ) : (
                                <Clock size={14} />
                              )}
                              {leave.status}
                            </div>
                            <div className="leave-type">{leave.leave_type}</div>
                            <div className="leave-dates">
                              {format(parseISO(leave.start_date), 'MMM d')}
                              <ArrowRight size={12} />
                              {format(parseISO(leave.end_date), 'MMM d')}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
