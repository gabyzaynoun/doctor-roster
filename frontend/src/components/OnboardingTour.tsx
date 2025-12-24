import { useState, useEffect, useCallback } from 'react';
import Joyride, { Step, CallBackProps, STATUS, EVENTS } from 'react-joyride';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

// Base steps for all users
const baseSteps: Step[] = [
  {
    target: 'body',
    content: (
      <div>
        <h3 style={{ margin: '0 0 8px 0' }}>Welcome to Doctor Roster!</h3>
        <p style={{ margin: 0 }}>
          Let's take a quick tour of the main features to help you get started.
        </p>
      </div>
    ),
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '[data-tour="nav-schedule"]',
    content: (
      <div>
        <h4 style={{ margin: '0 0 8px 0' }}>Schedule Management</h4>
        <p style={{ margin: 0 }}>
          View and manage monthly shift schedules. See your assignments at a glance.
        </p>
      </div>
    ),
    placement: 'right',
  },
  {
    target: '[data-tour="nav-dashboard"]',
    content: (
      <div>
        <h4 style={{ margin: '0 0 8px 0' }}>Dashboard & Analytics</h4>
        <p style={{ margin: 0 }}>
          View statistics, coverage gaps, and workload distribution at a glance.
        </p>
      </div>
    ),
    placement: 'right',
  },
  {
    target: '[data-tour="nav-doctors"]',
    content: (
      <div>
        <h4 style={{ margin: '0 0 8px 0' }}>Doctor Directory</h4>
        <p style={{ margin: 0 }}>
          View the team of doctors, their specialties, skills, and work hours.
        </p>
      </div>
    ),
    placement: 'right',
  },
  {
    target: '[data-tour="nav-swaps"]',
    content: (
      <div>
        <h4 style={{ margin: '0 0 8px 0' }}>Shift Swaps</h4>
        <p style={{ margin: 0 }}>
          Request and manage shift swaps with colleagues.
        </p>
      </div>
    ),
    placement: 'right',
  },
  {
    target: '[data-tour="nav-marketplace"]',
    content: (
      <div>
        <h4 style={{ margin: '0 0 8px 0' }}>Shift Marketplace</h4>
        <p style={{ margin: 0 }}>
          Give away shifts, pick up extra hours, or find swap partners in the marketplace.
        </p>
      </div>
    ),
    placement: 'right',
  },
  {
    target: '[data-tour="nav-fairness"]',
    content: (
      <div>
        <h4 style={{ margin: '0 0 8px 0' }}>Fairness Analytics</h4>
        <p style={{ margin: 0 }}>
          See how fairly shifts are distributed - night shifts, weekends, and holidays.
        </p>
      </div>
    ),
    placement: 'right',
  },
];

// Doctor-specific steps
const doctorSteps: Step[] = [
  {
    target: '[data-tour="nav-availability"]',
    content: (
      <div>
        <h4 style={{ margin: '0 0 8px 0' }}>Your Availability</h4>
        <p style={{ margin: 0 }}>
          Set your weekly preferences and mark dates when you're unavailable. The scheduler will try to respect your preferences.
        </p>
      </div>
    ),
    placement: 'right',
  },
  {
    target: '[data-tour="nav-leaves"]',
    content: (
      <div>
        <h4 style={{ margin: '0 0 8px 0' }}>Leave Requests</h4>
        <p style={{ margin: 0 }}>
          Submit and track your leave requests. View your leave balance and history.
        </p>
      </div>
    ),
    placement: 'right',
  },
];

// Admin-specific steps
const adminSteps: Step[] = [
  {
    target: '[data-tour="nav-availability"]',
    content: (
      <div>
        <h4 style={{ margin: '0 0 8px 0' }}>Staff Availability</h4>
        <p style={{ margin: 0 }}>
          View and manage availability preferences for all doctors in the system.
        </p>
      </div>
    ),
    placement: 'right',
  },
  {
    target: '[data-tour="nav-leaves"]',
    content: (
      <div>
        <h4 style={{ margin: '0 0 8px 0' }}>Leave Management</h4>
        <p style={{ margin: 0 }}>
          Approve or reject leave requests. View all pending and approved leaves.
        </p>
      </div>
    ),
    placement: 'right',
  },
];

// Common ending steps
const endingSteps: Step[] = [
  {
    target: '[data-tour="notifications"]',
    content: (
      <div>
        <h4 style={{ margin: '0 0 8px 0' }}>Notifications</h4>
        <p style={{ margin: 0 }}>
          Stay updated with schedule changes, swap requests, and announcements.
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '[data-tour="theme-toggle"]',
    content: (
      <div>
        <h4 style={{ margin: '0 0 8px 0' }}>Theme Settings</h4>
        <p style={{ margin: 0 }}>
          Toggle between light and dark themes to suit your preference.
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: 'body',
    content: (
      <div>
        <h3 style={{ margin: '0 0 8px 0' }}>You're all set!</h3>
        <p style={{ margin: 0 }}>
          Press <kbd style={{ background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.85em' }}>?</kbd> anytime to see keyboard shortcuts.
          <br /><br />
          <span style={{ fontSize: '0.9em', color: 'var(--text-secondary)' }}>
            Tip: You can restart this tour from your Profile page.
          </span>
        </p>
      </div>
    ),
    placement: 'center',
  },
];

// Build steps based on role
function getTourSteps(role: string | undefined): Step[] {
  const roleSpecificSteps = role === 'admin' ? adminSteps : doctorSteps;
  return [...baseSteps, ...roleSpecificSteps, ...endingSteps];
}

export function OnboardingTour() {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const { theme } = useTheme();
  const { user } = useAuth();

  const tourSteps = getTourSteps(user?.role);

  useEffect(() => {
    // Check if user has seen the tour
    const hasSeenTour = localStorage.getItem('hasSeenOnboarding');
    if (!hasSeenTour && user) {
      // Delay to let the app render first
      const timer = setTimeout(() => setRun(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const handleJoyrideCallback = useCallback((data: CallBackProps) => {
    const { status, type, index } = data;

    // Update step index for progress tracking
    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      setStepIndex(index + 1);
    }

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false);
      setStepIndex(0);
      localStorage.setItem('hasSeenOnboarding', 'true');
    }
  }, []);

  return (
    <Joyride
      steps={tourSteps}
      run={run}
      stepIndex={stepIndex}
      continuous
      showSkipButton
      showProgress
      scrollToFirstStep
      spotlightClicks
      callback={handleJoyrideCallback}
      floaterProps={{
        disableAnimation: true,
      }}
      styles={{
        options: {
          primaryColor: '#2563eb',
          backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
          textColor: theme === 'dark' ? '#f1f5f9' : '#1e293b',
          arrowColor: theme === 'dark' ? '#1e293b' : '#ffffff',
          overlayColor: 'rgba(0, 0, 0, 0.6)',
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
        },
        tooltipContainer: {
          textAlign: 'left',
        },
        tooltipContent: {
          padding: '8px 0',
        },
        buttonNext: {
          backgroundColor: '#2563eb',
          borderRadius: '8px',
          padding: '10px 20px',
          fontWeight: 600,
        },
        buttonBack: {
          color: '#64748b',
          marginRight: '8px',
        },
        buttonSkip: {
          color: '#94a3b8',
          fontSize: '0.9em',
        },
        spotlight: {
          borderRadius: '8px',
        },
        overlay: {
          mixBlendMode: undefined,
        },
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Get Started!',
        next: 'Next',
        skip: 'Skip tour',
      }}
    />
  );
}

export function resetOnboarding() {
  localStorage.removeItem('hasSeenOnboarding');
  window.location.reload();
}

// Export a hook for programmatic control
export function useOnboardingTour() {
  const startTour = useCallback(() => {
    localStorage.removeItem('hasSeenOnboarding');
    window.dispatchEvent(new CustomEvent('startOnboardingTour'));
  }, []);

  return { startTour, resetOnboarding };
}
