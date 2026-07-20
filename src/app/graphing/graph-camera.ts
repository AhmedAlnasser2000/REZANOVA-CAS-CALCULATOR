import type { GraphCameraStateV1, GraphVector3V1 } from '../../lib/graphing';

const EPSILON = 1e-9;
const add = (a: GraphVector3V1, b: GraphVector3V1): GraphVector3V1 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const subtract = (a: GraphVector3V1, b: GraphVector3V1): GraphVector3V1 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const scale = (value: GraphVector3V1, factor: number): GraphVector3V1 => ({ x: value.x * factor, y: value.y * factor, z: value.z * factor });
const length = (value: GraphVector3V1) => Math.hypot(value.x, value.y, value.z);
const normalize = (value: GraphVector3V1) => scale(value, 1 / Math.max(EPSILON, length(value)));
const cross = (a: GraphVector3V1, b: GraphVector3V1): GraphVector3V1 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});

export function orbitGraphCamera(camera: GraphCameraStateV1, dx: number, dy: number) {
  const offset = subtract(camera.position, camera.target);
  const radius = Math.max(0.05, length(offset));
  const azimuth = Math.atan2(offset.y, offset.x) - dx * 0.008;
  const polar = Math.min(Math.PI - 0.02, Math.max(0.02, Math.acos(offset.z / radius) + dy * 0.008));
  const sin = Math.sin(polar);
  return {
    ...camera,
    orientation: 'free' as const,
    up: { x: 0, y: 0, z: 1 },
    position: add(camera.target, {
      x: radius * sin * Math.cos(azimuth),
      y: radius * sin * Math.sin(azimuth),
      z: radius * Math.cos(polar),
    }),
  };
}

export function panGraphCamera(camera: GraphCameraStateV1, dx: number, dy: number, height: number) {
  const forward = normalize(subtract(camera.target, camera.position));
  const right = normalize(cross(forward, camera.up));
  const screenUp = normalize(cross(right, forward));
  const worldPerPixel = camera.projection === 'orthographic'
    ? camera.orthographicScale / Math.max(1, height)
    : length(subtract(camera.position, camera.target)) * 0.0018;
  const movement = add(scale(right, -dx * worldPerPixel), scale(screenUp, dy * worldPerPixel));
  return { ...camera, orientation: 'free' as const,
    position: add(camera.position, movement), target: add(camera.target, movement) };
}

export function zoomGraphCamera(camera: GraphCameraStateV1, delta: number, anchor: GraphVector3V1) {
  const factor = Math.min(4, Math.max(0.25, Math.exp(delta * 0.0015)));
  if (camera.projection === 'orthographic') {
    return { ...camera, orientation: 'free' as const,
      target: add(anchor, scale(subtract(camera.target, anchor), factor)),
      position: add(anchor, scale(subtract(camera.position, anchor), factor)),
      orthographicScale: Math.min(1_000_000, Math.max(0.02, camera.orthographicScale * factor)) };
  }
  return { ...camera, orientation: 'free' as const,
    target: add(anchor, scale(subtract(camera.target, anchor), factor)),
    position: add(anchor, scale(subtract(camera.position, anchor), factor)) };
}

export function snapGraphCamera(
  camera: GraphCameraStateV1,
  orientation: Exclude<GraphCameraStateV1['orientation'], 'free'>,
) {
  const distance = Math.max(1, length(subtract(camera.position, camera.target)));
  const direction = orientation === 'top' ? { x: 0, y: 0, z: 1 }
    : orientation === 'front' ? { x: 0, y: -1, z: 0 }
      : orientation === 'right' ? { x: 1, y: 0, z: 0 }
        : normalize({ x: 1, y: -1.2, z: 0.9 });
  return { ...camera, orientation,
    position: add(camera.target, scale(direction, distance)),
    up: orientation === 'top' ? { x: 0, y: 1, z: 0 } : { x: 0, y: 0, z: 1 } };
}

export function moveGraphCamera(camera: GraphCameraStateV1, key: string, accelerated: boolean) {
  const forward = normalize(subtract(camera.target, camera.position));
  const right = normalize(cross(forward, camera.up));
  const step = Math.max(0.05, length(subtract(camera.position, camera.target)) * (accelerated ? 0.12 : 0.035));
  const direction = key === 'w' ? forward : key === 's' ? scale(forward, -1)
    : key === 'a' ? scale(right, -1) : key === 'd' ? right
      : key === 'q' ? scale(camera.up, -1) : key === 'e' ? camera.up : null;
  if (!direction) return camera;
  const movement = scale(normalize(direction), step);
  return { ...camera, orientation: 'free' as const,
    position: add(camera.position, movement), target: add(camera.target, movement) };
}
