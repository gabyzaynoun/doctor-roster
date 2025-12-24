// User types
export interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'team_lead' | 'doctor';
  nationality: 'saudi' | 'non_saudi';
  is_active: boolean;
  monthly_hours_target: number;
  created_at: string;
  updated_at: string;
}

// Auth types
export interface AuthToken {
  access_token: string;
  token_type: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

// Center types
export interface Center {
  id: number;
  code: string;
  name: string;
  name_ar: string | null;
  allowed_shifts: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Shift types
export interface Shift {
  id: number;
  code: string;
  name: string;
  shift_type: '8h' | '12h';
  start_time: string;
  end_time: string;
  hours: number;
  is_overnight: boolean;
  is_optional: boolean;
  created_at: string;
  updated_at: string;
}

// Doctor types
export interface Doctor {
  id: number;
  user_id: number;
  employee_id: string | null;
  specialty: string | null;
  is_pediatrics_certified: boolean;
  can_work_nights: boolean;
  is_active: boolean;
  user?: User;
  created_at: string;
  updated_at: string;
}

// Schedule types
export type ScheduleStatus = 'draft' | 'published' | 'archived';

export interface Schedule {
  id: number;
  year: number;
  month: number;
  status: ScheduleStatus;
  published_at: string | null;
  published_by_id: number | null;
  created_at: string;
  updated_at: string;
}

// Assignment types
export interface Assignment {
  id: number;
  schedule_id: number;
  doctor_id: number;
  center_id: number;
  shift_id: number;
  date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  doctor?: Doctor;
  center?: Center;
  shift?: Shift;
}

// Validation types
export type ViolationType =
  | 'monthly_hours_exceeded'
  | 'consecutive_nights'
  | 'insufficient_coverage'
  | 'leave_conflict'
  | 'double_booking'
  | 'invalid_shift_for_center'
  | 'rest_period_violation';

export type Severity = 'error' | 'warning' | 'info';

export interface Violation {
  type: ViolationType;
  severity: Severity;
  message: string;
  doctor_id: number | null;
  doctor_name: string | null;
  center_id: number | null;
  center_name: string | null;
  shift_id: number | null;
  shift_code: string | null;
  date: string | null;
  details: Record<string, unknown>;
}

export interface ValidationResult {
  is_valid: boolean;
  error_count: number;
  warning_count: number;
  info_count: number;
  violations: Violation[];
}

// Coverage template types
export interface CoverageTemplate {
  id: number;
  center_id: number;
  shift_id: number;
  min_doctors: number;
  is_mandatory: boolean;
  created_at: string;
  updated_at: string;
  center?: Center;
  shift?: Shift;
}

// Leave types
export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface Leave {
  id: number;
  doctor_id: number;
  leave_type: string;
  start_date: string;
  end_date: string;
  status: LeaveStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  doctor?: Doctor;
}

// Statistics types
export interface DoctorStats {
  doctor_id: number;
  doctor_name: string;
  nationality: string;
  total_hours: number;
  max_hours: number;
  hours_percentage: number;
  assignment_count: number;
  overnight_count: number;
  shift_breakdown: Record<string, number>;
  is_over_limit: boolean;
}

export interface CoverageGap {
  date: string;
  center: string;
  shift: string;
  required: number;
  actual: number;
  gap: number;
}

export interface CoverageStats {
  total_slots: number;
  filled_slots: number;
  coverage_percentage: number;
  gaps_count: number;
  gaps: CoverageGap[];
}

export interface CenterStats {
  center_id: number;
  center_name: string;
  assignment_count: number;
  total_hours: number;
}

export interface ShiftStats {
  shift_id: number;
  shift_code: string;
  shift_name: string;
  hours: number;
  is_overnight: boolean;
  assignment_count: number;
}

export interface StatsSummary {
  total_assignments: number;
  total_hours: number;
  days_in_month: number;
  total_doctors: number;
  doctors_with_assignments: number;
  doctors_over_limit: number;
  average_hours_per_doctor: number;
  coverage_percentage: number;
  gaps_count: number;
  workload_balance_score: number;
}

export interface ScheduleStats {
  schedule_id: number;
  year: number;
  month: number;
  status: ScheduleStatus;
  summary: StatsSummary;
  doctor_stats: DoctorStats[];
  coverage_stats: CoverageStats;
  center_stats: CenterStats[];
  shift_stats: ShiftStats[];
}

// Audit log types
export interface AuditLog {
  id: number;
  action: string;
  entity_type: string;
  entity_id: number | null;
  user_id: number | null;
  user_name: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface AuditLogListResponse {
  items: AuditLog[];
  total: number;
  limit: number;
  offset: number;
}

// Schedule Template types
export interface PatternEntry {
  day_of_week: number;
  center_code: string;
  shift_code: string;
  doctor_count: number;
}

export interface TemplatePattern {
  patterns: PatternEntry[];
}

export interface ScheduleTemplate {
  id: number;
  name: string;
  description: string | null;
  pattern_data: TemplatePattern;
  created_by_id: number;
  source_schedule_id: number | null;
  times_used: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

// Shift Marketplace types
export type PostingType = 'giveaway' | 'pickup' | 'swap';
export type PostingStatus = 'open' | 'pending' | 'claimed' | 'cancelled' | 'expired';

export interface PostingDoctorInfo {
  id: number;
  name: string;
  specialty?: string;
}

export interface PostingAssignmentInfo {
  id: number;
  date: string;
  center_name: string;
  center_code: string;
  shift_code: string;
  shift_name: string;
  hours: number;
}

export interface ShiftPosting {
  id: number;
  poster_id: number;
  poster?: PostingDoctorInfo;
  assignment_id?: number;
  assignment?: PostingAssignmentInfo;
  posting_type: PostingType;
  status: PostingStatus;
  preferred_date?: string;
  preferred_center_id?: number;
  preferred_shift_id?: number;
  message?: string;
  bonus_points: number;
  is_urgent: boolean;
  claimed_by_id?: number;
  claimed_by?: PostingDoctorInfo;
  claimed_at?: string;
  created_at: string;
  expires_at?: string;
}

// Fairness Analytics types
export interface DoctorFairnessStats {
  doctor_id: number;
  doctor_name: string;
  night_shifts: number;
  weekend_shifts: number;
  holiday_shifts: number;
  total_hours: number;
  fairness_score: number;
}

export interface FairnessMetrics {
  schedule_id: number;
  year: number;
  month: number;
  night_shift_balance: number;
  weekend_balance: number;
  holiday_balance: number;
  hours_balance: number;
  overall_fairness: number;
  doctor_stats: DoctorFairnessStats[];
  recommendations: string[];
}
