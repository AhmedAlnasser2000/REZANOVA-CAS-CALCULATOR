import { analyzeVariablesFromLatex } from '../../algebra/variable-core';
import {
  applyStoredVariableSubstitutions,
  ignoredStoredValuePolicyLines,
  resolveStoredValueModePolicy,
  storedValueReadbackSections,
  type StoredVariableSubstitutionResult,
} from '../../algebra/variable-memory';
import { normalizeExplicitNamedVariablesInLatex } from '../../algebra/named-variable';
import { resolveEquationSolveTarget } from '../../equation/equation-target';
import type {
  DisplayOutcome,
  NumericSolveInterval,
  StoredVariableValue,
  VariableSubstitutionSnapshot,
} from '../../../types/calculator';

export function withStoredValueDetails(
  outcome: DisplayOutcome,
  input: {
    substitution: StoredVariableSubstitutionResult;
    target?: string;
    interval?: NumericSolveInterval;
    originalLatex: string;
    replayedSnapshot: boolean;
    ignoredLines?: readonly string[];
  },
): DisplayOutcome {
  const storedValueDetails = storedValueReadbackSections({
    substitutions: input.substitution.substitutions,
    protectedSubstitutions: input.substitution.protectedSubstitutions,
    protectedNameDescriptions: input.target ? { [input.target]: 'the solve target' } : {},
    originalLatex: input.originalLatex,
    effectiveLatex: input.substitution.latex,
    effectiveLabel: input.target ? `Effective equation for ${input.target}` : 'Effective equation',
    replayedSnapshot: input.replayedSnapshot,
    ignoredLines: input.ignoredLines,
  });

  if (storedValueDetails.length === 0 || outcome.kind === 'prompt') {
    return outcome;
  }

  const intervalText = input.interval ? `[${input.interval.start}, ${input.interval.end}]` : 'the chosen interval';
  const scopedNoRootError =
    outcome.kind === 'error'
    && input.target
    && input.interval
    && input.substitution.substitutions.length > 0
    && /No bracketed or near-zero real roots were found on the chosen interval\./u.test(outcome.error ?? '')
      ? `No real root for ${input.target} was found inside ${intervalText} for the substituted equation ${input.substitution.latex}. Try widening the interval, shifting the interval center, or increasing subdivisions.`
      : undefined;

  const nextOutcome = {
    ...outcome,
    ...(scopedNoRootError ? { error: scopedNoRootError } : {}),
    detailSections: [
      ...storedValueDetails,
      ...(outcome.detailSections ?? []),
    ],
  };

  return nextOutcome.kind === 'success' && input.substitution.substitutions.length > 0
    ? { ...nextOutcome, variableSubstitutions: [...input.substitution.substitutions] }
    : nextOutcome;
}

export function remainingApproximateModeParameters(latex: string, target?: string) {
  const analysis = analyzeVariablesFromLatex(latex, { allowSymbolicParameters: true });
  return analysis.symbols
    .filter((symbol) => symbol.name !== target)
    .filter((symbol) =>
      symbol.identifierKind === 'single-symbol-variable'
      || symbol.identifierKind === 'named-variable'
      || symbol.identifierKind === 'indexed-symbol-variable')
    .map((symbol) => symbol.name);
}

export function prepareEquationStoredValueSubstitution(input: {
  equationLatex: string;
  equationSolveTarget?: string | null;
  numericInterval?: NumericSolveInterval;
  storedVariables?: readonly StoredVariableValue[];
  variableSubstitutionSnapshot?: readonly VariableSubstitutionSnapshot[];
}) {
  const { equationLatex, equationSolveTarget, numericInterval, storedVariables, variableSubstitutionSnapshot } = input;
  const namedNormalizedEquationLatex = normalizeExplicitNamedVariablesInLatex(equationLatex).latex;
  const substitutionSource = variableSubstitutionSnapshot ?? storedVariables;
  const targetResolution = numericInterval
    ? resolveEquationSolveTarget(equationLatex, equationSolveTarget)
    : null;
  const protectedTarget = targetResolution?.selectedTarget ?? equationSolveTarget ?? undefined;
  const storedValuePolicy =
    numericInterval && protectedTarget
      ? resolveStoredValueModePolicy({
          mode: 'equation',
          action: 'equation-numeric-solve',
          protectedNames: [protectedTarget],
          protectedNameDescriptions: { [protectedTarget]: 'the solve target' },
        })
      : resolveStoredValueModePolicy({
          mode: 'equation',
          action: 'equation-symbolic-solve',
        });
  const substitution =
    storedValuePolicy.kind === 'apply'
      ? applyStoredVariableSubstitutions(equationLatex, substitutionSource, {
          protectedNames: storedValuePolicy.protectedNames,
        })
      : { latex: namedNormalizedEquationLatex, substitutions: [], protectedSubstitutions: [] };

  return {
    protectedTarget,
    substitution,
    ignoredLines: ignoredStoredValuePolicyLines({
      latex: equationLatex,
      entries: substitutionSource,
      policy: storedValuePolicy,
    }),
  };
}
