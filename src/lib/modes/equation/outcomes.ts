import { ComputeEngine } from '@cortex-js/compute-engine';
import { classifyEquationRuntimeAdvisories } from '../../kernel/runtime-policy';
import { attachRuntimeEnvelope } from '../../kernel/runtime-envelope';
import { hasUnsafeSymbolicOutput } from '../../display/symbolic-output-hygiene';
import { normalizeRelationOperatorLatex } from '../../input/input-canonicalization';
import { formatNamedEquationOutcomeTarget, rewriteEquationOutcomeTarget } from '../../equation/equation-target';
import type { DisplayOutcome, EquationAnswerMode, PlannerBadge } from '../../../types/calculator';

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
  return outcome.kind === 'prompt' ? outcome : { ...outcome, answerMode };
}

export function finalizeSelectedTargetSymbolicOutcome(outcome: DisplayOutcome, target: string): DisplayOutcome {
  return ensureSafeEquationSuccessOutcome(formatNamedEquationOutcomeTarget(outcome, target), target);
}

export function approximateModeNeedsIntervalOutcome(): DisplayOutcome {
  return {
    kind: 'error',
    title: 'Solve',
    error: 'Approximate answer mode needs a numeric interval before it can search for real roots.',
    warnings: [],
    detailSections: [
      {
        title: 'Answer Mode',
        lines: ['Answer mode: Approximate.'],
      },
      {
        title: 'What To Try',
        lines: [
          'Open Numeric Interval Solve, choose a valid start and end, then run again.',
          'Use Exact or Isolate when you want symbolic rearrangement instead.',
        ],
      },
    ],
    answerMode: 'approximate',
  };
}

export function approximateModeNeedsNumericParametersOutcome(parameters: string[]): DisplayOutcome {
  const parameterText = parameters.join(', ');
  return {
    kind: 'error',
    title: 'Solve',
    error: `Approximate answer mode needs numeric values for every non-target parameter before it can search for real roots. Remaining symbolic parameters: ${parameterText}.`,
    warnings: [],
    detailSections: [
      {
        title: 'Answer Mode',
        lines: ['Answer mode: Approximate.'],
      },
      {
        title: 'Why It Stopped',
        lines: [
          'Numeric interval solve needs a one-variable real-valued equation after stored-value substitution.',
        ],
      },
      {
        title: 'What To Try',
        lines: [
          `Store numeric values for ${parameterText}, then run Approximate again.`,
          'Use Exact or Isolate when you want symbolic parameters preserved.',
        ],
      },
    ],
    answerMode: 'approximate',
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
          'The available solver path produced only a numeric or approximate result, which belongs in Approximate mode.',
        ],
      },
      {
        title: 'What To Try',
        lines: [
          'Use Approximate with a numeric interval for numeric roots.',
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

function exactModeShouldRejectNumericOnlyOutcome(outcome: DisplayOutcome) {
  return outcome.kind === 'success'
    && (
      outcome.resultOrigin === 'numeric-fallback'
      || (Boolean(outcome.approxText) && !outcome.exactLatex)
    );
}

export function finalizeSharedSymbolicOutcome(input: {
  sharedOutcome: DisplayOutcome;
  solveTarget: string;
  answerMode: EquationAnswerMode;
  equationLatex: string;
  sharedResolvedLatex: string;
  plannerBadges?: PlannerBadge[];
}): DisplayOutcome {
  const outcome = ensureSafeEquationSuccessOutcome(rewriteEquationOutcomeTarget(
    input.sharedOutcome,
    input.solveTarget,
  ), input.solveTarget);
  const finalOutcome = input.answerMode === 'exact' && exactModeShouldRejectNumericOnlyOutcome(outcome)
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
