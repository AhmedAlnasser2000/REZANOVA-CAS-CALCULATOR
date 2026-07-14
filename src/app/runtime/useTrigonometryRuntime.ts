import {
  useRef,
  useState,
  type RefObject,
} from 'react';
import type { MathfieldElement } from 'mathlive';
import {
  buildTrigInputLatex,
  defaultTrigDraftForScreen,
  DEFAULT_ANGLE_CONVERT_STATE,
  DEFAULT_COSINE_RULE_STATE,
  DEFAULT_RIGHT_TRIANGLE_STATE,
  DEFAULT_SINE_RULE_STATE,
  DEFAULT_TRIG_EQUATION_STATE,
  DEFAULT_TRIG_FUNCTION_STATE,
  DEFAULT_TRIG_IDENTITY_STATE,
  DEFAULT_TRIG_PERIOD_PHASE_STATE,
  TRIG_TARGET_FORM_LABELS,
} from '../../lib/trigonometry/examples';
import {
  parseTrigDraft,
  trigDraftStyle,
  trigRequestToScreen,
  buildTrigonometryOoeInputRevisionId,
  buildTrigStructuredDraft,
  type RunTrigonometryRuntimeRequest,
} from '../../lib/trigonometry/runtime-request';
import {
  getTrigMenuEntries,
  getTrigMenuEntryAtIndex,
  getTrigMenuFooterText,
  getTrigParentScreen,
  getTrigRouteMeta,
  isTrigMenuScreen,
  moveTrigMenuIndex,
} from '../../lib/trigonometry/navigation';
import { createCoreDraftState, isCoreDraftEditable } from '../../lib/modes/core-mode';
import { trimHarmlessTrailingMathSpacing } from '../../lib/input/input-canonicalization';
import type {
  AngleUnit,
  CoreDraftState,
  CanonicalRuntimeOutcome,
  GuideExample,
  HistoryEntry,
  ModeId,
  TrigIdentityState,
  TrigReplaySeed,
  TrigRequest,
  TrigScreen,
} from '../../types/calculator';
import type { PendingHistoryTicketReservation } from '../../lib/ooe/job-launch/launch-tickets';
import type { WorkspaceInstanceRuntimeContext } from '../../types/calculator/workspace-instance-types';
import { launchWorkspaceRuntimeJob } from './launchWorkspaceRuntimeJob';
import { createCanonicalRuntimeError } from '../../lib/result-contract';
import {
  defaultTrigLeafForMenu,
  trigExecutionLatexForRuntime,
  trigonometryRequestFromSurfaceState,
} from './trigonometry-origin-request';
import { captureTrigonometrySurfaceStateSnapshot, restoreTrigonometrySurfaceStateSnapshot } from './trigonometry-surface-state';
import type { TrigonometrySurfaceState } from './workspace-surface-state';
import type { WorkspaceInstance } from './workspace-instances';

type CommitTrigonometryOutcome = (
  outcome: CanonicalRuntimeOutcome,
  inputLatex: string,
  mode: 'trigonometry',
  context?: Partial<Pick<HistoryEntry, 'trigScreen' | 'trigSeed'>> & {
    historyTicketId?: string | null;
    historyLaunchOrder?: number;
    suppressDisplayCommit?: boolean;
  },
) => void;

type UseTrigonometryRuntimeOptions = {
  activeFieldRef: RefObject<MathfieldElement | null>;
  angleUnit: AngleUnit;
  commitOutcome: CommitTrigonometryOutcome;
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
  setDisplayOutcome: (outcome: CanonicalRuntimeOutcome | null) => void;
  setRuntimeStatusOverride: (status: string | null) => void;
  startTransition: (callback: () => void) => void;
};

const DEFAULT_SPECIAL_ANGLES_EXPRESSION = '\\cos\\left(\\frac{\\pi}{3}\\right)';

export function useTrigonometryRuntime({
  activeFieldRef,
  angleUnit,
  commitOutcome,
  currentMode,
  currentModeRef,
  discardHistoryTicket,
  getActiveWorkspaceInstanceRuntimeContext,
  getWorkspaceInstances,
  isLauncherOpen,
  openLauncher,
  reserveHistoryTicket,
  setDisplayOutcome,
  setRuntimeStatusOverride,
  startTransition,
}: UseTrigonometryRuntimeOptions) {
  const [trigScreen, setTrigScreen] = useState<TrigScreen>('home');
  const [trigMenuSelection, setTrigMenuSelection] = useState({
    home: 0,
    identitiesHome: 0,
    equationsHome: 0,
    trianglesHome: 0,
  });
  const [trigFunctionState, setTrigFunctionState] =
    useState(DEFAULT_TRIG_FUNCTION_STATE);
  const [trigIdentityState, setTrigIdentityState] =
    useState(DEFAULT_TRIG_IDENTITY_STATE);
  const [trigEquationState, setTrigEquationState] =
    useState(DEFAULT_TRIG_EQUATION_STATE);
  const [rightTriangleState, setRightTriangleState] =
    useState(DEFAULT_RIGHT_TRIANGLE_STATE);
  const [sineRuleState, setSineRuleState] =
    useState(DEFAULT_SINE_RULE_STATE);
  const [cosineRuleState, setCosineRuleState] =
    useState(DEFAULT_COSINE_RULE_STATE);
  const [angleConvertState, setAngleConvertState] =
    useState(DEFAULT_ANGLE_CONVERT_STATE);
  const [periodPhaseState, setPeriodPhaseState] =
    useState(DEFAULT_TRIG_PERIOD_PHASE_STATE);
  const [specialAnglesExpression, setSpecialAnglesExpression] =
    useState(DEFAULT_SPECIAL_ANGLES_EXPRESSION);
  const [trigDraftState, setTrigDraftState] = useState<CoreDraftState>(() =>
    createCoreDraftState('', 'shorthand', 'guided', true));
  const trigMenuPanelRef = useRef<HTMLDivElement | null>(null);
  const trigDraftFieldRef = useRef<MathfieldElement | null>(null);
  const rightTriangleSideARef = useRef<HTMLInputElement | null>(null);
  const sineRuleSideARef = useRef<HTMLInputElement | null>(null);
  const cosineRuleSideARef = useRef<HTMLInputElement | null>(null);
  const angleConvertValueRef = useRef<HTMLInputElement | null>(null);

  const trigRouteMeta = currentMode === 'trigonometry'
    ? getTrigRouteMeta(trigScreen)
    : null;
  const isTrigMenuOpen =
    !isLauncherOpen && currentMode === 'trigonometry' && isTrigMenuScreen(trigScreen);
  const trigMenuEntries = isTrigMenuOpen
    ? getTrigMenuEntries(trigScreen)
    : [];
  const currentTrigMenuIndex = isTrigMenuOpen
    ? trigMenuSelection[trigScreen as keyof typeof trigMenuSelection]
    : 0;
  const selectedTrigMenuEntry = isTrigMenuOpen
    ? getTrigMenuEntryAtIndex(trigScreen, currentTrigMenuIndex)
    : undefined;
  const trigMenuFooterText = currentMode === 'trigonometry'
    ? getTrigMenuFooterText(trigScreen)
    : '';
  const trigStateSnapshot = {
    trigFunction: trigFunctionState,
    trigIdentity: trigIdentityState,
    trigEquation: { ...trigEquationState, angleUnit },
    rightTriangle: rightTriangleState,
    sineRule: sineRuleState,
    cosineRule: cosineRuleState,
    angleConvert: angleConvertState,
    periodPhase: periodPhaseState,
    specialAnglesExpression,
  };
  const trigWorkbenchExpression =
    currentMode === 'trigonometry'
      ? buildTrigInputLatex(trigScreen, trigStateSnapshot)
      : '';
  const trigDraftLatex =
    currentMode === 'trigonometry'
      ? trigDraftState.rawLatex
      : '';
  const trigEditorIsEditable =
    currentMode === 'trigonometry'
    && trigRouteMeta?.editorMode === 'editable'
    && isCoreDraftEditable(trigDraftState);

  function openTrigScreen(screen: TrigScreen) {
    setTrigScreen(screen);
    if (!isTrigMenuScreen(screen)) {
      setTrigDraftState(
        trigDraftStateForScreen(
          screen,
          buildTrigDraftForScreen(screen),
          trigDraftSourceForScreen(screen),
        ),
      );
    }
    setDisplayOutcome(null);
  }

  function trigDraftStateForScreen(
    _screen: TrigScreen,
    rawLatex: string,
    source: CoreDraftState['source'],
  ) {
    return createCoreDraftState(
      rawLatex,
      trigDraftStyle(rawLatex),
      source,
      true,
    );
  }

  function buildTrigDraftForScreen(screen: TrigScreen) {
    if (screen === 'functions') {
      return trigFunctionState.expressionLatex;
    }

    if (screen === 'identitySimplify' || screen === 'identityConvert') {
      return trigIdentityState.expressionLatex;
    }

    if (screen === 'equationSolve') {
      return trigEquationState.equationLatex;
    }

    if (screen === 'periodPhase') {
      return periodPhaseState.expressionLatex;
    }

    if (screen === 'specialAngles') {
      return specialAnglesExpression;
    }

    return buildTrigStructuredDraft(screen, trigStateSnapshot);
  }

  function updateTrigDraft(rawLatex: string, source: CoreDraftState['source'], executable = true) {
    setTrigDraftState({
      rawLatex,
      style: trigDraftStyle(rawLatex),
      source,
      executable,
    });
  }

  function loadTrigDraft(
    rawLatex: string,
    source: CoreDraftState['source'] = 'guided',
    executable = true,
  ) {
    updateTrigDraft(rawLatex, source, executable);
    if (executable) {
      setTimeout(() => {
        trigDraftFieldRef.current?.focus?.();
        activeFieldRef.current = trigDraftFieldRef.current;
      }, 0);
    }
  }

  function trigDraftSourceForScreen(screen: TrigScreen): CoreDraftState['source'] {
    return isTrigMenuScreen(screen) ? 'manual' : 'guided';
  }

  function isTrigDraftFocused(target?: EventTarget | null) {
    if (!trigEditorIsEditable || !trigDraftFieldRef.current) {
      return false;
    }

    if (target) {
      return target === trigDraftFieldRef.current;
    }

    return activeFieldRef.current === trigDraftFieldRef.current;
  }

  function readLiveTrigInputLatex(screenHint: TrigScreen, editorFocused: boolean) {
    const shouldUseGuidedForm =
      !editorFocused && trigRouteMeta?.focusTarget === 'guidedForm';
    if (shouldUseGuidedForm) {
      return buildTrigDraftForScreen(screenHint).trim();
    }

    let inputLatex = trigDraftState.rawLatex.trim();
    if (currentModeRef.current === 'trigonometry' && trigEditorIsEditable) {
      const liveField = trigDraftFieldRef.current
        ?? (document.querySelector('[data-testid="main-editor"]') as MathfieldElement | null);
      const fieldLatex = liveField?.getValue?.('latex');
      if (typeof fieldLatex === 'string') {
        inputLatex = trimHarmlessTrailingMathSpacing(fieldLatex).trim();
      }
    }

    return inputLatex;
  }

  function readLiveTrigonometryRuntimeRequest() {
    if (currentModeRef.current !== 'trigonometry') {
      return null;
    }

    const screenHint = trigLeafScreenForContext(trigScreen);
    const inputLatex = readLiveTrigInputLatex(screenHint, isTrigDraftFocused());
    if (!inputLatex) {
      return null;
    }

    const executionLatex = trigExecutionLatexForRuntime(
      inputLatex,
      screenHint,
      trigIdentityState.targetForm,
    );
    if (!executionLatex) {
      return null;
    }

    return {
      inputLatex: executionLatex,
      screenHint,
      angleUnit,
      identityTargetForm: trigIdentityState.targetForm,
    } satisfies RunTrigonometryRuntimeRequest;
  }

  function setCurrentTrigMenuIndex(screen: keyof typeof trigMenuSelection, index: number) {
    setTrigMenuSelection((currentSelection) => ({
      ...currentSelection,
      [screen]: index,
    }));
  }

  function moveCurrentTrigMenuSelection(delta: number) {
    if (!isTrigMenuOpen) {
      return;
    }

    setCurrentTrigMenuIndex(
      trigScreen as keyof typeof trigMenuSelection,
      moveTrigMenuIndex(trigScreen, currentTrigMenuIndex, delta),
    );
  }

  function trigLeafScreenForContext(screen: TrigScreen): TrigScreen {
    if (!isTrigMenuScreen(screen)) {
      return screen;
    }

    if (screen === 'home') {
      const target = getTrigMenuEntryAtIndex('home', trigMenuSelection.home)?.target ?? 'identitiesHome';
      if (target === 'identitiesHome') {
        return getTrigMenuEntryAtIndex('identitiesHome', trigMenuSelection.identitiesHome)?.target ?? 'identitySimplify';
      }
      if (target === 'equationsHome') {
        return 'equationSolve';
      }
      if (target === 'trianglesHome') {
        return getTrigMenuEntryAtIndex('trianglesHome', trigMenuSelection.trianglesHome)?.target ?? 'rightTriangle';
      }
      return target;
    }

    return getTrigMenuEntryAtIndex(
      screen,
      trigMenuSelection[screen as keyof typeof trigMenuSelection],
    )?.target ?? defaultTrigLeafForMenu(screen);
  }

  function openSelectedTrigMenuEntry() {
    if (!selectedTrigMenuEntry) {
      return;
    }

    openTrigScreen(selectedTrigMenuEntry.target);
  }

  function goBackInTrigonometry() {
    const parentScreen = getTrigParentScreen(trigScreen);
    if (parentScreen) {
      openTrigScreen(parentScreen);
    } else {
      openLauncher();
    }
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

    if (screen === 'periodPhase') {
      const nextState = {
        ...periodPhaseState,
        expressionLatex: seed.expressionLatex ?? periodPhaseState.expressionLatex,
        variable: seed.variable ?? periodPhaseState.variable,
      };
      setPeriodPhaseState(nextState);
      setTrigDraftState(
        trigDraftStateForScreen(
          screen,
          buildTrigStructuredDraft(screen, {
            ...trigStateSnapshot,
            periodPhase: nextState,
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

  function loadTrigExample(
    screen: TrigScreen,
    latex: string,
    seed?: GuideExample['launch']['trigSeed'],
  ) {
    openTrigScreen(screen);
    applyTrigSeed(screen, seed);
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
  }

  function applyTrigHistoryRequest(
    request: TrigRequest,
    replayScreen: TrigScreen,
  ) {
    if (request.kind === 'function') {
      const expressionLatex = request.expressionLatex;
      if (replayScreen === 'specialAngles') {
        setSpecialAnglesExpression(expressionLatex);
      } else {
        setTrigFunctionState((currentState) => ({ ...currentState, expressionLatex }));
      }
    } else if (request.kind === 'identitySimplify') {
      const { expressionLatex } = request;
      setTrigIdentityState((currentState) => ({
        ...currentState,
        expressionLatex,
        targetForm: 'simplified',
      }));
    } else if (request.kind === 'identityConvert') {
      const { expressionLatex, targetForm } = request;
      setTrigIdentityState((currentState) => ({
        ...currentState,
        expressionLatex,
        targetForm,
      }));
    } else if (request.kind === 'equationSolve') {
      const { equationLatex } = request;
      setTrigEquationState((currentState) => ({
        ...currentState,
        equationLatex,
        angleUnit,
      }));
    } else if (request.kind === 'rightTriangle') {
      setRightTriangleState({
        knownSideA: request.knownSideA ?? '',
        knownSideB: request.knownSideB ?? '',
        knownSideC: request.knownSideC ?? '',
        knownAngleA: request.knownAngleA ?? '',
        knownAngleB: request.knownAngleB ?? '',
      });
    } else if (request.kind === 'sineRule') {
      setSineRuleState({
        sideA: request.sideA ?? '',
        sideB: request.sideB ?? '',
        sideC: request.sideC ?? '',
        angleA: request.angleA ?? '',
        angleB: request.angleB ?? '',
        angleC: request.angleC ?? '',
      });
    } else if (request.kind === 'cosineRule') {
      setCosineRuleState({
        sideA: request.sideA ?? '',
        sideB: request.sideB ?? '',
        sideC: request.sideC ?? '',
        angleA: request.angleA ?? '',
        angleB: request.angleB ?? '',
        angleC: request.angleC ?? '',
      });
    } else if (request.kind === 'angleConvert') {
      setAngleConvertState({
        value: request.valueLatex,
        from: request.from,
        to: request.to,
      });
    } else if (request.kind === 'periodPhase') {
      setPeriodPhaseState({
        expressionLatex: request.expressionLatex,
        variable: request.variable,
      });
    }
  }

  function setManualTrigDraft(rawLatex: string) {
    setTrigDraftState({
      rawLatex,
      style: trigDraftStyle(rawLatex),
      source: 'manual',
      executable: true,
    });
  }

  function restoreTrigHistoryEntry(entry: HistoryEntry) {
    const seededRequest = entry.trigSeed?.request;
    const parsed = seededRequest
      ? {
          ok: true as const,
          request: seededRequest,
          style: trigDraftStyle(entry.inputLatex),
        }
      : parseTrigDraft(entry.inputLatex, {
          screenHint: entry.trigScreen,
          identityTargetForm: trigIdentityState.targetForm,
        });
    if (parsed.ok) {
      const request = parsed.request;
      const replayScreen = entry.trigSeed?.screen
        ?? (entry.trigScreen
          ? trigRequestToScreen(request, entry.trigScreen)
          : trigRequestToScreen(request));
      openTrigScreen(replayScreen);
      applyTrigHistoryRequest(request, replayScreen);
      setManualTrigDraft(entry.inputLatex);
    } else if (entry.trigScreen) {
      openTrigScreen(entry.trigScreen);
      setManualTrigDraft(entry.inputLatex);
    } else {
      openTrigScreen('home');
    }
  }

  function resetCurrentTrigScreen() {
    if (isTrigMenuOpen) {
      goBackInTrigonometry();
    } else if (trigScreen === 'functions') {
      setTrigFunctionState(DEFAULT_TRIG_FUNCTION_STATE);
      setTrigDraftState(trigDraftStateForScreen('functions', defaultTrigDraftForScreen('functions'), 'guided'));
    } else if (trigScreen === 'identitySimplify' || trigScreen === 'identityConvert') {
      setTrigIdentityState(DEFAULT_TRIG_IDENTITY_STATE);
      setTrigDraftState(trigDraftStateForScreen(trigScreen, defaultTrigDraftForScreen(trigScreen), 'guided'));
    } else if (trigScreen === 'equationSolve') {
      setTrigEquationState((currentState) => ({
        ...DEFAULT_TRIG_EQUATION_STATE,
        angleUnit: currentState.angleUnit,
      }));
      setTrigDraftState(trigDraftStateForScreen('equationSolve', defaultTrigDraftForScreen('equationSolve'), 'guided'));
    } else if (trigScreen === 'rightTriangle') {
      setRightTriangleState(DEFAULT_RIGHT_TRIANGLE_STATE);
      setTrigDraftState(trigDraftStateForScreen('rightTriangle', defaultTrigDraftForScreen('rightTriangle'), 'guided'));
    } else if (trigScreen === 'sineRule') {
      setSineRuleState(DEFAULT_SINE_RULE_STATE);
      setTrigDraftState(trigDraftStateForScreen('sineRule', defaultTrigDraftForScreen('sineRule'), 'guided'));
    } else if (trigScreen === 'cosineRule') {
      setCosineRuleState(DEFAULT_COSINE_RULE_STATE);
      setTrigDraftState(trigDraftStateForScreen('cosineRule', defaultTrigDraftForScreen('cosineRule'), 'guided'));
    } else if (trigScreen === 'angleConvert') {
      setAngleConvertState(DEFAULT_ANGLE_CONVERT_STATE);
      setTrigDraftState(trigDraftStateForScreen('angleConvert', defaultTrigDraftForScreen('angleConvert'), 'guided'));
    } else if (trigScreen === 'periodPhase') {
      setPeriodPhaseState(DEFAULT_TRIG_PERIOD_PHASE_STATE);
      setTrigDraftState(trigDraftStateForScreen('periodPhase', defaultTrigDraftForScreen('periodPhase'), 'guided'));
    } else if (trigScreen === 'specialAngles') {
      setSpecialAnglesExpression(DEFAULT_SPECIAL_ANGLES_EXPRESSION);
      setTrigDraftState(trigDraftStateForScreen('specialAngles', defaultTrigDraftForScreen('specialAngles'), 'guided'));
    }
  }

  function resetTrigonometryRuntime() {
    setTrigScreen('home');
    setTrigMenuSelection({
      home: 0,
      identitiesHome: 0,
      equationsHome: 0,
      trianglesHome: 0,
    });
    setTrigFunctionState(DEFAULT_TRIG_FUNCTION_STATE);
    setTrigIdentityState(DEFAULT_TRIG_IDENTITY_STATE);
    setTrigEquationState(DEFAULT_TRIG_EQUATION_STATE);
    setRightTriangleState(DEFAULT_RIGHT_TRIANGLE_STATE);
    setSineRuleState(DEFAULT_SINE_RULE_STATE);
    setCosineRuleState(DEFAULT_COSINE_RULE_STATE);
    setAngleConvertState(DEFAULT_ANGLE_CONVERT_STATE);
    setPeriodPhaseState(DEFAULT_TRIG_PERIOD_PHASE_STATE);
    setSpecialAnglesExpression(DEFAULT_SPECIAL_ANGLES_EXPRESSION);
    setTrigDraftState(createCoreDraftState('', 'shorthand', 'guided', true));
  }

  function captureTrigonometrySurfaceState(): TrigonometrySurfaceState {
    return captureTrigonometrySurfaceStateSnapshot({
      angleConvertState, angleUnit, cosineRuleState, periodPhaseState, rightTriangleState,
      sineRuleState, specialAnglesExpression, trigDraftState, trigEquationState, trigFunctionState,
      trigIdentityState, trigMenuSelection, trigScreen,
    });
  }

  function restoreTrigonometrySurfaceState(state: TrigonometrySurfaceState | null) {
    if (!state) {
      resetTrigonometryRuntime();
      return;
    }

    restoreTrigonometrySurfaceStateSnapshot(state, angleUnit, {
      setAngleConvertState, setCosineRuleState, setPeriodPhaseState, setRightTriangleState,
      setSineRuleState, setSpecialAnglesExpression, setTrigDraftState, setTrigEquationState,
      setTrigFunctionState, setTrigIdentityState, setTrigMenuSelection, setTrigScreen,
    });
  }

  function runTrigAction() {
    const screenHint = trigLeafScreenForContext(trigScreen);
    const editorFocused = isTrigDraftFocused();

    if (isTrigMenuOpen && !editorFocused) {
      return;
    }

    startTransition(() => {
      const inputLatex = readLiveTrigInputLatex(screenHint, editorFocused);

      if (!inputLatex) {
        setDisplayOutcome(createCanonicalRuntimeError(
          trigRouteMeta?.label ?? 'Trigonometry',
          'Enter a Trigonometry request or use a guided trig tool before evaluating.',
        ));
        return;
      }

      if (!editorFocused || trigDraftState.rawLatex.trim() !== inputLatex) {
        setTrigDraftState(trigDraftStateForScreen(screenHint, inputLatex, 'guided'));
      }

      const request: RunTrigonometryRuntimeRequest = {
        inputLatex: trigExecutionLatexForRuntime(
          inputLatex,
          screenHint,
          trigIdentityState.targetForm,
        ),
        screenHint,
        angleUnit,
        identityTargetForm: trigIdentityState.targetForm,
      };
      launchWorkspaceRuntimeJob({
        mode: 'trigonometry',
        modeLabel: 'Trigonometry',
        capabilityId: 'trigonometry.evaluate',
        request,
        ticketInputLatex: request.inputLatex,
        buildInputRevisionId: buildTrigonometryOoeInputRevisionId,
        getActiveWorkspaceInstanceRuntimeContext,
        getWorkspaceInstances,
        readLiveRequest: readLiveTrigonometryRuntimeRequest,
        readRequestFromSurfaceState: (surfaceState, instance) =>
          trigonometryRequestFromSurfaceState(surfaceState, instance, angleUnit),
        isModeVisible: () => currentModeRef.current === 'trigonometry',
        loadRunner: async () =>
          (await import('../../lib/modes/trigonometry')).runTrigonometryModeWithOoePilot,
        reserveHistoryTicket,
        discardHistoryTicket,
        setDisplayOutcome,
        setRuntimeStatusOverride,
        commit: (payload, ticket, visible) => {
          commitOutcome(payload.outcome, request.inputLatex, 'trigonometry', {
            trigScreen: payload.replayScreen,
            trigSeed: payload.replaySeed as TrigReplaySeed | undefined,
            historyTicketId: ticket?.id,
            historyLaunchOrder: ticket?.historyLaunchOrder,
            suppressDisplayCommit: !visible,
          });
        },
      });
    });
  }

  return {
    angleConvertState,
    angleConvertValueRef,
    applyTrigSeed,
    buildTrigDraftForScreen,
    captureTrigonometrySurfaceState,
    cosineRuleSideARef,
    cosineRuleState,
    currentTrigMenuIndex,
    goBackInTrigonometry,
    isTrigDraftFocused,
    isTrigMenuOpen,
    loadTrigDraft,
    loadTrigExample,
    moveCurrentTrigMenuSelection,
    openSelectedTrigMenuEntry,
    openTrigScreen,
    periodPhaseState,
    resetCurrentTrigScreen,
    resetTrigonometryRuntime,
    restoreTrigHistoryEntry,
    restoreTrigonometrySurfaceState,
    rightTriangleSideARef,
    rightTriangleState,
    runTrigAction,
    selectedTrigMenuEntry,
    setAngleConvertState,
    setCosineRuleState,
    setCurrentTrigMenuIndex,
    setPeriodPhaseState,
    setRightTriangleState,
    setSineRuleState,
    setSpecialAnglesExpression,
    setTrigDraftState,
    setTrigEquationState,
    setTrigFunctionState,
    setTrigIdentityState,
    setTrigMenuSelection,
    setTrigScreen,
    sineRuleSideARef,
    sineRuleState,
    specialAnglesExpression,
    trigDraftFieldRef,
    trigDraftLatex,
    trigDraftState,
    trigEditorIsEditable,
    trigEquationState,
    trigFunctionState,
    trigIdentityState,
    trigLeafScreenForContext,
    trigMenuEntries,
    trigMenuFooterText,
    trigMenuPanelRef,
    trigMenuSelection,
    trigRouteMeta,
    trigScreen,
    trigStateSnapshot,
    trigTargetFormLabels: Object.entries(TRIG_TARGET_FORM_LABELS) as Array<[TrigIdentityState['targetForm'], string]>,
    trigWorkbenchExpression,
    updateTrigDraft,
  };
}
