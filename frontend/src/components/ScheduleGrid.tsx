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

interface ScheduleGridProps {
  days: Date[];
  centers: Center[];
  shifts: Shift[];
  assignments: Assignment[];
  doctors: Doctor[];
  onCellClick: (date: string, centerId: number, shiftId: number) => void;
  onAssignmentMove?: (assignmentId: number, newDate: string, newCenterId: number, newShiftId: number) => void;
  isDraggable?: boolean;
}

interface DraggableAssignmentProps {
  assignment: Assignment;
  doctorName: string;
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

function DraggableAssignment({ assignment, doctorName }: DraggableAssignmentProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `assignment-${assignment.id}`,
    data: { assignment },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
        cursor: 'grab',
      }
    : { cursor: 'grab' };

  return (
    <div
      ref={setNodeRef}
      className="assignment-chip draggable"
      title={`${doctorName} (drag to move)`}
      style={style}
      {...listeners}
      {...attributes}
    >
      {doctorName.split(' ')[0]}
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

  // Get doctor name by ID
  const getDoctorName = (doctorId: number): string => {
    const doctor = doctors.find((d) => d.id === doctorId);
    return doctor?.user?.name || `Doctor ${doctorId}`;
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
    <div className="schedule-grid-container">
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
        {centers.map((center) => (
          <div key={center.id} className="center-group">
            {/* Get allowed shifts for this center */}
            {shifts
              .filter((shift) => center.allowed_shifts.includes(shift.code))
              .map((shift, shiftIndex) => (
                <div key={`${center.id}-${shift.id}`} className="grid-row">
                  {/* Row header */}
                  <div className="grid-cell row-header">
                    {shiftIndex === 0 && (
                      <span className="center-name">{center.code}</span>
                    )}
                    <span className={`shift-code ${getShiftColorClass(shift)}`}>
                      {shift.code}
                    </span>
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
                        {cellAssignments.map((assignment) => (
                          <div
                            key={assignment.id}
                            className="assignment-chip"
                            title={getDoctorName(assignment.doctor_id)}
                          >
                            {getDoctorName(assignment.doctor_id).split(' ')[0]}
                          </div>
                        ))}
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
