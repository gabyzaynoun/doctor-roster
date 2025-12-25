import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Undo2, Redo2 } from 'lucide-react';

interface UndoAction {
  id: string;
  type: string;
  description: string;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  timestamp: number;
}

interface UndoRedoContextType {
  canUndo: boolean;
  canRedo: boolean;
  undoStack: UndoAction[];
  redoStack: UndoAction[];
  pushAction: (action: Omit<UndoAction, 'id' | 'timestamp'>) => void;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  clearHistory: () => void;
  getLastAction: () => UndoAction | undefined;
}

const UndoRedoContext = createContext<UndoRedoContextType | null>(null);

const MAX_HISTORY_SIZE = 20;

export function UndoRedoProvider({ children }: { children: React.ReactNode }) {
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);
  const [redoStack, setRedoStack] = useState<UndoAction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const canUndo = undoStack.length > 0 && !isProcessing;
  const canRedo = redoStack.length > 0 && !isProcessing;

  const pushAction = useCallback((action: Omit<UndoAction, 'id' | 'timestamp'>) => {
    const fullAction: UndoAction = {
      ...action,
      id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    setUndoStack(prev => {
      const newStack = [fullAction, ...prev];
      return newStack.slice(0, MAX_HISTORY_SIZE);
    });

    // Clear redo stack when new action is performed
    setRedoStack([]);
  }, []);

  const undo = useCallback(async () => {
    if (!canUndo || isProcessing) return;

    const action = undoStack[0];
    if (!action) return;

    setIsProcessing(true);
    try {
      await action.undo();

      setUndoStack(prev => prev.slice(1));
      setRedoStack(prev => [action, ...prev].slice(0, MAX_HISTORY_SIZE));

      toast.success(`Undone: ${action.description}`, {
        icon: <Undo2 size={16} />,
        duration: 2000,
      });
    } catch (error) {
      console.error('Undo failed:', error);
      toast.error('Failed to undo action');
    } finally {
      setIsProcessing(false);
    }
  }, [canUndo, isProcessing, undoStack]);

  const redo = useCallback(async () => {
    if (!canRedo || isProcessing) return;

    const action = redoStack[0];
    if (!action) return;

    setIsProcessing(true);
    try {
      await action.redo();

      setRedoStack(prev => prev.slice(1));
      setUndoStack(prev => [action, ...prev].slice(0, MAX_HISTORY_SIZE));

      toast.success(`Redone: ${action.description}`, {
        icon: <Redo2 size={16} />,
        duration: 2000,
      });
    } catch (error) {
      console.error('Redo failed:', error);
      toast.error('Failed to redo action');
    } finally {
      setIsProcessing(false);
    }
  }, [canRedo, isProcessing, redoStack]);

  const clearHistory = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  const getLastAction = useCallback(() => {
    return undoStack[0];
  }, [undoStack]);

  // Keyboard shortcuts for Ctrl+Z and Ctrl+Y
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger in input fields
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return (
    <UndoRedoContext.Provider
      value={{
        canUndo,
        canRedo,
        undoStack,
        redoStack,
        pushAction,
        undo,
        redo,
        clearHistory,
        getLastAction,
      }}
    >
      {children}
    </UndoRedoContext.Provider>
  );
}

export function useUndoRedo() {
  const context = useContext(UndoRedoContext);
  if (!context) {
    throw new Error('useUndoRedo must be used within an UndoRedoProvider');
  }
  return context;
}

// Undo/Redo button component
export function UndoRedoButtons() {
  const { canUndo, canRedo, undo, redo, undoStack, redoStack } = useUndoRedo();
  const lastUndo = undoStack[0];
  const lastRedo = redoStack[0];

  return (
    <div className="undo-redo-buttons">
      <button
        className="btn-icon"
        onClick={undo}
        disabled={!canUndo}
        title={canUndo ? `Undo: ${lastUndo?.description} (Ctrl+Z)` : 'Nothing to undo'}
      >
        <Undo2 size={18} />
      </button>
      <button
        className="btn-icon"
        onClick={redo}
        disabled={!canRedo}
        title={canRedo ? `Redo: ${lastRedo?.description} (Ctrl+Y)` : 'Nothing to redo'}
      >
        <Redo2 size={18} />
      </button>
      {undoStack.length > 0 && (
        <span className="undo-count" title={`${undoStack.length} actions in history`}>
          {undoStack.length}
        </span>
      )}
    </div>
  );
}
