import { readExactScalarNode } from '../../../algebra/polynomial-core';
import {
  mergeSymbolicCoefficientFacts,
  symbolicCoefficientFact,
  type SymbolicCoefficientFact,
} from '../../primitives/coefficient-domain';
import { parseSymbolicPolynomial } from '../../primitives/symbolic-polynomial';
import { normalizeAst } from '../../normalize';
import { boxLatex, dependsOnVariable, isNodeArray } from '../../patterns';
import { normalizeCertificateProofNode } from './proof-diff';

export type TranscendentalCertificateTowerStopReason =
  | 'branch-sensitive'
  | 'inexact-coefficient'
  | 'malformed'
  | 'nested-transcendental-tower'
  | 'no-supported-certificate-family'
  | 'non-polynomial-exponent'
  | 'polynomial-degree-over-certificate-scope'
  | 'selected-variable-dependent-coefficient'
  | 'unsupported-head';

export type TranscendentalCertificateRequiredFact = SymbolicCoefficientFact;

export type TranscendentalCertificateTowerReady = {
  kind: 'certificate-ready';
  variable: string;
  family: 'exponential-polynomial';
  certificateFamily: 'exp-quadratic';
  coefficientScope: 'exact-rational-target-free-symbolic';
  normalizedInput: unknown;
  exponentNode: unknown;
  exponentLatex: string;
  exponentDegree: 2;
  requiredFacts: TranscendentalCertificateRequiredFact[];
  fieldDescriptor: {
    base: 'target-free-coefficient-field';
    extension: 'e^q';
    selectedVariable: string;
    qLatex: string;
  };
};

export type TranscendentalCertificateTowerElementaryOwned = {
  kind: 'elementary-owned';
  variable: string;
  family: 'exponential-polynomial';
  owner:
    | 'constant-exponential'
    | 'tier1-affine-exponential';
  normalizedInput: unknown;
  exponentNode: unknown;
  exponentLatex: string;
  exponentDegree: 0 | 1;
};

export type TranscendentalCertificateTowerStop = {
  kind: 'stop';
  variable: string;
  reason: TranscendentalCertificateTowerStopReason;
  detail: string;
  normalizedInput?: unknown;
  detectedDegree?: number;
};

export type TranscendentalCertificateTowerProfile =
  | TranscendentalCertificateTowerReady
  | TranscendentalCertificateTowerElementaryOwned
  | TranscendentalCertificateTowerStop;

const CERTIFICATE_EXPONENT_DEGREE = 2;
const PROFILE_POLYNOMIAL_DEGREE_CAP = 8;

const BRANCH_SENSITIVE_HEADS = new Set(['Abs', 'AbsoluteValue']);
const NESTED_TOWER_HEADS = new Set([
  'Sin',
  'Cos',
  'Tan',
  'Cot',
  'Sec',
  'Csc',
  'Ln',
  'Log',
  'Sqrt',
]);
const UNSUPPORTED_SPECIAL_HEADS = new Set([
  'Erf',
  'Erfc',
  'Erfi',
  'Ei',
  'Si',
  'Ci',
  'FresnelS',
  'FresnelC',
]);

function stop(
  variable: string,
  reason: TranscendentalCertificateTowerStopReason,
  detail: string,
  normalizedInput?: unknown,
  detectedDegree?: number,
): TranscendentalCertificateTowerStop {
  return {
    kind: 'stop',
    variable,
    reason,
    detail,
    normalizedInput,
    detectedDegree,
  };
}

function containsInexactNumber(node: unknown): boolean {
  if (typeof node === 'number') {
    return Number.isFinite(node) && !Number.isInteger(node);
  }

  return isNodeArray(node) && node.slice(1).some(containsInexactNumber);
}

function findHead(node: unknown, heads: Set<string>): string | undefined {
  if (!isNodeArray(node) || typeof node[0] !== 'string') {
    return undefined;
  }

  if (heads.has(node[0])) {
    return node[0];
  }

  for (const child of node.slice(1)) {
    const found = findHead(child, heads);
    if (found) {
      return found;
    }
  }

  return undefined;
}

function containsNestedTowerHead(node: unknown): boolean {
  if (!isNodeArray(node) || typeof node[0] !== 'string') {
    return false;
  }

  if (
    NESTED_TOWER_HEADS.has(node[0])
    || (node[0] === 'Power' && node.length === 3 && node[1] === 'ExponentialE')
  ) {
    return true;
  }

  return node.slice(1).some(containsNestedTowerHead);
}

function exponentialExponent(node: unknown) {
  if (
    isNodeArray(node)
    && node[0] === 'Power'
    && node.length === 3
    && node[1] === 'ExponentialE'
  ) {
    return node[2];
  }

  return undefined;
}

function normalizePolynomialNegates(node: unknown): unknown {
  if (!isNodeArray(node) || typeof node[0] !== 'string') {
    return node;
  }

  if (node[0] === 'Negate' && node.length === 2) {
    return ['Multiply', -1, normalizePolynomialNegates(node[1])];
  }

  return [node[0], ...node.slice(1).map(normalizePolynomialNegates)];
}

function factsForLeadingCoefficient(
  factSources: SymbolicCoefficientFact[],
  leadingNode: unknown,
  leadingLatex: string,
) {
  const scalar = readExactScalarNode(leadingNode);
  const leadingFacts = scalar && scalar.numerator !== 0
    ? []
    : [symbolicCoefficientFact(leadingLatex)];
  return mergeSymbolicCoefficientFacts([...factSources, ...leadingFacts]);
}

function mapPolynomialStopReason(
  reason: string,
  coefficientReason?: string,
): TranscendentalCertificateTowerStopReason {
  if (reason === 'coefficient-stop') {
    if (coefficientReason === 'inexact-coefficient') {
      return 'inexact-coefficient';
    }
    if (coefficientReason === 'selected-variable-dependent-coefficient') {
      return 'selected-variable-dependent-coefficient';
    }
    if (coefficientReason === 'branch-sensitive') {
      return 'branch-sensitive';
    }
    return 'non-polynomial-exponent';
  }
  if (reason === 'selected-variable-dependent-coefficient') {
    return 'selected-variable-dependent-coefficient';
  }
  if (reason === 'over-cap-degree') {
    return 'polynomial-degree-over-certificate-scope';
  }
  return 'non-polynomial-exponent';
}

export function profileTranscendentalCertificateTower(
  node: unknown,
  variable = 'x',
): TranscendentalCertificateTowerProfile {
  const normalizedInput = normalizeAst(normalizeCertificateProofNode(node));

  if (containsInexactNumber(normalizedInput)) {
    return stop(
      variable,
      'inexact-coefficient',
      'Transcendental certificate profiling rejects decimal or inexact numeric leaves.',
      normalizedInput,
    );
  }

  const branchHead = findHead(normalizedInput, BRANCH_SENSITIVE_HEADS);
  if (branchHead) {
    return stop(
      variable,
      'branch-sensitive',
      `Transcendental certificate profiling rejects branch-sensitive carrier ${branchHead}.`,
      normalizedInput,
    );
  }

  const specialHead = findHead(normalizedInput, UNSUPPORTED_SPECIAL_HEADS);
  if (specialHead) {
    return stop(
      variable,
      'unsupported-head',
      `Transcendental certificate profiling does not use special-function head ${specialHead}.`,
      normalizedInput,
    );
  }

  const exponent = exponentialExponent(normalizedInput);
  if (exponent === undefined) {
    return stop(
      variable,
      'no-supported-certificate-family',
      'The first certificate profile only recognizes pure exponential-polynomial integrands.',
      normalizedInput,
    );
  }

  if (containsNestedTowerHead(exponent)) {
    return stop(
      variable,
      'nested-transcendental-tower',
      'Nested transcendental towers are outside the first certificate profile.',
      normalizedInput,
    );
  }

  const parsed = parseSymbolicPolynomial(
    normalizePolynomialNegates(exponent),
    variable,
    PROFILE_POLYNOMIAL_DEGREE_CAP,
  );
  if (parsed.kind === 'stop') {
    return stop(
      variable,
      mapPolynomialStopReason(parsed.reason, parsed.coefficientReason),
      parsed.detail ?? `Exponent polynomial parsing stopped: ${parsed.reason}.`,
      normalizedInput,
    );
  }

  const { polynomial } = parsed;
  if (polynomial.degree > CERTIFICATE_EXPONENT_DEGREE) {
    return stop(
      variable,
      'polynomial-degree-over-certificate-scope',
      'Only quadratic exponential certificates are live in the first certificate family.',
      normalizedInput,
      polynomial.degree,
    );
  }

  const exponentLatex = boxLatex(exponent);
  if (polynomial.degree === 0 || !dependsOnVariable(exponent, variable)) {
    return {
      kind: 'elementary-owned',
      variable,
      family: 'exponential-polynomial',
      owner: 'constant-exponential',
      normalizedInput,
      exponentNode: exponent,
      exponentLatex,
      exponentDegree: 0,
    };
  }

  if (polynomial.degree === 1) {
    return {
      kind: 'elementary-owned',
      variable,
      family: 'exponential-polynomial',
      owner: 'tier1-affine-exponential',
      normalizedInput,
      exponentNode: exponent,
      exponentLatex,
      exponentDegree: 1,
    };
  }

  const leading = polynomial.coefficients[CERTIFICATE_EXPONENT_DEGREE];
  return {
    kind: 'certificate-ready',
    variable,
    family: 'exponential-polynomial',
    certificateFamily: 'exp-quadratic',
    coefficientScope: 'exact-rational-target-free-symbolic',
    normalizedInput,
    exponentNode: exponent,
    exponentLatex,
    exponentDegree: CERTIFICATE_EXPONENT_DEGREE,
    requiredFacts: factsForLeadingCoefficient(polynomial.facts, leading.node, leading.latex),
    fieldDescriptor: {
      base: 'target-free-coefficient-field',
      extension: 'e^q',
      selectedVariable: variable,
      qLatex: exponentLatex,
    },
  };
}
