import type { KeyboardEvent, PointerEvent as ReactPointerEvent, RefObject } from 'react';

// A drag handle between two Graph panes (GRAPHING-UI1), after Notebook's
// pane resizer: the expression list's edge (a width in CSS pixels) or the
// divider of the Both view (the Real pane's share), side by side or, in a
// compact window, stacked. While dragging, `preview` applies the value to the
// page directly; `commit` stores it in the session once, on release. Arrow
// keys step it; a double-click restores the default.

export function GraphPaneResizer({
  commit, containerRef, defaultValue, label, orientation = 'vertical', preview, toValue, value, valueText,
}: {
  commit: (value: number) => void;
  containerRef: RefObject<HTMLElement | null>;
  defaultValue: number;
  label: string;
  /** A vertical handle splits left from right; a horizontal one splits top from bottom. */
  orientation?: 'vertical' | 'horizontal';
  preview: (value: number) => void;
  /** The value for a pointer offset (CSS pixels from the container's left or top edge) and the container's size, clamped. */
  toValue: (offset: number, containerSize: number) => number;
  value: number;
  valueText: string;
}) {
  const vertical = orientation === 'vertical';
  const offsetOf = (client: { clientX: number; clientY: number }) => {
    const container = containerRef.current;
    if (!container) return null;
    const bounds = container.getBoundingClientRect();
    return vertical
      ? { offset: client.clientX - bounds.left, size: bounds.width }
      : { offset: client.clientY - bounds.top, size: bounds.height };
  };

  function beginResize(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    event.preventDefault();
    let latest = value;
    const move = (pointerEvent: PointerEvent) => {
      const at = offsetOf(pointerEvent);
      if (!at) return;
      latest = toValue(at.offset, at.size);
      preview(latest);
    };
    const resizingClass = vertical ? 'is-graph-pane-resizing' : 'is-graph-pane-resizing-rows';
    const stop = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
      document.body.classList.remove(resizingClass);
      if (latest !== value) commit(latest);
    };
    document.body.classList.add(resizingClass);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop, { once: true });
    window.addEventListener('pointercancel', stop, { once: true });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const [back, forward] = vertical ? ['ArrowLeft', 'ArrowRight'] : ['ArrowUp', 'ArrowDown'];
    if (event.key !== back && event.key !== forward) return;
    event.preventDefault();
    const handle = event.currentTarget.getBoundingClientRect();
    const at = offsetOf({ clientX: handle.left + handle.width / 2, clientY: handle.top + handle.height / 2 });
    if (!at) return;
    const next = toValue(at.offset + (event.key === forward ? 16 : -16), at.size);
    preview(next);
    commit(next);
  }

  return <div
    aria-label={label}
    aria-orientation={orientation}
    aria-valuetext={valueText}
    className={`graph-pane-resizer graph-pane-resizer--${orientation}`}
    role="separator"
    tabIndex={0}
    title={`${label}; double-click to reset`}
    onDoubleClick={() => { preview(defaultValue); commit(defaultValue); }}
    onKeyDown={handleKeyDown}
    onPointerDown={beginResize}
  >
    <span aria-hidden="true" />
  </div>;
}
