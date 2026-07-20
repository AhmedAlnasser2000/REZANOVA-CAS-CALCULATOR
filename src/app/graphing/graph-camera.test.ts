import { describe, expect, it } from 'vitest';
import type { GraphCameraStateV1 } from '../../lib/graphing';
import {
  moveGraphCamera,
  orbitGraphCamera,
  panGraphCamera,
  snapGraphCamera,
  zoomGraphCamera,
} from './graph-camera';

const camera: GraphCameraStateV1 = {
  version: 1,
  projection: 'perspective',
  orientation: 'isometric',
  position: { x: 8, y: -10, z: 8 },
  target: { x: 0, y: 0, z: 0 },
  up: { x: 0, y: 0, z: 1 },
  perspectiveFovDegrees: 45,
  orthographicScale: 12,
};

const distance = (a: typeof camera.position, b: typeof camera.position) => (
  Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)
);

describe('Unity-compatible Graph camera math', () => {
  it('orbits around the pivot without changing radius', () => {
    const next = orbitGraphCamera(camera, 28, -17);
    expect(next.orientation).toBe('free');
    expect(distance(next.position, next.target)).toBeCloseTo(distance(camera.position, camera.target), 8);
    expect(next.target).toEqual(camera.target);
  });

  it('pans position and pivot by the same world-space displacement', () => {
    const next = panGraphCamera(camera, 40, -22, 600);
    expect(next.position.x - camera.position.x).toBeCloseTo(next.target.x - camera.target.x, 8);
    expect(next.position.y - camera.position.y).toBeCloseTo(next.target.y - camera.target.y, 8);
    expect(next.position.z - camera.position.z).toBeCloseTo(next.target.z - camera.target.z, 8);
  });

  it('zooms toward the pointer anchor and clamps orthographic scale', () => {
    const anchor = { x: 4, y: -2, z: 0 };
    const perspective = zoomGraphCamera(camera, -240, anchor);
    expect(distance(perspective.position, anchor)).toBeLessThan(distance(camera.position, anchor));
    const orthographic = zoomGraphCamera({ ...camera, projection: 'orthographic', orthographicScale: 0.021 }, -1000, anchor);
    expect(orthographic.orthographicScale).toBe(0.02);
  });

  it('snaps to canonical views while retaining the active pivot', () => {
    const moved = { ...camera, target: { x: 3, y: 4, z: 5 } };
    for (const orientation of ['top', 'front', 'right', 'isometric'] as const) {
      const next = snapGraphCamera(moved, orientation);
      expect(next.orientation).toBe(orientation);
      expect(next.target).toEqual(moved.target);
    }
    expect(snapGraphCamera(moved, 'top').up).toEqual({ x: 0, y: 1, z: 0 });
  });

  it('flies with WASD/QE and accelerates with Shift', () => {
    const regular = moveGraphCamera(camera, 'w', false);
    const accelerated = moveGraphCamera(camera, 'w', true);
    expect(distance(accelerated.position, camera.position)).toBeGreaterThan(distance(regular.position, camera.position));
    expect(moveGraphCamera(camera, 'x', false)).toBe(camera);
  });
});
