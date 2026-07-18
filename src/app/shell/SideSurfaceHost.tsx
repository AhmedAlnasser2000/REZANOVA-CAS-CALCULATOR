import {
  type CSSProperties,
  type ReactNode,
  type TransitionEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

type SideSurfacePresentation = 'outboard' | 'overlay';
type SideSurfaceMotionPhase = 'entering' | 'entered' | 'exiting' | 'unmounted';
type RetainedSurface = {
  name: string;
  presentation: SideSurfacePresentation;
  motionEnabled: boolean;
};

const EXIT_FALLBACK_MS = 260;
const MOTION_SURFACE_SELECTOR = [
  '.settings-panel--outboard',
  '.settings-panel--overlay',
  '.history-panel--outboard',
  '.history-panel--overlay',
  '.variables-panel--outboard',
  '.variables-panel--overlay',
  '.left-inspector-panel--outboard',
  '.left-inspector-panel--overlay',
].join(', ');

type SideSurfaceHostProps = {
  sideSurface: string;
  side: 'left' | 'right';
  hostStyle: CSSProperties;
  outboardOpen: boolean;
  overlayOpen: boolean;
  onClose: () => void;
  renderSurface: (surface: string, presentation: SideSurfacePresentation) => ReactNode;
};

function SideSurfaceHost({
  sideSurface,
  side,
  hostStyle,
  outboardOpen,
  overlayOpen,
  onClose,
  renderSurface,
}: SideSurfaceHostProps) {
  const isOpen = outboardOpen || overlayOpen;
  const requestedPresentation: SideSurfacePresentation = outboardOpen ? 'outboard' : 'overlay';
  const activeMotionEnabled = sideSurface !== 'ooeDiagnostics';
  const activeSurface: RetainedSurface | null = isOpen
    ? {
      name: sideSurface,
      presentation: requestedPresentation,
      motionEnabled: activeMotionEnabled,
    }
    : null;
  const exitTimerRef = useRef<number | null>(null);
  const phaseRef = useRef<SideSurfaceMotionPhase>('unmounted');
  const [retainedSurface, setRetainedSurface] = useState<RetainedSurface | null>(null);
  const [mounted, setMounted] = useState(false);
  const [motionPhase, setMotionPhase] = useState<SideSurfaceMotionPhase>('unmounted');
  const visibleSurface = activeSurface ?? retainedSurface;
  const motionEnabled = isOpen
    ? activeMotionEnabled
    : retainedSurface?.motionEnabled ?? false;

  const setPhase = useCallback((nextPhase: SideSurfaceMotionPhase) => {
    phaseRef.current = nextPhase;
    setMotionPhase(nextPhase);
  }, []);

  const clearExitTimer = useCallback(() => {
    if (exitTimerRef.current !== null) {
      window.clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
  }, []);

  const finishExit = useCallback(() => {
    if (phaseRef.current !== 'exiting') return;
    clearExitTimer();
    setMounted(false);
    setPhase('unmounted');
  }, [clearExitTimer, setPhase]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const frame = requestAnimationFrame(() => {
      setRetainedSurface({
        name: sideSurface,
        presentation: requestedPresentation,
        motionEnabled: activeMotionEnabled,
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [activeMotionEnabled, isOpen, requestedPresentation, sideSurface]);

  useEffect(() => {
    clearExitTimer();

    if (!motionEnabled) {
      return undefined;
    }

    if (isOpen) {
      let enteredFrame: number | null = null;
      const frame = requestAnimationFrame(() => {
        setMounted(true);
        setPhase('entering');
        enteredFrame = requestAnimationFrame(() => setPhase('entered'));
      });
      return () => {
        cancelAnimationFrame(frame);
        if (enteredFrame !== null) cancelAnimationFrame(enteredFrame);
      };
    }

    if (phaseRef.current === 'unmounted') {
      return undefined;
    }

    const frame = requestAnimationFrame(() => {
      setPhase('exiting');
      exitTimerRef.current = window.setTimeout(finishExit, EXIT_FALLBACK_MS);
    });
    return () => {
      cancelAnimationFrame(frame);
      clearExitTimer();
    };
  }, [clearExitTimer, finishExit, isOpen, motionEnabled, setPhase]);

  useEffect(() => clearExitTimer, [clearExitTimer]);

  if (!(motionEnabled ? mounted : isOpen) || !visibleSurface) return null;

  const visiblePresentation = visibleSurface.presentation;
  const isExiting = motionEnabled && motionPhase === 'exiting';

  function handleTransitionEnd(event: TransitionEvent<HTMLDivElement>) {
    if (
      !isExiting
      || event.propertyName !== 'transform'
      || !(event.target instanceof HTMLElement)
      || !event.target.matches(MOTION_SURFACE_SELECTOR)
    ) {
      return;
    }

    finishExit();
  }

  return (
    <>
      {visiblePresentation === 'overlay' ? (
        <button
          type="button"
          className="side-surface-overlay-backdrop"
          data-testid="side-surface-overlay-backdrop"
          data-motion-enabled={motionEnabled ? 'true' : 'false'}
          data-motion-phase={motionEnabled ? motionPhase : 'entered'}
          aria-label="Close side panel"
          disabled={isExiting}
          onClick={onClose}
        />
      ) : null}
      <div
        className={`side-surface-host side-surface-host--${side}`}
        data-testid="side-surface-host"
        data-side-surface={visibleSurface.name}
        data-side-surface-presentation={visiblePresentation}
        data-side-surface-side={side}
        data-motion-enabled={motionEnabled ? 'true' : 'false'}
        data-motion-phase={motionEnabled ? motionPhase : 'entered'}
        aria-hidden={isExiting || undefined}
        inert={isExiting ? true : undefined}
        style={hostStyle}
        onTransitionEnd={handleTransitionEnd}
      >
        {renderSurface(visibleSurface.name, visiblePresentation)}
      </div>
    </>
  );
}

export { SideSurfaceHost };
