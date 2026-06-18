import { buildGeometryInputLatex } from '../../lib/geometry/examples';
import { isGeometryMenuScreen } from '../../lib/geometry/navigation';
import type { RunGeometryRuntimeRequest } from '../../lib/geometry/runtime-request';
import type { GeometrySurfaceState } from './workspace-surface-state';
import type {
  WorkspaceInstance,
  WorkspaceInstanceStateSlot,
} from './workspace-instances';

function isGeometrySurfaceState(
  value: WorkspaceInstanceStateSlot,
): value is GeometrySurfaceState {
  return typeof value === 'object'
    && value !== null
    && typeof (value as GeometrySurfaceState).geometryScreen === 'string';
}

export function geometryRequestFromSurfaceState(
  surfaceState: WorkspaceInstanceStateSlot,
  instance: WorkspaceInstance,
) {
  if (
    instance.workspaceKind !== 'geometry'
    || !isGeometrySurfaceState(surfaceState)
    || isGeometryMenuScreen(surfaceState.geometryScreen)
  ) {
    return null;
  }

  const snapshot = {
    triangleArea: surfaceState.triangleAreaState,
    triangleHeron: surfaceState.triangleHeronState,
    rectangle: surfaceState.rectangleState,
    square: surfaceState.squareState,
    circle: surfaceState.circleState,
    arcSector: surfaceState.arcSectorState,
    cube: surfaceState.cubeState,
    cuboid: surfaceState.cuboidState,
    cylinder: surfaceState.cylinderState,
    cone: surfaceState.coneState,
    sphere: surfaceState.sphereState,
    distance: surfaceState.distanceState,
    midpoint: surfaceState.midpointState,
    slope: surfaceState.slopeState,
    lineEquation: surfaceState.lineEquationState,
  };
  const inputLatex =
    surfaceState.geometryDraftState.rawLatex.trim()
    || buildGeometryInputLatex(surfaceState.geometryScreen, snapshot).trim();

  return inputLatex
    ? ({
        inputLatex,
        screenHint: surfaceState.geometryScreen,
      } satisfies RunGeometryRuntimeRequest)
    : null;
}
