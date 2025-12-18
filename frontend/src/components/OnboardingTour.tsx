import { useState, useEffect } from 'react';
import Joyride, { Step, CallBackProps, STATUS } from 'react-joyride';
import { useTheme } from '../context/ThemeContext';

const tourSteps: Step[] = [
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
          View and manage monthly shift schedules. You can add, edit, and assign shifts to doctors.
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
          View statistics, coverage gaps, and doctor workload distribution at a glance.
        </p>
      </div>
    ),
    placement: 'right',
  },
  {
    target: '[data-tour="nav-doctors"]',
    content: (
      <div>
        <h4 style={{ margin: '0 0 8px 0' }}>Doctor Management</h4>
        <p style={{ margin: 0 }}>
          Manage the team of doctors, their specialties, and certifications.
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
          Request and manage shift swaps with colleagues. Pick up open shifts here too!
        </p>
      </div>
    ),
    placement: 'right',
  },
  {
    target: '[data-tour="nav-availability"]',
    content: (
      <div>
        <h4 style={{ margin: '0 0 8px 0' }}>Availability Preferences</h4>
        <p style={{ margin: 0 }}>
          Set your weekly preferences and mark specific dates when you're unavailable.
        </p>
      </div>
    ),
    placement: 'right',
  },
  {
    target: '[data-tour="notifications"]',
    content: (
      <div>
        <h4 style={{ margin: '0 0 8px 0' }}>Notifications</h4>
        <p style={{ margin: 0 }}>
          Stay updated with schedule changes, swap requests, and important announcements.
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '[data-tour="theme-toggle"]',
    content: (
      <div>
        <h4 style={{ margin: '0 0 8px 0' }}>Dark Mode</h4>
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
          Press <kbd style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>?</kbd> anytime to see keyboard shortcuts.
          Enjoy using Doctor Roster!
        </p>
      </div>
    ),
    placement: 'center',
  },
];

export function OnboardingTour() {
  const [run, setRun] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    // Check if user has seen the tour
    const hasSeenTour = localStorage.getItem('hasSeenOnboarding');
    if (!hasSeenTour) {
      // Delay to let the app render first
      const timer = setTimeout(() => setRun(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false);
      localStorage.setItem('hasSeenOnboarding', 'true');
    }
  };

  return (
    <Joyride
      steps={tourSteps}
      run={run}
      continuous
      showSkipButton
      showProgress
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: '#2563eb',
          backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
          textColor: theme === 'dark' ? '#f1f5f9' : '#1e293b',
          arrowColor: theme === 'dark' ? '#1e293b' : '#ffffff',
          overlayColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: '12px',
          padding: '16px',
        },
        buttonNext: {
          backgroundColor: '#2563eb',
          borderRadius: '8px',
          padding: '8px 16px',
        },
        buttonBack: {
          color: '#64748b',
          marginRight: '8px',
        },
        buttonSkip: {
          color: '#94a3b8',
        },
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Finish',
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
