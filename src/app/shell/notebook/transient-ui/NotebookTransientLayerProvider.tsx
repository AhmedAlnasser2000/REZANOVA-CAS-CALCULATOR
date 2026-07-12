import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  NotebookTransientLayerContext,
  type NotebookTransientLayerContextValue,
  type NotebookTransientLayerRegistration,
} from './notebookTransientLayerContext';

function focusAfterDismiss(id: string) {
  requestAnimationFrame(() => {
    const element = document.querySelector<HTMLElement>(
      `[data-notebook-transient-trigger="${id}"]`,
    );
    if (element?.isConnected) {
      element.focus();
    }
  });
}

export function NotebookTransientLayerProvider({ children }: { children: ReactNode }) {
  const registrations = useRef(new Map<string, NotebookTransientLayerRegistration>());
  const [stack, setStack] = useState<string[]>([]);
  const stackRef = useRef(stack);
  const escapeHeldRef = useRef(false);

  useEffect(() => {
    stackRef.current = stack;
  }, [stack]);

  const register = useCallback((id: string, parentId: string | null) => {
    const current = registrations.current.get(id);
    registrations.current.set(id, current
      ? { ...current, parentId }
      : { id, parentId });
    return () => {
      registrations.current.delete(id);
      setStack((currentStack) => currentStack.filter((layerId) => layerId !== id));
    };
  }, []);

  const open = useCallback((id: string) => {
    const registration = registrations.current.get(id);
    if (!registration) {
      return;
    }
    setStack((current) => {
      if (current[current.length - 1] === id) {
        return current;
      }
      if (!registration.parentId) {
        return [id];
      }
      const parentIndex = current.lastIndexOf(registration.parentId);
      return parentIndex >= 0
        ? [...current.slice(0, parentIndex + 1), id]
        : [id];
    });
  }, []);

  const close = useCallback((id: string, restoreFocus = true) => {
    const registration = registrations.current.get(id);
    setStack((current) => {
      const index = current.indexOf(id);
      return index >= 0 ? current.slice(0, index) : current;
    });
    if (restoreFocus) {
      if (registration) focusAfterDismiss(registration.id);
    }
  }, []);

  const closeChain = useCallback(() => {
    setStack([]);
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') {
        return;
      }
      if (escapeHeldRef.current || event.repeat) {
        if (escapeHeldRef.current) {
          event.preventDefault();
          event.stopPropagation();
        }
        return;
      }
      if (stackRef.current.length === 0) {
        return;
      }
      escapeHeldRef.current = true;
      event.preventDefault();
      event.stopPropagation();
      const topId = stackRef.current[stackRef.current.length - 1]!;
      const registration = registrations.current.get(topId);
      setStack((current) => current.slice(0, -1));
      if (registration) focusAfterDismiss(registration.id);
    }

    function handleKeyUp(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        escapeHeldRef.current = false;
      }
    }

    function handlePointerDown(event: PointerEvent) {
      if (stackRef.current.length === 0) {
        return;
      }
      const path = event.composedPath().filter((node): node is HTMLElement => node instanceof HTMLElement);
      const isInsideChain = path.some((element) => {
        const layerId = element.dataset.notebookTransientLayer;
        const triggerId = element.dataset.notebookTransientTrigger;
        if ((layerId && stackRef.current.includes(layerId))
          || (triggerId && stackRef.current.includes(triggerId))) {
          return true;
        }
        const registration = triggerId ? registrations.current.get(triggerId) : null;
        return Boolean(registration?.parentId && stackRef.current.includes(registration.parentId));
      });
      if (!isInsideChain) {
        closeChain();
      }
    }

    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('keyup', handleKeyUp, true);
    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('keyup', handleKeyUp, true);
      document.removeEventListener('pointerdown', handlePointerDown, true);
    };
  }, [closeChain]);

  const value = useMemo<NotebookTransientLayerContextValue>(() => ({
    close,
    closeChain,
    open,
    register,
    stack,
  }), [close, closeChain, open, register, stack]);

  return (
    <NotebookTransientLayerContext.Provider value={value}>
      {children}
    </NotebookTransientLayerContext.Provider>
  );
}
