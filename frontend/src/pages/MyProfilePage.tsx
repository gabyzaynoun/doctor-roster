import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  User,
  Calendar,
  Clock,
  Award,
  TrendingUp,
  Star,
  Activity,
  Sun,
  Moon,
  Sunset,
  HelpCircle,
} from 'lucide-react';
import { resetOnboarding } from '../components/OnboardingTour';
import './MyProfilePage.css';

interface ProfileStats {
  totalShifts: number;
  totalHours: number;
  morningShifts: number;
  afternoonShifts: number;
  nightShifts: number;
  pendingSwaps: number;
  completedSwaps: number;
  currentStreak: number;
}

interface MonthlyData {
  month: string;
  shifts: number;
  hours: number;
}

const COLORS = ['#3b82f6', '#22c55e', '#8b5cf6', '#f59e0b', '#ef4444'];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 100,
    },
  },
};

export function MyProfilePage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<ProfileStats>({
    totalShifts: 0,
    totalHours: 0,
    morningShifts: 0,
    afternoonShifts: 0,
    nightShifts: 0,
    pendingSwaps: 0,
    completedSwaps: 0,
    currentStreak: 0,
  });
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    setIsLoading(true);
    try {
      // Simulated data - in production, this would come from the API
      // Get actual data from assignments
      const schedules = await api.getSchedules();
      const currentSchedule = schedules[0];

      if (currentSchedule) {
        const scheduleStats = await api.getScheduleStats(currentSchedule.id);
        const doctorStats = scheduleStats.doctor_stats.find(
          (d) => d.doctor_name === user?.name
        );

        if (doctorStats) {
          setStats({
            totalShifts: doctorStats.assignment_count,
            totalHours: doctorStats.total_hours,
            morningShifts: Math.floor(doctorStats.assignment_count * 0.4),
            afternoonShifts: Math.floor(doctorStats.assignment_count * 0.35),
            nightShifts: Math.floor(doctorStats.assignment_count * 0.25),
            pendingSwaps: 2,
            completedSwaps: 5,
            currentStreak: 7,
          });
        }
      }

      // Generate monthly trend data
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentMonth = new Date().getMonth();
      const trendData = months.slice(0, currentMonth + 1).map((month) => ({
        month,
        shifts: Math.floor(Math.random() * 15) + 10,
        hours: Math.floor(Math.random() * 120) + 80,
      }));
      setMonthlyData(trendData);
    } catch (error) {
      console.error('Failed to load profile data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const shiftDistribution = [
    { name: 'Morning', value: stats.morningShifts, icon: Sun },
    { name: 'Afternoon', value: stats.afternoonShifts, icon: Sunset },
    { name: 'Night', value: stats.nightShifts, icon: Moon },
  ];

  if (isLoading) {
    return (
      <div className="profile-loading">
        <div className="spinner-large" />
        <p>Loading your profile...</p>
      </div>
    );
  }

  return (
    <motion.div
      className="profile-page"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div className="profile-header" variants={itemVariants}>
        <div className="profile-avatar">
          <span>{user?.name?.charAt(0).toUpperCase() || 'D'}</span>
        </div>
        <div className="profile-info">
          <h1>{user?.name || 'Doctor'}</h1>
          <p className="profile-email">{user?.email}</p>
          <div className="profile-badges">
            <span className="badge badge-role">{user?.role || 'Doctor'}</span>
            <span className="badge badge-nationality">
              {user?.nationality === 'saudi' ? 'Saudi' : 'Non-Saudi'}
            </span>
          </div>
        </div>
        <div className="profile-streak">
          <div className="streak-number">{stats.currentStreak}</div>
          <div className="streak-label">Day Streak</div>
          <Star className="streak-icon" />
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div className="stats-grid" variants={itemVariants}>
        <div className="stat-card gradient-blue">
          <div className="stat-icon">
            <Calendar size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.totalShifts}</span>
            <span className="stat-label">Total Shifts</span>
          </div>
        </div>

        <div className="stat-card gradient-green">
          <div className="stat-icon">
            <Clock size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.totalHours}h</span>
            <span className="stat-label">Total Hours</span>
          </div>
        </div>

        <div className="stat-card gradient-purple">
          <div className="stat-icon">
            <Activity size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.pendingSwaps}</span>
            <span className="stat-label">Pending Swaps</span>
          </div>
        </div>

        <div className="stat-card gradient-orange">
          <div className="stat-icon">
            <Award size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.completedSwaps}</span>
            <span className="stat-label">Completed Swaps</span>
          </div>
        </div>
      </motion.div>

      {/* Charts Row */}
      <div className="charts-row">
        {/* Monthly Trend */}
        <motion.div className="chart-card" variants={itemVariants}>
          <h3>
            <TrendingUp size={20} />
            Monthly Hours Trend
          </h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--text-muted)" />
                <YAxis stroke="var(--text-muted)" />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="hours"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', strokeWidth: 2 }}
                  activeDot={{ r: 8, fill: '#3b82f6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Shift Distribution */}
        <motion.div className="chart-card" variants={itemVariants}>
          <h3>
            <Clock size={20} />
            Shift Distribution
          </h3>
          <div className="chart-container pie-chart">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={shiftDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {shiftDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pie-legend">
              {shiftDistribution.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div key={item.name} className="legend-item">
                    <div
                      className="legend-color"
                      style={{ background: COLORS[index] }}
                    />
                    <Icon size={16} />
                    <span>{item.name}</span>
                    <strong>{item.value}</strong>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Monthly Shifts Bar Chart */}
      <motion.div className="chart-card full-width" variants={itemVariants}>
        <h3>
          <Calendar size={20} />
          Shifts per Month
        </h3>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" stroke="var(--text-muted)" />
              <YAxis stroke="var(--text-muted)" />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                }}
              />
              <Bar
                dataKey="shifts"
                fill="#3b82f6"
                radius={[8, 8, 0, 0]}
                animationDuration={1500}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div className="quick-actions" variants={itemVariants}>
        <h3>Quick Actions</h3>
        <div className="actions-grid">
          <button className="action-btn" onClick={() => window.location.href = '/swaps'}>
            <Activity size={20} />
            Request Swap
          </button>
          <button className="action-btn" onClick={() => window.location.href = '/availability'}>
            <Calendar size={20} />
            Update Availability
          </button>
          <button className="action-btn" onClick={() => window.location.href = '/leaves'}>
            <Clock size={20} />
            Request Leave
          </button>
          <button className="action-btn" onClick={() => window.location.href = '/'}>
            <User size={20} />
            View Schedule
          </button>
          <button className="action-btn action-btn-secondary" onClick={resetOnboarding}>
            <HelpCircle size={20} />
            Restart Tour
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
