import { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { FairnessMetrics, Schedule } from '../types';
import {
  Scale,
  Moon,
  Calendar,
  Gift,
  Clock,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Lightbulb,
  Users,
} from 'lucide-react';
import { format } from 'date-fns';

export function FairnessPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [metrics, setMetrics] = useState<FairnessMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSchedules();
  }, []);

  useEffect(() => {
    if (selectedSchedule) {
      loadMetrics(selectedSchedule.id);
    }
  }, [selectedSchedule]);

  const loadSchedules = async () => {
    setIsLoading(true);
    try {
      const data = await api.getSchedules();
      setSchedules(data);
      if (data.length > 0) {
        setSelectedSchedule(data[0]);
      }
    } catch (err) {
      setError('Failed to load schedules');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMetrics = async (scheduleId: number) => {
    setIsLoadingMetrics(true);
    try {
      const data = await api.getFairnessMetrics(scheduleId);
      setMetrics(data);
    } catch (err) {
      console.error(err);
      setMetrics(null);
    } finally {
      setIsLoadingMetrics(false);
    }
  };

  const navigateSchedule = (direction: 'prev' | 'next') => {
    if (!selectedSchedule) return;
    const currentIndex = schedules.findIndex(s => s.id === selectedSchedule.id);
    const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex >= 0 && newIndex < schedules.length) {
      setSelectedSchedule(schedules[newIndex]);
    }
  };

  const getBalanceColor = (score: number): string => {
    if (score >= 80) return 'var(--success)';
    if (score >= 60) return 'var(--warning)';
    return 'var(--danger)';
  };

  const getBalanceLabel = (score: number): string => {
    if (score >= 80) return 'Good';
    if (score >= 60) return 'Fair';
    return 'Poor';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle size={16} />;
    if (score >= 60) return <TrendingUp size={16} />;
    return <AlertTriangle size={16} />;
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <p>Loading fairness analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <AlertTriangle size={48} />
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="fairness-page">
      <header className="page-header">
        <div className="header-title">
          <Scale size={28} />
          <h1>Fairness Analytics</h1>
        </div>

        <div className="schedule-navigator">
          <button
            className="btn-icon"
            onClick={() => navigateSchedule('prev')}
            disabled={!selectedSchedule || schedules.indexOf(selectedSchedule) === 0}
          >
            <ChevronLeft size={20} />
          </button>
          <span className="schedule-label">
            {selectedSchedule && format(new Date(selectedSchedule.year, selectedSchedule.month - 1), 'MMMM yyyy')}
          </span>
          <button
            className="btn-icon"
            onClick={() => navigateSchedule('next')}
            disabled={!selectedSchedule || schedules.indexOf(selectedSchedule) === schedules.length - 1}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </header>

      {isLoadingMetrics ? (
        <div className="loading-container">
          <div className="spinner" />
          <p>Calculating fairness metrics...</p>
        </div>
      ) : metrics ? (
        <>
          {/* Overall Fairness Score */}
          <div className="fairness-overview">
            <div className="overall-score" style={{ borderColor: getBalanceColor(metrics.overall_fairness) }}>
              <div className="score-value" style={{ color: getBalanceColor(metrics.overall_fairness) }}>
                {metrics.overall_fairness}%
              </div>
              <div className="score-label">Overall Fairness</div>
              <div className="score-status" style={{ color: getBalanceColor(metrics.overall_fairness) }}>
                {getScoreIcon(metrics.overall_fairness)}
                {getBalanceLabel(metrics.overall_fairness)}
              </div>
            </div>
          </div>

          {/* Balance Metrics Grid */}
          <div className="balance-grid">
            <div className="balance-card">
              <div className="balance-icon">
                <Moon size={24} />
              </div>
              <div className="balance-content">
                <div className="balance-value" style={{ color: getBalanceColor(metrics.night_shift_balance) }}>
                  {metrics.night_shift_balance}%
                </div>
                <div className="balance-label">Night Shift Balance</div>
                <div className="balance-bar">
                  <div
                    className="balance-fill"
                    style={{
                      width: `${metrics.night_shift_balance}%`,
                      background: getBalanceColor(metrics.night_shift_balance),
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="balance-card">
              <div className="balance-icon">
                <Calendar size={24} />
              </div>
              <div className="balance-content">
                <div className="balance-value" style={{ color: getBalanceColor(metrics.weekend_balance) }}>
                  {metrics.weekend_balance}%
                </div>
                <div className="balance-label">Weekend Balance</div>
                <div className="balance-bar">
                  <div
                    className="balance-fill"
                    style={{
                      width: `${metrics.weekend_balance}%`,
                      background: getBalanceColor(metrics.weekend_balance),
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="balance-card">
              <div className="balance-icon">
                <Gift size={24} />
              </div>
              <div className="balance-content">
                <div className="balance-value" style={{ color: getBalanceColor(metrics.holiday_balance) }}>
                  {metrics.holiday_balance}%
                </div>
                <div className="balance-label">Holiday Balance</div>
                <div className="balance-bar">
                  <div
                    className="balance-fill"
                    style={{
                      width: `${metrics.holiday_balance}%`,
                      background: getBalanceColor(metrics.holiday_balance),
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="balance-card">
              <div className="balance-icon">
                <Clock size={24} />
              </div>
              <div className="balance-content">
                <div className="balance-value" style={{ color: getBalanceColor(metrics.hours_balance) }}>
                  {metrics.hours_balance}%
                </div>
                <div className="balance-label">Hours Balance</div>
                <div className="balance-bar">
                  <div
                    className="balance-fill"
                    style={{
                      width: `${metrics.hours_balance}%`,
                      background: getBalanceColor(metrics.hours_balance),
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="recommendations-section">
            <h2><Lightbulb size={20} /> Recommendations</h2>
            <div className="recommendations-list">
              {metrics.recommendations.map((rec, index) => (
                <div key={index} className="recommendation-item">
                  <span className="rec-number">{index + 1}</span>
                  <span className="rec-text">{rec}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Doctor Stats Table */}
          <div className="doctor-fairness-section">
            <h2><Users size={20} /> Doctor Fairness Breakdown</h2>
            <div className="fairness-table-container">
              <table className="fairness-table">
                <thead>
                  <tr>
                    <th>Doctor</th>
                    <th>Fairness Score</th>
                    <th>Night Shifts</th>
                    <th>Weekend Shifts</th>
                    <th>Holiday Shifts</th>
                    <th>Total Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.doctor_stats.map((doctor) => (
                    <tr key={doctor.doctor_id}>
                      <td className="doctor-name">{doctor.doctor_name}</td>
                      <td>
                        <span
                          className="fairness-score-badge"
                          style={{ background: getBalanceColor(doctor.fairness_score) }}
                        >
                          {doctor.fairness_score}%
                        </span>
                      </td>
                      <td>{doctor.night_shifts}</td>
                      <td>{doctor.weekend_shifts}</td>
                      <td>{doctor.holiday_shifts}</td>
                      <td>{doctor.total_hours}h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="empty-state">
          <Scale size={48} />
          <p>No fairness data available for this schedule</p>
        </div>
      )}
    </div>
  );
}
