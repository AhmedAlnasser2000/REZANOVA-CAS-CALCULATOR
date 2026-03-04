import type {
  ArcSectorState,
  CircleState,
  ConeState,
  CubeState,
  CuboidState,
  CylinderState,
  DistanceState,
  GeometryScreen,
  LineEquationState,
  MidpointState,
  RectangleState,
  SlopeState,
  SphereState,
  SquareState,
  TriangleAreaState,
  TriangleHeronState,
} from '../../types/calculator';
import { buildGeometryStructuredDraft } from './serializer';

export const DEFAULT_TRIANGLE_AREA_STATE: TriangleAreaState = {
  base: '10',
  height: '6',
};

export const DEFAULT_TRIANGLE_HERON_STATE: TriangleHeronState = {
  a: '5',
  b: '6',
  c: '7',
};

export const DEFAULT_RECTANGLE_STATE: RectangleState = {
  width: '8',
  height: '5',
};

export const DEFAULT_SQUARE_STATE: SquareState = {
  side: '4',
};

export const DEFAULT_CIRCLE_STATE: CircleState = {
  radius: '3',
};

export const DEFAULT_ARC_SECTOR_STATE: ArcSectorState = {
  radius: '4',
  angle: '60',
  angleUnit: 'deg',
};

export const DEFAULT_CUBE_STATE: CubeState = {
  side: '3',
};

export const DEFAULT_CUBOID_STATE: CuboidState = {
  length: '4',
  width: '5',
  height: '6',
};

export const DEFAULT_CYLINDER_STATE: CylinderState = {
  radius: '3',
  height: '8',
};

export const DEFAULT_CONE_STATE: ConeState = {
  radius: '3',
  height: '4',
  slantHeight: '5',
};

export const DEFAULT_SPHERE_STATE: SphereState = {
  radius: '5',
};

export const DEFAULT_DISTANCE_STATE: DistanceState = {
  p1: { x: '0', y: '0' },
  p2: { x: '3', y: '4' },
};

export const DEFAULT_MIDPOINT_STATE: MidpointState = {
  p1: { x: '1', y: '2' },
  p2: { x: '5', y: '8' },
};

export const DEFAULT_SLOPE_STATE: SlopeState = {
  p1: { x: '1', y: '2' },
  p2: { x: '4', y: '8' },
};

export const DEFAULT_LINE_EQUATION_STATE: LineEquationState = {
  p1: { x: '1', y: '2' },
  p2: { x: '3', y: '6' },
  form: 'slope-intercept',
};

export const GEOMETRY_LINE_FORM_LABELS: Record<LineEquationState['form'], string> = {
  'slope-intercept': 'Slope-Intercept',
  'point-slope': 'Point-Slope',
  standard: 'Standard',
};

export function buildGeometryInputLatex(
  screen: GeometryScreen,
  state: {
    triangleArea: TriangleAreaState;
    triangleHeron: TriangleHeronState;
    rectangle: RectangleState;
    square: SquareState;
    circle: CircleState;
    arcSector: ArcSectorState;
    cube: CubeState;
    cuboid: CuboidState;
    cylinder: CylinderState;
    cone: ConeState;
    sphere: SphereState;
    distance: DistanceState;
    midpoint: MidpointState;
    slope: SlopeState;
    lineEquation: LineEquationState;
  },
) {
  return buildGeometryStructuredDraft(screen, state);
}
