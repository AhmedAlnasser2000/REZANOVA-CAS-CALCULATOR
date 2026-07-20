import type { GraphViewportV1, SampledSceneRuntimeV2 } from '../../lib/graphing';

export function graphAutoFitViewport(scene: SampledSceneRuntimeV2 | null): GraphViewportV1 {
  if (!scene || scene.paths.length === 0) {
    return { coordinateSystem: 'cartesian', xMin: -10, xMax: 10, yMin: -6, yMax: 6 };
  }
  let xMin = Number.POSITIVE_INFINITY;
  let xMax = Number.NEGATIVE_INFINITY;
  let yMin = Number.POSITIVE_INFINITY;
  let yMax = Number.NEGATIVE_INFINITY;
  for (const path of scene.paths) {
    for (let index = 0; index + 1 < path.coordinates.length; index += 2) {
      xMin = Math.min(xMin, path.coordinates[index]);
      xMax = Math.max(xMax, path.coordinates[index]);
      yMin = Math.min(yMin, path.coordinates[index + 1]);
      yMax = Math.max(yMax, path.coordinates[index + 1]);
    }
  }
  if (![xMin, xMax, yMin, yMax].every(Number.isFinite)) {
    return { coordinateSystem: 'cartesian', xMin: -10, xMax: 10, yMin: -6, yMax: 6 };
  }
  const xPad = Math.max(1, (xMax - xMin) * 0.12);
  const yPad = Math.max(1, (yMax - yMin) * 0.12);
  return { coordinateSystem: 'cartesian', xMin: xMin - xPad, xMax: xMax + xPad, yMin: yMin - yPad, yMax: yMax + yPad };
}
