import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import type { Schedule, Center, Shift, Assignment, Doctor, ValidationResult } from '../types';
import { ScheduleGrid } from '../components/ScheduleGrid';
import { ValidationPanel } from '../components/ValidationPanel';
import { AssignmentModal } from '../components/AssignmentModal';
import { ChevronLeft, ChevronRight, AlertTriangle, CheckCircle, Wand2, Send, RotateCcw, Archive, ArchiveRestore } from 'lucide-react';
import { schedulePublishedCelebration } from '../utils/confetti';

export function SchedulePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Get year/month from URL or default to current
  const now = new Date();
  const year = parseInt(searchParams.get('year') || String(now.getFullYear()));
  const month = parseInt(searchParams.get('month') || String(now.getMonth() + 1));

  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [centers, setCenters] = useState<Center[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBuilding, setIsBuilding] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const [buildResult, setBuildResult] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Modal state
  const [selectedCell, setSelectedCell] = useState<{
    date: string;
    centerId: number;
    shiftId: number;
  } | null>(null);

  // Generate days for the month
  const days = useMemo(() => {
    const start = startOfMonth(new Date(year, month - 1));
    const end = endOfMonth(new Date(year, month - 1));
    return eachDayOfInterval({ start, end });
  }, [year, month]);

  // Load data
  useEffect(() => {
    loadData();
  }, [year, month]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Load reference data in parallel
      const [centersData, shiftsData, doctorsData] = await Promise.all([
        api.getCenters(),
        api.getShifts(),
        api.getDoctors(),
      ]);

      setCenters(centersData);
      setShifts(shiftsData);
      setDoctors(doctorsData);

      // Try to load schedule for this month
      try {
        const scheduleData = await api.getScheduleByMonth(year, month);
        setSchedule(scheduleData);

        // Load assignments for this schedule
        const assignmentsData = await api.getAssignments({ schedule_id: scheduleData.id });
        setAssignments(assignmentsData);

        // Load validation
        const validationData = await api.validateSchedule(scheduleData.id);
        setValidation(validationData);
      } catch {
        // Schedule doesn't exist yet
        setSchedule(null);
        setAssignments([]);
        setValidation(null);
      }
    } catch (err) {
      setError('Failed to load schedule data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const createSchedule = async () => {
    try {
      const newSchedule = await api.createSchedule(year, month);
      setSchedule(newSchedule);
      setAssignments([]);
      const validationData = await api.validateSchedule(newSchedule.id);
      setValidation(validationData);
    } catch (err) {
      setError('Failed to create schedule');
      console.error(err);
    }
  };

  const navigateMonth = (delta: number) => {
    let newMonth = month + delta;
    let newYear = year;

    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }

    setSearchParams({ year: String(newYear), month: String(newMonth) });
  };

  const handleCellClick = (date: string, centerId: number, shiftId: number) => {
    if (!schedule) return;
    setSelectedCell({ date, centerId, shiftId });
  };

  const handleAssignmentSaved = async () => {
    if (!schedule) return;
    // Reload assignments and validation
    const assignmentsData = await api.getAssignments({ schedule_id: schedule.id });
    setAssignments(assignmentsData);
    const validationData = await api.validateSchedule(schedule.id);
    setValidation(validationData);
    setSelectedCell(null);
  };

  const handleAssignmentDeleted = async () => {
    if (!schedule) return;
    const assignmentsData = await api.getAssignments({ schedule_id: schedule.id });
    setAssignments(assignmentsData);
    const validationData = await api.validateSchedule(schedule.id);
    setValidation(validationData);
    setSelectedCell(null);
  };

  const handleAssignmentMove = async (
    assignmentId: number,
    newDate: string,
    newCenterId: number,
    newShiftId: number
  ) => {
    if (!schedule || schedule.status !== 'draft') {
      toast.error('Can only move assignments in draft schedules');
      return;
    }

    try {
      await api.updateAssignment(assignmentId, {
        date: newDate,
        center_id: newCenterId,
        shift_id: newShiftId,
      });

      // Reload assignments and validation
      const assignmentsData = await api.getAssignments({ schedule_id: schedule.id });
      setAssignments(assignmentsData);
      const validationData = await api.validateSchedule(schedule.id);
      setValidation(validationData);

      toast.success('Assignment moved successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to move assignment');
    }
  };

  const handleAutoBuild = async (clearExisting: boolean = false) => {
    if (!schedule) return;

    const confirmed = clearExisting
      ? confirm('This will clear all existing assignments and rebuild. Continue?')
      : confirm('This will fill empty slots with auto-generated assignments. Continue?');

    if (!confirmed) return;

    setIsBuilding(true);
    setBuildResult(null);

    try {
      const result = await api.autoBuildSchedule(schedule.id, clearExisting);

      // Reload assignments and validation
      const assignmentsData = await api.getAssignments({ schedule_id: schedule.id });
      setAssignments(assignmentsData);
      const validationData = await api.validateSchedule(schedule.id);
      setValidation(validationData);

      setBuildResult(result.message);

      // Clear message after 5 seconds
      setTimeout(() => setBuildResult(null), 5000);
    } catch (err) {
      setError('Failed to auto-build schedule');
      console.error(err);
    } finally {
      setIsBuilding(false);
    }
  };

  const handlePublish = async () => {
    if (!schedule) return;
    if (!confirm('Publish this schedule? It will become official and visible to all users.')) return;

    setIsUpdatingStatus(true);
    try {
      const updatedSchedule = await api.publishSchedule(schedule.id);
      setSchedule(updatedSchedule);

      // Celebrate with confetti!
      schedulePublishedCelebration();
      toast.success('Schedule published successfully!', {
        duration: 5000,
        icon: '🎉',
      });
    } catch (err) {
      console.error(err);
      toast.error('Failed to publish schedule');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleUnpublish = async () => {
    if (!schedule) return;
    if (!confirm('Unpublish this schedule? It will return to draft status.')) return;

    setIsUpdatingStatus(true);
    try {
      const updatedSchedule = await api.unpublishSchedule(schedule.id);
      setSchedule(updatedSchedule);
      setStatusMessage('Schedule unpublished');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to unpublish schedule');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleArchive = async () => {
    if (!schedule) return;
    if (!confirm('Archive this schedule? Archived schedules are read-only.')) return;

    setIsUpdatingStatus(true);
    try {
      const updatedSchedule = await api.archiveSchedule(schedule.id);
      setSchedule(updatedSchedule);
      setStatusMessage('Schedule archived');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to archive schedule');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleUnarchive = async () => {
    if (!schedule) return;
    if (!confirm('Unarchive this schedule? It will return to draft status.')) return;

    setIsUpdatingStatus(true);
    try {
      const updatedSchedule = await api.unarchiveSchedule(schedule.id);
      setSchedule(updatedSchedule);
      setStatusMessage('Schedule unarchived');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to unarchive schedule');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <p>Loading schedule...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p>{error}</p>
        <button onClick={loadData} className="btn-primary">
          Retry
        </button>
      </div>
    );
  }

  const monthName = format(new Date(year, month - 1), 'MMMM yyyy');

  return (
    <div className="schedule-page">
      <header className="schedule-header">
        <div className="month-nav">
          <button onClick={() => navigateMonth(-1)} className="btn-icon" title="Previous month">
            <ChevronLeft size={20} />
          </button>
          <h1>{monthName}</h1>
          <button onClick={() => navigateMonth(1)} className="btn-icon" title="Next month">
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="schedule-actions">
          {validation && (
            <button
              onClick={() => setShowValidation(!showValidation)}
              className={`btn-validation ${validation.is_valid ? 'valid' : 'invalid'}`}
            >
              {validation.is_valid ? (
                <>
                  <CheckCircle size={16} /> Valid
                </>
              ) : (
                <>
                  <AlertTriangle size={16} /> {validation.error_count} errors
                </>
              )}
            </button>
          )}

          {schedule && schedule.status === 'draft' && (
            <button
              onClick={() => handleAutoBuild(false)}
              className="btn-secondary"
              disabled={isBuilding || isUpdatingStatus}
              title="Auto-fill empty slots"
            >
              <Wand2 size={16} />
              {isBuilding ? 'Building...' : 'Auto-Build'}
            </button>
          )}

          {!schedule && (
            <button onClick={createSchedule} className="btn-primary">
              Create Schedule
            </button>
          )}

          {schedule && schedule.status === 'draft' && (
            <button
              onClick={handlePublish}
              className="btn-primary"
              disabled={isUpdatingStatus}
              title="Publish schedule"
            >
              <Send size={16} />
              Publish
            </button>
          )}

          {schedule && schedule.status === 'published' && (
            <button
              onClick={handleUnpublish}
              className="btn-secondary"
              disabled={isUpdatingStatus}
              title="Return to draft"
            >
              <RotateCcw size={16} />
              Unpublish
            </button>
          )}

          {schedule && schedule.status !== 'archived' && (
            <button
              onClick={handleArchive}
              className="btn-icon"
              disabled={isUpdatingStatus}
              title="Archive schedule"
            >
              <Archive size={18} />
            </button>
          )}

          {schedule && schedule.status === 'archived' && (
            <button
              onClick={handleUnarchive}
              className="btn-secondary"
              disabled={isUpdatingStatus}
              title="Unarchive schedule"
            >
              <ArchiveRestore size={16} />
              Unarchive
            </button>
          )}

          {schedule && (
            <span className={`status-badge status-${schedule.status}`}>
              {schedule.status}
            </span>
          )}
        </div>
      </header>

      {buildResult && (
        <div className="build-result">
          <CheckCircle size={16} />
          {buildResult}
        </div>
      )}

      {statusMessage && (
        <div className="status-message">
          <CheckCircle size={16} />
          {statusMessage}
        </div>
      )}

      {!schedule ? (
        <div className="no-schedule">
          <p>No schedule exists for {monthName}.</p>
          <p>Click "Create Schedule" to start planning.</p>
        </div>
      ) : (
        <div className="schedule-content">
          {showValidation && validation && (
            <ValidationPanel validation={validation} onClose={() => setShowValidation(false)} />
          )}

          <ScheduleGrid
            days={days}
            centers={centers}
            shifts={shifts}
            assignments={assignments}
            doctors={doctors}
            onCellClick={handleCellClick}
            onAssignmentMove={handleAssignmentMove}
            isDraggable={schedule.status === 'draft'}
          />
        </div>
      )}

      {selectedCell && schedule && (
        <AssignmentModal
          scheduleId={schedule.id}
          date={selectedCell.date}
          centerId={selectedCell.centerId}
          shiftId={selectedCell.shiftId}
          centers={centers}
          shifts={shifts}
          doctors={doctors}
          assignments={assignments}
          onClose={() => setSelectedCell(null)}
          onSaved={handleAssignmentSaved}
          onDeleted={handleAssignmentDeleted}
        />
      )}
    </div>
  );
}
