/* eslint-disable react-hooks/refs */
import {
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { MathfieldElement } from 'mathlive';
import {
  normalizeRelationOperatorLatex,
  trimHarmlessTrailingMathSpacing,
} from '../../lib/input/input-canonicalization';
import {
  inferEquationReplayTarget,
} from '../../lib/equation/equation-history';
import {
  getEquationMenuEntries,
  getEquationMenuEntryAtIndex,
  getEquationMenuEntryByHotkey,
  getEquationParentScreen,
  getEquationSoftActions,
  isEquationMenuScreen,
  isPolynomialEquationScreen,
  isSimultaneousEquationScreen,
  moveEquationMenuIndex,
} from '../../lib/equation/equation-navigation';
import {
  resolveEquationSolveTarget,
  type EquationSolveTargetResolution,
} from '../../lib/equation/equation-target-resolution';
import {
  getEquationDisplayTitle,
  getEquationMenuFooterText,
  getEquationRouteMeta,
} from '../../lib/equation/equation-ux';
import {
  buildPolynomialEquationLatex,
  DEFAULT_POLYNOMIAL_COEFFICIENTS,
  POLYNOMIAL_VIEW_META,
  equationInputLatexForScreen,
} from '../../lib/modes/equation-ui-model';
import type { RunEquationModeRequest } from '../../lib/modes/equation';
import { useEditorAnalysis } from '../../lib/editor/use-editor-analysis';
import type { OoeJobIdentity } from '../../lib/ooe/job-launch/job-contract';
import {
  createEquationRuntimeController,
} from '../logic/runtimeControllers';
import {
  defaultEquationComplexRegionPanelState,
  defaultEquationNumericSolvePanelState,
  emptySystem,
  menuIndexForEquationScreen,
  polynomialTemplateLatex,
} from '../logic/appUtils';
import type { EquationSurfaceState } from './workspace-surface-state';
import {
  buildEquationRequestFromState,
  equationRequestFromSurfaceState,
} from './equation-origin-request';
import type {
  ActiveEquationRuntimeState,
  EquationMenuScreen,
  EquationRequestKind,
  UseEquationRuntimeOptions,
} from './equation-runtime-types';
import { useEquationAlgebraActions } from './equation-algebra-actions';
import {
  buildEquationExplicitNumericPanelWorkspaceProps,
  useEquationComplexRegionPanelState,
} from './equation-explicit-numeric-panels';
import { useEquationNumericSolvePanelState } from './equation-numeric-panel-visibility';
import { resolveWorkspaceOriginInputRevision } from './workspace-origin-input-revision';
import type {
  DisplayOutcome,
  EquationAnswerMode,
  EquationScreen,
  HistoryEntry,
  PolynomialEquationView,
  SimultaneousEquationView,
} from '../../types/calculator';
function copySystem(system: number[][]) {
  return system.map((row) => [...row]);
}
export function useEquationRuntime({
  activeFieldRef,
  ansLatex,
  commitOutcome,
  currentMode,
  currentModeRef,
  discardHistoryTicket,
  displayOutcome,
  editorAnalysisControl,
  getActiveWorkspaceInstanceRuntimeContext,
  getWorkspaceInstances,
  isLauncherOpen,
  mainFieldRef,
  openGuideArticle,
  openGuideMode,
  openLauncher,
  patchSettings,
  replayVariableSubstitutions,
  reserveHistoryTicket,
  routeToModeDestination,
  settings,
  setDisplayOutcome,
  setMode,
  setRuntimeStatusOverride,
  startTransition,
  storedVariables,
  clearReplayVariableSubstitutions,
}: UseEquationRuntimeOptions) {
  const [equationLatex, setEquationLatexState] = useState('');
  const latestEquationLatexRef = useRef('');
  const [equationSolveTarget, setEquationSolveTarget] = useState<string | null>(null);
  const [equationScreen, setEquationScreen] = useState<EquationScreen>('home');
  const [equationAlgebraTrayOpen, setEquationAlgebraTrayOpen] = useState(false);
  const [equationMenuSelection, setEquationMenuSelection] = useState({
    home: 0,
    polynomialMenu: 0,
    simultaneousMenu: 0,
  });
  const [quadraticCoefficients, setQuadraticCoefficients] = useState([
    ...DEFAULT_POLYNOMIAL_COEFFICIENTS.quadratic,
  ]);
  const [cubicCoefficients, setCubicCoefficients] = useState([
    ...DEFAULT_POLYNOMIAL_COEFFICIENTS.cubic,
  ]);
  const [quarticCoefficients, setQuarticCoefficients] = useState([
    ...DEFAULT_POLYNOMIAL_COEFFICIENTS.quartic,
  ]);
  const [polynomialSystem2Latex, setPolynomialSystem2Latex] =
    useState<readonly [string, string]>(['', '']);
  const [system2, setSystem2] = useState([
    [1, 1, 3],
    [2, -1, 0],
  ]);
  const [system3, setSystem3] = useState([
    [1, 1, 1, 6],
    [2, -1, 1, 3],
    [1, 2, -1, 3],
  ]);

  const activeEquationRuntimeRef = useRef<ActiveEquationRuntimeState | null>(null);
  const equationMenuPanelRef = useRef<HTMLDivElement | null>(null);
  const polynomialInputRefs = useRef<Record<PolynomialEquationView, HTMLInputElement | null>>({
    quadratic: null,
    cubic: null,
    quartic: null,
  });
  const systemInputRefs = useRef<Record<SimultaneousEquationView, HTMLElement | null>>({
    linear2: null,
    linear3: null,
    polynomialSystem2: null,
  });

  function setEquationLatex(nextLatex: string) {
    latestEquationLatexRef.current = nextLatex;
    setEquationLatexState(nextLatex);
  }

  const currentEquationMenuScreen = isEquationMenuScreen(equationScreen) ? equationScreen : null;
  const equationMenuEntries = currentMode === 'equation' && currentEquationMenuScreen
    ? getEquationMenuEntries(currentEquationMenuScreen)
    : [];
  const currentEquationMenuIndex = currentEquationMenuScreen
    ? equationMenuSelection[currentEquationMenuScreen]
    : 0;
  const selectedEquationMenuEntry = getEquationMenuEntryAtIndex(
    equationMenuEntries,
    currentEquationMenuIndex,
  );
  const isEquationMenuOpen =
    !isLauncherOpen && currentMode === 'equation' && currentEquationMenuScreen !== null;
  const isEquationWorkScreen =
    !isLauncherOpen && currentMode === 'equation' && currentEquationMenuScreen === null;
  const equationRouteMeta = useMemo(
    () => (currentMode === 'equation' ? getEquationRouteMeta(equationScreen) : null),
    [currentMode, equationScreen],
  );
  const equationInputLatex = equationInputLatexForScreen(
    equationScreen,
    equationLatex,
    quadraticCoefficients,
    cubicCoefficients,
    quarticCoefficients,
    polynomialSystem2Latex,
  );
  const latestEquationInputLatex = equationInputLatexForScreen(
    equationScreen,
    latestEquationLatexRef.current,
    quadraticCoefficients,
    cubicCoefficients,
    quarticCoefficients,
    polynomialSystem2Latex,
  );
  const numericSolvePanel = useEquationNumericSolvePanelState({
    currentMode,
    displayOutcome,
    equationScreen,
    inputLatex: latestEquationInputLatex,
  });
  const equationNumericSolvePanel = numericSolvePanel.panel;
  const effectiveEquationNumericSolvePanel = numericSolvePanel.effectivePanel;
  const setEquationNumericSolvePanel = numericSolvePanel.setPanel;
  const complexRegionPanel = useEquationComplexRegionPanelState({
    currentMode,
    equationScreen,
    equationDomainIntent: settings.equationDomainIntent,
    disableNumericPanel: () => numericSolvePanel.setPanelEnabled(false),
  });
  const equationComplexRegionPanel = complexRegionPanel.panel;
  const effectiveEquationComplexRegionPanel = complexRegionPanel.effectivePanel;
  const setEquationComplexRegionPanel = complexRegionPanel.setPanel;
  function setEquationNumericSolvePanelEnabled(enabled: boolean) {
    numericSolvePanel.setPanelEnabled(enabled);
    if (enabled) {
      complexRegionPanel.updatePanel({ enabled: false });
    }
  }
  const equationMenuFooterText =
    currentMode === 'equation' && isEquationMenuOpen
      ? getEquationMenuFooterText(equationScreen)
      : '';
  const equationSoftActions = getEquationSoftActions(equationScreen);
  const equationResultTitle =
    currentMode === 'equation' ? getEquationDisplayTitle(equationScreen, displayOutcome) : null;

  const analyzeEquationSolveTarget = useCallback(
    (currentEquationLatex: string) =>
      currentEquationLatex
        ? resolveEquationSolveTarget(currentEquationLatex, equationSolveTarget)
        : null,
    [equationSolveTarget],
  );
  const equationSolveTargetAnalysis = useEditorAnalysis<EquationSolveTargetResolution | null>({
    source: currentMode === 'equation' && equationScreen === 'symbolic' ? equationLatex : '',
    initialValue: null,
    analysisKey: equationSolveTarget ?? '',
    analyze: analyzeEquationSolveTarget,
    controlState: editorAnalysisControl,
    ooe: {
      lane: 'equationTargetDiscovery',
      contextKey: equationSolveTarget ?? '',
    },
  });
  const analyzedEquationSolveTargetResolution =
    currentMode === 'equation' && equationScreen === 'symbolic'
      ? equationSolveTargetAnalysis.value
      : null;
  const equationSolveTargetResolution =
    analyzedEquationSolveTargetResolution
    && equationSolveTarget
    && analyzedEquationSolveTargetResolution.candidates.some(
      (candidate) => candidate.name === equationSolveTarget,
    )
      ? {
          ...analyzedEquationSolveTargetResolution,
          selectedTarget: equationSolveTarget,
        }
      : analyzedEquationSolveTargetResolution;

  const { equationAlgebraTransformAnalysis, equationAlgebraTransforms } = useEquationAlgebraActions({
    currentMode,
    editorAnalysisControl,
    equationLatex,
    equationScreen,
    equationSolveTarget,
  });

  const activePolynomialView = isPolynomialEquationScreen(equationScreen) ? equationScreen : null;
  const activePolynomialMeta = activePolynomialView ? POLYNOMIAL_VIEW_META[activePolynomialView] : null;
  const activePolynomialCoefficients =
    activePolynomialView === 'quadratic'
      ? quadraticCoefficients
      : activePolynomialView === 'cubic'
        ? cubicCoefficients
        : activePolynomialView === 'quartic'
          ? quarticCoefficients
          : null;

  const equationAnswerModeLabel =
    equationScreen === 'symbolic' && displayOutcome && displayOutcome.kind !== 'prompt'
      ? displayOutcome.answerMode === 'isolate'
        ? 'Answer mode: Isolate'
        : displayOutcome.answerMode === 'exact'
          ? 'Answer mode: Exact'
          : null
      : null;
  const equationNumericRouteLabel =
    currentMode === 'equation' && displayOutcome && displayOutcome.kind !== 'prompt'
    && (displayOutcome.solutionKind === 'approximate-numeric' || displayOutcome.solveBadges?.includes('Numeric Interval'))
      ? displayOutcome.solveBadges?.includes('Numeric Interval')
        ? 'Route: Numeric Interval'
        : 'Route: Numeric'
      : null;
  const equationDomainIntentLabel =
    equationScreen === 'symbolic'
    && displayOutcome
    && displayOutcome.kind !== 'prompt'
    && settings.equationDomainIntent === 'complex'
    && displayOutcome.answerDomain !== 'complex'
      ? 'Domain intent: Complex'
      : null;
  const equationAnswerDomainLabel =
    currentMode === 'equation'
    && displayOutcome
    && displayOutcome.kind !== 'prompt'
    && displayOutcome.answerDomain === 'complex'
      ? 'Domain: Complex'
      : null;
  const equationSolutionKindLabel =
    currentMode === 'equation'
    && displayOutcome
    && displayOutcome.kind !== 'prompt'
    && displayOutcome.solutionKind === 'inequality-solution-set'
      ? 'Solution: Inequality set'
      : null;
  const equationResultBadges =
    currentMode === 'equation' && equationRouteMeta && !isEquationMenuOpen
      ? [
          ...(equationRouteMeta.badge ? [equationRouteMeta.badge] : []),
          ...(equationAnswerModeLabel ? [equationAnswerModeLabel] : []),
          ...(equationNumericRouteLabel ? [equationNumericRouteLabel] : []),
          ...(equationDomainIntentLabel ? [equationDomainIntentLabel] : []),
          ...(equationAnswerDomainLabel ? [equationAnswerDomainLabel] : []),
          ...(equationSolutionKindLabel ? [equationSolutionKindLabel] : []),
          ...(displayOutcome?.kind === 'success' && displayOutcome.resultOrigin === 'numeric-fallback'
            ? ['Numeric roots']
            : []),
        ]
      : [];
  const shouldShowEquationAlgebraTray =
    currentMode === 'equation'
    && equationScreen === 'symbolic'
    && equationAlgebraTrayOpen;
  const equationEditorAnalysisStatuses = [
    currentMode === 'equation' && equationScreen === 'symbolic'
      ? equationSolveTargetAnalysis.status
      : null,
    currentMode === 'equation' && equationScreen === 'symbolic'
      ? equationAlgebraTransformAnalysis.status
      : null,
  ];

  function setCurrentEquationMenuIndex(screen: EquationMenuScreen, index: number) {
    setEquationMenuSelection((currentSelection) => ({
      ...currentSelection,
      [screen]: index,
    }));
  }

  function openEquationScreen(screen: EquationScreen) {
    const menuSelection = menuIndexForEquationScreen(screen);
    if (menuSelection) {
      setCurrentEquationMenuIndex(menuSelection.menu, menuSelection.index);
    }
    setEquationScreen(screen);
    if (screen !== 'symbolic') {
      setEquationNumericSolvePanel(defaultEquationNumericSolvePanelState());
      setEquationComplexRegionPanel(defaultEquationComplexRegionPanelState());
      setEquationSolveTarget(null);
    }
    setDisplayOutcome(null);
  }

  function moveCurrentEquationMenuSelection(delta: number) {
    if (!currentEquationMenuScreen) {
      return;
    }

    setCurrentEquationMenuIndex(
      currentEquationMenuScreen,
      moveEquationMenuIndex(
        currentEquationMenuIndex,
        delta,
        equationMenuEntries.length,
      ),
    );
  }

  function openSelectedEquationMenuEntry() {
    if (!selectedEquationMenuEntry) {
      return;
    }

    openEquationScreen(selectedEquationMenuEntry.target);
  }

  function openEquationMenuDigitEntry(digit: string) {
    const entry = getEquationMenuEntryByHotkey(equationMenuEntries, digit);
    if (entry) {
      openEquationScreen(entry.target);
    }
  }

  function goBackInEquation() {
    const parentScreen = getEquationParentScreen(equationScreen);
    if (parentScreen) {
      openEquationScreen(parentScreen);
    } else {
      openLauncher();
    }
  }

  function switchToEquationWithLatex(latex: string, options?: { openNumericSolve?: boolean }) {
    const applyDestination = () => {
      setEquationScreen('symbolic');
      setEquationLatex(latex);
      setEquationSolveTarget(null);
      setEquationNumericSolvePanel((currentPanel) => ({
        ...currentPanel,
        enabled: options?.openNumericSolve ?? false,
      }));
      setEquationComplexRegionPanel((currentPanel) => ({
        ...currentPanel,
        enabled: false,
      }));
      setDisplayOutcome(null);
    };

    if (routeToModeDestination) {
      routeToModeDestination('equation', applyDestination);
      return;
    }

    setMode('equation');
    applyDestination();
  }

  function resetCurrentEquationScreen() {
    if (isEquationMenuScreen(equationScreen)) {
      goBackInEquation();
    } else if (equationScreen === 'symbolic') {
      setEquationLatex('');
    } else if (equationScreen === 'quadratic') {
      setQuadraticCoefficients([...DEFAULT_POLYNOMIAL_COEFFICIENTS.quadratic]);
    } else if (equationScreen === 'cubic') {
      setCubicCoefficients([...DEFAULT_POLYNOMIAL_COEFFICIENTS.cubic]);
    } else if (equationScreen === 'quartic') {
      setQuarticCoefficients([...DEFAULT_POLYNOMIAL_COEFFICIENTS.quartic]);
    } else if (equationScreen === 'linear2') {
      setSystem2(emptySystem(2));
    } else if (equationScreen === 'linear3') {
      setSystem3(emptySystem(3));
    } else {
      setPolynomialSystem2Latex(['', '']);
    }
  }

  function resetEquationRuntime() {
    setEquationLatex('');
    setEquationSolveTarget(null);
    setEquationScreen('home');
    setEquationAlgebraTrayOpen(false);
    setEquationNumericSolvePanel(defaultEquationNumericSolvePanelState());
    setEquationComplexRegionPanel(defaultEquationComplexRegionPanelState());
    setEquationMenuSelection({
      home: 0,
      polynomialMenu: 0,
      simultaneousMenu: 0,
    });
    setQuadraticCoefficients([...DEFAULT_POLYNOMIAL_COEFFICIENTS.quadratic]);
    setCubicCoefficients([...DEFAULT_POLYNOMIAL_COEFFICIENTS.cubic]);
    setQuarticCoefficients([...DEFAULT_POLYNOMIAL_COEFFICIENTS.quartic]);
    setPolynomialSystem2Latex(['', '']);
    setSystem2([
      [1, 1, 3],
      [2, -1, 0],
    ]);
    setSystem3([
      [1, 1, 1, 6],
      [2, -1, 1, 3],
      [1, 2, -1, 3],
    ]);
  }

  function captureEquationSurfaceState(): EquationSurfaceState {
    return {
      equationLatex: latestEquationLatexRef.current,
      equationSolveTarget,
      equationScreen,
      equationAlgebraTrayOpen,
      equationNumericSolvePanel: { ...equationNumericSolvePanel },
      equationComplexRegionPanel: { ...equationComplexRegionPanel },
      equationMenuSelection: { ...equationMenuSelection },
      quadraticCoefficients: [...quadraticCoefficients],
      cubicCoefficients: [...cubicCoefficients],
      quarticCoefficients: [...quarticCoefficients],
      polynomialSystem2Latex: [...polynomialSystem2Latex] as [string, string],
      system2: copySystem(system2),
      system3: copySystem(system3),
    };
  }

  function restoreEquationSurfaceState(state: EquationSurfaceState | null) {
    if (!state) {
      resetEquationRuntime();
      return;
    }

    setEquationLatex(state.equationLatex);
    setEquationSolveTarget(state.equationSolveTarget);
    setEquationScreen(state.equationScreen);
    setEquationAlgebraTrayOpen(state.equationAlgebraTrayOpen);
    setEquationNumericSolvePanel({ ...state.equationNumericSolvePanel });
    setEquationComplexRegionPanel({
      ...defaultEquationComplexRegionPanelState(),
      ...state.equationComplexRegionPanel,
    });
    setEquationMenuSelection({ ...state.equationMenuSelection });
    setQuadraticCoefficients([...state.quadraticCoefficients]);
    setCubicCoefficients([...state.cubicCoefficients]);
    setQuarticCoefficients([...state.quarticCoefficients]);
    setPolynomialSystem2Latex([...state.polynomialSystem2Latex] as [string, string]);
    setSystem2(copySystem(state.system2));
    setSystem3(copySystem(state.system3));
  }

  function clearActiveEquationDraft() {
    if (equationScreen === 'symbolic') {
      setEquationLatex('');
      setEquationSolveTarget(null);
    } else if (equationScreen === 'polynomialSystem2') {
      setPolynomialSystem2Latex(['', '']);
    }
  }

  function restoreEquationHistoryEntry(entry: HistoryEntry) {
    const replayTarget = inferEquationReplayTarget(entry);
    patchSettings({
      equationAnswerMode: entry.equationAnswerMode === 'isolate' ? 'isolate' : 'exact',
      equationDomainIntent: entry.equationDomainIntent ?? 'real',
      complexExactForm: entry.complexExactForm ?? settings.complexExactForm,
    });
    setEquationLatex(replayTarget.equationLatex);
    setEquationSolveTarget(replayTarget.screen === 'symbolic' ? replayTarget.equationSolveTarget ?? null : null);
    openEquationScreen(replayTarget.screen);
    const numericInterval = replayTarget.screen === 'symbolic'
      ? replayTarget.numericInterval ?? entry.numericInterval
      : undefined;
    if (numericInterval) {
      setEquationNumericSolvePanel({
        enabled: true,
        start: numericInterval.start,
        end: numericInterval.end,
        subdivisions: numericInterval.subdivisions,
      });
    }
    const complexRegion = replayTarget.screen === 'symbolic'
      ? replayTarget.complexRegion
      : undefined;
    if (complexRegion) {
      setEquationComplexRegionPanel({
        ...defaultEquationComplexRegionPanelState(),
        enabled: true,
        reMin: complexRegion.reMin,
        reMax: complexRegion.reMax,
        imMin: complexRegion.imMin,
        imMax: complexRegion.imMax,
        gridSize: complexRegion.gridSize ?? defaultEquationComplexRegionPanelState().gridSize,
      });
    }

    if (
      replayTarget.screen === 'quadratic'
      || replayTarget.screen === 'cubic'
      || replayTarget.screen === 'quartic'
    ) {
      if (replayTarget.screen === 'quadratic') {
        setQuadraticCoefficients([...replayTarget.coefficients]);
      } else if (replayTarget.screen === 'cubic') {
        setCubicCoefficients([...replayTarget.coefficients]);
      } else {
        setQuarticCoefficients([...replayTarget.coefficients]);
      }
    } else if (replayTarget.screen === 'linear2' && replayTarget.system) {
      setSystem2(copySystem(replayTarget.system));
    } else if (replayTarget.screen === 'linear3' && replayTarget.system) {
      setSystem3(copySystem(replayTarget.system));
    } else if (replayTarget.screen === 'polynomialSystem2') {
      setPolynomialSystem2Latex([...replayTarget.polynomialSystem2Latex] as [string, string]);
    }
  }

  function setPolynomialCoefficient(
    view: PolynomialEquationView,
    index: number,
    value: number,
  ) {
    const nextValue = Number.isFinite(value) ? value : 0;
    const setter =
      view === 'quadratic'
        ? setQuadraticCoefficients
        : view === 'cubic'
          ? setCubicCoefficients
          : setQuarticCoefficients;

    setter((currentCoefficients) =>
      currentCoefficients.map((coefficient, coefficientIndex) =>
        coefficientIndex === index ? nextValue : coefficient,
      ),
    );
  }

  function setSystemCell(size: 2 | 3, row: number, column: number, value: number) {
    const setter = size === 2 ? setSystem2 : setSystem3;
    setter((currentSystem) =>
      currentSystem.map((currentRow, rowIndex) =>
        currentRow.map((cell, columnIndex) =>
          rowIndex === row && columnIndex === column ? (Number.isFinite(value) ? value : 0) : cell,
        ),
      ),
    );
  }

  function setPolynomialSystemEquation(index: 0 | 1, latex: string) {
    setPolynomialSystem2Latex((currentSystem) =>
      currentSystem.map((entry, entryIndex) => entryIndex === index ? latex : entry) as [string, string]);
  }

  function readLiveEquationSnapshot() {
    let liveEquationLatex = latestEquationLatexRef.current;

    if (currentModeRef.current === 'equation' && equationScreen === 'symbolic') {
      const liveField = mainFieldRef.current
        ?? (document.querySelector('[data-testid="main-editor"]') as MathfieldElement | null);
      const fieldLatex = liveField?.getValue?.('latex');
      if (typeof fieldLatex === 'string') {
        liveEquationLatex = trimHarmlessTrailingMathSpacing(
          normalizeRelationOperatorLatex(fieldLatex),
        );
        latestEquationLatexRef.current = liveEquationLatex;
      }
    }

    return {
      equationLatex: liveEquationLatex,
      equationInputLatex: equationInputLatexForScreen(
        equationScreen,
        liveEquationLatex,
        quadraticCoefficients,
        cubicCoefficients,
        quarticCoefficients,
        polynomialSystem2Latex,
      ),
    };
  }

  activeEquationRuntimeRef.current = {
    equationLatex: latestEquationLatexRef.current,
    equationInputLatex: latestEquationInputLatex,
    equationScreen,
    equationSolveTarget,
    quadraticCoefficients,
    cubicCoefficients,
    quarticCoefficients,
    polynomialSystem2Latex,
    system2,
    system3,
    equationNumericSolvePanel: effectiveEquationNumericSolvePanel,
    equationComplexRegionPanel: effectiveEquationComplexRegionPanel,
    settings,
    ansLatex,
    variableMemory: storedVariables,
    replayVariableSubstitutions,
  };

  const getActiveEquationRequest = (
    kind: EquationRequestKind,
  ): RunEquationModeRequest | null => {
    const active = activeEquationRuntimeRef.current;
    if (!active) {
      return null;
    }

    return buildEquationRequestFromState(
      active,
      kind,
      readLiveEquationSnapshot(),
    );
  };

  const resolveActiveEquationInputRevision = (
    kind: EquationRequestKind,
    job: OoeJobIdentity,
    buildInputRevisionId: (request: RunEquationModeRequest) => string,
  ) =>
    resolveWorkspaceOriginInputRevision(job, {
      buildInputRevisionId,
      getActiveWorkspaceInstanceRuntimeContext,
      getWorkspaceInstances,
      readLiveRequest: () => getActiveEquationRequest(kind),
      readRequestFromSurfaceState: (surfaceState, instance) =>
        equationRequestFromSurfaceState(surfaceState, instance, kind, {
          settings,
          storedVariables,
        }),
    });

  const equationRuntimeController = createEquationRuntimeController({
    equationScreen,
    equationLatex: latestEquationLatexRef.current,
    equationSolveTarget,
    equationInputLatex: latestEquationInputLatex,
    quadraticCoefficients,
    cubicCoefficients,
    quarticCoefficients,
    polynomialSystem2Latex,
    system2,
    system3,
    equationNumericSolvePanel: effectiveEquationNumericSolvePanel,
    equationComplexRegionPanel: effectiveEquationComplexRegionPanel,
    currentMode,
    displayOutcome,
    ansLatex,
    settings,
    variableMemory: storedVariables,
    replayVariableSubstitutions,
    clearReplayVariableSubstitutions,
    setRuntimeStatusOverride,
    reserveHistoryTicket: (input) => reserveHistoryTicket(input),
    discardHistoryTicket,
    shouldCommitVisibleEquationOutcome: () => currentModeRef.current === 'equation',
    startTransition,
    commitOutcome: commitOutcome as unknown as (
      outcome: DisplayOutcome,
      inputLatex: string,
      mode: 'calculate' | 'equation',
      replayContext?: Record<string, unknown>,
    ) => void,
    switchToEquationWithLatex,
    isSimultaneousEquationScreen,
    getActiveEquationRequest,
    getActiveWorkspaceInstanceRuntimeContext,
    resolveActiveEquationInputRevision,
    getLiveEquationSnapshot: readLiveEquationSnapshot,
  });

  const equationWorkspaceProps = {
    routeMeta: equationRouteMeta,
    screen: equationScreen,
    isMenuOpen: isEquationMenuOpen,
    currentMenuScreen: currentEquationMenuScreen,
    menuPanelRef: equationMenuPanelRef,
    menuEntries: equationMenuEntries,
    currentMenuIndex: currentEquationMenuIndex,
    menuFooterText: equationMenuFooterText,
    onOpenScreen: openEquationScreen,
    onHoverMenuIndex: setCurrentEquationMenuIndex,
    system2,
    system3,
    systemInputRefs,
    onSetSystemCell: setSystemCell,
    polynomialSystem2Latex,
    onSetPolynomialSystemEquation: setPolynomialSystemEquation,
    onFocusPolynomialSystemField: (field: MathfieldElement) => {
      systemInputRefs.current.polynomialSystem2 = field;
      activeFieldRef.current = field;
    },
    activePolynomialView,
    activePolynomialMeta,
    activePolynomialCoefficients,
    polynomialInputRefs,
    onSetPolynomialCoefficient: setPolynomialCoefficient,
    polynomialTemplateLatex,
    buildPolynomialEquationLatex,
    solveTargetCandidates: equationSolveTargetResolution?.candidates ?? [],
    selectedSolveTarget: equationSolveTargetResolution?.selectedTarget ?? null,
    answerMode: settings.equationAnswerMode,
    shouldShowSolveTargetSelector: Boolean(equationSolveTargetResolution?.shouldShowSelector),
    solveTargetMessage: equationSolveTargetResolution?.message,
    onSelectSolveTarget: setEquationSolveTarget,
    onSetAnswerMode: (mode: EquationAnswerMode) => patchSettings({ equationAnswerMode: mode }),
    ...buildEquationExplicitNumericPanelWorkspaceProps({
      controller: equationRuntimeController,
      displayOutcome,
      setNumericPanelEnabled: setEquationNumericSolvePanelEnabled,
      numericPanel: effectiveEquationNumericSolvePanel,
      updateNumericPanel: numericSolvePanel.updatePanel,
      complexRegionPanel: effectiveEquationComplexRegionPanel,
      complexRegionControls: complexRegionPanel,
    }),
    onOpenGuideArticle: openGuideArticle,
    onOpenGuideMode: () => openGuideMode('equation'),
    storedVariables,
  };

  return {
    activePolynomialCoefficients,
    activePolynomialMeta,
    activePolynomialView,
    captureEquationSurfaceState,
    clearActiveEquationDraft,
    currentEquationMenuIndex,
    currentEquationMenuScreen,
    cubicCoefficients,
    equationAlgebraTransformAnalysis,
    equationAlgebraTransforms,
    equationAlgebraTrayOpen,
    equationEditorAnalysisStatuses,
    equationInputLatex,
    equationLatex,
    equationMenuEntries,
    equationMenuFooterText,
    equationMenuPanelRef,
    equationMenuSelection,
    equationNumericSolvePanel: effectiveEquationNumericSolvePanel,
    equationComplexRegionPanel: effectiveEquationComplexRegionPanel,
    equationResultBadges,
    equationResultTitle,
    equationRouteMeta,
    equationRuntimeController,
    equationScreen,
    equationSolveTarget,
    equationSolveTargetAnalysis,
    equationSolveTargetResolution,
    equationSoftActions,
    equationWorkspaceProps,
    getActiveEquationRequest,
    goBackInEquation,
    isEquationMenuOpen,
    isEquationWorkScreen,
    openPromptTarget: equationRuntimeController.openPromptTarget,
    latestEquationInputLatex,
    latestEquationLatexRef,
    moveCurrentEquationMenuSelection,
    openEquationMenuDigitEntry,
    openEquationScreen,
    openSelectedEquationMenuEntry,
    polynomialInputRefs,
    polynomialSystem2Latex,
    quadraticCoefficients,
    quarticCoefficients,
    readLiveEquationSnapshot,
    resetCurrentEquationScreen,
    resetEquationRuntime,
    restoreEquationSurfaceState,
    restoreEquationHistoryEntry,
    runEquationAction: equationRuntimeController.runEquationAction,
    runEquationAlgebraTransformAction: equationRuntimeController.runEquationAlgebraTransformAction,
    runEquationNumericSolveAction: equationRuntimeController.runEquationNumericSolveAction,
    selectedEquationMenuEntry,
    setCurrentEquationMenuIndex,
    setEquationAlgebraTrayOpen,
    setEquationLatex,
    setEquationNumericSolvePanel,
    setEquationScreen,
    setEquationSolveTarget,
    setPolynomialSystem2Latex,
    shouldAllowEquationNumericSolve: equationRuntimeController.shouldAllowEquationNumericSolve,
    shouldShowEquationAlgebraTray,
    shouldShowEquationNumericSolvePanel: equationRuntimeController.shouldShowEquationNumericSolvePanel,
    switchToEquationWithLatex,
    system2,
    systemInputRefs,
    system3,
    toggleEquationAlgebraTray: () => setEquationAlgebraTrayOpen((open) => !open),
  };
}
