import axios, { AxiosError, AxiosInstance } from 'axios';
import type {
  AuthToken,
  User,
  Center,
  Shift,
  Doctor,
  Schedule,
  Assignment,
  ValidationResult,
  Leave,
  ScheduleStats,
  AuditLogListResponse,
  CoverageTemplate,
  ScheduleTemplate,
  ShiftPosting,
  FairnessMetrics,
} from '../types';

// Use environment variable if set, otherwise default to /api for proxy setup
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Load token from localStorage
    this.token = localStorage.getItem('token');

    // Add auth header interceptor
    this.client.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });

    // Handle 401 responses
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          this.logout();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  logout() {
    this.token = null;
    localStorage.removeItem('token');
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  // Auth endpoints
  async login(username: string, password: string): Promise<AuthToken> {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const response = await this.client.post<AuthToken>('/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    this.setToken(response.data.access_token);
    return response.data;
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.client.get<User>('/auth/me');
    return response.data;
  }

  // Centers
  async getCenters(): Promise<Center[]> {
    const response = await this.client.get<Center[]>('/centers/');
    return response.data;
  }

  async getCenter(id: number): Promise<Center> {
    const response = await this.client.get<Center>(`/centers/${id}`);
    return response.data;
  }

  async createCenter(data: {
    code: string;
    name: string;
    name_ar?: string;
    allowed_shifts?: string[];
  }): Promise<Center> {
    const response = await this.client.post<Center>('/centers/', data);
    return response.data;
  }

  async updateCenter(id: number, data: Partial<Center>): Promise<Center> {
    const response = await this.client.patch<Center>(`/centers/${id}`, data);
    return response.data;
  }

  async deleteCenter(id: number): Promise<void> {
    await this.client.delete(`/centers/${id}`);
  }

  // Shifts
  async getShifts(): Promise<Shift[]> {
    const response = await this.client.get<Shift[]>('/shifts/');
    return response.data;
  }

  async getShift(id: number): Promise<Shift> {
    const response = await this.client.get<Shift>(`/shifts/${id}`);
    return response.data;
  }

  async createShift(data: {
    code: string;
    name: string;
    shift_type: string;
    start_time: string;
    end_time: string;
    hours: number;
    is_overnight?: boolean;
    is_optional?: boolean;
  }): Promise<Shift> {
    const response = await this.client.post<Shift>('/shifts/', data);
    return response.data;
  }

  async updateShift(id: number, data: Partial<Shift>): Promise<Shift> {
    const response = await this.client.patch<Shift>(`/shifts/${id}`, data);
    return response.data;
  }

  async deleteShift(id: number): Promise<void> {
    await this.client.delete(`/shifts/${id}`);
  }

  // Coverage Templates
  async getCoverageTemplates(params?: {
    center_id?: number;
    shift_id?: number;
  }): Promise<CoverageTemplate[]> {
    const response = await this.client.get<CoverageTemplate[]>('/coverage-templates/', { params });
    return response.data;
  }

  async createCoverageTemplate(data: {
    center_id: number;
    shift_id: number;
    min_doctors: number;
    is_mandatory?: boolean;
  }): Promise<CoverageTemplate> {
    const response = await this.client.post<CoverageTemplate>('/coverage-templates/', data);
    return response.data;
  }

  async updateCoverageTemplate(
    id: number,
    data: { min_doctors?: number; is_mandatory?: boolean }
  ): Promise<CoverageTemplate> {
    const response = await this.client.patch<CoverageTemplate>(`/coverage-templates/${id}`, data);
    return response.data;
  }

  async deleteCoverageTemplate(id: number): Promise<void> {
    await this.client.delete(`/coverage-templates/${id}`);
  }

  // Doctors
  async getDoctors(): Promise<Doctor[]> {
    const response = await this.client.get<Doctor[]>('/doctors/');
    return response.data;
  }

  async getDoctor(id: number): Promise<Doctor> {
    const response = await this.client.get<Doctor>(`/doctors/${id}`);
    return response.data;
  }

  async updateDoctor(
    id: number,
    data: {
      employee_id?: string;
      specialty?: string;
      is_pediatrics_certified?: boolean;
      can_work_nights?: boolean;
      is_active?: boolean;
    }
  ): Promise<Doctor> {
    const response = await this.client.patch<Doctor>(`/doctors/${id}`, data);
    return response.data;
  }

  async deleteDoctor(id: number): Promise<void> {
    await this.client.delete(`/doctors/${id}`);
  }

  // Users
  async getUsers(): Promise<User[]> {
    const response = await this.client.get<User[]>('/users/');
    return response.data;
  }

  async createUser(data: {
    email: string;
    name: string;
    password: string;
    role?: 'admin' | 'team_lead' | 'doctor';
    nationality?: 'saudi' | 'non_saudi';
  }): Promise<User> {
    const response = await this.client.post<User>('/users/', data);
    return response.data;
  }

  async createUserWithDoctor(data: {
    email: string;
    name: string;
    password: string;
    role?: 'admin' | 'team_lead' | 'doctor';
    nationality?: 'saudi' | 'non_saudi';
    employee_id?: string;
    specialty?: string;
  }): Promise<User> {
    const { employee_id, specialty, ...userData } = data;
    const params = new URLSearchParams();
    if (employee_id) params.append('employee_id', employee_id);
    if (specialty) params.append('specialty', specialty);
    const response = await this.client.post<User>(
      `/users/with-doctor?${params.toString()}`,
      userData
    );
    return response.data;
  }

  async updateUser(
    id: number,
    data: {
      email?: string;
      name?: string;
      role?: 'admin' | 'team_lead' | 'doctor';
      nationality?: 'saudi' | 'non_saudi';
      is_active?: boolean;
    }
  ): Promise<User> {
    const response = await this.client.patch<User>(`/users/${id}`, data);
    return response.data;
  }

  async deleteUser(id: number): Promise<void> {
    await this.client.delete(`/users/${id}`);
  }

  // Schedules
  async getSchedules(): Promise<Schedule[]> {
    const response = await this.client.get<Schedule[]>('/schedules/');
    return response.data;
  }

  async getSchedule(id: number): Promise<Schedule> {
    const response = await this.client.get<Schedule>(`/schedules/${id}`);
    return response.data;
  }

  async getScheduleByMonth(year: number, month: number): Promise<Schedule> {
    const response = await this.client.get<Schedule>(`/schedules/by-month/${year}/${month}`);
    return response.data;
  }

  async createSchedule(year: number, month: number): Promise<Schedule> {
    const response = await this.client.post<Schedule>('/schedules/', { year, month });
    return response.data;
  }

  async updateSchedule(id: number, data: Partial<Schedule>): Promise<Schedule> {
    const response = await this.client.patch<Schedule>(`/schedules/${id}`, data);
    return response.data;
  }

  async validateSchedule(scheduleId: number): Promise<ValidationResult> {
    const response = await this.client.get<ValidationResult>(`/schedules/${scheduleId}/validate`);
    return response.data;
  }

  async validateAssignment(
    scheduleId: number,
    doctorId: number,
    centerId: number,
    shiftId: number,
    date: string
  ): Promise<ValidationResult> {
    const response = await this.client.post<ValidationResult>(
      `/schedules/${scheduleId}/validate-assignment`,
      { doctor_id: doctorId, center_id: centerId, shift_id: shiftId, date }
    );
    return response.data;
  }

  // Assignments
  async getAssignments(params?: {
    schedule_id?: number;
    doctor_id?: number;
    center_id?: number;
    date_from?: string;
    date_to?: string;
  }): Promise<Assignment[]> {
    const response = await this.client.get<Assignment[]>('/assignments/', { params });
    return response.data;
  }

  async createAssignment(data: {
    schedule_id: number;
    doctor_id: number;
    center_id: number;
    shift_id: number;
    date: string;
    notes?: string;
  }): Promise<Assignment> {
    const response = await this.client.post<Assignment>('/assignments/', data);
    return response.data;
  }

  async updateAssignment(id: number, data: Partial<Assignment>): Promise<Assignment> {
    const response = await this.client.patch<Assignment>(`/assignments/${id}`, data);
    return response.data;
  }

  async deleteAssignment(id: number): Promise<void> {
    await this.client.delete(`/assignments/${id}`);
  }

  // Auto-builder
  async autoBuildSchedule(
    scheduleId: number,
    clearExisting: boolean = false
  ): Promise<{
    success: boolean;
    message: string;
    assignments_created: number;
    slots_unfilled: number;
    warnings: string[];
  }> {
    const response = await this.client.post(
      `/schedules/${scheduleId}/auto-build`,
      { clear_existing: clearExisting }
    );
    return response.data;
  }

  // Publish workflow
  async publishSchedule(scheduleId: number): Promise<Schedule> {
    const response = await this.client.post<Schedule>(`/schedules/${scheduleId}/publish`);
    return response.data;
  }

  async unpublishSchedule(scheduleId: number): Promise<Schedule> {
    const response = await this.client.post<Schedule>(`/schedules/${scheduleId}/unpublish`);
    return response.data;
  }

  async archiveSchedule(scheduleId: number): Promise<Schedule> {
    const response = await this.client.post<Schedule>(`/schedules/${scheduleId}/archive`);
    return response.data;
  }

  async unarchiveSchedule(scheduleId: number): Promise<Schedule> {
    const response = await this.client.post<Schedule>(`/schedules/${scheduleId}/unarchive`);
    return response.data;
  }

  // Leaves
  async getLeaves(params?: { doctor_id?: number; status?: string }): Promise<Leave[]> {
    const response = await this.client.get<Leave[]>('/leaves/', { params });
    return response.data;
  }

  async createLeave(data: {
    doctor_id: number;
    leave_type: string;
    start_date: string;
    end_date: string;
    notes?: string;
  }): Promise<Leave> {
    const response = await this.client.post<Leave>('/leaves/', data);
    return response.data;
  }

  async updateLeave(id: number, data: { status?: string; notes?: string }): Promise<Leave> {
    const response = await this.client.patch<Leave>(`/leaves/${id}`, data);
    return response.data;
  }

  async deleteLeave(id: number): Promise<void> {
    await this.client.delete(`/leaves/${id}`);
  }

  // Statistics
  async getScheduleStats(scheduleId: number): Promise<ScheduleStats> {
    const response = await this.client.get<ScheduleStats>(`/schedules/${scheduleId}/stats`);
    return response.data;
  }

  // Exports
  async exportAssignmentsCsv(scheduleId: number): Promise<void> {
    const response = await this.client.get(`/schedules/${scheduleId}/export/assignments`, {
      responseType: 'blob',
    });
    const filename = this.getFilenameFromHeaders(response.headers) || `assignments_${scheduleId}.csv`;
    this.downloadBlob(response.data, filename);
  }

  async exportDoctorHoursCsv(scheduleId: number): Promise<void> {
    const response = await this.client.get(`/schedules/${scheduleId}/export/doctor-hours`, {
      responseType: 'blob',
    });
    const filename = this.getFilenameFromHeaders(response.headers) || `doctor_hours_${scheduleId}.csv`;
    this.downloadBlob(response.data, filename);
  }

  async exportCoverageMatrixCsv(scheduleId: number): Promise<void> {
    const response = await this.client.get(`/schedules/${scheduleId}/export/coverage-matrix`, {
      responseType: 'blob',
    });
    const filename = this.getFilenameFromHeaders(response.headers) || `coverage_matrix_${scheduleId}.csv`;
    this.downloadBlob(response.data, filename);
  }

  // Audit logs
  async getAuditLogs(params?: {
    entity_type?: string;
    entity_id?: number;
    user_id?: number;
    action?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  }): Promise<AuditLogListResponse> {
    const response = await this.client.get<AuditLogListResponse>('/audit/logs', { params });
    return response.data;
  }

  async getRecentActivity(hours?: number, limit?: number): Promise<AuditLogListResponse> {
    const response = await this.client.get<AuditLogListResponse>('/audit/recent', {
      params: { hours, limit },
    });
    return { items: response.data as unknown as AuditLogListResponse['items'], total: (response.data as unknown as AuditLogListResponse['items']).length, limit: limit || 50, offset: 0 };
  }

  // Schedule Templates
  async getTemplates(): Promise<ScheduleTemplate[]> {
    const response = await this.client.get<ScheduleTemplate[]>('/templates/');
    return response.data;
  }

  async getTemplate(id: number): Promise<ScheduleTemplate> {
    const response = await this.client.get<ScheduleTemplate>(`/templates/${id}`);
    return response.data;
  }

  async createTemplateFromSchedule(data: {
    name: string;
    description?: string;
    source_schedule_id: number;
  }): Promise<ScheduleTemplate> {
    const response = await this.client.post<ScheduleTemplate>('/templates/from-schedule', data);
    return response.data;
  }

  async updateTemplate(id: number, data: { name?: string; description?: string }): Promise<ScheduleTemplate> {
    const response = await this.client.put<ScheduleTemplate>(`/templates/${id}`, data);
    return response.data;
  }

  async deleteTemplate(id: number): Promise<void> {
    await this.client.delete(`/templates/${id}`);
  }

  // Shift Marketplace
  async getMarketplacePostings(status?: string, type?: string): Promise<ShiftPosting[]> {
    const response = await this.client.get<ShiftPosting[]>('/marketplace/', {
      params: { status, posting_type: type },
    });
    return response.data;
  }

  async getMyPostings(): Promise<ShiftPosting[]> {
    const response = await this.client.get<ShiftPosting[]>('/marketplace/my-postings');
    return response.data;
  }

  async createPosting(data: {
    assignment_id?: number;
    posting_type: string;
    message?: string;
    is_urgent?: boolean;
  }): Promise<ShiftPosting> {
    const response = await this.client.post<ShiftPosting>('/marketplace/', data);
    return response.data;
  }

  async claimPosting(postingId: number, message?: string): Promise<ShiftPosting> {
    const response = await this.client.post<ShiftPosting>(`/marketplace/${postingId}/claim`, { message });
    return response.data;
  }

  async cancelPosting(postingId: number): Promise<void> {
    await this.client.post(`/marketplace/${postingId}/cancel`);
  }

  // Fairness Analytics
  async getFairnessMetrics(scheduleId: number): Promise<FairnessMetrics> {
    const response = await this.client.get<FairnessMetrics>(`/fairness/${scheduleId}`);
    return response.data;
  }

  async getFairnessByMonth(year: number, month: number): Promise<FairnessMetrics> {
    const response = await this.client.get<FairnessMetrics>(`/fairness/by-month/${year}/${month}`);
    return response.data;
  }

  // Generic HTTP methods for new features
  async get<T>(url: string, config?: Parameters<AxiosInstance['get']>[1]): Promise<{ data: T }> {
    return this.client.get<T>(url, config);
  }

  async post<T>(url: string, data?: unknown, config?: Parameters<AxiosInstance['post']>[2]): Promise<{ data: T }> {
    return this.client.post<T>(url, data, config);
  }

  async put<T>(url: string, data?: unknown, config?: Parameters<AxiosInstance['put']>[2]): Promise<{ data: T }> {
    return this.client.put<T>(url, data, config);
  }

  async delete<T>(url: string, config?: Parameters<AxiosInstance['delete']>[1]): Promise<{ data: T }> {
    return this.client.delete<T>(url, config);
  }

  private getFilenameFromHeaders(headers: Record<string, unknown>): string | null {
    const contentDisposition = headers['content-disposition'];
    if (typeof contentDisposition === 'string') {
      const match = contentDisposition.match(/filename=(.+)/);
      if (match) return match[1];
    }
    return null;
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

export const api = new ApiClient();
