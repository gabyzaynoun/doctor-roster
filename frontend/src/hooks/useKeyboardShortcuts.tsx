import React, { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }

      const key = event.key.toLowerCase();
      const ctrl = event.ctrlKey || event.metaKey;
      const shift = event.shiftKey;
      const alt = event.altKey;

      // Navigation shortcuts (Alt + key)
      if (alt && !ctrl && !shift) {
        switch (key) {
          case 'h':
            event.preventDefault();
            navigate('/');
            toast('Navigated to Schedule', { icon: '📅' });
            break;
          case 'd':
            event.preventDefault();
            navigate('/dashboard');
            toast('Navigated to Dashboard', { icon: '📊' });
            break;
          case 't':
            event.preventDefault();
            navigate('/doctors');
            toast('Navigated to Doctors', { icon: '👥' });
            break;
          case 'l':
            event.preventDefault();
            navigate('/leaves');
            toast('Navigated to Leaves', { icon: '🏖️' });
            break;
          case 's':
            event.preventDefault();
            navigate('/swaps');
            toast('Navigated to Swaps', { icon: '🔄' });
            break;
          case 'a':
            event.preventDefault();
            navigate('/availability');
            toast('Navigated to Availability', { icon: '📋' });
            break;
          case 'f':
            event.preventDefault();
            navigate('/fairness');
            toast('Navigated to Fairness', { icon: '⚖️' });
            break;
          case 'm':
            event.preventDefault();
            navigate('/marketplace');
            toast('Navigated to Marketplace', { icon: '🏪' });
            break;
        }
      }

      // Help shortcut
      if (key === '?' && shift) {
        event.preventDefault();
        showShortcutsHelp();
      }

      // Search shortcut
      if (key === '/' && !ctrl && !shift && !alt) {
        event.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>('[data-search-input]');
        if (searchInput) {
          searchInput.focus();
          toast('Search activated', { icon: '🔍' });
        }
      }

      // Escape to close modals
      if (key === 'escape') {
        const modal = document.querySelector('.modal-overlay');
        if (modal) {
          const closeButton = modal.querySelector<HTMLButtonElement>('.modal-close, .btn-icon');
          closeButton?.click();
        }
      }

      // Delete key - for removing selected items
      if (key === 'delete' && !ctrl && !shift && !alt) {
        const deleteBtn = document.querySelector<HTMLButtonElement>('[data-delete-selected]');
        if (deleteBtn && !deleteBtn.disabled) {
          deleteBtn.click();
        }
      }

      // Ctrl+P - Print
      if (ctrl && key === 'p' && !shift && !alt) {
        // Let browser handle print
      }

      // Ctrl+E - Export
      if (ctrl && key === 'e' && !shift && !alt) {
        event.preventDefault();
        const exportBtn = document.querySelector<HTMLButtonElement>('[data-export-btn]');
        if (exportBtn) {
          exportBtn.click();
          toast('Opening export options...', { icon: '📥' });
        }
      }

      // Ctrl+B - Auto-build
      if (ctrl && key === 'b' && !shift && !alt) {
        event.preventDefault();
        const buildBtn = document.querySelector<HTMLButtonElement>('[data-autobuild-btn]');
        if (buildBtn && !buildBtn.disabled) {
          buildBtn.click();
        }
      }
    },
    [navigate]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

function showShortcutsHelp() {
  toast(
    (t) => (
      <div style={{ maxWidth: '340px' }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600 }}>
          Keyboard Shortcuts
        </h4>
        <div style={{ fontSize: '12px', lineHeight: '1.8' }}>
          <div style={{ fontWeight: 600, marginBottom: '4px', color: 'var(--text-muted)' }}>Navigation</div>
          <div><kbd>Alt+H</kbd> Schedule</div>
          <div><kbd>Alt+D</kbd> Dashboard</div>
          <div><kbd>Alt+T</kbd> Doctors (Team)</div>
          <div><kbd>Alt+L</kbd> Leaves</div>
          <div><kbd>Alt+S</kbd> Swaps</div>
          <div><kbd>Alt+A</kbd> Availability</div>
          <div><kbd>Alt+F</kbd> Fairness</div>
          <div><kbd>Alt+M</kbd> Marketplace</div>
          <div style={{ fontWeight: 600, marginTop: '8px', marginBottom: '4px', color: 'var(--text-muted)' }}>Actions</div>
          <div><kbd>Ctrl+Z</kbd> Undo</div>
          <div><kbd>Ctrl+Y</kbd> Redo</div>
          <div><kbd>Ctrl+E</kbd> Export</div>
          <div><kbd>Ctrl+B</kbd> Auto-build</div>
          <div><kbd>Delete</kbd> Delete selected</div>
          <div><kbd>/</kbd> Focus search</div>
          <div><kbd>Esc</kbd> Close modal</div>
          <div><kbd>?</kbd> Show this help</div>
        </div>
        <button
          onClick={() => toast.dismiss(t.id)}
          style={{
            marginTop: '12px',
            padding: '6px 12px',
            background: 'var(--primary)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          Got it!
        </button>
      </div>
    ),
    { duration: 15000, position: 'bottom-center' }
  );
}

export function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
  useKeyboardShortcuts();
  return <>{children}</>;
}
