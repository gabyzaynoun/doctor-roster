import { useMemo } from 'react';
import type { Assignment, Doctor, Leave } from '../types';
import { AlertTriangle, Clock, Calendar, UserX } from 'lucide-react';

export interface ConflictInfo {
  type: 'double_booking' | 'consecutive_nights' | 'leave_conflict' | 'rest_period' | 'hours_exceeded';
  severity: 'error' | 'warning';
  message: string;
  details?: string;
}

interface ConflictDetectorProps {
  doctorId: number;
  date: string;
  shiftId: number;
  centerId: number;
  existingAssignments: Assignment[];
  doctors: Doctor[];
  leaves?: Leave[];
  shifts?: Array<{ id: number; code: string; is_overnight: boolean; hours: number }>;
}

export function detectConflicts({
  doctorId,
  date,
  shiftId,
  existingAssignments,
  doctors,
  leaves = [],
  shifts = [],
}: ConflictDetectorProps): ConflictInfo[] {
  const conflicts: ConflictInfo[] = [];
  const doctor = doctors.find(d => d.id === doctorId);
  const shift = shifts.find(s => s.id === shiftId);

  // Check for double booking on same date
  const sameDay = existingAssignments.filter(
    a => a.doctor_id === doctorId && a.date === date
  );
  if (sameDay.length > 0) {
    conflicts.push({
      type: 'double_booking',
      severity: 'error',
      message: 'Already assigned on this date',
      details: `Doctor already has ${sameDay.length} shift(s) on ${date}`,
    });
  }

  // Check for leave conflict
  const activeLeaves = leaves.filter(
    l => l.doctor_id === doctorId && l.status === 'approved'
  );
  for (const leave of activeLeaves) {
    if (date >= leave.start_date && date <= leave.end_date) {
      conflicts.push({
        type: 'leave_conflict',
        severity: 'error',
        message: 'Doctor is on approved leave',
        details: `${leave.leave_type} leave from ${leave.start_date} to ${leave.end_date}`,
      });
    }
  }

  // Check for consecutive night shifts
  if (shift?.is_overnight) {
    const prevDate = new Date(date);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevDateStr = prevDate.toISOString().split('T')[0];

    const prevNightShift = existingAssignments.find(a => {
      if (a.doctor_id !== doctorId || a.date !== prevDateStr) return false;
      const assignmentShift = shifts.find(s => s.id === a.shift_id);
      return assignmentShift?.is_overnight;
    });

    if (prevNightShift) {
      conflicts.push({
        type: 'consecutive_nights',
        severity: 'warning',
        message: 'Consecutive night shifts',
        details: 'This would be 2+ consecutive night shifts',
      });
    }
  }

  // Check for rest period (less than 8 hours between shifts)
  if (shift) {
    const prevDate = new Date(date);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevDateStr = prevDate.toISOString().split('T')[0];

    const prevDayAssignments = existingAssignments.filter(
      a => a.doctor_id === doctorId && a.date === prevDateStr
    );

    for (const prevAssignment of prevDayAssignments) {
      const prevShift = shifts.find(s => s.id === prevAssignment.shift_id);
      if (prevShift?.is_overnight) {
        conflicts.push({
          type: 'rest_period',
          severity: 'warning',
          message: 'Insufficient rest period',
          details: 'Less than recommended rest after previous night shift',
        });
        break;
      }
    }
  }

  // Check monthly hours limit
  const doctorAssignments = existingAssignments.filter(
    a => a.doctor_id === doctorId
  );
  let totalHours = 0;
  for (const a of doctorAssignments) {
    const aShift = shifts.find(s => s.id === a.shift_id);
    if (aShift) totalHours += aShift.hours;
  }
  if (shift) totalHours += shift.hours;

  const maxHours = doctor?.user?.monthly_hours_target || 180;
  if (totalHours > maxHours) {
    conflicts.push({
      type: 'hours_exceeded',
      severity: 'warning',
      message: 'Monthly hours exceeded',
      details: `${totalHours}h / ${maxHours}h limit`,
    });
  }

  return conflicts;
}

export function ConflictIndicator({ conflicts }: { conflicts: ConflictInfo[] }) {
  if (conflicts.length === 0) return null;

  const hasError = conflicts.some(c => c.severity === 'error');
  const icon = hasError ? (
    <AlertTriangle size={14} className="conflict-icon error" />
  ) : (
    <AlertTriangle size={14} className="conflict-icon warning" />
  );

  return (
    <div className={`conflict-indicator ${hasError ? 'error' : 'warning'}`} title={conflicts.map(c => c.message).join(', ')}>
      {icon}
      <span className="conflict-count">{conflicts.length}</span>
    </div>
  );
}

export function ConflictTooltip({ conflicts }: { conflicts: ConflictInfo[] }) {
  if (conflicts.length === 0) return null;

  const getIcon = (type: ConflictInfo['type']) => {
    switch (type) {
      case 'double_booking': return <Calendar size={14} />;
      case 'consecutive_nights': return <Clock size={14} />;
      case 'leave_conflict': return <UserX size={14} />;
      case 'rest_period': return <Clock size={14} />;
      case 'hours_exceeded': return <Clock size={14} />;
      default: return <AlertTriangle size={14} />;
    }
  };

  return (
    <div className="conflict-tooltip">
      <div className="conflict-tooltip-header">
        <AlertTriangle size={16} />
        <span>{conflicts.length} Conflict{conflicts.length > 1 ? 's' : ''} Detected</span>
      </div>
      <div className="conflict-tooltip-list">
        {conflicts.map((conflict, idx) => (
          <div key={idx} className={`conflict-item ${conflict.severity}`}>
            {getIcon(conflict.type)}
            <div className="conflict-content">
              <span className="conflict-message">{conflict.message}</span>
              {conflict.details && <span className="conflict-details">{conflict.details}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Hook for using conflict detection
export function useConflictDetection(props: Omit<ConflictDetectorProps, 'shifts'> & { shifts?: ConflictDetectorProps['shifts'] }) {
  return useMemo(() => detectConflicts({
    ...props,
    shifts: props.shifts || [],
  }), [props.doctorId, props.date, props.shiftId, props.centerId, props.existingAssignments, props.doctors, props.leaves, props.shifts]);
}
