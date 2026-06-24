import { ComputeEngine } from '@cortex-js/compute-engine';
import { hasTarget, isArrayNode } from './math-json';
import {
  collectDirectNDegreeSymbolicTargetPolynomial,
  nDegreeSymbolicPolynomialDegree,
  subtractNDegreeSymbolicPolynomials,
  type NDegreeSymbolicTargetPolynomial,
} from './n-degree-symbolic-polynomial';
import { hasAmbiguousAdjacentProduct, parameterNamesFromLatex } from './target-context';

const ce = new ComputeEngine();

export type HigherDegreePolynomialAlgorithm = 'cardano' | 'ferrari';

export type HigherDegreePolynomialPolicyStopReason =
  | 'parse-error'
  | 'non-equation'
  | 'target-not-found'
  | 'ambiguous-adjacent-product'
  | 'target-in-denominator'
  | 'degree-limit'
  | 'target-in-unsupported-operation'
  | 'target-in-unsupported-power'
  | 'target-in-unsupported-family';

export type HigherDegreePolynomialPolicyResult =
  | {
      kind: 'ready';
      reason: 'cardano-ready';
      algorithm: 'cardano';
      degree: 3;
      domains: ['complex', 'real'];
      target: string;
      parameterNames: string[];
      polynomial: NDegreeSymbolicTargetPolynomial;
      message: string;
    }
  | {
      kind: 'ready';
      reason: 'ferrari-ready';
      algorithm: 'ferrari';
      degree: 4;
      domains: ['complex', 'real'];
      target: string;
      parameterNames: string[];
      polynomial: NDegreeSymbolicTargetPolynomial;
      message: string;
    }
  | {
      kind: 'not-applicable';
      reason: 'degree-below-threshold';
      degree: -1 | 0 | 1 | 2;
      target: string;
      parameterNames: string[];
      polynomial: NDegreeSymbolicTargetPolynomial;
      message: string;
    }
  | {
      kind: 'unsupported';
      reason: HigherDegreePolynomialPolicyStopReason;
      target: string;
      parameterNames: string[];
      message: string;
    };

export type HigherDegreePolynomialPolicyOptions = {
  allowGeneratedImplicitProducts?: boolean;
};

const POLICY_COLLECT_MESSAGES = {
  targetInDenominator: {
    reason: 'target-in-denominator',
    message: 'Higher-degree polynomial policy inspection does not consume target denominators.',
  },
  degreeLimit: {
    reason: 'degree-limit',
    message: 'Higher-degree polynomial policy inspection is capped at degree 4.',
  },
  targetInUnsupportedExpression: {
    reason: 'target-in-unsupported-operation',
    message: 'The selected target appears in an unsupported expression shape.',
  },
  targetInUnsupportedPower: {
    reason: 'target-in-unsupported-power',
    message: 'Higher-degree polynomial policy inspection only supports direct selected-target powers.',
  },
  targetInUnsupportedFamily: {
    reason: 'target-in-unsupported-family',
    message: 'This selected-target family is outside higher-degree polynomial policy inspection.',
  },
} as const;

function unsupported(
  reason: HigherDegreePolynomialPolicyStopReason,
  message: string,
  target: string,
  parameterNames: string[],
): HigherDegreePolynomialPolicyResult {
  return {
    kind: 'unsupported',
    reason,
    message,
    target,
    parameterNames,
  };
}

function blockedMessage(algorithm: HigherDegreePolynomialAlgorithm) {
  return algorithm === 'cardano'
    ? 'Cubic formula output is ready for Complex Exact and Real Exact Cardano routes.'
    : 'Quartic formula output is ready for Complex Exact and Real Exact Ferrari routes.';
}

export function inspectHigherDegreePolynomialEquation(
  equationLatex: string,
  target: string,
  options: HigherDegreePolynomialPolicyOptions = {},
): HigherDegreePolynomialPolicyResult {
  const parameterNames = parameterNamesFromLatex(equationLatex, target);

  if (!options.allowGeneratedImplicitProducts && hasAmbiguousAdjacentProduct(equationLatex)) {
    return unsupported(
      'ambiguous-adjacent-product',
      'Adjacent letters must use explicit multiplication before higher-degree polynomial policy inspection.',
      target,
      parameterNames,
    );
  }

  let parsed: ReturnType<typeof ce.parse>;
  try {
    parsed = ce.parse(equationLatex);
  } catch {
    return unsupported('parse-error', 'The equation could not be parsed for higher-degree polynomial policy inspection.', target, parameterNames);
  }

  const json = parsed.json;
  if (!isArrayNode(json) || json[0] !== 'Equal' || json.length !== 3) {
    return unsupported('non-equation', 'Enter an = equation before higher-degree polynomial policy inspection.', target, parameterNames);
  }

  if (!hasTarget(json, target)) {
    return unsupported('target-not-found', `Selected target ${target} was not found in this equation.`, target, parameterNames);
  }

  const left = collectDirectNDegreeSymbolicTargetPolynomial(
    json[1],
    target,
    4,
    POLICY_COLLECT_MESSAGES,
  );
  if (left.kind === 'unsupported') {
    return unsupported(left.reason, left.message, target, parameterNames);
  }

  const right = collectDirectNDegreeSymbolicTargetPolynomial(
    json[2],
    target,
    4,
    POLICY_COLLECT_MESSAGES,
  );
  if (right.kind === 'unsupported') {
    return unsupported(right.reason, right.message, target, parameterNames);
  }

  const polynomial = subtractNDegreeSymbolicPolynomials(left.polynomial, right.polynomial);
  const degree = nDegreeSymbolicPolynomialDegree(polynomial);
  if (degree === 3) {
    return {
      kind: 'ready',
      reason: 'cardano-ready',
      algorithm: 'cardano',
      degree,
      domains: ['complex', 'real'],
      target,
      parameterNames,
      polynomial,
      message: blockedMessage('cardano'),
    };
  }
  if (degree === 4) {
    return {
      kind: 'ready',
      reason: 'ferrari-ready',
      algorithm: 'ferrari',
      degree,
      domains: ['complex', 'real'],
      target,
      parameterNames,
      polynomial,
      message: blockedMessage('ferrari'),
    };
  }

  return {
    kind: 'not-applicable',
    reason: 'degree-below-threshold',
    degree: degree as -1 | 0 | 1 | 2,
    target,
    parameterNames,
    polynomial,
    message: 'Higher-degree polynomial policy inspection only applies to degree 3 and 4.',
  };
}
