import { useState, useMemo } from 'react';
import type { Doctor, FairnessMetrics } from '../types';
import {
  FlaskConical,
  X,
  User,
  Calendar,
  Building2,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Play,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

interface WhatIfSimulatorProps {
  metrics: FairnessMetrics;
  doctors: Doctor[];
  centers: { id: number; name: string; code: string }[];
  shifts: { id: number; code: string; hours: number; is_overnight: boolean }[];
  onClose: () => void;
  onApply?: (assignment: SimulatedAssignment) => void;
}

interface SimulatedAssignment {
  doctorId: number;
  centerId: number;
  shiftId: number;
  date: string;
}

interface SimulationResult {
  originalFairness: number;
  newFairness: number;
  change: number;
  doctorImpact: {
    doctorId: number;
    name: string;
    originalScore: number;
    newScore: number;
    change: number;
  }[];
  warnings: string[];
}

export function WhatIfSimulator({
  metrics,
  doctors,
  centers,
  shifts,
  onClose,
  onApply,
}: WhatIfSimulatorProps) {
  const [selectedDoctor, setSelectedDoctor] = useState<number | null>(null);
  const [selectedCenter, setSelectedCenter] = useState<number | null>(null);
  const [selectedShift, setSelectedShift] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const activeDoctors = useMemo(() => doctors.filter((d) => d.is_active), [doctors]);

  const canSimulate = selectedDoctor && selectedCenter && selectedShift && selectedDate;

  const runSimulation = async () => {
    if (!canSimulate) return;

    setIsSimulating(true);

    // Simulate delay for realistic feel
    await new Promise((resolve) => setTimeout(resolve, 800));

    const doctor = doctors.find((d) => d.id === selectedDoctor);
    const shift = shifts.find((s) => s.id === selectedShift);
    const doctorStats = metrics.doctor_stats.find((d) => d.doctor_id === selectedDoctor);

    // Calculate simulated fairness impact
    const originalFairness = metrics.overall_fairness;
    const warnings: string[] = [];

    // Simple simulation logic
    let fairnessChange = 0;

    // Check if this doctor has fewer shifts than average
    const avgShifts =
      metrics.doctor_stats.reduce((sum, d) => sum + d.total_hours, 0) / metrics.doctor_stats.length;
    const doctorHours = doctorStats?.total_hours || 0;

    if (doctorHours < avgShifts * 0.8) {
      // Doctor is underutilized, assigning improves fairness
      fairnessChange = Math.min(3, (avgShifts - doctorHours) / 10);
    } else if (doctorHours > avgShifts * 1.2) {
      // Doctor is overutilized, assigning reduces fairness
      fairnessChange = -Math.min(3, (doctorHours - avgShifts) / 10);
      warnings.push(`${doctor?.user?.name} already has more hours than average`);
    }

    // Night shift balance
    if (shift?.is_overnight) {
      const avgNightShifts =
        metrics.doctor_stats.reduce((sum, d) => sum + d.night_shifts, 0) /
        metrics.doctor_stats.length;
      const doctorNightShifts = doctorStats?.night_shifts || 0;

      if (doctorNightShifts > avgNightShifts * 1.5) {
        fairnessChange -= 1;
        warnings.push(`${doctor?.user?.name} already has many night shifts`);
      } else if (doctorNightShifts < avgNightShifts * 0.5) {
        fairnessChange += 1;
      }
    }

    // Weekend check
    const dayOfWeek = new Date(selectedDate).getDay();
    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
    if (isWeekend) {
      const avgWeekendShifts =
        metrics.doctor_stats.reduce((sum, d) => sum + d.weekend_shifts, 0) /
        metrics.doctor_stats.length;
      const doctorWeekendShifts = doctorStats?.weekend_shifts || 0;

      if (doctorWeekendShifts > avgWeekendShifts * 1.5) {
        fairnessChange -= 0.5;
        warnings.push(`${doctor?.user?.name} already has many weekend shifts`);
      }
    }

    const newFairness = Math.max(0, Math.min(100, originalFairness + fairnessChange));

    // Calculate per-doctor impact
    const doctorImpact = metrics.doctor_stats.slice(0, 5).map((ds) => {
      let change = 0;
      if (ds.doctor_id === selectedDoctor) {
        // This doctor gets additional work
        change = -Math.round(fairnessChange * 0.3);
      } else {
        // Other doctors' relative fairness changes
        change = Math.round(fairnessChange * 0.1);
      }

      return {
        doctorId: ds.doctor_id,
        name: ds.doctor_name,
        originalScore: ds.fairness_score,
        newScore: Math.max(0, Math.min(100, ds.fairness_score + change)),
        change,
      };
    });

    setSimulationResult({
      originalFairness,
      newFairness: Math.round(newFairness),
      change: Math.round(newFairness - originalFairness),
      doctorImpact,
      warnings,
    });

    setIsSimulating(false);
  };

  const resetSimulation = () => {
    setSelectedDoctor(null);
    setSelectedCenter(null);
    setSelectedShift(null);
    setSelectedDate('');
    setSimulationResult(null);
  };

  const handleApply = () => {
    if (selectedDoctor && selectedCenter && selectedShift && selectedDate && onApply) {
      onApply({
        doctorId: selectedDoctor,
        centerId: selectedCenter,
        shiftId: selectedShift,
        date: selectedDate,
      });
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal what-if-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <FlaskConical size={20} />
            What-If Simulator
          </h2>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="what-if-content">
          <p className="simulator-intro">
            See how assigning a doctor to a shift would impact fairness scores before making the
            change.
          </p>

          {/* Input Section */}
          <div className="simulation-inputs">
            <div className="input-group">
              <label>
                <User size={14} />
                Doctor
              </label>
              <select
                value={selectedDoctor || ''}
                onChange={(e) => setSelectedDoctor(Number(e.target.value) || null)}
              >
                <option value="">Select a doctor...</option>
                {activeDoctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.user?.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label>
                <Calendar size={14} />
                Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label>
                <Building2 size={14} />
                Center
              </label>
              <select
                value={selectedCenter || ''}
                onChange={(e) => setSelectedCenter(Number(e.target.value) || null)}
              >
                <option value="">Select a center...</option>
                {centers.map((center) => (
                  <option key={center.id} value={center.id}>
                    {center.code} - {center.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label>
                <Clock size={14} />
                Shift
              </label>
              <select
                value={selectedShift || ''}
                onChange={(e) => setSelectedShift(Number(e.target.value) || null)}
              >
                <option value="">Select a shift...</option>
                {shifts.map((shift) => (
                  <option key={shift.id} value={shift.id}>
                    {shift.code} ({shift.hours}h{shift.is_overnight ? ', Night' : ''})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="simulation-actions">
            <button
              className="btn-primary"
              onClick={runSimulation}
              disabled={!canSimulate || isSimulating}
            >
              {isSimulating ? (
                <>
                  <span className="spinner-small" />
                  Simulating...
                </>
              ) : (
                <>
                  <Play size={16} />
                  Run Simulation
                </>
              )}
            </button>
            {simulationResult && (
              <button className="btn-secondary" onClick={resetSimulation}>
                <RotateCcw size={16} />
                Reset
              </button>
            )}
          </div>

          {/* Results Section */}
          {simulationResult && (
            <div className="simulation-results">
              <h3>Simulation Results</h3>

              {/* Overall Impact */}
              <div className="impact-summary">
                <div className="impact-card">
                  <div className="impact-label">Current Fairness</div>
                  <div className="impact-value">{simulationResult.originalFairness}%</div>
                </div>

                <div className="impact-arrow">
                  {simulationResult.change > 0 ? (
                    <TrendingUp size={24} className="positive" />
                  ) : simulationResult.change < 0 ? (
                    <TrendingDown size={24} className="negative" />
                  ) : (
                    <Minus size={24} className="neutral" />
                  )}
                </div>

                <div
                  className={`impact-card ${
                    simulationResult.change > 0
                      ? 'positive'
                      : simulationResult.change < 0
                      ? 'negative'
                      : ''
                  }`}
                >
                  <div className="impact-label">Projected Fairness</div>
                  <div className="impact-value">{simulationResult.newFairness}%</div>
                  <div className="impact-change">
                    {simulationResult.change > 0 ? '+' : ''}
                    {simulationResult.change}%
                  </div>
                </div>
              </div>

              {/* Warnings */}
              {simulationResult.warnings.length > 0 && (
                <div className="simulation-warnings">
                  {simulationResult.warnings.map((warning, index) => (
                    <div key={index} className="warning-item">
                      <AlertTriangle size={14} />
                      <span>{warning}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Doctor Impact */}
              <div className="doctor-impact-section">
                <h4>Impact on Individual Doctors</h4>
                <div className="doctor-impact-list">
                  {simulationResult.doctorImpact.map((impact) => (
                    <div key={impact.doctorId} className="doctor-impact-row">
                      <span className="doctor-name">{impact.name}</span>
                      <div className="score-change">
                        <span className="old-score">{impact.originalScore}%</span>
                        <span className="arrow">→</span>
                        <span
                          className={`new-score ${
                            impact.change > 0
                              ? 'positive'
                              : impact.change < 0
                              ? 'negative'
                              : ''
                          }`}
                        >
                          {impact.newScore}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendation */}
              <div
                className={`simulation-recommendation ${
                  simulationResult.change >= 0 ? 'positive' : 'negative'
                }`}
              >
                {simulationResult.change >= 0 ? (
                  <>
                    <CheckCircle size={18} />
                    <span>
                      This assignment would <strong>improve</strong> or maintain overall fairness.
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle size={18} />
                    <span>
                      This assignment would <strong>reduce</strong> overall fairness. Consider
                      alternatives.
                    </span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {simulationResult && (
          <div className="modal-footer">
            <button className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={handleApply}
              disabled={simulationResult.change < -5}
            >
              <CheckCircle size={16} />
              Apply This Assignment
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
