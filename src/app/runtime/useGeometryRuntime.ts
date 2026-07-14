import {
  useRef,
  useState,
  type RefObject,
} from 'react';
import type { MathfieldElement } from 'mathlive';
import { createCoreDraftState, isCoreDraftEditable } from '../../lib/modes/core-mode';
import { trimHarmlessTrailingMathSpacing } from '../../lib/input/input-canonicalization';
import {
  buildGeometryInputLatex,
  DEFAULT_ARC_SECTOR_STATE,
  DEFAULT_CIRCLE_STATE,
  DEFAULT_CONE_STATE,
  DEFAULT_CUBE_STATE,
  DEFAULT_CUBOID_STATE,
  DEFAULT_CYLINDER_STATE,
  DEFAULT_DISTANCE_STATE,
  DEFAULT_LINE_EQUATION_STATE,
  DEFAULT_MIDPOINT_STATE,
  DEFAULT_RECTANGLE_STATE,
  DEFAULT_SLOPE_STATE,
  DEFAULT_SPHERE_STATE,
  DEFAULT_SQUARE_STATE,
  DEFAULT_TRIANGLE_AREA_STATE,
  DEFAULT_TRIANGLE_HERON_STATE,
  GEOMETRY_LINE_FORM_LABELS,
} from '../../lib/geometry/examples';
import {
  getGeometryMenuEntries,
  getGeometryMenuEntryAtIndex,
  getGeometryMenuFooterText,
  getGeometryParentScreen,
  getGeometryRouteMeta,
  isGeometryCoreEditableScreen,
  isGeometryMenuScreen,
  moveGeometryMenuIndex,
} from '../../lib/geometry/navigation';
import {
  geometryDraftStyle,
  geometryRequestToScreen,
  parseGeometryDraft,
  buildGeometryOoeInputRevisionId,
  serializeGeometryRequest,
  type RunGeometryRuntimeRequest,
} from '../../lib/geometry/runtime-request';
import type {
  ArcSectorState,
  CircleState,
  ConeState,
  CoreDraftState,
  CuboidState,
  CylinderState,
  CanonicalRuntimeOutcome,
  DistanceState,
  GeometryScreen,
  HistoryEntry,
  LineEquationState,
  MidpointState,
  ModeId,
  RectangleState,
  SlopeState,
  SphereState,
  SquareState,
  TriangleAreaState,
  TriangleHeronState,
} from '../../types/calculator';
import type { GuideExample } from '../../types/calculator';
import type { PendingHistoryTicketReservation } from '../../lib/ooe/job-launch/launch-tickets';
import type { WorkspaceInstanceRuntimeContext } from '../../types/calculator/workspace-instance-types';
import { geometryRequestFromSurfaceState } from './geometry-origin-request';
import { launchWorkspaceRuntimeJob } from './launchWorkspaceRuntimeJob';
import { createCanonicalRuntimeError } from '../../lib/result-contract';
import type { GeometrySurfaceState } from './workspace-surface-state';
import type { WorkspaceInstance } from './workspace-instances';

type CommitGeometryOutcome = (
  outcome: CanonicalRuntimeOutcome,
  inputLatex: string,
  mode: 'geometry',
  context?: Partial<Pick<HistoryEntry, 'geometryScreen' | 'geometrySeed'>> & {
    historyTicketId?: string | null;
    historyLaunchOrder?: number;
    suppressDisplayCommit?: boolean;
  },
) => void;

type UseGeometryRuntimeOptions = {
  activeFieldRef: RefObject<MathfieldElement | null>;
  commitOutcome: CommitGeometryOutcome;
  currentMode: ModeId;
  currentModeRef: RefObject<ModeId>;
  discardHistoryTicket: (ticketId?: string | null) => void;
  getActiveWorkspaceInstanceRuntimeContext?: () => WorkspaceInstanceRuntimeContext | null;
  getWorkspaceInstances?: () => readonly WorkspaceInstance[];
  isLauncherOpen: boolean;
  openLauncher: () => void;
  reserveHistoryTicket: (input: {
    mode: ModeId;
    inputLatex: string;
    capabilityId?: string;
    inputRevisionId?: string;
    workspaceInstance?: WorkspaceInstanceRuntimeContext | null;
  }) => PendingHistoryTicketReservation | null;
  setClipboardNotice: (notice: string | null) => void;
  setDisplayOutcome: (outcome: CanonicalRuntimeOutcome | null) => void;
  setRuntimeStatusOverride: (status: string | null) => void;
  startTransition: (callback: () => void) => void;
};

type GeometryMenuScreen =
  'home' | 'shapes2dHome' | 'shapes3dHome' | 'triangleHome' | 'circleHome' | 'coordinateHome';

function copyGeometryMenuSelection(selection: Record<GeometryMenuScreen, number>) {
  return {
    home: selection.home,
    shapes2dHome: selection.shapes2dHome,
    shapes3dHome: selection.shapes3dHome,
    triangleHome: selection.triangleHome,
    circleHome: selection.circleHome,
    coordinateHome: selection.coordinateHome,
  };
}

function copyCoreDraftState(state: CoreDraftState): CoreDraftState {
  return { ...state };
}

function copyPointState<TState extends { p1: { x: string; y: string }; p2: { x: string; y: string } }>(
  state: TState,
): TState {
  return {
    ...state,
    p1: { ...state.p1 },
    p2: { ...state.p2 },
  };
}

function copyGeometrySurfaceState(state: GeometrySurfaceState): GeometrySurfaceState {
  return {
    ...state,
    geometryMenuSelection: copyGeometryMenuSelection(state.geometryMenuSelection),
    triangleAreaState: { ...state.triangleAreaState },
    triangleHeronState: { ...state.triangleHeronState },
    rectangleState: { ...state.rectangleState },
    squareState: { ...state.squareState },
    circleState: { ...state.circleState },
    arcSectorState: { ...state.arcSectorState },
    cubeState: { ...state.cubeState },
    cuboidState: { ...state.cuboidState },
    cylinderState: { ...state.cylinderState },
    coneState: { ...state.coneState },
    sphereState: { ...state.sphereState },
    distanceState: copyPointState(state.distanceState),
    midpointState: copyPointState(state.midpointState),
    slopeState: copyPointState(state.slopeState),
    lineEquationState: copyPointState(state.lineEquationState),
    geometryDraftState: copyCoreDraftState(state.geometryDraftState),
  };
}

export function useGeometryRuntime({
  activeFieldRef,
  commitOutcome,
  currentMode,
  currentModeRef,
  discardHistoryTicket,
  getActiveWorkspaceInstanceRuntimeContext,
  getWorkspaceInstances,
  isLauncherOpen,
  openLauncher,
  reserveHistoryTicket,
  setClipboardNotice,
  setDisplayOutcome,
  setRuntimeStatusOverride,
  startTransition,
}: UseGeometryRuntimeOptions) {
  const [geometryScreen, setGeometryScreen] = useState<GeometryScreen>('home');
  const [geometryMenuSelection, setGeometryMenuSelection] = useState({
    home: 0,
    shapes2dHome: 0,
    shapes3dHome: 0,
    triangleHome: 0,
    circleHome: 0,
    coordinateHome: 0,
  });
  const [triangleAreaState, setTriangleAreaState] =
    useState<TriangleAreaState>(DEFAULT_TRIANGLE_AREA_STATE);
  const [triangleHeronState, setTriangleHeronState] =
    useState<TriangleHeronState>(DEFAULT_TRIANGLE_HERON_STATE);
  const [rectangleState, setRectangleState] =
    useState<RectangleState>(DEFAULT_RECTANGLE_STATE);
  const [squareState, setSquareState] =
    useState<SquareState>(DEFAULT_SQUARE_STATE);
  const [circleState, setCircleState] =
    useState<CircleState>(DEFAULT_CIRCLE_STATE);
  const [arcSectorState, setArcSectorState] =
    useState<ArcSectorState>(DEFAULT_ARC_SECTOR_STATE);
  const [cubeState, setCubeState] = useState(DEFAULT_CUBE_STATE);
  const [cuboidState, setCuboidState] =
    useState<CuboidState>(DEFAULT_CUBOID_STATE);
  const [cylinderState, setCylinderState] =
    useState<CylinderState>(DEFAULT_CYLINDER_STATE);
  const [coneState, setConeState] = useState<ConeState>(DEFAULT_CONE_STATE);
  const [sphereState, setSphereState] =
    useState<SphereState>(DEFAULT_SPHERE_STATE);
  const [distanceState, setDistanceState] =
    useState<DistanceState>(DEFAULT_DISTANCE_STATE);
  const [midpointState, setMidpointState] =
    useState<MidpointState>(DEFAULT_MIDPOINT_STATE);
  const [slopeState, setSlopeState] =
    useState<SlopeState>(DEFAULT_SLOPE_STATE);
  const [lineEquationState, setLineEquationState] =
    useState<LineEquationState>(DEFAULT_LINE_EQUATION_STATE);
  const [geometryDraftState, setGeometryDraftState] = useState<CoreDraftState>(() =>
    createCoreDraftState('', 'structured', 'guided', true),
  );
  const geometryMenuPanelRef = useRef<HTMLDivElement | null>(null);
  const geometryDraftFieldRef = useRef<MathfieldElement | null>(null);
  const squareSideRef = useRef<HTMLInputElement | null>(null);
  const rectangleWidthRef = useRef<HTMLInputElement | null>(null);
  const triangleAreaBaseRef = useRef<HTMLInputElement | null>(null);
  const triangleHeronARef = useRef<HTMLInputElement | null>(null);
  const circleRadiusRef = useRef<HTMLInputElement | null>(null);
  const arcSectorRadiusRef = useRef<HTMLInputElement | null>(null);
  const cubeSideRef = useRef<HTMLInputElement | null>(null);
  const cuboidLengthRef = useRef<HTMLInputElement | null>(null);
  const cylinderRadiusRef = useRef<HTMLInputElement | null>(null);
  const coneRadiusRef = useRef<HTMLInputElement | null>(null);
  const sphereRadiusRef = useRef<HTMLInputElement | null>(null);
  const distanceP1XRef = useRef<HTMLInputElement | null>(null);
  const midpointP1XRef = useRef<HTMLInputElement | null>(null);
  const slopeP1XRef = useRef<HTMLInputElement | null>(null);
  const lineEquationP1XRef = useRef<HTMLInputElement | null>(null);

  const geometryRouteMeta = currentMode === 'geometry'
    ? getGeometryRouteMeta(geometryScreen)
    : null;
  const isGeometryMenuOpen =
    !isLauncherOpen && currentMode === 'geometry' && isGeometryMenuScreen(geometryScreen);
  const geometryMenuEntries = isGeometryMenuOpen
    ? getGeometryMenuEntries(geometryScreen)
    : [];
  const currentGeometryMenuIndex = isGeometryMenuOpen
    ? geometryMenuSelection[geometryScreen as keyof typeof geometryMenuSelection]
    : 0;
  const selectedGeometryMenuEntry = isGeometryMenuOpen
    ? getGeometryMenuEntryAtIndex(geometryScreen, currentGeometryMenuIndex)
    : undefined;
  const geometryMenuFooterText = currentMode === 'geometry'
    ? getGeometryMenuFooterText(geometryScreen)
    : '';
  const geometryStateSnapshot = {
    triangleArea: triangleAreaState,
    triangleHeron: triangleHeronState,
    rectangle: rectangleState,
    square: squareState,
    circle: circleState,
    arcSector: arcSectorState,
    cube: cubeState,
    cuboid: cuboidState,
    cylinder: cylinderState,
    cone: coneState,
    sphere: sphereState,
    distance: distanceState,
    midpoint: midpointState,
    slope: slopeState,
    lineEquation: lineEquationState,
  };
  const geometryWorkbenchExpression =
    currentMode === 'geometry'
      ? buildGeometryInputLatex(geometryScreen, geometryStateSnapshot)
      : '';
  const geometryDraftLatex =
    currentMode === 'geometry'
      ? geometryDraftState.rawLatex
      : '';
  const geometryEditorIsEditable =
    currentMode === 'geometry'
    && geometryRouteMeta?.editorMode === 'editable'
    && isCoreDraftEditable(geometryDraftState);

  function geometryDraftStateForScreen(
    _screen: GeometryScreen,
    rawLatex: string,
    source: CoreDraftState['source'],
  ) {
    return createCoreDraftState(rawLatex, geometryDraftStyle(rawLatex), source, true);
  }

  function defaultGeometryDraftForScreen(screen: GeometryScreen) {
    return buildGeometryInputLatex(screen, {
      triangleArea: DEFAULT_TRIANGLE_AREA_STATE,
      triangleHeron: DEFAULT_TRIANGLE_HERON_STATE,
      rectangle: DEFAULT_RECTANGLE_STATE,
      square: DEFAULT_SQUARE_STATE,
      circle: DEFAULT_CIRCLE_STATE,
      arcSector: DEFAULT_ARC_SECTOR_STATE,
      cube: DEFAULT_CUBE_STATE,
      cuboid: DEFAULT_CUBOID_STATE,
      cylinder: DEFAULT_CYLINDER_STATE,
      cone: DEFAULT_CONE_STATE,
      sphere: DEFAULT_SPHERE_STATE,
      distance: DEFAULT_DISTANCE_STATE,
      midpoint: DEFAULT_MIDPOINT_STATE,
      slope: DEFAULT_SLOPE_STATE,
      lineEquation: DEFAULT_LINE_EQUATION_STATE,
    });
  }

  function buildGeometryDraftForScreen(screen: GeometryScreen) {
    return buildGeometryInputLatex(screen, geometryStateSnapshot);
  }

  function updateGeometryDraft(
    rawLatex: string,
    source: CoreDraftState['source'],
    executable = true,
  ) {
    setGeometryDraftState({
      rawLatex,
      style: geometryDraftStyle(rawLatex),
      source,
      executable,
    });
  }

  function focusGeometryEditor() {
    geometryDraftFieldRef.current?.focus?.();
    activeFieldRef.current = geometryDraftFieldRef.current;
  }

  function loadGeometryDraft(
    rawLatex: string,
    source: CoreDraftState['source'] = 'guided',
    executable = true,
  ) {
    updateGeometryDraft(rawLatex, source, executable);
    if (executable) {
      setTimeout(() => {
        focusGeometryEditor();
      }, 0);
    }
  }

  function geometryDraftSourceForScreen(screen: GeometryScreen): CoreDraftState['source'] {
    return isGeometryMenuScreen(screen) ? 'manual' : 'guided';
  }

  function geometrySolveMissingTemplates(screen: GeometryScreen) {
    switch (screen) {
      case 'square':
        return [
          { label: 's from area', latex: 'square(side=?, area=25)' },
          { label: 's from perimeter', latex: 'square(side=?, perimeter=20)' },
        ];
      case 'rectangle':
        return [
          { label: 'w from area', latex: 'rectangle(width=?, height=5, area=40)' },
          { label: 'h from diagonal', latex: 'rectangle(width=6, height=?, diagonal=10)' },
        ];
      case 'circle':
        return [
          { label: 'r from circumference', latex: 'circle(radius=?, circumference=10*pi)' },
          { label: 'r from area', latex: 'circle(radius=?, area=49*pi)' },
        ];
      case 'triangleArea':
        return [
          { label: 'base from area', latex: 'triangleArea(base=?, height=6, area=30)' },
          { label: 'height from area', latex: 'triangleArea(base=10, height=?, area=30)' },
        ];
      case 'cube':
        return [
          { label: 'side from volume', latex: 'cube(side=?, volume=64)' },
          { label: 'side from SA', latex: 'cube(side=?, surfaceArea=54)' },
        ];
      case 'sphere':
        return [
          { label: 'r from SA', latex: 'sphere(radius=?, surfaceArea=36*pi)' },
          { label: 'r from volume', latex: 'sphere(radius=?, volume=36*pi)' },
        ];
      case 'cylinder':
        return [
          { label: 'r from volume', latex: 'cylinder(radius=?, height=8, volume=72*pi)' },
          { label: 'h from volume', latex: 'cylinder(radius=3, height=?, volume=72*pi)' },
        ];
      case 'cone':
        return [
          { label: 'r from volume', latex: 'cone(radius=?, height=4, volume=12*pi)' },
          { label: 'h from slant', latex: 'cone(radius=3, height=?, slantHeight=5)' },
          { label: 'l from r,h', latex: 'cone(radius=3, height=4, slantHeight=?)' },
        ];
      case 'cuboid':
        return [
          { label: 'l from volume', latex: 'cuboid(length=?, width=3, height=4, volume=144)' },
          { label: 'h from diagonal', latex: 'cuboid(length=3, width=4, height=?, diagonal=13)' },
        ];
      case 'arcSector':
        return [
          { label: 'r from arc', latex: 'arcSector(radius=?, angle=60, unit=deg, arc=2*pi)' },
          { label: 'angle from sector', latex: 'arcSector(radius=6, angle=?, unit=deg, sector=6*pi)' },
        ];
      case 'triangleHeron':
        return [{ label: 'a from area', latex: 'triangleHeron(a=?, b=13, c=14, area=84)' }];
      case 'distance':
        return [{ label: 'solve point', latex: 'distance(p1=(0,0), p2=(3,?), distance=5)' }];
      case 'midpoint':
        return [{ label: 'solve point', latex: 'midpoint(p1=(1,2), p2=(?,8), mid=(3,5))' }];
      case 'slope':
        return [{ label: 'solve point', latex: 'slope(p1=(1,2), p2=(?,8), slope=2)' }];
      case 'lineEquation':
        return [
          { label: 'point from slope', latex: 'lineEquation(p1=(0,0), p2=(?,8), slope=2)' },
          { label: 'point from distance', latex: 'lineEquation(p1=(0,0), p2=(3,?), distance=5)' },
          { label: 'point from midpoint', latex: 'lineEquation(p1=(1,2), p2=(?,8), mid=(3,5))' },
        ];
      default:
        return [];
    }
  }

  function loadGeometrySolveMissingTemplate(rawLatex: string) {
    loadGeometryDraft(rawLatex, 'guided', true);
    setClipboardNotice('Geometry solve-missing template loaded');
  }

  function isGeometryDraftFocused(target?: EventTarget | null) {
    if (!geometryEditorIsEditable || !geometryDraftFieldRef.current) {
      return false;
    }
    return target ? target === geometryDraftFieldRef.current : activeFieldRef.current === geometryDraftFieldRef.current;
  }

  function readLiveGeometryInputLatex(screenHint: GeometryScreen, editorFocused: boolean) {
    if (!editorFocused && geometryRouteMeta?.focusTarget === 'guidedForm') {
      return buildGeometryDraftForScreen(screenHint).trim();
    }

    let inputLatex = geometryDraftState.rawLatex.trim();
    if (currentModeRef.current === 'geometry' && geometryEditorIsEditable) {
      const liveField = geometryDraftFieldRef.current
        ?? (document.querySelector('[data-testid="main-editor"]') as MathfieldElement | null);
      const fieldLatex = liveField?.getValue?.('latex');
      if (typeof fieldLatex === 'string') {
        inputLatex = trimHarmlessTrailingMathSpacing(fieldLatex).trim();
      }
    }

    return inputLatex;
  }

  function readLiveGeometryRuntimeRequest() {
    if (currentModeRef.current !== 'geometry') {
      return null;
    }
    if (isGeometryMenuOpen && !isGeometryDraftFocused()) {
      return null;
    }

    const inputLatex = readLiveGeometryInputLatex(geometryScreen, isGeometryDraftFocused());
    return inputLatex
      ? ({ inputLatex, screenHint: geometryScreen } satisfies RunGeometryRuntimeRequest)
      : null;
  }

  function openGeometryScreen(screen: GeometryScreen) {
    setGeometryScreen(screen);
    if (!isGeometryMenuScreen(screen)) {
      setGeometryDraftState(
        geometryDraftStateForScreen(
          screen,
          buildGeometryDraftForScreen(screen),
          geometryDraftSourceForScreen(screen),
        ),
      );
    }
    setDisplayOutcome(null);
  }

  function setCurrentGeometryMenuIndex(screen: GeometryMenuScreen, index: number) {
    setGeometryMenuSelection((currentSelection) => ({ ...currentSelection, [screen]: index }));
  }

  function moveCurrentGeometryMenuSelection(delta: number) {
    if (!isGeometryMenuOpen) {
      return;
    }
    setCurrentGeometryMenuIndex(
      geometryScreen as GeometryMenuScreen,
      moveGeometryMenuIndex(geometryScreen, currentGeometryMenuIndex, delta),
    );
  }

  function openSelectedGeometryMenuEntry() {
    if (selectedGeometryMenuEntry) {
      openGeometryScreen(selectedGeometryMenuEntry.target);
    }
  }

  function goBackInGeometry() {
    const parentScreen = getGeometryParentScreen(geometryScreen);
    if (parentScreen) {
      openGeometryScreen(parentScreen);
    } else {
      openLauncher();
    }
  }

  function setGeometryDraftFromSnapshot(
    screen: GeometryScreen,
    snapshotPatch: Partial<typeof geometryStateSnapshot>,
  ) {
    setGeometryDraftState(
      geometryDraftStateForScreen(
        screen,
        buildGeometryInputLatex(screen, { ...geometryStateSnapshot, ...snapshotPatch }),
        'guided',
      ),
    );
  }

  function applyGeometrySeed(screen: GeometryScreen, seed: GuideExample['launch']['geometrySeed']) {
    if (!seed) {
      return;
    }

    if (screen === 'triangleArea') {
      const nextState = {
        ...triangleAreaState,
        base: seed.base ?? triangleAreaState.base,
        height: seed.height ?? triangleAreaState.height,
      };
      setTriangleAreaState(nextState);
      setGeometryDraftFromSnapshot(screen, { triangleArea: nextState });
    } else if (screen === 'triangleHeron') {
      const nextState = {
        ...triangleHeronState,
        a: seed.a ?? triangleHeronState.a,
        b: seed.b ?? triangleHeronState.b,
        c: seed.c ?? triangleHeronState.c,
      };
      setTriangleHeronState(nextState);
      setGeometryDraftFromSnapshot(screen, { triangleHeron: nextState });
    } else if (screen === 'rectangle') {
      const nextState = {
        ...rectangleState,
        width: seed.width ?? rectangleState.width,
        height: seed.height ?? rectangleState.height,
      };
      setRectangleState(nextState);
      setGeometryDraftFromSnapshot(screen, { rectangle: nextState });
    } else if (screen === 'square') {
      const nextState = { ...squareState, side: seed.side ?? squareState.side };
      setSquareState(nextState);
      setGeometryDraftFromSnapshot(screen, { square: nextState });
    } else if (screen === 'circle') {
      const nextState = { ...circleState, radius: seed.radius ?? circleState.radius };
      setCircleState(nextState);
      setGeometryDraftFromSnapshot(screen, { circle: nextState });
    } else if (screen === 'arcSector') {
      const nextState = {
        ...arcSectorState,
        radius: seed.radius ?? arcSectorState.radius,
        angle: seed.angle ?? arcSectorState.angle,
        angleUnit: seed.angleUnit ?? arcSectorState.angleUnit,
      };
      setArcSectorState(nextState);
      setGeometryDraftFromSnapshot(screen, { arcSector: nextState });
    } else if (screen === 'cube') {
      const nextState = { ...cubeState, side: seed.side ?? cubeState.side };
      setCubeState(nextState);
      setGeometryDraftFromSnapshot(screen, { cube: nextState });
    } else if (screen === 'cuboid') {
      const nextState = {
        ...cuboidState,
        length: seed.length ?? cuboidState.length,
        width: seed.width ?? cuboidState.width,
        height: seed.height ?? cuboidState.height,
      };
      setCuboidState(nextState);
      setGeometryDraftFromSnapshot(screen, { cuboid: nextState });
    } else if (screen === 'cylinder') {
      const nextState = {
        ...cylinderState,
        radius: seed.radius ?? cylinderState.radius,
        height: seed.height ?? cylinderState.height,
      };
      setCylinderState(nextState);
      setGeometryDraftFromSnapshot(screen, { cylinder: nextState });
    } else if (screen === 'cone') {
      const nextState = {
        ...coneState,
        radius: seed.radius ?? coneState.radius,
        height: seed.height ?? coneState.height,
        slantHeight: seed.slantHeight ?? coneState.slantHeight,
      };
      setConeState(nextState);
      setGeometryDraftFromSnapshot(screen, { cone: nextState });
    } else if (screen === 'sphere') {
      const nextState = { ...sphereState, radius: seed.radius ?? sphereState.radius };
      setSphereState(nextState);
      setGeometryDraftFromSnapshot(screen, { sphere: nextState });
    } else if (screen === 'distance') {
      const nextState = {
        p1: { x: seed.p1?.x ?? distanceState.p1.x, y: seed.p1?.y ?? distanceState.p1.y },
        p2: { x: seed.p2?.x ?? distanceState.p2.x, y: seed.p2?.y ?? distanceState.p2.y },
      };
      setDistanceState(nextState);
      setGeometryDraftFromSnapshot(screen, { distance: nextState });
    } else if (screen === 'midpoint') {
      const nextState = {
        p1: { x: seed.p1?.x ?? midpointState.p1.x, y: seed.p1?.y ?? midpointState.p1.y },
        p2: { x: seed.p2?.x ?? midpointState.p2.x, y: seed.p2?.y ?? midpointState.p2.y },
      };
      setMidpointState(nextState);
      setGeometryDraftFromSnapshot(screen, { midpoint: nextState });
    } else if (screen === 'slope') {
      const nextState = {
        p1: { x: seed.p1?.x ?? slopeState.p1.x, y: seed.p1?.y ?? slopeState.p1.y },
        p2: { x: seed.p2?.x ?? slopeState.p2.x, y: seed.p2?.y ?? slopeState.p2.y },
      };
      setSlopeState(nextState);
      setGeometryDraftFromSnapshot(screen, { slope: nextState });
    } else if (screen === 'lineEquation') {
      const nextState = {
        p1: { x: seed.p1?.x ?? lineEquationState.p1.x, y: seed.p1?.y ?? lineEquationState.p1.y },
        p2: { x: seed.p2?.x ?? lineEquationState.p2.x, y: seed.p2?.y ?? lineEquationState.p2.y },
        form: seed.form ?? lineEquationState.form,
      };
      setLineEquationState(nextState);
      setGeometryDraftFromSnapshot(screen, { lineEquation: nextState });
    }
  }

  function loadGeometryExample(
    screen: GeometryScreen,
    latex: string,
    seed: GuideExample['launch']['geometrySeed'],
  ) {
    openGeometryScreen(screen);
    applyGeometrySeed(screen, seed);
    if (latex) {
      setGeometryDraftState({
        rawLatex: latex,
        style: geometryDraftStyle(latex),
        source: 'manual',
        executable: isGeometryCoreEditableScreen(screen),
      });
    }
  }

  function restoreGeometryHistoryEntry(entry: HistoryEntry) {
    if (entry.geometrySeed) {
      const replayLatex = serializeGeometryRequest(entry.geometrySeed.request);
      openGeometryScreen(entry.geometrySeed.screen);
      setGeometryDraftState({
        rawLatex: replayLatex,
        style: geometryDraftStyle(replayLatex),
        source: 'manual',
        executable: true,
      });
      return;
    }

    const parsed = parseGeometryDraft(entry.inputLatex, { screenHint: entry.geometryScreen });
    if (parsed.ok) {
      openGeometryScreen(geometryRequestToScreen(parsed.request));
      setGeometryDraftState({
        rawLatex: entry.inputLatex,
        style: geometryDraftStyle(entry.inputLatex),
        source: 'manual',
        executable: true,
      });
    } else if (entry.geometryScreen) {
      openGeometryScreen(entry.geometryScreen);
    } else {
      openGeometryScreen('home');
    }
  }

  function resetGeometryDraftToDefault(screen: GeometryScreen) {
    setGeometryDraftState(
      geometryDraftStateForScreen(screen, defaultGeometryDraftForScreen(screen), 'guided'),
    );
  }

  function resetCurrentGeometryScreen() {
    if (isGeometryMenuOpen) {
      goBackInGeometry();
      return;
    }

    switch (geometryScreen) {
      case 'square':
        setSquareState(DEFAULT_SQUARE_STATE);
        break;
      case 'rectangle':
        setRectangleState(DEFAULT_RECTANGLE_STATE);
        break;
      case 'triangleArea':
        setTriangleAreaState(DEFAULT_TRIANGLE_AREA_STATE);
        break;
      case 'triangleHeron':
        setTriangleHeronState(DEFAULT_TRIANGLE_HERON_STATE);
        break;
      case 'circle':
        setCircleState(DEFAULT_CIRCLE_STATE);
        break;
      case 'arcSector':
        setArcSectorState(DEFAULT_ARC_SECTOR_STATE);
        break;
      case 'cube':
        setCubeState(DEFAULT_CUBE_STATE);
        break;
      case 'cuboid':
        setCuboidState(DEFAULT_CUBOID_STATE);
        break;
      case 'cylinder':
        setCylinderState(DEFAULT_CYLINDER_STATE);
        break;
      case 'cone':
        setConeState(DEFAULT_CONE_STATE);
        break;
      case 'sphere':
        setSphereState(DEFAULT_SPHERE_STATE);
        break;
      case 'distance':
        setDistanceState(DEFAULT_DISTANCE_STATE);
        break;
      case 'midpoint':
        setMidpointState(DEFAULT_MIDPOINT_STATE);
        break;
      case 'slope':
        setSlopeState(DEFAULT_SLOPE_STATE);
        break;
      case 'lineEquation':
        setLineEquationState(DEFAULT_LINE_EQUATION_STATE);
        break;
      default:
        return;
    }
    resetGeometryDraftToDefault(geometryScreen);
  }

  function resetGeometryRuntime() {
    setGeometryScreen('home');
    setGeometryMenuSelection({
      home: 0,
      shapes2dHome: 0,
      shapes3dHome: 0,
      triangleHome: 0,
      circleHome: 0,
      coordinateHome: 0,
    });
    setTriangleAreaState(DEFAULT_TRIANGLE_AREA_STATE);
    setTriangleHeronState(DEFAULT_TRIANGLE_HERON_STATE);
    setRectangleState(DEFAULT_RECTANGLE_STATE);
    setSquareState(DEFAULT_SQUARE_STATE);
    setCircleState(DEFAULT_CIRCLE_STATE);
    setArcSectorState(DEFAULT_ARC_SECTOR_STATE);
    setCubeState(DEFAULT_CUBE_STATE);
    setCuboidState(DEFAULT_CUBOID_STATE);
    setCylinderState(DEFAULT_CYLINDER_STATE);
    setConeState(DEFAULT_CONE_STATE);
    setSphereState(DEFAULT_SPHERE_STATE);
    setDistanceState(DEFAULT_DISTANCE_STATE);
    setMidpointState(DEFAULT_MIDPOINT_STATE);
    setSlopeState(DEFAULT_SLOPE_STATE);
    setLineEquationState(DEFAULT_LINE_EQUATION_STATE);
    setGeometryDraftState(createCoreDraftState('', 'structured', 'guided', true));
  }

  function captureGeometrySurfaceState(): GeometrySurfaceState {
    return copyGeometrySurfaceState({
      geometryScreen, geometryMenuSelection, triangleAreaState, triangleHeronState,
      rectangleState, squareState, circleState, arcSectorState, cubeState,
      cuboidState, cylinderState, coneState, sphereState, distanceState,
      midpointState, slopeState, lineEquationState, geometryDraftState,
    });
  }

  function restoreGeometrySurfaceState(state: GeometrySurfaceState | null) {
    if (!state) {
      resetGeometryRuntime();
      return;
    }

    const copy = copyGeometrySurfaceState(state);
    setGeometryScreen(copy.geometryScreen);
    setGeometryMenuSelection(copy.geometryMenuSelection);
    setTriangleAreaState(copy.triangleAreaState);
    setTriangleHeronState(copy.triangleHeronState);
    setRectangleState(copy.rectangleState);
    setSquareState(copy.squareState);
    setCircleState(copy.circleState);
    setArcSectorState(copy.arcSectorState);
    setCubeState(copy.cubeState);
    setCuboidState(copy.cuboidState);
    setCylinderState(copy.cylinderState);
    setConeState(copy.coneState);
    setSphereState(copy.sphereState);
    setDistanceState(copy.distanceState);
    setMidpointState(copy.midpointState);
    setSlopeState(copy.slopeState);
    setLineEquationState(copy.lineEquationState);
    setGeometryDraftState(copy.geometryDraftState);
  }

  function runGeometryAction() {
    const editorFocused = isGeometryDraftFocused();
    if (isGeometryMenuOpen && !editorFocused) {
      return;
    }

    startTransition(() => {
      const inputLatex = readLiveGeometryInputLatex(geometryScreen, editorFocused);
      if (!inputLatex) {
        setDisplayOutcome(createCanonicalRuntimeError(
          geometryRouteMeta?.label ?? 'Geometry',
          'Enter a Geometry request or use a guided tool before evaluating.',
        ));
        return;
      }

      if (!editorFocused || geometryDraftState.rawLatex.trim() !== inputLatex) {
        setGeometryDraftState(geometryDraftStateForScreen(geometryScreen, inputLatex, 'guided'));
      }

      const request: RunGeometryRuntimeRequest = { inputLatex, screenHint: geometryScreen };
      launchWorkspaceRuntimeJob({
        mode: 'geometry',
        modeLabel: 'Geometry',
        capabilityId: 'geometry.evaluate',
        request,
        ticketInputLatex: inputLatex,
        buildInputRevisionId: buildGeometryOoeInputRevisionId,
        readLiveRequest: readLiveGeometryRuntimeRequest,
        getActiveWorkspaceInstanceRuntimeContext,
        getWorkspaceInstances,
        readRequestFromSurfaceState: geometryRequestFromSurfaceState,
        isModeVisible: () => currentModeRef.current === 'geometry',
        loadRunner: async () =>
          (await import('../../lib/modes/geometry')).runGeometryModeWithOoePilot,
        reserveHistoryTicket,
        discardHistoryTicket,
        setDisplayOutcome,
        setRuntimeStatusOverride,
        commit: (payload, ticket, visible) => {
          commitOutcome(payload.outcome, inputLatex, 'geometry', {
            geometryScreen: payload.replayScreen,
            ...(payload.replaySeed ? { geometrySeed: payload.replaySeed } : {}),
            historyTicketId: ticket?.id,
            historyLaunchOrder: ticket?.historyLaunchOrder,
            suppressDisplayCommit: !visible,
          });
        },
      });
    });
  }

  return {
    applyGeometrySeed, arcSectorRadiusRef, arcSectorState,
    buildGeometryDraftForScreen, circleRadiusRef, circleState,
    captureGeometrySurfaceState, coneRadiusRef, coneState, cubeSideRef, cubeState,
    cuboidLengthRef, cuboidState, currentGeometryMenuIndex,
    cylinderRadiusRef, cylinderState, distanceP1XRef, distanceState,
    focusGeometryEditor, geometryDraftFieldRef, geometryDraftLatex,
    geometryDraftState, geometryEditorIsEditable, geometryMenuEntries,
    geometryMenuFooterText, geometryMenuPanelRef, geometryMenuSelection,
    geometryRouteMeta, geometryScreen, geometrySolveMissingTemplates,
    geometryStateSnapshot, geometryWorkbenchExpression, goBackInGeometry,
    isGeometryDraftFocused, isGeometryMenuOpen, lineEquationP1XRef,
    lineEquationState, lineFormLabels: Object.entries(GEOMETRY_LINE_FORM_LABELS) as Array<[LineEquationState['form'], string]>,
    loadGeometryDraft, loadGeometryExample, loadGeometrySolveMissingTemplate,
    midpointP1XRef, midpointState, moveCurrentGeometryMenuSelection,
    openGeometryScreen, openSelectedGeometryMenuEntry, rectangleState,
    rectangleWidthRef, resetCurrentGeometryScreen, resetGeometryRuntime,
    restoreGeometryHistoryEntry, restoreGeometrySurfaceState, runGeometryAction, selectedGeometryMenuEntry,
    setArcSectorState, setCircleState, setConeState, setCubeState,
    setCuboidState, setCylinderState, setCurrentGeometryMenuIndex,
    setDistanceState, setGeometryDraftState, setGeometryMenuSelection,
    setGeometryScreen, setLineEquationState, setMidpointState,
    setRectangleState, setSlopeState, setSphereState, setSquareState,
    setTriangleAreaState, setTriangleHeronState, slopeP1XRef, slopeState,
    sphereRadiusRef, sphereState, squareSideRef, squareState,
    triangleAreaBaseRef, triangleAreaState, triangleHeronARef,
    triangleHeronState, updateGeometryDraft,
  };
}
