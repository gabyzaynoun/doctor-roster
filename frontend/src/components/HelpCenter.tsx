import { useState } from 'react';
import {
  HelpCircle,
  X,
  Keyboard,
  MousePointer,
  Calendar,
  Users,
  Wand2,
  RefreshCw,
  Scale,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Lightbulb,
} from 'lucide-react';

interface HelpCenterProps {
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
}

interface HelpSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

const KEYBOARD_SHORTCUTS: ShortcutItem[] = [
  { keys: ['?'], description: 'Open this help center' },
  { keys: ['Esc'], description: 'Close modals and panels' },
  { keys: ['←', '→'], description: 'Navigate months' },
  { keys: ['Ctrl', 'S'], description: 'Save current changes' },
  { keys: ['Ctrl', 'Z'], description: 'Undo last action' },
  { keys: ['Ctrl', 'F'], description: 'Search / Filter' },
  { keys: ['A'], description: 'Quick assign (when cell selected)' },
  { keys: ['D'], description: 'Delete assignment (when selected)' },
  { keys: ['P'], description: 'Publish schedule' },
  { keys: ['B'], description: 'Auto-build schedule' },
];

const QUICK_TIPS = [
  'Drag doctors from the sidebar to quickly assign them to shifts',
  'Click any cell in the schedule to add or edit assignments',
  'Use the density toggle to switch between compact and spacious views',
  'The fairness page shows you workload distribution across doctors',
  'Auto-build fills gaps while respecting all constraints',
  'Color-coded badges indicate doctor specialties for quick identification',
  'Doctors approaching their hours limit are highlighted in orange',
  'Weekend days (Friday/Saturday) are highlighted in the schedule grid',
];

export function HelpCenter({ onClose }: HelpCenterProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>('getting-started');

  const sections: HelpSection[] = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: <Lightbulb size={18} />,
      content: (
        <div className="help-section-content">
          <h4>Welcome to Doctor Roster!</h4>
          <p>
            This system helps you manage doctor schedules across multiple medical centers.
            Here's how to get started:
          </p>
          <ol>
            <li>
              <strong>View the Schedule:</strong> Navigate to the Schedule page to see the monthly
              calendar grid showing all shifts across centers.
            </li>
            <li>
              <strong>Assign Doctors:</strong> Click any cell or drag a doctor from the sidebar
              to assign them to a shift.
            </li>
            <li>
              <strong>Use Auto-Build:</strong> Click the "Auto-Build" button to automatically
              fill empty slots while respecting constraints.
            </li>
            <li>
              <strong>Review & Publish:</strong> Check the validation panel for issues, then
              publish when ready.
            </li>
          </ol>
        </div>
      ),
    },
    {
      id: 'schedule',
      title: 'Schedule Management',
      icon: <Calendar size={18} />,
      content: (
        <div className="help-section-content">
          <h4>Working with the Schedule</h4>
          <div className="help-feature">
            <MousePointer size={16} />
            <div>
              <strong>Click to Assign:</strong> Click any cell to open the assignment modal
              where you can select a doctor.
            </div>
          </div>
          <div className="help-feature">
            <Users size={16} />
            <div>
              <strong>Drag from Sidebar:</strong> Drag a doctor card from the left sidebar
              and drop it on a cell to quickly assign.
            </div>
          </div>
          <div className="help-feature">
            <Wand2 size={16} />
            <div>
              <strong>Auto-Build:</strong> Let the system automatically fill gaps based on
              doctor availability, constraints, and fairness.
            </div>
          </div>
          <div className="help-tips">
            <p><strong>Color Coding:</strong></p>
            <ul>
              <li><span className="color-sample night"></span> Purple = Night shifts</li>
              <li><span className="color-sample day12"></span> Yellow = 12-hour shifts</li>
              <li><span className="color-sample day8"></span> Green = 8-hour shifts</li>
              <li><span className="color-sample weekend"></span> Amber highlight = Weekend days</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 'doctors',
      title: 'Doctor Management',
      icon: <Users size={18} />,
      content: (
        <div className="help-section-content">
          <h4>Managing Doctors</h4>
          <p>
            Keep track of your medical staff and their capabilities:
          </p>
          <ul>
            <li>
              <strong>Hours Tracking:</strong> Each doctor has monthly hour limits based on
              nationality (Saudi: 160h, Non-Saudi: 192h).
            </li>
            <li>
              <strong>Certifications:</strong> Mark doctors as pediatrics-certified or
              night-shift capable for proper assignment.
            </li>
            <li>
              <strong>Specialties:</strong> Assign specialties to color-code doctors in the
              schedule grid.
            </li>
          </ul>
          <div className="help-warning">
            <AlertTriangle size={16} />
            <span>
              Doctors over their hours limit are highlighted in red. The system prevents
              over-scheduling.
            </span>
          </div>
        </div>
      ),
    },
    {
      id: 'swaps',
      title: 'Shift Swaps & Marketplace',
      icon: <RefreshCw size={18} />,
      content: (
        <div className="help-section-content">
          <h4>Trading Shifts</h4>
          <p>
            Doctors can request to swap shifts or post shifts to the marketplace:
          </p>
          <ul>
            <li>
              <strong>Direct Swap:</strong> Request to swap a shift with a specific colleague.
            </li>
            <li>
              <strong>Giveaway:</strong> Post a shift you can't work for anyone to pick up.
            </li>
            <li>
              <strong>Pickup Request:</strong> Request an extra shift when you have capacity.
            </li>
          </ul>
          <p>
            All swaps require manager approval to ensure coverage is maintained.
          </p>
        </div>
      ),
    },
    {
      id: 'fairness',
      title: 'Fairness Analytics',
      icon: <Scale size={18} />,
      content: (
        <div className="help-section-content">
          <h4>Ensuring Fair Distribution</h4>
          <p>
            The fairness page helps ensure equitable workload distribution:
          </p>
          <ul>
            <li>
              <strong>Night Shift Balance:</strong> Are night shifts distributed fairly?
            </li>
            <li>
              <strong>Weekend Balance:</strong> Is weekend coverage equitable?
            </li>
            <li>
              <strong>Holiday Balance:</strong> Are holiday assignments fair?
            </li>
            <li>
              <strong>Hours Balance:</strong> Are total hours roughly equal?
            </li>
          </ul>
          <p>
            Use the recommendations to improve fairness before publishing.
          </p>
        </div>
      ),
    },
    {
      id: 'shortcuts',
      title: 'Keyboard Shortcuts',
      icon: <Keyboard size={18} />,
      content: (
        <div className="help-section-content">
          <h4>Speed Up Your Work</h4>
          <div className="shortcuts-list">
            {KEYBOARD_SHORTCUTS.map((shortcut, index) => (
              <div key={index} className="shortcut-item">
                <div className="shortcut-keys">
                  {shortcut.keys.map((key, i) => (
                    <span key={i}>
                      <kbd>{key}</kbd>
                      {i < shortcut.keys.length - 1 && <span className="plus">+</span>}
                    </span>
                  ))}
                </div>
                <span className="shortcut-desc">{shortcut.description}</span>
              </div>
            ))}
          </div>
        </div>
      ),
    },
  ];

  const toggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  return (
    <div className="modal-overlay help-overlay" onClick={onClose}>
      <div className="modal help-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <HelpCircle size={20} />
            Help Center
          </h2>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="help-content">
          {/* Quick Tips Carousel */}
          <div className="quick-tips-section">
            <h3><Lightbulb size={16} /> Quick Tip</h3>
            <div className="quick-tip-card">
              {QUICK_TIPS[Math.floor(Math.random() * QUICK_TIPS.length)]}
            </div>
          </div>

          {/* Help Sections */}
          <div className="help-sections">
            {sections.map((section) => (
              <div
                key={section.id}
                className={`help-section ${expandedSection === section.id ? 'expanded' : ''}`}
              >
                <button
                  className="help-section-header"
                  onClick={() => toggleSection(section.id)}
                >
                  <span className="section-icon">{section.icon}</span>
                  <span className="section-title">{section.title}</span>
                  {expandedSection === section.id ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  )}
                </button>
                {expandedSection === section.id && (
                  <div className="help-section-body">{section.content}</div>
                )}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="help-footer">
            <p>
              Press <kbd>?</kbd> anytime to open this help center
            </p>
            <a
              href="https://github.com/your-org/doctor-roster/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="feedback-link"
            >
              <ExternalLink size={14} />
              Report an issue
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// Alert component to match the inline warning style
function AlertTriangle({ size }: { size: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}
