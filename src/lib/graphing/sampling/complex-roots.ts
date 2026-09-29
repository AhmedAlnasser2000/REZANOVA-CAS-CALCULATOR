import {
  findComplexNewtonCandidates,
  type ComplexNumericEvaluator,
} from '../../equation/complex-domain-public';
import { complex, complexAbs, complexAdd, complexDiv, complexMul, complexSub, type ComplexValue } from '../../numeric/complex';
import type { GraphExpressionIR, GraphViewportV1 } from '../contracts';
import { compileGraphComplexPlan } from '../evaluator/complex-plan';
import {
  deflateExact, exactGraphPolynomial, G0, gDiv, gIsZero, gNeg, gToComplex, qIsZero, qMul, qSub, qToNumber, qAdd, qDiv,
  rational, Q0, Q1, type GraphExactPolynomial, type GraphGaussian, type GraphRational,
} from './complex-polynomial';

// The solutions of an equation in z alone. Polynomials get all n roots
// (counted with multiplicity): exact where the polynomial splits exactly
// (written factors, rational and small Gaussian roots, quadratics, z^n = c),
// validated numbers otherwise. Other equations get the roots Newton finds in
// the visible region, marked as not a complete list. Worker sampling (root
// points) and the Complex pane (hover labels) call the same solver.

export type GraphComplexRoot = {
  re: number;
  im: number;
  /** Proved exactly; `label` then shows the exact value when it has a short form. */
  exact: boolean;
  label: string | null;
  multiplicity: number;
};

export type GraphComplexRootsSolution = {
  roots: GraphComplexRoot[];
  /** True for polynomials: these are all the roots, not just those in view. */
  complete: boolean;
  degree: number | null;
};

const MINUS = '−';

function formatRational(value: GraphRational) {
  const sign = value.n < 0n ? MINUS : '';
  const n = value.n < 0n ? -value.n : value.n;
  return value.d === 1n ? `${sign}${n}` : `${sign}${n}/${value.d}`;
}

function formatImaginary(value: GraphRational) {
  const sign = value.n < 0n ? MINUS : '';
  const n = value.n < 0n ? -value.n : value.n;
  const numerator = n === 1n ? 'i' : `${n}i`;
  return `${sign}${value.d === 1n ? numerator : `${numerator}/${value.d}`}`;
}

function formatGaussian(value: GraphGaussian) {
  if (qIsZero(value.im)) return formatRational(value.re);
  if (qIsZero(value.re)) return formatImaginary(value.im);
  const imaginary = formatImaginary(value.im);
  return `${formatRational(value.re)} ${imaginary.startsWith(MINUS) ? MINUS : '+'} ${imaginary.replace(MINUS, '')}`;
}

function exactRoot(value: GraphGaussian, label = formatGaussian(value)): GraphComplexRoot {
  const point = gToComplex(value);
  return { re: point.re, im: point.im, exact: true, label, multiplicity: 1 };
}

/** k and m with n = k^2 m, m squarefree; null when n is too large to factor quickly. */
function squareFree(n: bigint): { k: bigint; m: bigint } | null {
  if (n > 10n ** 12n) return null;
  let k = 1n; let m = n;
  for (let factor = 2n; factor * factor <= m; factor += 1n) {
    while (m % (factor * factor) === 0n) { m /= factor * factor; k *= factor; }
  }
  return { k, m };
}

function isRealPolynomial(poly: GraphExactPolynomial) {
  return poly.every((coefficient) => qIsZero(coefficient.im));
}

/** Divisors of |n| (n not zero), when few enough to try. */
function divisors(n: bigint): bigint[] | null {
  const value = n < 0n ? -n : n;
  if (value > 10n ** 7n) return null;
  const out: bigint[] = [];
  for (let d = 1n; d * d <= value; d += 1n) if (value % d === 0n) { out.push(d); if (d * d !== value) out.push(value / d); }
  return out;
}

/** Rational candidates p/q (p | a0, q | an) for a real polynomial, plus small Gaussian integers. */
function rootCandidates(poly: GraphExactPolynomial): GraphGaussian[] {
  const candidates: GraphGaussian[] = [];
  for (let re = -3; re <= 3; re += 1) {
    for (let im = -3; im <= 3; im += 1) {
      if (re !== 0 || im !== 0) candidates.push({ re: rational(BigInt(re)), im: rational(BigInt(im)) });
    }
  }
  if (!isRealPolynomial(poly)) return candidates;
  const scale = poly.reduce((lcm, coefficient) => {
    const d = coefficient.re.d; let a = lcm; let b = d; while (b) [a, b] = [b, a % b];
    return (lcm * d) / a;
  }, 1n);
  const integers = poly.map((coefficient) => (coefficient.re.n * scale) / coefficient.re.d);
  const constantDivisors = divisors(integers[0]!);
  const leadingDivisors = divisors(integers[integers.length - 1]!);
  if (!constantDivisors || !leadingDivisors) return candidates;
  for (const p of constantDivisors) {
    for (const q of leadingDivisors) {
      for (const sign of [1n, -1n]) candidates.push({ re: rational(sign * p, q), im: Q0 });
    }
  }
  return candidates;
}

/** Roots of a z^n = c (n >= 1) with c real or purely imaginary, exactly in polar form. */
function binomialRoots(n: number, c: GraphGaussian): GraphComplexRoot[] | null {
  let magnitude: GraphRational; let turns: GraphRational; // angle of c as a multiple of pi
  if (qIsZero(c.im)) { magnitude = c.re.n < 0n ? qSub(Q0, c.re) : c.re; turns = c.re.n < 0n ? Q1 : Q0; }
  else if (qIsZero(c.re)) { magnitude = c.im.n < 0n ? qSub(Q0, c.im) : c.im; turns = rational(c.im.n < 0n ? -1n : 1n, 2n); }
  else return null;
  const radius = Math.pow(qToNumber(magnitude), 1 / n);
  const nthRoot = (value: bigint) => { const root = BigInt(Math.round(Math.pow(Number(value), 1 / n))); return root ** BigInt(n) === value ? root : null; };
  const numeratorRoot = nthRoot(magnitude.n); const denominatorRoot = nthRoot(magnitude.d);
  const magnitudeText = numeratorRoot !== null && denominatorRoot !== null
    ? formatRational(rational(numeratorRoot, denominatorRoot)) : `(${formatRational(magnitude)})^(1/${n})`;
  return Array.from({ length: n }, (_, k) => {
    let angle = qDiv(qAdd(turns, rational(2n * BigInt(k))), rational(BigInt(n)));
    while (qToNumber(angle) > 1) angle = qSub(angle, rational(2n));
    while (qToNumber(angle) <= -1) angle = qAdd(angle, rational(2n));
    const theta = qToNumber(angle) * Math.PI;
    const exponential = qIsZero(angle) ? '' : angle.n === 1n && angle.d === 1n ? 'neg'
      : `e^(${angle.n === 1n ? '' : angle.n === -1n ? MINUS : formatRational(rational(angle.n))}πi${angle.d === 1n ? '' : `/${angle.d}`})`;
    const quarter = angle.d === 2n ? (angle.n === 1n ? '' : MINUS) : null;
    const label = exponential === '' ? magnitudeText : exponential === 'neg' ? `${MINUS}${magnitudeText}`
      : quarter !== null ? `${quarter}${magnitudeText === '1' ? '' : magnitudeText}i`
        : magnitudeText === '1' ? exponential : `${magnitudeText}·${exponential}`;
    return { re: radius * Math.cos(theta), im: radius * Math.sin(theta), exact: true, label, multiplicity: 1 };
  });
}

/** Both roots of a quadratic with real rational coefficients, as p ± q√m or p ± q√m·i. */
function quadraticRoots(poly: GraphExactPolynomial): GraphComplexRoot[] | null {
  if (poly.length !== 3 || !isRealPolynomial(poly)) return null;
  const [c, b, a] = poly.map((coefficient) => coefficient.re) as [GraphRational, GraphRational, GraphRational];
  const twoA = qMul(rational(2n), a);
  const center = qDiv(qSub(Q0, b), twoA);
  const discriminant = qSub(qMul(b, b), qMul(rational(4n), qMul(a, c)));
  const negative = discriminant.n < 0n;
  const radicand = negative ? -discriminant.n * discriminant.d : discriminant.n * discriminant.d;
  const split = squareFree(radicand);
  if (!split) return null;
  // sqrt(D) / 2a = k sqrt(m) / (den * 2a)
  const scale = qDiv(rational(split.k, discriminant.d), twoA);
  const absScale = scale.n < 0n ? qSub(Q0, scale) : scale;
  if (split.m === 1n) {
    const offset: GraphGaussian = negative ? { re: Q0, im: absScale } : { re: absScale, im: Q0 };
    const centerValue = { re: center, im: Q0 };
    return [exactRoot({ re: qAdd(centerValue.re, offset.re), im: offset.im }),
      exactRoot({ re: qSub(centerValue.re, offset.re), im: qSub(Q0, offset.im) })];
  }
  const surd = `${absScale.n === 1n ? '' : absScale.n}√${split.m}${absScale.d === 1n ? '' : `/${absScale.d}`}`;
  const offsetValue = qToNumber(absScale) * Math.sqrt(Number(split.m));
  const centerText = qIsZero(center) ? '' : formatRational(center);
  const term = negative ? `${surd.includes('/') ? `(${surd})` : surd}i` : surd;
  return [1, -1].map((sign) => ({
    re: qToNumber(center) + (negative ? 0 : sign * offsetValue),
    im: negative ? sign * offsetValue : 0,
    exact: true,
    label: centerText ? `${centerText} ${sign > 0 ? '+' : MINUS} ${term}` : `${sign > 0 ? '' : MINUS}${term}`,
    multiplicity: 1,
  }));
}

function evaluatePolynomial(coefficients: ComplexValue[], z: ComplexValue) {
  let value = complex(0); let derivative = complex(0);
  for (let index = coefficients.length - 1; index >= 0; index -= 1) {
    derivative = complexAdd(complexMul(derivative, z), value);
    value = complexAdd(complexMul(value, z), coefficients[index]!);
  }
  return { value, derivative };
}

/** All roots of a numeric polynomial by Aberth–Ehrlich iteration, polished by Newton. */
function aberthRoots(coefficients: ComplexValue[]): ComplexValue[] {
  const degree = coefficients.length - 1;
  if (degree < 1) return [];
  const leading = coefficients[degree]!;
  const monic = coefficients.map((coefficient) => complexDiv(coefficient, leading));
  const bound = 1 + Math.max(...monic.slice(0, degree).map(complexAbs));
  const roots = Array.from({ length: degree }, (_, k) => complex(
    bound * Math.cos(2 * Math.PI * k / degree + 0.4), bound * Math.sin(2 * Math.PI * k / degree + 0.4)));
  for (let iteration = 0; iteration < 600; iteration += 1) {
    let largestStep = 0;
    for (let k = 0; k < degree; k += 1) {
      const { value, derivative } = evaluatePolynomial(monic, roots[k]!);
      if (complexAbs(derivative) === 0) continue;
      const ratio = complexDiv(value, derivative);
      let sum = complex(0);
      for (let j = 0; j < degree; j += 1) if (j !== k) sum = complexAdd(sum, complexDiv(complex(1), complexSub(roots[k]!, roots[j]!)));
      const step = complexDiv(ratio, complexSub(complex(1), complexMul(ratio, sum)));
      if (!Number.isFinite(step.re) || !Number.isFinite(step.im)) continue;
      roots[k] = complexSub(roots[k]!, step);
      largestStep = Math.max(largestStep, complexAbs(step) / (1 + complexAbs(roots[k]!)));
    }
    if (largestStep < 1e-15) break;
  }
  return roots;
}

function mergeMultiplicities(roots: GraphComplexRoot[]) {
  const merged: GraphComplexRoot[] = [];
  for (const root of roots) {
    const same = merged.find((other) => Math.hypot(other.re - root.re, other.im - root.im) <= 1e-7 * (1 + Math.hypot(root.re, root.im))
      && other.exact === root.exact && other.label === root.label);
    if (same) same.multiplicity += 1; else merged.push({ ...root });
  }
  return merged;
}

/** z^n = c for a polynomial whose only terms are z^n and a constant. */
function binomialOf(poly: GraphExactPolynomial) {
  const degree = poly.length - 1;
  if (degree < 2 || !poly.slice(1, -1).every(gIsZero)) return null;
  return binomialRoots(degree, gDiv(gNeg(poly[0]!), poly[degree]!));
}

/** Exact roots of an exact polynomial where it splits, numeric roots for what is left. */
function polynomialRoots(poly: GraphExactPolynomial): GraphComplexRoot[] {
  let rest = poly.slice();
  const roots: GraphComplexRoot[] = [];
  while (rest.length > 1 && gIsZero(rest[0]!)) { roots.push(exactRoot(G0)); rest = rest.slice(1); }
  const binomial = binomialOf(rest);
  if (binomial) return [...roots, ...binomial];
  for (const candidate of rootCandidates(rest)) {
    for (;;) {
      if (rest.length <= 3) break;
      const quotient = deflateExact(rest, candidate);
      if (!quotient) break;
      roots.push(exactRoot(candidate)); rest = quotient;
    }
  }
  const degree = rest.length - 1;
  if (degree === 1) return [...roots, exactRoot(gDiv(gNeg(rest[0]!), rest[1]!))];
  const deflatedBinomial = binomialOf(rest);
  if (deflatedBinomial) return [...roots, ...deflatedBinomial];
  if (degree === 2) {
    // Rational/Gaussian roots were tried above only while degree > 2.
    for (const candidate of rootCandidates(rest)) {
      const quotient = deflateExact(rest, candidate);
      if (quotient) return [...roots, exactRoot(candidate), exactRoot(gDiv(gNeg(quotient[0]!), quotient[1]!))];
    }
    const quadratic = quadraticRoots(rest);
    if (quadratic) return [...roots, ...quadratic];
  }
  const numeric = aberthRoots(rest.map(gToComplex));
  return [...roots, ...numeric.map((value) => ({ re: value.re, im: value.im, exact: false, label: null, multiplicity: 1 }))];
}

function substituteParameters(node: unknown, parameters: Readonly<Record<string, number>>): unknown {
  if (typeof node === 'string' && node in parameters) return parameters[node];
  return Array.isArray(node) ? node.map((child, index) => (index === 0 ? child : substituteParameters(child, parameters))) : node;
}

function fastEvaluator(mathJson: unknown, parameters: Readonly<Record<string, number>>): ComplexNumericEvaluator | null {
  const compiled = compileGraphComplexPlan(mathJson, parameters);
  if (!compiled.ok) return null;
  return {
    evaluateAt(z) {
      const value = compiled.plan.evaluate(z);
      return value
        ? { status: 'finite', value, residualNorm: complexAbs(value), diagnostics: [], evaluationCount: 1 }
        : { status: 'undefined', value: null, residualNorm: null, diagnostics: [], evaluationCount: 1 };
    },
  };
}

/** Solves left = right in z. `viewport` bounds the search for non-polynomial equations. */
export function solveGraphComplexRoots(input: {
  left: GraphExpressionIR;
  right: GraphExpressionIR;
  parameters: Readonly<Record<string, number>>;
  viewport: GraphViewportV1;
}): GraphComplexRootsSolution {
  const rightIsZero = input.right.mathJson === 0;
  const zeroForm = rightIsZero ? input.left.mathJson : ['Add', input.left.mathJson, ['Negate', input.right.mathJson]];
  const substituted = substituteParameters(zeroForm, input.parameters);
  // A written product (z-1)(z^2+1) = 0 is solved factor by factor, which keeps each factor exact.
  const factors = rightIsZero && Array.isArray(substituted) && substituted[0] === 'Multiply' ? substituted.slice(1) : [substituted];
  const polynomials = factors.map((factor) => exactGraphPolynomial(factor));
  if (polynomials.every((poly): poly is GraphExactPolynomial => poly !== null && poly.length > 0)) {
    const roots = polynomials.flatMap((poly) => (poly.length > 1 ? polynomialRoots(poly) : []));
    return { roots: mergeMultiplicities(roots), complete: true, degree: roots.length };
  }
  const evaluator = fastEvaluator(zeroForm, input.parameters);
  if (!evaluator) return { roots: [], complete: false, degree: null };
  const { xMin, xMax, yMin, yMax } = input.viewport;
  const found = findComplexNewtonCandidates({
    evaluator, region: { reMin: xMin, reMax: xMax, imMin: yMin, imMax: yMax }, gridSize: 9, lowDiscrepancySeedCount: 16,
  });
  return {
    roots: found.candidates.map((candidate) => ({ re: candidate.value.re, im: candidate.value.im, exact: false, label: null, multiplicity: 1 })),
    complete: false,
    degree: null,
  };
}
