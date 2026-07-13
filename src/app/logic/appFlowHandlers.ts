/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  CalculusScreen,
  CalculateScreen,
  GeometryScreen,
  GuideExample,
  HistoryEntry,
  StatisticsRequest,
  TrigScreen,
} from '../../types/calculator';
import { mapLegacyCalculateScreenToCalculusScreen } from '../../lib/calculus/calculus-identity';
import { readHistoryResult } from '../runtime/historyDisplayEntry';
import { clearCurrentModeWithDeps } from './modeReset';

export function createAppFlowHandlers(deps: any) {
  const {
    closeLauncher,
    setHistoryOpen,
    openCalculateScreen,
    setDerivativeWorkbench,
    setDerivativePointWorkbench,
    setIntegralWorkbench,
    setLimitWorkbench,
    openCalculusScreen,
    setCalculusIndefiniteIntegral,
    setCalculusDefiniteIntegral,
    setCalculusImproperIntegral,
    setCalculusFiniteLimit,
    setCalculusInfiniteLimit,
    setMaclaurinState,
    setTaylorState,
    setPartialDerivativeState,
    setFirstOrderOdeState,
    setSecondOrderOdeState,
    setNumericIvpState,
    trigFunctionState,
    setTrigFunctionState,
    setTrigIdentityState,
    trigDraftStateForScreen,
    setTrigDraftState,
    trigIdentityState,
    trigStateSnapshot,
    buildTrigStructuredDraft,
    trigEquationState,
    setTrigEquationState,
    rightTriangleState,
    setRightTriangleState,
    sineRuleState,
    setSineRuleState,
    cosineRuleState,
    setCosineRuleState,
    angleConvertState,
    setAngleConvertState,
    setSpecialAnglesExpression,
    geometryStateSnapshot,
    buildGeometryInputLatex,
    geometryDraftStateForScreen,
    triangleAreaState,
    setTriangleAreaState,
    triangleHeronState,
    setTriangleHeronState,
    rectangleState,
    setRectangleState,
    squareState,
    setSquareState,
    circleState,
    setCircleState,
    arcSectorState,
    setArcSectorState,
    cubeState,
    setCubeState,
    cuboidState,
    setCuboidState,
    cylinderState,
    setCylinderState,
    coneState,
    setConeState,
    sphereState,
    setSphereState,
    distanceState,
    setDistanceState,
    midpointState,
    setMidpointState,
    slopeState,
    setSlopeState,
    lineEquationState,
    setLineEquationState,
    setGeometryDraftState,
    setDisplayOutcome,
    setMode,
    setClipboardNotice,
    setCalculateLatex,
    setEquationScreen,
    setEquationLatex,
    openTrigScreen,
    openStatisticsScreen,
    openGeometryScreen,
    setStatisticsDraftState,
    setLauncherState,
    inferEquationReplayTarget,
    openEquationScreen,
    setEquationNumericSolvePanel,
    setQuadraticCoefficients,
    setCubicCoefficients,
    setQuarticCoefficients,
    parseTrigDraft,
    trigRequestToScreen,
    trigDraftStyle,
    setStatsDataset,
    setStatisticsWorkingSource,
    setFrequencyTable,
    setBinomialState,
    setNormalState,
    setPoissonState,
    setRegressionState,
    setCorrelationState,
    parseStatisticsDraft,
    isStatisticsMenuScreen,
    statisticsWorkingSource,
    statisticsRequestToScreen,
    statisticsRequestToWorkingSource,
    statisticsDraftStyle,
    parseGeometryDraft,
    isGeometryCoreEditableScreen,
    geometryRequestToScreen,
    geometryDraftStyle,
    serializeGeometryRequest,
    setTablePrimaryLatex,
  } = deps;

function applyCalculateSeed(
  screen: CalculateScreen,
  seed: GuideExample['launch']['calculateSeed'],
) {
  if (!seed || screen === 'standard' || screen === 'calculusHome') {
    return;
  }

  if (screen === 'derivative') {
    setDerivativeWorkbench((currentState) => ({ ...currentState, bodyLatex: seed.bodyLatex ?? currentState.bodyLatex, variable: seed.variable ?? currentState.variable }));
    return;
  }

  if (screen === 'derivativePoint') {
    setDerivativePointWorkbench((currentState) => ({ ...currentState, bodyLatex: seed.bodyLatex ?? currentState.bodyLatex, point: seed.point ?? currentState.point, variable: seed.variable ?? currentState.variable }));
    return;
  }

  if (screen === 'integral') {
    setIntegralWorkbench((currentState) => ({
      ...currentState,
      kind: seed.kind ?? currentState.kind,
      bodyLatex: seed.bodyLatex ?? currentState.bodyLatex,
      lower: seed.lower ?? currentState.lower,
      upper: seed.upper ?? currentState.upper,
    }));
    return;
  }

  if (screen === 'limit') {
    setLimitWorkbench((currentState) => ({
      ...currentState,
      bodyLatex: seed.bodyLatex ?? currentState.bodyLatex,
      target: seed.target ?? currentState.target,
      direction: seed.direction ?? currentState.direction,
      targetKind: seed.targetKind ?? currentState.targetKind,
    }));
  }
}

function applyCalculusSeed(
  screen: CalculusScreen,
  seed: GuideExample['launch']['calculusSeed'],
) {
  if (!seed) {
    return;
  }

  if (screen === 'derivative') {
    setDerivativeWorkbench((currentState) => ({ ...currentState, bodyLatex: seed.bodyLatex ?? currentState.bodyLatex, variable: seed.variable ?? currentState.variable }));
    return;
  }

  if (screen === 'derivativePoint') {
    setDerivativePointWorkbench((currentState) => ({ ...currentState, bodyLatex: seed.bodyLatex ?? currentState.bodyLatex, point: seed.point ?? currentState.point, variable: seed.variable ?? currentState.variable }));
    return;
  }

  if (screen === 'indefiniteIntegral') {
    setCalculusIndefiniteIntegral((currentState) => ({
      ...currentState,
      bodyLatex: seed.bodyLatex ?? currentState.bodyLatex,
    }));
    return;
  }

  if (screen === 'definiteIntegral') {
    setCalculusDefiniteIntegral((currentState) => ({
      ...currentState,
      bodyLatex: seed.bodyLatex ?? currentState.bodyLatex,
      lower: seed.lower ?? currentState.lower,
      upper: seed.upper ?? currentState.upper,
    }));
    return;
  }

  if (screen === 'improperIntegral') {
    setCalculusImproperIntegral((currentState) => ({
      ...currentState,
      bodyLatex: seed.bodyLatex ?? currentState.bodyLatex,
      lowerKind: seed.lowerKind ?? currentState.lowerKind,
      lower: seed.lower ?? currentState.lower,
      upperKind: seed.upperKind ?? currentState.upperKind,
      upper: seed.upper ?? currentState.upper,
    }));
    return;
  }

  if (screen === 'finiteLimit') {
    setCalculusFiniteLimit((currentState) => ({
      ...currentState,
      bodyLatex: seed.bodyLatex ?? currentState.bodyLatex,
      target: seed.target ?? currentState.target,
      direction: seed.direction ?? currentState.direction,
    }));
    return;
  }

  if (screen === 'infiniteLimit') {
    setCalculusInfiniteLimit((currentState) => ({
      ...currentState,
      bodyLatex: seed.bodyLatex ?? currentState.bodyLatex,
      targetKind: seed.targetKind ?? currentState.targetKind,
    }));
    return;
  }

  if (screen === 'maclaurin') {
    setMaclaurinState((currentState) => ({
      ...currentState,
      bodyLatex: seed.bodyLatex ?? currentState.bodyLatex,
      order: seed.order ?? currentState.order,
    }));
    return;
  }

  if (screen === 'taylor') {
    setTaylorState((currentState) => ({
      ...currentState,
      bodyLatex: seed.bodyLatex ?? currentState.bodyLatex,
      center: seed.center ?? currentState.center,
      order: seed.order ?? currentState.order,
    }));
    return;
  }

  if (screen === 'partialDerivative') {
    setPartialDerivativeState((currentState) => ({
      ...currentState,
      bodyLatex: seed.bodyLatex ?? currentState.bodyLatex,
      variable: seed.variable ?? currentState.variable,
    }));
    return;
  }

  if (screen === 'odeFirstOrder') {
    setFirstOrderOdeState((currentState) => ({
      ...currentState,
      lhsLatex: seed.lhsLatex ?? currentState.lhsLatex,
      rhsLatex: seed.rhsLatex ?? currentState.rhsLatex,
      classification: seed.classification ?? currentState.classification,
    }));
    return;
  }

  if (screen === 'odeSecondOrder') {
    setSecondOrderOdeState((currentState) => ({
      ...currentState,
      a2: seed.a2 ?? currentState.a2,
      a1: seed.a1 ?? currentState.a1,
      a0: seed.a0 ?? currentState.a0,
      forcingLatex: seed.forcingLatex ?? currentState.forcingLatex,
    }));
    return;
  }

  if (screen === 'odeNumericIvp') {
    setNumericIvpState((currentState) => ({
      ...currentState,
      bodyLatex: seed.bodyLatex ?? currentState.bodyLatex,
      x0: seed.x0 ?? currentState.x0,
      y0: seed.y0 ?? currentState.y0,
      xEnd: seed.xEnd ?? currentState.xEnd,
      step: seed.step ?? currentState.step,
      method: seed.method ?? currentState.method,
    }));
  }
}

function openLegacyCalculateCalculusInCalculus(
  screen: CalculateScreen | null | undefined,
  seed: GuideExample['launch']['calculateSeed'],
) {
  const calculusScreen = mapLegacyCalculateScreenToCalculusScreen(screen, seed);
  if (!calculusScreen) {
    return false;
  }

  openCalculusScreen(calculusScreen);
  applyCalculusSeed(calculusScreen, seed as GuideExample['launch']['calculusSeed']);
  return true;
}

function applyTrigSeed(
  screen: TrigScreen,
  seed: GuideExample['launch']['trigSeed'],
) {
  if (!seed) {
    return;
  }

  if (screen === 'functions') {
    const nextState = {
      ...trigFunctionState,
      expressionLatex: seed.expressionLatex ?? trigFunctionState.expressionLatex,
    };
    setTrigFunctionState(nextState);
    setTrigDraftState(trigDraftStateForScreen(screen, nextState.expressionLatex, 'guided'));
    return;
  }

  if (screen === 'identitySimplify' || screen === 'identityConvert') {
    const nextState = {
      ...trigIdentityState,
      expressionLatex: seed.expressionLatex ?? trigIdentityState.expressionLatex,
      targetForm: seed.targetForm ?? trigIdentityState.targetForm,
    };
    setTrigIdentityState(nextState);
    setTrigDraftState(
      trigDraftStateForScreen(
        screen,
        screen === 'identityConvert'
          ? buildTrigStructuredDraft(screen, {
              ...trigStateSnapshot,
              trigIdentity: nextState,
            })
          : nextState.expressionLatex,
        'guided',
      ),
    );
    return;
  }

  if (screen === 'equationSolve') {
    const nextState = {
      ...trigEquationState,
      equationLatex: seed.equationLatex ?? trigEquationState.equationLatex,
      angleUnit: seed.angleUnit ?? trigEquationState.angleUnit,
    };
    setTrigEquationState(nextState);
    setTrigDraftState(trigDraftStateForScreen(screen, nextState.equationLatex, 'guided'));
    return;
  }

  if (screen === 'rightTriangle') {
    const nextState = {
      ...rightTriangleState,
      knownSideA: seed.knownSideA ?? rightTriangleState.knownSideA,
      knownSideB: seed.knownSideB ?? rightTriangleState.knownSideB,
      knownSideC: seed.knownSideC ?? rightTriangleState.knownSideC,
      knownAngleA: seed.knownAngleA ?? rightTriangleState.knownAngleA,
      knownAngleB: seed.knownAngleB ?? rightTriangleState.knownAngleB,
    };
    setRightTriangleState(nextState);
    setTrigDraftState(
      trigDraftStateForScreen(
        screen,
        buildTrigStructuredDraft(screen, {
          ...trigStateSnapshot,
          rightTriangle: nextState,
        }),
        'guided',
      ),
    );
    return;
  }

  if (screen === 'sineRule') {
    const nextState = {
      ...sineRuleState,
      sideA: seed.sideA ?? sineRuleState.sideA,
      sideB: seed.sideB ?? sineRuleState.sideB,
      sideC: seed.sideC ?? sineRuleState.sideC,
      angleA: seed.angleA ?? sineRuleState.angleA,
      angleB: seed.angleB ?? sineRuleState.angleB,
      angleC: seed.angleC ?? sineRuleState.angleC,
    };
    setSineRuleState(nextState);
    setTrigDraftState(
      trigDraftStateForScreen(
        screen,
        buildTrigStructuredDraft(screen, {
          ...trigStateSnapshot,
          sineRule: nextState,
        }),
        'guided',
      ),
    );
    return;
  }

  if (screen === 'cosineRule') {
    const nextState = {
      ...cosineRuleState,
      sideA: seed.sideA ?? cosineRuleState.sideA,
      sideB: seed.sideB ?? cosineRuleState.sideB,
      sideC: seed.sideC ?? cosineRuleState.sideC,
      angleA: seed.angleA ?? cosineRuleState.angleA,
      angleB: seed.angleB ?? cosineRuleState.angleB,
      angleC: seed.angleC ?? cosineRuleState.angleC,
    };
    setCosineRuleState(nextState);
    setTrigDraftState(
      trigDraftStateForScreen(
        screen,
        buildTrigStructuredDraft(screen, {
          ...trigStateSnapshot,
          cosineRule: nextState,
        }),
        'guided',
      ),
    );
    return;
  }

  if (screen === 'angleConvert') {
    const nextState = {
      ...angleConvertState,
      value: seed.value ?? angleConvertState.value,
      from: seed.from ?? angleConvertState.from,
      to: seed.to ?? angleConvertState.to,
    };
    setAngleConvertState(nextState);
    setTrigDraftState(
      trigDraftStateForScreen(
        screen,
        buildTrigStructuredDraft(screen, {
          ...trigStateSnapshot,
          angleConvert: nextState,
        }),
        'guided',
      ),
    );
    return;
  }

  if (screen === 'specialAngles' && seed.expressionLatex) {
    setSpecialAnglesExpression(seed.expressionLatex);
    setTrigDraftState(trigDraftStateForScreen(screen, seed.expressionLatex, 'guided'));
  }
}

function applyGeometrySeed(
  screen: GeometryScreen,
  seed: GuideExample['launch']['geometrySeed'],
) {
  if (!seed) {
    return;
  }

  if (screen === 'triangleArea') {
    const nextState = {
      ...triangleAreaState,
      base: seed.base ?? triangleAreaState.base,
      height: seed.height ?? triangleAreaState.height,
    };
    setTriangleAreaState((currentState) => ({
      ...currentState,
      base: seed.base ?? currentState.base,
      height: seed.height ?? currentState.height,
    }));
    setGeometryDraftState(
      geometryDraftStateForScreen(
        screen,
        buildGeometryInputLatex(screen, { ...geometryStateSnapshot, triangleArea: nextState }),
        'guided',
      ),
    );
    return;
  }

  if (screen === 'triangleHeron') {
    const nextState = {
      ...triangleHeronState,
      a: seed.a ?? triangleHeronState.a,
      b: seed.b ?? triangleHeronState.b,
      c: seed.c ?? triangleHeronState.c,
    };
    setTriangleHeronState((currentState) => ({
      ...currentState,
      a: seed.a ?? currentState.a,
      b: seed.b ?? currentState.b,
      c: seed.c ?? currentState.c,
    }));
    setGeometryDraftState(
      geometryDraftStateForScreen(
        screen,
        buildGeometryInputLatex(screen, { ...geometryStateSnapshot, triangleHeron: nextState }),
        'guided',
      ),
    );
    return;
  }

  if (screen === 'rectangle') {
    const nextState = {
      ...rectangleState,
      width: seed.width ?? rectangleState.width,
      height: seed.height ?? rectangleState.height,
    };
    setRectangleState((currentState) => ({
      ...currentState,
      width: seed.width ?? currentState.width,
      height: seed.height ?? currentState.height,
    }));
    setGeometryDraftState(
      geometryDraftStateForScreen(
        screen,
        buildGeometryInputLatex(screen, { ...geometryStateSnapshot, rectangle: nextState }),
        'guided',
      ),
    );
    return;
  }

  if (screen === 'square') {
    const nextState = {
      ...squareState,
      side: seed.side ?? squareState.side,
    };
    setSquareState((currentState) => ({
      ...currentState,
      side: seed.side ?? currentState.side,
    }));
    setGeometryDraftState(
      geometryDraftStateForScreen(
        screen,
        buildGeometryInputLatex(screen, { ...geometryStateSnapshot, square: nextState }),
        'guided',
      ),
    );
    return;
  }

  if (screen === 'circle') {
    const nextState = {
      ...circleState,
      radius: seed.radius ?? circleState.radius,
    };
    setCircleState((currentState) => ({
      ...currentState,
      radius: seed.radius ?? currentState.radius,
    }));
    setGeometryDraftState(
      geometryDraftStateForScreen(
        screen,
        buildGeometryInputLatex(screen, { ...geometryStateSnapshot, circle: nextState }),
        'guided',
      ),
    );
    return;
  }

  if (screen === 'arcSector') {
    const nextState = {
      ...arcSectorState,
      radius: seed.radius ?? arcSectorState.radius,
      angle: seed.angle ?? arcSectorState.angle,
      angleUnit: seed.angleUnit ?? arcSectorState.angleUnit,
    };
    setArcSectorState((currentState) => ({
      ...currentState,
      radius: seed.radius ?? currentState.radius,
      angle: seed.angle ?? currentState.angle,
      angleUnit: seed.angleUnit ?? currentState.angleUnit,
    }));
    setGeometryDraftState(
      geometryDraftStateForScreen(
        screen,
        buildGeometryInputLatex(screen, { ...geometryStateSnapshot, arcSector: nextState }),
        'guided',
      ),
    );
    return;
  }

  if (screen === 'cube') {
    const nextState = {
      ...cubeState,
      side: seed.side ?? cubeState.side,
    };
    setCubeState((currentState) => ({
      ...currentState,
      side: seed.side ?? currentState.side,
    }));
    setGeometryDraftState(
      geometryDraftStateForScreen(
        screen,
        buildGeometryInputLatex(screen, { ...geometryStateSnapshot, cube: nextState }),
        'guided',
      ),
    );
    return;
  }

  if (screen === 'cuboid') {
    const nextState = {
      ...cuboidState,
      length: seed.length ?? cuboidState.length,
      width: seed.width ?? cuboidState.width,
      height: seed.height ?? cuboidState.height,
    };
    setCuboidState((currentState) => ({
      ...currentState,
      length: seed.length ?? currentState.length,
      width: seed.width ?? currentState.width,
      height: seed.height ?? currentState.height,
    }));
    setGeometryDraftState(
      geometryDraftStateForScreen(
        screen,
        buildGeometryInputLatex(screen, { ...geometryStateSnapshot, cuboid: nextState }),
        'guided',
      ),
    );
    return;
  }

  if (screen === 'cylinder') {
    const nextState = {
      ...cylinderState,
      radius: seed.radius ?? cylinderState.radius,
      height: seed.height ?? cylinderState.height,
    };
    setCylinderState((currentState) => ({
      ...currentState,
      radius: seed.radius ?? currentState.radius,
      height: seed.height ?? currentState.height,
    }));
    setGeometryDraftState(
      geometryDraftStateForScreen(
        screen,
        buildGeometryInputLatex(screen, { ...geometryStateSnapshot, cylinder: nextState }),
        'guided',
      ),
    );
    return;
  }

  if (screen === 'cone') {
    const nextState = {
      ...coneState,
      radius: seed.radius ?? coneState.radius,
      height: seed.height ?? coneState.height,
      slantHeight: seed.slantHeight ?? coneState.slantHeight,
    };
    setConeState((currentState) => ({
      ...currentState,
      radius: seed.radius ?? currentState.radius,
      height: seed.height ?? currentState.height,
      slantHeight: seed.slantHeight ?? currentState.slantHeight,
    }));
    setGeometryDraftState(
      geometryDraftStateForScreen(
        screen,
        buildGeometryInputLatex(screen, { ...geometryStateSnapshot, cone: nextState }),
        'guided',
      ),
    );
    return;
  }

  if (screen === 'sphere') {
    const nextState = {
      ...sphereState,
      radius: seed.radius ?? sphereState.radius,
    };
    setSphereState((currentState) => ({
      ...currentState,
      radius: seed.radius ?? currentState.radius,
    }));
    setGeometryDraftState(
      geometryDraftStateForScreen(
        screen,
        buildGeometryInputLatex(screen, { ...geometryStateSnapshot, sphere: nextState }),
        'guided',
      ),
    );
    return;
  }

  if (screen === 'distance') {
    const nextState = {
      p1: {
        x: seed.p1?.x ?? distanceState.p1.x,
        y: seed.p1?.y ?? distanceState.p1.y,
      },
      p2: {
        x: seed.p2?.x ?? distanceState.p2.x,
        y: seed.p2?.y ?? distanceState.p2.y,
      },
    };
    setDistanceState((currentState) => ({
      p1: {
        x: seed.p1?.x ?? currentState.p1.x,
        y: seed.p1?.y ?? currentState.p1.y,
      },
      p2: {
        x: seed.p2?.x ?? currentState.p2.x,
        y: seed.p2?.y ?? currentState.p2.y,
      },
    }));
    setGeometryDraftState(
      geometryDraftStateForScreen(
        screen,
        buildGeometryInputLatex(screen, { ...geometryStateSnapshot, distance: nextState }),
        'guided',
      ),
    );
    return;
  }

  if (screen === 'midpoint') {
    const nextState = {
      p1: {
        x: seed.p1?.x ?? midpointState.p1.x,
        y: seed.p1?.y ?? midpointState.p1.y,
      },
      p2: {
        x: seed.p2?.x ?? midpointState.p2.x,
        y: seed.p2?.y ?? midpointState.p2.y,
      },
    };
    setMidpointState((currentState) => ({
      p1: {
        x: seed.p1?.x ?? currentState.p1.x,
        y: seed.p1?.y ?? currentState.p1.y,
      },
      p2: {
        x: seed.p2?.x ?? currentState.p2.x,
        y: seed.p2?.y ?? currentState.p2.y,
      },
    }));
    setGeometryDraftState(
      geometryDraftStateForScreen(
        screen,
        buildGeometryInputLatex(screen, { ...geometryStateSnapshot, midpoint: nextState }),
        'guided',
      ),
    );
    return;
  }

  if (screen === 'slope') {
    const nextState = {
      p1: {
        x: seed.p1?.x ?? slopeState.p1.x,
        y: seed.p1?.y ?? slopeState.p1.y,
      },
      p2: {
        x: seed.p2?.x ?? slopeState.p2.x,
        y: seed.p2?.y ?? slopeState.p2.y,
      },
    };
    setSlopeState((currentState) => ({
      p1: {
        x: seed.p1?.x ?? currentState.p1.x,
        y: seed.p1?.y ?? currentState.p1.y,
      },
      p2: {
        x: seed.p2?.x ?? currentState.p2.x,
        y: seed.p2?.y ?? currentState.p2.y,
      },
    }));
    setGeometryDraftState(
      geometryDraftStateForScreen(
        screen,
        buildGeometryInputLatex(screen, { ...geometryStateSnapshot, slope: nextState }),
        'guided',
      ),
    );
    return;
  }

  if (screen === 'lineEquation') {
    const nextState = {
      p1: {
        x: seed.p1?.x ?? lineEquationState.p1.x,
        y: seed.p1?.y ?? lineEquationState.p1.y,
      },
      p2: {
        x: seed.p2?.x ?? lineEquationState.p2.x,
        y: seed.p2?.y ?? lineEquationState.p2.y,
      },
      form: seed.form ?? lineEquationState.form,
    };
    setLineEquationState((currentState) => ({
      p1: {
        x: seed.p1?.x ?? currentState.p1.x,
        y: seed.p1?.y ?? currentState.p1.y,
      },
      p2: {
        x: seed.p2?.x ?? currentState.p2.x,
        y: seed.p2?.y ?? currentState.p2.y,
      },
      form: seed.form ?? currentState.form,
    }));
    setGeometryDraftState(
      geometryDraftStateForScreen(
        screen,
        buildGeometryInputLatex(screen, { ...geometryStateSnapshot, lineEquation: nextState }),
        'guided',
      ),
    );
  }
}

function launchGuideExample(example: GuideExample | undefined) {
  if (!example) {
    return;
  }

  closeLauncher();
  setHistoryOpen(false);

  if (example.launch.kind === 'open-tool') {
    if (example.launch.targetMode === 'calculate') {
      const screen = example.launch.calculateScreen ?? 'standard';
      if (openLegacyCalculateCalculusInCalculus(screen, example.launch.calculateSeed)) {
        setDisplayOutcome(null);
        setMode('calculus');
        setClipboardNotice(example.launch.label ?? 'Opened in Calculus');
        return;
      }
      openCalculateScreen(screen);
      applyCalculateSeed(screen, example.launch.calculateSeed);
    }
    if (example.launch.targetMode === 'calculus') {
      const screen = example.launch.calculusScreen ?? 'home';
      openCalculusScreen(screen);
      applyCalculusSeed(screen, example.launch.calculusSeed);
    }
    if (example.launch.targetMode === 'equation') {
      setEquationScreen(example.launch.equationScreen ?? 'home');
    }
    if (example.launch.targetMode === 'trigonometry') {
      const screen = example.launch.trigScreen ?? 'home';
      openTrigScreen(screen);
      applyTrigSeed(screen, example.launch.trigSeed);
    }
    if (example.launch.targetMode === 'statistics') {
      const screen = example.launch.statisticsScreen ?? 'home';
      openStatisticsScreen(screen);
    }
    if (example.launch.targetMode === 'geometry') {
      const screen = example.launch.geometryScreen ?? 'home';
      openGeometryScreen(screen);
      applyGeometrySeed(screen, example.launch.geometrySeed);
    }
    setDisplayOutcome(null);
    setMode(example.launch.targetMode);
    setClipboardNotice(example.launch.label ?? 'Opened in tool');
    return;
  }

  const latex = example.launch.latex.trim();
  if (!latex) {
    return;
  }

  if (example.launch.targetMode === 'calculate') {
    const screen = example.launch.calculateScreen ?? 'standard';
    if (openLegacyCalculateCalculusInCalculus(screen, example.launch.calculateSeed)) {
      setDisplayOutcome(null);
      setMode('calculus');
      setClipboardNotice(example.launch.label ?? 'Example loaded in Calculus');
      return;
    }
    setCalculateLatex(latex);
    openCalculateScreen(screen);
    applyCalculateSeed(screen, example.launch.calculateSeed);
    setDisplayOutcome(null);
    setMode('calculate');
    setClipboardNotice(example.launch.label ?? 'Example loaded');
    return;
  }

  if (example.launch.targetMode === 'equation') {
    setEquationLatex(latex);
    setEquationScreen(example.launch.equationScreen ?? 'symbolic');
    setDisplayOutcome(null);
    setMode('equation');
    setClipboardNotice(example.launch.label ?? 'Example loaded');
    return;
  }

  if (example.launch.targetMode === 'calculus') {
    const screen = example.launch.calculusScreen ?? 'home';
    openCalculusScreen(screen);
    applyCalculusSeed(screen, example.launch.calculusSeed);
    setDisplayOutcome(null);
    setMode('calculus');
    setClipboardNotice(example.launch.label ?? 'Example loaded');
    return;
  }

  if (example.launch.targetMode === 'trigonometry') {
    const screen = example.launch.trigScreen ?? 'functions';
    openTrigScreen(screen);
    applyTrigSeed(screen, example.launch.trigSeed);
    if (screen === 'functions') {
      setTrigFunctionState((currentState) => ({
        ...currentState,
        expressionLatex: latex,
      }));
    } else if (screen === 'equationSolve') {
      setTrigEquationState((currentState) => ({
        ...currentState,
        equationLatex: latex,
      }));
    } else if (screen === 'specialAngles') {
      setSpecialAnglesExpression(latex);
    } else if (screen === 'identitySimplify' || screen === 'identityConvert') {
      setTrigIdentityState((currentState) => ({
        ...currentState,
        expressionLatex: latex,
      }));
    }
    setDisplayOutcome(null);
    setMode('trigonometry');
    setClipboardNotice(example.launch.label ?? 'Example loaded');
    return;
  }

    if (example.launch.targetMode === 'statistics') {
      const screen = example.launch.statisticsScreen ?? 'home';
      openStatisticsScreen(screen);
      if (latex) {
        setStatisticsDraftState({
          rawLatex: latex,
          style: statisticsDraftStyle(latex),
          source: 'manual',
          executable: !isStatisticsMenuScreen(screen),
        });
      }
      setDisplayOutcome(null);
      setMode('statistics');
      setClipboardNotice(example.launch.label ?? 'Example loaded');
      return;
    }

  if (example.launch.targetMode === 'geometry') {
    const screen = example.launch.geometryScreen ?? 'home';
    openGeometryScreen(screen);
    applyGeometrySeed(screen, example.launch.geometrySeed);
    if (latex) {
      setGeometryDraftState({
        rawLatex: latex,
        style: geometryDraftStyle(latex),
        source: 'manual',
        executable: isGeometryCoreEditableScreen(screen),
      });
    }
    setDisplayOutcome(null);
    setMode('geometry');
    setClipboardNotice(example.launch.label ?? 'Example loaded');
    return;
  }

  setTablePrimaryLatex(latex);
  setDisplayOutcome(null);
  setMode('table');
  setClipboardNotice(example.launch.label ?? 'Example loaded');
}

function clearCurrentMode() {
  clearCurrentModeWithDeps(deps);
}

function applyStatisticsRequest(request: StatisticsRequest) {
  if (request.kind === 'dataset') {
    setStatsDataset({ values: request.values });
    setStatisticsWorkingSource('dataset');
    return;
  }

  if (request.kind === 'descriptive' || request.kind === 'frequency') {
    const nextSource = request.source;
    setStatisticsWorkingSource(nextSource);
    if (nextSource === 'dataset') {
      setStatsDataset({ values: request.values });
    } else {
      setFrequencyTable({ rows: request.rows });
    }
    return;
  }

  if (request.kind === 'binomial') {
    setBinomialState({
      n: request.n,
      p: request.p,
      x: request.x,
      mode: request.mode,
    });
    return;
  }

  if (request.kind === 'normal') {
    setNormalState({
      mean: request.mean,
      standardDeviation: request.standardDeviation,
      x: request.x,
      mode: request.mode,
    });
    return;
  }

  if (request.kind === 'poisson') {
    setPoissonState({
      lambda: request.lambda,
      x: request.x,
      mode: request.mode,
    });
    return;
  }

  if (request.kind === 'regression') {
    setRegressionState({ points: request.points });
    return;
  }

  setCorrelationState({ points: request.points });
}

function replayHistoryEntry(entry: HistoryEntry) {
  setLauncherState((currentLauncherState) => ({
    ...currentLauncherState,
    surface: 'app',
  }));
  setMode(entry.mode);
  if (entry.mode === 'calculate') {
    const legacyCalculusScreen = mapLegacyCalculateScreenToCalculusScreen(
      entry.calculateScreen,
      entry.calculateSeed,
    );
    if (legacyCalculusScreen) {
      setMode('calculus');
      openCalculusScreen(legacyCalculusScreen);
      applyCalculusSeed(
        legacyCalculusScreen,
        entry.calculateSeed as GuideExample['launch']['calculusSeed'],
      );
    } else {
      openCalculateScreen('standard');
      setCalculateLatex(entry.inputLatex);
    }
  }
  if (entry.mode === 'equation') {
    const replayTarget = inferEquationReplayTarget(entry);
    setEquationLatex(replayTarget.equationLatex);
    openEquationScreen(replayTarget.screen);
    if (entry.numericInterval && replayTarget.screen === 'symbolic') {
      setEquationNumericSolvePanel({
        enabled: true,
        start: entry.numericInterval.start,
        end: entry.numericInterval.end,
        subdivisions: entry.numericInterval.subdivisions,
      });
    }

    if (
      replayTarget.screen === 'quadratic' ||
      replayTarget.screen === 'cubic' ||
      replayTarget.screen === 'quartic'
    ) {
      if (replayTarget.screen === 'quadratic') {
        setQuadraticCoefficients([...replayTarget.coefficients]);
      } else if (replayTarget.screen === 'cubic') {
        setCubicCoefficients([...replayTarget.coefficients]);
      } else {
        setQuarticCoefficients([...replayTarget.coefficients]);
      }
    }
  }

  if (entry.mode === 'calculus') {
    const replayScreen = entry.calculusScreen;
    const replaySeed = entry.calculusSeed;
    if (replayScreen) {
      openCalculusScreen(replayScreen);
      applyCalculusSeed(replayScreen, replaySeed);
    } else if (entry.inputLatex.startsWith('\\left.\\frac{d}') || entry.inputLatex.startsWith('\\left.\\frac{\\mathrm{d}}')) {
      openCalculusScreen('derivativePoint');
    } else if (entry.inputLatex.startsWith('\\operatorname{implicitD}')) {
      openCalculusScreen('implicitDerivative');
    } else if (entry.inputLatex.startsWith('\\frac{d}') || entry.inputLatex.startsWith('\\frac{\\mathrm{d}}')) {
      openCalculusScreen('derivative');
    } else if (entry.inputLatex.startsWith('\\int_{-\\infty}') || entry.inputLatex.includes('\\infty')) {
      openCalculusScreen('improperIntegral');
    } else if (entry.inputLatex.startsWith('\\int_')) {
      openCalculusScreen('definiteIntegral');
    } else if (entry.inputLatex.startsWith('\\int')) {
      openCalculusScreen('indefiniteIntegral');
    } else if (entry.inputLatex.startsWith('\\lim_{x\\to \\infty}') || entry.inputLatex.startsWith('\\lim_{x\\to -\\infty}')) {
      openCalculusScreen('infiniteLimit');
    } else if (entry.inputLatex.startsWith('\\lim_')) {
      openCalculusScreen('finiteLimit');
    } else if (entry.inputLatex.startsWith('\\text{Maclaurin}')) {
      openCalculusScreen('maclaurin');
    } else if (entry.inputLatex.startsWith('\\text{Taylor}')) {
      openCalculusScreen('taylor');
    } else if (entry.inputLatex.includes("y''")) {
      openCalculusScreen('odeSecondOrder');
    } else if (entry.inputLatex.includes("y'=") && entry.inputLatex.includes('h=')) {
      openCalculusScreen('odeNumericIvp');
    } else if (entry.inputLatex.includes('\\frac{dy}{dx}') || entry.inputLatex.includes("y'=")) {
      openCalculusScreen('odeFirstOrder');
    } else {
      openCalculusScreen('home');
    }
  }

  if (entry.mode === 'trigonometry') {
    const parsed = parseTrigDraft(entry.inputLatex, {
      screenHint: entry.trigScreen,
      identityTargetForm: trigIdentityState.targetForm,
    });
    if (parsed.ok) {
      const request = parsed.request;
      const replayScreen = entry.trigScreen
        ? trigRequestToScreen(request, entry.trigScreen)
        : trigRequestToScreen(request);
      if (request.kind === 'function') {
        setMode('calculate');
        openCalculateScreen('standard');
        setCalculateLatex(request.expressionLatex);
      } else if (request.kind === 'identitySimplify') {
        openTrigScreen(replayScreen);
        const { expressionLatex } = request;
        setTrigIdentityState((currentState) => ({
          ...currentState,
          expressionLatex,
          targetForm: 'simplified',
        }));
        setTrigDraftState({
          rawLatex: entry.inputLatex,
          style: trigDraftStyle(entry.inputLatex),
          source: 'manual',
          executable: true,
        });
      } else if (request.kind === 'identityConvert') {
        openTrigScreen(replayScreen);
        const { expressionLatex, targetForm } = request;
        setTrigIdentityState((currentState) => ({
          ...currentState,
          expressionLatex,
          targetForm,
        }));
        setTrigDraftState({
          rawLatex: entry.inputLatex,
          style: trigDraftStyle(entry.inputLatex),
          source: 'manual',
          executable: true,
        });
      } else if (request.kind === 'equationSolve') {
        setMode('equation');
        setEquationLatex(request.equationLatex);
        openEquationScreen('symbolic');
      } else if (request.kind === 'rightTriangle') {
        openTrigScreen(replayScreen);
        setRightTriangleState({
          knownSideA: request.knownSideA ?? '',
          knownSideB: request.knownSideB ?? '',
          knownSideC: request.knownSideC ?? '',
          knownAngleA: request.knownAngleA ?? '',
          knownAngleB: request.knownAngleB ?? '',
        });
        setTrigDraftState({
          rawLatex: entry.inputLatex,
          style: trigDraftStyle(entry.inputLatex),
          source: 'manual',
          executable: true,
        });
      } else if (request.kind === 'sineRule') {
        openTrigScreen(replayScreen);
        setSineRuleState({
          sideA: request.sideA ?? '',
          sideB: request.sideB ?? '',
          sideC: request.sideC ?? '',
          angleA: request.angleA ?? '',
          angleB: request.angleB ?? '',
          angleC: request.angleC ?? '',
        });
        setTrigDraftState({
          rawLatex: entry.inputLatex,
          style: trigDraftStyle(entry.inputLatex),
          source: 'manual',
          executable: true,
        });
      } else if (request.kind === 'cosineRule') {
        openTrigScreen(replayScreen);
        setCosineRuleState({
          sideA: request.sideA ?? '',
          sideB: request.sideB ?? '',
          sideC: request.sideC ?? '',
          angleA: request.angleA ?? '',
          angleB: request.angleB ?? '',
          angleC: request.angleC ?? '',
        });
        setTrigDraftState({
          rawLatex: entry.inputLatex,
          style: trigDraftStyle(entry.inputLatex),
          source: 'manual',
          executable: true,
        });
      } else if (request.kind === 'angleConvert') {
        openTrigScreen(replayScreen);
        setAngleConvertState({
          value: request.valueLatex,
          from: request.from,
          to: request.to,
        });
        setTrigDraftState({
          rawLatex: entry.inputLatex,
          style: trigDraftStyle(entry.inputLatex),
          source: 'manual',
          executable: true,
        });
      }
    } else if (entry.trigScreen) {
      if (entry.trigScreen === 'functions' || entry.trigScreen === 'specialAngles') {
        setMode('calculate');
        openCalculateScreen('standard');
        setCalculateLatex(entry.inputLatex);
      } else if (entry.trigScreen === 'equationsHome' || entry.trigScreen === 'equationSolve') {
        setMode('equation');
        setEquationLatex(entry.inputLatex);
        openEquationScreen('symbolic');
      } else {
        openTrigScreen(entry.trigScreen);
        setTrigDraftState({
          rawLatex: entry.inputLatex,
          style: trigDraftStyle(entry.inputLatex),
          source: 'manual',
          executable: true,
        });
      }
    } else {
      openTrigScreen('home');
    }
  }

  if (entry.mode === 'statistics') {
    const parsed = parseStatisticsDraft(entry.inputLatex, {
      screenHint: entry.statisticsScreen,
      workingSourceHint: statisticsWorkingSource,
    });
    if (parsed.ok) {
      const replayScreen = entry.statisticsScreen
        ? statisticsRequestToScreen(parsed.request, entry.statisticsScreen)
        : statisticsRequestToScreen(parsed.request);
      openStatisticsScreen(replayScreen);
      applyStatisticsRequest(parsed.request);
      const nextSource = statisticsRequestToWorkingSource(parsed.request, statisticsWorkingSource);
      if (nextSource) {
        setStatisticsWorkingSource(nextSource);
      }
      setStatisticsDraftState({
        rawLatex: entry.inputLatex,
        style: statisticsDraftStyle(entry.inputLatex),
        source: 'manual',
        executable: true,
      });
    } else if (entry.statisticsScreen) {
      openStatisticsScreen(entry.statisticsScreen);
      setStatisticsDraftState({
        rawLatex: entry.inputLatex,
        style: statisticsDraftStyle(entry.inputLatex),
        source: 'manual',
        executable: true,
      });
    } else {
      openStatisticsScreen('home');
    }
  }

  if (entry.mode === 'geometry') {
    if (entry.geometrySeed) {
      const replayLatex = serializeGeometryRequest
        ? serializeGeometryRequest(entry.geometrySeed.request)
        : entry.inputLatex;
      openGeometryScreen(entry.geometrySeed.screen);
      setGeometryDraftState({
        rawLatex: replayLatex,
        style: geometryDraftStyle(replayLatex),
        source: 'manual',
        executable: true,
      });
    } else {
      const parsed = parseGeometryDraft(entry.inputLatex, {
        screenHint: entry.geometryScreen,
      });
      if (parsed.ok) {
        const replayScreen = geometryRequestToScreen(parsed.request);
        openGeometryScreen(replayScreen);
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
  }

  setDisplayOutcome(readHistoryResult(entry).outcome);
  setHistoryOpen(false);
}

return {
  clearCurrentMode,
  launchGuideExample,
  applyStatisticsRequest,
  replayHistoryEntry,
};
}
