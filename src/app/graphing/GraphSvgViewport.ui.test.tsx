import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { GraphViewportV1, SampledSceneRuntime } from '../../lib/graphing';
import { GraphSvgViewport } from './GraphSvgViewport';

const viewport: GraphViewportV1 = {
  coordinateSystem: 'cartesian',
  xMin: -10,
  xMax: 10,
  yMin: -6,
  yMax: 6,
};

const scene: SampledSceneRuntime = {
  sceneRevision: 4,
  documentRevision: 2,
  viewportRevision: 1,
  parameterRevision: 0,
  paths: [{
    pathId: 'explicit-x.path',
    itemId: 'explicit-x',
    coordinates: new Float64Array([0, 0, 1, 1, 4, 2]),
    segmentOffsets: new Uint32Array([0]),
    parameterValues: new Float64Array([0, 1, 2]),
    closed: false,
    style: {
      version: 1,
      colorToken: 'graph-blue',
      stroke: 'solid',
      strokeWidth: 'normal',
      fillOpacity: 0,
      label: 'auto',
    },
  }],
  regions: [],
  pointBatches: [{
    pointBatchId: 'points.batch',
    itemId: 'points',
    coordinates: new Float64Array([1, 2, 3, 4]),
    style: {
      version: 1,
      colorToken: 'graph-green',
      stroke: 'solid',
      strokeWidth: 'normal',
      fillOpacity: 0,
      label: 'auto',
    },
  }],
  labels: [],
  grid: { kind: 'none', majorLines: [], minorLines: [], labels: [], hysteresisKey: 'none' },
};

describe('GraphSvgViewport', () => {
  it('renders region triangles beneath relation-correct boundary styling', () => {
    const implicitScene: SampledSceneRuntime = {
      ...scene,
      paths: [{
        ...scene.paths[0]!,
        pathId: 'disk.boundary',
        itemId: 'disk',
        style: { ...scene.paths[0]!.style, stroke: 'dashed' },
      }],
      regions: [{
        regionId: 'disk.region',
        itemId: 'disk',
        vertices: new Float64Array([-1, -1, 1, -1, 0, 1]),
        triangleIndices: new Uint32Array([0, 1, 2]),
        boundaryPathIds: ['disk.boundary'],
        style: { ...scene.paths[0]!.style, colorToken: 'graph-green', fillOpacity: 0.22 },
      }],
      pointBatches: [],
    };
    render(
      <GraphSvgViewport
        itemRoutes={{}}
        onSizeChange={vi.fn()}
        onViewportChange={vi.fn()}
        pending={false}
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
      fireEvent.wheel(host, { clientX: 200, clientY: 160, deltaY: -120 });
      vi.advanceTimersByTime(40);
      fireEvent.wheel(host, { clientX: 200, clientY: 160, deltaY: -120 });
      vi.advanceTimersByTime(79);
    });
    expect(onViewportChange).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1));
    expect(onViewportChange).toHaveBeenCalledTimes(1);
    expect(host).not.toHaveAttribute('data-interacting');
    vi.useRealTimers();
  });

  it('hit-tests points and provides keyboard trace stepping without viewport commits', () => {
    const onViewportChange = vi.fn();
    render(
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
    expect(onViewportChange).not.toHaveBeenCalled();

    fireEvent.keyDown(host, { key: 'ArrowRight' });
    expect(screen.getByRole('status')).toHaveTextContent('(3, 4)');
    fireEvent.keyDown(host, { key: 'Escape' });
    expect(document.querySelector('.graph-trace-callout')).not.toBeVisible();
    fireEvent.keyDown(host, { key: 'Enter' });
    expect(screen.getByRole('status')).toHaveTextContent('(1, 2)');
  });
});
