import type { GeometryScreen } from '../../types/calculator';
import type { SoftAction } from '../menu';

type GeometryMenuEntry = {
  id: string;
  label: string;
  description: string;
  hotkey: string;
  target: GeometryScreen;
};

export type GeometryRouteMeta = {
  screen: GeometryScreen;
  label: string;
  breadcrumb: string[];
  description: string;
  helpText: string;
  guideArticleId?: string;
  focusTarget: 'menu' | 'guidedForm' | 'editor';
  editorMode: 'editable' | 'preview';
};

const HOME_ENTRIES: GeometryMenuEntry[] = [
  { id: 'shapes2d', label: '2D Shapes', description: 'Square and rectangle area, perimeter, and diagonal tools', hotkey: '1', target: 'shapes2dHome' },
  { id: 'shapes3d', label: '3D Solids', description: 'Cube, cuboid, cylinder, cone, and sphere calculators', hotkey: '2', target: 'shapes3dHome' },
  { id: 'triangles', label: 'Triangles', description: 'Triangle area and Heron-formula workflows', hotkey: '3', target: 'triangleHome' },
  { id: 'circles', label: 'Circles', description: 'Circle and arc-sector tools', hotkey: '4', target: 'circleHome' },
  { id: 'coordinate', label: 'Coordinate Geometry', description: 'Distance, midpoint, slope, and line-equation workbenches', hotkey: '5', target: 'coordinateHome' },
];

const SHAPES_2D_ENTRIES: GeometryMenuEntry[] = [
  { id: 'square', label: 'Square', description: 'Area, perimeter, and diagonal from one side', hotkey: '1', target: 'square' },
  { id: 'rectangle', label: 'Rectangle', description: 'Area, perimeter, and diagonal from width and height', hotkey: '2', target: 'rectangle' },
];

const SHAPES_3D_ENTRIES: GeometryMenuEntry[] = [
  { id: 'cube', label: 'Cube', description: 'Volume, surface area, and space diagonal', hotkey: '1', target: 'cube' },
  { id: 'cuboid', label: 'Cuboid', description: 'Volume, surface area, and space diagonal', hotkey: '2', target: 'cuboid' },
  { id: 'cylinder', label: 'Cylinder', description: 'Volume and curved / total surface area', hotkey: '3', target: 'cylinder' },
  { id: 'cone', label: 'Cone', description: 'Volume and total surface area from radius, height, and slant height', hotkey: '4', target: 'cone' },
  { id: 'sphere', label: 'Sphere', description: 'Volume and surface area from radius', hotkey: '5', target: 'sphere' },
];

const TRIANGLE_ENTRIES: GeometryMenuEntry[] = [
  { id: 'triangleArea', label: 'Triangle Area', description: 'Base-height area tool', hotkey: '1', target: 'triangleArea' },
  { id: 'triangleHeron', label: 'Heron', description: 'Three-side area from Heron\'s formula', hotkey: '2', target: 'triangleHeron' },
];

const CIRCLE_ENTRIES: GeometryMenuEntry[] = [
  { id: 'circle', label: 'Circle', description: 'Area and circumference from radius', hotkey: '1', target: 'circle' },
  { id: 'arcSector', label: 'Arc and Sector', description: 'Arc length and sector area from radius and angle', hotkey: '2', target: 'arcSector' },
];

const COORDINATE_ENTRIES: GeometryMenuEntry[] = [
  { id: 'distance', label: 'Distance', description: 'Distance between two points', hotkey: '1', target: 'distance' },
  { id: 'midpoint', label: 'Midpoint', description: 'Midpoint of two points', hotkey: '2', target: 'midpoint' },
  { id: 'slope', label: 'Slope', description: 'Slope of the line through two points', hotkey: '3', target: 'slope' },
  { id: 'lineEquation', label: 'Line Equation', description: 'Build a line in slope-intercept, point-slope, or standard form', hotkey: '4', target: 'lineEquation' },
];

const ROUTE_META: Record<GeometryScreen, GeometryRouteMeta> = {
  home: {
    screen: 'home',
    label: 'Geometry',
    breadcrumb: ['Geometry'],
    description: 'Type a Geometry request above or use a guided family below.',
    helpText: 'Use EXE/F1 or keys 1-5 to open a geometry tool family. Focus the top editor when you want to run a draft directly.',
    focusTarget: 'menu',
    editorMode: 'editable',
  },
  shapes2dHome: {
    screen: 'shapes2dHome',
    label: '2D Shapes',
    breadcrumb: ['Geometry', '2D Shapes'],
    description: 'Open a 2D shape tool below, or type a Geometry request above.',
    helpText: 'Use EXE/F1 or keys 1-2 to open a 2D shape tool. Focus the top editor when you want to run a draft directly.',
    guideArticleId: 'geometry-shapes-2d',
    focusTarget: 'menu',
    editorMode: 'editable',
  },
  shapes3dHome: {
    screen: 'shapes3dHome',
    label: '3D Solids',
    breadcrumb: ['Geometry', '3D Solids'],
    description: 'Open a 3D solid tool below, or type a Geometry request above.',
    helpText: 'Use EXE/F1 or keys 1-5 to open a solid-geometry tool. Focus the top editor when you want to run a draft directly.',
    guideArticleId: 'geometry-solids-3d',
    focusTarget: 'menu',
    editorMode: 'editable',
  },
  triangleHome: {
    screen: 'triangleHome',
    label: 'Triangles',
    breadcrumb: ['Geometry', 'Triangles'],
    description: 'Choose a triangle tool below, or type a Geometry request above.',
    helpText: 'Use EXE/F1 or keys 1-2 to open a triangle tool. Focus the top editor when you want to run a draft directly.',
    guideArticleId: 'geometry-triangles',
    focusTarget: 'menu',
    editorMode: 'editable',
  },
  circleHome: {
    screen: 'circleHome',
    label: 'Circles',
    breadcrumb: ['Geometry', 'Circles'],
    description: 'Open a circle tool below, or type a Geometry request above.',
    helpText: 'Use EXE/F1 or keys 1-2 to open a circle tool. Focus the top editor when you want to run a draft directly.',
    guideArticleId: 'geometry-circles',
    focusTarget: 'menu',
    editorMode: 'editable',
  },
  coordinateHome: {
    screen: 'coordinateHome',
    label: 'Coordinate Geometry',
    breadcrumb: ['Geometry', 'Coordinate Geometry'],
    description: 'Open a coordinate tool below, or type a Geometry request above.',
    helpText: 'Use EXE/F1 or keys 1-4 to open a coordinate-geometry tool. Focus the top editor when you want to run a draft directly.',
    guideArticleId: 'geometry-coordinate',
    focusTarget: 'menu',
    editorMode: 'editable',
  },
  triangleArea: {
    screen: 'triangleArea',
    label: 'Triangle Area',
    breadcrumb: ['Geometry', 'Triangles', 'Area'],
    description: 'Compute a triangle\'s area from base and perpendicular height.',
    helpText: 'Enter positive base and height values, then press EXE or F1. Use the top editor when you want to edit the Geometry request directly.',
    guideArticleId: 'geometry-triangles',
    focusTarget: 'guidedForm',
    editorMode: 'editable',
  },
  triangleHeron: {
    screen: 'triangleHeron',
    label: 'Heron',
    breadcrumb: ['Geometry', 'Triangles', 'Heron'],
    description: 'Compute triangle area from all three side lengths.',
    helpText: 'Enter three positive sides that satisfy the triangle inequality, then press EXE or F1. Use the top editor when you want to edit the Geometry request directly.',
    guideArticleId: 'geometry-triangles',
    focusTarget: 'guidedForm',
    editorMode: 'editable',
  },
  rectangle: {
    screen: 'rectangle',
    label: 'Rectangle',
    breadcrumb: ['Geometry', '2D Shapes', 'Rectangle'],
    description: 'Compute area, perimeter, and diagonal from width and height.',
    helpText: 'Enter positive width and height values, then press EXE or F1. Use the top editor when you want to edit the Geometry request directly.',
    guideArticleId: 'geometry-shapes-2d',
    focusTarget: 'guidedForm',
    editorMode: 'editable',
  },
  square: {
    screen: 'square',
    label: 'Square',
    breadcrumb: ['Geometry', '2D Shapes', 'Square'],
    description: 'Compute area, perimeter, and diagonal from one side.',
    helpText: 'Enter a positive side length, then press EXE or F1. Use the top editor when you want to edit the Geometry request directly.',
    guideArticleId: 'geometry-shapes-2d',
    focusTarget: 'guidedForm',
    editorMode: 'editable',
  },
  circle: {
    screen: 'circle',
    label: 'Circle',
    breadcrumb: ['Geometry', 'Circles', 'Circle'],
    description: 'Compute diameter, circumference, and area from radius.',
    helpText: 'Enter a positive radius, then press EXE or F1. Use the top editor when you want to edit the Geometry request directly.',
    guideArticleId: 'geometry-circles',
    focusTarget: 'guidedForm',
    editorMode: 'editable',
  },
  arcSector: {
    screen: 'arcSector',
    label: 'Arc and Sector',
    breadcrumb: ['Geometry', 'Circles', 'Arc and Sector'],
    description: 'Compute arc length and sector area from radius and central angle.',
    helpText: 'Enter a positive radius and angle, choose the angle unit, then press EXE or F1. Use the top editor when you want to edit the Geometry request directly.',
    guideArticleId: 'geometry-circles',
    focusTarget: 'guidedForm',
    editorMode: 'editable',
  },
  cube: {
    screen: 'cube',
    label: 'Cube',
    breadcrumb: ['Geometry', '3D Solids', 'Cube'],
    description: 'Compute volume, surface area, and space diagonal from one side.',
    helpText: 'Enter a positive side length, then press EXE or F1. Use the top editor when you want to edit the Geometry request directly.',
    guideArticleId: 'geometry-solids-3d',
    focusTarget: 'guidedForm',
    editorMode: 'editable',
  },
  cuboid: {
    screen: 'cuboid',
    label: 'Cuboid',
    breadcrumb: ['Geometry', '3D Solids', 'Cuboid'],
    description: 'Compute volume, surface area, and space diagonal from length, width, and height.',
    helpText: 'Enter positive dimensions, then press EXE or F1. Use the top editor when you want to edit the Geometry request directly.',
    guideArticleId: 'geometry-solids-3d',
    focusTarget: 'guidedForm',
    editorMode: 'editable',
  },
  cylinder: {
    screen: 'cylinder',
    label: 'Cylinder',
    breadcrumb: ['Geometry', '3D Solids', 'Cylinder'],
    description: 'Compute volume and surface areas from radius and height.',
    helpText: 'Enter a positive radius and height, then press EXE or F1. Use the top editor when you want to edit the Geometry request directly.',
    guideArticleId: 'geometry-solids-3d',
    focusTarget: 'guidedForm',
    editorMode: 'editable',
  },
  cone: {
    screen: 'cone',
    label: 'Cone',
    breadcrumb: ['Geometry', '3D Solids', 'Cone'],
    description: 'Compute cone volume and surface area from radius and one valid height/slant pair.',
    helpText: 'Enter a positive radius and either a height or slant height, then press EXE or F1. Use the top editor when you want to edit the Geometry request directly.',
    guideArticleId: 'geometry-solids-3d',
    focusTarget: 'guidedForm',
    editorMode: 'editable',
  },
  sphere: {
    screen: 'sphere',
    label: 'Sphere',
    breadcrumb: ['Geometry', '3D Solids', 'Sphere'],
    description: 'Compute sphere volume and surface area from radius.',
    helpText: 'Enter a positive radius, then press EXE or F1. Use the top editor when you want to edit the Geometry request directly.',
    guideArticleId: 'geometry-solids-3d',
    focusTarget: 'guidedForm',
    editorMode: 'editable',
  },
  distance: {
    screen: 'distance',
    label: 'Distance',
    breadcrumb: ['Geometry', 'Coordinate Geometry', 'Distance'],
    description: 'Find the distance between two points.',
    helpText: 'Enter both points, then press EXE or F1. Use the top editor when you want to edit the Geometry request directly.',
    guideArticleId: 'geometry-coordinate',
    focusTarget: 'guidedForm',
    editorMode: 'editable',
  },
  midpoint: {
    screen: 'midpoint',
    label: 'Midpoint',
    breadcrumb: ['Geometry', 'Coordinate Geometry', 'Midpoint'],
    description: 'Find the midpoint of two points.',
    helpText: 'Enter both points, then press EXE or F1. Use the top editor when you want to edit the Geometry request directly.',
    guideArticleId: 'geometry-coordinate',
    focusTarget: 'guidedForm',
    editorMode: 'editable',
  },
  slope: {
    screen: 'slope',
    label: 'Slope',
    breadcrumb: ['Geometry', 'Coordinate Geometry', 'Slope'],
    description: 'Find the slope of the line through two points.',
    helpText: 'Enter both points, then press EXE or F1. Use the top editor when you want to edit the Geometry request directly.',
    guideArticleId: 'geometry-coordinate',
    focusTarget: 'guidedForm',
    editorMode: 'editable',
  },
  lineEquation: {
    screen: 'lineEquation',
    label: 'Line Equation',
    breadcrumb: ['Geometry', 'Coordinate Geometry', 'Line Equation'],
    description: 'Build a line from two points in the selected form.',
    helpText: 'Enter two distinct points, choose the target form, then press EXE or F1. Use the top editor when you want to edit the Geometry request directly.',
    guideArticleId: 'geometry-coordinate',
    focusTarget: 'guidedForm',
    editorMode: 'editable',
  },
};

function entriesForScreen(screen: GeometryScreen) {
  switch (screen) {
    case 'home':
      return HOME_ENTRIES;
    case 'shapes2dHome':
      return SHAPES_2D_ENTRIES;
    case 'shapes3dHome':
      return SHAPES_3D_ENTRIES;
    case 'triangleHome':
      return TRIANGLE_ENTRIES;
    case 'circleHome':
      return CIRCLE_ENTRIES;
    case 'coordinateHome':
      return COORDINATE_ENTRIES;
    default:
      return [];
  }
}

export function isGeometryMenuScreen(screen: GeometryScreen) {
  return screen === 'home'
    || screen === 'shapes2dHome'
    || screen === 'shapes3dHome'
    || screen === 'triangleHome'
    || screen === 'circleHome'
    || screen === 'coordinateHome';
}

export function getGeometryMenuEntries(screen: GeometryScreen) {
  return entriesForScreen(screen);
}

export function getGeometryMenuEntryAtIndex(screen: GeometryScreen, selectedIndex: number) {
  const entries = entriesForScreen(screen);
  if (entries.length === 0) {
    return undefined;
  }
  const safeIndex = Math.min(Math.max(selectedIndex, 0), entries.length - 1);
  return entries[safeIndex];
}

export function getGeometryMenuEntryByHotkey(screen: GeometryScreen, hotkey: string) {
  return entriesForScreen(screen).find((entry) => entry.hotkey === hotkey);
}

export function moveGeometryMenuIndex(screen: GeometryScreen, currentIndex: number, delta: number) {
  const entries = entriesForScreen(screen);
  return Math.min(Math.max(currentIndex + delta, 0), Math.max(entries.length - 1, 0));
}

export function getGeometryParentScreen(screen: GeometryScreen): GeometryScreen | null {
  switch (screen) {
    case 'home':
      return null;
    case 'shapes2dHome':
    case 'shapes3dHome':
    case 'triangleHome':
    case 'circleHome':
    case 'coordinateHome':
      return 'home';
    case 'square':
    case 'rectangle':
      return 'shapes2dHome';
    case 'cube':
    case 'cuboid':
    case 'cylinder':
    case 'cone':
    case 'sphere':
      return 'shapes3dHome';
    case 'triangleArea':
    case 'triangleHeron':
      return 'triangleHome';
    case 'circle':
    case 'arcSector':
      return 'circleHome';
    case 'distance':
    case 'midpoint':
    case 'slope':
    case 'lineEquation':
      return 'coordinateHome';
    default:
      return 'home';
  }
}

export function getGeometryRouteMeta(screen: GeometryScreen) {
  return ROUTE_META[screen];
}

export function isGeometryCoreEditableScreen(screen: GeometryScreen) {
  return ROUTE_META[screen].editorMode === 'editable';
}

export function getGeometrySoftActions(screen: GeometryScreen): SoftAction[] {
  if (isGeometryMenuScreen(screen)) {
    return [
      { id: 'open', label: 'Open', hotkey: 'F1' },
      { id: 'guide', label: 'Guide', hotkey: 'F2' },
      { id: 'back', label: 'Back', hotkey: 'F5' },
      { id: 'exit', label: 'Exit', hotkey: 'F6' },
    ];
  }

  return [
    { id: 'evaluate', label: 'Evaluate', hotkey: 'F1' },
    { id: 'guide', label: 'Guide', hotkey: 'F2' },
    { id: 'menu', label: 'Menu', hotkey: 'F3' },
    { id: 'clear', label: 'Clear', hotkey: 'F5' },
    { id: 'history', label: 'History', hotkey: 'F6' },
  ];
}

export function getGeometryMenuFooterText(screen: GeometryScreen) {
  switch (screen) {
    case 'home':
      return '1-5: Open | EXE/F1: Select | F2: Guide | F5/Esc: Back | F6: Exit';
    case 'shapes2dHome':
    case 'triangleHome':
    case 'circleHome':
      return '1-2: Open | EXE/F1: Select | F5/Esc: Back | F6: Exit';
    case 'shapes3dHome':
      return '1-5: Open | EXE/F1: Select | F5/Esc: Back | F6: Exit';
    case 'coordinateHome':
      return '1-4: Open | EXE/F1: Select | F5/Esc: Back | F6: Exit';
    default:
      return '';
  }
}
