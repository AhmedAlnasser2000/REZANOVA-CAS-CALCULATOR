import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SideSurfaceHost } from './SideSurfaceHost';

type HostProps = {
  sideSurface: string;
  outboardOpen: boolean;
  overlayOpen: boolean;
  side?: 'left' | 'right';
};

function renderHost({
  sideSurface,
  outboardOpen,
  overlayOpen,
  side = 'right',
}: HostProps) {
  return render(
    <SideSurfaceHost
      sideSurface={sideSurface}
      side={side}
      hostStyle={{}}
      outboardOpen={outboardOpen}
      overlayOpen={overlayOpen}
      onClose={vi.fn()}
      renderSurface={(surface, presentation) => (
        <aside
          className={`${surface}-panel--${presentation}`}
          data-testid="motion-test-surface"
        >
          {surface}
        </aside>
      )}
    />,
  );
}

function settleEnterMotion() {
  act(() => {
    vi.runOnlyPendingTimers();
    vi.runOnlyPendingTimers();
  });
}

function startExitMotion() {
  act(() => {
    vi.runOnlyPendingTimers();
  });
}

describe('SideSurfaceHost motion presence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps a supported panel mounted through its exit transition', () => {
    const { rerender } = renderHost({
      sideSurface: 'settings',
      outboardOpen: true,
      overlayOpen: false,
    });

    settleEnterMotion();
    expect(screen.getByTestId('side-surface-host')).toHaveAttribute('data-motion-phase', 'entered');

    rerender(
      <SideSurfaceHost
        sideSurface="none"
        side="right"
        hostStyle={{}}
        outboardOpen={false}
        overlayOpen={false}
        onClose={vi.fn()}
        renderSurface={(surface, presentation) => (
          <aside className={`${surface}-panel--${presentation}`} data-testid="motion-test-surface">
            {surface}
          </aside>
        )}
      />,
    );

    startExitMotion();
    const host = screen.getByTestId('side-surface-host');
    expect(host).toHaveAttribute('data-motion-phase', 'exiting');
    expect(screen.getByTestId('motion-test-surface')).toHaveTextContent('settings');

    fireEvent.transitionEnd(screen.getByTestId('motion-test-surface'), { propertyName: 'transform' });
    expect(screen.queryByTestId('side-surface-host')).not.toBeInTheDocument();
  });

  it('cancels a pending exit when a supported panel reopens', () => {
    const { rerender } = renderHost({
      sideSurface: 'history',
      outboardOpen: true,
      overlayOpen: false,
    });
    settleEnterMotion();

    rerender(
      <SideSurfaceHost
        sideSurface="none"
        side="right"
        hostStyle={{}}
        outboardOpen={false}
        overlayOpen={false}
        onClose={vi.fn()}
        renderSurface={(surface, presentation) => (
          <aside className={`${surface}-panel--${presentation}`} data-testid="motion-test-surface">
            {surface}
          </aside>
        )}
      />,
    );
    startExitMotion();
    expect(screen.getByTestId('side-surface-host')).toHaveAttribute('data-motion-phase', 'exiting');

    rerender(
      <SideSurfaceHost
        sideSurface="history"
        side="right"
        hostStyle={{}}
        outboardOpen={true}
        overlayOpen={false}
        onClose={vi.fn()}
        renderSurface={(surface, presentation) => (
          <aside className={`history-panel--${presentation}`} data-testid="motion-test-surface">
            {surface}
          </aside>
        )}
      />,
    );
    settleEnterMotion();

    expect(screen.getByTestId('side-surface-host')).toHaveAttribute('data-motion-phase', 'entered');
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.getByTestId('motion-test-surface')).toHaveTextContent('history');
  });

  it('preserves the mounted surface while its presentation changes', () => {
    const { rerender } = renderHost({
      sideSurface: 'variables',
      outboardOpen: true,
      overlayOpen: false,
    });
    settleEnterMotion();
    const surface = screen.getByTestId('motion-test-surface');

    rerender(
      <SideSurfaceHost
        sideSurface="variables"
        side="right"
        hostStyle={{}}
        outboardOpen={false}
        overlayOpen
        onClose={vi.fn()}
        renderSurface={(surface, presentation) => (
          <aside className={`variables-panel--${presentation}`} data-testid="motion-test-surface">
            {surface}
          </aside>
        )}
      />,
    );

    expect(screen.getByTestId('motion-test-surface')).toBe(surface);
    expect(screen.getByTestId('side-surface-host')).toHaveAttribute(
      'data-side-surface-presentation',
      'overlay',
    );
    expect(screen.getByTestId('side-surface-overlay-backdrop')).toBeInTheDocument();
  });

  it('keeps OOE diagnostics on the immediate, non-motion path', () => {
    const { rerender } = renderHost({
      sideSurface: 'ooeDiagnostics',
      outboardOpen: false,
      overlayOpen: true,
    });
    startExitMotion();

    expect(screen.getByTestId('side-surface-host')).toHaveAttribute('data-motion-enabled', 'false');

    rerender(
      <SideSurfaceHost
        sideSurface="none"
        side="right"
        hostStyle={{}}
        outboardOpen={false}
        overlayOpen={false}
        onClose={vi.fn()}
        renderSurface={() => null}
      />,
    );
    startExitMotion();

    expect(screen.queryByTestId('side-surface-host')).not.toBeInTheDocument();
  });
});
