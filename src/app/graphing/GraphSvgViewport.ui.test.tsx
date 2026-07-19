import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { GraphViewportV1 } from '../../lib/graphing';
import { GraphSvgViewport } from './GraphSvgViewport';

const viewport: GraphViewportV1 = {
  coordinateSystem: 'cartesian',
  xMin: -10,
  xMax: 10,
  yMin: -6,
  yMax: 6,
};

describe('GraphSvgViewport', () => {
  it('keeps pointer movement imperative and commits the viewport only on release', () => {
    const onViewportChange = vi.fn();
    render(
      <GraphSvgViewport
        onSizeChange={vi.fn()}
        onViewportChange={onViewportChange}
        pending={false}
        scene={null}
        viewport={viewport}
      />,
    );

    const host = screen.getByTestId('graph-viewport');
    Object.defineProperty(host, 'setPointerCapture', {
      configurable: true,
      value: vi.fn(),
    });

    fireEvent.pointerDown(host, { button: 0, clientX: 100, clientY: 100, pointerId: 7 });
    for (let index = 1; index <= 20; index += 1) {
      fireEvent.pointerMove(host, {
        clientX: 100 + index * 2,
        clientY: 100 + index,
        pointerId: 7,
      });
    }

    expect(onViewportChange).not.toHaveBeenCalled();

    fireEvent.pointerUp(host, { clientX: 140, clientY: 120, pointerId: 7 });
    expect(onViewportChange).toHaveBeenCalledTimes(1);
    expect(onViewportChange).toHaveBeenCalledWith({
      coordinateSystem: 'cartesian',
      xMin: expect.any(Number),
      xMax: expect.any(Number),
      yMin: expect.any(Number),
      yMax: expect.any(Number),
    });
  });

  it('coalesces a wheel burst into one settled viewport commit', () => {
    vi.useFakeTimers();
    const onViewportChange = vi.fn();
    render(
      <GraphSvgViewport
        onSizeChange={vi.fn()}
        onViewportChange={onViewportChange}
        pending={false}
        scene={null}
        viewport={viewport}
      />,
    );

    const host = screen.getByTestId('graph-viewport');
    act(() => {
      fireEvent.wheel(host, { clientX: 200, clientY: 160, deltaY: -120 });
      vi.advanceTimersByTime(120);
      fireEvent.wheel(host, { clientX: 200, clientY: 160, deltaY: -120 });
      vi.advanceTimersByTime(179);
    });
    expect(onViewportChange).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1));
    expect(onViewportChange).toHaveBeenCalledTimes(1);
    expect(host).not.toHaveAttribute('data-interacting');
    vi.useRealTimers();
  });
});
