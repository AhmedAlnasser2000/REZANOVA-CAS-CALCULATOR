import { ComputeEngine } from '@cortex-js/compute-engine';
import { runExpressionAction } from '../../engine/math-engine';
import type {
  DisplayOutcome,
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

function runDirectSymbolicFallbackPrepared(
  preparedRequest: GuardedSolveRequest,
): DisplayOutcome {
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
    return validated ?? successOutcome(
      'Solve',
      symbolic.exactLatex,
      symbolic.approxText,
      symbolic.warnings,
    );
  }

  return errorOutcome(
    'Solve',
    UNSUPPORTED_FAMILY_ERROR,
    symbolic.warnings,
  );
}

function runGuardedDirectSymbolicFallback(
  request: GuardedSolveRequest,
): DisplayOutcome {
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
): DisplayOutcome {
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
    return cancellation;
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
): Promise<DisplayOutcome> {
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
    return cancellation;
  }

  if (!context.directSymbolicRunner) {
    return runDirectSymbolicFallbackPrepared(preparedRequest);
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
