import { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { Schedule, ScheduleStats, DoctorStats } from '../types';
import {
  BarChart3,
  TrendingUp,
  Users,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Building2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Download,
  FileSpreadsheet,
  Table,
} from 'lucide-react';
import './DashboardPage.css';

export function DashboardPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [stats, setStats] = useState<ScheduleStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    loadSchedules();
  }, []);

  useEffect(() => {
    if (selectedSchedule) {
      loadStats(selectedSchedule.id);
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

  const loadStats = async (scheduleId: number) => {
    setIsLoadingStats(true);
    try {
      const data = await api.getScheduleStats(scheduleId);
      setStats(data);
    } catch (err) {
      setError('Failed to load statistics');
      console.error(err);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const navigateSchedule = (direction: 'prev' | 'next') => {
    if (!selectedSchedule) return;
    const currentIndex = schedules.findIndex((s) => s.id === selectedSchedule.id);
    const newIndex = direction === 'prev' ? currentIndex + 1 : currentIndex - 1;
    if (newIndex >= 0 && newIndex < schedules.length) {
      setSelectedSchedule(schedules[newIndex]);
    }
  };

  const getMonthName = (month: number) => {
    return new Date(2000, month - 1).toLocaleString('en-US', { month: 'long' });
  };

  const getCoverageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getBalanceColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleExport = async (type: 'assignments' | 'doctor-hours' | 'coverage-matrix') => {
    if (!selectedSchedule) return;
    setIsExporting(true);
    setShowExportMenu(false);
    try {
      switch (type) {
        case 'assignments':
          await api.exportAssignmentsCsv(selectedSchedule.id);
          break;
        case 'doctor-hours':
          await api.exportDoctorHoursCsv(selectedSchedule.id);
          break;
        case 'coverage-matrix':
          await api.exportCoverageMatrixCsv(selectedSchedule.id);
          break;
      }
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p>{error}</p>
        <button onClick={loadSchedules} className="btn-primary">
          Retry
        </button>
      </div>
    );
  }

  if (!selectedSchedule) {
    return (
      <div className="empty-state">
        <BarChart3 size={48} />
        <p>No schedules available</p>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <header className="page-header">
        <div className="header-title">
          <BarChart3 size={24} />
          <h1>Dashboard</h1>
        </div>

        <div className="header-actions">
          <div className="schedule-navigator">
            <button
              className="btn-icon"
              onClick={() => navigateSchedule('prev')}
              disabled={schedules.findIndex((s) => s.id === selectedSchedule.id) === schedules.length - 1}
            >
              <ChevronLeft size={18} />
            </button>
            <span className="schedule-label">
              {getMonthName(selectedSchedule.month)} {selectedSchedule.year}
            </span>
            <button
              className="btn-icon"
              onClick={() => navigateSchedule('next')}
              disabled={schedules.findIndex((s) => s.id === selectedSchedule.id) === 0}
            >
              <ChevronRight size={18} />
            </button>
            <button
              className="btn-icon"
              onClick={() => loadStats(selectedSchedule.id)}
              title="Refresh"
            >
              <RefreshCw size={16} />
            </button>
          </div>

          <div className="export-dropdown">
            <button
              className="btn-secondary"
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={isExporting || !stats}
            >
              <Download size={16} />
              {isExporting ? 'Exporting...' : 'Export'}
            </button>
            {showExportMenu && (
              <div className="export-menu">
                <button onClick={() => handleExport('assignments')}>
                  <FileSpreadsheet size={16} />
                  All Assignments (CSV)
                </button>
                <button onClick={() => handleExport('doctor-hours')}>
                  <Users size={16} />
                  Doctor Hours Summary (CSV)
                </button>
                <button onClick={() => handleExport('coverage-matrix')}>
                  <Table size={16} />
                  Coverage Matrix (CSV)
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {isLoadingStats ? (
        <div className="loading-container">
          <div className="spinner" />
          <p>Loading statistics...</p>
        </div>
      ) : stats ? (
        <>
          {/* Summary Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">
                <Calendar size={24} />
              </div>
              <div className="stat-content">
                <span className="stat-value">{stats.summary.total_assignments}</span>
                <span className="stat-label">Total Assignments</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <Clock size={24} />
              </div>
              <div className="stat-content">
                <span className="stat-value">{stats.summary.total_hours.toLocaleString()}h</span>
                <span className="stat-label">Total Hours</span>
              </div>
            </div>

            <div className="stat-card">
              <div className={`stat-icon ${getCoverageColor(stats.summary.coverage_percentage)}`}>
                {stats.summary.coverage_percentage >= 90 ? (
                  <CheckCircle size={24} />
                ) : (
                  <AlertTriangle size={24} />
                )}
              </div>
              <div className="stat-content">
                <span className={`stat-value ${getCoverageColor(stats.summary.coverage_percentage)}`}>
                  {stats.summary.coverage_percentage}%
                </span>
                <span className="stat-label">Coverage</span>
              </div>
            </div>

            <div className="stat-card">
              <div className={`stat-icon ${getBalanceColor(stats.summary.workload_balance_score)}`}>
                <TrendingUp size={24} />
              </div>
              <div className="stat-content">
                <span className={`stat-value ${getBalanceColor(stats.summary.workload_balance_score)}`}>
                  {stats.summary.workload_balance_score}%
                </span>
                <span className="stat-label">Workload Balance</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <Users size={24} />
              </div>
              <div className="stat-content">
                <span className="stat-value">
                  {stats.summary.doctors_with_assignments}/{stats.summary.total_doctors}
                </span>
                <span className="stat-label">Active Doctors</span>
              </div>
            </div>

            <div className="stat-card">
              <div className={`stat-icon ${stats.summary.doctors_over_limit > 0 ? 'text-red-600' : 'text-green-600'}`}>
                <AlertTriangle size={24} />
              </div>
              <div className="stat-content">
                <span className={`stat-value ${stats.summary.doctors_over_limit > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {stats.summary.doctors_over_limit}
                </span>
                <span className="stat-label">Over Hours Limit</span>
              </div>
            </div>
          </div>

          {/* Doctor Hours Chart */}
          <div className="dashboard-section">
            <h2>
              <Users size={20} />
              Doctor Hours Distribution
            </h2>
            <div className="doctor-hours-chart">
              {stats.doctor_stats
                .filter((d) => d.assignment_count > 0)
                .map((doctor) => (
                  <DoctorHoursBar key={doctor.doctor_id} doctor={doctor} />
                ))}
            </div>
          </div>

          {/* Center and Shift Stats */}
          <div className="dashboard-row">
            <div className="dashboard-section">
              <h2>
                <Building2 size={20} />
                Assignments by Center
              </h2>
              <div className="distribution-list">
                {stats.center_stats.map((center) => (
                  <div key={center.center_id} className="distribution-item">
                    <span className="distribution-name">{center.center_name}</span>
                    <div className="distribution-bar-container">
                      <div
                        className="distribution-bar"
                        style={{
                          width: `${(center.assignment_count / stats.summary.total_assignments) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="distribution-value">{center.assignment_count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="dashboard-section">
              <h2>
                <Clock size={20} />
                Assignments by Shift
              </h2>
              <div className="distribution-list">
                {stats.shift_stats.map((shift) => (
                  <div key={shift.shift_id} className="distribution-item">
                    <span className="distribution-name">
                      {shift.shift_code}
                      {shift.is_overnight && ' (Night)'}
                    </span>
                    <div className="distribution-bar-container">
                      <div
                        className="distribution-bar shift-bar"
                        style={{
                          width: `${(shift.assignment_count / stats.summary.total_assignments) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="distribution-value">{shift.assignment_count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Coverage Gaps */}
          {stats.coverage_stats.gaps_count > 0 && (
            <div className="dashboard-section">
              <h2>
                <AlertTriangle size={20} />
                Coverage Gaps ({stats.coverage_stats.gaps_count})
              </h2>
              <div className="gaps-table">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Center</th>
                      <th>Shift</th>
                      <th>Required</th>
                      <th>Assigned</th>
                      <th>Gap</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.coverage_stats.gaps.slice(0, 10).map((gap, index) => (
                      <tr key={index}>
                        <td>{new Date(gap.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                        <td>{gap.center}</td>
                        <td>{gap.shift}</td>
                        <td>{gap.required}</td>
                        <td>{gap.actual}</td>
                        <td className="text-red-600">-{gap.gap}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {stats.coverage_stats.gaps_count > 10 && (
                  <p className="gaps-more">
                    ... and {stats.coverage_stats.gaps_count - 10} more gaps
                  </p>
                )}
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

function DoctorHoursBar({ doctor }: { doctor: DoctorStats }) {
  const percentage = Math.min(doctor.hours_percentage, 100);
  const barColor = doctor.is_over_limit
    ? 'bg-red-500'
    : doctor.hours_percentage >= 80
    ? 'bg-yellow-500'
    : 'bg-blue-500';

  return (
    <div className="doctor-hours-row">
      <div className="doctor-hours-name">
        <span className="doctor-name">{doctor.doctor_name}</span>
        <span className={`nationality-badge nationality-${doctor.nationality}`}>
          {doctor.nationality === 'saudi' ? 'SA' : 'NS'}
        </span>
      </div>
      <div className="doctor-hours-bar-container">
        <div className={`doctor-hours-bar ${barColor}`} style={{ width: `${percentage}%` }} />
        <div className="doctor-hours-limit" style={{ left: '100%' }} />
      </div>
      <div className="doctor-hours-value">
        <span className={doctor.is_over_limit ? 'text-red-600' : ''}>
          {doctor.total_hours}h
        </span>
        <span className="hours-max">/ {doctor.max_hours}h</span>
      </div>
    </div>
  );
}
