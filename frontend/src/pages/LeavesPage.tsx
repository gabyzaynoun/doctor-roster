import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import type { Doctor } from '../types';
import { Calendar, Plus, Check, X, Clock } from 'lucide-react';

interface Leave {
  id: number;
  doctor_id: number;
  leave_type: string;
  start_date: string;
  end_date: string;
  status: 'pending' | 'approved' | 'rejected';
  notes: string | null;
  doctor?: Doctor;
}

export function LeavesPage() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // Form state
  const [formData, setFormData] = useState({
    doctor_id: '',
    leave_type: 'annual',
    start_date: '',
    end_date: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [leavesData, doctorsData] = await Promise.all([
        api.getLeaves(),
        api.getDoctors(),
      ]);
      setLeaves(leavesData);
      setDoctors(doctorsData);
    } catch (err) {
      setError('Failed to load data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const doctor = doctors.find(d => d.id === Number(formData.doctor_id));
      await api.createLeave({
        doctor_id: Number(formData.doctor_id),
        leave_type: formData.leave_type,
        start_date: formData.start_date,
        end_date: formData.end_date,
        notes: formData.notes || undefined,
      });
      setShowAddForm(false);
      setFormData({ doctor_id: '', leave_type: 'annual', start_date: '', end_date: '', notes: '' });
      toast.success(`✓ Leave request created for ${doctor?.user?.name || 'doctor'}`);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to create leave request');
    }
  };

  const handleStatusChange = async (leaveId: number, status: 'approved' | 'rejected') => {
    try {
      await api.updateLeave(leaveId, { status });
      if (status === 'approved') {
        toast.success('✓ Leave request approved');
      } else {
        toast.success('Leave request rejected');
      }
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update leave status');
    }
  };

  const getDoctorName = (doctorId: number) => {
    const doctor = doctors.find((d) => d.id === doctorId);
    return doctor?.user?.name || `Doctor ${doctorId}`;
  };

  const filteredLeaves = leaves.filter((leave) => {
    if (filter === 'all') return true;
    return leave.status === filter;
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <p>Loading leaves...</p>
      </div>
    );
  }

  return (
    <div className="leaves-page">
      <header className="page-header">
        <div className="header-title">
          <Calendar size={24} />
          <h1>Leave Requests</h1>
          <span className="count-badge">{leaves.length}</span>
        </div>

        <div className="header-actions">
          <div className="filter-tabs">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
              <button
                key={f}
                className={`filter-tab ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <button className="btn-primary" onClick={() => setShowAddForm(true)}>
            <Plus size={16} />
            New Request
          </button>
        </div>
      </header>

      {error && <div className="error-message">{error}</div>}

      {showAddForm && (
        <div className="modal-overlay" onClick={() => setShowAddForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>New Leave Request</h3>
              <button onClick={() => setShowAddForm(false)} className="btn-icon">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Doctor</label>
                  <select
                    value={formData.doctor_id}
                    onChange={(e) => setFormData({ ...formData, doctor_id: e.target.value })}
                    required
                  >
                    <option value="">Select doctor...</option>
                    {doctors.map((doctor) => (
                      <option key={doctor.id} value={doctor.id}>
                        {doctor.user?.name || `Doctor ${doctor.id}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Leave Type</label>
                  <select
                    value={formData.leave_type}
                    onChange={(e) => setFormData({ ...formData, leave_type: e.target.value })}
                  >
                    <option value="annual">Annual Leave</option>
                    <option value="sick">Sick Leave</option>
                    <option value="emergency">Emergency Leave</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Start Date</label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>End Date</label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Notes (optional)</label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowAddForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="leaves-list">
        {filteredLeaves.map((leave) => (
          <div key={leave.id} className={`leave-card status-${leave.status}`}>
            <div className="leave-info">
              <h3>{getDoctorName(leave.doctor_id)}</h3>
              <p className="leave-type">{leave.leave_type.replace('_', ' ')}</p>
              <p className="leave-dates">
                {formatDate(leave.start_date)} - {formatDate(leave.end_date)}
              </p>
              {leave.notes && <p className="leave-notes">{leave.notes}</p>}
            </div>
            <div className="leave-status">
              {leave.status === 'pending' ? (
                <div className="status-actions">
                  <button
                    className="btn-approve"
                    onClick={() => handleStatusChange(leave.id, 'approved')}
                    title="Approve"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    className="btn-reject"
                    onClick={() => handleStatusChange(leave.id, 'rejected')}
                    title="Reject"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <span className={`status-badge status-${leave.status}`}>
                  {leave.status === 'approved' && <Check size={14} />}
                  {leave.status === 'rejected' && <X size={14} />}
                  {leave.status}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredLeaves.length === 0 && (
        <div className="empty-state">
          <Clock size={48} />
          <p>No leave requests found</p>
        </div>
      )}
    </div>
  );
}
