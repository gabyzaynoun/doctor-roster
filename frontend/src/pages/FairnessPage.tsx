import { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { FairnessMetrics, Schedule, Doctor, Center, Shift } from '../types';
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
  FlaskConical,
  Download,
  Eye,
  EyeOff,
} from 'lucide-react';
import { format } from 'date-fns';
import { EmptyState } from '../components/EmptyState';
import { WhatIfSimulator } from '../components/WhatIfSimulator';

export function FairnessPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [metrics, setMetrics] = useState<FairnessMetrics | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSimulator, setShowSimulator] = useState(false);
  const [showDetailedView, setShowDetailedView] = useState(true);
  const [sortBy, setSortBy] = useState<'name' | 'score' | 'hours'>('score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadSchedules();
    loadDoctors();
    loadCentersAndShifts();
  }, []);

  const loadDoctors = async () => {
    try {
      const data = await api.getDoctors();
      setDoctors(data);
    } catch (err) {
      console.error('Failed to load doctors:', err);
    }
  };

  const loadCentersAndShifts = async () => {
    try {
      const [centersData, shiftsData] = await Promise.all([
        api.getCenters(),
        api.getShifts(),
      ]);
      setCenters(centersData);
      setShifts(shiftsData);
    } catch (err) {
      console.error('Failed to load centers/shifts:', err);
    }
  };

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

  const sortedDoctorStats = metrics?.doctor_stats ? [...metrics.doctor_stats].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'name':
        comparison = a.doctor_name.localeCompare(b.doctor_name);
        break;
      case 'score':
        comparison = a.fairness_score - b.fairness_score;
        break;
      case 'hours':
        comparison = a.total_hours - b.total_hours;
        break;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  }) : [];

  const handleSort = (column: 'name' | 'score' | 'hours') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const exportToCSV = () => {
    if (!metrics) return;

    const headers = ['Doctor', 'Fairness Score', 'Night Shifts', 'Weekend Shifts', 'Holiday Shifts', 'Total Hours'];
    const rows = metrics.doctor_stats.map(d => [
      d.doctor_name,
      d.fairness_score,
      d.night_shifts,
      d.weekend_shifts,
      d.holiday_shifts,
      d.total_hours
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fairness-report-${selectedSchedule ? format(new Date(selectedSchedule.year, selectedSchedule.month - 1), 'yyyy-MM') : 'export'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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

        <div className="header-actions">
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

          <div className="action-buttons">
            <button
              className="btn-secondary"
              onClick={() => setShowSimulator(true)}
              title="What-If Simulator"
            >
              <FlaskConical size={16} />
              What-If Simulator
            </button>
            <button
              className="btn-secondary"
              onClick={exportToCSV}
              disabled={!metrics}
              title="Export to CSV"
            >
              <Download size={16} />
              Export
            </button>
          </div>
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
            <div className="section-header">
              <h2><Users size={20} /> Doctor Fairness Breakdown</h2>
              <button
                className="btn-icon"
                onClick={() => setShowDetailedView(!showDetailedView)}
                title={showDetailedView ? 'Hide details' : 'Show details'}
              >
                {showDetailedView ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {showDetailedView && (
              <div className="fairness-table-container">
                <table className="fairness-table">
                  <thead>
                    <tr>
                      <th
                        className={`sortable ${sortBy === 'name' ? 'active' : ''}`}
                        onClick={() => handleSort('name')}
                      >
                        Doctor {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th
                        className={`sortable ${sortBy === 'score' ? 'active' : ''}`}
                        onClick={() => handleSort('score')}
                      >
                        Fairness Score {sortBy === 'score' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th>Night Shifts</th>
                      <th>Weekend Shifts</th>
                      <th>Holiday Shifts</th>
                      <th
                        className={`sortable ${sortBy === 'hours' ? 'active' : ''}`}
                        onClick={() => handleSort('hours')}
                      >
                        Total Hours {sortBy === 'hours' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedDoctorStats.map((doctor) => (
                      <tr
                        key={doctor.doctor_id}
                        className={doctor.fairness_score < 60 ? 'warning-row' : ''}
                      >
                        <td className="doctor-name">{doctor.doctor_name}</td>
                        <td>
                          <span
                            className="fairness-score-badge"
                            style={{ background: getBalanceColor(doctor.fairness_score) }}
                          >
                            {getScoreIcon(doctor.fairness_score)}
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
            )}
          </div>
        </>
      ) : schedules.length === 0 ? (
        <EmptyState
          type="fairness"
          title="No Schedules Yet"
          description="Create a schedule first to see fairness analytics."
        />
      ) : (
        <EmptyState
          type="fairness"
          description="Fairness data will appear once you add assignments to this schedule."
        />
      )}

      {/* What-If Simulator Modal */}
      {showSimulator && metrics && (
        <WhatIfSimulator
          metrics={metrics}
          doctors={doctors}
          centers={centers.map(c => ({ id: c.id, name: c.name, code: c.code }))}
          shifts={shifts.map(s => ({ id: s.id, code: s.code, hours: s.hours, is_overnight: s.is_overnight }))}
          onClose={() => setShowSimulator(false)}
          onApply={() => {
            setShowSimulator(false);
            if (selectedSchedule) {
              loadMetrics(selectedSchedule.id);
            }
          }}
        />
      )}
    </div>
  );
}
