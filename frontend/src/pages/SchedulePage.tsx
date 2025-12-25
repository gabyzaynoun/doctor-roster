import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import toast from 'react-hot-toast';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { api } from '../services/api';
import type { Schedule, Center, Shift, Assignment, Doctor, ValidationResult, DoctorStats, CoverageGap } from '../types';
import { ScheduleGrid } from '../components/ScheduleGrid';
import { ValidationPanel } from '../components/ValidationPanel';
import { AssignmentModal } from '../components/AssignmentModal';
import { DoctorSidebar } from '../components/DoctorSidebar';
import { DoctorDetailModal } from '../components/DoctorDetailModal';
import { HelpCenter } from '../components/HelpCenter';
import { AutoFillPreview } from '../components/AutoFillPreview';
import { EmptyState } from '../components/EmptyState';
import { ExportPanel } from '../components/ExportPanel';
import { UndoRedoButtons, useUndoRedo } from '../context/UndoRedoContext';
import {
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Wand2,
  Send,
  RotateCcw,
  Archive,
  ArchiveRestore,
  Maximize2,
  LayoutGrid,
  Info,
  Save,
  FileStack,
  X,
  HelpCircle,
  Search,
  Moon,
  AlertCircle,
  Eye,
  Download,
} from 'lucide-react';
import { schedulePublishedCelebration } from '../utils/confetti';

type DensityMode = 'compact' | 'comfortable' | 'spacious';

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

  // Doctor stats for sidebar
  const [doctorStats, setDoctorStats] = useState<Map<number, DoctorStats>>(new Map());
  const [coverageGaps, setCoverageGaps] = useState<CoverageGap[]>([]);

  // Modal state
  const [selectedCell, setSelectedCell] = useState<{
    date: string;
    centerId: number;
    shiftId: number;
  } | null>(null);

  // UI preferences
  const [density, setDensity] = useState<DensityMode>('comfortable');
  const [focusedCenterId, setFocusedCenterId] = useState<number | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // New feature modals
  const [showHelpCenter, setShowHelpCenter] = useState(false);
  const [showAutoFillPreview, setShowAutoFillPreview] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [showNightShiftsOnly, setShowNightShiftsOnly] = useState(false);
  const [showGapsOnly, setShowGapsOnly] = useState(false);

  // Drag state for overlay preview
  const [activeDragDoctor, setActiveDragDoctor] = useState<Doctor | null>(null);

  // Template modal state
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  // Export panel state
  const [showExportPanel, setShowExportPanel] = useState(false);

  // Get undo/redo context
  const { pushAction } = useUndoRedo();

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Generate days for the month
  const days = useMemo(() => {
    const start = startOfMonth(new Date(year, month - 1));
    const end = endOfMonth(new Date(year, month - 1));
    return eachDayOfInterval({ start, end });
  }, [year, month]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === '?') {
        e.preventDefault();
        setShowHelpCenter(true);
      } else if (e.key === 'Escape') {
        setShowHelpCenter(false);
        setShowAutoFillPreview(false);
        setSelectedDoctor(null);
        setSelectedCell(null);
      } else if (e.key === 'ArrowLeft' && !e.ctrlKey && !e.metaKey) {
        navigateMonth(-1);
      } else if (e.key === 'ArrowRight' && !e.ctrlKey && !e.metaKey) {
        navigateMonth(1);
      } else if (e.key === 'b' && !e.ctrlKey && !e.metaKey && schedule?.status === 'draft') {
        setShowAutoFillPreview(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [schedule]);

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

        // Load stats
        try {
          const statsData = await api.getScheduleStats(scheduleData.id);
          const statsMap = new Map<number, DoctorStats>();
          statsData.doctor_stats.forEach((ds: DoctorStats) => {
            statsMap.set(ds.doctor_id, ds);
          });
          setDoctorStats(statsMap);
          setCoverageGaps(statsData.coverage_stats.gaps || []);
        } catch {
          setDoctorStats(new Map());
          setCoverageGaps([]);
        }
      } catch {
        // Schedule doesn't exist yet
        setSchedule(null);
        setAssignments([]);
        setValidation(null);
        setDoctorStats(new Map());
        setCoverageGaps([]);
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
      toast.success('Schedule created! Start assigning doctors to shifts.');
    } catch (err) {
      setError('Failed to create schedule');
      console.error(err);
    }
  };

  const navigateMonth = useCallback((delta: number) => {
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
  }, [month, year, setSearchParams]);

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

    // Reload stats
    try {
      const statsData = await api.getScheduleStats(schedule.id);
      const statsMap = new Map<number, DoctorStats>();
      statsData.doctor_stats.forEach((ds: DoctorStats) => {
        statsMap.set(ds.doctor_id, ds);
      });
      setDoctorStats(statsMap);
      setCoverageGaps(statsData.coverage_stats.gaps || []);
    } catch {
      // Ignore stats errors
    }
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

  // Handle drag start - set active doctor for overlay
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeData = active.data.current as { doctor?: Doctor; type?: string };
    if (activeData?.type === 'new-assignment' && activeData.doctor) {
      setActiveDragDoctor(activeData.doctor);
    }
  };

  // Handle drag from sidebar to grid
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragDoctor(null); // Clear overlay

    if (!over || !schedule || schedule.status !== 'draft') {
      if (!over) {
        toast.error('Drop cancelled - release over a schedule cell');
      }
      return;
    }

    const activeData = active.data.current as { doctor?: Doctor; type?: string };
    if (activeData?.type !== 'new-assignment' || !activeData.doctor) return;

    // Parse the drop target ID (format: "cell-{date}-{centerId}-{shiftId}")
    // Example: "cell-2025-01-15-1-2" where date is "2025-01-15", centerId is 1, shiftId is 2
    const dropId = over.id as string;
    if (!dropId.startsWith('cell-')) return;

    const parts = dropId.split('-');
    // parts = ["cell", "2025", "01", "15", "1", "2"]
    if (parts.length < 6) return;

    // Date is parts[1] through parts[3] joined back together
    const date = `${parts[1]}-${parts[2]}-${parts[3]}`;
    const centerId = parseInt(parts[4]);
    const shiftId = parseInt(parts[5]);

    const doctor = activeData.doctor;

    // Debug logging
    console.log('Creating assignment:', { schedule_id: schedule.id, doctor_id: doctor.id, center_id: centerId, shift_id: shiftId, date });

    try {
      const newAssignment = await api.createAssignment({
        schedule_id: schedule.id,
        doctor_id: doctor.id,
        center_id: centerId,
        shift_id: shiftId,
        date: date,
      });

      console.log('Assignment created successfully:', newAssignment);

      const shift = shifts.find(s => s.id === shiftId);
      const center = centers.find(c => c.id === centerId);
      const dateStr = format(new Date(date), 'EEE, MMM d');

      // Show success toast
      toast.success(`✓ ${doctor.user?.name} assigned to ${center?.code || 'Center'} - ${dateStr} ${shift?.code || ''}`);

      // Push to undo stack
      pushAction({
        type: 'create_assignment',
        description: `Assign ${doctor.user?.name} to ${center?.code || 'Center'} on ${dateStr}`,
        undo: async () => {
          await api.deleteAssignment(newAssignment.id);
          const assignmentsData = await api.getAssignments({ schedule_id: schedule.id });
          setAssignments(assignmentsData);
        },
        redo: async () => {
          await api.createAssignment({
            schedule_id: schedule.id,
            doctor_id: doctor.id,
            center_id: centerId,
            shift_id: shiftId,
            date: date,
          });
          const assignmentsData = await api.getAssignments({ schedule_id: schedule.id });
          setAssignments(assignmentsData);
        },
      });

      // Reload data
      const assignmentsData = await api.getAssignments({ schedule_id: schedule.id });
      setAssignments(assignmentsData);
      const validationData = await api.validateSchedule(schedule.id);
      setValidation(validationData);

      // Reload stats
      const statsData = await api.getScheduleStats(schedule.id);
      const statsMap = new Map<number, DoctorStats>();
      statsData.doctor_stats.forEach((ds: DoctorStats) => {
        statsMap.set(ds.doctor_id, ds);
      });
      setDoctorStats(statsMap);
      setCoverageGaps(statsData.coverage_stats.gaps || []);
    } catch (err: any) {
      console.error('Assignment creation failed:', err);
      const errorMessage = err?.response?.data?.detail || err?.message || 'Failed to create assignment';
      toast.error(`Assignment failed: ${errorMessage}`);
    }
  };

  const handleAutoBuild = async (clearExisting: boolean = false) => {
    if (!schedule) return;

    setShowAutoFillPreview(false);
    setIsBuilding(true);
    setBuildResult(null);

    try {
      const result = await api.autoBuildSchedule(schedule.id, clearExisting);

      // Reload assignments and validation
      const assignmentsData = await api.getAssignments({ schedule_id: schedule.id });
      setAssignments(assignmentsData);
      const validationData = await api.validateSchedule(schedule.id);
      setValidation(validationData);

      // Reload stats
      const statsData = await api.getScheduleStats(schedule.id);
      const statsMap = new Map<number, DoctorStats>();
      statsData.doctor_stats.forEach((ds: DoctorStats) => {
        statsMap.set(ds.doctor_id, ds);
      });
      setDoctorStats(statsMap);
      setCoverageGaps(statsData.coverage_stats.gaps || []);

      setBuildResult(result.message);
      toast.success(result.message);

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

  // Save as template handler
  const handleSaveAsTemplate = async () => {
    if (!schedule || !templateName.trim()) return;

    setIsSavingTemplate(true);
    try {
      await api.createTemplateFromSchedule({
        name: templateName.trim(),
        description: templateDescription.trim() || undefined,
        source_schedule_id: schedule.id,
      });
      toast.success('Template saved successfully!');
      setShowTemplateModal(false);
      setTemplateName('');
      setTemplateDescription('');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save template');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  // Cycle through density modes
  const cycleDensity = () => {
    setDensity(current => {
      switch (current) {
        case 'compact': return 'comfortable';
        case 'comfortable': return 'spacious';
        case 'spacious': return 'compact';
      }
    });
  };

  // Get density icon and label
  const getDensityInfo = () => {
    switch (density) {
      case 'compact': return { label: 'Compact' };
      case 'comfortable': return { label: 'Comfortable' };
      case 'spacious': return { label: 'Spacious' };
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
  const gapsCount = coverageGaps.length;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="schedule-page">
        <header className="schedule-header">
          <div className="month-nav">
            <button onClick={() => navigateMonth(-1)} className="btn-icon" title="Previous month (←)">
              <ChevronLeft size={20} />
            </button>
            <h1>{monthName}</h1>
            <button onClick={() => navigateMonth(1)} className="btn-icon" title="Next month (→)">
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="schedule-controls">
            {/* Undo/Redo buttons */}
            <UndoRedoButtons />

            {/* Help button */}
            <button
              className="help-button"
              onClick={() => setShowHelpCenter(true)}
              title="Help (?)"
            >
              <HelpCircle size={16} />
            </button>

            {/* Export button */}
            {schedule && (
              <button
                className="btn-secondary btn-sm"
                onClick={() => setShowExportPanel(true)}
                title="Export schedule (Ctrl+E)"
                data-export-btn
              >
                <Download size={16} />
                Export
              </button>
            )}

            {/* Density toggle */}
            <button
              onClick={cycleDensity}
              className="btn-secondary btn-sm"
              title={`Grid density: ${getDensityInfo().label}`}
            >
              <LayoutGrid size={16} />
              {getDensityInfo().label}
            </button>

            {/* Focus mode selector */}
            <select
              value={focusedCenterId || ''}
              onChange={(e) => setFocusedCenterId(e.target.value ? parseInt(e.target.value) : null)}
              className="center-focus-select"
              title="Focus on a specific center"
            >
              <option value="">All Centers</option>
              {centers.map(center => (
                <option key={center.id} value={center.id}>
                  {center.code} - {center.name}
                </option>
              ))}
            </select>

            {focusedCenterId && (
              <button
                onClick={() => setFocusedCenterId(null)}
                className="btn-icon"
                title="Show all centers"
              >
                <Maximize2 size={16} />
              </button>
            )}
          </div>

          <div className="schedule-actions">
            {validation && (
              <button
                onClick={() => setShowValidation(!showValidation)}
                className={`btn-validation ${validation.is_valid ? 'valid' : validation.error_count > 0 ? 'invalid' : 'warning'}`}
                title={validation.is_valid ? 'Schedule is valid' : `${validation.error_count} errors, ${validation.warning_count} warnings`}
              >
                {validation.is_valid ? (
                  <>
                    <CheckCircle size={16} /> Valid
                  </>
                ) : validation.error_count > 0 ? (
                  <>
                    <AlertTriangle size={16} />
                    <span className="validation-counts">
                      <span className="error-count">{validation.error_count}</span>
                      {validation.warning_count > 0 && (
                        <span className="warning-count">+{validation.warning_count}</span>
                      )}
                    </span>
                  </>
                ) : (
                  <>
                    <Info size={16} /> {validation.warning_count} warnings
                  </>
                )}
              </button>
            )}

            {schedule && schedule.status === 'draft' && (
              <button
                onClick={() => setShowAutoFillPreview(true)}
                className="btn-secondary"
                disabled={isBuilding || isUpdatingStatus}
                title="Preview auto-fill suggestions (Ctrl+B)"
                data-autobuild-btn
              >
                <Wand2 size={16} />
                {isBuilding ? 'Building...' : 'Auto-Build'}
                {gapsCount > 0 && <span className="gaps-badge">{gapsCount}</span>}
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

            {schedule && assignments.length > 0 && (
              <button
                onClick={() => {
                  setTemplateName(`${format(new Date(year, month - 1), 'MMMM yyyy')} Template`);
                  setShowTemplateModal(true);
                }}
                className="btn-icon"
                title="Save as template"
              >
                <FileStack size={18} />
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

        {/* Quick Filter Toolbar */}
        {schedule && (
          <div className="schedule-toolbar">
            <div className="toolbar-search">
              <Search size={14} />
              <input
                type="text"
                placeholder="Search doctors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="toolbar-divider" />
            <button
              className={`quick-filter-btn ${showNightShiftsOnly ? 'active' : ''}`}
              onClick={() => setShowNightShiftsOnly(!showNightShiftsOnly)}
            >
              <Moon size={12} />
              Night Shifts
            </button>
            <button
              className={`quick-filter-btn ${showGapsOnly ? 'active' : ''}`}
              onClick={() => setShowGapsOnly(!showGapsOnly)}
            >
              <AlertCircle size={12} />
              Coverage Gaps
              {gapsCount > 0 && <span className="gaps-badge">{gapsCount}</span>}
            </button>
            <button
              className="quick-filter-btn"
              onClick={() => setShowValidation(true)}
            >
              <Eye size={12} />
              View Issues
            </button>
          </div>
        )}

        {!schedule ? (
          <EmptyState
            type="schedule"
            action={{
              label: 'Create Schedule',
              onClick: createSchedule,
            }}
          />
        ) : assignments.length === 0 ? (
          <div className="schedule-with-sidebar">
            <DoctorSidebar
              doctors={doctors}
              doctorStats={doctorStats}
              isCollapsed={sidebarCollapsed}
              onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
              onDoctorSelect={setSelectedDoctor}
            />
            <div className="schedule-grid-wrapper">
              <EmptyState
                type="schedule-no-assignments"
                title="Ready to Schedule!"
                description="Your schedule is created. Now assign doctors to shifts by clicking cells or dragging from the sidebar."
                action={{
                  label: `Auto-Fill ${gapsCount} Gaps`,
                  onClick: () => setShowAutoFillPreview(true),
                  icon: <Wand2 size={18} />,
                }}
              />
            </div>
          </div>
        ) : (
          <div className="schedule-with-sidebar">
            <DoctorSidebar
              doctors={doctors}
              doctorStats={doctorStats}
              isCollapsed={sidebarCollapsed}
              onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
              onDoctorSelect={setSelectedDoctor}
            />
            <div className="schedule-grid-wrapper">
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
                density={density}
                focusedCenterId={focusedCenterId}
              />
            </div>
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

        {/* Doctor Detail Modal */}
        {selectedDoctor && (
          <DoctorDetailModal
            doctor={selectedDoctor}
            stats={doctorStats.get(selectedDoctor.id)}
            onClose={() => setSelectedDoctor(null)}
          />
        )}

        {/* Help Center */}
        {showHelpCenter && <HelpCenter onClose={() => setShowHelpCenter(false)} />}

        {/* Auto-Fill Preview */}
        {showAutoFillPreview && schedule && (
          <AutoFillPreview
            scheduleId={schedule.id}
            gaps={coverageGaps}
            doctors={doctors}
            doctorStats={doctorStats}
            onConfirm={handleAutoBuild}
            onCancel={() => setShowAutoFillPreview(false)}
          />
        )}

        {/* Export Panel */}
        {showExportPanel && schedule && (
          <ExportPanel
            scheduleId={schedule.id}
            scheduleName={format(new Date(year, month - 1), 'MMMM yyyy')}
            onClose={() => setShowExportPanel(false)}
          />
        )}

        {/* Save as Template Modal */}
        {showTemplateModal && (
          <div className="modal-overlay" onClick={() => setShowTemplateModal(false)}>
            <div className="modal template-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2><FileStack size={20} /> Save as Template</h2>
                <button className="btn-icon" onClick={() => setShowTemplateModal(false)}>
                  <X size={20} />
                </button>
              </div>
              <div className="modal-content">
                <p className="modal-description">
                  Save this schedule's assignment pattern as a reusable template.
                  You can apply it to create new schedules quickly.
                </p>
                <div className="form-group">
                  <label htmlFor="templateName">Template Name *</label>
                  <input
                    id="templateName"
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="e.g., December 2025 Pattern"
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="templateDescription">Description (optional)</label>
                  <textarea
                    id="templateDescription"
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    placeholder="Describe when to use this template..."
                    className="form-control"
                    rows={3}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn-secondary"
                  onClick={() => setShowTemplateModal(false)}
                  disabled={isSavingTemplate}
                >
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  onClick={handleSaveAsTemplate}
                  disabled={!templateName.trim() || isSavingTemplate}
                >
                  <Save size={16} />
                  {isSavingTemplate ? 'Saving...' : 'Save Template'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Drag Overlay - Ghost preview of dragged doctor */}
        <DragOverlay dropAnimation={{
          duration: 200,
          easing: 'ease-out',
        }}>
          {activeDragDoctor && (
            <div className="drag-overlay-card">
              <div className="drag-overlay-avatar">
                {activeDragDoctor.user?.name?.split(' ').map(n => n[0]).join('').substring(0, 2) || 'DR'}
              </div>
              <div className="drag-overlay-info">
                <span className="drag-overlay-name">{activeDragDoctor.user?.name}</span>
                <span className="drag-overlay-hint">Drop on a cell to assign</span>
              </div>
            </div>
          )}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
