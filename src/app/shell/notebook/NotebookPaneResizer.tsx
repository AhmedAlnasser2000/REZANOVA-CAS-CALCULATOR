import type {
  KeyboardEvent,
  PointerEvent as ReactPointerEvent,
  RefObject,
} from 'react';

type NotebookPaneResizerProps = {
  containerRef: RefObject<HTMLElement | null>;
  defaultWidth: number;
  maxWidth: number;
  minWidth: number;
  onResize: (width: number) => void;
  otherPaneWidth: number;
  side: 'outline' | 'inspector';
  width: number;
};

const MIN_CANVAS_WIDTH = 460;
const RESIZER_SPACE = 36;

function clampWidth(
  requested: number,
  containerWidth: number,
  otherPaneWidth: number,
  minWidth: number,
  maxWidth: number,
) {
  const availableMaximum = containerWidth - otherPaneWidth - MIN_CANVAS_WIDTH - RESIZER_SPACE;
  return Math.round(Math.min(Math.max(minWidth, availableMaximum), maxWidth, Math.max(minWidth, requested)));
}

export function NotebookPaneResizer({
  containerRef,
  defaultWidth,
  maxWidth,
  minWidth,
  onResize,
  otherPaneWidth,
  side,
  width,
}: NotebookPaneResizerProps) {
  function boundedWidth(requested: number) {
    const containerWidth = containerRef.current?.clientWidth || window.innerWidth;
    return clampWidth(requested, containerWidth, otherPaneWidth, minWidth, maxWidth);
  }

  function beginResize(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = width;
    const move = (pointerEvent: PointerEvent) => {
      const delta = pointerEvent.clientX - startX;
      onResize(boundedWidth(startWidth + (side === 'outline' ? delta : -delta)));
    };
    const stop = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop, { once: true });
    window.addEventListener('pointercancel', stop, { once: true });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
      return;
    }
    event.preventDefault();
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const next = width + (side === 'outline' ? direction : -direction) * 12;
    onResize(boundedWidth(next));
  }

  return (
    <div
      aria-label={`Resize Notebook ${side}`}
      aria-orientation="vertical"
      aria-valuemax={maxWidth}
      aria-valuemin={minWidth}
      aria-valuenow={width}
      className={`notebook-pane-resizer notebook-pane-resizer--${side}`}
      data-testid={`notebook-${side}-resizer`}
      role="separator"
      tabIndex={0}
      title={`Resize ${side}; double-click to reset`}
      onDoubleClick={() => onResize(defaultWidth)}
      onKeyDown={handleKeyDown}
      onPointerDown={beginResize}
    >
      <span aria-hidden="true" />
    </div>
  );
}
