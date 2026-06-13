import {
  buildExactPolynomialFromCoefficients,
  buildExactScalarNode,
  exactPolynomialDegree,
  exactPolynomialToNode,
  exactScalarIsZero,
  getExactPolynomialCoefficient,
  multiplyExactScalars,
  negateExactScalar,
  quadraticDiscriminant,
  type ExactPolynomial,
} from '../polynomial-core';
import {
  isExactInteger,
  nodeLatex,
  numericValueForNode,
  simplifyNode,
} from './math-json';
import { allDivisors, clearPolynomialDenominators, positiveDivisors } from './rational-root';
import { ROOT_TOLERANCE, type BoundedPolynomialFactor, type QuadraticExactRoots } from './types';

function buildQuadraticFactorNode(variable: string, rootNode: unknown) {
  if (rootNode === 0) {
    return ['Power', variable, 2];
  }
  return ['Add', ['Power', variable, 2], ['Negate', rootNode]];
}

export function quadraticRootNodes(polynomial: ExactPolynomial): QuadraticExactRoots {
  if (exactPolynomialDegree(polynomial) !== 2) {
    return { kind: 'complex' };
  }

  const a = getExactPolynomialCoefficient(polynomial, 2);
  const b = getExactPolynomialCoefficient(polynomial, 1);
  const discriminant = quadraticDiscriminant(polynomial);
  if (!discriminant) {
    return { kind: 'complex' };
  }

  const discriminantNode = buildExactScalarNode(discriminant);
  const discriminantValue = numericValueForNode(discriminantNode);
  if (discriminantValue === null || discriminantValue < -ROOT_TOLERANCE) {
    return { kind: 'complex' };
  }

  const minusBNode = buildExactScalarNode(negateExactScalar(b));
  const twoANode = buildExactScalarNode(multiplyExactScalars(a, { numerator: 2, denominator: 1 }));
  const sqrtNode = simplifyNode(['Sqrt', discriminantNode]);

  if (Math.abs(discriminantValue) <= ROOT_TOLERANCE) {
    const node = simplifyNode(['Divide', minusBNode, twoANode]);
    const numeric = numericValueForNode(node);
    if (numeric === null) {
      return { kind: 'complex' };
    }
    return {
      kind: 'real',
      roots: [{ node, latex: nodeLatex(node), numeric }],
    };
  }

  const positive = simplifyNode(['Divide', ['Add', minusBNode, sqrtNode], twoANode]);
  const negative = simplifyNode(['Divide', ['Add', minusBNode, ['Negate', sqrtNode]], twoANode]);
  const positiveNumeric = numericValueForNode(positive);
  const negativeNumeric = numericValueForNode(negative);
  if (positiveNumeric === null || negativeNumeric === null) {
    return { kind: 'complex' };
  }

  return {
    kind: 'real',
    roots: [
      { node: positive, latex: nodeLatex(positive), numeric: positiveNumeric },
      { node: negative, latex: nodeLatex(negative), numeric: negativeNumeric },
    ],
  };
}

export function biquadraticFactorization(
  polynomial: ExactPolynomial,
) {
  if (exactPolynomialDegree(polynomial) !== 4) {
    return null;
  }

  const x3 = getExactPolynomialCoefficient(polynomial, 3);
  const x1 = getExactPolynomialCoefficient(polynomial, 1);
  if (!exactScalarIsZero(x3) || !exactScalarIsZero(x1)) {
    return null;
  }

  const yPolynomial = buildExactPolynomialFromCoefficients(polynomial.variable, [
    getExactPolynomialCoefficient(polynomial, 4),
    getExactPolynomialCoefficient(polynomial, 2),
    getExactPolynomialCoefficient(polynomial, 0),
  ]);
  const roots = quadraticRootNodes(yPolynomial);
  if (roots.kind !== 'real') {
    return null;
  }

  const leading = getExactPolynomialCoefficient(polynomial, 4);
  const factors = roots.roots.map((root) => {
    const factorNode = simplifyNode(buildQuadraticFactorNode(polynomial.variable, root.node));
    return {
      node: factorNode,
      latex: nodeLatex(factorNode),
      multiplicity: roots.roots.length === 1 ? 2 : 1,
      degree: 2,
    } satisfies BoundedPolynomialFactor;
  });

  return {
    scalar: leading,
    factors,
    strategy: 'biquadratic' as const,
  };
}

function integerQuadraticRoots(a: number, b: number, c: number) {
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) {
    return [] as number[];
  }
  const root = Math.sqrt(discriminant);
  if (!Number.isInteger(root)) {
    return [] as number[];
  }

  const denominator = 2 * a;
  const first = (-b + root) / denominator;
  const second = (-b - root) / denominator;
  const result: number[] = [];
  if (Number.isInteger(first)) {
    result.push(first);
  }
  if (Number.isInteger(second) && second !== first) {
    result.push(second);
  }
  return result;
}

export function quarticFactorIntoQuadratics(
  polynomial: ExactPolynomial,
) {
  if (exactPolynomialDegree(polynomial) !== 4) {
    return null;
  }

  const primitive = clearPolynomialDenominators(polynomial);
  if (!primitive) {
    return null;
  }

  const a = getExactPolynomialCoefficient(primitive.polynomial, 4).numerator;
  const b = getExactPolynomialCoefficient(primitive.polynomial, 3).numerator;
  const c = getExactPolynomialCoefficient(primitive.polynomial, 2).numerator;
  const d = getExactPolynomialCoefficient(primitive.polynomial, 1).numerator;
  const e = getExactPolynomialCoefficient(primitive.polynomial, 0).numerator;

  if (![a, b, c, d, e].every(isExactInteger)) {
    return null;
  }

  const positiveLeadingDivisors = positiveDivisors(a);
  const constantDivisors = allDivisors(e);

  for (const p of positiveLeadingDivisors) {
    if (p === 0 || a % p !== 0) {
      continue;
    }
    const q = a / p;

    for (const m of constantDivisors) {
      if (m === 0 || e % m !== 0) {
        continue;
      }
      const n = e / m;
      const determinant = q * m - p * n;

      const candidatePairs: Array<{ u: number; v: number }> = [];

      if (determinant !== 0) {
        const uNumerator = b * m - p * d;
        const vNumerator = q * d - b * n;
        if (uNumerator % determinant !== 0 || vNumerator % determinant !== 0) {
          continue;
        }
        candidatePairs.push({
          u: uNumerator / determinant,
          v: vNumerator / determinant,
        });
      } else {
        const uRoots = integerQuadraticRoots(
          q,
          -b,
          p * (c - p * n - q * m),
        );
        for (const u of uRoots) {
          const vNumerator = b - q * u;
          if (vNumerator % p !== 0) {
            continue;
          }
          candidatePairs.push({
            u,
            v: vNumerator / p,
          });
        }
      }

      for (const { u, v } of candidatePairs) {
        if (p * n + u * v + q * m !== c) {
          continue;
        }
        if (u * n + v * m !== d) {
          continue;
        }

        const first = simplifyNode(exactPolynomialToNode(buildExactPolynomialFromCoefficients(polynomial.variable, [
          { numerator: p, denominator: 1 },
          { numerator: u, denominator: 1 },
          { numerator: m, denominator: 1 },
        ])));
        const second = simplifyNode(exactPolynomialToNode(buildExactPolynomialFromCoefficients(polynomial.variable, [
          { numerator: q, denominator: 1 },
          { numerator: v, denominator: 1 },
          { numerator: n, denominator: 1 },
        ])));

        return {
          scalar: primitive.scalar,
          factors: [
            {
              node: first,
              latex: nodeLatex(first),
              multiplicity: 1,
              degree: 2,
            },
            {
              node: second,
              latex: nodeLatex(second),
              multiplicity: 1,
              degree: 2,
            },
          ] satisfies BoundedPolynomialFactor[],
          strategy: 'quadratic-pair' as const,
        };
      }
    }
  }

  return null;
}

