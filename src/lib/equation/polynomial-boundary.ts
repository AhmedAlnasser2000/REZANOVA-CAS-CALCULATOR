import { ComputeEngine } from '@cortex-js/compute-engine';
import type {
  CanonicalMathValueV2,
  LinearAlgebraScalarDomain,
  LinearAlgebraScalarWireV1,
  SerializableMathJson,
} from '../../types/calculator';
import { solveBoundedPolynomialEquationAst } from '../algebra/polynomial-factor-solve';
import { isReservedNamedVariableName } from '../algebra/named-variable';
import { linearAlgebraScalarWireIntegrityError } from '../linear-algebra/scalar-wire';
import {
  symbolicScalarAdd,
  symbolicScalarDivide,
  symbolicScalarFromMathJson,
  symbolicScalarMultiply,
  symbolicScalarNegate,
  symbolicScalarSqrt,
  symbolicScalarSubtract,
  symbolicScalarZeroStatus,
} from '../linear-algebra/symbolic-scalar-core';

export type SymbolIdentifier = string;

export type ProvenRoot = {
  value: CanonicalMathValueV2;
  multiplicity: 1 | 2 | 3 | 4;
};

export type BoundedPolynomialStopReason =
  | 'invalid-request'
  | 'invalid-target'
  | 'invalid-coefficient'
  | 'degree-limit'
  | 'parameter-limit'
  | 'opaque-coefficient'
  | 'zero-leading-coefficient'
  | 'bounded-solver-stop';

/** Coefficients are ordered from the highest degree term through the constant term. */
export type EquationPolynomialRequestV1 = {
  version: 1;
  target: SymbolIdentifier;
  domain: LinearAlgebraScalarDomain;
  coefficients: LinearAlgebraScalarWireV1[];
};

export type EquationPolynomialResultV1 =
  | { kind: 'proved'; roots: ProvenRoot[]; conditions: CanonicalMathValueV2[] }
  | { kind: 'partial'; roots: ProvenRoot[]; unresolvedFactor: CanonicalMathValueV2 }
  | { kind: 'unsupported'; reason: BoundedPolynomialStopReason };

const ce = new ComputeEngine();
const MAX_DEGREE = 4;
const MAX_PARAMETERS = 6;
const RESERVED_SYMBOLS = new Set([
  'False', 'ImaginaryUnit', 'Infinity', 'NaN', 'Nothing', 'Pi', 'True',
]);
const TARGET_PATTERN = /^(?:[A-Za-z][A-Za-z0-9_]*|[\u0370-\u03ff][A-Za-z0-9_]*)$/u;
const ALGEBRAIC_COEFFICIENT_OPERATORS = new Set([
  'Add',
  'Complex',
  'Conjugate',
  'Divide',
  'Multiply',
  'Negate',
  'Power',
  'Rational',
  'Root',
  'Sqrt',
  'Subtract',
]);

function scalar(node: unknown, domain: LinearAlgebraScalarDomain) {
  const parsed = symbolicScalarFromMathJson(node, domain);
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.value;
}

function canonicalValue(node: unknown): CanonicalMathValueV2 {
  const boxed = ce.box(node as never, { form: 'structural' });
  return {
    canonicalLatex: boxed.latex,
    mathJson: structuredClone(boxed.json) as SerializableMathJson,
  };
}

function rootValue(value: LinearAlgebraScalarWireV1): CanonicalMathValueV2 {
  return {
    canonicalLatex: value.canonicalLatex,
    mathJson: structuredClone(value.mathJson),
  };
}

function coefficientCondition(
  coefficient: LinearAlgebraScalarWireV1,
  relation: 'NotEqual' | 'Greater',
): CanonicalMathValueV2 {
  return canonicalValue([relation, coefficient.mathJson, 0]);
}

function polynomialNode(
  coefficients: readonly LinearAlgebraScalarWireV1[],
  target: SymbolIdentifier,
) {
  const degree = coefficients.length - 1;
  const terms = coefficients.map((coefficient, index) => {
    const exponent = degree - index;
    if (exponent === 0) return coefficient.mathJson;
    const power = exponent === 1 ? target : ['Power', target, exponent];
    return symbolicScalarZeroStatus(coefficient) === 'zero'
      ? 0
      : ['Multiply', coefficient.mathJson, power];
  }).filter((term) => term !== 0);
  return terms.length === 0 ? 0 : terms.length === 1 ? terms[0] : ['Add', ...terms];
}

function containsOpaqueFunction(node: unknown): boolean {
  if (!Array.isArray(node)) return false;
  const operator = node[0];
  return typeof operator !== 'string'
    || !ALGEBRAIC_COEFFICIENT_OPERATORS.has(operator)
    || node.slice(1).some(containsOpaqueFunction);
}

function collectSymbols(node: unknown, symbols: Set<string>, operatorPosition = false) {
  if (typeof node === 'string') {
    if (!operatorPosition && !RESERVED_SYMBOLS.has(node)) symbols.add(node);
    return;
  }
  if (!Array.isArray(node)) return;
  node.forEach((child, index) => collectSymbols(child, symbols, index === 0));
}

function evaluatePolynomial(
  coefficients: readonly LinearAlgebraScalarWireV1[],
  value: LinearAlgebraScalarWireV1,
  domain: LinearAlgebraScalarDomain,
) {
  return coefficients.slice(1).reduce(
    (total, coefficient) => symbolicScalarAdd(
      symbolicScalarMultiply(total, value, domain),
      coefficient,
      domain,
    ),
    coefficients[0],
  );
}

function syntheticDivide(
  coefficients: readonly LinearAlgebraScalarWireV1[],
  root: LinearAlgebraScalarWireV1,
  domain: LinearAlgebraScalarDomain,
) {
  const quotient = [coefficients[0]];
  for (let index = 1; index < coefficients.length - 1; index += 1) {
    quotient.push(symbolicScalarAdd(
      coefficients[index],
      symbolicScalarMultiply(quotient[index - 1], root, domain),
      domain,
    ));
  }
  return quotient;
}

function extractCandidateRoots(
  coefficients: LinearAlgebraScalarWireV1[],
  candidates: readonly LinearAlgebraScalarWireV1[],
  domain: LinearAlgebraScalarDomain,
) {
  let remaining = coefficients;
  const roots: ProvenRoot[] = [];
  for (const candidate of candidates) {
    let multiplicity = 0;
    while (
      remaining.length > 1
      && symbolicScalarZeroStatus(evaluatePolynomial(remaining, candidate, domain)) === 'zero'
    ) {
      remaining = syntheticDivide(remaining, candidate, domain);
      multiplicity += 1;
    }
    if (multiplicity > 0) {
      roots.push({
        value: rootValue(candidate),
        multiplicity: multiplicity as 1 | 2 | 3 | 4,
      });
    }
  }
  return { roots, remaining };
}

function linearRoots(
  coefficients: readonly LinearAlgebraScalarWireV1[],
  domain: LinearAlgebraScalarDomain,
) {
  const [leading, constant] = coefficients;
  const conditions = symbolicScalarZeroStatus(leading) === 'unknown'
    ? [coefficientCondition(leading, 'NotEqual')]
    : [];
  const root = symbolicScalarDivide(symbolicScalarNegate(constant, domain), leading, domain);
  return { roots: [{ value: rootValue(root), multiplicity: 1 as const }], conditions };
}

function quadraticRoots(
  coefficients: readonly LinearAlgebraScalarWireV1[],
  domain: LinearAlgebraScalarDomain,
) {
  const [a, b, c] = coefficients;
  const four = scalar(4, domain);
  const two = scalar(2, domain);
  const discriminant = symbolicScalarSubtract(
    symbolicScalarMultiply(b, b, domain),
    symbolicScalarMultiply(four, symbolicScalarMultiply(a, c, domain), domain),
    domain,
  );
  const leadingConditions = symbolicScalarZeroStatus(a) === 'unknown'
    ? [coefficientCondition(a, 'NotEqual')]
    : [];
  const exact = discriminant.exactComplexRational;
  if (domain === 'real' && exact && exact.im.numerator === 0 && exact.re.numerator < 0) {
    return { roots: [] as ProvenRoot[], conditions: leadingConditions };
  }
  const discriminantStatus = symbolicScalarZeroStatus(discriminant);
  const conditions = discriminantStatus === 'unknown'
    ? [
        ...leadingConditions,
        coefficientCondition(discriminant, domain === 'real' ? 'Greater' : 'NotEqual'),
      ]
    : leadingConditions;
  const squareRoot = symbolicScalarSqrt(discriminant, domain);
  const denominator = symbolicScalarMultiply(two, a, domain);
  const negativeB = symbolicScalarNegate(b, domain);
  const left = symbolicScalarDivide(
    symbolicScalarSubtract(negativeB, squareRoot, domain),
    denominator,
    domain,
  );
  if (discriminantStatus === 'zero') {
    return { roots: [{ value: rootValue(left), multiplicity: 2 as const }], conditions };
  }
  const right = symbolicScalarDivide(
    symbolicScalarAdd(negativeB, squareRoot, domain),
    denominator,
    domain,
  );
  return {
    roots: [
      { value: rootValue(left), multiplicity: 1 as const },
      { value: rootValue(right), multiplicity: 1 as const },
    ],
    conditions,
  };
}

function exactFactorCandidates(request: EquationPolynomialRequestV1) {
  if (!request.coefficients.every((coefficient) => coefficient.exactRational)) return [];
  const equation = ['Equal', polynomialNode(request.coefficients, request.target), 0];
  const solved = solveBoundedPolynomialEquationAst(equation, request.target, { maxDegree: MAX_DEGREE });
  if (!solved) return [];
  return solved.exactSolutionBranches.flatMap((branch) => {
    const parsed = symbolicScalarFromMathJson(branch.node ?? branch.numeric, request.domain);
    return parsed.ok ? [parsed.value] : [];
  });
}

function parameterCandidates(request: EquationPolynomialRequestV1, symbols: readonly string[]) {
  return symbols.flatMap((symbol) => {
    const parsed = symbolicScalarFromMathJson(symbol, request.domain);
    return parsed.ok ? [parsed.value] : [];
  });
}

export function solveEquationPolynomialBoundary(
  request: EquationPolynomialRequestV1,
): EquationPolynomialResultV1 {
  if (request.version !== 1 || !Array.isArray(request.coefficients)) {
    return { kind: 'unsupported', reason: 'invalid-request' };
  }
  if (
    !TARGET_PATTERN.test(request.target)
    || RESERVED_SYMBOLS.has(request.target)
    || isReservedNamedVariableName(request.target)
  ) {
    return { kind: 'unsupported', reason: 'invalid-target' };
  }
  const degree = request.coefficients.length - 1;
  if (degree < 1 || degree > MAX_DEGREE) {
    return { kind: 'unsupported', reason: 'degree-limit' };
  }
  if (request.coefficients.some((coefficient) => linearAlgebraScalarWireIntegrityError(coefficient))) {
    return { kind: 'unsupported', reason: 'invalid-coefficient' };
  }
  if (request.coefficients.some((coefficient) => containsOpaqueFunction(coefficient.mathJson))) {
    return { kind: 'unsupported', reason: 'opaque-coefficient' };
  }
  if (symbolicScalarZeroStatus(request.coefficients[0]) === 'zero') {
    return { kind: 'unsupported', reason: 'zero-leading-coefficient' };
  }

  const symbols = new Set<string>();
  request.coefficients.forEach((coefficient) => collectSymbols(coefficient.mathJson, symbols));
  if (symbols.has(request.target)) {
    return { kind: 'unsupported', reason: 'invalid-coefficient' };
  }
  symbols.delete(request.target);
  if (symbols.size > MAX_PARAMETERS) {
    return { kind: 'unsupported', reason: 'parameter-limit' };
  }

  try {
    if (degree === 1) {
      const result = linearRoots(request.coefficients, request.domain);
      return { kind: 'proved', ...result };
    }
    if (degree === 2) {
      const result = quadraticRoots(request.coefficients, request.domain);
      return { kind: 'proved', ...result };
    }

    const candidates = [
      ...parameterCandidates(request, [...symbols]),
      ...exactFactorCandidates(request),
    ];
    const extracted = extractCandidateRoots(
      [...request.coefficients],
      candidates,
      request.domain,
    );
    const remainingDegree = extracted.remaining.length - 1;
    if (remainingDegree === 0) {
      const conditions = symbolicScalarZeroStatus(request.coefficients[0]) === 'unknown'
        ? [coefficientCondition(request.coefficients[0], 'NotEqual')]
        : [];
      return { kind: 'proved', roots: extracted.roots, conditions };
    }
    if (remainingDegree <= 2) {
      const tail = remainingDegree === 1
        ? linearRoots(extracted.remaining, request.domain)
        : quadraticRoots(extracted.remaining, request.domain);
      return {
        kind: 'proved',
        roots: [...extracted.roots, ...tail.roots],
        conditions: tail.conditions,
      };
    }
    return {
      kind: 'partial',
      roots: extracted.roots,
      unresolvedFactor: canonicalValue(polynomialNode(extracted.remaining, request.target)),
    };
  } catch {
    return { kind: 'unsupported', reason: 'bounded-solver-stop' };
  }
}
