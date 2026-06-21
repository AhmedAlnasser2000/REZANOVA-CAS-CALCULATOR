import { equationInputLatexForScreen } from '../../lib/modes/equation-ui-model';
import type { RunEquationModeRequest } from '../../lib/modes/equation';
import { trimHarmlessTrailingMathSpacing } from '../../lib/input/input-canonicalization';
import type {
  ActiveEquationRuntimeState,
  EquationRequestKind,
} from './useEquationRuntime';
import { normalizeWorkspaceDisplayState } from './workspace-display-state';
import type { EquationSurfaceState } from './workspace-surface-state';
import type {
  WorkspaceInstance,
  WorkspaceInstanceStateSlot,
} from './workspace-instances';
import type {
  Settings,
  StoredVariableValue,
} from '../../types/calculator';

type LiveEquationSnapshot = {
  equationLatex: string;
  equationInputLatex: string;
} | null;

type EquationOriginContext = {
  settings: Pick<
    Settings,
    | 'angleUnit'
    | 'outputStyle'
    | 'equationAnswerMode'
    | 'equationDomainIntent'
    | 'complexExactForm'
  >;
  storedVariables: StoredVariableValue[];
};

function isEquationSurfaceState(value: WorkspaceInstanceStateSlot): value is EquationSurfaceState {
  return typeof value === 'object'
    && value !== null
    && typeof (value as EquationSurfaceState).equationLatex === 'string';
}

export function buildEquationRequestFromState(
  active: ActiveEquationRuntimeState,
  kind: EquationRequestKind,
  liveSnapshot?: LiveEquationSnapshot,
): RunEquationModeRequest | null {
  if (active.equationScreen !== 'symbolic') {
    return null;
  }

  if (kind === 'numeric-interval' && !active.equationNumericSolvePanel.enabled) {
    return null;
  }

  const snapshot = liveSnapshot ?? {
    equationLatex: active.equationLatex,
    equationInputLatex: active.equationInputLatex,
  };
  const executionLatex = trimHarmlessTrailingMathSpacing(snapshot.equationLatex);
  const committedInput = trimHarmlessTrailingMathSpacing(snapshot.equationInputLatex);
  const numericInterval = kind === 'numeric-interval'
    ? {
        start: active.equationNumericSolvePanel.start,
        end: active.equationNumericSolvePanel.end,
        subdivisions: active.equationNumericSolvePanel.subdivisions,
      }
    : undefined;

  return {
    equationScreen: active.equationScreen,
    equationLatex: executionLatex,
    equationSolveTarget: active.equationSolveTarget,
    equationAnswerMode: kind === 'numeric-interval'
      ? 'exact'
      : active.settings.equationAnswerMode ?? 'exact',
    equationDomainIntent: kind === 'numeric-interval'
      ? 'real'
      : active.settings.equationDomainIntent ?? 'real',
    complexExactForm: active.settings.complexExactForm ?? 'rectangular',
    quadraticCoefficients: active.quadraticCoefficients,
    cubicCoefficients: active.cubicCoefficients,
    quarticCoefficients: active.quarticCoefficients,
    polynomialSystem2Latex: active.polynomialSystem2Latex,
    system2: active.system2,
    system3: active.system3,
    angleUnit: active.settings.angleUnit,
    outputStyle: active.settings.outputStyle,
    ansLatex: active.ansLatex,
    numericInterval,
    storedVariables: active.variableMemory,
    variableSubstitutionSnapshot:
      kind === 'numeric-interval'
      && active.replayVariableSubstitutions?.mode === 'equation'
      && active.replayVariableSubstitutions.inputLatex === committedInput
        ? active.replayVariableSubstitutions.substitutions
        : undefined,
  };
}

export function equationRequestFromSurfaceState(
  surfaceState: WorkspaceInstanceStateSlot,
  instance: WorkspaceInstance,
  kind: EquationRequestKind,
  context: EquationOriginContext,
) {
  if (instance.workspaceKind !== 'equation' || !isEquationSurfaceState(surfaceState)) {
    return null;
  }

  const displayState = normalizeWorkspaceDisplayState(instance.displayState);
  const equationInputLatex = equationInputLatexForScreen(
    surfaceState.equationScreen,
    surfaceState.equationLatex,
    surfaceState.quadraticCoefficients,
    surfaceState.cubicCoefficients,
    surfaceState.quarticCoefficients,
    surfaceState.polynomialSystem2Latex,
  );

  return buildEquationRequestFromState({
    equationLatex: surfaceState.equationLatex,
    equationInputLatex,
    equationScreen: surfaceState.equationScreen,
    equationSolveTarget: surfaceState.equationSolveTarget,
    quadraticCoefficients: surfaceState.quadraticCoefficients,
    cubicCoefficients: surfaceState.cubicCoefficients,
    quarticCoefficients: surfaceState.quarticCoefficients,
    polynomialSystem2Latex: surfaceState.polynomialSystem2Latex,
    system2: surfaceState.system2,
    system3: surfaceState.system3,
    equationNumericSolvePanel: surfaceState.equationNumericSolvePanel,
    settings: context.settings,
    ansLatex: displayState.ansLatex,
    variableMemory: context.storedVariables,
    replayVariableSubstitutions: displayState.replayVariableSubstitutions,
  }, kind);
}
