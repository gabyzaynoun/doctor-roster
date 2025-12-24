import { ReactNode } from 'react';
import {
  Calendar,
  Users,
  Clock,
  RefreshCw,
  ShoppingBag,
  Scale,
  FileText,
  Plus,
  Wand2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface EmptyStateProps {
  type:
    | 'schedule'
    | 'schedule-no-assignments'
    | 'doctors'
    | 'leaves'
    | 'swaps'
    | 'marketplace'
    | 'fairness'
    | 'generic';
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

const CONFIG: Record<
  string,
  {
    icon: ReactNode;
    title: string;
    description: string;
    tips?: string[];
    gradient?: string;
  }
> = {
  schedule: {
    icon: <Calendar size={56} />,
    title: 'No Schedule Yet',
    description: 'Create a schedule to start assigning doctors to shifts.',
    tips: [
      'Click "Create Schedule" to get started',
      'Schedules are organized by month',
      'You can use templates from previous months',
    ],
    gradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(99, 102, 241, 0.1))',
  },
  'schedule-no-assignments': {
    icon: <Sparkles size={56} />,
    title: 'Schedule Created!',
    description: 'Your schedule is ready. Now let\'s fill it with assignments.',
    tips: [
      'Click any cell to assign a doctor',
      'Drag doctors from the sidebar for quick assignment',
      'Use Auto-Build to fill gaps automatically',
    ],
    gradient: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(59, 130, 246, 0.1))',
  },
  doctors: {
    icon: <Users size={56} />,
    title: 'No Doctors Found',
    description: 'Add doctors to your team to start scheduling.',
    tips: [
      'Each doctor has a monthly hour limit based on nationality',
      'Mark certifications like pediatrics and night shifts',
      'Specialties help with visual identification',
    ],
    gradient: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(236, 72, 153, 0.1))',
  },
  leaves: {
    icon: <Clock size={56} />,
    title: 'No Leave Requests',
    description: 'Leave requests from doctors will appear here.',
    tips: [
      'Doctors can request annual, sick, or emergency leave',
      'Pending requests need approval before taking effect',
      'Leave conflicts are checked when scheduling',
    ],
    gradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(239, 68, 68, 0.1))',
  },
  swaps: {
    icon: <RefreshCw size={56} />,
    title: 'No Swap Requests',
    description: 'When doctors want to trade shifts, their requests will appear here.',
    tips: [
      'Doctors can request to swap shifts with colleagues',
      'Both parties must agree for a swap to proceed',
      'Manager approval is required for all swaps',
    ],
    gradient: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(34, 197, 94, 0.1))',
  },
  marketplace: {
    icon: <ShoppingBag size={56} />,
    title: 'Marketplace is Empty',
    description: 'No shifts are currently available for pickup.',
    tips: [
      'Doctors can post shifts they can\'t work here',
      'Pick up extra shifts when you have capacity',
      'Urgent shifts may offer bonus points',
    ],
    gradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(168, 85, 247, 0.1))',
  },
  fairness: {
    icon: <Scale size={56} />,
    title: 'No Fairness Data',
    description: 'Fairness analytics will appear once assignments are made.',
    tips: [
      'Track workload distribution across your team',
      'Monitor night shift and weekend balance',
      'Get recommendations to improve fairness',
    ],
    gradient: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(245, 158, 11, 0.1))',
  },
  generic: {
    icon: <FileText size={56} />,
    title: 'Nothing Here Yet',
    description: 'This section is empty.',
    gradient: 'linear-gradient(135deg, rgba(100, 116, 139, 0.1), rgba(148, 163, 184, 0.1))',
  },
};

export function EmptyState({
  type,
  title,
  description,
  action,
  secondaryAction,
}: EmptyStateProps) {
  const config = CONFIG[type] || CONFIG.generic;

  return (
    <div className="empty-state-container" style={{ background: config.gradient }}>
      <div className="empty-state-content">
        <div className="empty-state-icon">{config.icon}</div>
        <h2 className="empty-state-title">{title || config.title}</h2>
        <p className="empty-state-description">{description || config.description}</p>

        {config.tips && config.tips.length > 0 && (
          <div className="empty-state-tips">
            <h4>Quick Tips:</h4>
            <ul>
              {config.tips.map((tip, index) => (
                <li key={index}>
                  <ArrowRight size={12} />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="empty-state-actions">
          {action && (
            <button className="btn-primary btn-lg" onClick={action.onClick}>
              {action.icon || <Plus size={18} />}
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button className="btn-secondary" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </button>
          )}
        </div>
      </div>

      <div className="empty-state-decoration">
        <div className="decoration-circle circle-1" />
        <div className="decoration-circle circle-2" />
        <div className="decoration-circle circle-3" />
      </div>
    </div>
  );
}

// Inline action button for schedule cells
export function CellHint({
  show,
  message,
}: {
  show: boolean;
  message: string;
}) {
  if (!show) return null;

  return (
    <div className="cell-hint">
      <Plus size={12} />
      <span>{message}</span>
    </div>
  );
}

// Pulsing action indicator
export function ActionIndicator({
  show,
  onClick,
  label,
  icon,
}: {
  show: boolean;
  onClick: () => void;
  label: string;
  icon?: ReactNode;
}) {
  if (!show) return null;

  return (
    <button className="action-indicator pulsing" onClick={onClick}>
      {icon || <Wand2 size={16} />}
      <span>{label}</span>
    </button>
  );
}
