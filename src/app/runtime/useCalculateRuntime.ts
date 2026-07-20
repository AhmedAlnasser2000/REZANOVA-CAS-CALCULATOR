import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from 'react';
import type { MathfieldElement } from 'mathlive';
import type { AlgebraTransformAction } from '../../lib/algebra/algebra-transform-ui';
import type { OoeJobIdentity } from '../../lib/ooe/job-launch/job-contract';
import {
  DEFAULT_DERIVATIVE_POINT_WORKBENCH,
  DEFAULT_DERIVATIVE_WORKBENCH,
  DEFAULT_INTEGRAL_WORKBENCH,
  DEFAULT_LIMIT_WORKBENCH,
  buildWorkbenchExpression,
  cycleIntegralKind as nextIntegralKind,
  cycleLimitDirection as nextLimitDirection,
} from '../../lib/calculus/calculus-workbench';
import { trimHarmlessTrailingMathSpacing } from '../../lib/input/input-canonicalization';
import {
  getCalculateMenuEntries,
  getCalculateMenuEntryAtIndex,
  getCalculateMenuEntryByHotkey,
  getCalculateMenuFooterText,
  getCalculateRouteMeta,
  isCalculateMenuScreen,
  isCalculateToolScreen,
  moveCalculateMenuIndex,
  type CalculateMenuEntry,
} from '../../lib/modes/calculate-navigation';
import {
  createCalculateRuntimeController,
} from '../logic/runtimeControllers';
import type { CalculateSurfaceState } from './workspace-surface-state';
import type {
  RunCalculateModeRequest,
  RunCalculateRuntimeRequest,
} from '../../lib/modes/calculate';
import type { PendingHistoryTicketReservation } from '../../lib/ooe/job-launch/launch-tickets';
import type { WorkspaceInstanceRuntimeContext } from '../../types/calculator/workspace-instance-types';
import { normalizeWorkspaceDisplayState } from './workspace-display-state';
import type {
  WorkspaceInstance,
  WorkspaceInstanceStateSlot,
} from './workspace-instances';
import { resolveWorkspaceOriginInputRevision } from './workspace-origin-input-revision';
import type {
  CalculusScreen,
  CalculateRouteMeta,
  CalculateScreen,
  DerivativePointWorkbenchState,
  DerivativeWorkbenchState,
  CanonicalRuntimeOutcome,
  GuideExample,
  HistoryEntry,
  IntegralWorkbenchState,
  LimitDirection,
  LimitWorkbenchState,
  ModeId,
  Settings,
  StoredVariableValue,
  VariableSubstitutionSnapshot,
} from '../../types/calculator';
import { retitleCanonicalRuntimeOutcome } from '../../lib/result-contract/runtime-outcome';

type TransitionFn = (callback: () => void) => void;

type CalculateReplayVariableSubstitutions = {
  inputLatex: string;
  substitutions: VariableSubstitutionSnapshot[];
} | null;

type ActiveCalculateRuntimeState = {
  calculateLatex: string;
  calculateScreen: CalculateScreen;
  calculateRouteMeta: CalculateRouteMeta | null;
  calculateWorkbenchExpression: {
    latex: string;
    limitDirection?: LimitDirection;
  };
  limitWorkbench: LimitWorkbenchState;
  settings: Pick<Settings, 'angleUnit' | 'outputStyle'>;
  ansLatex: string;
  variableMemory: StoredVariableValue[];
  calculateReplayVariableSubstitutions: CalculateReplayVariableSubstitutions;
};

type CalculateOoeRouteDescriptor =
  | {
      kind: 'standard';
      action: RunCalculateModeRequest['action'];
    }
  | {
      kind: 'algebraTransform';
      action: AlgebraTransformAction;
    }
  | {
      kind: 'legacyWorkbench';
    };

type CommitCalculateOutcome = (
  outcome: CanonicalRuntimeOutcome,
  inputLatex: string,
  mode: 'calculate' | 'equation',
  context?: Partial<Pick<HistoryEntry, 'calculateScreen' | 'calculateSeed'>> & {
    historyTicketId?: string | null;
    historyLaunchOrder?: number;
    suppressDisplayCommit?: boolean;
  },
) => void;

type UseCalculateRuntimeOptions = {
  ansLatex: string;
  commitOutcome: CommitCalculateOutcome;
  currentMode: ModeId;
  currentModeRef: RefObject<ModeId>;
  calculateScreenRef?: RefObject<CalculateScreen>;
  discardHistoryTicket: (ticketId?: string | null) => void;
  getActiveWorkspaceInstanceRuntimeContext?: () => WorkspaceInstanceRuntimeContext | null;
  getWorkspaceInstances?: () => readonly WorkspaceInstance[];
  isLauncherOpen: boolean;
  openCalculusScreen: (screen: CalculusScreen) => void;
  openLegacyCalculateCalculusInCalculus: (
    screen: CalculateScreen | null | undefined,
    seed: GuideExample['launch']['calculateSeed'],
  ) => boolean;
  reserveHistoryTicket: (input: {
    mode: ModeId;
    inputLatex: string;
    capabilityId?: string;
    inputRevisionId?: string;
    workspaceInstance?: WorkspaceInstanceRuntimeContext | null;
  }) => PendingHistoryTicketReservation | null;
  routeToModeDestination?: (mode: ModeId, applyDestination: () => void) => boolean;
  settings: Pick<Settings, 'angleUnit' | 'outputStyle'>;
  setDisplayOutcome: (outcome: CanonicalRuntimeOutcome | null) => void;
  setMode: (mode: ModeId) => void;
  setRuntimeStatusOverride: (status: string | null) => void;
  startTransition: TransitionFn;
  storedVariables: StoredVariableValue[];
  derivativeFieldRef: RefObject<MathfieldElement | null>;
  derivativePointFieldRef: RefObject<MathfieldElement | null>;
  derivativePointValueRef: RefObject<HTMLInputElement | null>;
  derivativeWorkbench: DerivativeWorkbenchState;
  derivativePointWorkbench: DerivativePointWorkbenchState;
  setDerivativeWorkbench: Dispatch<SetStateAction<DerivativeWorkbenchState>>;
  setDerivativePointWorkbench: Dispatch<SetStateAction<DerivativePointWorkbenchState>>;
};

function retitleOutcome(outcome: CanonicalRuntimeOutcome, title: string): CanonicalRuntimeOutcome {
  return retitleCanonicalRuntimeOutcome(outcome, title);
}

function isCalculateSurfaceState(value: WorkspaceInstanceStateSlot): value is CalculateSurfaceState {
  return typeof value === 'object'
    && value !== null
    && typeof (value as CalculateSurfaceState).calculateLatex === 'string';
}

function buildCalculateRuntimeRequestFromState(
  active: ActiveCalculateRuntimeState,
  route: CalculateOoeRouteDescriptor,
): RunCalculateRuntimeRequest | null {
  if (route.kind === 'algebraTransform') {
    const executionLatex = trimHarmlessTrailingMathSpacing(active.calculateLatex);
    return {
      kind: 'algebraTransform',
      request: {
        action: route.action,
        latex: executionLatex,
        angleUnit: active.settings.angleUnit,
        storedVariables: active.variableMemory,
        variableSubstitutionSnapshot:
          active.calculateReplayVariableSubstitutions?.inputLatex === executionLatex
            ? active.calculateReplayVariableSubstitutions.substitutions
            : undefined,
      },
    };
  }

  if (route.kind === 'legacyWorkbench') {
    const generated = trimHarmlessTrailingMathSpacing(active.calculateWorkbenchExpression.latex);
    if (!generated || !active.calculateRouteMeta) {
      return null;
    }

    return {
      kind: 'legacyWorkbench',
      title: active.calculateRouteMeta.label,
      request: {
        action: 'evaluate',
        latex: generated,
        angleUnit: active.settings.angleUnit,
        outputStyle: active.settings.outputStyle,
        ansLatex: active.ansLatex,
        calculateScreen: active.calculateScreen,
        limitDirection: active.calculateWorkbenchExpression.limitDirection,
        limitTargetKind:
          active.calculateScreen === 'limit' ? active.limitWorkbench.targetKind : undefined,
        storedVariables: active.variableMemory,
        variableSubstitutionSnapshot:
          active.calculateReplayVariableSubstitutions?.inputLatex === generated
            ? active.calculateReplayVariableSubstitutions.substitutions
            : undefined,
      },
    };
  }

  if (active.calculateScreen !== 'standard') {
    return null;
  }

  const executionLatex = trimHarmlessTrailingMathSpacing(active.calculateLatex);
  return {
    kind: 'standard',
    request: {
      action: route.action,
      latex: executionLatex,
      angleUnit: active.settings.angleUnit,
      outputStyle: active.settings.outputStyle,
      ansLatex: active.ansLatex,
      calculateScreen: active.calculateScreen,
      storedVariables: active.variableMemory,
      variableSubstitutionSnapshot:
        active.calculateReplayVariableSubstitutions?.inputLatex === executionLatex
          ? active.calculateReplayVariableSubstitutions.substitutions
          : undefined,
    },
  };
}

function copyReplayVariableSubstitutions(
  state: CalculateReplayVariableSubstitutions,
): CalculateReplayVariableSubstitutions {
  return state
    ? {
        inputLatex: state.inputLatex,
        substitutions: state.substitutions.map((substitution) => ({ ...substitution })),
      }
    : null;
}

export function useCalculateRuntime({
  ansLatex,
  calculateScreenRef,
  commitOutcome,
  currentMode,
  currentModeRef,
  discardHistoryTicket,
  getActiveWorkspaceInstanceRuntimeContext,
  getWorkspaceInstances,
  isLauncherOpen,
  openCalculusScreen,
  openLegacyCalculateCalculusInCalculus,
  reserveHistoryTicket,
  routeToModeDestination,
  settings,
  setDisplayOutcome,
  setMode,
  setRuntimeStatusOverride,
  startTransition,
  storedVariables,
  derivativeFieldRef,
  derivativePointFieldRef,
  derivativePointValueRef,
  derivativeWorkbench,
  derivativePointWorkbench,
  setDerivativeWorkbench,
  setDerivativePointWorkbench,
}: UseCalculateRuntimeOptions) {
  const [calculateLatex, setCalculateLatex] = useState('');
  const [calculateScreen, setCalculateScreenState] = useState<CalculateScreen>('standard');
  const [calculateAlgebraTrayOpen, setCalculateAlgebraTrayOpen] = useState(false);
  const [calculateMenuSelection, setCalculateMenuSelection] = useState(0);
  const [calculateReplayVariableSubstitutions, setCalculateReplayVariableSubstitutions] =
    useState<CalculateReplayVariableSubstitutions>(null);
  const [integralWorkbench, setIntegralWorkbench] =
    useState<IntegralWorkbenchState>(DEFAULT_INTEGRAL_WORKBENCH);
  const [limitWorkbench, setLimitWorkbench] =
    useState<LimitWorkbenchState>(DEFAULT_LIMIT_WORKBENCH);

  const activeCalculateRuntimeRef = useRef<ActiveCalculateRuntimeState | null>(null);
  const calculateMenuPanelRef = useRef<HTMLDivElement | null>(null);
  const integralFieldRef = useRef<MathfieldElement | null>(null);
  const limitFieldRef = useRef<MathfieldElement | null>(null);
  const integralLowerRef = useRef<HTMLInputElement | null>(null);
  const limitTargetRef = useRef<HTMLInputElement | null>(null);

  function setCalculateScreen(screen: CalculateScreen) {
    if (calculateScreenRef) {
      calculateScreenRef.current = screen;
    }
    setCalculateScreenState(screen);
  }

  const calculateRouteMeta = currentMode === 'calculate'
    ? getCalculateRouteMeta(calculateScreen)
    : null;
  const isCalculateMenuOpen =
    !isLauncherOpen && currentMode === 'calculate' && isCalculateMenuScreen(calculateScreen);
  const isCalculateToolOpen =
    !isLauncherOpen && currentMode === 'calculate' && isCalculateToolScreen(calculateScreen);
  const calculateMenuEntries = isCalculateMenuOpen
    ? getCalculateMenuEntries(calculateScreen)
    : [];
  const selectedCalculateMenuEntry = isCalculateMenuOpen
    ? getCalculateMenuEntryAtIndex(calculateScreen, calculateMenuSelection)
    : undefined;
  const calculateMenuFooterText = currentMode === 'calculate'
    ? getCalculateMenuFooterText(calculateScreen)
    : '';
  const calculateWorkbenchExpression = useMemo(
    () => currentMode === 'calculate'
      ? buildWorkbenchExpression(
        calculateScreen,
        derivativeWorkbench,
        derivativePointWorkbench,
        integralWorkbench,
        limitWorkbench,
      )
      : { latex: '' },
    [
      calculateScreen,
      currentMode,
      derivativePointWorkbench,
      derivativeWorkbench,
      integralWorkbench,
      limitWorkbench,
    ],
  );

  useEffect(() => {
    activeCalculateRuntimeRef.current = {
      calculateLatex,
      calculateScreen,
      calculateRouteMeta,
      calculateWorkbenchExpression,
      limitWorkbench,
      settings,
      ansLatex,
      variableMemory: storedVariables,
      calculateReplayVariableSubstitutions,
    };
  }, [
    ansLatex,
    calculateLatex,
    calculateReplayVariableSubstitutions,
    calculateRouteMeta,
    calculateScreen,
    calculateWorkbenchExpression,
    limitWorkbench,
    settings,
    storedVariables,
  ]);

  function openCalculateScreen(screen: CalculateScreen) {
    setCalculateScreen(screen);
    if (isCalculateMenuScreen(screen)) {
      setCalculateMenuSelection(0);
    }
    setDisplayOutcome(null);
  }

  function openModeDestination(mode: ModeId, applyDestination: () => void) {
    if (routeToModeDestination) {
      routeToModeDestination(mode, applyDestination);
      return;
    }

    setMode(mode);
    applyDestination();
  }

  function moveCurrentCalculateMenuSelection(delta: number) {
    setCalculateMenuSelection((currentSelection) =>
      moveCalculateMenuIndex(calculateScreen, currentSelection, delta),
    );
  }

  function openCalculateMenuEntry(entry: CalculateMenuEntry) {
    if (entry.target.kind === 'calculus') {
      const screen = entry.target.screen;
      openModeDestination('calculus', () => openCalculusScreen(screen));
      return;
    }

    const screen = entry.target.screen;
    if (openLegacyCalculateCalculusInCalculus(screen, undefined)) {
      return;
    }

    openModeDestination('calculate', () => openCalculateScreen(screen));
  }

  function openCalculateMenuDigitEntry(digit: string) {
    const entry = getCalculateMenuEntryByHotkey(calculateScreen, digit);
    if (entry) {
      openCalculateMenuEntry(entry);
    }
  }

  function openSelectedCalculateMenuEntry() {
    if (!selectedCalculateMenuEntry) {
      return;
    }

    openCalculateMenuEntry(selectedCalculateMenuEntry);
  }

  function applyCalculateSeed(
    screen: CalculateScreen,
    seed: GuideExample['launch']['calculateSeed'],
  ) {
    if (!seed || screen === 'standard' || screen === 'calculusHome') {
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

  function resetCurrentCalculateScreen() {
    if (calculateScreen === 'standard') {
      setCalculateLatex('');
    } else if (calculateScreen === 'calculusHome') {
      openCalculateScreen('standard');
    } else if (calculateScreen === 'derivative') {
      setDerivativeWorkbench(DEFAULT_DERIVATIVE_WORKBENCH);
    } else if (calculateScreen === 'derivativePoint') {
      setDerivativePointWorkbench(DEFAULT_DERIVATIVE_POINT_WORKBENCH);
    } else if (calculateScreen === 'integral') {
      setIntegralWorkbench((currentState) => ({
        ...DEFAULT_INTEGRAL_WORKBENCH,
        kind: currentState.kind,
      }));
    } else if (calculateScreen === 'limit') {
      setLimitWorkbench((currentState) => ({
        ...DEFAULT_LIMIT_WORKBENCH,
        direction: currentState.direction,
        targetKind: currentState.targetKind,
      }));
    }
  }

  function resetCalculateRuntime() {
    setCalculateLatex('');
    setCalculateScreen('standard');
    setCalculateAlgebraTrayOpen(false);
    setCalculateMenuSelection(0);
    setIntegralWorkbench(DEFAULT_INTEGRAL_WORKBENCH);
    setLimitWorkbench(DEFAULT_LIMIT_WORKBENCH);
    setCalculateReplayVariableSubstitutions(null);
  }

  function captureCalculateSurfaceState(): CalculateSurfaceState {
    return {
      calculateLatex,
      calculateScreen,
      calculateAlgebraTrayOpen,
      calculateMenuSelection,
      calculateReplayVariableSubstitutions: copyReplayVariableSubstitutions(
        calculateReplayVariableSubstitutions,
      ),
      derivativeWorkbench: { ...derivativeWorkbench },
      derivativePointWorkbench: { ...derivativePointWorkbench },
      integralWorkbench: { ...integralWorkbench },
      limitWorkbench: { ...limitWorkbench },
    };
  }

  function restoreCalculateSurfaceState(state: CalculateSurfaceState | null) {
    if (!state) {
      resetCalculateRuntime();
      setDerivativeWorkbench(DEFAULT_DERIVATIVE_WORKBENCH);
      setDerivativePointWorkbench(DEFAULT_DERIVATIVE_POINT_WORKBENCH);
      return;
    }

    setCalculateLatex(state.calculateLatex);
    setCalculateScreen(state.calculateScreen);
    setCalculateAlgebraTrayOpen(state.calculateAlgebraTrayOpen);
    setCalculateMenuSelection(state.calculateMenuSelection);
    setCalculateReplayVariableSubstitutions(copyReplayVariableSubstitutions(
      state.calculateReplayVariableSubstitutions,
    ));
    setDerivativeWorkbench({ ...state.derivativeWorkbench });
    setDerivativePointWorkbench({ ...state.derivativePointWorkbench });
    setIntegralWorkbench({ ...state.integralWorkbench });
    setLimitWorkbench({ ...state.limitWorkbench });
  }

  function toggleCalculateAlgebraTray() {
    setCalculateAlgebraTrayOpen((open) => !open);
  }

  function toggleIntegralKind() {
    setIntegralWorkbench((currentState) => ({
      ...currentState,
      kind: nextIntegralKind(currentState.kind),
    }));
    setDisplayOutcome(null);
  }

  function cycleLimitDirection() {
    setLimitWorkbench((currentState) => ({
      ...currentState,
      direction: nextLimitDirection(currentState.direction),
    }));
    setDisplayOutcome(null);
  }

  function clearCalculateReplayVariableSubstitutions() {
    setCalculateReplayVariableSubstitutions(null);
  }

  function restoreCalculateHistoryEntry(entry: HistoryEntry) {
    if (entry.calculateScreen && entry.calculateScreen !== 'standard') {
      openCalculateScreen(entry.calculateScreen);
      applyCalculateSeed(entry.calculateScreen, entry.calculateSeed);
    } else {
      openCalculateScreen('standard');
      setCalculateLatex(entry.inputLatex);
    }
    const substitutions = entry.resultDocument.metadata?.variableSubstitutions?.map((item) => ({
      name: item.name,
      valueLatex: item.value.canonicalLatex,
      numericValue: item.numericValue,
    }));
    setCalculateReplayVariableSubstitutions(
      substitutions && substitutions.length > 0
        ? { inputLatex: entry.inputLatex, substitutions }
        : null,
    );
  }

  function currentCalculateHistoryContext() {
    return {};
  }

  const getActiveCalculateRuntimeRequest = (
    route: CalculateOoeRouteDescriptor,
  ): RunCalculateRuntimeRequest | null => {
    const active = activeCalculateRuntimeRef.current;
    if (!active) {
      return null;
    }

    return buildCalculateRuntimeRequestFromState(active, route);
  };

  function calculateRuntimeRequestFromSurfaceState(
    surfaceState: WorkspaceInstanceStateSlot,
    instance: WorkspaceInstance,
    route: CalculateOoeRouteDescriptor,
  ) {
    if (instance.workspaceKind !== 'calculate' || !isCalculateSurfaceState(surfaceState)) {
      return null;
    }

    const displayState = normalizeWorkspaceDisplayState(instance.displayState);
    return buildCalculateRuntimeRequestFromState({
      calculateLatex: surfaceState.calculateLatex,
      calculateScreen: surfaceState.calculateScreen,
      calculateRouteMeta: getCalculateRouteMeta(surfaceState.calculateScreen),
      calculateWorkbenchExpression: buildWorkbenchExpression(
        surfaceState.calculateScreen,
        surfaceState.derivativeWorkbench,
        surfaceState.derivativePointWorkbench,
        surfaceState.integralWorkbench,
        surfaceState.limitWorkbench,
      ),
      limitWorkbench: surfaceState.limitWorkbench,
      settings,
      ansLatex: displayState.ansLatex,
      variableMemory: storedVariables,
      calculateReplayVariableSubstitutions: surfaceState.calculateReplayVariableSubstitutions,
    }, route);
  }

  const resolveActiveCalculateInputRevision = (
    route: CalculateOoeRouteDescriptor,
    job: OoeJobIdentity,
    buildInputRevisionId: (request: RunCalculateRuntimeRequest) => string,
  ) =>
    resolveWorkspaceOriginInputRevision(job, {
      buildInputRevisionId,
      getActiveWorkspaceInstanceRuntimeContext,
      getWorkspaceInstances,
      readLiveRequest: () => getActiveCalculateRuntimeRequest(route),
      readRequestFromSurfaceState: (surfaceState, instance) =>
        calculateRuntimeRequestFromSurfaceState(surfaceState, instance, route),
    });

  function createActiveCalculateRuntimeController() {
    return createCalculateRuntimeController({
      calculateLatex,
      calculateScreen,
      calculateRouteMeta,
      calculateWorkbenchExpression,
      integralWorkbench,
      limitWorkbench,
      isCalculateToolOpen,
      settings,
      ansLatex,
      variableMemory: storedVariables,
      calculateReplayVariableSubstitutions,
      clearCalculateReplayVariableSubstitutions,
      startTransition,
      setDisplayOutcome,
      commitOutcome,
      retitleOutcome,
      setRuntimeStatusOverride,
      reserveHistoryTicket,
      discardHistoryTicket,
      shouldCommitVisibleCalculateOutcome: () => currentModeRef.current === 'calculate',
    getActiveCalculateRuntimeRequest,
    getActiveWorkspaceInstanceRuntimeContext,
    resolveActiveCalculateInputRevision,
  });
  }

  function runCalculateAction(action: RunCalculateModeRequest['action']) {
    createActiveCalculateRuntimeController().runCalculateAction(action);
  }

  function runCalculateAlgebraTransformAction(action: AlgebraTransformAction) {
    createActiveCalculateRuntimeController().runCalculateAlgebraTransformAction(action);
  }

  function runCalculateWorkbenchAction() {
    createActiveCalculateRuntimeController().runCalculateWorkbenchAction();
  }

  return {
    applyCalculateSeed,
    calculateAlgebraTrayOpen,
    calculateLatex,
    calculateMenuEntries,
    calculateMenuFooterText,
    calculateMenuPanelRef,
    calculateMenuSelection,
    calculateReplayVariableSubstitutions,
    calculateRouteMeta,
    calculateScreen,
    calculateWorkbenchExpression,
    captureCalculateSurfaceState,
    clearCalculateReplayVariableSubstitutions,
    currentCalculateHistoryContext,
    cycleLimitDirection,
    derivativeFieldRef,
    derivativePointFieldRef,
    derivativePointValueRef,
    derivativePointWorkbench,
    derivativeWorkbench,
    integralFieldRef,
    integralLowerRef,
    integralWorkbench,
    isCalculateMenuOpen,
    isCalculateToolOpen,
    limitFieldRef,
    limitTargetRef,
    limitWorkbench,
    moveCurrentCalculateMenuSelection,
    openCalculateMenuDigitEntry,
    openCalculateMenuEntry,
    openCalculateScreen,
    openSelectedCalculateMenuEntry,
    resetCalculateRuntime,
    resetCurrentCalculateScreen,
    restoreCalculateSurfaceState,
    restoreCalculateHistoryEntry,
    runCalculateAction,
    runCalculateAlgebraTransformAction,
    runCalculateWorkbenchAction,
    selectedCalculateMenuEntry,
    setCalculateAlgebraTrayOpen,
    setCalculateLatex,
    setCalculateMenuSelection,
    setCalculateScreen,
    setDerivativePointWorkbench,
    setDerivativeWorkbench,
    setIntegralWorkbench,
    setLimitWorkbench,
    toggleCalculateAlgebraTray,
    toggleIntegralKind,
  };
}
