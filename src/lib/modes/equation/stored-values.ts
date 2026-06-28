import { analyzeVariablesFromLatex } from '../../algebra/variable-core';
import {
  applyStoredVariableSubstitutions,
  ignoredStoredValuePolicyLines,
  resolveStoredValueModePolicy,
  storedValueReadbackSections,
  storedVariableSnapshotsInLatex,
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
  forceNumericPolicy?: boolean;
  numericInterval?: NumericSolveInterval;
  storedVariables?: readonly StoredVariableValue[];
  variableSubstitutionSnapshot?: readonly VariableSubstitutionSnapshot[];
}) {
  const {
    equationLatex,
    equationSolveTarget,
    forceNumericPolicy = false,
    numericInterval,
    storedVariables,
    variableSubstitutionSnapshot,
  } = input;
  const useNumericPolicy = forceNumericPolicy || Boolean(numericInterval);
  const namedNormalizedEquationLatex = normalizeExplicitNamedVariablesInLatex(equationLatex).latex;
  const substitutionSource = variableSubstitutionSnapshot ?? storedVariables;
  const targetResolution = useNumericPolicy
    ? resolveEquationSolveTarget(equationLatex, equationSolveTarget)
    : null;
  const protectedTarget = targetResolution?.selectedTarget ?? equationSolveTarget ?? undefined;
  const storedValuePolicy =
    useNumericPolicy && protectedTarget
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

function uniqueSortedNames(names: readonly string[]) {
  return [...new Set(names)].sort((left, right) => left.localeCompare(right));
}

function nameListText(names: readonly string[]) {
  return names.length > 0 ? names.join(', ') : 'none';
}

function numericReadyLine(numericReady: boolean) {
  return numericReady
    ? 'Numeric-ready: yes. Future numeric solving can use the prepared equation once a numeric method or interval is chosen.'
    : 'Numeric-ready: no. Provide stored values for every non-target symbol before using numeric solving.';
}

export function shouldOfferEquationNumericPreparation(input: {
  equationLatex: string;
  equationSolveTarget?: string | null;
  storedVariables?: readonly StoredVariableValue[];
}) {
  const normalizedLatex = normalizeExplicitNamedVariablesInLatex(input.equationLatex).latex;
  if (!normalizedLatex.trim()) {
    return false;
  }

  const target = resolveEquationSolveTarget(
    input.equationLatex,
    input.equationSolveTarget,
  ).selectedTarget ?? undefined;
  if (!target) {
    return false;
  }

  const remainingNonTargetNames = uniqueSortedNames(
    remainingApproximateModeParameters(normalizedLatex, target),
  );
  const relevantStoredValues = storedVariableSnapshotsInLatex(
    normalizedLatex,
    input.storedVariables,
  );

  return relevantStoredValues.length > 0 || remainingNonTargetNames.length > 0;
}

export function prepareEquationNumericSolve(input: {
  equationLatex: string;
  equationSolveTarget?: string | null;
  storedVariables?: readonly StoredVariableValue[];
  variableSubstitutionSnapshot?: readonly VariableSubstitutionSnapshot[];
}): DisplayOutcome {
  const { protectedTarget, substitution } = prepareEquationStoredValueSubstitution({
    equationLatex: input.equationLatex,
    equationSolveTarget: input.equationSolveTarget,
    forceNumericPolicy: true,
    storedVariables: input.storedVariables,
    variableSubstitutionSnapshot: input.variableSubstitutionSnapshot,
  });
  const effectiveLatex = normalizeExplicitNamedVariablesInLatex(substitution.latex).latex;
  const normalizedSubstitution = { ...substitution, latex: effectiveLatex };
  const remainingNonTargetNames = uniqueSortedNames(
    remainingApproximateModeParameters(effectiveLatex, protectedTarget),
  );
  const numericReady = Boolean(protectedTarget) && remainingNonTargetNames.length === 0;
  const storedValueDetails = storedValueReadbackSections({
    substitutions: normalizedSubstitution.substitutions,
    protectedSubstitutions: normalizedSubstitution.protectedSubstitutions,
    protectedNameDescriptions: protectedTarget ? { [protectedTarget]: 'the solve target' } : {},
    originalLatex: input.equationLatex,
    effectiveLatex,
    effectiveLabel: protectedTarget ? `Effective equation for ${protectedTarget}` : 'Effective equation',
    replayedSnapshot: Boolean(input.variableSubstitutionSnapshot),
  });

  return {
    kind: 'success',
    title: 'Prepare Numeric Solve',
    exactLatex: effectiveLatex,
    detailSections: [
      ...storedValueDetails,
      {
        title: 'Numeric Preparation',
        lines: [
          `Protected solve target: ${protectedTarget ?? 'none'}.`,
          `Effective equation: ${effectiveLatex}.`,
          `Remaining non-target symbols: ${nameListText(remainingNonTargetNames)}.`,
          numericReadyLine(numericReady),
        ],
      },
    ],
    warnings: [],
    answerMode: 'exact',
    transformSummaryText: 'Prepared stored values for future numeric solving. No numeric solve was run.',
    ...(normalizedSubstitution.substitutions.length > 0
      ? { variableSubstitutions: [...normalizedSubstitution.substitutions] }
      : {}),
  };
}
