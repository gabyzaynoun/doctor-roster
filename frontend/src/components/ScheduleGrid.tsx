import { useMemo, useState } from 'react';
import { format, getDay } from 'date-fns';
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  DragStartEvent,
  DragEndEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { Center, Shift, Assignment, Doctor } from '../types';

// Specialty-based colors for doctor badges
const SPECIALTY_COLORS: Record<string, { bg: string; text: string }> = {
  'Emergency Medicine': { bg: 'rgba(239, 68, 68, 0.2)', text: '#ef4444' },
  'Emergency': { bg: 'rgba(239, 68, 68, 0.2)', text: '#ef4444' },
  'ICU': { bg: 'rgba(168, 85, 247, 0.2)', text: '#a855f7' },
  'Intensive Care': { bg: 'rgba(168, 85, 247, 0.2)', text: '#a855f7' },
  'Pediatrics': { bg: 'rgba(251, 146, 60, 0.2)', text: '#fb923c' },
  'Internal Medicine': { bg: 'rgba(34, 197, 94, 0.2)', text: '#22c55e' },
  'Surgery': { bg: 'rgba(236, 72, 153, 0.2)', text: '#ec4899' },
  'Cardiology': { bg: 'rgba(244, 63, 94, 0.2)', text: '#f43f5e' },
  'Neurology': { bg: 'rgba(99, 102, 241, 0.2)', text: '#6366f1' },
  'Orthopedics': { bg: 'rgba(20, 184, 166, 0.2)', text: '#14b8a6' },
  'default': { bg: 'rgba(59, 130, 246, 0.9)', text: '#ffffff' },
};

interface ScheduleGridProps {
  days: Date[];
  centers: Center[];
  shifts: Shift[];
  assignments: Assignment[];
  doctors: Doctor[];
  onCellClick: (date: string, centerId: number, shiftId: number) => void;
  onAssignmentMove?: (assignmentId: number, newDate: string, newCenterId: number, newShiftId: number) => void;
  isDraggable?: boolean;
  density?: 'compact' | 'comfortable' | 'spacious';
  focusedCenterId?: number | null;
}

interface DraggableAssignmentProps {
  assignment: Assignment;
  doctorName: string;
  doctorInitials: string;
  specialty?: string;
}

interface DroppableCellProps {
  id: string;
  date: string;
  centerId: number;
  shiftId: number;
  dayClass: string;
  hasAssignment: boolean;
  children: React.ReactNode;
  onClick: () => void;
}

function DraggableAssignment({ assignment, doctorName, doctorInitials, specialty }: DraggableAssignmentProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `assignment-${assignment.id}`,
    data: { assignment },
  });

  const colors = specialty ? (SPECIALTY_COLORS[specialty] || SPECIALTY_COLORS.default) : SPECIALTY_COLORS.default;

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
        cursor: 'grab',
        background: colors.bg,
        color: colors.text,
      }
    : {
        cursor: 'grab',
        background: colors.bg,
        color: colors.text,
      };

  return (
    <div
      ref={setNodeRef}
      className="assignment-chip draggable"
      title={`${doctorName}${specialty ? ` (${specialty})` : ''} - drag to move`}
      style={style}
      {...listeners}
      {...attributes}
    >
      {doctorInitials}
    </div>
  );
}

function DroppableCell({
  id,
  dayClass,
  hasAssignment,
  children,
  onClick,
}: DroppableCellProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`grid-cell day-cell ${dayClass} ${hasAssignment ? 'has-assignment' : ''} ${
        isOver ? 'drop-target-active' : ''
      }`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function ScheduleGrid({
  days,
  centers,
  shifts,
  assignments,
  doctors,
  onCellClick,
  onAssignmentMove,
  isDraggable = true,
  density = 'comfortable',
  focusedCenterId = null,
}: ScheduleGridProps) {
  const [activeAssignment, setActiveAssignment] = useState<Assignment | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Create assignment lookup for quick access
  const assignmentMap = useMemo(() => {
    const map = new Map<string, Assignment[]>();
    for (const assignment of assignments) {
      const key = `${assignment.date}-${assignment.center_id}-${assignment.shift_id}`;
      const existing = map.get(key) || [];
      map.set(key, [...existing, assignment]);
    }
    return map;
  }, [assignments]);

  // Create doctor lookup for quick access
  const doctorMap = useMemo(() => {
    const map = new Map<number, Doctor>();
    for (const doctor of doctors) {
      map.set(doctor.id, doctor);
    }
    return map;
  }, [doctors]);

  // Get doctor by ID
  const getDoctor = (doctorId: number): Doctor | undefined => {
    return doctorMap.get(doctorId);
  };

  // Get doctor name by ID
  const getDoctorName = (doctorId: number): string => {
    const doctor = getDoctor(doctorId);
    return doctor?.user?.name || `Doctor ${doctorId}`;
  };

  // Get doctor initials
  const getDoctorInitials = (doctorId: number): string => {
    const doctor = getDoctor(doctorId);
    const name = doctor?.user?.name || '';
    if (!name) return 'Dr';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return parts.map(p => p[0]).join('').toUpperCase().substring(0, 2);
  };

  // Get doctor specialty
  const getDoctorSpecialty = (doctorId: number): string | undefined => {
    const doctor = getDoctor(doctorId);
    return doctor?.specialty ?? undefined;
  };

  // Filter centers based on focus mode
  const visibleCenters = useMemo(() => {
    if (focusedCenterId) {
      return centers.filter(c => c.id === focusedCenterId);
    }
    return centers;
  }, [centers, focusedCenterId]);

  // Get density class
  const getDensityClass = (): string => {
    switch (density) {
      case 'compact': return 'density-compact';
      case 'spacious': return 'density-spacious';
      default: return 'density-comfortable';
    }
  };

  // Get shift color class
  const getShiftColorClass = (shift: Shift): string => {
    if (shift.is_overnight) return 'shift-night';
    if (shift.shift_type === '12h') return 'shift-12h';
    return 'shift-8h';
  };

  // Get day class for weekends
  const getDayClass = (date: Date): string => {
    const dayOfWeek = getDay(date);
    if (dayOfWeek === 5) return 'day-friday'; // Friday
    if (dayOfWeek === 6) return 'day-saturday'; // Saturday
    return '';
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const assignment = (active.data.current as { assignment: Assignment })?.assignment;
    if (assignment) {
      setActiveAssignment(assignment);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveAssignment(null);

    if (!over || !onAssignmentMove) return;

    const assignment = (active.data.current as { assignment: Assignment })?.assignment;
    if (!assignment) return;

    // Parse the drop target ID (format: "cell-{date}-{centerId}-{shiftId}")
    const dropId = over.id as string;
    if (!dropId.startsWith('cell-')) return;

    const [, date, centerIdStr, shiftIdStr] = dropId.split('-');
    const newCenterId = parseInt(centerIdStr);
    const newShiftId = parseInt(shiftIdStr);

    // Check if it's being dropped in the same cell
    if (
      assignment.date === date &&
      assignment.center_id === newCenterId &&
      assignment.shift_id === newShiftId
    ) {
      return;
    }

    // Trigger the move callback
    onAssignmentMove(assignment.id, date, newCenterId, newShiftId);
  };

  const gridContent = (
    <div className={`schedule-grid-container ${getDensityClass()}`}>
      <div className="schedule-grid">
        {/* Header row with days */}
        <div className="grid-header">
          <div className="grid-cell header-cell corner-cell">Center / Shift</div>
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className={`grid-cell header-cell day-header ${getDayClass(day)}`}
            >
              <span className="day-name">{format(day, 'EEE')}</span>
              <span className="day-number">{format(day, 'd')}</span>
            </div>
          ))}
        </div>

        {/* Rows for each center/shift combination */}
        {visibleCenters.map((center, centerIndex) => (
          <div key={center.id} className={`center-group ${centerIndex % 2 === 1 ? 'center-group-alt' : ''}`}>
            {/* Center header row */}
            <div className="center-header-row">
              <div className="grid-cell center-header-cell">
                <span className="center-name-full">{center.name}</span>
                <span className="center-code-badge">{center.code}</span>
              </div>
              {days.map((day) => (
                <div key={day.toISOString()} className={`grid-cell center-header-spacer ${getDayClass(day)}`} />
              ))}
            </div>
            {/* Get allowed shifts for this center */}
            {shifts
              .filter((shift) => center.allowed_shifts.includes(shift.code))
              .map((shift, shiftIndex) => (
                <div key={`${center.id}-${shift.id}`} className={`grid-row ${shiftIndex % 2 === 1 ? 'row-alt' : ''}`}>
                  {/* Row header */}
                  <div className="grid-cell row-header">
                    <span className={`shift-code ${getShiftColorClass(shift)}`}>
                      {shift.code}
                    </span>
                    <span className="shift-time">{shift.start_time?.slice(0, 5)}</span>
                  </div>

                  {/* Day cells */}
                  {days.map((day) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const cellKey = `${dateStr}-${center.id}-${shift.id}`;
                    const cellAssignments = assignmentMap.get(cellKey) || [];
                    const cellId = `cell-${dateStr}-${center.id}-${shift.id}`;

                    if (isDraggable && onAssignmentMove) {
                      return (
                        <DroppableCell
                          key={cellKey}
                          id={cellId}
                          date={dateStr}
                          centerId={center.id}
                          shiftId={shift.id}
                          dayClass={getDayClass(day)}
                          hasAssignment={cellAssignments.length > 0}
                          onClick={() => onCellClick(dateStr, center.id, shift.id)}
                        >
                          {cellAssignments.map((assignment) => (
                            <DraggableAssignment
                              key={assignment.id}
                              assignment={assignment}
                              doctorName={getDoctorName(assignment.doctor_id)}
                              doctorInitials={getDoctorInitials(assignment.doctor_id)}
                              specialty={getDoctorSpecialty(assignment.doctor_id)}
                            />
                          ))}
                        </DroppableCell>
                      );
                    }

                    return (
                      <div
                        key={cellKey}
                        className={`grid-cell day-cell ${getDayClass(day)} ${
                          cellAssignments.length > 0 ? 'has-assignment' : ''
                        }`}
                        onClick={() => onCellClick(dateStr, center.id, shift.id)}
                      >
                        {cellAssignments.map((assignment) => {
                          const specialty = getDoctorSpecialty(assignment.doctor_id);
                          const chipColors = SPECIALTY_COLORS[specialty || ''] || SPECIALTY_COLORS.default;
                          return (
                            <div
                              key={assignment.id}
                              className="assignment-chip"
                              title={`${getDoctorName(assignment.doctor_id)}${specialty ? ` (${specialty})` : ''}`}
                              style={{ background: chipColors.bg, color: chipColors.text }}
                            >
                              {getDoctorInitials(assignment.doctor_id)}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );

  if (isDraggable && onAssignmentMove) {
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {gridContent}
        <DragOverlay>
          {activeAssignment && (
            <div className="assignment-chip dragging">
              {getDoctorName(activeAssignment.doctor_id).split(' ')[0]}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    );
  }

  return gridContent;
}
