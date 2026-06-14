import {
  useRef,
  useState,
  type MutableRefObject,
} from 'react';
import type { MathfieldElement } from 'mathlive';
import {
  getAdvancedCalcMenuEntries,
  getAdvancedCalcMenuEntryAtIndex,
  getAdvancedCalcMenuFooterText,
  getAdvancedCalcParentScreen,
  getAdvancedCalcRouteMeta,
  isAdvancedCalcMenuScreen,
  moveAdvancedCalcMenuIndex,
} from '../../lib/advanced-calc/navigation';
import {
  buildAdvancedFiniteLimitLatex,
  buildAdvancedInfiniteLimitLatex,
  buildAdvancedIntegralLatex,
  buildFirstOrderOdeLatex,
  buildNumericIvpLatex,
  buildPartialDerivativeLatex,
  buildSecondOrderOdeLatex,
  buildSeriesPreviewLatex,
  DEFAULT_ADVANCED_DEFINITE_INTEGRAL_STATE,
  DEFAULT_ADVANCED_FINITE_LIMIT_STATE,
  DEFAULT_ADVANCED_IMPROPER_INTEGRAL_STATE,
  DEFAULT_ADVANCED_INDEFINITE_INTEGRAL_STATE,
  DEFAULT_ADVANCED_INFINITE_LIMIT_STATE,
  DEFAULT_FIRST_ORDER_ODE_STATE,
  DEFAULT_MACLAURIN_STATE,
  DEFAULT_NUMERIC_IVP_STATE,
  DEFAULT_PARTIAL_DERIVATIVE_STATE,
  DEFAULT_SECOND_ORDER_ODE_STATE,
  DEFAULT_TAYLOR_STATE,
} from '../../lib/advanced-calc/examples';
import { isOoeCommitAllowed } from '../../lib/ooe/job-launch/job-contract';
import {
  buildDerivativeAtPointLatex,
  buildDerivativeLatex,
  DEFAULT_DERIVATIVE_POINT_WORKBENCH,
  DEFAULT_DERIVATIVE_WORKBENCH,
} from '../../lib/calculus/calculus-workbench';
import { isCalculusMode } from '../../lib/calculus/calculus-identity';
import { trimHarmlessTrailingMathSpacing } from '../../lib/input/input-canonicalization';
import type { PendingHistoryTicketReservation } from '../../lib/ooe/job-launch/launch-tickets';
import type { RunCalculusModeRequest } from '../../lib/modes/calculus';
import type {
  AdvancedCalcScreen,
  AdvancedDefiniteIntegralState,
  AdvancedFiniteLimitState,
  AdvancedImproperIntegralState,
  AdvancedIndefiniteIntegralState,
  AdvancedInfiniteLimitState,
  DerivativePointWorkbenchState,
  DerivativeWorkbenchState,
  DisplayOutcome,
  FirstOrderOdeState,
  GuideExample,
  HistoryEntry,
  ModeId,
  NumericIvpState,
  PartialDerivativeWorkbenchState,
  SecondOrderOdeState,
  SeriesState,
  Settings,
  StoredVariableValue,
  VariableSubstitutionSnapshot,
} from '../../types/calculator';

type CalculusMenuScreen =
  'home' | 'derivativesHome' | 'integralsHome' | 'limitsHome' | 'seriesHome' | 'partialsHome' | 'odeHome';

type ReplayVariableSubstitutions = {
  mode: ModeId;
  inputLatex: string;
  substitutions: VariableSubstitutionSnapshot[];
} | null;

export type ActiveCalculusRuntimeState = {
  screen: AdvancedCalcScreen;
  generatedLatex: string;
  derivative: DerivativeWorkbenchState;
  derivativePoint: DerivativePointWorkbenchState;
  indefiniteIntegral: AdvancedIndefiniteIntegralState;
  definiteIntegral: AdvancedDefiniteIntegralState;
  improperIntegral: AdvancedImproperIntegralState;
  finiteLimit: AdvancedFiniteLimitState;
  infiniteLimit: AdvancedInfiniteLimitState;
  maclaurin: SeriesState;
  taylor: SeriesState;
  partialDerivative: PartialDerivativeWorkbenchState;
  firstOrderOde: FirstOrderOdeState;
  secondOrderOde: SecondOrderOdeState;
  numericIvp: NumericIvpState;
  angleUnit: Settings['angleUnit'];
  outputStyle: Settings['outputStyle'];
  ansLatex: string;
  variableMemory: StoredVariableValue[];
  replayVariableSubstitutions: ReplayVariableSubstitutions;
};

type CommitCalculusOutcome = (
  outcome: DisplayOutcome,
  inputLatex: string,
  mode: 'calculus',
  context?: Partial<Pick<HistoryEntry, 'calculusScreen' | 'calculusSeed'>> & {
    historyTicketId?: string | null;
    historyLaunchOrder?: number;
    suppressDisplayCommit?: boolean;
  },
) => void;

type UseCalculusRuntimeOptions = {
  ansLatex: string;
  commitOutcome: CommitCalculusOutcome;
  currentMode: ModeId;
  currentModeRef: MutableRefObject<ModeId>;
  discardHistoryTicket: (ticketId?: string | null) => void;
  isLauncherOpen: boolean;
  openLauncher: () => void;
  replayVariableSubstitutions: ReplayVariableSubstitutions;
  reserveHistoryTicket: (input: {
    mode: ModeId;
    inputLatex: string;
    capabilityId?: string;
    inputRevisionId?: string;
  }) => PendingHistoryTicketReservation | null;
  settings: Pick<Settings, 'angleUnit' | 'outputStyle'>;
  setDisplayOutcome: (outcome: DisplayOutcome | null) => void;
  setRuntimeStatusOverride: (status: string | null) => void;
  startTransition: (callback: () => void) => void;
  storedVariables: StoredVariableValue[];
  clearReplayVariableSubstitutions: () => void;
};

function defaultCalculusMenuSelection() {
  return {
    home: 0,
    derivativesHome: 0,
    integralsHome: 0,
    limitsHome: 0,
    seriesHome: 0,
    partialsHome: 0,
    odeHome: 0,
  };
}

function buildAdvancedCalcWorkbenchExpression(
  screen: AdvancedCalcScreen,
  state: Pick<
    ActiveCalculusRuntimeState,
    | 'derivative'
    | 'derivativePoint'
    | 'indefiniteIntegral'
    | 'definiteIntegral'
    | 'improperIntegral'
    | 'finiteLimit'
    | 'infiniteLimit'
    | 'maclaurin'
    | 'taylor'
    | 'partialDerivative'
    | 'firstOrderOde'
    | 'secondOrderOde'
    | 'numericIvp'
  >,
) {
  switch (screen) {
    case 'derivative':
      return buildDerivativeLatex(state.derivative.bodyLatex);
    case 'derivativePoint':
      return buildDerivativeAtPointLatex(
        state.derivativePoint.bodyLatex,
        state.derivativePoint.point,
      );
    case 'indefiniteIntegral':
      return buildAdvancedIntegralLatex(
        'indefinite',
        state.indefiniteIntegral,
        state.definiteIntegral,
        state.improperIntegral,
      );
    case 'definiteIntegral':
      return buildAdvancedIntegralLatex(
        'definite',
        state.indefiniteIntegral,
        state.definiteIntegral,
        state.improperIntegral,
      );
    case 'improperIntegral':
      return buildAdvancedIntegralLatex(
        'improper',
        state.indefiniteIntegral,
        state.definiteIntegral,
        state.improperIntegral,
      );
    case 'finiteLimit':
      return buildAdvancedFiniteLimitLatex(state.finiteLimit);
    case 'infiniteLimit':
      return buildAdvancedInfiniteLimitLatex(state.infiniteLimit);
    case 'maclaurin':
      return buildSeriesPreviewLatex(state.maclaurin);
    case 'taylor':
      return buildSeriesPreviewLatex(state.taylor);
    case 'partialDerivative':
      return buildPartialDerivativeLatex(state.partialDerivative);
    case 'odeFirstOrder':
      return buildFirstOrderOdeLatex(state.firstOrderOde);
    case 'odeSecondOrder':
      return buildSecondOrderOdeLatex(state.secondOrderOde);
    case 'odeNumericIvp':
      return buildNumericIvpLatex(state.numericIvp);
    default:
      return '';
  }
}

function buildCalculusRequestFromState(
  state: ActiveCalculusRuntimeState,
): RunCalculusModeRequest {
  return {
    screen: state.screen,
    derivative: state.derivative,
    derivativePoint: state.derivativePoint,
    indefiniteIntegral: state.indefiniteIntegral,
    definiteIntegral: state.definiteIntegral,
    improperIntegral: state.improperIntegral,
    finiteLimit: state.finiteLimit,
    infiniteLimit: state.infiniteLimit,
    maclaurin: state.maclaurin,
    taylor: state.taylor,
    partialDerivative: state.partialDerivative,
    firstOrderOde: state.firstOrderOde,
    secondOrderOde: state.secondOrderOde,
    numericIvp: state.numericIvp,
    angleUnit: state.angleUnit,
    outputStyle: state.outputStyle,
    ansLatex: state.ansLatex,
    storedVariables: state.variableMemory,
    variableSubstitutionSnapshot:
      isCalculusMode(state.replayVariableSubstitutions?.mode)
      && state.replayVariableSubstitutions.inputLatex === state.generatedLatex
        ? state.replayVariableSubstitutions.substitutions
        : undefined,
  };
}

export function calculusHistoryContextFromState(
  state: ActiveCalculusRuntimeState,
): Pick<HistoryEntry, 'calculusScreen'> & Partial<Pick<HistoryEntry, 'calculusSeed'>> {
  switch (state.screen) {
    case 'derivative':
      return { calculusScreen: state.screen, calculusSeed: { ...state.derivative } };
    case 'derivativePoint':
      return { calculusScreen: state.screen, calculusSeed: { ...state.derivativePoint } };
    case 'indefiniteIntegral':
      return { calculusScreen: state.screen, calculusSeed: { ...state.indefiniteIntegral } };
    case 'definiteIntegral':
      return { calculusScreen: state.screen, calculusSeed: { ...state.definiteIntegral } };
    case 'improperIntegral':
      return { calculusScreen: state.screen, calculusSeed: { ...state.improperIntegral } };
    case 'finiteLimit':
      return { calculusScreen: state.screen, calculusSeed: { ...state.finiteLimit } };
    case 'infiniteLimit':
      return { calculusScreen: state.screen, calculusSeed: { ...state.infiniteLimit } };
    case 'maclaurin':
      return { calculusScreen: state.screen, calculusSeed: { ...state.maclaurin } };
    case 'taylor':
      return { calculusScreen: state.screen, calculusSeed: { ...state.taylor } };
    case 'partialDerivative':
      return { calculusScreen: state.screen, calculusSeed: { ...state.partialDerivative } };
    case 'odeFirstOrder':
      return { calculusScreen: state.screen, calculusSeed: { ...state.firstOrderOde } };
    case 'odeSecondOrder':
      return { calculusScreen: state.screen, calculusSeed: { ...state.secondOrderOde } };
    case 'odeNumericIvp':
      return { calculusScreen: state.screen, calculusSeed: { ...state.numericIvp } };
    default:
      return { calculusScreen: state.screen };
  }
}

export function useCalculusRuntime({
  ansLatex,
  commitOutcome,
  currentMode,
  currentModeRef,
  discardHistoryTicket,
  isLauncherOpen,
  openLauncher,
  replayVariableSubstitutions,
  reserveHistoryTicket,
  settings,
  setDisplayOutcome,
  setRuntimeStatusOverride,
  startTransition,
  storedVariables,
  clearReplayVariableSubstitutions,
}: UseCalculusRuntimeOptions) {
  const [advancedCalcScreen, setAdvancedCalcScreen] = useState<AdvancedCalcScreen>('home');
  const [advancedCalcMenuSelection, setAdvancedCalcMenuSelection] = useState(
    defaultCalculusMenuSelection,
  );
  const [derivativeWorkbench, setDerivativeWorkbench] = useState<DerivativeWorkbenchState>(
    DEFAULT_DERIVATIVE_WORKBENCH,
  );
  const [derivativePointWorkbench, setDerivativePointWorkbench] =
    useState<DerivativePointWorkbenchState>(DEFAULT_DERIVATIVE_POINT_WORKBENCH);
  const [advancedIndefiniteIntegral, setAdvancedIndefiniteIntegral] =
    useState<AdvancedIndefiniteIntegralState>(DEFAULT_ADVANCED_INDEFINITE_INTEGRAL_STATE);
  const [advancedDefiniteIntegral, setAdvancedDefiniteIntegral] =
    useState<AdvancedDefiniteIntegralState>(DEFAULT_ADVANCED_DEFINITE_INTEGRAL_STATE);
  const [advancedImproperIntegral, setAdvancedImproperIntegral] =
    useState<AdvancedImproperIntegralState>(DEFAULT_ADVANCED_IMPROPER_INTEGRAL_STATE);
  const [advancedFiniteLimit, setAdvancedFiniteLimit] =
    useState<AdvancedFiniteLimitState>(DEFAULT_ADVANCED_FINITE_LIMIT_STATE);
  const [advancedInfiniteLimit, setAdvancedInfiniteLimit] =
    useState<AdvancedInfiniteLimitState>(DEFAULT_ADVANCED_INFINITE_LIMIT_STATE);
  const [maclaurinState, setMaclaurinState] = useState<SeriesState>(DEFAULT_MACLAURIN_STATE);
  const [taylorState, setTaylorState] = useState<SeriesState>(DEFAULT_TAYLOR_STATE);
  const [partialDerivativeState, setPartialDerivativeState] =
    useState<PartialDerivativeWorkbenchState>(DEFAULT_PARTIAL_DERIVATIVE_STATE);
  const [firstOrderOdeState, setFirstOrderOdeState] =
    useState<FirstOrderOdeState>(DEFAULT_FIRST_ORDER_ODE_STATE);
  const [secondOrderOdeState, setSecondOrderOdeState] =
    useState<SecondOrderOdeState>(DEFAULT_SECOND_ORDER_ODE_STATE);
  const [numericIvpState, setNumericIvpState] = useState<NumericIvpState>(DEFAULT_NUMERIC_IVP_STATE);

  const activeCalculusRuntimeRef = useRef<ActiveCalculusRuntimeState | null>(null);
  const advancedMenuPanelRef = useRef<HTMLDivElement | null>(null);
  const derivativeFieldRef = useRef<MathfieldElement | null>(null);
  const derivativePointFieldRef = useRef<MathfieldElement | null>(null);
  const derivativePointValueRef = useRef<HTMLInputElement | null>(null);
  const advancedIndefiniteFieldRef = useRef<MathfieldElement | null>(null);
  const advancedDefiniteFieldRef = useRef<MathfieldElement | null>(null);
  const advancedImproperFieldRef = useRef<MathfieldElement | null>(null);
  const advancedFiniteLimitFieldRef = useRef<MathfieldElement | null>(null);
  const advancedInfiniteLimitFieldRef = useRef<MathfieldElement | null>(null);
  const maclaurinFieldRef = useRef<MathfieldElement | null>(null);
  const taylorFieldRef = useRef<MathfieldElement | null>(null);
  const partialDerivativeFieldRef = useRef<MathfieldElement | null>(null);
  const firstOrderOdeLhsFieldRef = useRef<MathfieldElement | null>(null);
  const firstOrderOdeRhsFieldRef = useRef<MathfieldElement | null>(null);
  const secondOrderOdeForcingFieldRef = useRef<MathfieldElement | null>(null);
  const numericIvpFieldRef = useRef<MathfieldElement | null>(null);
  const advancedDefiniteLowerRef = useRef<HTMLInputElement | null>(null);
  const advancedImproperLowerRef = useRef<HTMLInputElement | null>(null);
  const advancedFiniteLimitTargetRef = useRef<HTMLInputElement | null>(null);
  const taylorCenterRef = useRef<HTMLInputElement | null>(null);
  const secondOrderA2Ref = useRef<HTMLInputElement | null>(null);
  const numericIvpX0Ref = useRef<HTMLInputElement | null>(null);

  const advancedCalcRouteMeta = isCalculusMode(currentMode)
    ? getAdvancedCalcRouteMeta(advancedCalcScreen)
    : null;
  const isAdvancedCalcMenuOpen =
    !isLauncherOpen && isCalculusMode(currentMode) && isAdvancedCalcMenuScreen(advancedCalcScreen);
  const advancedCalcMenuEntries = isAdvancedCalcMenuOpen
    ? getAdvancedCalcMenuEntries(advancedCalcScreen)
    : [];
  const currentAdvancedCalcMenuIndex = isAdvancedCalcMenuOpen
    ? advancedCalcMenuSelection[
      advancedCalcScreen as keyof typeof advancedCalcMenuSelection
    ]
    : 0;
  const selectedAdvancedCalcMenuEntry = isAdvancedCalcMenuOpen
    ? getAdvancedCalcMenuEntryAtIndex(advancedCalcScreen, currentAdvancedCalcMenuIndex)
    : undefined;
  const advancedCalcMenuFooterText = isCalculusMode(currentMode)
    ? getAdvancedCalcMenuFooterText(advancedCalcScreen)
    : '';
  const advancedCalcStateSnapshot = {
    derivative: derivativeWorkbench,
    derivativePoint: derivativePointWorkbench,
    indefiniteIntegral: advancedIndefiniteIntegral,
    definiteIntegral: advancedDefiniteIntegral,
    improperIntegral: advancedImproperIntegral,
    finiteLimit: advancedFiniteLimit,
    infiniteLimit: advancedInfiniteLimit,
    maclaurin: maclaurinState,
    taylor: taylorState,
    partialDerivative: partialDerivativeState,
    firstOrderOde: firstOrderOdeState,
    secondOrderOde: secondOrderOdeState,
    numericIvp: numericIvpState,
  };
  const advancedCalcWorkbenchExpression =
    buildAdvancedCalcWorkbenchExpression(advancedCalcScreen, advancedCalcStateSnapshot);
  const activeCalculusRuntimeState: ActiveCalculusRuntimeState = {
    screen: advancedCalcScreen,
    generatedLatex: trimHarmlessTrailingMathSpacing(advancedCalcWorkbenchExpression),
    ...advancedCalcStateSnapshot,
    angleUnit: settings.angleUnit,
    outputStyle: settings.outputStyle,
    ansLatex,
    variableMemory: storedVariables,
    replayVariableSubstitutions,
  };
  activeCalculusRuntimeRef.current = activeCalculusRuntimeState;

  function openAdvancedCalcScreen(screen: AdvancedCalcScreen) {
    setAdvancedCalcScreen(screen);
    setDisplayOutcome(null);
  }

  function setCurrentAdvancedCalcMenuIndex(screen: CalculusMenuScreen, index: number) {
    setAdvancedCalcMenuSelection((currentSelection) => ({
      ...currentSelection,
      [screen]: index,
    }));
  }

  function moveCurrentAdvancedCalcMenuSelection(delta: number) {
    if (!isAdvancedCalcMenuOpen) {
      return;
    }

    setCurrentAdvancedCalcMenuIndex(
      advancedCalcScreen as CalculusMenuScreen,
      moveAdvancedCalcMenuIndex(advancedCalcScreen, currentAdvancedCalcMenuIndex, delta),
    );
  }

  function openSelectedAdvancedCalcMenuEntry() {
    if (!selectedAdvancedCalcMenuEntry) {
      return;
    }

    openAdvancedCalcScreen(selectedAdvancedCalcMenuEntry.target);
  }

  function goBackInAdvancedCalc() {
    const parentScreen = getAdvancedCalcParentScreen(advancedCalcScreen);
    if (parentScreen) {
      openAdvancedCalcScreen(parentScreen);
    } else {
      openLauncher();
    }
  }

  function openAdvancedCalcParentOrHome() {
    openAdvancedCalcScreen(getAdvancedCalcParentScreen(advancedCalcScreen) ?? 'home');
  }

  function applyAdvancedCalcSeed(
    screen: AdvancedCalcScreen,
    seed: GuideExample['launch']['advancedCalcSeed'],
  ) {
    if (!seed) {
      return;
    }

    if (screen === 'derivative') {
      setDerivativeWorkbench((currentState) => ({
        ...currentState,
        bodyLatex: seed.bodyLatex ?? currentState.bodyLatex,
      }));
      return;
    }

    if (screen === 'derivativePoint') {
      setDerivativePointWorkbench((currentState) => ({
        ...currentState,
        bodyLatex: seed.bodyLatex ?? currentState.bodyLatex,
        point: seed.point ?? currentState.point,
      }));
      return;
    }

    if (screen === 'indefiniteIntegral') {
      setAdvancedIndefiniteIntegral((currentState) => ({
        ...currentState,
        bodyLatex: seed.bodyLatex ?? currentState.bodyLatex,
      }));
      return;
    }

    if (screen === 'definiteIntegral') {
      setAdvancedDefiniteIntegral((currentState) => ({
        ...currentState,
        bodyLatex: seed.bodyLatex ?? currentState.bodyLatex,
        lower: seed.lower ?? currentState.lower,
        upper: seed.upper ?? currentState.upper,
      }));
      return;
    }

    if (screen === 'improperIntegral') {
      setAdvancedImproperIntegral((currentState) => ({
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
      setAdvancedFiniteLimit((currentState) => ({
        ...currentState,
        bodyLatex: seed.bodyLatex ?? currentState.bodyLatex,
        target: seed.target ?? currentState.target,
        direction: seed.direction ?? currentState.direction,
      }));
      return;
    }

    if (screen === 'infiniteLimit') {
      setAdvancedInfiniteLimit((currentState) => ({
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

  function currentAdvancedCalcHistoryContext() {
    return calculusHistoryContextFromState(activeCalculusRuntimeState);
  }

  function restoreCalculusHistoryEntry(entry: HistoryEntry) {
    const replayScreen = entry.calculusScreen ?? entry.advancedCalcScreen;
    const replaySeed = entry.calculusSeed ?? entry.advancedCalcSeed;
    if (replayScreen) {
      openAdvancedCalcScreen(replayScreen);
      applyAdvancedCalcSeed(replayScreen, replaySeed);
    } else if (
      entry.inputLatex.startsWith('\\left.\\frac{d}')
      || entry.inputLatex.startsWith('\\left.\\frac{\\mathrm{d}}')
    ) {
      openAdvancedCalcScreen('derivativePoint');
    } else if (
      entry.inputLatex.startsWith('\\frac{d}')
      || entry.inputLatex.startsWith('\\frac{\\mathrm{d}}')
    ) {
      openAdvancedCalcScreen('derivative');
    } else if (entry.inputLatex.startsWith('\\int_{-\\infty}') || entry.inputLatex.includes('\\infty')) {
      openAdvancedCalcScreen('improperIntegral');
    } else if (entry.inputLatex.startsWith('\\int_')) {
      openAdvancedCalcScreen('definiteIntegral');
    } else if (entry.inputLatex.startsWith('\\int')) {
      openAdvancedCalcScreen('indefiniteIntegral');
    } else if (
      entry.inputLatex.startsWith('\\lim_{x\\to \\infty}')
      || entry.inputLatex.startsWith('\\lim_{x\\to -\\infty}')
    ) {
      openAdvancedCalcScreen('infiniteLimit');
    } else if (entry.inputLatex.startsWith('\\lim_')) {
      openAdvancedCalcScreen('finiteLimit');
    } else if (entry.inputLatex.startsWith('\\text{Maclaurin}')) {
      openAdvancedCalcScreen('maclaurin');
    } else if (entry.inputLatex.startsWith('\\text{Taylor}')) {
      openAdvancedCalcScreen('taylor');
    } else if (entry.inputLatex.includes("y''")) {
      openAdvancedCalcScreen('odeSecondOrder');
    } else if (entry.inputLatex.includes("y'=") && entry.inputLatex.includes('h=')) {
      openAdvancedCalcScreen('odeNumericIvp');
    } else if (entry.inputLatex.includes('\\frac{dy}{dx}') || entry.inputLatex.includes("y'=")) {
      openAdvancedCalcScreen('odeFirstOrder');
    } else {
      openAdvancedCalcScreen('home');
    }
  }

  function resetCurrentCalculusScreen() {
    if (isAdvancedCalcMenuOpen) {
      goBackInAdvancedCalc();
    } else if (advancedCalcScreen === 'derivative') {
      setDerivativeWorkbench(DEFAULT_DERIVATIVE_WORKBENCH);
    } else if (advancedCalcScreen === 'derivativePoint') {
      setDerivativePointWorkbench(DEFAULT_DERIVATIVE_POINT_WORKBENCH);
    } else if (advancedCalcScreen === 'indefiniteIntegral') {
      setAdvancedIndefiniteIntegral(DEFAULT_ADVANCED_INDEFINITE_INTEGRAL_STATE);
    } else if (advancedCalcScreen === 'definiteIntegral') {
      setAdvancedDefiniteIntegral(DEFAULT_ADVANCED_DEFINITE_INTEGRAL_STATE);
    } else if (advancedCalcScreen === 'improperIntegral') {
      setAdvancedImproperIntegral(DEFAULT_ADVANCED_IMPROPER_INTEGRAL_STATE);
    } else if (advancedCalcScreen === 'finiteLimit') {
      setAdvancedFiniteLimit(DEFAULT_ADVANCED_FINITE_LIMIT_STATE);
    } else if (advancedCalcScreen === 'infiniteLimit') {
      setAdvancedInfiniteLimit(DEFAULT_ADVANCED_INFINITE_LIMIT_STATE);
    } else if (advancedCalcScreen === 'maclaurin') {
      setMaclaurinState(DEFAULT_MACLAURIN_STATE);
    } else if (advancedCalcScreen === 'taylor') {
      setTaylorState(DEFAULT_TAYLOR_STATE);
    } else if (advancedCalcScreen === 'partialDerivative') {
      setPartialDerivativeState(DEFAULT_PARTIAL_DERIVATIVE_STATE);
    } else if (advancedCalcScreen === 'odeFirstOrder') {
      setFirstOrderOdeState(DEFAULT_FIRST_ORDER_ODE_STATE);
    } else if (advancedCalcScreen === 'odeSecondOrder') {
      setSecondOrderOdeState(DEFAULT_SECOND_ORDER_ODE_STATE);
    } else if (advancedCalcScreen === 'odeNumericIvp') {
      setNumericIvpState(DEFAULT_NUMERIC_IVP_STATE);
    }
  }

  function resetCalculusRuntime() {
    setAdvancedCalcScreen('home');
    setAdvancedCalcMenuSelection(defaultCalculusMenuSelection());
    setDerivativeWorkbench(DEFAULT_DERIVATIVE_WORKBENCH);
    setDerivativePointWorkbench(DEFAULT_DERIVATIVE_POINT_WORKBENCH);
    setAdvancedIndefiniteIntegral(DEFAULT_ADVANCED_INDEFINITE_INTEGRAL_STATE);
    setAdvancedDefiniteIntegral(DEFAULT_ADVANCED_DEFINITE_INTEGRAL_STATE);
    setAdvancedImproperIntegral(DEFAULT_ADVANCED_IMPROPER_INTEGRAL_STATE);
    setAdvancedFiniteLimit(DEFAULT_ADVANCED_FINITE_LIMIT_STATE);
    setAdvancedInfiniteLimit(DEFAULT_ADVANCED_INFINITE_LIMIT_STATE);
    setMaclaurinState(DEFAULT_MACLAURIN_STATE);
    setTaylorState(DEFAULT_TAYLOR_STATE);
    setPartialDerivativeState(DEFAULT_PARTIAL_DERIVATIVE_STATE);
    setFirstOrderOdeState(DEFAULT_FIRST_ORDER_ODE_STATE);
    setSecondOrderOdeState(DEFAULT_SECOND_ORDER_ODE_STATE);
    setNumericIvpState(DEFAULT_NUMERIC_IVP_STATE);
  }

  function runAdvancedCalcAction() {
    const generated = trimHarmlessTrailingMathSpacing(advancedCalcWorkbenchExpression);
    if (!generated || !advancedCalcRouteMeta || isAdvancedCalcMenuOpen) {
      setDisplayOutcome({
        kind: 'error',
        title: advancedCalcRouteMeta?.label ?? 'Calculus',
        error: advancedCalcRouteMeta
          ? `Fill the ${advancedCalcRouteMeta.label.toLowerCase()} inputs before evaluating.`
          : 'Choose a Calculus tool before evaluating.',
        warnings: [],
      });
      return;
    }

    const launchedState = activeCalculusRuntimeRef.current;
    if (!launchedState) {
      setDisplayOutcome({
        kind: 'error',
        title: 'Calculus',
        error: 'Could not prepare the Calculus request.',
        warnings: [],
      });
      return;
    }

    startTransition(() => {
      let launchedHistoryTicket: PendingHistoryTicketReservation | null = null;
      void import('../../lib/modes/calculus')
        .then(async ({
          buildCalculusOoeInputRevisionId,
          runCalculusModeWithOoePilot,
        }) => {
          const request = buildCalculusRequestFromState(launchedState);
          const inputRevisionId = buildCalculusOoeInputRevisionId(request, generated);
          const historyTicket = reserveHistoryTicket({
            mode: 'calculus',
            inputLatex: generated,
            capabilityId: 'calculus.evaluate',
            inputRevisionId,
          });
          launchedHistoryTicket = historyTicket;

          const result = await runCalculusModeWithOoePilot(request, {
            generatedLatex: generated,
            activeInputRevisionId: () => {
              const activeState = activeCalculusRuntimeRef.current;
              return activeState
                ? buildCalculusOoeInputRevisionId(
                  buildCalculusRequestFromState(activeState),
                  activeState.generatedLatex,
                )
                : null;
            },
            ...(historyTicket ? { launchTicket: historyTicket } : {}),
          });

          if (result.ooe.completion?.kind === 'cancelled') {
            discardHistoryTicket(historyTicket?.id);
            setRuntimeStatusOverride('Calculus evaluation stopped');
            return;
          }

          if (!isOoeCommitAllowed(result.ooe.commitAssessment)) {
            discardHistoryTicket(historyTicket?.id);
            return;
          }

          const visibleStillCalculus = isCalculusMode(currentModeRef.current);
          commitOutcome(result.payload, generated, 'calculus', {
            ...calculusHistoryContextFromState(launchedState),
            historyTicketId: historyTicket?.id,
            historyLaunchOrder: historyTicket?.historyLaunchOrder,
            suppressDisplayCommit: !visibleStillCalculus,
          });
          clearReplayVariableSubstitutions();
        })
        .catch((error: unknown) => {
          discardHistoryTicket(launchedHistoryTicket?.id);
          const loadError: DisplayOutcome = {
            kind: 'error',
            title: 'Calculus',
            error: error instanceof Error
              ? `Could not load the Calculus runtime: ${error.message}`
              : 'Could not load the Calculus runtime.',
            warnings: [],
          };
          if (isCalculusMode(currentModeRef.current)) {
            setDisplayOutcome(loadError);
          }
          setRuntimeStatusOverride('Calculus runtime failed');
        });
    });
  }

  return {
    activeCalculusRuntimeState,
    advancedCalcMenuEntries,
    advancedCalcMenuFooterText,
    advancedCalcMenuSelection,
    advancedCalcRouteMeta,
    advancedCalcScreen,
    advancedCalcStateSnapshot,
    advancedCalcWorkbenchExpression,
    advancedDefiniteFieldRef,
    advancedDefiniteIntegral,
    advancedDefiniteLowerRef,
    advancedFiniteLimit,
    advancedFiniteLimitFieldRef,
    advancedFiniteLimitTargetRef,
    advancedIndefiniteFieldRef,
    advancedIndefiniteIntegral,
    advancedInfiniteLimit,
    advancedInfiniteLimitFieldRef,
    advancedImproperFieldRef,
    advancedImproperIntegral,
    advancedImproperLowerRef,
    advancedMenuPanelRef,
    applyAdvancedCalcSeed,
    currentAdvancedCalcHistoryContext,
    currentAdvancedCalcMenuIndex,
    derivativeFieldRef,
    derivativePointFieldRef,
    derivativePointValueRef,
    derivativePointWorkbench,
    derivativeWorkbench,
    firstOrderOdeLhsFieldRef,
    firstOrderOdeRhsFieldRef,
    firstOrderOdeState,
    goBackInAdvancedCalc,
    isAdvancedCalcMenuOpen,
    maclaurinFieldRef,
    maclaurinState,
    moveCurrentAdvancedCalcMenuSelection,
    numericIvpFieldRef,
    numericIvpState,
    numericIvpX0Ref,
    openAdvancedCalcParentOrHome,
    openAdvancedCalcScreen,
    openSelectedAdvancedCalcMenuEntry,
    partialDerivativeFieldRef,
    partialDerivativeState,
    resetCalculusRuntime,
    resetCurrentCalculusScreen,
    restoreCalculusHistoryEntry,
    runAdvancedCalcAction,
    secondOrderA2Ref,
    secondOrderOdeForcingFieldRef,
    secondOrderOdeState,
    selectedAdvancedCalcMenuEntry,
    setAdvancedCalcMenuSelection,
    setAdvancedCalcScreen,
    setAdvancedDefiniteIntegral,
    setAdvancedFiniteLimit,
    setAdvancedImproperIntegral,
    setAdvancedIndefiniteIntegral,
    setAdvancedInfiniteLimit,
    setCurrentAdvancedCalcMenuIndex,
    setDerivativePointWorkbench,
    setDerivativeWorkbench,
    setFirstOrderOdeState,
    setMaclaurinState,
    setNumericIvpState,
    setPartialDerivativeState,
    setSecondOrderOdeState,
    setTaylorState,
    taylorCenterRef,
    taylorFieldRef,
    taylorState,
  };
}
