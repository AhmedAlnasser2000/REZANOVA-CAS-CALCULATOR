import type { GraphViewportV1 } from '../contracts';

// Principal branch geometry for complex Graph mappings, located from the
// actual operator argument rather than the operator name. Only arguments that
// are affine in z (`a*z + b`, with a and b constant complex numbers) have
// their branch points and cuts placed; any other multivalued argument is
// reported as unresolved so callers never draw or prove a guessed location.

export type GraphComplexPoint = { re: number; im: number };

export type GraphComplexBranchPointV1 = { family: string; z: GraphComplexPoint };

/** A cut ray `origin + t * direction`, t >= 0, in the z-plane. */
export type GraphComplexBranchRayV1 = { family: string; origin: GraphComplexPoint; direction: GraphComplexPoint };

export type GraphComplexBranchGeometryV1 = {
  points: GraphComplexBranchPointV1[];
  rays: GraphComplexBranchRayV1[];
  /** Multivalued operators whose argument is not affine in z. */
  unresolvedOperators: string[];
};

type Affine = { a: GraphComplexPoint; b: GraphComplexPoint };

const ZERO: GraphComplexPoint = { re: 0, im: 0 };
const ONE: GraphComplexPoint = { re: 1, im: 0 };
const I: GraphComplexPoint = { re: 0, im: 1 };
const CONSTANTS = new Map<string, number>([['Pi', Math.PI], ['ExponentialE', Math.E]]);
const LOG_FAMILY_OPERATORS = new Set(['Ln', 'Log', 'Sqrt', 'Root']);
const INVERSE_SINE_COSINE = new Set(['Arcsin', 'asin', 'Arccos', 'acos']);
const INVERSE_TANGENT = new Set(['Arctan', 'atan']);
const UNMODELLED_MULTIVALUED = new Set(['Arsinh', 'Asinh', 'Arcosh', 'Acosh', 'Artanh', 'Atanh']);

const add = (left: GraphComplexPoint, right: GraphComplexPoint) => ({ re: left.re + right.re, im: left.im + right.im });
const negate = (value: GraphComplexPoint) => ({ re: -value.re, im: -value.im });
const multiply = (left: GraphComplexPoint, right: GraphComplexPoint) => ({
  re: left.re * right.re - left.im * right.im,
  im: left.re * right.im + left.im * right.re,
});
function divide(left: GraphComplexPoint, right: GraphComplexPoint): GraphComplexPoint | null {
  const denominator = right.re * right.re + right.im * right.im;
  if (denominator === 0) return null;
  return {
    re: (left.re * right.re + left.im * right.im) / denominator,
    im: (left.im * right.re - left.re * right.im) / denominator,
  };
}
const isZero = (value: GraphComplexPoint) => value.re === 0 && value.im === 0;
const finitePoint = (value: GraphComplexPoint) => Number.isFinite(value.re) && Number.isFinite(value.im);

function numericLeaf(node: unknown, parameters: Readonly<Record<string, number>>): GraphComplexPoint | null {
  if (typeof node === 'number') return Number.isFinite(node) ? { re: node, im: 0 } : null;
  if (typeof node === 'string') {
    const constant = CONSTANTS.get(node) ?? parameters[node];
    return constant !== undefined && Number.isFinite(constant) ? { re: constant, im: 0 } : null;
  }
  if (node && typeof node === 'object' && !Array.isArray(node) && 'num' in node && typeof node.num === 'string') {
    const value = Number(node.num);
    return Number.isFinite(value) ? { re: value, im: 0 } : null;
  }
  return null;
}

/** Returns `a*symbol + b` for affine expressions, otherwise null. */
export function extractGraphComplexAffine(
  node: unknown,
  symbol: string,
  parameters: Readonly<Record<string, number>> = {},
): Affine | null {
  if (node === symbol) return { a: ONE, b: ZERO };
  const leaf = numericLeaf(node, parameters);
  if (leaf) return { a: ZERO, b: leaf };
  if (!Array.isArray(node) || typeof node[0] !== 'string') return null;
  const [operator, ...args] = node as [string, ...unknown[]];
  const parts = () => args.map((arg) => extractGraphComplexAffine(arg, symbol, parameters));
  if (operator === 'Complex' && args.length === 2) {
    const [re, im] = [numericLeaf(args[0], parameters), numericLeaf(args[1], parameters)];
    return re && im && re.im === 0 && im.im === 0 ? { a: ZERO, b: { re: re.re, im: im.re } } : null;
  }
  if (operator === 'Rational' && args.length === 2) {
    const [numerator, denominator] = [numericLeaf(args[0], parameters), numericLeaf(args[1], parameters)];
    const value = numerator && denominator ? divide(numerator, denominator) : null;
    return value ? { a: ZERO, b: value } : null;
  }
  if (operator === 'Negate' && args.length === 1) {
    const inner = extractGraphComplexAffine(args[0], symbol, parameters);
    return inner ? { a: negate(inner.a), b: negate(inner.b) } : null;
  }
  if (operator === 'Add' || (operator === 'Subtract' && args.length === 2)) {
    const terms = parts();
    if (terms.some((term) => term === null)) return null;
    return (terms as Affine[]).reduce((sum, term, index) => (operator === 'Subtract' && index === 1
      ? { a: add(sum.a, negate(term.a)), b: add(sum.b, negate(term.b)) }
      : { a: add(sum.a, term.a), b: add(sum.b, term.b) }), { a: ZERO, b: ZERO });
  }
  if (operator === 'Multiply') {
    const factors = parts();
    if (factors.some((factor) => factor === null)) return null;
    let product: Affine = { a: ZERO, b: ONE };
    for (const factor of factors as Affine[]) {
      if (!isZero(product.a) && !isZero(factor.a)) return null;
      product = {
        a: add(multiply(product.a, factor.b), multiply(product.b, factor.a)),
        b: multiply(product.b, factor.b),
      };
    }
    return product;
  }
  if (operator === 'Divide' && args.length === 2) {
    const [numerator, denominator] = parts();
    if (!numerator || !denominator || !isZero(denominator.a)) return null;
    const a = divide(numerator.a, denominator.b);
    const b = divide(numerator.b, denominator.b);
    return a && b ? { a, b } : null;
  }
  return null;
}

function dependsOn(node: unknown, symbol: string): boolean {
  if (node === symbol) return true;
  return Array.isArray(node) && node.slice(1).some((child) => dependsOn(child, symbol));
}

function isIntegerExponent(node: unknown) {
  return typeof node === 'number' && Number.isInteger(node);
}

/**
 * Collects principal branch points and cut rays for every multivalued
 * operator in `node`. Families mirror the principal conventions of the
 * public complex evaluator: log/root/power cut where the argument is a
 * non-positive real, arcsin/arccos where it is real with |w| >= 1, and arctan
 * where it is imaginary with |Im w| >= 1.
 */
export function graphComplexBranchGeometry(
  node: unknown,
  symbol: string,
  parameters: Readonly<Record<string, number>> = {},
): GraphComplexBranchGeometryV1 {
  const geometry: GraphComplexBranchGeometryV1 = { points: [], rays: [], unresolvedOperators: [] };
  const place = (operator: string, argument: unknown, family: string,
    preimages: Array<{ value: GraphComplexPoint; direction?: GraphComplexPoint }>) => {
    if (!dependsOn(argument, symbol)) return;
    const affine = extractGraphComplexAffine(argument, symbol, parameters);
    if (!affine || isZero(affine.a)) {
      geometry.unresolvedOperators.push(operator);
      return;
    }
    for (const preimage of preimages) {
      // a*z + b = w  =>  z = (w - b) / a; a cut direction d in w maps to d / a.
      const z = divide(add(preimage.value, negate(affine.b)), affine.a);
      if (!z || !finitePoint(z)) continue;
      geometry.points.push({ family: `${family}-branch-point`, z });
      if (!preimage.direction) continue;
      const direction = divide(preimage.direction, affine.a);
      if (direction && finitePoint(direction)) geometry.rays.push({ family: `${family}-cut`, origin: z, direction });
    }
  };
  const visit = (value: unknown) => {
    if (!Array.isArray(value) || typeof value[0] !== 'string') return;
    const [operator, ...args] = value as [string, ...unknown[]];
    const minusOne = { re: -1, im: 0 };
    if (LOG_FAMILY_OPERATORS.has(operator) && args.length >= 1) {
      place(operator, args[0], 'principal-log', [{ value: ZERO, direction: minusOne }]);
      if (operator === 'Log' && args.length >= 2) place(operator, args[1], 'principal-log-base', [{ value: ZERO, direction: minusOne }]);
    } else if (operator === 'Power' && args.length === 2 && !isIntegerExponent(args[1])) {
      place(operator, args[0], 'principal-power', [{ value: ZERO, direction: minusOne }]);
    } else if (INVERSE_SINE_COSINE.has(operator) && args.length === 1) {
      place(operator, args[0], 'inverse-sine-cosine', [
        { value: minusOne, direction: minusOne },
        { value: ONE, direction: ONE },
      ]);
    } else if (INVERSE_TANGENT.has(operator) && args.length === 1) {
      place(operator, args[0], 'inverse-tangent', [
        { value: I, direction: I },
        { value: negate(I), direction: negate(I) },
      ]);
    } else if (UNMODELLED_MULTIVALUED.has(operator) && args.length === 1 && dependsOn(args[0], symbol)) {
      geometry.unresolvedOperators.push(operator);
    }
    args.forEach(visit);
  };
  visit(node);
  return geometry;
}

/** Clips a cut ray to the viewport; returns null when it misses the view. */
export function clipGraphComplexBranchRay(
  ray: GraphComplexBranchRayV1,
  viewport: Pick<GraphViewportV1, 'xMin' | 'xMax' | 'yMin' | 'yMax'>,
): { from: GraphComplexPoint; to: GraphComplexPoint } | null {
  let lower = 0;
  let upper = Number.POSITIVE_INFINITY;
  const axes: Array<[number, number, number, number]> = [
    [ray.origin.re, ray.direction.re, viewport.xMin, viewport.xMax],
    [ray.origin.im, ray.direction.im, viewport.yMin, viewport.yMax],
  ];
  for (const [origin, direction, minimum, maximum] of axes) {
    if (direction === 0) {
      if (origin < minimum || origin > maximum) return null;
      continue;
    }
    const first = (minimum - origin) / direction;
    const second = (maximum - origin) / direction;
    lower = Math.max(lower, Math.min(first, second));
    upper = Math.min(upper, Math.max(first, second));
  }
  if (!(upper >= lower) || !Number.isFinite(upper)) return null;
  const at = (t: number) => ({ re: ray.origin.re + ray.direction.re * t, im: ray.origin.im + ray.direction.im * t });
  return { from: at(lower), to: at(upper) };
}
