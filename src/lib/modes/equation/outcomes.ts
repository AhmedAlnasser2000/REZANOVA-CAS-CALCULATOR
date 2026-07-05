import { ComputeEngine } from '@cortex-js/compute-engine';
import { classifyEquationRuntimeAdvisories } from '../../kernel/runtime-policy';
import { attachRuntimeEnvelope } from '../../kernel/runtime-envelope';
import { hasUnsafeSymbolicOutput } from '../../display/symbolic-output-hygiene';
import { normalizeRelationOperatorLatex } from '../../input/input-canonicalization';
import { formatNamedEquationOutcomeTarget, rewriteEquationOutcomeTarget } from '../../equation/equation-target';
import type { ComplexLocusPolicyReport } from '../../equation/complex/locus-policy';
import { buildComplexLocusEvidenceSections } from '../../equation/complex/locus-evidence';
import type { ComplexSolveRegion, DisplayOutcome, EquationAnswerMode, PlannerBadge, SolutionKind } from '../../../types/calculator';

const ce = new ComputeEngine();

export function attachEquationRuntimeEnvelope(
  outcome: DisplayOutcome,
  originalLatex: string,
  resolvedLatex: string,
  plannerBadges: PlannerBadge[] | undefined,
  runtimeAdvisories?: DisplayOutcome['runtimeAdvisories'],
) {
  return attachRuntimeEnvelope(outcome, {
    originalLatex,
    resolvedLatex,
    plannerBadges,
    plannerBadgeMode: 'merge',
    runtimeAdvisories,
  });
}

export function unsafeSymbolicReadbackOutcome(target?: string): DisplayOutcome {
  return {
    kind: 'error',
    title: 'Solve',
    error: 'The exact symbolic readback became unsafe to display.',
    warnings: [],
    detailSections: [
      {
        title: 'Why It Stopped',
        lines: [
          target
            ? `The symbolic solver produced an internal fragment while formatting the exact result for ${target}.`
            : 'The symbolic solver produced an internal fragment while formatting the exact result.',
        ],
      },
      {
        title: 'What To Try',
        lines: [
          'Re-run after rewriting ambiguous products with explicit multiplication, choose a simpler target, or use numeric interval solve for a local answer.',
        ],
      },
    ],
  };
}

export function ensureSafeEquationSuccessOutcome(outcome: DisplayOutcome, target?: string): DisplayOutcome {
  return outcome.kind === 'success' && hasUnsafeSymbolicOutput(outcome)
    ? unsafeSymbolicReadbackOutcome(target)
    : outcome;
}

export function withEquationAnswerMode(outcome: DisplayOutcome, answerMode: EquationAnswerMode): DisplayOutcome {
  return outcome.kind === 'prompt' || outcome.solutionKind === 'approximate-numeric'
    ? outcome
    : { ...outcome, answerMode };
}

export function withEquationSolutionKind(outcome: DisplayOutcome, solutionKind: SolutionKind): DisplayOutcome {
  return outcome.kind === 'success' && !outcome.solutionKind
    ? { ...outcome, solutionKind }
    : outcome;
}

export function withEquationNumericRouteKind(outcome: DisplayOutcome): DisplayOutcome {
  return withEquationSolutionKind(outcome, 'approximate-numeric');
}

export function finalizeSelectedTargetSymbolicOutcome(outcome: DisplayOutcome, target: string): DisplayOutcome {
  return ensureSafeEquationSuccessOutcome(formatNamedEquationOutcomeTarget(outcome, target), target);
}

export function numericIntervalSolveNeedsIntervalOutcome(): DisplayOutcome {
  return {
    kind: 'error',
    title: 'Solve',
    error: 'Numeric Interval Solve needs a numeric interval before it can search for real roots.',
    warnings: [],
    detailSections: [
      {
        title: 'Numeric Solve',
        lines: ['Numeric interval solving searches a chosen real interval and validates candidates against the original equation.'],
      },
      {
        title: 'What To Try',
        lines: [
          'Open Numeric Interval Solve, choose a valid start and end, then run again.',
          'Use Exact or Isolate when you want symbolic output instead.',
        ],
      },
    ],
  };
}

export function numericIntervalSolveNeedsNumericParametersOutcome(parameters: string[]): DisplayOutcome {
  const missingParameters = [...new Set(parameters)];
  const parameterText = missingParameters.join(', ');
  const missingValueLabel = missingParameters.length === 1 ? 'value' : 'values';
  const storeLines = missingParameters.map((parameter) =>
    `Store a numeric value for ${parameter} in Variables.`);
  return {
    kind: 'error',
    title: 'Solve',
    error: `Numeric Interval Solve needs numeric values for every non-target parameter before it can search for real roots. Missing numeric ${missingValueLabel}: ${parameterText}.`,
    warnings: [],
    detailSections: [
      {
        title: 'Numeric Solve',
        lines: ['Numeric interval solving needs a one-variable real-valued equation after stored-value substitution.'],
      },
      {
        title: 'Why It Stopped',
        lines: [
          'At least one non-target symbol has no stored numeric value.',
        ],
      },
      {
        title: 'What To Try',
        lines: [
          ...storeLines,
          'Then run Numeric Interval Solve again with Run / F1 / EXE.',
          'Use Exact or Isolate when you want symbolic parameters preserved.',
        ],
      },
    ],
  };
}

export function complexRegionSolveNeedsNumericParametersOutcome(parameters: string[], protectedTarget?: string): DisplayOutcome {
  const missingParameters = [...new Set(parameters)];
  const parameterText = missingParameters.join(', ');
  const missingValueLabel = missingParameters.length === 1 ? 'value' : 'values';
  const storeLines = missingParameters.map((parameter) =>
    `Store a numeric value for ${parameter} in Variables.`);
  return {
    kind: 'error',
    title: 'Solve',
    error: `Complex Region Solve needs numeric values for every non-target parameter before it can search a bounded complex region. Missing numeric ${missingValueLabel}: ${parameterText}.`,
    warnings: [],
    detailSections: [
      {
        title: 'Complex Region Solve',
        lines: [
          'Complex region solving needs a one-variable complex-valued equation after stored-value substitution.',
          `Protected solve target: ${protectedTarget ?? 'none'}.`,
        ],
      },
      {
        title: 'Why It Stopped',
        lines: [
          'At least one non-target symbol has no stored numeric value.',
        ],
      },
      {
        title: 'What To Try',
        lines: [
          ...storeLines,
          'Then run the bounded Complex region solve again.',
          'Use Exact or Isolate when you want symbolic parameters preserved.',
        ],
      },
    ],
    solutionKind: 'approximate-numeric',
    answerDomain: 'complex',
    numericMethod: 'Complex region nonlinear solve',
  };
}

export function exactModeNeedsExactOutcome(target?: string): DisplayOutcome {
  return {
    kind: 'error',
    title: 'Solve',
    error: 'Exact answer mode could not produce a trustworthy exact closed form.',
    warnings: [],
    detailSections: [
      {
        title: 'Answer Mode',
        lines: ['Answer mode: Exact.'],
      },
      {
        title: 'Why It Stopped',
        lines: [
          'The available solver path produced only a numeric or approximate result, so Exact mode leaves it out.',
        ],
      },
      {
        title: 'What To Try',
        lines: [
          'Use Numeric Interval Solve with finite real bounds when you want interval-local numeric roots.',
          target
            ? `Use Isolate when you want a rearranged formula for ${target}.`
            : 'Use Isolate when you want symbolic rearrangement.',
        ],
      },
    ],
    answerMode: 'exact',
  };
}

function containsTargetNode(node: unknown, target: string): boolean {
  if (node === target) {
    return true;
  }
  if (Array.isArray(node)) {
    return node.some((part) => containsTargetNode(part, target));
  }
  if (node && typeof node === 'object') {
    return Object.values(node).some((part) => containsTargetNode(part, target));
  }
  return false;
}

function containsTargetedAbsNode(node: unknown, target: string): boolean {
  if (!Array.isArray(node)) {
    return false;
  }
  if (node[0] === 'Abs' && containsTargetNode(node, target)) {
    return true;
  }
  return node.some((part) => containsTargetedAbsNode(part, target));
}

export function containsTargetedAbsLatex(latex: string, target: string) {
  try {
    return containsTargetedAbsNode(ce.parse(latex).json, target);
  } catch {
    return false;
  }
}

export function complexIntentRequiredOutcome(): DisplayOutcome {
  return {
    kind: 'error',
    title: 'Solve',
    error: 'This Equation input uses the imaginary unit. Enable Complex before asking for a complex-domain exact answer.',
    warnings: [],
    detailSections: [
      {
        title: 'Complex Input',
        lines: [
          'The symbol i is reserved as the imaginary unit in Equation input.',
          'Complex Off keeps Equation solving real-first.',
        ],
      },
      {
        title: 'What To Try',
        lines: [
          'Turn Complex On for bounded exact complex Equation answers.',
          'Use a different symbol if you intended i to be a real variable.',
        ],
      },
    ],
    answerMode: 'exact',
  };
}

export function unsupportedComplexPreimageOutcome(): DisplayOutcome {
  return {
    kind: 'error',
    title: 'Solve',
    error: 'This complex equation is outside the supported guarded complex preimage families.',
    warnings: [],
    detailSections: [
      {
        title: 'Complex Preimage Route',
        lines: [
          'Complex Exact currently supports bounded algebraic, rational, log/exp, and two-trig-layer preimages.',
          'Absolute-value complex equations are deferred because they usually describe loci or condition sets rather than finite branches.',
        ],
      },
      {
        title: 'What To Try',
        lines: [
          'Use Complex On with one selected target and exact numeric constants.',
          'Use a real-domain equation or turn Complex Off when you want the older real absolute-value route.',
        ],
      },
    ],
    answerMode: 'exact',
  };
}

export function unsupportedComplexLocusOutcome(
  report: ComplexLocusPolicyReport,
  options: {
    equationLatex?: string;
    target?: string;
    complexRegion?: ComplexSolveRegion;
  } = {},
): DisplayOutcome {
  return {
    kind: 'error',
    title: 'Solve',
    error: 'This complex equation is outside the supported guarded complex preimage families.',
    warnings: [],
    detailSections: [
      {
        title: 'Complex Locus Policy',
        lines: report.detailLines,
      },
      ...buildComplexLocusEvidenceSections({
        report,
        equationLatex: options.equationLatex,
        target: options.target,
        complexRegion: options.complexRegion,
      }),
      {
        title: 'What To Try',
        lines: [
          'Use a real-domain equation or turn Complex Off when you want the older real absolute-value route.',
          'Use holomorphic equations for bounded Complex Region solving.',
          'Wait for the future two-real-variable/locus engine for full complex magnitude, conjugate, real-part, or imaginary-part conditions.',
        ],
      },
    ],
    answerMode: 'exact',
    answerDomain: 'complex',
  };
}

function exactModeShouldRejectNumericOnlyOutcome(outcome: DisplayOutcome) {
  return outcome.kind === 'success'
    && (
      outcome.resultOrigin === 'numeric-fallback'
      || (Boolean(outcome.approxText) && !outcome.exactLatex)
    );
}

function answerPayloadContainsImaginaryUnit(outcome: DisplayOutcome) {
  if (outcome.kind !== 'success') {
    return false;
  }
  const payload = [
    outcome.exactLatex,
    outcome.approxText,
    ...(outcome.branchReadback?.branchesLatex ?? []),
  ].filter((entry): entry is string => Boolean(entry)).join(' ');
  return /\\imaginaryI|(?:^|[^A-Za-z\\])i(?:$|[^A-Za-z])/u.test(payload);
}

function realDomainComplexRootsOutcome(target: string): DisplayOutcome {
  return {
    kind: 'error',
    title: 'Solve',
    error: 'This real equation has no real roots. Turn Complex On to show the non-real roots.',
    warnings: [],
    detailSections: [
      {
        title: 'Real Domain',
        lines: [
          `Selected target: ${target}.`,
          'Real mode reports real roots only.',
          'Turn Complex On to show non-real roots for this equation.',
        ],
      },
    ],
    answerMode: 'exact',
  };
}

function conditionTextFromLegacySupplement(fact: string) {
  return fact.replace(/^\\text\{Conditions:\s*\}\s*/u, '').trim();
}

function isTargetDependentConditionSupplement(fact: string, target: string) {
  return fact.includes('\\text{Conditions:')
    && new RegExp(`(^|[^A-Za-z])${target.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}([^A-Za-z]|$)`, 'u').test(fact);
}

function withScopedTargetDependentConditions(outcome: DisplayOutcome, target: string): DisplayOutcome {
  if (outcome.kind !== 'success' || !outcome.exactSupplementLatex?.length) {
    return outcome;
  }

  const scoped = outcome.exactSupplementLatex.filter((fact) =>
    isTargetDependentConditionSupplement(fact, target));
  if (scoped.length === 0) {
    return outcome;
  }

  const remaining = outcome.exactSupplementLatex.filter((fact) =>
    !isTargetDependentConditionSupplement(fact, target));
  return {
    ...outcome,
    exactSupplementLatex: remaining.length > 0 ? remaining : undefined,
    detailSections: [
      ...(outcome.detailSections ?? []),
      {
        title: 'Branch Guards',
        lines: scoped.map((fact) =>
          `${conditionTextFromLegacySupplement(fact)} was checked against the displayed candidate root(s).`),
      },
    ],
  };
}

export function finalizeSharedSymbolicOutcome(input: {
  sharedOutcome: DisplayOutcome;
  solveTarget: string;
  answerMode: EquationAnswerMode;
  equationLatex: string;
  sharedResolvedLatex: string;
  plannerBadges?: PlannerBadge[];
  allowNumericOnly?: boolean;
  realDomainOnly?: boolean;
}): DisplayOutcome {
  const outcome = withScopedTargetDependentConditions(
    ensureSafeEquationSuccessOutcome(rewriteEquationOutcomeTarget(
      input.sharedOutcome,
      input.solveTarget,
    ), input.solveTarget),
    input.solveTarget,
  );
  const finalOutcome = input.realDomainOnly && answerPayloadContainsImaginaryUnit(outcome)
    ? realDomainComplexRootsOutcome(input.solveTarget)
    : input.answerMode === 'exact' && !input.allowNumericOnly && exactModeShouldRejectNumericOnlyOutcome(outcome)
      ? exactModeNeedsExactOutcome(input.solveTarget)
      : outcome;

  return attachEquationRuntimeEnvelope(
    finalOutcome,
    input.equationLatex,
    input.sharedResolvedLatex,
    input.plannerBadges,
    classifyEquationRuntimeAdvisories({ outcome: finalOutcome }),
  );
}

export function containsNonEqualityRelation(latex: string) {
  const normalizedLatex = normalizeRelationOperatorLatex(latex);
  return /\\(?:le|ge|ne)(?![A-Za-z])|[<>]/.test(normalizedLatex);
}
