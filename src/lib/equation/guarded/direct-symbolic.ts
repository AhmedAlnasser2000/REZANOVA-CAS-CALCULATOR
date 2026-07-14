import { ComputeEngine } from '@cortex-js/compute-engine';
import { runExpressionAction } from '../../engine/math-engine';
import {
  buildCanonicalResultDocumentFromProducer,
  canonicalMathValue,
} from '../../result-contract';
import { equationMathValuesFromOwnedPayload } from '../solve-result/math-values';
import {
  createFiniteRootSet,
  renderFiniteRootSet,
} from '../solution/finite-root-set';
import type {
  ResultProducerDraft,
  GuardedSolveRequest,
} from '../../../types/calculator';
import {
  UNSUPPORTED_FAMILY_ERROR,
  errorOutcome,
  successOutcome,
} from './outcome';
import {
  attachAlgebraMetadata,
  isMathJsonArray,
  prepareAlgebraSolveRequest,
  validateDirectSymbolicOutcome,
} from './request-prep';
import {
  EQUATION_SOLVE_CANCELLED_MESSAGE,
  type GuardedEquationDirectSymbolicHostEvidence,
  type GuardedEquationStageContext,
  type GuardedEquationStageReplayTrace,
} from './types';
import { checkpointAndMaybeCancel } from './cancellation';
import {
  buildEquationStageResultCarrier,
  readEquationStageResultCarrier,
  type EquationStageResultCarrierV1,
} from '../solve-result/stage-carrier';

const ce = new ComputeEngine();
const DIRECT_TRIG_OPERATORS = new Set(['Sin', 'Cos', 'Tan', 'Sec', 'Csc', 'Cot']);

function isNumericConstantNode(node: unknown): boolean {
  if (typeof node === 'number') {
    return Number.isFinite(node);
  }

  if (typeof node === 'object' && node !== null && 'num' in node) {
    const value = Number((node as { num: string }).num);
    return Number.isFinite(value);
  }

  if (typeof node === 'string') {
    return node === 'Pi' || node === 'ExponentialE';
  }

  if (!isMathJsonArray(node) || node.length === 0) {
    return false;
  }

  return node.slice(1).every((child) => isNumericConstantNode(child));
}

function containsSolveVariable(node: unknown, variable = 'x'): boolean {
  if (typeof node === 'string') {
    return node === variable;
  }

  if (!isMathJsonArray(node) || node.length === 0) {
    return false;
  }

  return node.slice(1).some((child) => containsSolveVariable(child, variable));
}

function isDirectTrigExpression(node: unknown) {
  return isMathJsonArray(node)
    && typeof node[0] === 'string'
    && DIRECT_TRIG_OPERATORS.has(node[0])
    && node.length >= 2;
}

function shouldSkipDirectSymbolicSolve(equationLatex: string) {
  try {
    const parsed = ce.parse(equationLatex).json;
    if (!isMathJsonArray(parsed) || parsed[0] !== 'Equal' || parsed.length !== 3) {
      return false;
    }

    const [, left, right] = parsed;
    return (
      (isDirectTrigExpression(left) && containsSolveVariable(right) && !isNumericConstantNode(right))
      || (isDirectTrigExpression(right) && containsSolveVariable(left) && !isNumericConstantNode(left))
    );
  } catch {
    return false;
  }
}

function hasNonFiniteRawSolutions(symbolic: ReturnType<typeof runExpressionAction>) {
  if (symbolic.rawSolutionLatex?.some((solution) => solution.includes('\\infty') || solution.includes('\\tilde\\infty'))) {
    return true;
  }

  return Boolean(symbolic.rawSolutions?.some((solution) => {
    if (!solution || typeof solution !== 'object') {
      return false;
    }
    const value = (solution as { _value?: unknown })._value;
    return value === Infinity || value === -Infinity;
  }));
}

function canonicalDirectSymbolicOutcome(
  symbolic: ReturnType<typeof runExpressionAction>,
  outcome: ResultProducerDraft,
  preparedRequest: GuardedSolveRequest,
) {
  if (
    outcome.kind !== 'success'
    || !symbolic.exactLatex
    || !symbolic.rawSolutions
    || !symbolic.rawSolutionLatex
    || symbolic.rawSolutions.length !== symbolic.rawSolutionLatex.length
  ) {
    return outcome;
  }

  const rendered = renderFiniteRootSet(
    createFiniteRootSet({
      targetLatex: 'x',
      branches: symbolic.rawSolutions.map((node, index) => ({
        node: node && typeof node === 'object' && 'json' in node
          ? (node as { json: unknown }).json
          : node,
        latex: symbolic.rawSolutionLatex![index],
        source: 'equation-direct-symbolic',
      })),
      source: 'equation-direct-symbolic',
    }),
    { preserveOrder: true },
  );

  if (rendered.exactLatex !== symbolic.exactLatex || !rendered.primaryMath) {
    return outcome;
  }
  const routeId = /\\(?:sqrt|frac)|\//u.test(preparedRequest.resolvedLatex)
    ? 'equation.rational-radical' as const
    : /\\(?:sin|cos|tan|ln|log)|(?:^|[^A-Za-z])e\^/u.test(preparedRequest.resolvedLatex)
      ? 'equation.trig-exp-log' as const
      : symbolic.rawSolutions.length > 1
        ? 'equation.polynomial' as const
        : 'equation.linear' as const;
  const canonicalResult = buildCanonicalResultDocumentFromProducer({
    outcomeKind: 'success',
    title: 'Solve',
    primaryMath: canonicalMathValue(
      rendered.primaryMath.canonicalLatex,
      rendered.primaryMath.mathJson,
    ),
    approxText: symbolic.approxText,
    warnings: symbolic.warnings,
    metadata: { resultOrigin: 'symbolic' },
  }, {
    mathValues: equationMathValuesFromOwnedPayload({
      primaryMath: rendered.primaryMath,
      routeId,
      source: 'equation-direct-symbolic-raw-solutions',
    }),
  });
  return {
    ...outcome,
    primaryMath: rendered.primaryMath,
    canonicalResult,
  };
}

function runDirectSymbolicFallbackPrepared(
  preparedRequest: GuardedSolveRequest,
): ResultProducerDraft {
  const symbolic = runExpressionAction(
    {
      mode: 'equation',
      document: { latex: preparedRequest.resolvedLatex },
      angleUnit: preparedRequest.angleUnit,
      outputStyle: preparedRequest.outputStyle,
      variables: { Ans: preparedRequest.ansLatex },
    },
    'solve',
  );

  if (!symbolic.error && symbolic.exactLatex && !hasNonFiniteRawSolutions(symbolic)) {
    const validated = validateDirectSymbolicOutcome(preparedRequest, symbolic);
    if (validated) {
      return validated;
    }

    return canonicalDirectSymbolicOutcome(symbolic, successOutcome(
      'Solve',
      symbolic.exactLatex,
      symbolic.approxText,
      symbolic.warnings,
    ), preparedRequest);
  }

  return errorOutcome(
    'Solve',
    UNSUPPORTED_FAMILY_ERROR,
    symbolic.warnings,
  );
}

function runGuardedDirectSymbolicFallback(
  request: GuardedSolveRequest,
): ResultProducerDraft {
  const preparedRequest = prepareAlgebraSolveRequest(request);
  if (shouldSkipDirectSymbolicSolve(preparedRequest.resolvedLatex)) {
    return errorOutcome(
      'Solve',
      UNSUPPORTED_FAMILY_ERROR,
    );
  }

  return attachAlgebraMetadata(
    runDirectSymbolicFallbackPrepared(preparedRequest),
    request.resolvedLatex,
    preparedRequest,
  );
}

function runDirectSymbolicStage(
  context: GuardedEquationStageContext,
): ResultProducerDraft {
  const { preparedRequest } = context;

  if (shouldSkipDirectSymbolicSolve(preparedRequest.resolvedLatex)) {
    return errorOutcome(
      'Solve',
      UNSUPPORTED_FAMILY_ERROR,
    );
  }

  const cancellation = checkpointAndMaybeCancel(context, {
    phase: 'before-direct-symbolic',
    stageId: 'direct-symbolic',
  });
  if (cancellation) {
    return readEquationStageResultCarrier(cancellation);
  }

  return runDirectSymbolicFallbackPrepared(preparedRequest);
}

function recordDirectSymbolicHostEvidence(
  trace: GuardedEquationStageReplayTrace | undefined,
  evidence: GuardedEquationDirectSymbolicHostEvidence,
) {
  if (!trace) {
    return;
  }

  trace.directSymbolicHostExecutions = [
    ...(trace.directSymbolicHostExecutions ?? []),
    evidence,
  ];
}

async function runDirectSymbolicStageAsync(
  context: GuardedEquationStageContext,
): Promise<EquationStageResultCarrierV1> {
  const { preparedRequest } = context;

  if (shouldSkipDirectSymbolicSolve(preparedRequest.resolvedLatex)) {
    return buildEquationStageResultCarrier(errorOutcome(
      'Solve',
      UNSUPPORTED_FAMILY_ERROR,
    ));
  }

  const cancellation = checkpointAndMaybeCancel(context, {
    phase: 'before-direct-symbolic',
    stageId: 'direct-symbolic',
  });
  if (cancellation) {
    return cancellation;
  }

  if (!context.directSymbolicRunner) {
    return buildEquationStageResultCarrier(runDirectSymbolicFallbackPrepared(preparedRequest));
  }

  const result = await context.directSymbolicRunner({
    request: preparedRequest,
    depth: context.depth,
    stageId: 'direct-symbolic',
  });
  recordDirectSymbolicHostEvidence(context.trace, result.hostEvidence);

  if (result.hostEvidence.terminalStatus === 'cancelled' && context.trace && !context.trace.cancellation) {
    context.trace.cancellation = {
      depth: context.depth,
      stageId: 'direct-symbolic',
      phase: 'before-direct-symbolic',
      reason: EQUATION_SOLVE_CANCELLED_MESSAGE,
    };
  }

  return result.outcome;
}

export {
  runDirectSymbolicStage,
  runDirectSymbolicStageAsync,
  runGuardedDirectSymbolicFallback,
};
