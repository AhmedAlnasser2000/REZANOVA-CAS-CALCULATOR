import {
  useRef,
  useState,
  type MutableRefObject,
} from 'react';
import type { MathfieldElement } from 'mathlive';
import {
  getCalculusMenuEntries,
  getCalculusMenuEntryAtIndex,
  getCalculusMenuFooterText,
  getCalculusParentScreen,
  getCalculusRouteMeta,
  isCalculusMainEditorScreen,
  isCalculusMenuScreen,
  moveCalculusMenuIndex,
} from '../../lib/calculus/workspace/navigation';
import {
  DEFAULT_CALCULUS_DEFINITE_INTEGRAL_STATE,
  DEFAULT_CALCULUS_FINITE_LIMIT_STATE,
  DEFAULT_CALCULUS_IMPROPER_INTEGRAL_STATE,
  DEFAULT_CALCULUS_INDEFINITE_INTEGRAL_STATE,
  DEFAULT_CALCULUS_INFINITE_LIMIT_STATE,
  DEFAULT_FIRST_ORDER_ODE_STATE,
  DEFAULT_LAPLACE_TRANSFORM_STATE,
  DEFAULT_MACLAURIN_STATE,
  DEFAULT_NUMERIC_IVP_STATE,
  DEFAULT_PARTIAL_DERIVATIVE_STATE,
  DEFAULT_SECOND_ORDER_ODE_STATE,
  DEFAULT_TAYLOR_STATE,
} from '../../lib/calculus/workspace/examples';
import { isOoeCommitAllowed } from '../../lib/ooe/job-launch/job-contract';
import type { OoeJobIdentity } from '../../lib/ooe/job-launch/job-contract';
import {
  DEFAULT_DERIVATIVE_POINT_WORKBENCH,
  DEFAULT_DERIVATIVE_WORKBENCH,
} from '../../lib/calculus/calculus-workbench';
import { derivativeVariableOrDefault } from '../../lib/calculus/derivative-target';
import { isCalculusMode } from '../../lib/calculus/calculus-identity';
import { trimHarmlessTrailingMathSpacing } from '../../lib/input/input-canonicalization';
import { ooeJobContextFromHistoryTicket, type PendingHistoryTicketReservation } from '../../lib/ooe/job-launch/launch-tickets';
import {
  buildCalculusRequestFromState,
  buildCalculusWorkbenchExpression,
  calculusRevisionRequestFromSurfaceState,
} from './calculus-origin-request';
import type {
  CalculusMenuSelectionState,
  CalculusSurfaceState,
} from './workspace-surface-state';
import type { WorkspaceInstance } from './workspace-instances';
import { resolveWorkspaceOriginInputRevision } from './workspace-origin-input-revision';
import type { WorkspaceInstanceRuntimeContext } from '../../types/calculator/workspace-instance-types';
import type {
  CalculusScreen,
  CalculusDefiniteIntegralState,
  CalculusFiniteLimitState,
  CalculusImproperIntegralState,
  CalculusIndefiniteIntegralState,
  CalculusInfiniteLimitState,
  DerivativePointWorkbenchState,
  DerivativeWorkbenchState,
  DisplayOutcome,
  FirstOrderOdeState,
  GuideExample,
  HistoryEntry,
  LaplaceTransformState,
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
  screen: CalculusScreen;
  generatedLatex: string;
  derivative: DerivativeWorkbenchState;
  derivativePoint: DerivativePointWorkbenchState;
  indefiniteIntegral: CalculusIndefiniteIntegralState;
  definiteIntegral: CalculusDefiniteIntegralState;
  improperIntegral: CalculusImproperIntegralState;
  finiteLimit: CalculusFiniteLimitState;
  infiniteLimit: CalculusInfiniteLimitState;
  maclaurin: SeriesState;
  taylor: SeriesState;
  laplace: LaplaceTransformState;
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
  getActiveWorkspaceInstanceRuntimeContext?: () => WorkspaceInstanceRuntimeContext | null;
  getWorkspaceInstances?: () => readonly WorkspaceInstance[];
  isLauncherOpen: boolean;
  openLauncher: () => void;
  replayVariableSubstitutions: ReplayVariableSubstitutions;
  reserveHistoryTicket: (input: {
    mode: ModeId;
    inputLatex: string;
    capabilityId?: string;
    inputRevisionId?: string;
    workspaceInstance?: WorkspaceInstanceRuntimeContext | null;
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

function copyCalculusMenuSelection(selection: CalculusMenuSelectionState) {
  return { ...selection };
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
    case 'laplace':
      return { calculusScreen: state.screen, calculusSeed: { ...state.laplace } };
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
  getActiveWorkspaceInstanceRuntimeContext,
  getWorkspaceInstances,
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
  const [calculusScreen, setCalculusScreen] = useState<CalculusScreen>('home');
  const [calculusMenuSelection, setCalculusMenuSelection] = useState(
    defaultCalculusMenuSelection,
  );
  const [derivativeWorkbench, setDerivativeWorkbench] = useState<DerivativeWorkbenchState>(
    DEFAULT_DERIVATIVE_WORKBENCH,
  );
  const [derivativePointWorkbench, setDerivativePointWorkbench] =
    useState<DerivativePointWorkbenchState>(DEFAULT_DERIVATIVE_POINT_WORKBENCH);
  const [calculusIndefiniteIntegral, setCalculusIndefiniteIntegral] =
    useState<CalculusIndefiniteIntegralState>(DEFAULT_CALCULUS_INDEFINITE_INTEGRAL_STATE);
  const [calculusDefiniteIntegral, setCalculusDefiniteIntegral] =
    useState<CalculusDefiniteIntegralState>(DEFAULT_CALCULUS_DEFINITE_INTEGRAL_STATE);
  const [calculusImproperIntegral, setCalculusImproperIntegral] =
    useState<CalculusImproperIntegralState>(DEFAULT_CALCULUS_IMPROPER_INTEGRAL_STATE);
  const [calculusFiniteLimit, setCalculusFiniteLimit] =
    useState<CalculusFiniteLimitState>(DEFAULT_CALCULUS_FINITE_LIMIT_STATE);
  const [calculusInfiniteLimit, setCalculusInfiniteLimit] =
    useState<CalculusInfiniteLimitState>(DEFAULT_CALCULUS_INFINITE_LIMIT_STATE);
  const [maclaurinState, setMaclaurinState] = useState<SeriesState>(DEFAULT_MACLAURIN_STATE);
  const [taylorState, setTaylorState] = useState<SeriesState>(DEFAULT_TAYLOR_STATE);
  const [laplaceState, setLaplaceState] = useState<LaplaceTransformState>(DEFAULT_LAPLACE_TRANSFORM_STATE);
  const [partialDerivativeState, setPartialDerivativeState] =
    useState<PartialDerivativeWorkbenchState>(DEFAULT_PARTIAL_DERIVATIVE_STATE);
  const [firstOrderOdeState, setFirstOrderOdeState] =
    useState<FirstOrderOdeState>(DEFAULT_FIRST_ORDER_ODE_STATE);
  const [secondOrderOdeState, setSecondOrderOdeState] =
    useState<SecondOrderOdeState>(DEFAULT_SECOND_ORDER_ODE_STATE);
  const [numericIvpState, setNumericIvpState] = useState<NumericIvpState>(DEFAULT_NUMERIC_IVP_STATE);

  const activeCalculusRuntimeRef = useRef<ActiveCalculusRuntimeState | null>(null);
  const calculusMenuPanelRef = useRef<HTMLDivElement | null>(null);
  const derivativeFieldRef = useRef<MathfieldElement | null>(null);
  const derivativePointFieldRef = useRef<MathfieldElement | null>(null);
  const derivativePointValueRef = useRef<HTMLInputElement | null>(null);
  const calculusIndefiniteFieldRef = useRef<MathfieldElement | null>(null);
  const calculusDefiniteFieldRef = useRef<MathfieldElement | null>(null);
  const calculusImproperFieldRef = useRef<MathfieldElement | null>(null);
  const calculusFiniteLimitFieldRef = useRef<MathfieldElement | null>(null);
  const calculusInfiniteLimitFieldRef = useRef<MathfieldElement | null>(null);
  const maclaurinFieldRef = useRef<MathfieldElement | null>(null);
  const taylorFieldRef = useRef<MathfieldElement | null>(null);
  const partialDerivativeFieldRef = useRef<MathfieldElement | null>(null);
  const firstOrderOdeLhsFieldRef = useRef<MathfieldElement | null>(null);
  const firstOrderOdeRhsFieldRef = useRef<MathfieldElement | null>(null);
  const secondOrderOdeForcingFieldRef = useRef<MathfieldElement | null>(null);
  const numericIvpFieldRef = useRef<MathfieldElement | null>(null);
  const calculusDefiniteLowerRef = useRef<HTMLInputElement | null>(null);
  const calculusImproperLowerRef = useRef<HTMLInputElement | null>(null);
  const calculusFiniteLimitTargetRef = useRef<HTMLInputElement | null>(null);
  const taylorCenterRef = useRef<HTMLInputElement | null>(null);
  const secondOrderA2Ref = useRef<HTMLInputElement | null>(null);
  const numericIvpX0Ref = useRef<HTMLInputElement | null>(null);

  const calculusRouteMeta = isCalculusMode(currentMode)
    ? getCalculusRouteMeta(calculusScreen)
    : null;
  const isCalculusMenuOpen =
    !isLauncherOpen && isCalculusMode(currentMode) && isCalculusMenuScreen(calculusScreen);
  const calculusMenuEntries = isCalculusMenuOpen
    ? getCalculusMenuEntries(calculusScreen)
    : [];
  const currentCalculusMenuIndex = isCalculusMenuOpen
    ? calculusMenuSelection[
      calculusScreen as keyof typeof calculusMenuSelection
    ]
    : 0;
  const selectedCalculusMenuEntry = isCalculusMenuOpen
    ? getCalculusMenuEntryAtIndex(calculusScreen, currentCalculusMenuIndex)
    : undefined;
  const calculusMenuFooterText = isCalculusMode(currentMode)
    ? getCalculusMenuFooterText(calculusScreen)
    : '';
  const calculusStateSnapshot = {
    derivative: derivativeWorkbench,
    derivativePoint: derivativePointWorkbench,
    indefiniteIntegral: calculusIndefiniteIntegral,
    definiteIntegral: calculusDefiniteIntegral,
    improperIntegral: calculusImproperIntegral,
    finiteLimit: calculusFiniteLimit,
    infiniteLimit: calculusInfiniteLimit,
    maclaurin: maclaurinState,
    taylor: taylorState,
    laplace: laplaceState,
    partialDerivative: partialDerivativeState,
    firstOrderOde: firstOrderOdeState,
    secondOrderOde: secondOrderOdeState,
    numericIvp: numericIvpState,
  };
  const calculusWorkbenchExpression =
    buildCalculusWorkbenchExpression(calculusScreen, calculusStateSnapshot);
  const calculusMainEditorActive =
    !isLauncherOpen
    && isCalculusMode(currentMode)
    && isCalculusMainEditorScreen(calculusScreen);
  const calculusMainEditorLatex =
    calculusScreen === 'derivative'
      ? derivativeWorkbench.bodyLatex
      : calculusScreen === 'derivativePoint'
        ? derivativePointWorkbench.bodyLatex
        : calculusScreen === 'indefiniteIntegral'
          ? calculusIndefiniteIntegral.bodyLatex
          : calculusScreen === 'definiteIntegral'
            ? calculusDefiniteIntegral.bodyLatex
            : calculusScreen === 'improperIntegral'
              ? calculusImproperIntegral.bodyLatex
              : calculusScreen === 'laplace'
                ? laplaceState.bodyLatex
                : calculusScreen === 'partialDerivative' ? partialDerivativeState.bodyLatex : '';
  const calculusMainEditorVariable = calculusScreen === 'derivative'
    ? derivativeVariableOrDefault(derivativeWorkbench.variable)
    : calculusScreen === 'derivativePoint'
      ? derivativeVariableOrDefault(derivativePointWorkbench.variable)
      : calculusScreen === 'partialDerivative' ? derivativeVariableOrDefault(partialDerivativeState.variable)
      : calculusScreen === 'laplace' ? 't' : 'x';
  const activeCalculusRuntimeState: ActiveCalculusRuntimeState = {
    screen: calculusScreen,
    generatedLatex: trimHarmlessTrailingMathSpacing(calculusWorkbenchExpression),
    ...calculusStateSnapshot,
    angleUnit: settings.angleUnit,
    outputStyle: settings.outputStyle,
    ansLatex,
    variableMemory: storedVariables,
    replayVariableSubstitutions,
  };
  activeCalculusRuntimeRef.current = activeCalculusRuntimeState;

  function openCalculusScreen(screen: CalculusScreen) {
    setCalculusScreen(screen);
    setDisplayOutcome(null);
  }

  function setCurrentCalculusMenuIndex(screen: CalculusMenuScreen, index: number) {
    setCalculusMenuSelection((currentSelection) => ({
      ...currentSelection,
      [screen]: index,
    }));
  }

  function setCalculusMainEditorLatex(bodyLatex: string) {
    if (calculusScreen === 'derivative') {
      setDerivativeWorkbench((currentState) => ({ ...currentState, bodyLatex }));
      return;
    }

    if (calculusScreen === 'derivativePoint') {
      setDerivativePointWorkbench((currentState) => ({ ...currentState, bodyLatex }));
      return;
    }

    if (calculusScreen === 'indefiniteIntegral') {
      setCalculusIndefiniteIntegral((currentState) => ({ ...currentState, bodyLatex }));
      return;
    }

    if (calculusScreen === 'definiteIntegral') {
      setCalculusDefiniteIntegral((currentState) => ({ ...currentState, bodyLatex }));
      return;
    }

    if (calculusScreen === 'improperIntegral') {
      setCalculusImproperIntegral((currentState) => ({ ...currentState, bodyLatex }));
      return;
    }

    if (calculusScreen === 'laplace') {
      setLaplaceState({ bodyLatex });
    } else if (calculusScreen === 'partialDerivative') {
      setPartialDerivativeState((currentState) => ({ ...currentState, bodyLatex }));
    }
  }
  function moveCurrentCalculusMenuSelection(delta: number) {
    if (!isCalculusMenuOpen) {
      return;
    }

    setCurrentCalculusMenuIndex(
      calculusScreen as CalculusMenuScreen,
      moveCalculusMenuIndex(calculusScreen, currentCalculusMenuIndex, delta),
    );
  }

  function openSelectedCalculusMenuEntry() {
    if (!selectedCalculusMenuEntry) {
      return;
    }

    openCalculusScreen(selectedCalculusMenuEntry.target);
  }

  function goBackInCalculus() {
    const parentScreen = getCalculusParentScreen(calculusScreen);
    if (parentScreen) {
      openCalculusScreen(parentScreen);
    } else {
      openLauncher();
    }
  }

  function openCalculusParentOrHome() {
    openCalculusScreen(getCalculusParentScreen(calculusScreen) ?? 'home');
  }

  function applyCalculusSeed(
    screen: CalculusScreen,
    seed: GuideExample['launch']['calculusSeed'],
  ) {
    if (!seed) {
      return;
    }

    if (screen === 'derivative') {
      setDerivativeWorkbench((currentState) => ({ ...currentState, bodyLatex: seed.bodyLatex ?? currentState.bodyLatex, variable: seed.variable ?? currentState.variable, operatorLatex: seed.operatorLatex ?? currentState.operatorLatex }));
      return;
    }

    if (screen === 'derivativePoint') {
      setDerivativePointWorkbench((currentState) => ({ ...currentState, bodyLatex: seed.bodyLatex ?? currentState.bodyLatex, point: seed.point ?? currentState.point, variable: seed.variable ?? currentState.variable, operatorLatex: seed.operatorLatex ?? currentState.operatorLatex }));
      return;
    }

    if (screen === 'indefiniteIntegral') {
      setCalculusIndefiniteIntegral((currentState) => ({
        ...currentState,
        bodyLatex: seed.bodyLatex ?? currentState.bodyLatex,
        integrationVariable: seed.integrationVariable ?? currentState.integrationVariable,
      }));
      return;
    }

    if (screen === 'definiteIntegral') {
      setCalculusDefiniteIntegral((currentState) => ({
        ...currentState,
        bodyLatex: seed.bodyLatex ?? currentState.bodyLatex,
        integrationVariable: seed.integrationVariable ?? currentState.integrationVariable,
        lower: seed.lower ?? currentState.lower,
        upper: seed.upper ?? currentState.upper,
      }));
      return;
    }

    if (screen === 'improperIntegral') {
      setCalculusImproperIntegral((currentState) => ({
        ...currentState,
        bodyLatex: seed.bodyLatex ?? currentState.bodyLatex,
        integrationVariable: seed.integrationVariable ?? currentState.integrationVariable,
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

    if (screen === 'laplace') {
      setLaplaceState((currentState) => ({
        ...currentState,
        bodyLatex: seed.bodyLatex ?? currentState.bodyLatex,
      }));
      return;
    }

    if (screen === 'partialDerivative') {
      setPartialDerivativeState((currentState) => ({
        ...currentState,
        bodyLatex: seed.bodyLatex ?? currentState.bodyLatex,
        variable: seed.variable ?? currentState.variable,
        operatorLatex: seed.operatorLatex ?? currentState.operatorLatex,
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

  function currentCalculusHistoryContext() {
    return calculusHistoryContextFromState(activeCalculusRuntimeState);
  }

  function restoreCalculusHistoryEntry(entry: HistoryEntry) {
    const replayScreen = entry.calculusScreen;
    const replaySeed = entry.calculusSeed;
    if (replayScreen) {
      openCalculusScreen(replayScreen);
      applyCalculusSeed(replayScreen, replaySeed);
    } else if (
      entry.inputLatex.startsWith('\\left.\\frac{d}')
      || entry.inputLatex.startsWith('\\left.\\frac{\\mathrm{d}}')
    ) {
      openCalculusScreen('derivativePoint');
    } else if (
      entry.inputLatex.startsWith('\\frac{d}')
      || entry.inputLatex.startsWith('\\frac{\\mathrm{d}}')
    ) {
      openCalculusScreen('derivative');
    } else if (entry.inputLatex.startsWith('\\int_{-\\infty}') || entry.inputLatex.includes('\\infty')) {
      openCalculusScreen('improperIntegral');
    } else if (entry.inputLatex.startsWith('\\int_')) {
      openCalculusScreen('definiteIntegral');
    } else if (entry.inputLatex.startsWith('\\int')) {
      openCalculusScreen('indefiniteIntegral');
    } else if (
      entry.inputLatex.startsWith('\\lim_{x\\to \\infty}')
      || entry.inputLatex.startsWith('\\lim_{x\\to -\\infty}')
    ) {
      openCalculusScreen('infiniteLimit');
    } else if (entry.inputLatex.startsWith('\\lim_')) {
      openCalculusScreen('finiteLimit');
    } else if (entry.inputLatex.startsWith('\\text{Maclaurin}')) {
      openCalculusScreen('maclaurin');
    } else if (entry.inputLatex.startsWith('\\text{Taylor}')) {
      openCalculusScreen('taylor');
    } else if (entry.inputLatex.startsWith('\\mathcal{L}')) {
      openCalculusScreen('laplace');
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

  function resetCurrentCalculusScreen() {
    if (isCalculusMenuOpen) {
      goBackInCalculus();
    } else if (calculusScreen === 'derivative') {
      setDerivativeWorkbench(DEFAULT_DERIVATIVE_WORKBENCH);
    } else if (calculusScreen === 'derivativePoint') {
      setDerivativePointWorkbench(DEFAULT_DERIVATIVE_POINT_WORKBENCH);
    } else if (calculusScreen === 'indefiniteIntegral') {
      setCalculusIndefiniteIntegral(DEFAULT_CALCULUS_INDEFINITE_INTEGRAL_STATE);
    } else if (calculusScreen === 'definiteIntegral') {
      setCalculusDefiniteIntegral(DEFAULT_CALCULUS_DEFINITE_INTEGRAL_STATE);
    } else if (calculusScreen === 'improperIntegral') {
      setCalculusImproperIntegral(DEFAULT_CALCULUS_IMPROPER_INTEGRAL_STATE);
    } else if (calculusScreen === 'finiteLimit') {
      setCalculusFiniteLimit(DEFAULT_CALCULUS_FINITE_LIMIT_STATE);
    } else if (calculusScreen === 'infiniteLimit') {
      setCalculusInfiniteLimit(DEFAULT_CALCULUS_INFINITE_LIMIT_STATE);
    } else if (calculusScreen === 'maclaurin') {
      setMaclaurinState(DEFAULT_MACLAURIN_STATE);
    } else if (calculusScreen === 'taylor') {
      setTaylorState(DEFAULT_TAYLOR_STATE);
    } else if (calculusScreen === 'laplace') {
      setLaplaceState(DEFAULT_LAPLACE_TRANSFORM_STATE);
    } else if (calculusScreen === 'partialDerivative') {
      setPartialDerivativeState(DEFAULT_PARTIAL_DERIVATIVE_STATE);
    } else if (calculusScreen === 'odeFirstOrder') {
      setFirstOrderOdeState(DEFAULT_FIRST_ORDER_ODE_STATE);
    } else if (calculusScreen === 'odeSecondOrder') {
      setSecondOrderOdeState(DEFAULT_SECOND_ORDER_ODE_STATE);
    } else if (calculusScreen === 'odeNumericIvp') {
      setNumericIvpState(DEFAULT_NUMERIC_IVP_STATE);
    }
  }

  function resetCalculusRuntime() {
    setCalculusScreen('home');
    setCalculusMenuSelection(defaultCalculusMenuSelection());
    setDerivativeWorkbench(DEFAULT_DERIVATIVE_WORKBENCH);
    setDerivativePointWorkbench(DEFAULT_DERIVATIVE_POINT_WORKBENCH);
    setCalculusIndefiniteIntegral(DEFAULT_CALCULUS_INDEFINITE_INTEGRAL_STATE);
    setCalculusDefiniteIntegral(DEFAULT_CALCULUS_DEFINITE_INTEGRAL_STATE);
    setCalculusImproperIntegral(DEFAULT_CALCULUS_IMPROPER_INTEGRAL_STATE);
    setCalculusFiniteLimit(DEFAULT_CALCULUS_FINITE_LIMIT_STATE);
    setCalculusInfiniteLimit(DEFAULT_CALCULUS_INFINITE_LIMIT_STATE);
    setMaclaurinState(DEFAULT_MACLAURIN_STATE);
    setTaylorState(DEFAULT_TAYLOR_STATE);
    setLaplaceState(DEFAULT_LAPLACE_TRANSFORM_STATE);
    setPartialDerivativeState(DEFAULT_PARTIAL_DERIVATIVE_STATE);
    setFirstOrderOdeState(DEFAULT_FIRST_ORDER_ODE_STATE);
    setSecondOrderOdeState(DEFAULT_SECOND_ORDER_ODE_STATE);
    setNumericIvpState(DEFAULT_NUMERIC_IVP_STATE);
  }

  function captureCalculusSurfaceState(): CalculusSurfaceState {
    return {
      calculusScreen,
      calculusMenuSelection: copyCalculusMenuSelection(calculusMenuSelection),
      derivativeWorkbench: { ...derivativeWorkbench },
      derivativePointWorkbench: { ...derivativePointWorkbench },
      calculusIndefiniteIntegral: { ...calculusIndefiniteIntegral },
      calculusDefiniteIntegral: { ...calculusDefiniteIntegral },
      calculusImproperIntegral: { ...calculusImproperIntegral },
      calculusFiniteLimit: { ...calculusFiniteLimit },
      calculusInfiniteLimit: { ...calculusInfiniteLimit },
      maclaurinState: { ...maclaurinState },
      taylorState: { ...taylorState },
      laplaceState: { ...laplaceState },
      partialDerivativeState: { ...partialDerivativeState },
      firstOrderOdeState: { ...firstOrderOdeState },
      secondOrderOdeState: { ...secondOrderOdeState },
      numericIvpState: { ...numericIvpState },
    };
  }

  function restoreCalculusSurfaceState(state: CalculusSurfaceState | null) {
    if (!state) {
      resetCalculusRuntime();
      return;
    }

    setCalculusScreen(state.calculusScreen);
    setCalculusMenuSelection(copyCalculusMenuSelection(state.calculusMenuSelection));
    setDerivativeWorkbench({ ...state.derivativeWorkbench });
    setDerivativePointWorkbench({ ...state.derivativePointWorkbench });
    setCalculusIndefiniteIntegral({ ...state.calculusIndefiniteIntegral });
    setCalculusDefiniteIntegral({ ...state.calculusDefiniteIntegral });
    setCalculusImproperIntegral({ ...state.calculusImproperIntegral });
    setCalculusFiniteLimit({ ...state.calculusFiniteLimit });
    setCalculusInfiniteLimit({ ...state.calculusInfiniteLimit });
    setMaclaurinState({ ...state.maclaurinState });
    setTaylorState({ ...state.taylorState });
    setLaplaceState({ ...state.laplaceState });
    setPartialDerivativeState({ ...state.partialDerivativeState });
    setFirstOrderOdeState({ ...state.firstOrderOdeState });
    setSecondOrderOdeState({ ...state.secondOrderOdeState });
    setNumericIvpState({ ...state.numericIvpState });
  }

  function runCalculusAction() {
    const generated = trimHarmlessTrailingMathSpacing(calculusWorkbenchExpression);
    if (!generated || !calculusRouteMeta || isCalculusMenuOpen) {
      setDisplayOutcome({
        kind: 'error',
        title: calculusRouteMeta?.label ?? 'Calculus',
        error: calculusRouteMeta
          ? `Fill the ${calculusRouteMeta.label.toLowerCase()} inputs before evaluating.`
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

    const launchWorkspaceInstance = getActiveWorkspaceInstanceRuntimeContext?.() ?? null;

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
            workspaceInstance: launchWorkspaceInstance,
          });
          launchedHistoryTicket = historyTicket;

          const result = await runCalculusModeWithOoePilot(request, {
            generatedLatex: generated,
            activeInputRevisionId: (job: OoeJobIdentity) => {
              const activeState = activeCalculusRuntimeRef.current;
              return resolveWorkspaceOriginInputRevision(job, {
                buildInputRevisionId: (input) =>
                  buildCalculusOoeInputRevisionId(input.request, input.generatedLatex),
                getActiveWorkspaceInstanceRuntimeContext,
                getWorkspaceInstances,
                readLiveRequest: () => activeState
                  ? {
                      generatedLatex: activeState.generatedLatex,
                      request: buildCalculusRequestFromState(activeState),
                    }
                  : null,
                readRequestFromSurfaceState: (surfaceState, instance) =>
                  calculusRevisionRequestFromSurfaceState(surfaceState, instance, {
                    settings,
                    storedVariables,
                  }),
              });
            },
            ...ooeJobContextFromHistoryTicket(historyTicket),
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
    calculusMenuEntries,
    calculusMenuFooterText,
    calculusMenuSelection,
    calculusRouteMeta,
    calculusMainEditorActive,
    calculusMainEditorLatex,
    calculusMainEditorVariable,
    calculusScreen,
    calculusStateSnapshot,
    calculusWorkbenchExpression,
    calculusDefiniteFieldRef,
    calculusDefiniteIntegral,
    calculusDefiniteLowerRef,
    calculusFiniteLimit,
    calculusFiniteLimitFieldRef,
    calculusFiniteLimitTargetRef,
    calculusIndefiniteFieldRef,
    calculusIndefiniteIntegral,
    calculusInfiniteLimit,
    calculusInfiniteLimitFieldRef,
    calculusImproperFieldRef,
    calculusImproperIntegral,
    calculusImproperLowerRef,
    calculusMenuPanelRef,
    applyCalculusSeed,
    captureCalculusSurfaceState,
    currentCalculusHistoryContext,
    currentCalculusMenuIndex,
    derivativeFieldRef,
    derivativePointFieldRef,
    derivativePointValueRef,
    derivativePointWorkbench,
    derivativeWorkbench,
    firstOrderOdeLhsFieldRef,
    firstOrderOdeRhsFieldRef,
    firstOrderOdeState,
    goBackInCalculus,
    isCalculusMenuOpen,
    maclaurinFieldRef,
    maclaurinState,
    laplaceState,
    moveCurrentCalculusMenuSelection,
    numericIvpFieldRef,
    numericIvpState,
    numericIvpX0Ref,
    openCalculusParentOrHome,
    openCalculusScreen,
    openSelectedCalculusMenuEntry,
    partialDerivativeFieldRef,
    partialDerivativeState,
    resetCalculusRuntime,
    resetCurrentCalculusScreen,
    restoreCalculusSurfaceState,
    restoreCalculusHistoryEntry,
    runCalculusAction,
    secondOrderA2Ref,
    secondOrderOdeForcingFieldRef,
    secondOrderOdeState,
    selectedCalculusMenuEntry,
    setCalculusMenuSelection,
    setCalculusScreen,
    setCalculusDefiniteIntegral,
    setCalculusFiniteLimit,
    setCalculusImproperIntegral,
    setCalculusMainEditorLatex,
    setCalculusIndefiniteIntegral,
    setCalculusInfiniteLimit,
    setCurrentCalculusMenuIndex,
    setDerivativePointWorkbench,
    setDerivativeWorkbench,
    setFirstOrderOdeState,
    setMaclaurinState,
    setLaplaceState,
    setNumericIvpState,
    setPartialDerivativeState,
    setSecondOrderOdeState,
    setTaylorState,
    taylorCenterRef,
    taylorFieldRef,
    taylorState,
  };
}
