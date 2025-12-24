import { ReactNode } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Calendar,
  LogOut,
  Users,
  Clock,
  BarChart3,
  History,
  Settings,
  RefreshCw,
  CalendarCheck,
  Sun,
  Moon,
  UserCircle,
  ShoppingBag,
  Scale,
} from 'lucide-react';
import { NotificationCenter } from './NotificationCenter';

interface LayoutProps {
  children: ReactNode;
}

const pageVariants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
};

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      <nav className="navbar">
        <div className="navbar-brand">
          <Calendar size={24} />
          <span>Doctor Roster</span>
        </div>

        <div className="navbar-menu">
          <Link
            to="/"
            className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
            data-tour="nav-schedule"
          >
            <Calendar size={16} />
            Schedule
          </Link>
          <Link
            to="/dashboard"
            className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}
            data-tour="nav-dashboard"
          >
            <BarChart3 size={16} />
            Dashboard
          </Link>
          <Link
            to="/doctors"
            className={`nav-link ${location.pathname === '/doctors' ? 'active' : ''}`}
            data-tour="nav-doctors"
          >
            <Users size={16} />
            Doctors
          </Link>
          <Link
            to="/leaves"
            className={`nav-link ${location.pathname === '/leaves' ? 'active' : ''}`}
            data-tour="nav-leaves"
          >
            <Clock size={16} />
            Leaves
          </Link>
          <Link
            to="/swaps"
            className={`nav-link ${location.pathname === '/swaps' ? 'active' : ''}`}
            data-tour="nav-swaps"
          >
            <RefreshCw size={16} />
            Swaps
          </Link>
          <Link
            to="/marketplace"
            className={`nav-link ${location.pathname === '/marketplace' ? 'active' : ''}`}
            data-tour="nav-marketplace"
          >
            <ShoppingBag size={16} />
            Marketplace
          </Link>
          <Link
            to="/fairness"
            className={`nav-link ${location.pathname === '/fairness' ? 'active' : ''}`}
            data-tour="nav-fairness"
          >
            <Scale size={16} />
            Fairness
          </Link>
          {(user?.role === 'doctor' || user?.role === 'admin') && (
            <Link
              to="/availability"
              className={`nav-link ${location.pathname === '/availability' ? 'active' : ''}`}
              data-tour="nav-availability"
            >
              <CalendarCheck size={16} />
              Availability
            </Link>
          )}
          {user?.role === 'admin' && (
            <>
              <Link
                to="/audit-log"
                className={`nav-link ${location.pathname === '/audit-log' ? 'active' : ''}`}
              >
                <History size={16} />
                Activity
              </Link>
              <Link
                to="/settings"
                className={`nav-link ${location.pathname === '/settings' ? 'active' : ''}`}
              >
                <Settings size={16} />
                Settings
              </Link>
            </>
          )}
        </div>

        <div className="navbar-user">
          <button
            className="btn-icon theme-toggle"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            data-tour="theme-toggle"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={theme}
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </motion.div>
            </AnimatePresence>
          </button>

          <div data-tour="notifications">
            <NotificationCenter />
          </div>

          <Link
            to="/profile"
            className="user-info"
            title="View profile"
          >
            <UserCircle size={16} />
            <span>{user?.name}</span>
            <span className={`role-badge role-${user?.role}`}>{user?.role}</span>
          </Link>

          <button onClick={handleLogout} className="btn-icon" title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </nav>

      <main className="main-content">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
