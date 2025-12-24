import { useState, useEffect } from 'react';
import type { Doctor, DoctorStats, CoverageGap } from '../types';
import {
  Wand2,
  X,
  CheckCircle,
  AlertTriangle,
  Info,
  Clock,
  User,
  Building2,
  Calendar,
  ChevronDown,
  ChevronUp,
  Zap,
  Loader2,
} from 'lucide-react';

interface AutoFillPreviewProps {
  scheduleId: number;
  gaps: CoverageGap[];
  doctors: Doctor[];
  doctorStats: Map<number, DoctorStats>;
  onConfirm: (clearExisting: boolean) => void;
  onCancel: () => void;
}

interface PreviewAssignment {
  date: string;
  center: string;
  shift: string;
  doctor: Doctor;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
}

export function AutoFillPreview({
  scheduleId,
  gaps,
  doctors,
  doctorStats,
  onConfirm,
  onCancel,
}: AutoFillPreviewProps) {
  const [isGenerating, setIsGenerating] = useState(true);
  const [previewAssignments, setPreviewAssignments] = useState<PreviewAssignment[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [clearExisting, setClearExisting] = useState(false);

  useEffect(() => {
    generatePreview();
  }, [scheduleId, gaps]);

  const generatePreview = async () => {
    setIsGenerating(true);

    // Simulate generating preview assignments
    // In a real implementation, this would call a preview API endpoint
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Generate mock preview assignments based on gaps and doctor availability
    const preview: PreviewAssignment[] = [];
    const activeDoctors = doctors.filter((d) => d.is_active);

    for (const gap of gaps.slice(0, 15)) {
      // Find available doctors for this gap
      const availableDoctors = activeDoctors.filter((doctor) => {
        const stats = doctorStats.get(doctor.id);
        if (!stats) return true;
        return !stats.is_over_limit && stats.hours_percentage < 90;
      });

      if (availableDoctors.length > 0) {
        // Select doctor with lowest hours for fairness
        const sortedDoctors = [...availableDoctors].sort((a, b) => {
          const statsA = doctorStats.get(a.id)?.total_hours || 0;
          const statsB = doctorStats.get(b.id)?.total_hours || 0;
          return statsA - statsB;
        });

        const selectedDoctor = sortedDoctors[0];
        const stats = doctorStats.get(selectedDoctor.id);

        const reasons: string[] = [];
        if ((stats?.hours_percentage || 0) < 50) {
          reasons.push('Low utilization - has capacity');
        }
        if ((stats?.total_hours || 0) < 80) {
          reasons.push('Fewest hours worked this month');
        }
        if (selectedDoctor.specialty?.toLowerCase().includes(gap.center.toLowerCase())) {
          reasons.push('Specialty matches center');
        }
        if (gap.shift.includes('N') && selectedDoctor.can_work_nights) {
          reasons.push('Night shift qualified');
        }
        if (reasons.length === 0) {
          reasons.push('Best available based on constraints');
        }

        const confidence: 'high' | 'medium' | 'low' =
          reasons.length >= 2 ? 'high' : reasons.length === 1 ? 'medium' : 'low';

        preview.push({
          date: gap.date,
          center: gap.center,
          shift: gap.shift,
          doctor: selectedDoctor,
          reason: reasons.join('. '),
          confidence,
        });
      }
    }

    setPreviewAssignments(preview);
    setIsGenerating(false);
  };

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  const getConfidenceColor = (confidence: 'high' | 'medium' | 'low') => {
    switch (confidence) {
      case 'high':
        return 'var(--success)';
      case 'medium':
        return 'var(--warning)';
      case 'low':
        return 'var(--danger)';
    }
  };

  const getConfidenceIcon = (confidence: 'high' | 'medium' | 'low') => {
    switch (confidence) {
      case 'high':
        return <CheckCircle size={14} />;
      case 'medium':
        return <AlertTriangle size={14} />;
      case 'low':
        return <Info size={14} />;
    }
  };

  const highConfidenceCount = previewAssignments.filter((a) => a.confidence === 'high').length;
  const mediumConfidenceCount = previewAssignments.filter((a) => a.confidence === 'medium').length;
  const remainingGaps = gaps.length - previewAssignments.length;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal auto-fill-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <Wand2 size={20} />
            Auto-Fill Preview
          </h2>
          <button className="btn-icon" onClick={onCancel}>
            <X size={20} />
          </button>
        </div>

        <div className="auto-fill-content">
          {isGenerating ? (
            <div className="generating-preview">
              <Loader2 size={48} className="spinning" />
              <h3>Analyzing Schedule...</h3>
              <p>Finding optimal assignments based on constraints and fairness</p>
              <div className="analysis-steps">
                <div className="step active">
                  <CheckCircle size={14} /> Checking doctor availability
                </div>
                <div className="step active">
                  <CheckCircle size={14} /> Validating hour limits
                </div>
                <div className="step">
                  <Loader2 size={14} className="spinning" /> Optimizing for fairness
                </div>
                <div className="step">Generating preview...</div>
              </div>
            </div>
          ) : (
            <>
              {/* Summary Stats */}
              <div className="preview-summary">
                <div className="summary-card">
                  <Zap size={20} />
                  <div className="summary-value">{previewAssignments.length}</div>
                  <div className="summary-label">Assignments to create</div>
                </div>
                <div className="summary-card success">
                  <CheckCircle size={20} />
                  <div className="summary-value">{highConfidenceCount}</div>
                  <div className="summary-label">High confidence</div>
                </div>
                <div className="summary-card warning">
                  <AlertTriangle size={20} />
                  <div className="summary-value">{mediumConfidenceCount}</div>
                  <div className="summary-label">Medium confidence</div>
                </div>
                {remainingGaps > 0 && (
                  <div className="summary-card danger">
                    <Info size={20} />
                    <div className="summary-value">{remainingGaps}</div>
                    <div className="summary-label">Unable to fill</div>
                  </div>
                )}
              </div>

              {/* Explanation */}
              <div className="preview-explanation">
                <h4>How Auto-Fill Works</h4>
                <p>
                  The algorithm considers doctor availability, hour limits, certifications,
                  and workload balance to suggest optimal assignments. High-confidence
                  assignments meet multiple criteria, while lower confidence may require review.
                </p>
              </div>

              {/* Preview List */}
              <div className="preview-list">
                <h4>Proposed Assignments</h4>
                {previewAssignments.map((assignment, index) => (
                  <div
                    key={index}
                    className={`preview-item ${expandedItems.has(index) ? 'expanded' : ''}`}
                  >
                    <div className="preview-item-header" onClick={() => toggleExpanded(index)}>
                      <div className="preview-main">
                        <span
                          className="confidence-badge"
                          style={{ background: getConfidenceColor(assignment.confidence) }}
                        >
                          {getConfidenceIcon(assignment.confidence)}
                        </span>
                        <div className="preview-info">
                          <div className="preview-doctor">
                            <User size={12} />
                            {assignment.doctor.user?.name}
                          </div>
                          <div className="preview-slot">
                            <Calendar size={12} />
                            {new Date(assignment.date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}
                            <Building2 size={12} />
                            {assignment.center}
                            <Clock size={12} />
                            {assignment.shift}
                          </div>
                        </div>
                      </div>
                      <button className="expand-btn">
                        {expandedItems.has(index) ? (
                          <ChevronUp size={16} />
                        ) : (
                          <ChevronDown size={16} />
                        )}
                      </button>
                    </div>
                    {expandedItems.has(index) && (
                      <div className="preview-item-details">
                        <div className="reason-box">
                          <Info size={14} />
                          <span>{assignment.reason}</span>
                        </div>
                        <div className="doctor-stats-mini">
                          <span>
                            Current hours:{' '}
                            {doctorStats.get(assignment.doctor.id)?.total_hours || 0}h
                          </span>
                          <span>
                            Limit: {doctorStats.get(assignment.doctor.id)?.max_hours || 0}h
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {previewAssignments.length === 0 && (
                  <div className="no-preview">
                    <AlertTriangle size={32} />
                    <p>No assignments could be generated</p>
                    <p className="hint">
                      All available doctors may be at their hour limits or no coverage gaps exist.
                    </p>
                  </div>
                )}
              </div>

              {/* Options */}
              <div className="preview-options">
                <label className="checkbox-option">
                  <input
                    type="checkbox"
                    checked={clearExisting}
                    onChange={(e) => setClearExisting(e.target.checked)}
                  />
                  <span>Clear existing assignments and rebuild entirely</span>
                </label>
                <p className="option-warning">
                  <AlertTriangle size={12} />
                  This will remove all current assignments before generating new ones.
                </p>
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={() => onConfirm(clearExisting)}
            disabled={isGenerating || previewAssignments.length === 0}
          >
            <Wand2 size={16} />
            Apply {previewAssignments.length} Assignments
          </button>
        </div>
      </div>
    </div>
  );
}
