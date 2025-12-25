import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Printer, Mail, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';

interface ExportPanelProps {
  scheduleId: number;
  scheduleName: string;
  onClose: () => void;
}

type ExportFormat = 'csv' | 'pdf' | 'excel';
type ExportType = 'assignments' | 'doctor-hours' | 'coverage-matrix' | 'fairness';

interface ExportOption {
  id: ExportType;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const exportOptions: ExportOption[] = [
  {
    id: 'assignments',
    label: 'Full Schedule',
    description: 'All assignments with doctor, center, shift details',
    icon: <FileSpreadsheet size={20} />,
  },
  {
    id: 'doctor-hours',
    label: 'Doctor Hours Report',
    description: 'Hours breakdown per doctor',
    icon: <FileText size={20} />,
  },
  {
    id: 'coverage-matrix',
    label: 'Coverage Matrix',
    description: 'Coverage status by center and shift',
    icon: <FileSpreadsheet size={20} />,
  },
  {
    id: 'fairness',
    label: 'Fairness Analytics',
    description: 'Distribution of shifts and hours',
    icon: <FileText size={20} />,
  },
];

export function ExportPanel({ scheduleId, scheduleName, onClose }: ExportPanelProps) {
  const [selectedTypes, setSelectedTypes] = useState<Set<ExportType>>(new Set(['assignments']));
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [isExporting, setIsExporting] = useState(false);
  const [includeNotes, setIncludeNotes] = useState(true);

  const toggleType = (type: ExportType) => {
    setSelectedTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const handleExport = async () => {
    if (selectedTypes.size === 0) {
      toast.error('Please select at least one export type');
      return;
    }

    setIsExporting(true);
    try {
      const types = Array.from(selectedTypes);
      let successCount = 0;

      for (const type of types) {
        try {
          switch (type) {
            case 'assignments':
              await api.exportAssignmentsCsv(scheduleId);
              break;
            case 'doctor-hours':
              await api.exportDoctorHoursCsv(scheduleId);
              break;
            case 'coverage-matrix':
              await api.exportCoverageMatrixCsv(scheduleId);
              break;
            case 'fairness':
              // Fairness export - generate from API
              const fairnessData = await api.getFairnessMetrics(scheduleId);
              downloadFairnessReport(fairnessData, scheduleName);
              break;
          }
          successCount++;
        } catch (err) {
          console.error(`Failed to export ${type}:`, err);
        }
      }

      if (successCount === types.length) {
        toast.success(`✓ Exported ${successCount} file${successCount > 1 ? 's' : ''} successfully`);
      } else if (successCount > 0) {
        toast.success(`Exported ${successCount} of ${types.length} files`);
      } else {
        toast.error('Export failed');
      }

      onClose();
    } catch (error) {
      toast.error('Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    toast.success('Preparing print preview...');
    window.print();
  };

  const handleEmail = () => {
    toast('Email functionality coming soon!', { icon: '📧' });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal export-panel" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2><Download size={20} /> Export Schedule</h2>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-content">
          <div className="export-section">
            <h3>Select Reports to Export</h3>
            <div className="export-options">
              {exportOptions.map(option => (
                <button
                  key={option.id}
                  className={`export-option ${selectedTypes.has(option.id) ? 'selected' : ''}`}
                  onClick={() => toggleType(option.id)}
                >
                  <div className="export-option-check">
                    {selectedTypes.has(option.id) ? <Check size={16} /> : null}
                  </div>
                  <div className="export-option-icon">{option.icon}</div>
                  <div className="export-option-info">
                    <span className="export-option-label">{option.label}</span>
                    <span className="export-option-desc">{option.description}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="export-section">
            <h3>Export Format</h3>
            <div className="format-options">
              <label className={`format-option ${format === 'csv' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="format"
                  value="csv"
                  checked={format === 'csv'}
                  onChange={() => setFormat('csv')}
                />
                <span className="format-label">CSV</span>
                <span className="format-desc">Spreadsheet compatible</span>
              </label>
              <label className={`format-option ${format === 'excel' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="format"
                  value="excel"
                  checked={format === 'excel'}
                  onChange={() => setFormat('excel')}
                />
                <span className="format-label">Excel</span>
                <span className="format-desc">Microsoft Excel format</span>
              </label>
              <label className={`format-option ${format === 'pdf' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="format"
                  value="pdf"
                  checked={format === 'pdf'}
                  onChange={() => setFormat('pdf')}
                />
                <span className="format-label">PDF</span>
                <span className="format-desc">Print-ready document</span>
              </label>
            </div>
          </div>

          <div className="export-section">
            <h3>Options</h3>
            <label className="checkbox-option">
              <input
                type="checkbox"
                checked={includeNotes}
                onChange={e => setIncludeNotes(e.target.checked)}
              />
              <span>Include notes and comments</span>
            </label>
          </div>

          <div className="export-quick-actions">
            <button className="btn-secondary" onClick={handlePrint}>
              <Printer size={16} />
              Print Preview
            </button>
            <button className="btn-secondary" onClick={handleEmail}>
              <Mail size={16} />
              Email to Doctors
            </button>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleExport}
            disabled={isExporting || selectedTypes.size === 0}
          >
            <Download size={16} />
            {isExporting ? 'Exporting...' : `Export ${selectedTypes.size} Report${selectedTypes.size > 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper to download fairness report as CSV
function downloadFairnessReport(data: any, scheduleName: string) {
  const headers = ['Doctor', 'Night Shifts', 'Weekend Shifts', 'Holiday Shifts', 'Total Hours', 'Fairness Score'];
  const rows = data.doctor_stats.map((d: any) => [
    d.doctor_name,
    d.night_shifts,
    d.weekend_shifts,
    d.holiday_shifts,
    d.total_hours,
    d.fairness_score.toFixed(2),
  ]);

  const csv = [
    headers.join(','),
    ...rows.map((row: any[]) => row.join(',')),
    '',
    `Overall Fairness Score: ${data.overall_fairness.toFixed(2)}`,
    `Night Shift Balance: ${data.night_shift_balance.toFixed(2)}`,
    `Weekend Balance: ${data.weekend_balance.toFixed(2)}`,
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fairness_${scheduleName.replace(/\s+/g, '_')}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Quick export button for toolbar
export function QuickExportButton({ scheduleId, onExport }: { scheduleId: number; onExport?: () => void }) {
  const [isExporting, setIsExporting] = useState(false);

  const handleQuickExport = async () => {
    setIsExporting(true);
    try {
      await api.exportAssignmentsCsv(scheduleId);
      toast.success('✓ Schedule exported successfully');
      onExport?.();
    } catch {
      toast.error('Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      className="btn-secondary btn-sm"
      onClick={handleQuickExport}
      disabled={isExporting}
      title="Quick export to CSV"
    >
      <Download size={16} />
      {isExporting ? 'Exporting...' : 'Export'}
    </button>
  );
}
