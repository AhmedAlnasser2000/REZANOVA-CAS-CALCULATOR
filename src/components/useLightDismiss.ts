import { useEffect, useRef, type RefObject } from 'react';

// Light dismiss for small menus and popovers (GRAPHING-UI1), the behaviour of
// Notebook's transient layers without its Notebook-specific registry: a
// pointer press outside the menu and its trigger closes it, Escape closes it
// and returns focus to the trigger, focus moving out (Tab) closes it, and
// opening one menu closes any other. A dismissing press that lands on a
// surface marked `data-graph-dismiss-swallow` (the graph viewports) is
// swallowed, so closing a menu never also traces, selects or picks.

let closeOpenMenu: (() => void) | null = null;

export const GRAPH_DISMISS_SWALLOW_ATTRIBUTE = 'data-graph-dismiss-swallow';

export function useLightDismiss({ open, onClose, layerRef, triggerRefs }: {
  open: boolean;
  onClose: () => void;
  layerRef: RefObject<HTMLElement | null>;
  /** What opened the menu; Escape focuses the first one still on the page (a control may have moved into an overflow menu). */
  triggerRefs: readonly RefObject<HTMLElement | null>[];
}) {
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  useEffect(() => {
    if (!open) return undefined;
    const inside = (node: EventTarget | null) => node instanceof Node
      && Boolean(layerRef.current?.contains(node) || triggerRefs.some((ref) => ref.current?.contains(node)));
    const close = () => onCloseRef.current();
    if (closeOpenMenu && closeOpenMenu !== close) closeOpenMenu();
    closeOpenMenu = close;

    const handlePointerDown = (event: PointerEvent) => {
      if (inside(event.target)) return;
      close();
      if (event.target instanceof Element && event.target.closest(`[${GRAPH_DISMISS_SWALLOW_ATTRIBUTE}]`)) {
        event.stopPropagation();
        event.preventDefault();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      event.preventDefault();
      event.stopPropagation();
      close();
      triggerRefs.map((ref) => ref.current).find((element) => element?.isConnected)?.focus();
    };
    const handleFocusIn = (event: FocusEvent) => {
      if (!inside(event.target)) close();
    };
    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('focusin', handleFocusIn);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('focusin', handleFocusIn);
      if (closeOpenMenu === close) closeOpenMenu = null;
    };
  }, [layerRef, open, triggerRefs]);
}
