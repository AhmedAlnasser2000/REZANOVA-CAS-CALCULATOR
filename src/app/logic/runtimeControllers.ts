import type {
  AlgebraTransformAction,
} from '../../lib/algebra-transform';
import { runCalculateAlgebraTransform, runCalculateMode } from '../../lib/modes/calculate';
import { runEquationAlgebraTransform, runEquationMode } from '../../lib/modes/equation';
import type {
  CalculateAction,
  CalculateRouteMeta,
  CalculateScreen,
  DisplayOutcome,
  EquationScreen,
  IntegralWorkbenchState,
  LimitDirection,
  LimitWorkbenchState,
  ModeId,
  NumericSolveInterval,
  Settings,
} from '../../types/calculator';

type TransitionFn = (callback: () => void) => void;

type CommitOutcomeFn = (
  outcome: DisplayOutcome,
  inputLatex: string,
  mode: 'calculate' | 'equation',
  replayContext?: Record<string, unknown>,
) => void;

type RetitleOutcomeFn = (outcome: DisplayOutcome, title: string) => DisplayOutcome;

type EquationNumericSolvePanelState = {
  enabled: boolean;
  start: string;
  end: string;
  subdivisions: number;
};

type CalculateRuntimeDeps = {
  calculateLatex: string;
  calculateScreen: CalculateScreen;
  calculateRouteMeta: CalculateRouteMeta | null;
  calculateWorkbenchExpression: {
    latex: string;
    limitDirection?: LimitDirection;
  };
  integralWorkbench: IntegralWorkbenchState;
  limitWorkbench: LimitWorkbenchState;
  isCalculateToolOpen: boolean;
  settings: Pick<Settings, 'angleUnit' | 'outputStyle'>;
  ansLatex: string;
  startTransition: TransitionFn;
  setDisplayOutcome: (outcome: DisplayOutcome) => void;
  commitOutcome: CommitOutcomeFn;
  retitleOutcome: RetitleOutcomeFn;
};

type EquationRuntimeDeps = {
  equationScreen: EquationScreen;
  equationLatex: string;
  equationInputLatex: string;
  quadraticCoefficients: number[];
  cubicCoefficients: number[];
  quarticCoefficients: number[];
  system2: number[][];
  system3: number[][];
  equationNumericSolvePanel: EquationNumericSolvePanelState;
  currentMode: ModeId;
  displayOutcome: DisplayOutcome | null;
  ansLatex: string;
  settings: Pick<Settings, 'angleUnit' | 'outputStyle'>;
  startTransition: TransitionFn;
  commitOutcome: CommitOutcomeFn;
  switchToEquationWithLatex: (latex: string) => void;
  isSimultaneousEquationScreen: (screen: EquationScreen) => boolean;
};

function buildCalculateWorkbenchError(
  deps: CalculateRuntimeDeps,
): DisplayOutcome {
  const screenTitle =
    deps.calculateScreen === 'derivativePoint'
      ? 'Derivative at Point'
      : deps.calculateRouteMeta?.label ?? 'Calculate';

  const error =
    deps.calculateScreen === 'derivative'
      ? 'Enter an expression in x before differentiating.'
      : deps.calculateScreen === 'derivativePoint'
        ? 'Enter an expression in x and a numeric point before evaluating the derivative.'
        : deps.calculateScreen === 'integral'
          ? deps.integralWorkbench.kind === 'indefinite'
            ? 'Enter an integrand in x before evaluating the integral.'
            : 'Enter an integrand in x and numeric bounds before evaluating the integral.'
          : deps.limitWorkbench.targetKind === 'finite'
            ? 'Enter an expression in x and a numeric target before evaluating the limit.'
            : 'Enter an expression in x before evaluating the limit at infinity.';

  return {
    kind: 'error',
    title: screenTitle,
    error,
    warnings: [],
  };
}

export function createCalculateRuntimeController(deps: CalculateRuntimeDeps) {
  function runCalculateAction(action: CalculateAction) {
    deps.startTransition(() => {
      const outcome = runCalculateMode({
        action,
        latex: deps.calculateLatex,
        angleUnit: deps.settings.angleUnit,
        outputStyle: deps.settings.outputStyle,
        ansLatex: deps.ansLatex,
      });

      deps.commitOutcome(outcome, deps.calculateLatex, 'calculate');
    });
  }

  function runCalculateAlgebraTransformAction(action: AlgebraTransformAction) {
    deps.startTransition(() => {
      const outcome = runCalculateAlgebraTransform({
        action,
        latex: deps.calculateLatex,
        angleUnit: deps.settings.angleUnit,
      });

      deps.commitOutcome(outcome, deps.calculateLatex, 'calculate');
    });
  }

  function runCalculateWorkbenchAction() {
    if (!deps.isCalculateToolOpen || !deps.calculateRouteMeta) {
      return;
    }

    const generated = deps.calculateWorkbenchExpression.latex.trim();
    if (!generated) {
      deps.setDisplayOutcome(buildCalculateWorkbenchError(deps));
      return;
    }

    deps.startTransition(() => {
      const outcome = runCalculateMode({
        action: 'evaluate',
        latex: generated,
        angleUnit: deps.settings.angleUnit,
        outputStyle: deps.settings.outputStyle,
        ansLatex: deps.ansLatex,
        limitDirection: deps.calculateWorkbenchExpression.limitDirection,
        limitTargetKind:
          deps.calculateScreen === 'limit' ? deps.limitWorkbench.targetKind : undefined,
      });

      deps.commitOutcome(
        deps.retitleOutcome(outcome, deps.calculateRouteMeta?.label ?? 'Calculate'),
        generated,
        'calculate',
      );
    });
  }

  return {
    runCalculateAction,
    runCalculateAlgebraTransformAction,
    runCalculateWorkbenchAction,
  };
}

export function createEquationRuntimeController(deps: EquationRuntimeDeps) {
  function runEquationAction() {
    deps.startTransition(() => {
      const outcome = runEquationMode({
        equationScreen: deps.equationScreen,
        equationLatex: deps.equationLatex,
        quadraticCoefficients: deps.quadraticCoefficients,
        cubicCoefficients: deps.cubicCoefficients,
        quarticCoefficients: deps.quarticCoefficients,
        system2: deps.system2,
        system3: deps.system3,
        angleUnit: deps.settings.angleUnit,
        outputStyle: deps.settings.outputStyle,
        ansLatex: deps.ansLatex,
      });

      deps.commitOutcome(
        outcome,
        deps.isSimultaneousEquationScreen(deps.equationScreen) ? 'linear-system' : deps.equationInputLatex,
        'equation',
      );
    });
  }

  function runEquationAlgebraTransformAction(action: AlgebraTransformAction) {
    deps.startTransition(() => {
      const outcome = runEquationAlgebraTransform({
        action,
        equationLatex: deps.equationLatex,
        angleUnit: deps.settings.angleUnit,
      });

      deps.commitOutcome(outcome, deps.equationInputLatex, 'equation');
    });
  }

  function runEquationNumericSolveAction() {
    if (deps.equationScreen !== 'symbolic') {
      return;
    }

    deps.startTransition(() => {
      const interval: NumericSolveInterval = {
        start: deps.equationNumericSolvePanel.start,
        end: deps.equationNumericSolvePanel.end,
        subdivisions: deps.equationNumericSolvePanel.subdivisions,
      };

      const outcome = runEquationMode({
        equationScreen: deps.equationScreen,
        equationLatex: deps.equationLatex,
        quadraticCoefficients: deps.quadraticCoefficients,
        cubicCoefficients: deps.cubicCoefficients,
        quarticCoefficients: deps.quarticCoefficients,
        system2: deps.system2,
        system3: deps.system3,
        angleUnit: deps.settings.angleUnit,
        outputStyle: deps.settings.outputStyle,
        ansLatex: deps.ansLatex,
        numericInterval: interval,
      });

      deps.commitOutcome(
        outcome,
        deps.equationInputLatex,
        'equation',
        outcome.kind === 'success' && outcome.solveBadges?.includes('Numeric Interval')
          ? { numericInterval: interval }
          : {},
      );
    });
  }

  function shouldAllowEquationNumericSolve() {
    if (deps.equationScreen !== 'symbolic') {
      return false;
    }

    if (deps.currentMode !== 'equation' || !deps.displayOutcome || deps.displayOutcome.kind === 'prompt') {
      return true;
    }

    return !(deps.displayOutcome.solveBadges ?? []).includes('Range Guard');
  }

  function shouldShowEquationNumericSolvePanel() {
    if (deps.equationScreen !== 'symbolic') {
      return false;
    }

    if (!shouldAllowEquationNumericSolve()) {
      return false;
    }

    if (deps.equationNumericSolvePanel.enabled) {
      return true;
    }

    if (deps.currentMode !== 'equation' || deps.displayOutcome?.kind !== 'error') {
      return false;
    }

    const errorText = deps.displayOutcome.error;

    return ![
      'Enter an equation containing x.',
      'Equation mode solves for x.',
      'Equation mode currently solves only = equations.',
      'This equation contains an indefinite integral',
      'This equation requires a trig rewrite outside the supported pre-solve set',
    ].some((fragment) => errorText.includes(fragment));
  }

  function openPromptTarget() {
    if (deps.displayOutcome?.kind !== 'prompt' || deps.displayOutcome.targetMode !== 'equation') {
      return;
    }

    deps.switchToEquationWithLatex(deps.displayOutcome.carryLatex);
  }

  return {
    openPromptTarget,
    runEquationAction,
    runEquationAlgebraTransformAction,
    runEquationNumericSolveAction,
    shouldAllowEquationNumericSolve,
    shouldShowEquationNumericSolvePanel,
  };
}
