import { useState, useEffect } from 'react';
import { X, Trash2, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';
import type { Center, Shift, Doctor, Assignment, ValidationResult } from '../types';

interface AssignmentModalProps {
  scheduleId: number;
  date: string;
  centerId: number;
  shiftId: number;
  centers: Center[];
  shifts: Shift[];
  doctors: Doctor[];
  assignments: Assignment[];
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}

export function AssignmentModal({
  scheduleId,
  date,
  centerId,
  shiftId,
  centers,
  shifts,
  doctors,
  assignments,
  onClose,
  onSaved,
  onDeleted,
}: AssignmentModalProps) {
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | ''>('');
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const center = centers.find((c) => c.id === centerId);
  const shift = shifts.find((s) => s.id === shiftId);

  // Get existing assignments for this cell
  const existingAssignments = assignments.filter(
    (a) => a.date === date && a.center_id === centerId && a.shift_id === shiftId
  );

  // Validate when doctor is selected
  useEffect(() => {
    if (selectedDoctorId) {
      validateAssignment(selectedDoctorId as number);
    } else {
      setValidation(null);
    }
  }, [selectedDoctorId]);

  const validateAssignment = async (doctorId: number) => {
    try {
      const result = await api.validateAssignment(
        scheduleId,
        doctorId,
        centerId,
        shiftId,
        date
      );
      setValidation(result);
    } catch (err) {
      console.error('Validation failed:', err);
    }
  };

  const handleSave = async () => {
    if (!selectedDoctorId) return;

    setIsLoading(true);
    setError(null);

    try {
      await api.createAssignment({
        schedule_id: scheduleId,
        doctor_id: selectedDoctorId as number,
        center_id: centerId,
        shift_id: shiftId,
        date,
      });
      onSaved();
    } catch (err) {
      setError('Failed to create assignment');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (assignmentId: number) => {
    if (!confirm('Are you sure you want to delete this assignment?')) return;

    setIsLoading(true);
    setError(null);

    try {
      await api.deleteAssignment(assignmentId);
      onDeleted();
    } catch (err) {
      setError('Failed to delete assignment');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Get doctors not already assigned to this cell
  const availableDoctors = doctors.filter(
    (d) => !existingAssignments.some((a) => a.doctor_id === d.id)
  );

  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Manage Assignment</h3>
          <button onClick={onClose} className="btn-icon">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div className="assignment-info">
            <p>
              <strong>Date:</strong> {formattedDate}
            </p>
            <p>
              <strong>Center:</strong> {center?.name}
            </p>
            <p>
              <strong>Shift:</strong> {shift?.name} ({shift?.code})
            </p>
          </div>

          {/* Existing assignments */}
          {existingAssignments.length > 0 && (
            <div className="existing-assignments">
              <h4>Current Assignments</h4>
              {existingAssignments.map((assignment) => {
                const doctor = doctors.find((d) => d.id === assignment.doctor_id);
                return (
                  <div key={assignment.id} className="assignment-row">
                    <span>{doctor?.user?.name || `Doctor ${assignment.doctor_id}`}</span>
                    <button
                      onClick={() => handleDelete(assignment.id)}
                      className="btn-icon btn-danger"
                      disabled={isLoading}
                      title="Remove assignment"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add new assignment */}
          <div className="new-assignment">
            <h4>Add Doctor</h4>
            <div className="form-group">
              <select
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value ? Number(e.target.value) : '')}
                disabled={isLoading}
              >
                <option value="">Select a doctor...</option>
                {availableDoctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.user?.name || `Doctor ${doctor.id}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Validation warnings */}
            {validation && !validation.is_valid && (
              <div className="validation-warnings">
                {validation.violations.map((v, idx) => (
                  <div
                    key={idx}
                    className={`validation-warning severity-${v.severity}`}
                  >
                    <AlertTriangle size={14} />
                    <span>{v.message}</span>
                  </div>
                ))}
              </div>
            )}

            {error && <div className="error-message">{error}</div>}
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary" disabled={isLoading}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="btn-primary"
            disabled={!selectedDoctorId || isLoading}
          >
            {isLoading ? 'Saving...' : 'Add Assignment'}
          </button>
        </div>
      </div>
    </div>
  );
}
