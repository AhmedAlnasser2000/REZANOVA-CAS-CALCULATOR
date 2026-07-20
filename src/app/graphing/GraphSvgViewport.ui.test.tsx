import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { GraphViewportV1, SampledSceneRuntimeV2 } from '../../lib/graphing';
import { GraphSvgViewport } from './GraphSvgViewport';

const viewport: GraphViewportV1 = {
  coordinateSystem: 'cartesian',
  xMin: -10,
  xMax: 10,
  yMin: -6,
  yMax: 6,
};

const scene: SampledSceneRuntimeV2 = {
  sceneRevision: 4,
  mathematicsRevision: 2,
  viewportRevision: 1,
  parameterRevision: 0,
  paths: [{
    pathId: 'explicit-x.path',
    itemId: 'explicit-x',
    coordinates: new Float64Array([0, 0, 1, 1, 4, 2]),
    segmentOffsets: new Uint32Array([0]),
    parameterValues: new Float64Array([0, 1, 2]),
    closed: false,
  }],
  regions: [],
  pointBatches: [{
    pointBatchId: 'points.batch',
    itemId: 'points',
    coordinates: new Float64Array([1, 2, 3, 4]),
  }],
  labels: [],
};

describe('GraphSvgViewport', () => {
  it('renders region triangles beneath relation-correct boundary styling', () => {
    const implicitScene: SampledSceneRuntimeV2 = {
      ...scene,
      paths: [{
        ...scene.paths[0]!,
        pathId: 'disk.boundary',
        itemId: 'disk',
        strokeRole: 'strict-boundary',
      }],
      regions: [{
        regionId: 'disk.region',
        itemId: 'disk',
        vertices: new Float64Array([-1, -1, 1, -1, 0, 1]),
        triangleIndices: new Uint32Array([0, 1, 2]),
        boundaryPathIds: ['disk.boundary'],
      }],
      pointBatches: [],
    };
    render(
      <GraphSvgViewport
        itemRoutes={{}}
        onSizeChange={vi.fn()}
        onViewportChange={vi.fn()}
        pending={false}
        presentation={{ version: 1, contentRevision: 1, items: [{
          itemId: 'disk', presentation: { version: 1, colorToken: 'graph-green', stroke: 'solid',
            strokeWidth: 'normal', fillOpacity: 0.22, label: 'auto' },
        }] }}
        scene={implicitScene}
        viewport={viewport}
      />,
    );

    const region = document.querySelector<SVGPathElement>('[data-region-id="disk.region"]');
    const boundary = document.querySelector<SVGPathElement>('[data-path-id="disk.boundary"]');
    expect(region).toHaveAttribute('fill', '#59dd88');
    expect(region).toHaveAttribute('fill-opacity', '0.22');
    expect(boundary).toHaveAttribute('stroke-dasharray', '8 6');
    expect(region?.closest('g')?.nextElementSibling).toHaveClass('graph-svg-paths');
  });

  it('keeps pointer movement imperative and commits the viewport only on release', () => {
    const onViewportChange = vi.fn();
    render(
      <GraphSvgViewport
        itemRoutes={{}}
        onSizeChange={vi.fn()}
        onViewportChange={onViewportChange}
        pending={false}
        scene={scene}
        viewport={viewport}
      />,
    );

    const host = screen.getByTestId('graph-viewport');
    const path = document.querySelector('[data-path-id="explicit-x.path"]');
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
    expect(document.querySelector('[data-path-id="explicit-x.path"]')).toBe(path);

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

  it('coalesces a realistic wheel burst into one settled viewport commit', () => {
    vi.useFakeTimers();
    const onViewportChange = vi.fn();
    render(
      <GraphSvgViewport
        itemRoutes={{}}
        onSizeChange={vi.fn()}
        onViewportChange={onViewportChange}
        pending={false}
        scene={null}
        viewport={viewport}
      />,
    );

    const host = screen.getByTestId('graph-viewport');
    act(() => {
      for (let index = 0; index < 12; index += 1) {
        fireEvent.wheel(host, { clientX: 200, clientY: 160, deltaY: -24 });
        if (index < 11) vi.advanceTimersByTime(95);
      }
      vi.advanceTimersByTime(179);
    });
    expect(onViewportChange).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1));
    expect(onViewportChange).toHaveBeenCalledTimes(1);
    expect(host).not.toHaveAttribute('data-interacting');
    vi.useRealTimers();
  });

  it('requires click acquisition and hides tracing while geometry is stale', async () => {
    const { rerender } = render(
      <GraphSvgViewport
        itemRoutes={{ 'explicit-x': 'explicit-x', points: 'point-set' }}
        onSizeChange={vi.fn()}
        onViewportChange={vi.fn()}
        pending={false}
        scene={scene}
        viewport={viewport}
      />,
    );
    const host = screen.getByTestId('graph-viewport');
    Object.defineProperty(host, 'setPointerCapture', { configurable: true, value: vi.fn() });
    fireEvent.pointerMove(host, { clientX: 528, clientY: 200, pointerId: 4 });
    expect(document.querySelector('.graph-trace-callout')).not.toBeVisible();
    fireEvent.pointerDown(host, { button: 0, clientX: 548, clientY: 200, pointerId: 4 });
    fireEvent.pointerUp(host, { clientX: 548, clientY: 200, pointerId: 4 });
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('(1, 2)'));
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Trace point (1, 2)');
    rerender(
      <GraphSvgViewport
        itemRoutes={{ 'explicit-x': 'explicit-x', points: 'point-set' }}
        onSizeChange={vi.fn()}
        onViewportChange={vi.fn()}
        pending
        scene={scene}
        viewport={viewport}
      />,
    );
    expect(document.querySelector('.graph-trace-callout')).not.toBeVisible();
    rerender(
      <GraphSvgViewport
        itemRoutes={{ 'explicit-x': 'explicit-x', points: 'point-set' }}
        onSizeChange={vi.fn()}
        onViewportChange={vi.fn()}
        pending={false}
        scene={scene}
        viewport={viewport}
      />,
    );
    expect(document.querySelector('.graph-trace-callout')).not.toBeVisible();
  });

  it('normalizes scaled client coordinates and acquires the closest point on the visible curve', async () => {
    render(
      <GraphSvgViewport
        itemRoutes={{ 'explicit-x': 'explicit-x', points: 'point-set' }}
        onSizeChange={vi.fn()}
        onViewportChange={vi.fn()}
        pending={false}
        scene={scene}
        viewport={viewport}
      />,
    );
    const host = screen.getByTestId('graph-viewport');
    const canvas = document.querySelector<SVGSVGElement>('.graph-svg-canvas');
    if (!canvas) throw new Error('Expected the SVG reference canvas.');
    Object.defineProperty(host, 'setPointerCapture', { configurable: true, value: vi.fn() });
    Object.defineProperty(canvas, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        bottom: 830, height: 780, left: 100, right: 1_348,
        top: 50, width: 1_248, x: 100, y: 50, toJSON: () => ({}),
      }),
    });

    const closestScreen = { x: 504, y: 275 };
    const segmentLength = Math.hypot(48, -50);
    const normal = { x: 50 / segmentLength, y: 48 / segmentLength };
    const offsetScreen = {
      x: closestScreen.x + normal.x * 12,
      y: closestScreen.y + normal.y * 12,
    };
    const client = {
      x: 100 + offsetScreen.x * 1.3,
      y: 50 + offsetScreen.y * 1.3,
    };
    fireEvent.pointerDown(host, { button: 0, clientX: client.x, clientY: client.y, pointerId: 14 });
    fireEvent.pointerUp(host, { clientX: client.x, clientY: client.y, pointerId: 14 });

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('(0.5, 0.5)'));
    const marker = document.querySelector<HTMLElement>('.graph-trace-marker');
    expect(marker).toHaveAttribute('data-trace-item-id', 'explicit-x');
    expect(marker?.style.transform).toBe('translate3d(498px,269px,0)');
  });

  it('hit-tests points and preserves keyboard stepping across a scene refresh', async () => {
    const onViewportChange = vi.fn();
    const { rerender } = render(
      <GraphSvgViewport
        itemRoutes={{ 'explicit-x': 'explicit-x', points: 'point-set' }}
        onSizeChange={vi.fn()}
        onViewportChange={onViewportChange}
        pending={false}
        scene={scene}
        viewport={viewport}
      />,
    );

    const host = screen.getByTestId('graph-viewport');
    Object.defineProperty(host, 'setPointerCapture', {
      configurable: true,
      value: vi.fn(),
    });
    fireEvent.pointerDown(host, { button: 0, clientX: 528, clientY: 200, pointerId: 9 });
    fireEvent.pointerUp(host, { clientX: 528, clientY: 200, pointerId: 9 });
    expect(screen.getByRole('status')).toHaveTextContent('(1, 2)');
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Trace point (1, 2)');
    expect(onViewportChange).not.toHaveBeenCalled();

    fireEvent.keyDown(host, { key: 'ArrowRight' });
    expect(screen.getByRole('status')).toHaveTextContent('(3, 4)');
    rerender(
      <GraphSvgViewport
        itemRoutes={{ 'explicit-x': 'explicit-x', points: 'point-set' }}
        onSizeChange={vi.fn()}
        onViewportChange={onViewportChange}
        pending={false}
        scene={{ ...scene }}
        viewport={viewport}
      />,
    );
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('(3, 4)'));
    fireEvent.keyDown(host, { key: 'Escape' });
    expect(document.querySelector('.graph-trace-callout')).not.toBeVisible();
    fireEvent.keyDown(host, { key: 'Enter' });
    expect(screen.getByRole('status')).toHaveTextContent('(1, 2)');
  });

  it('uses the wider touch target to lock a nearby point without changing drag behavior', () => {
    render(
      <GraphSvgViewport
        itemRoutes={{ 'explicit-x': 'explicit-x', points: 'point-set' }}
        onSizeChange={vi.fn()}
        onViewportChange={vi.fn()}
        pending={false}
        scene={scene}
        viewport={viewport}
      />,
    );
    const host = screen.getByTestId('graph-viewport');
    Object.defineProperty(host, 'setPointerCapture', { configurable: true, value: vi.fn() });
    const touchEvent = (name: 'pointerdown' | 'pointerup') => {
      const event = new MouseEvent(name, { bubbles: true, button: 0, clientX: 553, clientY: 200 });
      Object.defineProperties(event, {
        pointerId: { value: 12 },
        pointerType: { value: 'touch' },
      });
      fireEvent(host, event);
    };
    touchEvent('pointerdown');
    touchEvent('pointerup');
    expect(screen.getByRole('status')).toHaveTextContent('(1, 2)');
  });
});
