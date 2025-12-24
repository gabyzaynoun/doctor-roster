import { useState, useMemo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { Doctor, DoctorStats } from '../types';
import {
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  Moon,
  Baby,
  AlertTriangle,
  Flame,
  Clock,
  Filter,
  X,
} from 'lucide-react';

interface DoctorSidebarProps {
  doctors: Doctor[];
  doctorStats?: Map<number, DoctorStats>;
  isCollapsed: boolean;
  onToggle: () => void;
  onDoctorSelect?: (doctor: Doctor) => void;
}

interface DraggableDoctorCardProps {
  doctor: Doctor;
  stats?: DoctorStats;
  onSelect?: () => void;
}

// Specialty-based colors
const SPECIALTY_COLORS: Record<string, string> = {
  'Emergency Medicine': '#ef4444',
  'Emergency': '#ef4444',
  'ICU': '#a855f7',
  'Intensive Care': '#a855f7',
  'Pediatrics': '#fb923c',
  'Internal Medicine': '#22c55e',
  'Surgery': '#ec4899',
  'Cardiology': '#f43f5e',
  'Neurology': '#6366f1',
  'Orthopedics': '#14b8a6',
  'default': '#3b82f6',
};

function DraggableDoctorCard({ doctor, stats, onSelect }: DraggableDoctorCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `doctor-${doctor.id}`,
    data: { doctor, type: 'new-assignment' },
  });

  const specialtyColor = doctor.specialty
    ? SPECIALTY_COLORS[doctor.specialty] || SPECIALTY_COLORS.default
    : SPECIALTY_COLORS.default;

  const initials = doctor.user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2) || 'DR';

  const hoursPercentage = stats?.hours_percentage || 0;
  const isOverLimit = stats?.is_over_limit || false;
  const isBurnoutRisk = hoursPercentage >= 85 && !isOverLimit;

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 1000 : 1,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      className={`doctor-sidebar-card ${isDragging ? 'dragging' : ''} ${isOverLimit ? 'over-limit' : ''} ${isBurnoutRisk ? 'burnout-risk' : ''}`}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onSelect}
      title={`Drag ${doctor.user?.name} to assign to a shift`}
    >
      <div
        className="doctor-avatar-small"
        style={{ background: `${specialtyColor}20`, color: specialtyColor }}
      >
        {initials}
      </div>
      <div className="doctor-sidebar-info">
        <span className="doctor-sidebar-name">{doctor.user?.name}</span>
        <div className="doctor-sidebar-badges">
          {doctor.specialty && (
            <span className="sidebar-badge specialty" style={{ color: specialtyColor }}>
              {doctor.specialty.substring(0, 3)}
            </span>
          )}
          {doctor.can_work_nights && (
            <span className="sidebar-badge night" title="Can work nights">
              <Moon size={10} />
            </span>
          )}
          {doctor.is_pediatrics_certified && (
            <span className="sidebar-badge peds" title="Pediatrics certified">
              <Baby size={10} />
            </span>
          )}
        </div>
      </div>
      <div className="doctor-sidebar-hours">
        {stats ? (
          <>
            <div className="hours-mini-bar">
              <div
                className="hours-mini-fill"
                style={{
                  width: `${Math.min(hoursPercentage, 100)}%`,
                  background: isOverLimit
                    ? 'var(--danger)'
                    : isBurnoutRisk
                    ? 'var(--warning)'
                    : 'var(--primary)',
                }}
              />
            </div>
            <span className={`hours-text ${isOverLimit ? 'danger' : isBurnoutRisk ? 'warning' : ''}`}>
              {stats.total_hours}h
            </span>
          </>
        ) : (
          <span className="hours-text muted">0h</span>
        )}
      </div>
      {isOverLimit && (
        <span className="status-icon danger" title="Over hours limit!">
          <AlertTriangle size={14} />
        </span>
      )}
      {isBurnoutRisk && !isOverLimit && (
        <span className="status-icon warning" title="Burnout risk - approaching limit">
          <Flame size={14} />
        </span>
      )}
    </div>
  );
}

export function DoctorSidebar({
  doctors,
  doctorStats,
  isCollapsed,
  onToggle,
  onDoctorSelect,
}: DoctorSidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterNights, setFilterNights] = useState(false);
  const [filterPeds, setFilterPeds] = useState(false);
  const [filterAvailable, setFilterAvailable] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const filteredDoctors = useMemo(() => {
    return doctors.filter((doctor) => {
      if (!doctor.is_active) return false;

      const name = doctor.user?.name?.toLowerCase() || '';
      const specialty = doctor.specialty?.toLowerCase() || '';
      const search = searchTerm.toLowerCase();

      if (search && !name.includes(search) && !specialty.includes(search)) {
        return false;
      }

      if (filterNights && !doctor.can_work_nights) return false;
      if (filterPeds && !doctor.is_pediatrics_certified) return false;

      if (filterAvailable) {
        const stats = doctorStats?.get(doctor.id);
        if (stats?.is_over_limit) return false;
      }

      return true;
    });
  }, [doctors, searchTerm, filterNights, filterPeds, filterAvailable, doctorStats]);

  // Sort by hours worked (less hours first for fairness)
  const sortedDoctors = useMemo(() => {
    return [...filteredDoctors].sort((a, b) => {
      const statsA = doctorStats?.get(a.id);
      const statsB = doctorStats?.get(b.id);
      const hoursA = statsA?.total_hours || 0;
      const hoursB = statsB?.total_hours || 0;
      return hoursA - hoursB;
    });
  }, [filteredDoctors, doctorStats]);

  const activeFiltersCount = [filterNights, filterPeds, filterAvailable].filter(Boolean).length;

  if (isCollapsed) {
    return (
      <div className="doctor-sidebar collapsed">
        <button className="sidebar-toggle" onClick={onToggle} title="Expand doctor panel">
          <ChevronRight size={16} />
          <Users size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className="doctor-sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title">
          <Users size={18} />
          <span>Doctors</span>
          <span className="count-badge">{filteredDoctors.length}</span>
        </div>
        <button className="sidebar-toggle" onClick={onToggle} title="Collapse panel">
          <ChevronLeft size={16} />
        </button>
      </div>

      <div className="sidebar-search">
        <Search size={14} />
        <input
          type="text"
          placeholder="Search doctors..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button className="clear-search" onClick={() => setSearchTerm('')}>
            <X size={12} />
          </button>
        )}
      </div>

      <div className="sidebar-filters">
        <button
          className={`filter-toggle ${showFilters ? 'active' : ''}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter size={14} />
          Filters
          {activeFiltersCount > 0 && (
            <span className="filter-count">{activeFiltersCount}</span>
          )}
        </button>

        {showFilters && (
          <div className="filter-options">
            <label className="filter-option">
              <input
                type="checkbox"
                checked={filterNights}
                onChange={(e) => setFilterNights(e.target.checked)}
              />
              <Moon size={12} />
              Night shifts
            </label>
            <label className="filter-option">
              <input
                type="checkbox"
                checked={filterPeds}
                onChange={(e) => setFilterPeds(e.target.checked)}
              />
              <Baby size={12} />
              Pediatrics
            </label>
            <label className="filter-option">
              <input
                type="checkbox"
                checked={filterAvailable}
                onChange={(e) => setFilterAvailable(e.target.checked)}
              />
              <Clock size={12} />
              Has capacity
            </label>
          </div>
        )}
      </div>

      <div className="sidebar-hint">
        <span>Drag a doctor to assign to a shift</span>
      </div>

      <div className="doctor-list">
        {sortedDoctors.map((doctor) => (
          <DraggableDoctorCard
            key={doctor.id}
            doctor={doctor}
            stats={doctorStats?.get(doctor.id)}
            onSelect={() => onDoctorSelect?.(doctor)}
          />
        ))}

        {sortedDoctors.length === 0 && (
          <div className="sidebar-empty">
            <p>No doctors match filters</p>
            <button
              className="btn-link"
              onClick={() => {
                setSearchTerm('');
                setFilterNights(false);
                setFilterPeds(false);
                setFilterAvailable(false);
              }}
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
