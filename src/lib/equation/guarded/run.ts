import { ComputeEngine } from '@cortex-js/compute-engine';
import { runExpressionAction } from '../../math-engine';
import { formatApproxNumber, solutionsToLatex } from '../../format';
import { readExactScalarNode } from '../../polynomial-core';
import { normalizeExactRadicalNode } from '../../symbolic-engine/radical';
import { normalizeExactRationalNode } from '../../symbolic-engine/rational';
import { factorMixedCarrierAst } from '../../symbolic-engine/mixed-factor';
import { dependsOnVariable, flattenMultiply, isNodeArray as isPatternNodeArray } from '../../symbolic-engine/patterns';
import { mergeExactSupplementLatex } from '../../exact-supplements';
import { detectRealRangeImpossibility } from '../range-impossibility';
import { validateCandidateRoots } from '../candidate-validation';
import {
  buildEquationCandidateRejectionMessage,
  classifyCandidateRejections,
} from '../candidate-rejection';
import { recognizeBoundedPolynomialEquationAst, solveBoundedPolynomialEquationAst } from '../../polynomial-factor-solve';
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
import { substitutionSolve } from './substitution-stage';
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
      const outcome = runGuardedEquationSolve(
        {
          ...request,
          resolvedLatex: factorEquationLatex,
          validationLatex: baseValidationLatex,
        },
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

  return {
    ...outcome,
    exactSupplementLatex: exactSupplementLatex.length > 0 ? exactSupplementLatex : undefined,
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
    || numericSolutions.some((value) => value === null)
  ) {
    return null;
  }

  const finiteSolutions = numericSolutions.filter((value): value is number => value !== null);
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
    const matchIndex = finiteSolutions.findIndex((value, index) =>
      Math.abs(value - acceptedValue) <= NUMERIC_MATCH_TOLERANCE
      && !acceptedValues.some((usedValue) => Math.abs(usedValue - value) <= NUMERIC_MATCH_TOLERANCE)
      && !acceptedLatex.includes(rawSolutionLatex[index]));
    if (matchIndex >= 0) {
      acceptedValues.push(finiteSolutions[matchIndex]);
      acceptedLatex.push(rawSolutionLatex[matchIndex]);
    }
  }

  const exactLatex = acceptedLatex.length > 0 && acceptedLatex.every((value) => !isApproximateOnlySolutionLatex(value))
    ? solutionsToLatex('x', acceptedLatex)
    : undefined;

  return {
    kind: 'success',
    title: 'Solve',
    exactLatex,
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

    const mixedFactorSolve = runMixedFactorEquationSolve(request, depth, trail);
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

type GuardedEquationStageContext = {
  preparedRequest: GuardedSolveRequest;
  originalResolvedLatex: string;
  depth: number;
  trail: Set<string>;
  executionBudget: EquationExecutionBudget;
  getSymbolic: () => SymbolicSolveResult;
};

export type GuardedEquationStageDescriptor = {
  id: GuardedEquationStageId;
  label: string;
  execute: (context: GuardedEquationStageContext) => DisplayOutcome | null | undefined;
  canRecurse?: boolean;
};

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

  const symbolic = context.getSymbolic();
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
    execute: ({ preparedRequest, depth, trail, executionBudget }) => algebraTransformSolve(
      preparedRequest,
      depth,
      trail,
      executionBudget,
      runGuardedEquationSolve,
    ),
  },
  {
    id: 'composition',
    label: 'Composition',
    canRecurse: true,
    execute: ({ preparedRequest, depth, trail, executionBudget }) => compositionSolve(
      preparedRequest,
      depth,
      trail,
      executionBudget,
      runGuardedEquationSolve,
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
    execute: ({ preparedRequest, depth, trail, executionBudget }) => substitutionSolve(
      preparedRequest,
      depth,
      trail,
      executionBudget,
      runGuardedEquationSolve,
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

function runGuardedStageSequence(
  descriptors: GuardedEquationStageDescriptor[],
  context: GuardedEquationStageContext,
): DisplayOutcome | null {
  for (const descriptor of descriptors) {
    const outcome = descriptor.execute(context);
    if (outcome) {
      return attachAlgebraMetadata(
        outcome,
        context.originalResolvedLatex,
        context.preparedRequest,
      );
    }
  }

  return null;
}

function runGuardedEquationSolve(
  request: GuardedSolveRequest,
  depth = 0,
  trail = new Set<string>(),
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
    GUARDED_EQUATION_STAGE_DESCRIPTORS,
    {
      preparedRequest,
      originalResolvedLatex: request.resolvedLatex,
      depth,
      trail,
      executionBudget,
      getSymbolic,
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

export { runGuardedEquationSolve };
