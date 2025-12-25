import { useState } from 'react';
import { CheckSquare, Square, Trash2, UserPlus, X, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Doctor } from '../types';

interface BulkOperationsProps {
  selectedIds: Set<number>;
  onSelect: (id: number) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBulkDelete: (ids: number[]) => Promise<void>;
  onBulkAssign?: (doctorId: number, ids: number[]) => Promise<void>;
  onBulkCopy?: (ids: number[], targetDate: string) => Promise<void>;
  doctors?: Doctor[];
  totalItems: number;
  itemType?: string;
}

export function BulkOperationsToolbar({
  selectedIds,
  onSelectAll,
  onClearSelection,
  onBulkDelete,
  onBulkAssign,
  doctors = [],
  totalItems,
  itemType = 'items',
}: BulkOperationsProps) {
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const selectedCount = selectedIds.size;

  if (selectedCount === 0) return null;

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedCount} ${itemType}? This cannot be undone.`)) return;

    setIsProcessing(true);
    try {
      await onBulkDelete(Array.from(selectedIds));
      toast.success(`✓ Deleted ${selectedCount} ${itemType}`);
      onClearSelection();
    } catch (error) {
      toast.error(`Failed to delete ${itemType}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkAssign = async (doctorId: number) => {
    if (!onBulkAssign) return;
    setShowAssignDropdown(false);
    setIsProcessing(true);
    try {
      await onBulkAssign(doctorId, Array.from(selectedIds));
      const doctor = doctors.find(d => d.id === doctorId);
      toast.success(`✓ Assigned ${selectedCount} shifts to ${doctor?.user?.name || 'doctor'}`);
      onClearSelection();
    } catch (error) {
      toast.error('Failed to assign shifts');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bulk-operations-toolbar">
      <div className="bulk-selection-info">
        <button className="btn-icon" onClick={onClearSelection} title="Clear selection">
          <X size={16} />
        </button>
        <span className="selection-count">
          {selectedCount} of {totalItems} selected
        </span>
        <button
          className="btn-link"
          onClick={onSelectAll}
          disabled={selectedCount === totalItems}
        >
          Select All
        </button>
      </div>

      <div className="bulk-actions">
        {onBulkAssign && (
          <div className="dropdown-container">
            <button
              className="btn-secondary btn-sm"
              onClick={() => setShowAssignDropdown(!showAssignDropdown)}
              disabled={isProcessing}
            >
              <UserPlus size={14} />
              Assign to...
              <ChevronDown size={14} />
            </button>
            {showAssignDropdown && (
              <div className="dropdown-menu">
                <div className="dropdown-header">Select Doctor</div>
                <div className="dropdown-list">
                  {doctors.map(doctor => (
                    <button
                      key={doctor.id}
                      className="dropdown-item"
                      onClick={() => handleBulkAssign(doctor.id)}
                    >
                      <span className="doctor-avatar">
                        {doctor.user?.name?.charAt(0) || 'D'}
                      </span>
                      <span className="doctor-name">{doctor.user?.name || `Doctor ${doctor.id}`}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <button
          className="btn-danger btn-sm"
          onClick={handleBulkDelete}
          disabled={isProcessing}
        >
          <Trash2 size={14} />
          Delete ({selectedCount})
        </button>
      </div>
    </div>
  );
}

// Checkbox component for bulk selection
export function BulkSelectCheckbox({
  id,
  isSelected,
  onToggle,
}: {
  id: number;
  isSelected: boolean;
  onToggle: (id: number) => void;
}) {
  return (
    <button
      className={`bulk-checkbox ${isSelected ? 'selected' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onToggle(id);
      }}
      title={isSelected ? 'Deselect' : 'Select'}
    >
      {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
    </button>
  );
}

// Hook for managing bulk selection state
export function useBulkSelection<T extends { id: number }>() {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const toggleSelection = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = (items: T[]) => {
    setSelectedIds(new Set(items.map(item => item.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const isSelected = (id: number) => selectedIds.has(id);

  const toggleShiftSelect = (id: number, items: T[], e: React.MouseEvent) => {
    if (e.shiftKey && selectedIds.size > 0) {
      // Find the range between last selected and current
      const lastSelected = Array.from(selectedIds).pop()!;
      const itemIds = items.map(i => i.id);
      const lastIdx = itemIds.indexOf(lastSelected);
      const currentIdx = itemIds.indexOf(id);

      if (lastIdx !== -1 && currentIdx !== -1) {
        const start = Math.min(lastIdx, currentIdx);
        const end = Math.max(lastIdx, currentIdx);
        const rangeIds = itemIds.slice(start, end + 1);

        setSelectedIds(prev => {
          const next = new Set(prev);
          rangeIds.forEach(rid => next.add(rid));
          return next;
        });
        return;
      }
    }
    toggleSelection(id);
  };

  return {
    selectedIds,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelected,
    toggleShiftSelect,
  };
}
