import { analyzeVariablesFromLatex } from '../../algebra/variable-core';
import {
  applyStoredVariableSubstitutions,
  ignoredStoredValuePolicyLines,
  resolveStoredValueModePolicy,
  storedValueReadbackSections,
  type StoredVariableSubstitutionResult,
} from '../../algebra/variable-memory';
import { normalizeExplicitNamedVariablesInLatex } from '../../algebra/named-variable';
import { normalizeComplexLocusFunctionSyntax } from '../../equation/complex/locus-policy';
import { resolveEquationSolveTarget } from '../../equation/equation-target';
import type {
  ResultProducerDraft,
  NumericSolveInterval,
  StoredVariableValue,
  VariableSubstitutionSnapshot,
} from '../../../types/calculator';
import { createEquationResultOutcome } from '../../equation/equation-solve-result';

type StoredValueConsentErrorOutcome = Extract<ResultProducerDraft, { kind: 'error' }>;

export function withStoredValueDetails(
  outcome: ResultProducerDraft,
  input: {
    substitution: StoredVariableSubstitutionResult;
    target?: string;
    interval?: NumericSolveInterval;
    originalLatex: string;
    replayedSnapshot: boolean;
    ignoredLines?: readonly string[];
    additionalPolicyLines?: readonly string[];
  },
): ResultProducerDraft {
  const storedValueDetails = storedValueReadbackSections({
    substitutions: input.substitution.substitutions,
    protectedSubstitutions: input.substitution.protectedSubstitutions,
    protectedNameDescriptions: input.target ? { [input.target]: 'the solve target' } : {},
    originalLatex: input.originalLatex,
    effectiveLatex: input.substitution.latex,
    effectiveLabel: input.target ? `Effective equation for ${input.target}` : 'Effective equation',
    replayedSnapshot: input.replayedSnapshot,
    ignoredLines: [
      ...(input.additionalPolicyLines ?? []),
      ...(input.ignoredLines ?? []),
    ],
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

  const nextOutcome = createEquationResultOutcome({
    ...outcome,
    ...(scopedNoRootError ? { error: scopedNoRootError } : {}),
    detailSections: [
      ...storedValueDetails,
      ...(outcome.detailSections ?? []),
    ],
  });

  return nextOutcome.kind === 'success' && input.substitution.substitutions.length > 0
    ? createEquationResultOutcome({ ...nextOutcome, variableSubstitutions: [...input.substitution.substitutions] })
    : nextOutcome;
}

export function remainingApproximateModeParameters(latex: string, target?: string) {
  const analysis = analyzeVariablesFromLatex(normalizeComplexLocusFunctionSyntax(latex), {
    allowSymbolicParameters: true,
  });
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
  forceStoredValueSubstitution?: boolean;
  numericInterval?: NumericSolveInterval;
  storedVariables?: readonly StoredVariableValue[];
  variableSubstitutionSnapshot?: readonly VariableSubstitutionSnapshot[];
}) {
  const {
    equationLatex,
    equationSolveTarget,
    forceNumericPolicy = false,
    forceStoredValueSubstitution = false,
    numericInterval,
    storedVariables,
    variableSubstitutionSnapshot,
  } = input;
  const useNumericPolicy = forceNumericPolicy || forceStoredValueSubstitution || Boolean(numericInterval);
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

export function shouldOfferEquationStoredValueConsent(input: {
  equationLatex: string;
  equationSolveTarget?: string | null;
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

  return remainingNonTargetNames.length > 0;
}

function finiteStoredValueNames(
  entries: readonly StoredVariableValue[] | readonly VariableSubstitutionSnapshot[] | undefined,
) {
  return new Set(
    (entries ?? [])
      .filter((entry) => Number.isFinite(entry.numericValue))
      .map((entry) => entry.name),
  );
}

function missingStoredValueOutcome(input: {
  protectedTarget?: string;
  requiredNames: readonly string[];
  missingNames: readonly string[];
}): StoredValueConsentErrorOutcome {
  const missingText = nameListText(input.missingNames);
  return createEquationResultOutcome({
    kind: 'error',
    title: 'Use Stored Values',
    error: `Missing stored values for: ${missingText}.`,
    detailSections: [
      {
        title: 'Variable Policy',
        lineKind: 'text',
        lines: [
          `Protected solve target: ${input.protectedTarget ?? 'none'}.`,
          `Parameters needing stored values: ${nameListText(input.requiredNames)}.`,
        ],
      },
      {
        title: 'What To Try',
        lineKind: 'text',
        lines: [
          `Add stored values for ${missingText} in Vars, then choose Use Stored Values again.`,
        ],
      },
    ],
    warnings: [],
    answerMode: 'exact',
  });
}

export type EquationStoredValueConsentResult =
  | {
      kind: 'ready';
      protectedTarget?: string;
      effectiveLatex: string;
      variableSubstitutionSnapshot: VariableSubstitutionSnapshot[];
    }
  | {
      kind: 'error';
      outcome: StoredValueConsentErrorOutcome;
    };

export function prepareEquationStoredValueSolveConsent(input: {
  equationLatex: string;
  equationSolveTarget?: string | null;
  storedVariables?: readonly StoredVariableValue[];
  variableSubstitutionSnapshot?: readonly VariableSubstitutionSnapshot[];
}): EquationStoredValueConsentResult {
  const substitutionSource = input.variableSubstitutionSnapshot ?? input.storedVariables;
  const { protectedTarget, substitution } = prepareEquationStoredValueSubstitution({
    equationLatex: input.equationLatex,
    equationSolveTarget: input.equationSolveTarget,
    forceStoredValueSubstitution: true,
    storedVariables: input.storedVariables,
    variableSubstitutionSnapshot: input.variableSubstitutionSnapshot,
  });
  const effectiveLatex = normalizeExplicitNamedVariablesInLatex(substitution.latex).latex;
  const normalizedOriginalLatex = normalizeExplicitNamedVariablesInLatex(input.equationLatex).latex;
  const requiredNonTargetNames = uniqueSortedNames(
    remainingApproximateModeParameters(normalizedOriginalLatex, protectedTarget),
  );
  const availableNames = finiteStoredValueNames(substitutionSource);
  const missingNames = requiredNonTargetNames.filter((name) => !availableNames.has(name));

  if (missingNames.length > 0) {
    return {
      kind: 'error',
      outcome: missingStoredValueOutcome({
        protectedTarget,
        requiredNames: requiredNonTargetNames,
        missingNames,
      }),
    };
  }

  return {
    kind: 'ready',
    protectedTarget,
    effectiveLatex,
    variableSubstitutionSnapshot: [...substitution.substitutions],
  };
}
