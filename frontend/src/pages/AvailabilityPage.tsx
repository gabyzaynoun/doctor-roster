import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import './AvailabilityPage.css';

interface WeeklyPreference {
  id: number;
  day_of_week: number;
  day_name: string;
  preference: string;
  shift_id: number | null;
  shift_code: string | null;
}

interface DatePreference {
  id: number;
  date: string;
  preference: string;
  shift_id: number | null;
  shift_code: string | null;
  reason: string | null;
}

interface AvailabilityData {
  weekly: WeeklyPreference[];
  specific_dates: DatePreference[];
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const PREFERENCES = [
  { value: 'preferred', label: 'Preferred', color: '#22c55e', icon: '✓' },
  { value: 'neutral', label: 'Neutral', color: '#94a3b8', icon: '○' },
  { value: 'avoid', label: 'Avoid if possible', color: '#f59e0b', icon: '!' },
  { value: 'unavailable', label: 'Unavailable', color: '#ef4444', icon: '✕' },
];

export function AvailabilityPage() {
  const queryClient = useQueryClient();
  const [weeklyPrefs, setWeeklyPrefs] = useState<Record<number, string>>({});
  const [dateModalOpen, setDateModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedDatePref, setSelectedDatePref] = useState('unavailable');
  const [dateReason, setDateReason] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  const { data: availability, isLoading } = useQuery<AvailabilityData>({
    queryKey: ['availability'],
    queryFn: async (): Promise<AvailabilityData> => {
      const response = await api.get<AvailabilityData>('/availability');
      return response.data;
    },
  });

  // Initialize weekly prefs when data loads
  useEffect(() => {
    if (availability) {
      const prefs: Record<number, string> = {};
      availability.weekly.forEach((w: WeeklyPreference) => {
        prefs[w.day_of_week] = w.preference;
      });
      setWeeklyPrefs(prefs);
    }
  }, [availability]);

  const saveBulkMutation = useMutation({
    mutationFn: (preferences: Array<{ day_of_week: number; preference: string }>) =>
      api.put('/availability/weekly/bulk', preferences),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      setHasChanges(false);
    },
  });

  const addDateMutation = useMutation({
    mutationFn: (data: { date: string; preference: string; reason: string }) =>
      api.post('/availability/dates', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      setDateModalOpen(false);
      setSelectedDate('');
      setDateReason('');
    },
  });

  const deleteDateMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/availability/dates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability'] });
    },
  });

  const handleWeeklyChange = (dayIndex: number, preference: string) => {
    setWeeklyPrefs((prev) => ({
      ...prev,
      [dayIndex]: preference,
    }));
    setHasChanges(true);
  };

  const handleSaveWeekly = () => {
    const preferences = Object.entries(weeklyPrefs).map(([day, pref]) => ({
      day_of_week: parseInt(day),
      preference: pref,
    }));
    saveBulkMutation.mutate(preferences);
  };

  const getPreferenceInfo = (pref: string) => {
    return PREFERENCES.find((p) => p.value === pref) || PREFERENCES[1];
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  // Generate calendar dates for next 30 days
  const getCalendarDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const calendarDates = getCalendarDates();

  return (
    <div className="availability-page">
      <div className="page-header">
        <div className="header-content">
          <h1>My Availability</h1>
          <p className="header-subtitle">
            Set your work preferences to help with scheduling
          </p>
        </div>
      </div>

      {/* Weekly Preferences */}
      <div className="availability-section">
        <div className="section-header">
          <h2>Weekly Preferences</h2>
          <p>Set your recurring preferences for each day of the week</p>
        </div>

        <div className="preference-legend">
          {PREFERENCES.map((pref) => (
            <div key={pref.value} className="legend-item">
              <span
                className="legend-dot"
                style={{ backgroundColor: pref.color }}
              />
              <span>{pref.label}</span>
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="loading-state">
            <div className="spinner" />
          </div>
        ) : (
          <>
            <div className="weekly-grid">
              {DAYS.map((day, index) => {
                const currentPref = weeklyPrefs[index] || 'neutral';
                const prefInfo = getPreferenceInfo(currentPref);
                return (
                  <div key={day} className="day-card">
                    <div className="day-name">{day}</div>
                    <div className="day-selector">
                      {PREFERENCES.map((pref) => (
                        <button
                          key={pref.value}
                          className={`pref-button ${currentPref === pref.value ? 'active' : ''}`}
                          style={{
                            '--pref-color': pref.color,
                          } as React.CSSProperties}
                          onClick={() => handleWeeklyChange(index, pref.value)}
                          title={pref.label}
                        >
                          {pref.icon}
                        </button>
                      ))}
                    </div>
                    <div
                      className="day-status"
                      style={{ color: prefInfo.color }}
                    >
                      {prefInfo.label}
                    </div>
                  </div>
                );
              })}
            </div>

            {hasChanges && (
              <div className="save-bar">
                <span>You have unsaved changes</span>
                <button
                  className="btn-primary"
                  onClick={handleSaveWeekly}
                  disabled={saveBulkMutation.isPending}
                >
                  {saveBulkMutation.isPending ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Specific Date Preferences */}
      <div className="availability-section">
        <div className="section-header">
          <h2>Specific Dates</h2>
          <p>Override weekly preferences for specific dates</p>
          <button
            className="btn-add-date"
            onClick={() => setDateModalOpen(true)}
          >
            + Add Date
          </button>
        </div>

        {availability?.specific_dates?.length ? (
          <div className="dates-list">
            {availability.specific_dates.map((dp) => {
              const prefInfo = getPreferenceInfo(dp.preference);
              return (
                <div key={dp.id} className="date-item">
                  <div
                    className="date-indicator"
                    style={{ backgroundColor: prefInfo.color }}
                  />
                  <div className="date-info">
                    <div className="date-value">{formatDate(dp.date)}</div>
                    <div className="date-preference">{prefInfo.label}</div>
                    {dp.reason && (
                      <div className="date-reason">{dp.reason}</div>
                    )}
                  </div>
                  <button
                    className="btn-delete"
                    onClick={() => deleteDateMutation.mutate(dp.id)}
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-dates">
            <p>No specific date preferences set</p>
          </div>
        )}
      </div>

      {/* Quick Calendar View */}
      <div className="availability-section">
        <div className="section-header">
          <h2>Next 30 Days</h2>
          <p>Click a date to set specific availability</p>
        </div>

        <div className="calendar-mini">
          {calendarDates.map((date) => {
            const dayOfWeek = (date.getDay() + 6) % 7; // Convert to Mon=0
            const weeklyPref = weeklyPrefs[dayOfWeek] || 'neutral';
            const dateStr = date.toISOString().split('T')[0];
            const specificPref = availability?.specific_dates.find(
              (d) => d.date === dateStr
            );
            const currentPref = specificPref?.preference || weeklyPref;
            const prefInfo = getPreferenceInfo(currentPref);
            const isToday = date.toDateString() === new Date().toDateString();

            return (
              <button
                key={dateStr}
                className={`calendar-day ${isToday ? 'today' : ''} ${specificPref ? 'has-override' : ''}`}
                style={{
                  '--day-color': prefInfo.color,
                } as React.CSSProperties}
                onClick={() => {
                  setSelectedDate(dateStr);
                  setSelectedDatePref(currentPref);
                  setDateModalOpen(true);
                }}
              >
                <span className="day-number">{date.getDate()}</span>
                <span className="day-abbr">
                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Add Date Modal */}
      {dateModalOpen && (
        <div className="modal-overlay" onClick={() => setDateModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Set Date Preference</h3>
              <button
                className="modal-close"
                onClick={() => setDateModalOpen(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="form-group">
                <label>Preference</label>
                <div className="preference-options">
                  {PREFERENCES.map((pref) => (
                    <button
                      key={pref.value}
                      className={`pref-option ${selectedDatePref === pref.value ? 'active' : ''}`}
                      style={{ '--pref-color': pref.color } as React.CSSProperties}
                      onClick={() => setSelectedDatePref(pref.value)}
                    >
                      <span className="pref-icon">{pref.icon}</span>
                      <span>{pref.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Reason (optional)</label>
                <input
                  type="text"
                  value={dateReason}
                  onChange={(e) => setDateReason(e.target.value)}
                  placeholder="e.g., Doctor's appointment"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setDateModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={() =>
                  addDateMutation.mutate({
                    date: selectedDate,
                    preference: selectedDatePref,
                    reason: dateReason,
                  })
                }
                disabled={!selectedDate || addDateMutation.isPending}
              >
                {addDateMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
