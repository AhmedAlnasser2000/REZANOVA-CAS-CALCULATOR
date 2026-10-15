import { useCallback, useMemo, useRef } from 'react';
import type {
  CanonicalRuntimeOutcome,
  EquationScreen,
  HistoryEntry,
  PolynomialEquationView,
  SimultaneousEquationView,
} from '../../types/calculator';
import { createCanonicalRuntimeError } from '../../lib/result-contract/runtime-outcome';
import { RETIRED_ENGINE_MESSAGE } from '../../lib/kernel/retired-engine';
import {
  defaultEquationComplexRegionPanelState,
  defaultEquationNumericSolvePanelState,
} from '../logic/appUtils';
import type { EquationSurfaceState } from './workspace-surface-state';

type RetiredEquationRuntimeOptions = {
  commitOutcome: (outcome: CanonicalRuntimeOutcome, inputLatex: string, mode: 'calculate' | 'equation') => void;
  displayOutcome: CanonicalRuntimeOutcome | null;
  openLauncher: () => void;
};

const NO_NUMBERS: number[] = [];

/**
 * The old Equation workspace and its engine are retired (EQUATION-RECONSTRUCTION-CLOSEOUT1 PR B); New Equation is a
 * separate page. The calculator shell still has an `equation` mode slot, so this keeps the values the shell reads
 * inert: no screens, no menus, no drafts. Solving commits the typed retired-engine stop; anything that would open an
 * Equation screen returns to the launcher. Nothing of the old engine or its workspace remains behind it.
 */
export function useRetiredEquationRuntime(options: RetiredEquationRuntimeOptions) {
  const { commitOutcome, displayOutcome, openLauncher } = options;
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
  const equationMenuPanelRef = useRef<HTMLDivElement | null>(null);
  const equationNumericSolvePanel = useMemo(() => defaultEquationNumericSolvePanelState(), []);

  const runEquationAction = useCallback(() => {
    commitOutcome(createCanonicalRuntimeError('Equation', RETIRED_ENGINE_MESSAGE, {
      runtimeAdvisories: { stopReason: { kind: 'unsupported-family', source: 'host' } },
    }), '', 'equation');
  }, [commitOutcome]);

  const openPromptTarget = useCallback(() => {
    if (displayOutcome?.kind === 'prompt' && displayOutcome.targetMode === 'equation') openLauncher();
  }, [displayOutcome, openLauncher]);

  const captureEquationSurfaceState = useCallback((): EquationSurfaceState => ({
    equationLatex: '',
    equationSolveTarget: null,
    equationScreen: 'home',
    equationAlgebraTrayOpen: false,
    equationNumericSolvePanel: defaultEquationNumericSolvePanelState(),
    equationComplexRegionPanel: defaultEquationComplexRegionPanelState(),
    equationMenuSelection: { home: 0, polynomialMenu: 0, simultaneousMenu: 0 },
    quadraticCoefficients: [],
    cubicCoefficients: [],
    quarticCoefficients: [],
    polynomialSystem2Latex: ['', ''],
    system2: [],
    system3: [],
  }), []);

  const noop = useCallback(() => {}, []);
  // Typed as taking the old arguments, which are ignored: the old Equation screens no longer exist.
  const ignore: (value: unknown, options?: unknown) => void = noop;
  const toLauncher: (value: unknown, options?: unknown) => void = openLauncher;

  return {
    captureEquationSurfaceState,
    clearActiveEquationDraft: noop,
    cubicCoefficients: NO_NUMBERS,
    equationAlgebraTransforms: [],
    equationAlgebraTrayOpen: false,
    equationEditorAnalysisStatuses: [],
    equationInputLatex: '',
    equationLatex: '',
    equationMenuEntries: [],
    equationMenuFooterText: '',
    equationMenuPanelRef,
    equationMenuSelection: { home: 0, polynomialMenu: 0, simultaneousMenu: 0 },
    equationNumericSolvePanel,
    equationResultBadges: [] as string[],
    equationResultTitle: 'Equation',
    equationRouteMeta: null,
    equationScreen: 'home' as EquationScreen,
    equationSoftActions: [],
    equationSolveTarget: null as string | null,
    equationSolveTargetResolution: null as { selectedTarget?: string | null } | null,
    goBackInEquation: openLauncher,
    isEquationMenuOpen: false,
    isEquationWorkScreen: false,
    moveCurrentEquationMenuSelection: noop,
    openEquationMenuDigitEntry: noop,
    openEquationScreen: toLauncher as (screen: EquationScreen) => void,
    openPromptTarget,
    openSelectedEquationMenuEntry: noop,
    polynomialInputRefs,
    polynomialSystem2Latex: ['', ''] as [string, string],
    quadraticCoefficients: NO_NUMBERS,
    quarticCoefficients: NO_NUMBERS,
    resetCurrentEquationScreen: noop,
    resetEquationRuntime: noop,
    restoreEquationHistoryEntry: toLauncher as (entry: HistoryEntry) => void,
    restoreEquationSurfaceState: ignore as (state: EquationSurfaceState | null | undefined) => void,
    runEquationAction,
    runEquationAlgebraTransformAction: noop,
    selectedEquationMenuEntry: null,
    setEquationLatex: ignore as (latex: string) => void,
    setEquationSolveTarget: ignore as (target: string | null) => void,
    shouldShowEquationAlgebraTray: false,
    switchToEquationWithLatex: toLauncher as (latex: string, options?: unknown) => void,
    system2: [],
    system3: [],
    systemInputRefs,
    toggleEquationAlgebraTray: noop,
  };
}
