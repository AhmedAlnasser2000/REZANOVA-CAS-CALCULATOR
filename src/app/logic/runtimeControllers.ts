import type {
  AlgebraTransformAction,
} from '../../lib/algebra/algebra-transform';
import { trimHarmlessTrailingMathSpacing } from '../../lib/input/input-canonicalization';
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
  StoredVariableValue,
  VariableSubstitutionSnapshot,
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
  variableMemory: StoredVariableValue[];
  calculateReplayVariableSubstitutions?: {
    inputLatex: string;
    substitutions: VariableSubstitutionSnapshot[];
  } | null;
  clearCalculateReplayVariableSubstitutions?: () => void;
  startTransition: TransitionFn;
  setDisplayOutcome: (outcome: DisplayOutcome) => void;
  commitOutcome: CommitOutcomeFn;
  retitleOutcome: RetitleOutcomeFn;
};

type EquationRuntimeDeps = {
  equationScreen: EquationScreen;
  equationLatex: string;
  equationSolveTarget?: string | null;
  equationInputLatex: string;
  quadraticCoefficients: number[];
  cubicCoefficients: number[];
  quarticCoefficients: number[];
  polynomialSystem2Latex: readonly [string, string];
  system2: number[][];
  system3: number[][];
  equationNumericSolvePanel: EquationNumericSolvePanelState;
  currentMode: ModeId;
  displayOutcome: DisplayOutcome | null;
  ansLatex: string;
  settings: Pick<Settings, 'angleUnit' | 'outputStyle'>;
  variableMemory: StoredVariableValue[];
  replayVariableSubstitutions?: {
    mode: ModeId;
    inputLatex: string;
    substitutions: VariableSubstitutionSnapshot[];
  } | null;
  clearReplayVariableSubstitutions?: () => void;
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

function equationNumericSolveAdvisory(outcome: DisplayOutcome | null) {
  return outcome?.runtimeAdvisories?.equationNumericSolve;
}

function buildRuntimeLoadError(title: string, error: unknown): DisplayOutcome {
  return {
    kind: 'error',
    title,
    error: error instanceof Error
      ? `Could not load the ${title} runtime: ${error.message}`
      : `Could not load the ${title} runtime.`,
    warnings: [],
  };
}

export function createCalculateRuntimeController(deps: CalculateRuntimeDeps) {
  function runCalculateAction(action: CalculateAction) {
    deps.startTransition(() => {
      const executionLatex = trimHarmlessTrailingMathSpacing(deps.calculateLatex);
      void import('../../lib/modes/calculate')
        .then(async ({ runCalculateMode, runCalculateModeWithOoePilot }) => {
          const request = {
            action,
            latex: executionLatex,
            angleUnit: deps.settings.angleUnit,
            outputStyle: deps.settings.outputStyle,
            ansLatex: deps.ansLatex,
            calculateScreen: deps.calculateScreen,
            storedVariables: deps.variableMemory,
            variableSubstitutionSnapshot:
              deps.calculateReplayVariableSubstitutions?.inputLatex === executionLatex
                ? deps.calculateReplayVariableSubstitutions.substitutions
                : undefined,
          };
          const outcome =
            deps.calculateScreen === 'standard'
              ? (await runCalculateModeWithOoePilot(request)).payload
              : runCalculateMode(request);

          deps.commitOutcome(outcome, executionLatex, 'calculate');
          deps.clearCalculateReplayVariableSubstitutions?.();
        })
        .catch((error: unknown) => deps.setDisplayOutcome(buildRuntimeLoadError('Calculate', error)));
    });
  }

  function runCalculateAlgebraTransformAction(action: AlgebraTransformAction) {
    deps.startTransition(() => {
      const executionLatex = trimHarmlessTrailingMathSpacing(deps.calculateLatex);
      void import('../../lib/modes/calculate')
        .then(({ runCalculateAlgebraTransform }) => {
          const outcome = runCalculateAlgebraTransform({
            action,
            latex: executionLatex,
            angleUnit: deps.settings.angleUnit,
            storedVariables: deps.variableMemory,
            variableSubstitutionSnapshot:
              deps.calculateReplayVariableSubstitutions?.inputLatex === executionLatex
                ? deps.calculateReplayVariableSubstitutions.substitutions
                : undefined,
          });

          deps.commitOutcome(outcome, executionLatex, 'calculate');
          deps.clearCalculateReplayVariableSubstitutions?.();
        })
        .catch((error: unknown) => deps.setDisplayOutcome(buildRuntimeLoadError('Calculate', error)));
    });
  }

  function runCalculateWorkbenchAction() {
    if (!deps.isCalculateToolOpen || !deps.calculateRouteMeta) {
      return;
    }

    const generated = trimHarmlessTrailingMathSpacing(deps.calculateWorkbenchExpression.latex);
    if (!generated) {
      deps.setDisplayOutcome(buildCalculateWorkbenchError(deps));
      return;
    }

    deps.startTransition(() => {
      void import('../../lib/modes/calculate')
        .then(({ runCalculateMode }) => {
          const outcome = runCalculateMode({
            action: 'evaluate',
            latex: generated,
            angleUnit: deps.settings.angleUnit,
            outputStyle: deps.settings.outputStyle,
            ansLatex: deps.ansLatex,
            calculateScreen: deps.calculateScreen,
            limitDirection: deps.calculateWorkbenchExpression.limitDirection,
            limitTargetKind:
              deps.calculateScreen === 'limit' ? deps.limitWorkbench.targetKind : undefined,
            storedVariables: deps.variableMemory,
            variableSubstitutionSnapshot:
              deps.calculateReplayVariableSubstitutions?.inputLatex === generated
                ? deps.calculateReplayVariableSubstitutions.substitutions
                : undefined,
          });

          deps.commitOutcome(
            deps.retitleOutcome(outcome, deps.calculateRouteMeta?.label ?? 'Calculate'),
            generated,
            'calculate',
          );
          deps.clearCalculateReplayVariableSubstitutions?.();
        })
        .catch((error: unknown) => deps.setDisplayOutcome(buildRuntimeLoadError('Calculate', error)));
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
      const executionLatex = trimHarmlessTrailingMathSpacing(deps.equationLatex);
      const committedInput =
        deps.equationScreen === 'linear2' || deps.equationScreen === 'linear3'
          ? 'linear-system'
          : trimHarmlessTrailingMathSpacing(deps.equationInputLatex);
      void import('../../lib/modes/equation')
        .then(async ({ runEquationMode, runEquationModeWithOoePilot }) => {
          const request = {
            equationScreen: deps.equationScreen,
            equationLatex: executionLatex,
            equationSolveTarget: deps.equationSolveTarget,
            quadraticCoefficients: deps.quadraticCoefficients,
            cubicCoefficients: deps.cubicCoefficients,
            quarticCoefficients: deps.quarticCoefficients,
            polynomialSystem2Latex: deps.polynomialSystem2Latex,
            system2: deps.system2,
            system3: deps.system3,
            angleUnit: deps.settings.angleUnit,
            outputStyle: deps.settings.outputStyle,
            ansLatex: deps.ansLatex,
            storedVariables: deps.variableMemory,
          };
          const outcome =
            deps.equationScreen === 'symbolic'
              ? (await runEquationModeWithOoePilot(request)).payload
              : runEquationMode(request);

          deps.commitOutcome(
            outcome,
            committedInput,
            'equation',
            deps.equationScreen === 'symbolic' && deps.equationSolveTarget
              ? { equationSolveTarget: deps.equationSolveTarget }
              : {},
          );
        })
        .catch((error: unknown) => {
          deps.commitOutcome(buildRuntimeLoadError('Equation', error), committedInput, 'equation');
        });
    });
  }

  function runEquationAlgebraTransformAction(action: AlgebraTransformAction) {
    deps.startTransition(() => {
      const executionLatex = trimHarmlessTrailingMathSpacing(deps.equationLatex);
      const committedInput = trimHarmlessTrailingMathSpacing(deps.equationInputLatex);
      void import('../../lib/modes/equation')
        .then(({ runEquationAlgebraTransform }) => {
          const outcome = runEquationAlgebraTransform({
            action,
            equationLatex: executionLatex,
            angleUnit: deps.settings.angleUnit,
          });

          deps.commitOutcome(outcome, committedInput, 'equation');
        })
        .catch((error: unknown) => {
          deps.commitOutcome(buildRuntimeLoadError('Equation', error), committedInput, 'equation');
        });
    });
  }

  function runEquationNumericSolveAction() {
    if (deps.equationScreen !== 'symbolic') {
      return;
    }

    deps.startTransition(() => {
      const executionLatex = trimHarmlessTrailingMathSpacing(deps.equationLatex);
      const committedInput = trimHarmlessTrailingMathSpacing(deps.equationInputLatex);
      const interval: NumericSolveInterval = {
        start: deps.equationNumericSolvePanel.start,
        end: deps.equationNumericSolvePanel.end,
        subdivisions: deps.equationNumericSolvePanel.subdivisions,
      };

      void import('../../lib/modes/equation')
        .then(async ({ runEquationModeWithOoePilot }) => {
          const { payload: outcome } = await runEquationModeWithOoePilot({
            equationScreen: deps.equationScreen,
            equationLatex: executionLatex,
            equationSolveTarget: deps.equationSolveTarget,
            quadraticCoefficients: deps.quadraticCoefficients,
            cubicCoefficients: deps.cubicCoefficients,
            quarticCoefficients: deps.quarticCoefficients,
            polynomialSystem2Latex: deps.polynomialSystem2Latex,
            system2: deps.system2,
            system3: deps.system3,
            angleUnit: deps.settings.angleUnit,
            outputStyle: deps.settings.outputStyle,
            ansLatex: deps.ansLatex,
            numericInterval: interval,
            storedVariables: deps.variableMemory,
            variableSubstitutionSnapshot:
              deps.replayVariableSubstitutions?.mode === 'equation'
              && deps.replayVariableSubstitutions.inputLatex === committedInput
                ? deps.replayVariableSubstitutions.substitutions
                : undefined,
          });

          deps.commitOutcome(
            outcome,
            committedInput,
            'equation',
            {
              ...(outcome.kind === 'success' && outcome.solveBadges?.includes('Numeric Interval')
                ? { numericInterval: interval }
                : {}),
              ...(deps.equationSolveTarget ? { equationSolveTarget: deps.equationSolveTarget } : {}),
            },
          );
          deps.clearReplayVariableSubstitutions?.();
        })
        .catch((error: unknown) => {
          deps.commitOutcome(buildRuntimeLoadError('Equation', error), committedInput, 'equation');
        });
    });
  }

  function shouldAllowEquationNumericSolve() {
    if (deps.equationScreen !== 'symbolic') {
      return false;
    }

    if (deps.currentMode !== 'equation' || !deps.displayOutcome || deps.displayOutcome.kind === 'prompt') {
      return true;
    }

    return equationNumericSolveAdvisory(deps.displayOutcome)?.kind !== 'blocked';
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

    return equationNumericSolveAdvisory(deps.displayOutcome)?.kind === 'suggest-on-error';
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
