import { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { Doctor, Schedule, DoctorStats } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  Search,
  UserPlus,
  Edit2,
  Trash2,
  X,
  Save,
  Check,
  AlertTriangle,
  Moon,
  Baby,
  Clock,
  Activity,
  Stethoscope,
} from 'lucide-react';

interface NewDoctorForm {
  email: string;
  name: string;
  password: string;
  role: 'doctor' | 'team_lead' | 'admin';
  nationality: 'saudi' | 'non_saudi';
  employee_id: string;
  specialty: string;
}

interface EditDoctorForm {
  id: number;
  userId: number;
  employee_id: string;
  specialty: string;
  is_active: boolean;
  is_pediatrics_certified: boolean;
  can_work_nights: boolean;
  name: string;
  email: string;
  nationality: 'saudi' | 'non_saudi';
}

export function DoctorsPage() {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorStats, setDoctorStats] = useState<Map<number, DoctorStats>>(new Map());
  const [, setCurrentSchedule] = useState<Schedule | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [showAddForm, setShowAddForm] = useState(false);
  const [newDoctor, setNewDoctor] = useState<NewDoctorForm>({
    email: '',
    name: '',
    password: '',
    role: 'doctor',
    nationality: 'non_saudi',
    employee_id: '',
    specialty: '',
  });
  const [editingDoctor, setEditingDoctor] = useState<EditDoctorForm | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadDoctors();
    loadCurrentScheduleStats();
  }, []);

  const loadDoctors = async () => {
    setIsLoading(true);
    try {
      const data = await api.getDoctors();
      setDoctors(data);
    } catch (err) {
      setError('Failed to load doctors');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCurrentScheduleStats = async () => {
    try {
      // Get the current month's schedule
      const now = new Date();
      const schedule = await api.getScheduleByMonth(now.getFullYear(), now.getMonth() + 1);
      setCurrentSchedule(schedule);

      // Load stats for this schedule
      const stats = await api.getScheduleStats(schedule.id);
      const statsMap = new Map<number, DoctorStats>();
      stats.doctor_stats.forEach((ds: DoctorStats) => {
        statsMap.set(ds.doctor_id, ds);
      });
      setDoctorStats(statsMap);
    } catch {
      // Schedule might not exist for current month
      setCurrentSchedule(null);
      setDoctorStats(new Map());
    }
  };

  // Get hours bar color
  const getHoursBarColor = (stats: DoctorStats | undefined): string => {
    if (!stats) return 'var(--bg-tertiary)';
    if (stats.is_over_limit) return 'var(--danger)';
    if (stats.hours_percentage >= 80) return 'var(--warning)';
    return 'var(--primary)';
  };

  const handleAddDoctor = async () => {
    if (!newDoctor.email || !newDoctor.name || !newDoctor.password) {
      setError('Please fill in all required fields');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await api.createUserWithDoctor({
        email: newDoctor.email,
        name: newDoctor.name,
        password: newDoctor.password,
        role: newDoctor.role,
        nationality: newDoctor.nationality,
        employee_id: newDoctor.employee_id || undefined,
        specialty: newDoctor.specialty || undefined,
      });
      await loadDoctors();
      setShowAddForm(false);
      setNewDoctor({
        email: '',
        name: '',
        password: '',
        role: 'doctor',
        nationality: 'non_saudi',
        employee_id: '',
        specialty: '',
      });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to create doctor');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditDoctor = (doctor: Doctor) => {
    setEditingDoctor({
      id: doctor.id,
      userId: doctor.user_id,
      employee_id: doctor.employee_id || '',
      specialty: doctor.specialty || '',
      is_active: doctor.is_active,
      is_pediatrics_certified: doctor.is_pediatrics_certified || false,
      can_work_nights: doctor.can_work_nights ?? true,
      name: doctor.user?.name || '',
      email: doctor.user?.email || '',
      nationality: doctor.user?.nationality || 'non_saudi',
    });
  };

  const handleSaveEdit = async () => {
    if (!editingDoctor) return;

    setIsSaving(true);
    setError(null);
    try {
      await api.updateDoctor(editingDoctor.id, {
        employee_id: editingDoctor.employee_id || undefined,
        specialty: editingDoctor.specialty || undefined,
        is_active: editingDoctor.is_active,
        is_pediatrics_certified: editingDoctor.is_pediatrics_certified,
        can_work_nights: editingDoctor.can_work_nights,
      });

      await api.updateUser(editingDoctor.userId, {
        name: editingDoctor.name,
        email: editingDoctor.email,
        nationality: editingDoctor.nationality,
      });

      await loadDoctors();
      setEditingDoctor(null);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to update doctor');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (doctorId: number) => {
    setIsSaving(true);
    setError(null);
    try {
      const doctor = doctors.find((d) => d.id === doctorId);
      if (doctor) {
        await api.deleteDoctor(doctorId);
        await api.deleteUser(doctor.user_id);
      }
      await loadDoctors();
      setDeleteConfirm(null);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to delete doctor');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredDoctors = doctors.filter((doctor) => {
    const name = doctor.user?.name?.toLowerCase() || '';
    const email = doctor.user?.email?.toLowerCase() || '';
    const employeeId = doctor.employee_id?.toLowerCase() || '';
    const search = searchTerm.toLowerCase();
    return name.includes(search) || email.includes(search) || employeeId.includes(search);
  });

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <p>Loading doctors...</p>
      </div>
    );
  }

  return (
    <div className="doctors-page">
      <header className="page-header">
        <div className="header-title">
          <Users size={24} />
          <h1>Doctors</h1>
          <span className="count-badge">{doctors.length}</span>
        </div>

        <div className="header-actions">
          <div className="search-box">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search doctors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {isAdmin && (
            <button className="btn-primary" onClick={() => setShowAddForm(true)}>
              <UserPlus size={16} />
              Add Doctor
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className="error-banner">
          <AlertTriangle size={18} />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="btn-icon">
            <X size={16} />
          </button>
        </div>
      )}

      {showAddForm && (
        <div className="modal-overlay" onClick={() => setShowAddForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Doctor</h2>
              <button className="btn-icon" onClick={() => setShowAddForm(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Name *</label>
                  <input
                    type="text"
                    value={newDoctor.name}
                    onChange={(e) => setNewDoctor({ ...newDoctor, name: e.target.value })}
                    placeholder="Full name"
                  />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    value={newDoctor.email}
                    onChange={(e) => setNewDoctor({ ...newDoctor, email: e.target.value })}
                    placeholder="email@example.com"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Password *</label>
                  <input
                    type="password"
                    value={newDoctor.password}
                    onChange={(e) => setNewDoctor({ ...newDoctor, password: e.target.value })}
                    placeholder="Initial password"
                  />
                </div>
                <div className="form-group">
                  <label>Employee ID</label>
                  <input
                    type="text"
                    value={newDoctor.employee_id}
                    onChange={(e) => setNewDoctor({ ...newDoctor, employee_id: e.target.value })}
                    placeholder="Employee ID"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Nationality</label>
                  <select
                    value={newDoctor.nationality}
                    onChange={(e) =>
                      setNewDoctor({
                        ...newDoctor,
                        nationality: e.target.value as 'saudi' | 'non_saudi',
                      })
                    }
                  >
                    <option value="saudi">Saudi</option>
                    <option value="non_saudi">Non-Saudi</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <select
                    value={newDoctor.role}
                    onChange={(e) =>
                      setNewDoctor({
                        ...newDoctor,
                        role: e.target.value as 'doctor' | 'team_lead' | 'admin',
                      })
                    }
                  >
                    <option value="doctor">Doctor</option>
                    <option value="team_lead">Team Lead</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group full-width">
                  <label>Specialty</label>
                  <input
                    type="text"
                    value={newDoctor.specialty}
                    onChange={(e) => setNewDoctor({ ...newDoctor, specialty: e.target.value })}
                    placeholder="e.g., Emergency Medicine"
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowAddForm(false)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleAddDoctor}
                disabled={isSaving || !newDoctor.email || !newDoctor.name || !newDoctor.password}
              >
                <Save size={16} />
                {isSaving ? 'Creating...' : 'Create Doctor'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingDoctor && (
        <div className="modal-overlay" onClick={() => setEditingDoctor(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Doctor</h2>
              <button className="btn-icon" onClick={() => setEditingDoctor(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    value={editingDoctor.name}
                    onChange={(e) =>
                      setEditingDoctor({ ...editingDoctor, name: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={editingDoctor.email}
                    onChange={(e) =>
                      setEditingDoctor({ ...editingDoctor, email: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Employee ID</label>
                  <input
                    type="text"
                    value={editingDoctor.employee_id}
                    onChange={(e) =>
                      setEditingDoctor({ ...editingDoctor, employee_id: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Nationality</label>
                  <select
                    value={editingDoctor.nationality}
                    onChange={(e) =>
                      setEditingDoctor({
                        ...editingDoctor,
                        nationality: e.target.value as 'saudi' | 'non_saudi',
                      })
                    }
                  >
                    <option value="saudi">Saudi</option>
                    <option value="non_saudi">Non-Saudi</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group full-width">
                  <label>Specialty</label>
                  <input
                    type="text"
                    value={editingDoctor.specialty}
                    onChange={(e) =>
                      setEditingDoctor({ ...editingDoctor, specialty: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="form-row checkbox-row">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={editingDoctor.is_active}
                    onChange={(e) =>
                      setEditingDoctor({ ...editingDoctor, is_active: e.target.checked })
                    }
                  />
                  Active
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={editingDoctor.can_work_nights}
                    onChange={(e) =>
                      setEditingDoctor({ ...editingDoctor, can_work_nights: e.target.checked })
                    }
                  />
                  Can Work Nights
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={editingDoctor.is_pediatrics_certified}
                    onChange={(e) =>
                      setEditingDoctor({
                        ...editingDoctor,
                        is_pediatrics_certified: e.target.checked,
                      })
                    }
                  />
                  Pediatrics Certified
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setEditingDoctor(null)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSaveEdit} disabled={isSaving}>
                <Save size={16} />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="doctors-grid">
        {filteredDoctors.map((doctor) => {
          const stats = doctorStats.get(doctor.id);
          return (
            <div key={doctor.id} className={`doctor-card ${!doctor.is_active ? 'inactive' : ''}`}>
              <div className="doctor-avatar">{doctor.user?.name?.charAt(0) || 'D'}</div>
              <div className="doctor-info">
                <h3>{doctor.user?.name || `Doctor ${doctor.id}`}</h3>
                <p className="doctor-email">{doctor.user?.email}</p>

                {/* Skill badges */}
                <div className="doctor-skills">
                  {doctor.specialty && (
                    <span className="skill-badge specialty-badge" title={doctor.specialty}>
                      <Stethoscope size={12} />
                      {doctor.specialty}
                    </span>
                  )}
                  {doctor.is_pediatrics_certified && (
                    <span className="skill-badge peds-badge" title="Pediatrics certified">
                      <Baby size={12} />
                      Pediatrics
                    </span>
                  )}
                  {doctor.can_work_nights && (
                    <span className="skill-badge night-badge" title="Can work nights">
                      <Moon size={12} />
                      Nights
                    </span>
                  )}
                </div>

                {/* Hours tracking */}
                {stats && (
                  <div className="doctor-hours-track">
                    <div className="hours-label">
                      <Clock size={12} />
                      <span>{stats.total_hours}h / {stats.max_hours}h</span>
                      {stats.is_over_limit && (
                        <span className="over-limit-badge">
                          <AlertTriangle size={10} />
                          Over limit
                        </span>
                      )}
                    </div>
                    <div className="hours-bar-container">
                      <div
                        className="hours-bar"
                        style={{
                          width: `${Math.min(stats.hours_percentage, 100)}%`,
                          background: getHoursBarColor(stats),
                        }}
                      />
                    </div>
                    <div className="assignment-count">
                      <Activity size={12} />
                      {stats.assignment_count} assignments
                    </div>
                  </div>
                )}

                <div className="doctor-meta">
                  <span className={`badge badge-${doctor.user?.nationality || 'unknown'}`}>
                    {doctor.user?.nationality === 'saudi' ? 'Saudi' : 'Non-Saudi'}
                  </span>
                  <span className={`badge badge-${doctor.is_active ? 'active' : 'inactive'}`}>
                    {doctor.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {doctor.employee_id && <p className="doctor-id">ID: {doctor.employee_id}</p>}
              </div>
              {isAdmin && (
                <div className="doctor-actions">
                  <button
                    className="btn-icon"
                    title="Edit"
                    onClick={() => handleEditDoctor(doctor)}
                  >
                    <Edit2 size={16} />
                  </button>
                  {deleteConfirm === doctor.id ? (
                    <>
                      <button
                        className="btn-icon danger"
                        title="Confirm delete"
                        onClick={() => handleDelete(doctor.id)}
                      >
                        <Check size={16} />
                      </button>
                      <button
                        className="btn-icon"
                        title="Cancel"
                        onClick={() => setDeleteConfirm(null)}
                      >
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    <button
                      className="btn-icon danger"
                      title="Delete"
                      onClick={() => setDeleteConfirm(doctor.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredDoctors.length === 0 && (
        <div className="empty-state">
          <Users size={48} />
          <p>No doctors found</p>
        </div>
      )}
    </div>
  );
}
