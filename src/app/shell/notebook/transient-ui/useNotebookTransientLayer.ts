import { useCallback, useContext, useEffect } from 'react';

import { NotebookTransientLayerContext } from './notebookTransientLayerContext';

export function useNotebookTransientLayer(options: {
  id: string;
  parentId?: string | null;
}) {
  const context = useContext(NotebookTransientLayerContext);
  if (!context) {
    throw new Error('useNotebookTransientLayer must be used inside NotebookTransientLayerProvider');
  }
  const parentId = options.parentId ?? null;
  const {
    close,
    open,
    register,
    stack,
  } = context;

  useEffect(() => register(options.id, parentId), [options.id, parentId, register]);

  const isOpen = stack.includes(options.id);
  const closeLayer = useCallback((restoreFocus = true) => {
    close(options.id, restoreFocus);
  }, [close, options.id]);
  const openLayer = useCallback(() => {
    open(options.id);
  }, [open, options.id]);
  const toggle = useCallback(() => {
    if (stack.includes(options.id)) {
      close(options.id);
    } else {
      open(options.id);
    }
  }, [close, open, options.id, stack]);

  return {
    close: closeLayer,
    id: options.id,
    isOpen,
    open: openLayer,
    toggle,
  };
}
