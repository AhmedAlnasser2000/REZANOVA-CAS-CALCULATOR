import { ComputeEngine } from '@cortex-js/compute-engine';
import { runExpressionAction } from '../../engine/math-engine';
import { finiteBranchReadbackMetadata } from '../../display/branch-readback';
import { formatApproxNumber, solutionsToLatex } from '../../display/format';
import { readExactScalarNode } from '../../algebra/polynomial-core';
import { normalizeExactRadicalNode } from '../../symbolic-engine/radical';
import { normalizeExactRationalNode } from '../../symbolic-engine/rational';
import { factorMixedCarrierAst } from '../../symbolic-engine/mixed-factor';
import { dependsOnVariable, flattenMultiply, isNodeArray as isPatternNodeArray } from '../../symbolic-engine/patterns';
import { mergeExactSupplementLatex } from '../../algebra/exact-supplements';
import {
  assumptionFactsFromCandidateRejection,
} from '../../algebra/assumption-adapters';
import {
  assumptionFactsFromDomainConstraints,
  mergeAssumptionFacts,
} from '../../algebra/assumptions-core';
import { mergeAssumptionDetailSections } from '../../algebra/assumption-readback';
import { detectRealRangeImpossibility } from '../range-impossibility';
import { validateCandidateRoots } from '../candidate-validation';
import {
  buildEquationCandidateRejectionMessage,
  classifyCandidateRejections,
} from '../candidate-rejection';
import { recognizeBoundedPolynomialEquationAst, solveBoundedPolynomialEquationAst } from '../../algebra/polynomial-factor-solve';
import { solveBoundedPolynomialCarrierEquationAst } from '../polynomial-carrier-follow-on';
import type {
  DisplayOutcome,
  EquationExecutionBudget,
  GuardedSolveRequest,
  SolveDomainConstraint,
} from '../../../types/calculator';
import { getEquationExecutionBudget } from '../../kernel/runtime-profile';
import {
  UNSUPPORTED_FAMILY_ERROR,
  errorOutcome,
  successOutcome,
} from './outcome';
import { equationStateKey } from './state-key';
import { algebraTransformSolve } from './algebra-stage';
import { directTrigSolve } from './direct-trig-stage';
import { rewriteTrigSolve } from './rewrite-trig-stage';
import { substitutionSolve, substitutionSolveAsync } from './substitution-stage';
import { numericIntervalSolve } from './numeric-stage';
import { mergeDisplayOutcomes } from './merge';
import { compositionSolve } from '../composition-stage';

const ce = new ComputeEngine();
const NUMERIC_MATCH_TOLERANCE = 1e-6;
const DIRECT_TRIG_OPERATORS = new Set(['Sin', 'Cos', 'Tan', 'Sec', 'Csc', 'Cot']);

function isMathJsonArray(node: unknown): node is unknown[] {
  return Array.isArray(node);
}

function isZeroNode(node: unknown) {
  return node === 0
    || (
      isMathJsonArray(node)
      && node[0] === 'Rational'
      && node.length === 3
      && node[1] === 0
    );
}

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

function mergeDomainConstraints(
  left: SolveDomainConstraint[] = [],
  right: SolveDomainConstraint[] = [],
) {
  const merged = new Map<string, SolveDomainConstraint>();
  for (const constraint of [...left, ...right]) {
    const key = JSON.stringify(constraint);
    if (!merged.has(key)) {
      merged.set(key, constraint);
    }
  }
  return [...merged.values()];
}

function formatAcceptedApproximations(values: number[]) {
  if (values.length === 0) {
    return undefined;
  }

  const parts = values.map((value) => formatApproxNumber(value));
  return parts.length === 1 ? `x ~= ${parts[0]}` : `x ~= ${parts.join(', ')}`;
}

function branchReadbackForAcceptedCandidates(
  acceptedLatex: string[],
  acceptedValues: number[],
  exactLatex: string | undefined,
  source: string,
) {
  if (exactLatex && acceptedLatex.length >= 2) {
    return finiteBranchReadbackMetadata({
      targetLatex: 'x',
      relationLatex: '\\in',
      branchesLatex: acceptedLatex,
      source,
    });
  }

  return finiteBranchReadbackMetadata({
    targetLatex: 'x',
    relationLatex: '\\approx',
    branchesLatex: acceptedValues.map((value) => formatApproxNumber(value)),
    source,
  });
}

function shouldAttemptPolynomialCarrierFollowOn(request: GuardedSolveRequest) {
  return (request.radicalTransformDepth ?? 0) > 0
    || (request.compositionInversionDepth ?? 0) > 0
    || (request.repeatedClearingDepth ?? 0) > 0
    || (request.polynomialCarrierHints?.length ?? 0) > 0;
}

function unwrapFactorNode(node: unknown): unknown {
  if (
    isPatternNodeArray(node)
    && node[0] === 'Power'
    && node.length === 3
  ) {
    const exponent = readExactScalarNode(node[2]);
    if (exponent && exponent.denominator === 1 && exponent.numerator > 0) {
      return node[1];
    }
  }

  return node;
}

function collectMixedFactorTargets(node: unknown) {
  const deduped = new Map<string, unknown>();

  for (const factor of flattenMultiply(node).map(unwrapFactorNode)) {
    if (!dependsOnVariable(factor, 'x')) {
      continue;
    }
    const key = JSON.stringify(factor);
    if (!deduped.has(key)) {
      deduped.set(key, factor);
    }
  }

  return [...deduped.values()];
}

function runMixedFactorEquationSolve(
  request: GuardedSolveRequest,
  depth: number,
  trail: Set<string>,
  runner?: GuardedSolveRunner,
) {
  try {
    const parsed = ce.parse(request.resolvedLatex).json;
    if (!isMathJsonArray(parsed) || parsed[0] !== 'Equal' || parsed.length !== 3) {
      return null;
    }

    const zeroForm = ce.box(['Subtract', parsed[1], parsed[2]] as Parameters<typeof ce.box>[0]).simplify().json;
    const factorized = factorMixedCarrierAst(zeroForm);
    if (!factorized) {
      return null;
    }

    const factors = collectMixedFactorTargets(factorized.node);
    if (factors.length === 0) {
      return null;
    }

    const outcomes: DisplayOutcome[] = [];
    const baseValidationLatex = request.validationLatex ?? request.resolvedLatex;

    for (const factor of factors) {
      const factorLatex = ce.box(factor as Parameters<typeof ce.box>[0]).latex;
      const factorEquationLatex = `${factorLatex}=0`;
      const nextRequest = {
        ...request,
        resolvedLatex: factorEquationLatex,
        validationLatex: baseValidationLatex,
      };
      const outcome = runner
        ? runner(nextRequest, depth + 1, new Set(trail))
        : runGuardedEquationSolve(
            nextRequest,
            depth + 1,
            new Set(trail),
          );

      if (outcome.kind === 'success') {
        outcomes.push(outcome);
      }
    }

    if (outcomes.length === 0) {
      return null;
    }

    return mergeDisplayOutcomes(
      outcomes,
      [],
      'Factored the mixed carrier expression into bounded exact factors.',
    );
  } catch {
    return null;
  }
}

function matchAcceptedSolvedRoots(
  roots: Array<{ latex: string; numeric: number }>,
  acceptedValues: number[],
) {
  const used = new Set<number>();
  const matched: string[] = [];

  for (const acceptedValue of acceptedValues) {
    const matchIndex = roots.findIndex((root, index) =>
      !used.has(index)
      && Math.abs(root.numeric - acceptedValue) <= NUMERIC_MATCH_TOLERANCE);
    if (matchIndex < 0) {
      continue;
    }
    used.add(matchIndex);
    matched.push(roots[matchIndex].latex);
  }

  return matched;
}

function isApproximateOnlySolutionLatex(latex: string) {
  const normalized = latex.replaceAll('\\,', '').replaceAll(' ', '').trim();
  return /^[+-]?(?:\d+\.\d*|\d*\.\d+|\d+e[+-]?\d+)$/i.test(normalized);
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

function attachAlgebraMetadata(
  outcome: DisplayOutcome,
  originalResolvedLatex: string,
  request: GuardedSolveRequest,
): DisplayOutcome {
  if (outcome.kind === 'prompt') {
    return outcome;
  }

  const exactSupplementLatex = mergeExactSupplementLatex(
    { latex: outcome.exactSupplementLatex, source: 'legacy' },
    { latex: request.exactSupplementLatex, source: 'legacy' },
  );
  const assumptionFacts = mergeAssumptionFacts(
    assumptionFactsFromDomainConstraints(request.domainConstraints ?? [], {
      source: 'legacy',
      scope: 'result',
      trust: 'validated',
    }),
    outcome.rejectedCandidateCount
      ? assumptionFactsFromCandidateRejection({
        kind: classifyCandidateRejections([], request.domainConstraints),
        constraints: request.domainConstraints,
        reasons: [`${outcome.rejectedCandidateCount} candidate${outcome.rejectedCandidateCount === 1 ? '' : 's'} rejected during validation.`],
      })
      : [],
  );

  return {
    ...outcome,
    exactSupplementLatex: exactSupplementLatex.length > 0 ? exactSupplementLatex : undefined,
    detailSections: mergeAssumptionDetailSections(outcome.detailSections, assumptionFacts),
    resolvedInputLatex:
      outcome.resolvedInputLatex
      ?? (request.resolvedLatex !== originalResolvedLatex ? request.resolvedLatex : undefined),
  };
}

function prepareAlgebraSolveRequest(request: GuardedSolveRequest): GuardedSolveRequest {
  const parsed = ce.parse(request.resolvedLatex);
  const json = parsed.json;
  if (!isMathJsonArray(json) || json[0] !== 'Equal' || json.length !== 3) {
    return request;
  }

  const leftRadical = normalizeExactRadicalNode(json[1], 'equation');
  const rightRadical = normalizeExactRadicalNode(json[2], 'equation');

  const leftRadicalNode = leftRadical?.normalizedNode ?? json[1];
  const rightRadicalNode = rightRadical?.normalizedNode ?? json[2];

  const leftNormalization = normalizeExactRationalNode(leftRadicalNode, 'simplify');
  const rightNormalization = normalizeExactRationalNode(rightRadicalNode, 'simplify');

  const leftNode = leftNormalization?.normalizedNode ?? leftRadicalNode;
  const rightNode = rightNormalization?.normalizedNode ?? rightRadicalNode;
  const leftLatex = leftNormalization?.normalizedLatex
    ?? leftRadical?.normalizedLatex
    ?? ce.box(json[1] as Parameters<typeof ce.box>[0]).latex;
  const rightLatex = rightNormalization?.normalizedLatex
    ?? rightRadical?.normalizedLatex
    ?? ce.box(json[2] as Parameters<typeof ce.box>[0]).latex;

  const domainConstraints = mergeDomainConstraints(
    request.domainConstraints,
    mergeDomainConstraints(
      mergeDomainConstraints(
        leftRadical?.conditionConstraints,
        rightRadical?.conditionConstraints,
      ),
      mergeDomainConstraints(
        leftNormalization?.exclusionConstraints,
        rightNormalization?.exclusionConstraints,
      ),
    ),
  );
  const exactSupplementLatex = mergeExactSupplementLatex(
    { latex: request.exactSupplementLatex, source: 'legacy' },
    { latex: leftRadical?.exactSupplementLatex, source: 'radical-domain' },
    { latex: rightRadical?.exactSupplementLatex, source: 'radical-domain' },
    { latex: leftNormalization?.exactSupplementLatex, source: 'denominator' },
    { latex: rightNormalization?.exactSupplementLatex, source: 'denominator' },
  );

  let resolvedLatex = ce.box(['Equal', leftNode, rightNode] as Parameters<typeof ce.box>[0]).latex;

  if (leftNormalization?.denominatorNode && isZeroNode(rightNode)) {
    resolvedLatex = `${leftNormalization.numeratorLatex}=0`;
  } else if (rightNormalization?.denominatorNode && isZeroNode(leftNode)) {
    resolvedLatex = `${rightNormalization.numeratorLatex}=0`;
  } else if (leftLatex !== ce.box(json[1] as Parameters<typeof ce.box>[0]).latex || rightLatex !== ce.box(json[2] as Parameters<typeof ce.box>[0]).latex) {
    resolvedLatex = `${leftLatex}=${rightLatex}`;
  }

  return {
    ...request,
    resolvedLatex,
    validationLatex: request.validationLatex ?? request.resolvedLatex,
    domainConstraints,
    exactSupplementLatex,
  };
}

function validateDirectSymbolicOutcome(
  request: GuardedSolveRequest,
  symbolic: ReturnType<typeof runExpressionAction>,
): DisplayOutcome | null {
  const needsValidation =
    (request.domainConstraints?.length ?? 0) > 0
    || Boolean(request.validationLatex && request.validationLatex !== request.resolvedLatex);
  if (!needsValidation) {
    return null;
  }

  const numericSolutions = symbolic.numericSolutions;
  const rawSolutionLatex = symbolic.rawSolutionLatex;
  if (
    !symbolic.exactLatex
    || !numericSolutions
    || !rawSolutionLatex
    || numericSolutions.length === 0
  ) {
    return null;
  }

  const numericPairs = rawSolutionLatex.flatMap((latex, index) => {
    const value = numericSolutions[index];
    return value === null ? [] : [{ latex, value }];
  });
  const finiteSolutions = numericPairs.map((entry) => entry.value);
  if (finiteSolutions.length === 0) {
    return errorOutcome(
      'Solve',
      'No real solutions remain after resolving the bounded transformed branches.',
      symbolic.warnings,
      [],
      ['Candidate Checked'],
    );
  }

  const validation = validateCandidateRoots(
    request.validationLatex ?? request.resolvedLatex,
    finiteSolutions,
    request.domainConstraints,
    'symbolic-direct',
    request.angleUnit,
  );

  if (validation.accepted.length === 0) {
      return errorOutcome(
        'Solve',
        buildEquationCandidateRejectionMessage(
          classifyCandidateRejections(validation.rejected, request.domainConstraints),
        ),
        symbolic.warnings,
        [],
        ['Candidate Checked'],
      undefined,
      validation.rejected.length,
    );
  }

  const acceptedLatex: string[] = [];
  const acceptedValues: number[] = [];
  for (const acceptedValue of validation.accepted) {
    const matchIndex = numericPairs.findIndex((entry) =>
      Math.abs(entry.value - acceptedValue) <= NUMERIC_MATCH_TOLERANCE
      && !acceptedValues.some((usedValue) => Math.abs(usedValue - entry.value) <= NUMERIC_MATCH_TOLERANCE)
      && !acceptedLatex.includes(entry.latex));
    if (matchIndex >= 0) {
      acceptedValues.push(numericPairs[matchIndex].value);
      acceptedLatex.push(numericPairs[matchIndex].latex);
    }
  }

  const exactLatex = acceptedLatex.length > 0 && acceptedLatex.every((value) => !isApproximateOnlySolutionLatex(value))
    ? solutionsToLatex('x', acceptedLatex)
    : undefined;

  return {
    kind: 'success',
    title: 'Solve',
    exactLatex,
    branchReadback: branchReadbackForAcceptedCandidates(
      acceptedLatex,
      acceptedValues,
      exactLatex,
      'equation-symbolic-candidate-validation',
    ),
    approxText: formatAcceptedApproximations(acceptedValues),
    warnings: symbolic.warnings,
    resultOrigin: 'symbolic',
    plannerBadges: [],
    solveBadges: ['Candidate Checked'],
    candidateValues: acceptedValues,
    rejectedCandidateCount: validation.rejected.length > 0 ? validation.rejected.length : undefined,
  };
}

function runBoundedPolynomialSolve(
  request: GuardedSolveRequest,
  depth = 0,
  trail = new Set<string>(),
  runner?: GuardedSolveRunner,
): DisplayOutcome | null {
  try {
    const parsed = ce.parse(request.resolvedLatex).json;
    let recognizedDirectPolynomial = false;

    const recognized = recognizeBoundedPolynomialEquationAst(parsed, 'x');
    if (recognized) {
      recognizedDirectPolynomial = true;
      const solved = solveBoundedPolynomialEquationAst(parsed, 'x');
      if (solved) {
        return {
          kind: 'success',
          title: 'Solve',
          exactLatex: solved.exactLatex,
          approxText: solved.approxText,
          warnings: [],
          resultOrigin: 'symbolic',
          plannerBadges: [],
          solveBadges: [],
          candidateValues: solved.approxSolutions,
        };
      }
    }

    const carrierAttempt = shouldAttemptPolynomialCarrierFollowOn(request)
      ? solveBoundedPolynomialCarrierEquationAst(parsed, request.polynomialCarrierHints)
      : { kind: 'none' as const };

    if (carrierAttempt.kind === 'solved') {
      const candidateValues = carrierAttempt.roots.map((root) => root.numeric);
      const needsValidation =
        (request.domainConstraints?.length ?? 0) > 0
        || Boolean(request.validationLatex && request.validationLatex !== request.resolvedLatex);

      if (!needsValidation) {
        const exactSolutions = carrierAttempt.roots.map((root) => root.latex);
        const exactLatex = exactSolutions.length > 0 && exactSolutions.every((value) => !isApproximateOnlySolutionLatex(value))
          ? solutionsToLatex('x', exactSolutions)
          : undefined;
        return {
          kind: 'success',
          title: 'Solve',
          exactLatex,
          exactSupplementLatex:
            carrierAttempt.exactSupplementLatex && carrierAttempt.exactSupplementLatex.length > 0
              ? carrierAttempt.exactSupplementLatex
              : undefined,
          approxText: formatAcceptedApproximations(candidateValues),
          warnings: [],
          resultOrigin: 'symbolic',
          plannerBadges: [],
          solveBadges: [],
          candidateValues,
        };
      }

      const validation = validateCandidateRoots(
        request.validationLatex ?? request.resolvedLatex,
        candidateValues,
        request.domainConstraints,
        'symbolic-direct',
        request.angleUnit,
      );

      if (validation.accepted.length === 0) {
        return {
          kind: 'error',
          title: 'Solve',
          error: buildEquationCandidateRejectionMessage(
            classifyCandidateRejections(validation.rejected, request.domainConstraints),
          ),
          exactSupplementLatex:
            carrierAttempt.exactSupplementLatex && carrierAttempt.exactSupplementLatex.length > 0
              ? carrierAttempt.exactSupplementLatex
              : undefined,
          warnings: [],
          plannerBadges: [],
          solveBadges: ['Candidate Checked'],
          rejectedCandidateCount: validation.rejected.length,
        };
      }

      const acceptedLatex = matchAcceptedSolvedRoots(carrierAttempt.roots, validation.accepted);
      const exactLatex = acceptedLatex.length > 0 && acceptedLatex.every((value) => !isApproximateOnlySolutionLatex(value))
        ? solutionsToLatex('x', acceptedLatex)
        : undefined;

      return {
        kind: 'success',
        title: 'Solve',
        exactLatex,
        branchReadback: branchReadbackForAcceptedCandidates(
          acceptedLatex,
          validation.accepted,
          exactLatex,
          'equation-polynomial-carrier-candidate-validation',
        ),
        exactSupplementLatex:
          carrierAttempt.exactSupplementLatex && carrierAttempt.exactSupplementLatex.length > 0
            ? carrierAttempt.exactSupplementLatex
            : undefined,
        approxText: formatAcceptedApproximations(validation.accepted),
        warnings: [],
        resultOrigin: 'symbolic',
        plannerBadges: [],
        solveBadges: ['Candidate Checked'],
        candidateValues: validation.accepted,
        rejectedCandidateCount: validation.rejected.length > 0 ? validation.rejected.length : undefined,
      };
    }

    if (carrierAttempt.kind === 'empty') {
      return errorOutcome(
        'Solve',
        'No real solutions remain after resolving the bounded carrier roots.',
      );
    }

    if (recognizedDirectPolynomial || carrierAttempt.kind === 'recognized') {
      return errorOutcome(
        'Solve',
        UNSUPPORTED_FAMILY_ERROR,
      );
    }

    const mixedFactorSolve = runMixedFactorEquationSolve(request, depth, trail, runner);
    if (mixedFactorSolve) {
      return mixedFactorSolve;
    }

    return null;
  } catch {
    return null;
  }
}

export type GuardedEquationStageId =
  | 'numeric-interval'
  | 'bounded-polynomial'
  | 'algebra-transform'
  | 'composition'
  | 'direct-trig'
  | 'rewrite-trig'
  | 'substitution'
  | 'direct-symbolic';

type SymbolicSolveResult = ReturnType<typeof runExpressionAction>;

type GuardedSolveRunner = (
  request: GuardedSolveRequest,
  depth: number,
  trail: Set<string>,
) => DisplayOutcome;

type AsyncGuardedSolveRunner = (
  request: GuardedSolveRequest,
  depth: number,
  trail: Set<string>,
) => Promise<DisplayOutcome>;

export type GuardedEquationDirectSymbolicHostEvidence = {
  helperId: 'direct-symbolic';
  stageId: 'direct-symbolic';
  depth: number;
  selectedHostId: string;
  fallbackFromHostId?: string;
  fallbackReason?: string;
  isolated: boolean;
  terminalStatus: 'completed' | 'fallback' | 'cancelled' | 'failed';
  termination?: 'hardStop';
};

export type GuardedEquationDirectSymbolicRunnerResult = {
  outcome: DisplayOutcome;
  hostEvidence: GuardedEquationDirectSymbolicHostEvidence;
};

export type GuardedEquationDirectSymbolicRunner = (input: {
  request: GuardedSolveRequest;
  depth: number;
  stageId: 'direct-symbolic';
}) => Promise<GuardedEquationDirectSymbolicRunnerResult>;

export const EQUATION_SOLVE_CANCELLED_MESSAGE =
  'Equation solve was stopped before it finished.';

export type GuardedEquationCancellationPhase =
  | 'before-stage'
  | 'after-stage-no-outcome'
  | 'before-recursive-handoff'
  | 'before-direct-symbolic'
  | 'helper-checkpoint'
  | 'helper-yield';

export type GuardedEquationCancellationEvidence = {
  depth: number;
  stageId?: GuardedEquationStageId;
  phase: GuardedEquationCancellationPhase;
  reason: string;
  helperId?: string;
  family?: string;
  branchIndex?: number;
  candidateIndex?: number;
  message?: string;
};

export type GuardedEquationSolveControl = {
  shouldCancel?: () => boolean;
  checkpoint?: (message: string) => void;
  yieldIfBudgetExceeded?: (message?: string) => Promise<unknown>;
};

export type GuardedEquationSolveOptions = {
  control?: GuardedEquationSolveControl;
  directSymbolicRunner?: GuardedEquationDirectSymbolicRunner;
};

type GuardedEquationStageContext = {
  preparedRequest: GuardedSolveRequest;
  originalResolvedLatex: string;
  depth: number;
  trail: Set<string>;
  executionBudget: EquationExecutionBudget;
  getSymbolic: () => SymbolicSolveResult;
  runner: GuardedSolveRunner;
  asyncRunner?: AsyncGuardedSolveRunner;
  control?: GuardedEquationSolveControl;
  trace?: GuardedEquationStageReplayTrace;
  directSymbolicRunner?: GuardedEquationDirectSymbolicRunner;
};

export type GuardedEquationCooperativeCheckpointInput = {
  helperId: string;
  family?: string;
  branchIndex?: number;
  candidateIndex?: number;
  message?: string;
};

export type GuardedEquationCooperativeCheckpoint = (
  input: GuardedEquationCooperativeCheckpointInput,
) => Promise<DisplayOutcome | null>;

type GuardedEquationStageAsyncContext = GuardedEquationStageContext & {
  asyncRunner: AsyncGuardedSolveRunner;
  cooperativeCheckpoint: GuardedEquationCooperativeCheckpoint;
};

export type GuardedEquationStageDescriptor = {
  id: GuardedEquationStageId;
  label: string;
  execute: (context: GuardedEquationStageContext) => DisplayOutcome | null | undefined;
  executeAsync?: (context: GuardedEquationStageAsyncContext) => Promise<DisplayOutcome | null | undefined>;
  canRecurse?: boolean;
};

export type GuardedEquationStageTraceAttempt = {
  depth: number;
  stageId: GuardedEquationStageId;
  returnedOutcome: boolean;
};

export type GuardedEquationStageReplayTrace = {
  attempts: GuardedEquationStageTraceAttempt[];
  winningStageId?: GuardedEquationStageId;
  cancellation?: GuardedEquationCancellationEvidence;
  directSymbolicHostExecutions?: GuardedEquationDirectSymbolicHostEvidence[];
};

export type GuardedEquationStageOrderedSolveResult = {
  outcome: DisplayOutcome;
  trace: GuardedEquationStageReplayTrace;
};

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

export function runGuardedDirectSymbolicFallback(
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

function cancellationCheckpointMessage(input: {
  phase: GuardedEquationCancellationPhase;
  depth: number;
  stageId?: GuardedEquationStageId;
  helperId?: string;
  family?: string;
  branchIndex?: number;
  candidateIndex?: number;
  message?: string;
}) {
  const stage = input.stageId ? ` stage ${input.stageId}` : '';
  const helper = input.helperId ? ` helper ${input.helperId}` : '';
  const family = input.family ? ` family ${input.family}` : '';
  const branch = input.branchIndex !== undefined ? ` branch ${input.branchIndex}` : '';
  const candidate = input.candidateIndex !== undefined ? ` candidate ${input.candidateIndex}` : '';
  const suffix = input.message ? ` ${input.message}` : '';
  return `Equation cancellation checkpoint ${input.phase}${stage}${helper}${family}${branch}${candidate} at depth ${input.depth}.${suffix}`;
}

function buildCancellationOutcome() {
  return errorOutcome(
    'Solve',
    EQUATION_SOLVE_CANCELLED_MESSAGE,
    [],
    [],
    [],
    'Equation solve stopped at an OOE cancellation checkpoint.',
  );
}

function checkpointAndMaybeCancel(
  context: Pick<GuardedEquationStageContext, 'control' | 'depth' | 'trace'>,
  input: {
    phase: GuardedEquationCancellationPhase;
    stageId?: GuardedEquationStageId;
    helperId?: string;
    family?: string;
    branchIndex?: number;
    candidateIndex?: number;
    message?: string;
  },
): DisplayOutcome | null {
  const message = cancellationCheckpointMessage({
    phase: input.phase,
    stageId: input.stageId,
    depth: context.depth,
    helperId: input.helperId,
    family: input.family,
    branchIndex: input.branchIndex,
    candidateIndex: input.candidateIndex,
    message: input.message,
  });
  context.control?.checkpoint?.(message);

  if (!context.control?.shouldCancel?.()) {
    return null;
  }

  if (context.trace && !context.trace.cancellation) {
    context.trace.cancellation = {
      depth: context.depth,
      stageId: input.stageId,
      phase: input.phase,
      reason: EQUATION_SOLVE_CANCELLED_MESSAGE,
      helperId: input.helperId,
      family: input.family,
      branchIndex: input.branchIndex,
      candidateIndex: input.candidateIndex,
      message: input.message,
    };
  }

  return buildCancellationOutcome();
}

async function checkpointYieldAndMaybeCancel(
  context: Pick<GuardedEquationStageContext, 'control' | 'depth' | 'trace'>,
  input: {
    phase: GuardedEquationCancellationPhase;
    stageId?: GuardedEquationStageId;
    helperId?: string;
    family?: string;
    branchIndex?: number;
    candidateIndex?: number;
    message?: string;
  },
): Promise<DisplayOutcome | null> {
  const beforeYieldCancellation = checkpointAndMaybeCancel(context, input);
  if (beforeYieldCancellation) {
    return beforeYieldCancellation;
  }

  const message = cancellationCheckpointMessage({
    ...input,
    depth: context.depth,
  });
  await context.control?.yieldIfBudgetExceeded?.(message);

  return checkpointAndMaybeCancel(context, {
    ...input,
    phase: 'helper-yield',
  });
}

const GUARDED_EQUATION_STAGE_DESCRIPTORS: GuardedEquationStageDescriptor[] = [
  {
    id: 'numeric-interval',
    label: 'Numeric Interval',
    execute: ({ preparedRequest }) => (
      preparedRequest.numericInterval ? numericIntervalSolve(preparedRequest) : null
    ),
  },
  {
    id: 'bounded-polynomial',
    label: 'Bounded Polynomial',
    execute: ({ preparedRequest, depth, trail }) => runBoundedPolynomialSolve(preparedRequest, depth, trail),
  },
  {
    id: 'algebra-transform',
    label: 'Algebra Transform',
    canRecurse: true,
    execute: ({ preparedRequest, depth, trail, executionBudget, runner }) => algebraTransformSolve(
      preparedRequest,
      depth,
      trail,
      executionBudget,
      runner,
    ),
  },
  {
    id: 'composition',
    label: 'Composition',
    canRecurse: true,
    execute: ({ preparedRequest, depth, trail, executionBudget, runner }) => compositionSolve(
      preparedRequest,
      depth,
      trail,
      executionBudget,
      runner,
    ),
  },
  {
    id: 'direct-trig',
    label: 'Direct Trig',
    execute: ({ preparedRequest }) => directTrigSolve(preparedRequest),
  },
  {
    id: 'rewrite-trig',
    label: 'Rewrite Trig',
    execute: ({ preparedRequest }) => rewriteTrigSolve(preparedRequest),
  },
  {
    id: 'substitution',
    label: 'Substitution',
    canRecurse: true,
    execute: ({ preparedRequest, depth, trail, executionBudget, runner }) => substitutionSolve(
      preparedRequest,
      depth,
      trail,
      executionBudget,
      runner,
    ),
    executeAsync: ({ preparedRequest, depth, trail, executionBudget, asyncRunner, cooperativeCheckpoint }) => substitutionSolveAsync(
      preparedRequest,
      depth,
      trail,
      executionBudget,
      asyncRunner,
      cooperativeCheckpoint,
    ),
  },
  {
    id: 'direct-symbolic',
    label: 'Direct Symbolic',
    execute: runDirectSymbolicStage,
  },
];

export function listGuardedEquationStageDescriptors(): GuardedEquationStageDescriptor[] {
  return GUARDED_EQUATION_STAGE_DESCRIPTORS;
}

function validateStageOrder(
  stageOrder: GuardedEquationStageId[],
): GuardedEquationStageDescriptor[] {
  const defaultIds = GUARDED_EQUATION_STAGE_DESCRIPTORS.map((descriptor) => descriptor.id);
  const seen = new Set<GuardedEquationStageId>();
  for (const stageId of stageOrder) {
    if (seen.has(stageId)) {
      throw new Error(`Duplicate guarded equation stage id in custom order: ${stageId}`);
    }
    seen.add(stageId);
  }

  const missing = defaultIds.filter((stageId) => !seen.has(stageId));
  const extras = stageOrder.filter((stageId) => !defaultIds.includes(stageId));
  if (missing.length > 0 || extras.length > 0 || stageOrder.length !== defaultIds.length) {
    throw new Error(
      `Custom guarded equation stage order must be an exact permutation of registered stages. Missing: ${missing.join(', ') || 'none'}. Extra: ${extras.join(', ') || 'none'}.`,
    );
  }

  return stageOrder.map((stageId) => {
    const descriptor = GUARDED_EQUATION_STAGE_DESCRIPTORS.find((candidate) => candidate.id === stageId);
    if (!descriptor) {
      throw new Error(`Unknown guarded equation stage id in custom order: ${stageId}`);
    }
    return descriptor;
  });
}

function runGuardedStageSequence(
  descriptors: GuardedEquationStageDescriptor[],
  context: GuardedEquationStageContext,
): DisplayOutcome | null {
  for (const descriptor of descriptors) {
    const beforeStageCancellation = checkpointAndMaybeCancel(context, {
      phase: 'before-stage',
      stageId: descriptor.id,
    });
    if (beforeStageCancellation) {
      return attachAlgebraMetadata(
        beforeStageCancellation,
        context.originalResolvedLatex,
        context.preparedRequest,
      );
    }

    const stageContext: GuardedEquationStageContext = {
      ...context,
      runner: (nextRequest, nextDepth, nextTrail) => {
        const recursiveCancellation = checkpointAndMaybeCancel(context, {
          phase: 'before-recursive-handoff',
          stageId: descriptor.id,
        });
        if (recursiveCancellation) {
          return recursiveCancellation;
        }

        return context.runner(nextRequest, nextDepth, nextTrail);
      },
    };

    const outcome = descriptor.execute(stageContext);
    context.trace?.attempts.push({
      depth: context.depth,
      stageId: descriptor.id,
      returnedOutcome: Boolean(outcome),
    });
    if (outcome) {
      return attachAlgebraMetadata(
        outcome,
        context.originalResolvedLatex,
        context.preparedRequest,
      );
    }

    const afterNoOutcomeCancellation = checkpointAndMaybeCancel(context, {
      phase: 'after-stage-no-outcome',
      stageId: descriptor.id,
    });
    if (afterNoOutcomeCancellation) {
      return attachAlgebraMetadata(
        afterNoOutcomeCancellation,
        context.originalResolvedLatex,
        context.preparedRequest,
      );
    }
  }

  return null;
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

async function runGuardedStageSequenceAsync(
  descriptors: GuardedEquationStageDescriptor[],
  context: GuardedEquationStageContext,
): Promise<DisplayOutcome | null> {
  for (const descriptor of descriptors) {
    const beforeStageCancellation = await checkpointYieldAndMaybeCancel(context, {
      phase: 'before-stage',
      stageId: descriptor.id,
    });
    if (beforeStageCancellation) {
      return attachAlgebraMetadata(
        beforeStageCancellation,
        context.originalResolvedLatex,
        context.preparedRequest,
      );
    }

    const stageContext: GuardedEquationStageAsyncContext = {
      ...context,
      runner: (nextRequest, nextDepth, nextTrail) => {
        const recursiveCancellation = checkpointAndMaybeCancel(context, {
          phase: 'before-recursive-handoff',
          stageId: descriptor.id,
        });
        if (recursiveCancellation) {
          return recursiveCancellation;
        }

        return context.runner(nextRequest, nextDepth, nextTrail);
      },
      asyncRunner: async (nextRequest, nextDepth, nextTrail) => {
        const recursiveCancellation = await checkpointYieldAndMaybeCancel(context, {
          phase: 'before-recursive-handoff',
          stageId: descriptor.id,
          helperId: descriptor.id,
          family: 'recursive-handoff',
        });
        if (recursiveCancellation) {
          return recursiveCancellation;
        }

        return context.asyncRunner
          ? context.asyncRunner(nextRequest, nextDepth, nextTrail)
          : context.runner(nextRequest, nextDepth, nextTrail);
      },
      cooperativeCheckpoint: (input) => checkpointYieldAndMaybeCancel(context, {
        phase: 'helper-checkpoint',
        stageId: descriptor.id,
        ...input,
      }),
    };

    const outcome = descriptor.id === 'direct-symbolic'
      ? await runDirectSymbolicStageAsync(stageContext)
      : descriptor.executeAsync
        ? await descriptor.executeAsync(stageContext)
        : descriptor.execute(stageContext);
    context.trace?.attempts.push({
      depth: context.depth,
      stageId: descriptor.id,
      returnedOutcome: Boolean(outcome),
    });
    if (outcome) {
      return attachAlgebraMetadata(
        outcome,
        context.originalResolvedLatex,
        context.preparedRequest,
      );
    }

    const afterNoOutcomeCancellation = await checkpointYieldAndMaybeCancel(context, {
      phase: 'after-stage-no-outcome',
      stageId: descriptor.id,
    });
    if (afterNoOutcomeCancellation) {
      return attachAlgebraMetadata(
        afterNoOutcomeCancellation,
        context.originalResolvedLatex,
        context.preparedRequest,
      );
    }
  }

  return null;
}

function runGuardedEquationSolveInternal(
  request: GuardedSolveRequest,
  depth: number,
  trail: Set<string>,
  descriptors: GuardedEquationStageDescriptor[],
  options: GuardedEquationSolveOptions = {},
  trace?: GuardedEquationStageReplayTrace,
): DisplayOutcome {
  const executionBudget = getEquationExecutionBudget();
  const preparedRequest = prepareAlgebraSolveRequest(request);
  let symbolicCache: ReturnType<typeof runExpressionAction> | null = null;
  const getSymbolic = () => {
    if (symbolicCache) {
      return symbolicCache;
    }

    symbolicCache = runExpressionAction(
      {
        mode: 'equation',
        document: { latex: preparedRequest.resolvedLatex },
        angleUnit: preparedRequest.angleUnit,
        outputStyle: preparedRequest.outputStyle,
        variables: { Ans: preparedRequest.ansLatex },
      },
      'solve',
    );

      return symbolicCache;
    };
  const runner: GuardedSolveRunner = (nextRequest, nextDepth, nextTrail) => runGuardedEquationSolveInternal(
    nextRequest,
    nextDepth,
    nextTrail,
    descriptors,
    options,
    trace,
  );
  const stateKey = equationStateKey(preparedRequest.resolvedLatex);
  if (trail.has(stateKey)) {
    return attachAlgebraMetadata(errorOutcome(
      'Solve',
      'This equation re-entered an equivalent guarded-solve state. Use Numeric Solve with a chosen interval.',
    ), request.resolvedLatex, preparedRequest);
  }
  trail.add(stateKey);

  const rangeImpossibility = detectRealRangeImpossibility(preparedRequest.resolvedLatex);

  if (rangeImpossibility.kind === 'impossible') {
    return attachAlgebraMetadata(errorOutcome(
      'Solve',
      rangeImpossibility.error,
      [],
      [],
      ['Range Guard'],
      rangeImpossibility.summaryText,
    ), request.resolvedLatex, preparedRequest);
  }

  const stagedOutcome = runGuardedStageSequence(
    descriptors,
    {
      preparedRequest,
      originalResolvedLatex: request.resolvedLatex,
      depth,
      trail,
      executionBudget,
      getSymbolic,
      runner,
      control: options.control,
      trace,
    },
  );
  if (stagedOutcome) {
    return stagedOutcome;
  }
  return attachAlgebraMetadata(
    errorOutcome(
      'Solve',
      UNSUPPORTED_FAMILY_ERROR,
    ),
    request.resolvedLatex,
    preparedRequest,
  );
}

async function runGuardedEquationSolveInternalAsync(
  request: GuardedSolveRequest,
  depth: number,
  trail: Set<string>,
  descriptors: GuardedEquationStageDescriptor[],
  options: GuardedEquationSolveOptions = {},
  trace?: GuardedEquationStageReplayTrace,
): Promise<DisplayOutcome> {
  const executionBudget = getEquationExecutionBudget();
  const preparedRequest = prepareAlgebraSolveRequest(request);
  let symbolicCache: ReturnType<typeof runExpressionAction> | null = null;
  const getSymbolic = () => {
    if (symbolicCache) {
      return symbolicCache;
    }

    symbolicCache = runExpressionAction(
      {
        mode: 'equation',
        document: { latex: preparedRequest.resolvedLatex },
        angleUnit: preparedRequest.angleUnit,
        outputStyle: preparedRequest.outputStyle,
        variables: { Ans: preparedRequest.ansLatex },
      },
      'solve',
    );

      return symbolicCache;
    };
  const runner: GuardedSolveRunner = (nextRequest, nextDepth, nextTrail) => runGuardedEquationSolveInternal(
    nextRequest,
    nextDepth,
    nextTrail,
    descriptors,
    options,
    trace,
  );
  const asyncRunner: AsyncGuardedSolveRunner = (nextRequest, nextDepth, nextTrail) => runGuardedEquationSolveInternalAsync(
    nextRequest,
    nextDepth,
    nextTrail,
    descriptors,
    options,
    trace,
  );
  const stateKey = equationStateKey(preparedRequest.resolvedLatex);
  if (trail.has(stateKey)) {
    return attachAlgebraMetadata(errorOutcome(
      'Solve',
      'This equation re-entered an equivalent guarded-solve state. Use Numeric Solve with a chosen interval.',
    ), request.resolvedLatex, preparedRequest);
  }
  trail.add(stateKey);

  const rangeImpossibility = detectRealRangeImpossibility(preparedRequest.resolvedLatex);

  if (rangeImpossibility.kind === 'impossible') {
    return attachAlgebraMetadata(errorOutcome(
      'Solve',
      rangeImpossibility.error,
      [],
      [],
      ['Range Guard'],
      rangeImpossibility.summaryText,
    ), request.resolvedLatex, preparedRequest);
  }

  const stagedOutcome = await runGuardedStageSequenceAsync(
    descriptors,
    {
      preparedRequest,
      originalResolvedLatex: request.resolvedLatex,
      depth,
      trail,
      executionBudget,
      getSymbolic,
      runner,
      asyncRunner,
      control: options.control,
      trace,
      directSymbolicRunner: options.directSymbolicRunner,
    },
  );
  if (stagedOutcome) {
    return stagedOutcome;
  }
  return attachAlgebraMetadata(
    errorOutcome(
      'Solve',
      UNSUPPORTED_FAMILY_ERROR,
    ),
    request.resolvedLatex,
    preparedRequest,
  );
}

function runGuardedEquationSolve(
  request: GuardedSolveRequest,
  depth = 0,
  trail = new Set<string>(),
  options: GuardedEquationSolveOptions = {},
): DisplayOutcome {
  return runGuardedEquationSolveInternal(
    request,
    depth,
    trail,
    GUARDED_EQUATION_STAGE_DESCRIPTORS,
    options,
  );
}

export function runGuardedEquationSolveWithStageOrder(
  request: GuardedSolveRequest,
  stageOrder: GuardedEquationStageId[],
  options: GuardedEquationSolveOptions = {},
): GuardedEquationStageOrderedSolveResult {
  const descriptors = validateStageOrder(stageOrder);
  const trace: GuardedEquationStageReplayTrace = { attempts: [] };
  const outcome = runGuardedEquationSolveInternal(
    request,
    0,
    new Set<string>(),
    descriptors,
    options,
    trace,
  );
  const winningAttempt = trace.cancellation
    ? undefined
    : trace.attempts.find((attempt) => attempt.depth === 0 && attempt.returnedOutcome);
  if (winningAttempt) {
    trace.winningStageId = winningAttempt.stageId;
  }
  return {
    outcome,
    trace,
  };
}

export async function runGuardedEquationSolveWithStageOrderAsync(
  request: GuardedSolveRequest,
  stageOrder: GuardedEquationStageId[],
  options: GuardedEquationSolveOptions = {},
): Promise<GuardedEquationStageOrderedSolveResult> {
  const descriptors = validateStageOrder(stageOrder);
  const trace: GuardedEquationStageReplayTrace = { attempts: [] };
  const outcome = await runGuardedEquationSolveInternalAsync(
    request,
    0,
    new Set<string>(),
    descriptors,
    options,
    trace,
  );
  const winningAttempt = trace.cancellation
    ? undefined
    : trace.attempts.find((attempt) => attempt.depth === 0 && attempt.returnedOutcome);
  if (winningAttempt) {
    trace.winningStageId = winningAttempt.stageId;
  }
  return {
    outcome,
    trace,
  };
}

export { runGuardedEquationSolve };
