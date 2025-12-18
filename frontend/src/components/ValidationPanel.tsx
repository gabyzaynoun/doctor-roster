import { useState } from 'react';
import { X, AlertTriangle, AlertCircle, Info, ChevronDown, ChevronRight } from 'lucide-react';
import type { ValidationResult, Violation, ViolationType } from '../types';

interface ValidationPanelProps {
  validation: ValidationResult;
  onClose: () => void;
}

export function ValidationPanel({ validation, onClose }: ValidationPanelProps) {
  const [expandedTypes, setExpandedTypes] = useState<Set<ViolationType>>(new Set());

  // Group violations by type
  const groupedViolations = validation.violations.reduce(
    (acc, violation) => {
      const existing = acc.get(violation.type) || [];
      acc.set(violation.type, [...existing, violation]);
      return acc;
    },
    new Map<ViolationType, Violation[]>()
  );

  const toggleType = (type: ViolationType) => {
    const newExpanded = new Set(expandedTypes);
    if (newExpanded.has(type)) {
      newExpanded.delete(type);
    } else {
      newExpanded.add(type);
    }
    setExpandedTypes(newExpanded);
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <AlertTriangle size={16} className="severity-error" />;
      case 'warning':
        return <AlertCircle size={16} className="severity-warning" />;
      default:
        return <Info size={16} className="severity-info" />;
    }
  };

  const getTypeLabel = (type: ViolationType): string => {
    switch (type) {
      case 'monthly_hours_exceeded':
        return 'Monthly Hours Exceeded';
      case 'consecutive_nights':
        return 'Consecutive Night Shifts';
      case 'insufficient_coverage':
        return 'Insufficient Coverage';
      case 'leave_conflict':
        return 'Leave Conflict';
      case 'double_booking':
        return 'Double Booking';
      case 'invalid_shift_for_center':
        return 'Invalid Shift for Center';
      case 'rest_period_violation':
        return 'Rest Period Violation';
      default:
        return type;
    }
  };

  return (
    <div className="validation-panel">
      <div className="validation-header">
        <h3>Validation Results</h3>
        <button onClick={onClose} className="btn-icon">
          <X size={18} />
        </button>
      </div>

      <div className="validation-summary">
        <div className={`summary-item ${validation.error_count > 0 ? 'has-errors' : ''}`}>
          <AlertTriangle size={16} />
          <span>{validation.error_count} errors</span>
        </div>
        <div className={`summary-item ${validation.warning_count > 0 ? 'has-warnings' : ''}`}>
          <AlertCircle size={16} />
          <span>{validation.warning_count} warnings</span>
        </div>
      </div>

      <div className="validation-groups">
        {Array.from(groupedViolations.entries()).map(([type, violations]) => (
          <div key={type} className="validation-group">
            <button
              className="group-header"
              onClick={() => toggleType(type)}
            >
              {expandedTypes.has(type) ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
              <span className="group-title">{getTypeLabel(type)}</span>
              <span className="group-count">{violations.length}</span>
            </button>

            {expandedTypes.has(type) && (
              <div className="group-violations">
                {violations.slice(0, 20).map((violation, idx) => (
                  <div key={idx} className="violation-item">
                    {getSeverityIcon(violation.severity)}
                    <div className="violation-content">
                      <span className="violation-message">{violation.message}</span>
                      {violation.center_name && (
                        <span className="violation-detail">
                          {violation.center_name}
                          {violation.shift_code && ` - ${violation.shift_code}`}
                        </span>
                      )}
                      {violation.doctor_name && (
                        <span className="violation-detail">{violation.doctor_name}</span>
                      )}
                      {violation.date && (
                        <span className="violation-detail">{violation.date}</span>
                      )}
                    </div>
                  </div>
                ))}
                {violations.length > 20 && (
                  <div className="violation-more">
                    ... and {violations.length - 20} more
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
