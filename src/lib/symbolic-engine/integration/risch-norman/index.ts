import { normalizeExactScalar, readExactScalarNode } from '../../../algebra/polynomial-core';
import {
  boxLatex,
  dependsOnVariable,
  flattenAdd,
  flattenMultiply,
  isNodeArray,
} from '../../patterns';
import { parseSymbolicAffine } from '../symbolic-coefficients';
import { BY_PARTS_POLYNOMIAL_DEGREE_CAP } from '../types';

export type RischNormanExtensionFamily =
  | 'affine-exp'
  | 'positive-base-exp'
  | 'affine-sin-cos'
  | 'affine-log';

export type RischNormanStopReason =
  | 'branch-sensitive'
  | 'inexact-coefficient'
  | 'invalid-base'
  | 'mixed-transcendental-tower'
  | 'nested-transcendental-tower'
  | 'no-supported-extension'
  | 'non-affine-argument'
  | 'over-cap-degree'
  | 'selected-variable-dependent-coefficient'
  | 'unsupported-head';

export type RischNormanRequiredFact = {
  kind: 'nonzero' | 'positive' | 'nonunit';
  expressionLatex: string;
  relation: '\\ne0' | '>0' | '\\ne1';
};

export type RischNormanBasisDescriptor = {
  kind:
    | 'polynomial-times-extension'
    | 'polynomial-times-sin-cos-pair'
    | 'affine-log-prerequisite';
  polynomialDegree: number;
  span: string[];
  closure:
    | 'derivative-closed'
    | 'requires-rational-correction';
};

export type RischNormanProfileReady = {
  kind: 'ready';
  variable: string;
  family: RischNormanExtensionFamily;
  coefficientScope: 'exact-rational-target-free-symbolic';
  polynomialDegree: number;
  argumentLatex: string;
  requiredFacts: RischNormanRequiredFact[];
  basis: RischNormanBasisDescriptor[];
};

export type RischNormanProfileStop = {
  kind: 'stop';
  variable: string;
  reason: RischNormanStopReason;
  detail?: string;
};

export type RischNormanProfile = RischNormanProfileReady | RischNormanProfileStop;

type SignedNode = {
  node: unknown;
  sign: 1 | -1;
};

type SymbolicPolynomialProfile =
  | {
    kind: 'success';
    degree: number;
  }
  | {
    kind: 'stop';
    reason: Extract<
      RischNormanStopReason,
      'inexact-coefficient' | 'over-cap-degree' | 'selected-variable-dependent-coefficient'
    >;
  };

type ExtensionProfile =
  | {
    kind: 'success';
    family: RischNormanExtensionFamily;
    argumentLatex: string;
    requiredFacts: RischNormanRequiredFact[];
  }
  | {
    kind: 'stop';
    reason: Exclude<
      RischNormanStopReason,
      'branch-sensitive' | 'no-supported-extension' | 'over-cap-degree'
    >;
  }
  | {
    kind: 'none';
  };

const TRANSCENDENTAL_HEADS = new Set([
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

function stop(variable: string, reason: RischNormanStopReason, detail?: string): RischNormanProfileStop {
  return { kind: 'stop', variable, reason, detail };
}

function exactInteger(node: unknown) {
  const scalar = readExactScalarNode(node);
  return scalar && scalar.denominator === 1 ? scalar.numerator : undefined;
}

function containsApproximateNumber(node: unknown): boolean {
  if (typeof node === 'number') {
    return Number.isFinite(node) && !Number.isInteger(node);
  }

  return isNodeArray(node) && node.slice(1).some(containsApproximateNumber);
}

function hasBranchSensitiveCarrier(node: unknown): boolean {
  if (!isNodeArray(node)) {
    return false;
  }

  if (node[0] === 'Abs' || node[0] === 'AbsoluteValue') {
    return true;
  }

  return node.slice(1).some(hasBranchSensitiveCarrier);
}

function containsTranscendentalHead(node: unknown): boolean {
  if (!isNodeArray(node) || typeof node[0] !== 'string') {
    return false;
  }

  if (
    TRANSCENDENTAL_HEADS.has(node[0])
    || (node[0] === 'Power' && node.length === 3 && node[1] === 'ExponentialE')
  ) {
    return true;
  }

  return node.slice(1).some(containsTranscendentalHead);
}

function isTargetFree(node: unknown, variable: string) {
  return !dependsOnVariable(node, variable);
}

function fact(kind: RischNormanRequiredFact['kind'], expressionLatex: string): RischNormanRequiredFact {
  if (kind === 'positive') {
    return { kind, expressionLatex, relation: '>0' };
  }
  if (kind === 'nonunit') {
    return { kind, expressionLatex, relation: '\\ne1' };
  }
  return { kind, expressionLatex, relation: '\\ne0' };
}

function exactPositiveNonUnitBase(node: unknown) {
  const scalar = readExactScalarNode(node);
  if (!scalar) {
    return false;
  }

  const normalized = normalizeExactScalar(scalar);
  return normalized.denominator > 0
    && normalized.numerator > 0
    && normalized.numerator !== normalized.denominator;
}

function signedNode(node: unknown, sign: 1 | -1): unknown {
  if (sign === 1) {
    return node;
  }
  return isNodeArray(node) && node[0] === 'Negate' && node.length === 2
    ? node[1]
    : ['Negate', node];
}

function signedAddTerms(node: unknown, sign: 1 | -1 = 1): SignedNode[] {
  if (isNodeArray(node) && node[0] === 'Add') {
    return flattenAdd(node).flatMap((term) => signedAddTerms(term, sign));
  }

  if (isNodeArray(node) && node[0] === 'Subtract') {
    const [first, ...rest] = node.slice(1);
    return [
      ...(first === undefined ? [] : signedAddTerms(first, sign)),
      ...rest.flatMap((term) => signedAddTerms(term, sign === 1 ? -1 : 1)),
    ];
  }

  if (isNodeArray(node) && node[0] === 'Negate' && node.length === 2) {
    return signedAddTerms(node[1], sign === 1 ? -1 : 1);
  }

  return [{ node, sign }];
}

function variablePowerDegree(node: unknown, variable: string) {
  if (node === variable) {
    return 1;
  }

  if (
    isNodeArray(node)
    && node[0] === 'Power'
    && node.length === 3
    && node[1] === variable
  ) {
    const exponent = exactInteger(node[2]);
    return exponent !== undefined && exponent >= 0 ? exponent : undefined;
  }

  return undefined;
}

function termDegree(term: unknown, sign: 1 | -1, variable: string) {
  const node = signedNode(term, sign);
  if (isTargetFree(node, variable)) {
    return 0;
  }

  const factors = isNodeArray(node) && node[0] === 'Multiply'
    ? flattenMultiply(node)
    : [node];
  let degree = 0;
  let sawVariablePower = false;

  for (const factorNode of factors) {
    const nextDegree = variablePowerDegree(factorNode, variable);
    if (nextDegree !== undefined) {
      degree += nextDegree;
      sawVariablePower = true;
      continue;
    }

    if (!isTargetFree(factorNode, variable)) {
      return null;
    }
  }

  return sawVariablePower ? degree : null;
}

function profileSymbolicPolynomial(node: unknown, variable: string): SymbolicPolynomialProfile {
  if (containsApproximateNumber(node)) {
    return { kind: 'stop', reason: 'inexact-coefficient' };
  }

  let degree = 0;
  for (const term of signedAddTerms(node)) {
    const nextDegree = termDegree(term.node, term.sign, variable);
    if (nextDegree === null) {
      return { kind: 'stop', reason: 'selected-variable-dependent-coefficient' };
    }
    degree = Math.max(degree, nextDegree);
  }

  return degree > BY_PARTS_POLYNOMIAL_DEGREE_CAP
    ? { kind: 'stop', reason: 'over-cap-degree' }
    : { kind: 'success', degree };
}

function extensionProfile(node: unknown, variable: string): ExtensionProfile {
  if (!isNodeArray(node) || typeof node[0] !== 'string') {
    return { kind: 'none' };
  }

  const [head, ...children] = node;
  if (head === 'Sin' || head === 'Cos') {
    const argument = children[0];
    if (argument === undefined) {
      return { kind: 'stop', reason: 'unsupported-head' };
    }
    if (containsTranscendentalHead(argument)) {
      return { kind: 'stop', reason: 'nested-transcendental-tower' };
    }
    const affine = parseSymbolicAffine(argument, variable);
    return affine
      ? {
        kind: 'success',
        family: 'affine-sin-cos',
        argumentLatex: affine.latex,
        requiredFacts: [fact('nonzero', affine.slopeLatex)],
      }
      : { kind: 'stop', reason: 'non-affine-argument' };
  }

  if (head === 'Ln' || head === 'Log') {
    const argument = children[0];
    if (argument === undefined) {
      return { kind: 'stop', reason: 'unsupported-head' };
    }
    if (containsTranscendentalHead(argument)) {
      return { kind: 'stop', reason: 'nested-transcendental-tower' };
    }
    const affine = parseSymbolicAffine(argument, variable);
    return affine
      ? {
        kind: 'success',
        family: 'affine-log',
        argumentLatex: affine.latex,
        requiredFacts: [fact('nonzero', affine.slopeLatex)],
      }
      : { kind: 'stop', reason: 'non-affine-argument' };
  }

  if (head === 'Power' && node.length === 3) {
    const [base, exponent] = children;
    if (containsTranscendentalHead(exponent)) {
      return { kind: 'stop', reason: 'nested-transcendental-tower' };
    }

    const affine = parseSymbolicAffine(exponent, variable);
    if (!affine) {
      return dependsOnVariable(exponent, variable)
        ? { kind: 'stop', reason: 'non-affine-argument' }
        : { kind: 'none' };
    }

    if (base === 'ExponentialE') {
      return {
        kind: 'success',
        family: 'affine-exp',
        argumentLatex: affine.latex,
        requiredFacts: [fact('nonzero', affine.slopeLatex)],
      };
    }

    if (!isTargetFree(base, variable)) {
      return { kind: 'stop', reason: 'selected-variable-dependent-coefficient' };
    }

    if (readExactScalarNode(base) && !exactPositiveNonUnitBase(base)) {
      return { kind: 'stop', reason: 'invalid-base' };
    }

    const baseLatex = boxLatex(base);
    return {
      kind: 'success',
      family: 'positive-base-exp',
      argumentLatex: affine.latex,
      requiredFacts: [
        fact('nonzero', affine.slopeLatex),
        fact('positive', baseLatex),
        fact('nonunit', baseLatex),
      ],
    };
  }

  if (head === 'Sqrt') {
    return { kind: 'none' };
  }

  if (TRANSCENDENTAL_HEADS.has(head)) {
    return { kind: 'stop', reason: 'unsupported-head' };
  }

  return { kind: 'none' };
}

function splitCandidate(node: unknown, variable: string) {
  const factors = isNodeArray(node) && node[0] === 'Multiply'
    ? flattenMultiply(node)
    : [node];
  const polynomialFactors: unknown[] = [];
  const extensions: Extract<ExtensionProfile, { kind: 'success' }>[] = [];

  for (const factorNode of factors) {
    const extension = extensionProfile(factorNode, variable);
    if (extension.kind === 'stop') {
      return extension;
    }
    if (extension.kind === 'success') {
      extensions.push(extension);
      continue;
    }
    polynomialFactors.push(factorNode);
  }

  if (extensions.length === 0) {
    return { kind: 'stop' as const, reason: 'no-supported-extension' as const };
  }
  if (extensions.length > 1) {
    return { kind: 'stop' as const, reason: 'mixed-transcendental-tower' as const };
  }

  const polynomial = polynomialFactors.length === 0
    ? profileSymbolicPolynomial(1, variable)
    : profileSymbolicPolynomial(
      polynomialFactors.length === 1
        ? polynomialFactors[0]
        : ['Multiply', ...polynomialFactors],
      variable,
    );
  if (polynomial.kind === 'stop') {
    return polynomial;
  }

  return {
    kind: 'success' as const,
    extension: extensions[0],
    polynomialDegree: polynomial.degree,
  };
}

function basisFor(
  family: RischNormanExtensionFamily,
  polynomialDegree: number,
): RischNormanBasisDescriptor {
  if (family === 'affine-sin-cos') {
    return {
      kind: 'polynomial-times-sin-cos-pair',
      polynomialDegree,
      span: ['P(v)sin(u)', 'Q(v)cos(u)'],
      closure: 'derivative-closed',
    };
  }

  if (family === 'affine-log') {
    return {
      kind: 'affine-log-prerequisite',
      polynomialDegree,
      span: ['P(v)log(u)', 'rational correction over u'],
      closure: 'requires-rational-correction',
    };
  }

  return {
    kind: 'polynomial-times-extension',
    polynomialDegree,
    span: ['P(v)extension(u)'],
    closure: 'derivative-closed',
  };
}

export function profileRischNormanCandidate(
  node: unknown,
  variable = 'x',
): RischNormanProfile {
  if (containsApproximateNumber(node)) {
    return stop(variable, 'inexact-coefficient');
  }

  if (hasBranchSensitiveCarrier(node)) {
    return stop(variable, 'branch-sensitive');
  }

  const candidate = splitCandidate(node, variable);
  if (candidate.kind === 'stop') {
    return stop(variable, candidate.reason);
  }

  const { extension, polynomialDegree } = candidate;
  if (!extension) {
    return stop(variable, 'no-supported-extension');
  }

  return {
    kind: 'ready',
    variable,
    family: extension.family,
    coefficientScope: 'exact-rational-target-free-symbolic',
    polynomialDegree,
    argumentLatex: extension.argumentLatex,
    requiredFacts: extension.requiredFacts,
    basis: [basisFor(extension.family, polynomialDegree)],
  };
}
