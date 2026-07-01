import {
  buildDerivativeLatex,
} from '../../lib/calculus/calculus-workbench';
import { parseNaturalDerivativeRequest } from '../../lib/calculus/derivative-request';
import { derivativeVariableOrDefault } from '../../lib/calculus/derivative-target';
import { buildPartialDerivativeLatex } from '../../lib/calculus/workspace/examples';
import type {
  DerivativeVariable,
  DerivativePointWorkbenchState,
  DerivativeWorkbenchState,
  PartialDerivativeWorkbenchState,
} from '../../types/calculator';

type DerivativeEditorScreen = 'derivative' | 'derivativePoint' | 'partialDerivative';
type DerivativeEditorState =
  | DerivativeWorkbenchState
  | DerivativePointWorkbenchState
  | PartialDerivativeWorkbenchState;

function derivativeKindForScreen(screen: DerivativeEditorScreen) {
  return screen === 'partialDerivative' ? 'partial' : 'derivative';
}

function canonicalEditorLatex(screen: DerivativeEditorScreen, state: DerivativeEditorState) {
  const bodyLatex = state.bodyLatex.trim();
  if (!bodyLatex) {
    return '';
  }

  const natural = parseNaturalDerivativeRequest(bodyLatex, derivativeKindForScreen(screen));
  if (natural.ok) {
    return natural.request.canonicalLatex;
  }
  if (natural.looksLikeDerivativeRequest) {
    return '';
  }

  if (screen === 'partialDerivative') {
    return buildPartialDerivativeLatex(state as PartialDerivativeWorkbenchState);
  }

  return buildDerivativeLatex(
    bodyLatex,
    state.variable,
    state.operatorLatex,
  );
}

function variableFromNaturalSource(
  screen: DerivativeEditorScreen,
  sourceLatex: string,
  fallback: string | undefined,
): DerivativeVariable {
  const natural = parseNaturalDerivativeRequest(sourceLatex, derivativeKindForScreen(screen));
  if (natural.ok) {
    return derivativeVariableOrDefault(natural.request.operator.writtenFactors[0]?.variable ?? fallback);
  }
  return derivativeVariableOrDefault(fallback);
}

export function derivativeEditorVariableForState(
  screen: DerivativeEditorScreen,
  state: DerivativeEditorState,
): DerivativeVariable {
  return variableFromNaturalSource(screen, state.bodyLatex, state.variable);
}

export function normalizeDerivativeWorkbenchForEditor(
  seed: Partial<DerivativeWorkbenchState> | undefined,
  currentState: DerivativeWorkbenchState,
): DerivativeWorkbenchState {
  const merged: DerivativeWorkbenchState = {
    ...currentState,
    bodyLatex: seed?.bodyLatex ?? currentState.bodyLatex,
    variable: seed?.variable ?? currentState.variable,
    operatorLatex: seed?.operatorLatex ?? currentState.operatorLatex,
  };
  const sourceLatex = canonicalEditorLatex('derivative', merged);
  if (!sourceLatex) {
    return merged;
  }
  return {
    bodyLatex: sourceLatex,
    variable: variableFromNaturalSource('derivative', sourceLatex, merged.variable),
  };
}

export function normalizeDerivativePointWorkbenchForEditor(
  seed: Partial<DerivativePointWorkbenchState> | undefined,
  currentState: DerivativePointWorkbenchState,
): DerivativePointWorkbenchState {
  const merged: DerivativePointWorkbenchState = {
    ...currentState,
    bodyLatex: seed?.bodyLatex ?? currentState.bodyLatex,
    point: seed?.point ?? currentState.point,
    variable: seed?.variable ?? currentState.variable,
    operatorLatex: seed?.operatorLatex ?? currentState.operatorLatex,
  };
  const sourceLatex = canonicalEditorLatex('derivativePoint', merged);
  if (!sourceLatex) {
    return merged;
  }
  return {
    bodyLatex: sourceLatex,
    point: merged.point,
    variable: variableFromNaturalSource('derivativePoint', sourceLatex, merged.variable),
  };
}

export function normalizePartialDerivativeWorkbenchForEditor(
  seed: Partial<PartialDerivativeWorkbenchState> | undefined,
  currentState: PartialDerivativeWorkbenchState,
): PartialDerivativeWorkbenchState {
  const merged: PartialDerivativeWorkbenchState = {
    ...currentState,
    bodyLatex: seed?.bodyLatex ?? currentState.bodyLatex,
    variable: seed?.variable ?? currentState.variable,
    operatorLatex: seed?.operatorLatex ?? currentState.operatorLatex,
  };
  const sourceLatex = canonicalEditorLatex('partialDerivative', merged);
  if (!sourceLatex) {
    return merged;
  }
  return {
    bodyLatex: sourceLatex,
    variable: variableFromNaturalSource('partialDerivative', sourceLatex, merged.variable),
  };
}

export function derivativeHistorySeedFromState(
  screen: 'derivative',
  state: DerivativeWorkbenchState,
): Partial<DerivativeWorkbenchState>;
export function derivativeHistorySeedFromState(
  screen: 'derivativePoint',
  state: DerivativePointWorkbenchState,
): Partial<DerivativePointWorkbenchState>;
export function derivativeHistorySeedFromState(
  screen: 'partialDerivative',
  state: PartialDerivativeWorkbenchState,
): Partial<PartialDerivativeWorkbenchState>;
export function derivativeHistorySeedFromState(
  screen: DerivativeEditorScreen,
  state: DerivativeEditorState,
) {
  const sourceLatex = canonicalEditorLatex(screen, state);
  if (!sourceLatex) {
    return { ...state };
  }
  if (screen === 'derivativePoint') {
    return {
      bodyLatex: sourceLatex,
      point: (state as DerivativePointWorkbenchState).point,
    };
  }
  return { bodyLatex: sourceLatex };
}

export function derivativeRequestStateFromEditor(
  screen: 'derivative',
  state: DerivativeWorkbenchState,
): DerivativeWorkbenchState;
export function derivativeRequestStateFromEditor(
  screen: 'derivativePoint',
  state: DerivativePointWorkbenchState,
): DerivativePointWorkbenchState;
export function derivativeRequestStateFromEditor(
  screen: 'partialDerivative',
  state: PartialDerivativeWorkbenchState,
): PartialDerivativeWorkbenchState;
export function derivativeRequestStateFromEditor(
  screen: DerivativeEditorScreen,
  state: DerivativeEditorState,
) {
  if (screen === 'derivative') {
    const sourceLatex = canonicalEditorLatex('derivative', state);
    return sourceLatex
      ? { bodyLatex: sourceLatex }
      : normalizeDerivativeWorkbenchForEditor(state, {
        bodyLatex: '',
        variable: 'x',
      });
  }
  if (screen === 'derivativePoint') {
    const sourceLatex = canonicalEditorLatex('derivativePoint', state);
    return sourceLatex
      ? {
        bodyLatex: sourceLatex,
        point: (state as DerivativePointWorkbenchState).point,
      }
      : normalizeDerivativePointWorkbenchForEditor(state, {
        bodyLatex: '',
        point: '',
        variable: 'x',
      });
  }
  return normalizePartialDerivativeWorkbenchForEditor(state, {
    bodyLatex: '',
    variable: 'x',
  });
}
