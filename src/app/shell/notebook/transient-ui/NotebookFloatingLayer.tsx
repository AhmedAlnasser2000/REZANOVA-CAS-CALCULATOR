import {
  useCallback,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

const VIEWPORT_GUTTER = 8;
const TRIGGER_GAP = 8;
const INHERITED_COLOR_PROPERTIES = [
  '--notebook-accent-soft',
  '--notebook-border',
  '--notebook-border-strong',
  '--page-accent',
  '--page-ink',
  '--page-muted',
  '--page-subtle',
] as const;

function triggerForLayer(id: string) {
  const triggers = [...document.querySelectorAll<HTMLElement>('[data-notebook-transient-trigger]')]
    .filter((element) => element.dataset.notebookTransientTrigger === id);
  return triggers.find((element) => element.getAttribute('aria-expanded') === 'true')
    ?? triggers.find((element) => element === document.activeElement || element.contains(document.activeElement))
    ?? triggers.at(-1)
    ?? null;
}

function copyInheritedColors(layer: HTMLElement, trigger: HTMLElement) {
  const computed = getComputedStyle(trigger);
  INHERITED_COLOR_PROPERTIES.forEach((property) => {
    layer.style.setProperty(property, computed.getPropertyValue(property));
  });
}

export function NotebookFloatingLayer({
  align = 'start',
  children,
  className,
  layerId,
  style,
  ...attributes
}: {
  align?: 'end' | 'start';
  children: ReactNode;
  layerId: string;
} & Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'style'> & { style?: CSSProperties }) {
  const layerRef = useRef<HTMLDivElement | null>(null);

  const place = useCallback(() => {
    const layer = layerRef.current;
    const trigger = triggerForLayer(layerId);
    if (!layer || !trigger) return;

    const triggerBounds = trigger.getBoundingClientRect();
    const layerBounds = layer.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    const viewportHeight = document.documentElement.clientHeight || window.innerHeight;
    const belowSpace = viewportHeight - triggerBounds.bottom - TRIGGER_GAP - VIEWPORT_GUTTER;
    const aboveSpace = triggerBounds.top - TRIGGER_GAP - VIEWPORT_GUTTER;
    const placement = belowSpace >= layerBounds.height || belowSpace >= aboveSpace ? 'below' : 'above';
    const availableHeight = Math.max(80, placement === 'below' ? belowSpace : aboveSpace);
    const measuredHeight = Math.min(layerBounds.height, availableHeight);
    const desiredLeft = align === 'end'
      ? triggerBounds.right - layerBounds.width
      : triggerBounds.left;
    const maximumLeft = Math.max(VIEWPORT_GUTTER, viewportWidth - layerBounds.width - VIEWPORT_GUTTER);
    const left = Math.max(VIEWPORT_GUTTER, Math.min(desiredLeft, maximumLeft));
    const top = placement === 'below'
      ? triggerBounds.bottom + TRIGGER_GAP
      : Math.max(VIEWPORT_GUTTER, triggerBounds.top - TRIGGER_GAP - measuredHeight);

    copyInheritedColors(layer, trigger);
    layer.dataset.notebookFloatingPlacement = placement;
    layer.style.left = `${left}px`;
    layer.style.maxHeight = `${availableHeight}px`;
    layer.style.top = `${top}px`;
    layer.style.visibility = 'visible';
  }, [align, layerId]);

  useLayoutEffect(() => {
    place();
    const layer = layerRef.current;
    const trigger = triggerForLayer(layerId);
    const observer = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(place);
    if (layer) observer?.observe(layer);
    if (trigger) observer?.observe(trigger);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    window.visualViewport?.addEventListener('resize', place);
    window.visualViewport?.addEventListener('scroll', place);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      window.visualViewport?.removeEventListener('resize', place);
      window.visualViewport?.removeEventListener('scroll', place);
    };
  }, [layerId, place]);

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div
      {...attributes}
      ref={layerRef}
      data-notebook-floating-placement="below"
      data-notebook-transient-layer={layerId}
      className={`notebook-floating-layer${className ? ` ${className}` : ''}`}
      style={{
        ...style,
        left: -10_000,
        maxHeight: 10_000,
        top: 0,
        visibility: 'hidden',
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
