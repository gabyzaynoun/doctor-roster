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
          const closeButton = modal.querySelector<HTMLButtonElement>('.modal-close');
          closeButton?.click();
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
      <div style={{ maxWidth: '300px' }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600 }}>
          Keyboard Shortcuts
        </h4>
        <div style={{ fontSize: '12px', lineHeight: '1.8' }}>
          <div><kbd>Alt+H</kbd> Schedule</div>
          <div><kbd>Alt+D</kbd> Dashboard</div>
          <div><kbd>Alt+T</kbd> Doctors (Team)</div>
          <div><kbd>Alt+L</kbd> Leaves</div>
          <div><kbd>Alt+S</kbd> Swaps</div>
          <div><kbd>Alt+A</kbd> Availability</div>
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
    { duration: 10000, position: 'bottom-center' }
  );
}

export function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
  useKeyboardShortcuts();
  return <>{children}</>;
}
