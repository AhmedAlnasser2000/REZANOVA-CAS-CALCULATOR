import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GraphPaneViewStateV1 } from '../../lib/graphing';
import { GraphThreeViewport } from './GraphThreeViewport';

const { createGraphThreeRenderer, renderer } = vi.hoisted(() => {
  const renderer = {
    capabilities: {
      rendererId: 'three-webgl', interactive: true, hitTesting: true, regionFill: true,
      polarGrid: false, contextRecovery: true, maximumVertices: 350_000,
    },
    mount: vi.fn(), resize: vi.fn(), setView: vi.fn(), setScene: vi.fn(),
    setPresentation: vi.fn(), setCamera: vi.fn(), clear: vi.fn(), dispose: vi.fn(),
    getItemCenter: vi.fn(() => ({ x: 2, y: 3, z: 0 })),
    hitTest: vi.fn(() => ({
      itemId: 'item.1', sceneRevision: 1, world: { x: 1, y: 2, z: 0 }, distancePixels: 0,
    })),
    screenToPlane: vi.fn(() => ({ x: 4, y: 5, z: 0 })),
    showPivot: vi.fn(),
    handleContextRestored: vi.fn(),
  };
  return { createGraphThreeRenderer: vi.fn(async () => renderer), renderer };
});

vi.mock('../../lib/graphing', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/graphing')>()),
  createGraphThreeRenderer,
}));

const view: GraphPaneViewStateV1 = {
  version: 1, dimension: '3d', verticalExaggeration: 1, wireframe: false,
  flythroughEnabled: false,
  camera3d: {
    version: 1, projection: 'perspective', orientation: 'isometric',
    position: { x: 8, y: -10, z: 8 }, target: { x: 0, y: 0, z: 0 },
    up: { x: 0, y: 0, z: 1 }, perspectiveFovDegrees: 45, orthographicScale: 12,
  },
};

function renderViewport(overrides: Partial<Parameters<typeof GraphThreeViewport>[0]> = {}) {
  const props: Parameters<typeof GraphThreeViewport>[0] = {
    fallback: false,
    grid: { kind: 'cartesian', major: true, minor: true, axisNumbers: true, angleLabels: false, unitCircle: false },
    onFallbackChange: vi.fn(),
    onSelectItem: vi.fn(),
    onSizeChange: vi.fn(),
    onViewChange: vi.fn(),
    presentation: { version: 2, contentRevision: 0, theme: 'technical', colorVisionMode: 'standard', items: [] },
    scene: null,
    sceneViewport: null,
    selectedItemId: 'item.1',
    view,
    viewport: { coordinateSystem: 'cartesian', xMin: -10, xMax: 10, yMin: -6, yMax: 6 },
    ...overrides,
  };
  const rendered = render(<GraphThreeViewport {...props} />);
  return { props, ...rendered };
}

describe('GraphThreeViewport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createGraphThreeRenderer.mockResolvedValue(renderer);
  });

  it('mounts on demand, forwards neutral frames, and disposes deterministically', async () => {
    const { props, unmount } = renderViewport();
    await waitFor(() => expect(renderer.mount).toHaveBeenCalled());
    await waitFor(() => expect(renderer.setCamera).toHaveBeenCalled());
    expect(renderer.setView).toHaveBeenCalled();
    expect(renderer.setScene).toHaveBeenCalledWith(null);
    expect(renderer.setPresentation).toHaveBeenCalledWith(props.presentation);
    unmount();
    expect(renderer.dispose).toHaveBeenCalledOnce();
  });

  it('persists projection, snaps, display-only effects, focus, and reset commands', async () => {
    const { props } = renderViewport();
    await waitFor(() => expect(renderer.mount).toHaveBeenCalled());
    fireEvent.change(screen.getByRole('combobox', { name: '3D projection' }), { target: { value: 'orthographic' } });
    expect(props.onViewChange).toHaveBeenCalledWith(expect.objectContaining({
      camera3d: expect.objectContaining({ projection: 'orthographic' }),
    }));
    fireEvent.click(screen.getByRole('button', { name: 'Top' }));
    expect(screen.getByTestId('graph-three-viewport')).toHaveAttribute('data-camera-orientation', 'top');
    fireEvent.change(screen.getByRole('combobox', { name: 'Vertical exaggeration' }), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Wireframe' }));
    expect(props.onViewChange).toHaveBeenCalledWith({ verticalExaggeration: 2 });
    expect(props.onViewChange).toHaveBeenCalledWith({ wireframe: true });
    fireEvent.keyDown(screen.getByTestId('graph-three-viewport'), { key: 'f' });
    expect(renderer.getItemCenter).toHaveBeenCalledWith('item.1');
    expect(renderer.showPivot).toHaveBeenCalledWith({ x: 2, y: 3, z: 0 });
    fireEvent.keyDown(screen.getByTestId('graph-three-viewport'), { key: 'Home' });
    expect(screen.getByTestId('graph-three-viewport')).toHaveAttribute('data-camera-orientation', 'isometric');
  });

  it('implements middle-pan, Alt orbit/zoom, pointer zoom, selection, and flythrough', async () => {
    const { props } = renderViewport({ view: { ...view, flythroughEnabled: true } });
    const host = await screen.findByTestId('graph-three-viewport');
    Object.defineProperty(host, 'setPointerCapture', { configurable: true, value: vi.fn() });
    const initial = host.dataset.cameraPosition;
    fireEvent.pointerDown(host, { button: 1, pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(host, { pointerId: 1, clientX: 120, clientY: 112 });
    fireEvent.pointerUp(host, { pointerId: 1, clientX: 120, clientY: 112 });
    expect(host.dataset.cameraPosition).not.toBe(initial);
    fireEvent.pointerDown(host, { altKey: true, button: 0, pointerId: 2, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(host, { altKey: true, pointerId: 2, clientX: 130, clientY: 80 });
    fireEvent.pointerUp(host, { pointerId: 2, clientX: 130, clientY: 80 });
    fireEvent.pointerDown(host, { altKey: true, button: 2, pointerId: 3, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(host, { altKey: true, pointerId: 3, clientX: 100, clientY: 120 });
    fireEvent.pointerUp(host, { pointerId: 3, clientX: 100, clientY: 120 });
    fireEvent.wheel(host, { clientX: 200, clientY: 160, deltaY: -120 });
    expect(renderer.screenToPlane).toHaveBeenCalled();
    fireEvent.pointerDown(host, { button: 0, pointerId: 4, clientX: 50, clientY: 50 });
    fireEvent.pointerUp(host, { pointerId: 4, clientX: 50, clientY: 50 });
    expect(props.onSelectItem).toHaveBeenCalledWith('item.1');
    fireEvent.pointerDown(host, { button: 2, pointerId: 5, clientX: 50, clientY: 50 });
    fireEvent.keyDown(host, { key: 'w', shiftKey: true });
    fireEvent.pointerUp(host, { pointerId: 5, clientX: 50, clientY: 50 });
    expect(props.onViewChange).toHaveBeenCalledWith(expect.objectContaining({ camera3d: expect.any(Object) }));
  });

  it('reports adapter unavailability without mutating document state', async () => {
    createGraphThreeRenderer.mockRejectedValueOnce(new Error('missing WebGL2'));
    const { props } = renderViewport();
    await waitFor(() => expect(props.onFallbackChange).toHaveBeenCalledWith('unavailable'));
    expect(props.onViewChange).not.toHaveBeenCalled();
  });
});
