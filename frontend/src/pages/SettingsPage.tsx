import { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { Center, Shift, CoverageTemplate } from '../types';
import {
  Settings,
  Building2,
  Clock,
  Grid3X3,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Check,
  AlertTriangle,
} from 'lucide-react';

type TabType = 'centers' | 'shifts' | 'coverage';

interface EditingCenter {
  id?: number;
  code: string;
  name: string;
  name_ar: string;
  allowed_shifts: string[];
  is_active: boolean;
}

interface EditingShift {
  id?: number;
  code: string;
  name: string;
  shift_type: '8h' | '12h';
  start_time: string;
  end_time: string;
  hours: number;
  is_overnight: boolean;
  is_optional: boolean;
}

interface EditingTemplate {
  id?: number;
  center_id: number;
  shift_id: number;
  min_doctors: number;
  is_mandatory: boolean;
}

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('centers');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data
  const [centers, setCenters] = useState<Center[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [templates, setTemplates] = useState<CoverageTemplate[]>([]);

  // Edit states
  const [editingCenter, setEditingCenter] = useState<EditingCenter | null>(null);
  const [editingShift, setEditingShift] = useState<EditingShift | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<EditingTemplate | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: number } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [centersData, shiftsData, templatesData] = await Promise.all([
        api.getCenters(),
        api.getShifts(),
        api.getCoverageTemplates(),
      ]);
      setCenters(centersData);
      setShifts(shiftsData);
      setTemplates(templatesData);
    } catch (err) {
      console.error(err);
      setError('Failed to load settings data');
    } finally {
      setIsLoading(false);
    }
  };

  // Center handlers
  const handleSaveCenter = async () => {
    if (!editingCenter) return;
    try {
      if (editingCenter.id) {
        const updated = await api.updateCenter(editingCenter.id, {
          code: editingCenter.code,
          name: editingCenter.name,
          name_ar: editingCenter.name_ar || undefined,
          allowed_shifts: editingCenter.allowed_shifts,
          is_active: editingCenter.is_active,
        });
        setCenters(centers.map((c) => (c.id === updated.id ? updated : c)));
      } else {
        const created = await api.createCenter({
          code: editingCenter.code,
          name: editingCenter.name,
          name_ar: editingCenter.name_ar || undefined,
          allowed_shifts: editingCenter.allowed_shifts,
        });
        setCenters([...centers, created]);
      }
      setEditingCenter(null);
    } catch (err) {
      console.error(err);
      setError('Failed to save center');
    }
  };

  const handleDeleteCenter = async (id: number) => {
    try {
      await api.deleteCenter(id);
      setCenters(centers.filter((c) => c.id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      console.error(err);
      setError('Failed to delete center');
    }
  };

  // Shift handlers
  const handleSaveShift = async () => {
    if (!editingShift) return;
    try {
      if (editingShift.id) {
        const updated = await api.updateShift(editingShift.id, editingShift);
        setShifts(shifts.map((s) => (s.id === updated.id ? updated : s)));
      } else {
        const created = await api.createShift(editingShift);
        setShifts([...shifts, created]);
      }
      setEditingShift(null);
    } catch (err) {
      console.error(err);
      setError('Failed to save shift');
    }
  };

  const handleDeleteShift = async (id: number) => {
    try {
      await api.deleteShift(id);
      setShifts(shifts.filter((s) => s.id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      console.error(err);
      setError('Failed to delete shift');
    }
  };

  // Coverage template handlers
  const handleSaveTemplate = async () => {
    if (!editingTemplate) return;
    try {
      if (editingTemplate.id) {
        const updated = await api.updateCoverageTemplate(editingTemplate.id, {
          min_doctors: editingTemplate.min_doctors,
          is_mandatory: editingTemplate.is_mandatory,
        });
        setTemplates(templates.map((t) => (t.id === updated.id ? updated : t)));
      } else {
        const created = await api.createCoverageTemplate(editingTemplate);
        setTemplates([...templates, created]);
      }
      setEditingTemplate(null);
    } catch (err) {
      console.error(err);
      setError('Failed to save coverage template');
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    try {
      await api.deleteCoverageTemplate(id);
      setTemplates(templates.filter((t) => t.id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      console.error(err);
      setError('Failed to delete coverage template');
    }
  };

  const getCenterName = (centerId: number) => {
    const center = centers.find((c) => c.id === centerId);
    return center?.name || 'Unknown';
  };

  const getShiftName = (shiftId: number) => {
    const shift = shifts.find((s) => s.id === shiftId);
    return shift ? `${shift.code} - ${shift.name}` : 'Unknown';
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <header className="page-header">
        <div className="header-title">
          <Settings size={24} />
          <h1>Settings</h1>
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

      <div className="settings-tabs">
        <button
          className={`tab-btn ${activeTab === 'centers' ? 'active' : ''}`}
          onClick={() => setActiveTab('centers')}
        >
          <Building2 size={18} />
          Centers
        </button>
        <button
          className={`tab-btn ${activeTab === 'shifts' ? 'active' : ''}`}
          onClick={() => setActiveTab('shifts')}
        >
          <Clock size={18} />
          Shifts
        </button>
        <button
          className={`tab-btn ${activeTab === 'coverage' ? 'active' : ''}`}
          onClick={() => setActiveTab('coverage')}
        >
          <Grid3X3 size={18} />
          Coverage Templates
        </button>
      </div>

      <div className="settings-content">
        {/* Centers Tab */}
        {activeTab === 'centers' && (
          <div className="settings-section">
            <div className="section-header">
              <h2>Medical Centers</h2>
              <button
                className="btn-primary"
                onClick={() =>
                  setEditingCenter({
                    code: '',
                    name: '',
                    name_ar: '',
                    allowed_shifts: [],
                    is_active: true,
                  })
                }
              >
                <Plus size={16} />
                Add Center
              </button>
            </div>

            {editingCenter && (
              <div className="edit-form">
                <h3>{editingCenter.id ? 'Edit Center' : 'New Center'}</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Code</label>
                    <input
                      type="text"
                      value={editingCenter.code}
                      onChange={(e) =>
                        setEditingCenter({ ...editingCenter, code: e.target.value })
                      }
                      placeholder="e.g., C1"
                    />
                  </div>
                  <div className="form-group">
                    <label>Name</label>
                    <input
                      type="text"
                      value={editingCenter.name}
                      onChange={(e) =>
                        setEditingCenter({ ...editingCenter, name: e.target.value })
                      }
                      placeholder="Center name"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Arabic Name</label>
                    <input
                      type="text"
                      value={editingCenter.name_ar}
                      onChange={(e) =>
                        setEditingCenter({ ...editingCenter, name_ar: e.target.value })
                      }
                      placeholder="Arabic name (optional)"
                    />
                  </div>
                  <div className="form-group">
                    <label>Allowed Shifts</label>
                    <div className="checkbox-group">
                      {shifts.map((shift) => (
                        <label key={shift.id} className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={editingCenter.allowed_shifts.includes(shift.code)}
                            onChange={(e) => {
                              const newShifts = e.target.checked
                                ? [...editingCenter.allowed_shifts, shift.code]
                                : editingCenter.allowed_shifts.filter((s) => s !== shift.code);
                              setEditingCenter({ ...editingCenter, allowed_shifts: newShifts });
                            }}
                          />
                          {shift.code}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                {editingCenter.id && (
                  <div className="form-row">
                    <div className="form-group">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={editingCenter.is_active}
                          onChange={(e) =>
                            setEditingCenter({ ...editingCenter, is_active: e.target.checked })
                          }
                        />
                        Active
                      </label>
                    </div>
                  </div>
                )}
                <div className="form-actions">
                  <button className="btn-secondary" onClick={() => setEditingCenter(null)}>
                    Cancel
                  </button>
                  <button
                    className="btn-primary"
                    onClick={handleSaveCenter}
                    disabled={!editingCenter.code || !editingCenter.name}
                  >
                    <Save size={16} />
                    Save
                  </button>
                </div>
              </div>
            )}

            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Arabic Name</th>
                  <th>Allowed Shifts</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {centers.map((center) => (
                  <tr key={center.id}>
                    <td>{center.code}</td>
                    <td>{center.name}</td>
                    <td>{center.name_ar || '-'}</td>
                    <td>{center.allowed_shifts?.join(', ') || 'All'}</td>
                    <td>
                      <span className={`status-badge ${center.is_active ? 'active' : 'inactive'}`}>
                        {center.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="action-btns">
                        <button
                          className="btn-icon"
                          title="Edit"
                          onClick={() =>
                            setEditingCenter({
                              id: center.id,
                              code: center.code,
                              name: center.name,
                              name_ar: center.name_ar || '',
                              allowed_shifts: center.allowed_shifts || [],
                              is_active: center.is_active,
                            })
                          }
                        >
                          <Edit2 size={16} />
                        </button>
                        {deleteConfirm?.type === 'center' && deleteConfirm.id === center.id ? (
                          <>
                            <button
                              className="btn-icon danger"
                              title="Confirm delete"
                              onClick={() => handleDeleteCenter(center.id)}
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
                            onClick={() => setDeleteConfirm({ type: 'center', id: center.id })}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Shifts Tab */}
        {activeTab === 'shifts' && (
          <div className="settings-section">
            <div className="section-header">
              <h2>Shift Types</h2>
              <button
                className="btn-primary"
                onClick={() =>
                  setEditingShift({
                    code: '',
                    name: '',
                    shift_type: '8h',
                    start_time: '08:00',
                    end_time: '16:00',
                    hours: 8,
                    is_overnight: false,
                    is_optional: false,
                  })
                }
              >
                <Plus size={16} />
                Add Shift
              </button>
            </div>

            {editingShift && (
              <div className="edit-form">
                <h3>{editingShift.id ? 'Edit Shift' : 'New Shift'}</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Code</label>
                    <input
                      type="text"
                      value={editingShift.code}
                      onChange={(e) =>
                        setEditingShift({ ...editingShift, code: e.target.value })
                      }
                      placeholder="e.g., M1"
                    />
                  </div>
                  <div className="form-group">
                    <label>Name</label>
                    <input
                      type="text"
                      value={editingShift.name}
                      onChange={(e) =>
                        setEditingShift({ ...editingShift, name: e.target.value })
                      }
                      placeholder="Shift name"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Type</label>
                    <select
                      value={editingShift.shift_type}
                      onChange={(e) =>
                        setEditingShift({ ...editingShift, shift_type: e.target.value as '8h' | '12h' })
                      }
                    >
                      <option value="8h">8 Hour</option>
                      <option value="12h">12 Hour</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Hours</label>
                    <input
                      type="number"
                      value={editingShift.hours}
                      onChange={(e) =>
                        setEditingShift({ ...editingShift, hours: parseInt(e.target.value) || 0 })
                      }
                      min={1}
                      max={24}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Start Time</label>
                    <input
                      type="time"
                      value={editingShift.start_time}
                      onChange={(e) =>
                        setEditingShift({ ...editingShift, start_time: e.target.value })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>End Time</label>
                    <input
                      type="time"
                      value={editingShift.end_time}
                      onChange={(e) =>
                        setEditingShift({ ...editingShift, end_time: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={editingShift.is_overnight}
                        onChange={(e) =>
                          setEditingShift({ ...editingShift, is_overnight: e.target.checked })
                        }
                      />
                      Overnight Shift
                    </label>
                  </div>
                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={editingShift.is_optional}
                        onChange={(e) =>
                          setEditingShift({ ...editingShift, is_optional: e.target.checked })
                        }
                      />
                      Optional Shift
                    </label>
                  </div>
                </div>
                <div className="form-actions">
                  <button className="btn-secondary" onClick={() => setEditingShift(null)}>
                    Cancel
                  </button>
                  <button
                    className="btn-primary"
                    onClick={handleSaveShift}
                    disabled={!editingShift.code || !editingShift.name}
                  >
                    <Save size={16} />
                    Save
                  </button>
                </div>
              </div>
            )}

            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Hours</th>
                  <th>Time</th>
                  <th>Overnight</th>
                  <th>Optional</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {shifts.map((shift) => (
                  <tr key={shift.id}>
                    <td>{shift.code}</td>
                    <td>{shift.name}</td>
                    <td>{shift.shift_type}</td>
                    <td>{shift.hours}h</td>
                    <td>
                      {shift.start_time} - {shift.end_time}
                    </td>
                    <td>{shift.is_overnight ? <Check size={16} /> : '-'}</td>
                    <td>{shift.is_optional ? <Check size={16} /> : '-'}</td>
                    <td>
                      <div className="action-btns">
                        <button
                          className="btn-icon"
                          title="Edit"
                          onClick={() =>
                            setEditingShift({
                              id: shift.id,
                              code: shift.code,
                              name: shift.name,
                              shift_type: shift.shift_type,
                              start_time: shift.start_time,
                              end_time: shift.end_time,
                              hours: shift.hours,
                              is_overnight: shift.is_overnight,
                              is_optional: shift.is_optional,
                            })
                          }
                        >
                          <Edit2 size={16} />
                        </button>
                        {deleteConfirm?.type === 'shift' && deleteConfirm.id === shift.id ? (
                          <>
                            <button
                              className="btn-icon danger"
                              title="Confirm delete"
                              onClick={() => handleDeleteShift(shift.id)}
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
                            onClick={() => setDeleteConfirm({ type: 'shift', id: shift.id })}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Coverage Templates Tab */}
        {activeTab === 'coverage' && (
          <div className="settings-section">
            <div className="section-header">
              <h2>Coverage Templates</h2>
              <p className="section-description">
                Define minimum doctor requirements for each center-shift combination.
              </p>
              <button
                className="btn-primary"
                onClick={() =>
                  setEditingTemplate({
                    center_id: centers[0]?.id || 0,
                    shift_id: shifts[0]?.id || 0,
                    min_doctors: 1,
                    is_mandatory: true,
                  })
                }
                disabled={centers.length === 0 || shifts.length === 0}
              >
                <Plus size={16} />
                Add Template
              </button>
            </div>

            {editingTemplate && (
              <div className="edit-form">
                <h3>{editingTemplate.id ? 'Edit Template' : 'New Coverage Template'}</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Center</label>
                    <select
                      value={editingTemplate.center_id}
                      onChange={(e) =>
                        setEditingTemplate({
                          ...editingTemplate,
                          center_id: parseInt(e.target.value),
                        })
                      }
                      disabled={!!editingTemplate.id}
                    >
                      {centers.map((center) => (
                        <option key={center.id} value={center.id}>
                          {center.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Shift</label>
                    <select
                      value={editingTemplate.shift_id}
                      onChange={(e) =>
                        setEditingTemplate({
                          ...editingTemplate,
                          shift_id: parseInt(e.target.value),
                        })
                      }
                      disabled={!!editingTemplate.id}
                    >
                      {shifts.map((shift) => (
                        <option key={shift.id} value={shift.id}>
                          {shift.code} - {shift.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Minimum Doctors</label>
                    <input
                      type="number"
                      value={editingTemplate.min_doctors}
                      onChange={(e) =>
                        setEditingTemplate({
                          ...editingTemplate,
                          min_doctors: parseInt(e.target.value) || 1,
                        })
                      }
                      min={1}
                      max={10}
                    />
                  </div>
                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={editingTemplate.is_mandatory}
                        onChange={(e) =>
                          setEditingTemplate({
                            ...editingTemplate,
                            is_mandatory: e.target.checked,
                          })
                        }
                      />
                      Mandatory Coverage
                    </label>
                  </div>
                </div>
                <div className="form-actions">
                  <button className="btn-secondary" onClick={() => setEditingTemplate(null)}>
                    Cancel
                  </button>
                  <button className="btn-primary" onClick={handleSaveTemplate}>
                    <Save size={16} />
                    Save
                  </button>
                </div>
              </div>
            )}

            <table className="data-table">
              <thead>
                <tr>
                  <th>Center</th>
                  <th>Shift</th>
                  <th>Min Doctors</th>
                  <th>Mandatory</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {templates.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty-cell">
                      No coverage templates defined
                    </td>
                  </tr>
                ) : (
                  templates.map((template) => (
                    <tr key={template.id}>
                      <td>{getCenterName(template.center_id)}</td>
                      <td>{getShiftName(template.shift_id)}</td>
                      <td>{template.min_doctors}</td>
                      <td>{template.is_mandatory ? <Check size={16} /> : '-'}</td>
                      <td>
                        <div className="action-btns">
                          <button
                            className="btn-icon"
                            title="Edit"
                            onClick={() =>
                              setEditingTemplate({
                                id: template.id,
                                center_id: template.center_id,
                                shift_id: template.shift_id,
                                min_doctors: template.min_doctors,
                                is_mandatory: template.is_mandatory,
                              })
                            }
                          >
                            <Edit2 size={16} />
                          </button>
                          {deleteConfirm?.type === 'template' &&
                          deleteConfirm.id === template.id ? (
                            <>
                              <button
                                className="btn-icon danger"
                                title="Confirm delete"
                                onClick={() => handleDeleteTemplate(template.id)}
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
                              onClick={() =>
                                setDeleteConfirm({ type: 'template', id: template.id })
                              }
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
