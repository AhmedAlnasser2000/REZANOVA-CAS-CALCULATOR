import {
  calculusAntiderivativeExpressionToAst,
  renderCalculusAntiderivativeExpression,
  type CalculusAntiderivativeExpression,
  type CalculusIntegrationDetailNode,
  type CalculusIntegrationFactNode,
} from '../../calculus/engine/antiderivative-expression';
import {
  backcheckAntiderivative,
  backcheckAntiderivativeAst,
  type AntiderivativeBackcheck,
} from '../../calculus/engine/verification';
import {
  decomposeDistinctLinearPartialFractions,
  decomposeRationalPartialFractionReadiness,
  normalizeExactRationalFunctionNode,
  type RationalFunctionStopReason,
} from '../../algebra/rational-function-core';
import { divideExactPolynomials, exactPolynomialIsZero } from '../../algebra/polynomial-core';
import { isNodeArray } from '../patterns';
import { numericNodeValue, sameNode } from './node-helpers';
import type { DisplayDetailSection } from '../../../types/calculator';
import type {
  IntegralResolution,
  IntegralStrategy,
  IntegrationCandidateMetadata,
  IntegrationCandidatePrerequisite,
} from './types';

export function symbolicSuccess(
  node: unknown,
  variable: string,
  exactLatex: string,
  strategy: IntegralStrategy,
  precomputedVerification?: AntiderivativeBackcheck,
  exactSupplementLatex?: string[],
  detailSections?: DisplayDetailSection[],
  antiderivativeExpression?: CalculusAntiderivativeExpression,
  factNodes?: CalculusIntegrationFactNode[],
  detailNodes?: CalculusIntegrationDetailNode[],
  nativeVerificationMode: 'backcheck' | 'precomputed-exact' | 'precomputed-trusted' = 'backcheck',
): IntegralResolution {
  const expressionAst = antiderivativeExpression
    ? calculusAntiderivativeExpressionToAst(antiderivativeExpression)
    : undefined;
  const canonicalLatex = antiderivativeExpression
    ? renderCalculusAntiderivativeExpression(antiderivativeExpression)
    : exactLatex;
  const verification = antiderivativeExpression
    ? nativeVerificationMode === 'precomputed-exact'
      && precomputedVerification?.status === 'verified-exact'
      ? precomputedVerification
      : nativeVerificationMode === 'precomputed-trusted'
      && (
        precomputedVerification?.status === 'verified-exact'
        || precomputedVerification?.status === 'verified-numeric-confidence'
      )
        ? precomputedVerification
      : expressionAst === undefined
      ? {
          status: 'not-checkable' as const,
          reason: 'native antiderivative expression could not be differentiated',
        }
      : backcheckAntiderivativeAst({
          antiderivative: expressionAst,
          integrand: node,
          variable,
        })
    : precomputedVerification ?? backcheckAntiderivative({
        antiderivativeLatex: canonicalLatex,
        integrand: node,
        variable,
      });

  return {
    kind: 'success',
    exactLatex: canonicalLatex,
    ...(antiderivativeExpression
      ? { antiderivativeExpression: structuredClone(antiderivativeExpression) }
      : {}),
    origin: 'rule-based-symbolic',
    strategy,
    verification,
    candidate: buildSuccessfulCandidateMetadata(node, strategy, verification),
    exactSupplementLatex,
    detailSections,
    ...(factNodes?.length ? { factNodes: structuredClone(factNodes) } : {}),
    ...(detailNodes?.length ? { detailNodes: structuredClone(detailNodes) } : {}),
  };
}

export function buildComputeEngineIntegrationCandidate(
  node: unknown,
  verification: AntiderivativeBackcheck,
): IntegrationCandidateMetadata {
  return {
    method: 'compute-engine',
    requiredPrerequisites: ['compute-engine', 'derivative-backcheck'],
    blockedPrerequisites: [],
    verificationStatus: verification.status,
    controlledFailureClass:
      verification.status === 'not-verified' ? 'not-verified' : undefined,
    readinessNotes: [
      'Compute Engine supplied the candidate; Calcwiz keeps this separate from app-owned symbolic rules.',
      'The derivative backcheck is recorded internally and does not change visible result origin wording.',
    ],
    domainHazards: collectIntegrationDomainHazards(node),
  };
}

function strategyPrerequisites(strategy: IntegralStrategy): IntegrationCandidatePrerequisite[] {
  switch (strategy) {
    case 'direct-rule':
      return ['derivative-backcheck'];
    case 'inverse-trig':
      return ['derivative-backcheck', 'domain-safety'];
    case 'derivative-ratio':
      return ['derivative-backcheck', 'polynomial-core', 'domain-safety'];
    case 'partial-fractions':
      return [
        'derivative-backcheck',
        'domain-safety',
        'polynomial-core',
        'rational-function-core',
        'polynomial-division',
        'polynomial-gcd',
        'partial-fractions',
      ];
    case 'u-substitution':
      return ['derivative-backcheck'];
    case 'integration-by-parts':
      return ['derivative-backcheck', 'polynomial-core'];
    case 'affine-linear':
      return ['derivative-backcheck'];
    case 'compute-engine':
      return ['compute-engine', 'derivative-backcheck'];
  }
}

function buildSuccessfulCandidateMetadata(
  node: unknown,
  strategy: IntegralStrategy,
  verification: AntiderivativeBackcheck,
): IntegrationCandidateMetadata {
  return {
    method: strategy,
    requiredPrerequisites: strategyPrerequisites(strategy),
    blockedPrerequisites: [],
    verificationStatus: verification.status,
    controlledFailureClass:
      verification.status === 'not-verified' ? 'not-verified' : undefined,
    readinessNotes: [
      'Candidate accepted through an existing bounded symbolic integration family.',
      'No new antiderivative family is implied by this metadata.',
    ],
    domainHazards: collectIntegrationDomainHazards(node),
  };
}

function dedupe<T>(items: T[]) {
  return [...new Set(items)];
}

export function collectIntegrationDomainHazards(node: unknown): string[] {
  if (!isNodeArray(node)) {
    return [];
  }

  const hazards: string[] = [];
  const operator = node[0];

  if (operator === 'Divide' && node.length === 3) {
    hazards.push('denominator-nonzero');
  }

  if ((operator === 'Ln' || operator === 'Log') && node.length === 2) {
    hazards.push('log-argument-positive');
  }

  if (operator === 'Sqrt' && node.length === 2) {
    hazards.push('root-radicand-nonnegative');
  }

  if (operator === 'Power' && node.length === 3) {
    const exponent = numericNodeValue(node[2]);
    if (exponent !== undefined && exponent < 0) {
      hazards.push('negative-power-base-nonzero');
    }
    if (exponent !== undefined && !Number.isInteger(exponent)) {
      hazards.push('fractional-power-branch');
    }
  }

  for (const child of node.slice(1)) {
    hazards.push(...collectIntegrationDomainHazards(child));
  }

  return dedupe(hazards);
}

function isExactInteger(value: number) {
  return Number.isFinite(value) && Number.isInteger(value);
}

function isExactIntegerNode(node: unknown) {
  return isExactInteger(numericNodeValue(node) ?? Number.NaN);
}

function isRationalExpressionShape(node: unknown): boolean {
  if (typeof node === 'number') {
    return Number.isFinite(node);
  }

  if (typeof node === 'string') {
    return true;
  }

  if (!isNodeArray(node) || node.length === 0 || typeof node[0] !== 'string') {
    return false;
  }

  const [head, ...children] = node;
  if (head === 'Rational' && children.length === 2) {
    return children.every((child) => typeof child === 'number' && isExactInteger(child));
  }

  if (head === 'Divide') {
    return children.length === 2 && children.every(isRationalExpressionShape);
  }

  if (head === 'Power') {
    return children.length === 2
      && isRationalExpressionShape(children[0])
      && isExactIntegerNode(children[1]);
  }

  if (head === 'Add' || head === 'Subtract' || head === 'Multiply') {
    return children.length > 0 && children.every(isRationalExpressionShape);
  }

  if (head === 'Negate') {
    return children.length === 1 && isRationalExpressionShape(children[0]);
  }

  return false;
}

export function containsRationalOperator(node: unknown): boolean {
  if (!isNodeArray(node) || node.length === 0 || typeof node[0] !== 'string') {
    return false;
  }

  if (node[0] === 'Divide') {
    return true;
  }

  if (node[0] === 'Power' && node.length === 3) {
    const exponent = numericNodeValue(node[2]);
    if (exponent !== undefined && exponent < 0 && Number.isInteger(exponent)) {
      return true;
    }
  }

  return node.slice(1).some(containsRationalOperator);
}

function rationalStopNotes(reason: RationalFunctionStopReason): {
  blockedPrerequisites: IntegrationCandidatePrerequisite[];
  readinessNotes: string[];
} {
  switch (reason) {
    case 'multivariable':
    case 'variable-mismatch':
      return {
        blockedPrerequisites: ['rational-function-core'],
        readinessNotes: [
          'Rational integration is currently one-variable only.',
          'Multivariable rational integration remains outside INT-RAT1.',
        ],
      };
    case 'degree-limit':
    case 'factorization-degree-limit':
      return {
        blockedPrerequisites: ['rational-function-core'],
        readinessNotes: [
          'The rational expression exceeded the bounded polynomial degree cap.',
          'INT-RAT2 keeps degree limits explicit instead of broadening algebra search.',
        ],
      };
    case 'repeated-linear-factor':
      return {
        blockedPrerequisites: ['partial-fractions'],
        readinessNotes: [
          'Repeated linear denominator factors require the wider INT-RAT2 partial-fraction readiness envelope.',
        ],
      };
    case 'denominator-not-distinct-linear':
    case 'unsupported-factorization':
    case 'irreducible-quadratic-factor':
    case 'algebraic-root-required':
    case 'unsupported-factor-multiplicity':
      return {
        blockedPrerequisites: ['partial-fractions'],
        readinessNotes: [
          'The denominator did not fit the supported bounded INT-RAT2 denominator families.',
          'Broader factorization, algebraic roots, resultants, and Grobner-style elimination remain deferred.',
        ],
      };
    case 'not-proper':
      return {
        blockedPrerequisites: ['polynomial-division'],
        readinessNotes: [
          'The rational function was not proper after normalization.',
          'INT-RAT1 requires polynomial division before partial fractions.',
        ],
      };
    case 'zero-denominator':
      return {
        blockedPrerequisites: ['domain-safety'],
        readinessNotes: [
          'The rational expression has a zero denominator in the bounded rational-function core.',
        ],
      };
    case 'unsupported-expression':
    default:
      return {
        blockedPrerequisites: ['rational-function-core'],
        readinessNotes: [
          'The expression did not fit the exact one-variable rational-function substrate.',
          'Decimals, unsupported AST shapes, and non-polynomial rational forms remain outside INT-RAT1.',
        ],
      };
  }
}

function rationalCandidateMetadata(node: unknown, variable: string, domainHazards: string[]) {
  const normalized = normalizeExactRationalFunctionNode(node, { variable, maxDegree: 8 });

  if (normalized.kind === 'stop') {
    if (normalized.reason === 'unsupported-expression' && !isRationalExpressionShape(node)) {
      return undefined;
    }

    const notes = rationalStopNotes(normalized.reason);
    return {
      method: 'unsupported' as const,
      requiredPrerequisites: ['polynomial-core', 'rational-function-core'] as IntegrationCandidatePrerequisite[],
      blockedPrerequisites: notes.blockedPrerequisites,
      verificationStatus: 'not-attempted' as const,
      controlledFailureClass: 'blocked-polynomial-prerequisite' as const,
      readinessNotes: notes.readinessNotes,
      domainHazards,
    };
  }

  const division = divideExactPolynomials(
    normalized.rational.numerator,
    normalized.rational.denominator,
  );
  if (!division) {
    return undefined;
  }

  if (exactPolynomialIsZero(division.remainder)) {
    return undefined;
  }

  const partialFractions = decomposeDistinctLinearPartialFractions({
    variable: normalized.rational.variable,
    numerator: division.remainder,
    denominator: normalized.rational.denominator,
  });
  if (partialFractions.kind === 'success') {
    return undefined;
  }

  const widerReadiness = decomposeRationalPartialFractionReadiness({
    variable: normalized.rational.variable,
    numerator: division.remainder,
    denominator: normalized.rational.denominator,
  });
  if (widerReadiness.kind === 'success') {
    return undefined;
  }

  const notes = rationalStopNotes(widerReadiness.reason);
  return {
    method: 'unsupported' as const,
    requiredPrerequisites: [
      'polynomial-core',
      'rational-function-core',
      'polynomial-division',
      'polynomial-gcd',
      'partial-fractions',
    ] as IntegrationCandidatePrerequisite[],
    blockedPrerequisites: notes.blockedPrerequisites,
    verificationStatus: 'not-attempted' as const,
    controlledFailureClass: 'blocked-polynomial-prerequisite' as const,
    readinessNotes: notes.readinessNotes,
    domainHazards,
  };
}

function hasUnsupportedCompositionWithoutDerivativeFactor(node: unknown, variable: string): boolean {
  if (!isNodeArray(node)) {
    return false;
  }

  if (
    ['Sin', 'Cos', 'Ln', 'Log', 'Sqrt'].includes(String(node[0]))
    && node.length === 2
    && !sameNode(node[1], variable)
  ) {
    return true;
  }

  if (
    node[0] === 'Power'
    && node.length === 3
    && node[1] === 'ExponentialE'
    && !sameNode(node[2], variable)
  ) {
    return true;
  }

  return node.slice(1).some((child) => hasUnsupportedCompositionWithoutDerivativeFactor(child, variable));
}

function containsAbsCarrier(node: unknown): boolean {
  if (!isNodeArray(node)) {
    return false;
  }

  if (node[0] === 'Abs' || node[0] === 'AbsoluteValue') {
    return true;
  }

  return node.slice(1).some(containsAbsCarrier);
}

export function unsupportedCandidateMetadata(node: unknown, variable: string): IntegrationCandidateMetadata {
  const domainHazards = collectIntegrationDomainHazards(node);
  const rationalCandidate = rationalCandidateMetadata(node, variable, domainHazards);

  if (rationalCandidate) {
    return rationalCandidate;
  }

  if (containsAbsCarrier(node)) {
    return {
      method: 'unsupported',
      requiredPrerequisites: ['branch-analysis', 'domain-safety'],
      blockedPrerequisites: ['branch-analysis'],
      verificationStatus: 'not-attempted',
      controlledFailureClass: 'unsupported-family',
      readinessNotes: [
        'Absolute-value and branch-heavy substitutions remain out of stable integration scope.',
      ],
      domainHazards,
    };
  }

  if (hasUnsupportedCompositionWithoutDerivativeFactor(node, variable)) {
    return {
      method: 'unsupported',
      requiredPrerequisites: ['derivative-backcheck'],
      blockedPrerequisites: [],
      verificationStatus: 'not-attempted',
      controlledFailureClass: 'missing-derivative-factor',
      readinessNotes: [
        'The expression resembles a composition form, but no bounded derivative factor matched the current substitution rule.',
      ],
      domainHazards,
    };
  }

  return {
    method: 'unsupported',
    requiredPrerequisites: [],
    blockedPrerequisites: ['risch-liouville'],
    verificationStatus: 'not-attempted',
    controlledFailureClass: 'unsupported-family',
    readinessNotes: [
      'No shipped bounded symbolic integration family accepted this expression.',
      'Broad Risch/Liouville-style integration remains deferred.',
    ],
    domainHazards,
  };
}
