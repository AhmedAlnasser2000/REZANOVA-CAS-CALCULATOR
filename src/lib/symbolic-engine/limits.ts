import { ComputeEngine } from '@cortex-js/compute-engine';
import type { DisplayDetailSection, LimitDirection, ResultOrigin } from '../../types/calculator';
import { differentiateAst } from './differentiation';
import { normalizeAst } from './normalize';
import { isNodeArray } from './patterns';
import { normalizeExactRationalNode } from './rational';

const ce = new ComputeEngine();
type FiniteLimitRuleValue = number | 'posInfinity' | 'negInfinity';
type FiniteLimitRuleOrigin = Extract<ResultOrigin, 'symbolic' | 'rule-based-symbolic' | 'heuristic-symbolic'>;
type FiniteLimitRuleSuccess = {
  kind: 'success';
  value: FiniteLimitRuleValue;
  origin: FiniteLimitRuleOrigin;
  detailSections?: DisplayDetailSection[];
};
type LocalEquivalent = {
  coefficient: number;
  order: number;
  reason: string;
};

type BoxedLike = {
  latex: string;
  json: unknown;
  evaluate: () => BoxedLike;
  N?: () => BoxedLike;
  subs: (scope: Record<string, number>) => BoxedLike;
};

function box(node: unknown) {
  return ce.box(node as Parameters<typeof ce.box>[0]) as BoxedLike;
}

function latexToNumber(latex: string) {
  const normalized = latex
    .replaceAll('\\cdot', '')
    .replaceAll('\\,', '')
    .replaceAll(' ', '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function evaluateNodeAt(node: unknown, value: number, variable = 'x') {
  try {
    const evaluated = box(node).subs({ [variable]: value }).evaluate();
    if (typeof evaluated.json === 'number' && Number.isFinite(evaluated.json)) {
      return evaluated.json;
    }
    return latexToNumber((evaluated.N?.() ?? evaluated).latex);
  } catch {
    return undefined;
  }
}

function isZeroish(value: number | undefined) {
  return value !== undefined && Number.isFinite(value) && Math.abs(value) < 1e-8;
}

function isHuge(value: number | undefined) {
  return value !== undefined && Number.isFinite(value) && Math.abs(value) > 1e8;
}

function isNonZeroish(value: number | undefined) {
  return value !== undefined && Number.isFinite(value) && !isZeroish(value);
}

function isNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value < 0;
}

function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}

function factorial(value: number) {
  let result = 1;
  for (let index = 2; index <= value; index += 1) {
    result *= index;
  }
  return result;
}

function limitMethodSection(...lines: string[]): DisplayDetailSection[] {
  return [{
    title: 'Limit Method',
    lines,
  }];
}

function success(
  value: FiniteLimitRuleValue,
  origin: FiniteLimitRuleOrigin,
  lines: string[],
): FiniteLimitRuleSuccess {
  return {
    kind: 'success',
    value,
    origin,
    detailSections: limitMethodSection(...lines),
  };
}

function isEquivalentNode(left: unknown, right: unknown) {
  return JSON.stringify(normalizeAst(left)) === JSON.stringify(normalizeAst(right));
}

function isNumericOne(node: unknown) {
  return node === 1;
}

function isNumericMinusOne(node: unknown) {
  return node === -1;
}

function matchOnePlus(node: unknown) {
  if (!isNodeArray(node) || node[0] !== 'Add') {
    return null;
  }

  const terms = node.slice(1);
  const oneIndex = terms.findIndex(isNumericOne);
  if (oneIndex === -1 || terms.length !== 2) {
    return null;
  }

  return terms[1 - oneIndex];
}

function matchFunctionMinusOne(node: unknown, functionHead: string) {
  if (!isNodeArray(node) || node[0] !== 'Add') {
    return null;
  }

  const terms = node.slice(1);
  if (terms.length !== 2 || !terms.some(isNumericMinusOne)) {
    return null;
  }

  const functionTerm = terms.find((term) =>
    isNodeArray(term)
    && term[0] === functionHead
    && term.length === 2);

  return isNodeArray(functionTerm) ? functionTerm[1] : null;
}

function matchExpMinusOne(node: unknown) {
  if (!isNodeArray(node) || node[0] !== 'Add') {
    return null;
  }

  const terms = node.slice(1);
  if (terms.length !== 2 || !terms.some(isNumericMinusOne)) {
    return null;
  }

  const expTerm = terms.find((term) =>
    isNodeArray(term)
    && term[0] === 'Power'
    && term.length === 3
    && term[1] === 'ExponentialE');

  return isNodeArray(expTerm) ? expTerm[2] : null;
}

function matchOneMinusFunction(node: unknown, functionHead: string) {
  if (!isNodeArray(node) || node[0] !== 'Add') {
    return null;
  }

  const terms = node.slice(1);
  if (terms.length !== 2 || !terms.some(isNumericOne)) {
    return null;
  }

  const negatedFunction = terms.find((term) =>
    isNodeArray(term)
    && term[0] === 'Negate'
    && term.length === 2
    && isNodeArray(term[1])
    && term[1][0] === functionHead
    && term[1].length === 2);

  return isNodeArray(negatedFunction) && isNodeArray(negatedFunction[1])
    ? negatedFunction[1][1]
    : null;
}

function matchKnownLimitInner(
  node: unknown,
  denominator: unknown,
  target: number,
  variable: string,
): number | undefined {
  if (isNodeArray(node) && (node[0] === 'Sin' || node[0] === 'Tan') && node.length === 2) {
    const inner = node[1];
    return isEquivalentNode(denominator, inner) && isZeroish(evaluateNodeAt(inner, target, variable))
      ? 1
      : undefined;
  }

  const cosineInner = matchOneMinusFunction(node, 'Cos');
  if (
    cosineInner
    && isEquivalentNode(denominator, ['Power', cosineInner, 2])
    && isZeroish(evaluateNodeAt(cosineInner, target, variable))
  ) {
    return 0.5;
  }

  const expInner = matchExpMinusOne(node);
  if (
    expInner
    && isEquivalentNode(denominator, expInner)
    && isZeroish(evaluateNodeAt(expInner, target, variable))
  ) {
    return 1;
  }

  if (isNodeArray(node) && node[0] === 'Ln' && node.length === 2) {
    const inner = matchOnePlus(node[1]);
    if (inner && isEquivalentNode(denominator, inner) && isZeroish(evaluateNodeAt(inner, target, variable))) {
      return 1;
    }
  }

  const sqrtArgument = matchFunctionMinusOne(node, 'Sqrt');
  const sqrtInner = sqrtArgument ? matchOnePlus(sqrtArgument) : null;
  if (
    sqrtInner
    && isEquivalentNode(denominator, sqrtInner)
    && isZeroish(evaluateNodeAt(sqrtInner, target, variable))
  ) {
    return 0.5;
  }

  return undefined;
}

function resolveKnownFiniteLimitRule(node: unknown, target: number, variable: string) {
  if (!isNodeArray(node) || node[0] !== 'Divide' || node.length !== 3) {
    return undefined;
  }

  const value = matchKnownLimitInner(node[1], node[2], target, variable);
  return value === undefined
    ? undefined
    : success(value, 'rule-based-symbolic', [
        'Recognized a bounded standard finite-limit form with an inner expression tending to 0.',
        'The exact rule was applied before any capped LHopital fallback or numeric sampling.',
      ]);
}

const LOCAL_EQUIVALENT_MAX_DERIVATIVE_ORDER = 4;

function isLocalEquivalentEligible(node: unknown, variable: string): boolean {
  if (typeof node === 'number') {
    return Number.isFinite(node);
  }

  if (typeof node === 'string') {
    return node === variable || node === 'ExponentialE' || node === 'Pi';
  }

  if (!isNodeArray(node) || node.length === 0 || typeof node[0] !== 'string') {
    return false;
  }

  if (![
    'Add',
    'Arcsin',
    'Arctan',
    'Cos',
    'Divide',
    'Ln',
    'Log',
    'Multiply',
    'Negate',
    'Power',
    'Sin',
    'Sqrt',
    'Tan',
  ].includes(node[0])) {
    return false;
  }

  return node.slice(1).every((child) => isLocalEquivalentEligible(child, variable));
}

function boundedDerivativeEquivalent(
  node: unknown,
  target: number,
  variable: string,
): LocalEquivalent | undefined {
  if (!isLocalEquivalentEligible(node, variable)) {
    return undefined;
  }

  let derivative = node;
  for (let order = 1; order <= LOCAL_EQUIVALENT_MAX_DERIVATIVE_ORDER; order += 1) {
    try {
      derivative = differentiateAst(derivative, variable);
    } catch {
      return undefined;
    }

    const derivativeValue = evaluateNodeAt(derivative, target, variable);
    if (derivativeValue === undefined) {
      return undefined;
    }

    if (!isZeroish(derivativeValue)) {
      return {
        coefficient: derivativeValue / factorial(order),
        order,
        reason: `bounded derivative local-order check found first nonzero derivative of order ${order}`,
      };
    }
  }

  return undefined;
}

function localEquivalent(
  node: unknown,
  target: number,
  variable: string,
): LocalEquivalent | undefined {
  const direct = evaluateNodeAt(node, target, variable);
  if (isNonZeroish(direct)) {
    return {
      coefficient: direct as number,
      order: 0,
      reason: 'factor has a finite nonzero target value',
    };
  }

  if (node === variable && isZeroish(direct)) {
    return {
      coefficient: 1,
      order: 1,
      reason: `${variable} is the local target carrier`,
    };
  }

  if (!isNodeArray(node) || node.length === 0) {
    return undefined;
  }

  const cosineInner = matchOneMinusFunction(node, 'Cos');
  if (cosineInner) {
    const inner = localEquivalent(cosineInner, target, variable);
    if (inner && inner.order > 0) {
      return {
        coefficient: (inner.coefficient ** 2) / 2,
        order: inner.order * 2,
        reason: 'used local equivalent 1 - cos(u) ~ u^2/2',
      };
    }
  }

  const expInner = matchExpMinusOne(node);
  if (expInner) {
    const inner = localEquivalent(expInner, target, variable);
    if (inner && inner.order > 0) {
      return {
        coefficient: inner.coefficient,
        order: inner.order,
        reason: 'used local equivalent e^u - 1 ~ u',
      };
    }
  }

  const sqrtArgument = matchFunctionMinusOne(node, 'Sqrt');
  const sqrtInner = sqrtArgument ? matchOnePlus(sqrtArgument) : null;
  if (sqrtInner) {
    const inner = localEquivalent(sqrtInner, target, variable);
    if (inner && inner.order > 0) {
      return {
        coefficient: inner.coefficient / 2,
        order: inner.order,
        reason: 'used local equivalent sqrt(1 + u) - 1 ~ u/2',
      };
    }
  }

  if ((node[0] === 'Sin' || node[0] === 'Tan' || node[0] === 'Arcsin' || node[0] === 'Arctan') && node.length === 2) {
    const inner = localEquivalent(node[1], target, variable);
    if (inner && inner.order > 0) {
      return {
        coefficient: inner.coefficient,
        order: inner.order,
        reason: `used local equivalent ${node[0]}(u) ~ u`,
      };
    }
  }

  if ((node[0] === 'Ln' || node[0] === 'Log') && node.length === 2) {
    const inner = matchOnePlus(node[1]);
    const equivalent = inner ? localEquivalent(inner, target, variable) : undefined;
    if (equivalent && equivalent.order > 0) {
      return {
        coefficient: equivalent.coefficient,
        order: equivalent.order,
        reason: 'used local equivalent ln(1 + u) ~ u',
      };
    }
  }

  if (node[0] === 'Negate' && node.length === 2) {
    const child = localEquivalent(node[1], target, variable);
    return child
      ? {
          coefficient: -child.coefficient,
          order: child.order,
          reason: child.reason,
        }
      : undefined;
  }

  if (node[0] === 'Multiply') {
    const factors = node.slice(1).map((child) => localEquivalent(child, target, variable));
    if (factors.every(Boolean)) {
      const equivalents = factors as LocalEquivalent[];
      return {
        coefficient: equivalents.reduce((product, factor) => product * factor.coefficient, 1),
        order: equivalents.reduce((sum, factor) => sum + factor.order, 0),
        reason: 'combined local equivalent factors in a product',
      };
    }
  }

  if (node[0] === 'Divide' && node.length === 3) {
    const numerator = localEquivalent(node[1], target, variable);
    const denominator = localEquivalent(node[2], target, variable);
    if (numerator && denominator && !isZeroish(denominator.coefficient)) {
      return {
        coefficient: numerator.coefficient / denominator.coefficient,
        order: numerator.order - denominator.order,
        reason: 'combined local equivalent orders in a quotient',
      };
    }
  }

  if (node[0] === 'Power' && node.length === 3 && isInteger(node[2])) {
    const base = localEquivalent(node[1], target, variable);
    if (base) {
      return {
        coefficient: base.coefficient ** node[2],
        order: base.order * node[2],
        reason: 'raised a local equivalent factor to an integer power',
      };
    }
  }

  if (node[0] === 'Add') {
    const terms = node.slice(1).map((child) => localEquivalent(child, target, variable));
    if (terms.every(Boolean)) {
      const equivalents = terms as LocalEquivalent[];
      const grouped = new Map<number, number>();
      for (const term of equivalents) {
        grouped.set(term.order, (grouped.get(term.order) ?? 0) + term.coefficient);
      }

      for (const order of [...grouped.keys()].sort((left, right) => left - right)) {
        const coefficient = grouped.get(order) ?? 0;
        if (!isZeroish(coefficient)) {
          return {
            coefficient,
            order,
            reason: 'combined same-order local equivalent terms in a sum',
          };
        }
      }
    }
  }

  return isZeroish(direct)
    ? boundedDerivativeEquivalent(node, target, variable)
    : undefined;
}

function signedInfinityFromLocalEquivalent(
  equivalent: LocalEquivalent,
  direction: LimitDirection,
): FiniteLimitRuleValue | undefined {
  if (equivalent.order >= 0 || isZeroish(equivalent.coefficient)) {
    return undefined;
  }

  const signForSide = (side: Exclude<LimitDirection, 'two-sided'>) => {
    const sideSign = side === 'left' && Math.abs(equivalent.order) % 2 === 1 ? -1 : 1;
    return equivalent.coefficient * sideSign > 0 ? 1 : -1;
  };

  if (direction === 'left' || direction === 'right') {
    return signForSide(direction) > 0 ? 'posInfinity' : 'negInfinity';
  }

  const left = signForSide('left');
  const right = signForSide('right');
  return left === right
    ? left > 0 ? 'posInfinity' : 'negInfinity'
    : undefined;
}

function resolveLocalEquivalentLimit(
  node: unknown,
  target: number,
  variable: string,
  direction: LimitDirection,
  intro: string,
): FiniteLimitRuleSuccess | undefined {
  const equivalent = localEquivalent(node, target, variable);
  if (!equivalent || !Number.isFinite(equivalent.coefficient)) {
    return undefined;
  }

  const baseLines = [
    intro,
    `Local equivalent summary: coefficient ${equivalent.coefficient} with net order ${equivalent.order}.`,
    `Reason: ${equivalent.reason}.`,
  ];

  if (equivalent.order === 0) {
    return success(equivalent.coefficient, 'rule-based-symbolic', baseLines);
  }

  if (equivalent.order > 0) {
    return success(0, 'rule-based-symbolic', [
      ...baseLines,
      'Positive net order means the expression tends to 0 at the target.',
    ]);
  }

  const infinity = signedInfinityFromLocalEquivalent(equivalent, direction);
  return infinity
    ? success(infinity, 'rule-based-symbolic', [
        ...baseLines,
        'Negative net order creates a pole; the requested direction determines the signed infinity when signs agree.',
      ])
    : undefined;
}

function resolveRationalLocalLimit(
  node: unknown,
  target: number,
  variable: string,
  direction: LimitDirection,
) {
  if (!isNodeArray(node) || node[0] !== 'Divide' || node.length !== 3) {
    return undefined;
  }

  const simplified = normalizeExactRationalNode(node, 'simplify');
  if (simplified?.changed) {
    const value = evaluateNodeAt(simplified.normalizedNode, target, variable);
    if (value !== undefined) {
      return success(value, 'rule-based-symbolic', [
        'Used the existing exact rational normalizer to cancel common factors before evaluating the local form.',
        'The simplified local form is finite at the target.',
      ]);
    }

    const simplifiedLimit = resolveLocalEquivalentLimit(
      simplified.normalizedNode,
      target,
      variable,
      direction,
      'Used the existing exact rational normalizer before analyzing the remaining local behavior.',
    );
    if (simplifiedLimit) {
      return simplifiedLimit;
    }
  }

  return resolveLocalEquivalentLimit(
    node,
    target,
    variable,
    direction,
    'Compared numerator and denominator local orders at the finite target.',
  );
}

function unboundedSampleSign(
  node: unknown,
  target: number,
  variable: string,
  direction: Exclude<LimitDirection, 'two-sided'>,
): 1 | -1 | undefined {
  const steps = [1e-2, 1e-3, 1e-4];
  const values = steps.map((step) =>
    evaluateNodeAt(node, direction === 'left' ? target - step : target + step, variable));

  if (values.some((value) => value === undefined || !Number.isFinite(value))) {
    return undefined;
  }

  const finiteValues = values as number[];
  const magnitudes = finiteValues.map((value) => Math.abs(value));
  const growsTowardTarget =
    magnitudes[2] >= 1e4
    && magnitudes[2] > magnitudes[1] * 1.5
    && magnitudes[1] > magnitudes[0] * 1.5;

  if (!growsTowardTarget) {
    return undefined;
  }

  return finiteValues[2] < 0 ? -1 : 1;
}

function isDividePoleCandidate(node: unknown, target: number, variable: string) {
  if (!isNodeArray(node) || node[0] !== 'Divide' || node.length !== 3) {
    return false;
  }

  const numeratorValue = evaluateNodeAt(node[1], target, variable);
  const denominatorValue = evaluateNodeAt(node[2], target, variable);
  return numeratorValue !== undefined
    && !isZeroish(numeratorValue)
    && isZeroish(denominatorValue);
}

function isNegativePowerPoleCandidate(node: unknown, target: number, variable: string) {
  if (!isNodeArray(node) || node[0] !== 'Power' || node.length !== 3 || !isNegativeInteger(node[2])) {
    return false;
  }

  return isZeroish(evaluateNodeAt(node[1], target, variable));
}

function resolveSignedPoleLimit(
  node: unknown,
  target: number,
  variable: string,
  direction: LimitDirection,
): FiniteLimitRuleSuccess | undefined {
  if (
    !isDividePoleCandidate(node, target, variable)
    && !isNegativePowerPoleCandidate(node, target, variable)
  ) {
    return undefined;
  }

  const leftSign = unboundedSampleSign(node, target, variable, 'left');
  const rightSign = unboundedSampleSign(node, target, variable, 'right');

  if (direction === 'left' && leftSign) {
    return success(leftSign > 0 ? 'posInfinity' : 'negInfinity', 'rule-based-symbolic', [
      'Detected a finite pole with a stable left-hand sign pattern.',
      'The sign of the one-sided samples determines the signed infinity.',
    ]);
  }

  if (direction === 'right' && rightSign) {
    return success(rightSign > 0 ? 'posInfinity' : 'negInfinity', 'rule-based-symbolic', [
      'Detected a finite pole with a stable right-hand sign pattern.',
      'The sign of the one-sided samples determines the signed infinity.',
    ]);
  }

  if (direction === 'two-sided' && leftSign && rightSign && leftSign === rightSign) {
    return success(leftSign > 0 ? 'posInfinity' : 'negInfinity', 'rule-based-symbolic', [
      'Detected a finite pole where left-hand and right-hand signs agree.',
      'The shared sign determines the two-sided signed infinity.',
    ]);
  }

  return undefined;
}

function resolveLogBoundaryLimit(
  node: unknown,
  target: number,
  variable: string,
  direction: LimitDirection,
): FiniteLimitRuleSuccess | undefined {
  if (!isNodeArray(node) || (node[0] !== 'Ln' && node[0] !== 'Log') || node.length !== 2) {
    return undefined;
  }

  if (direction === 'two-sided') {
    return undefined;
  }

  const argumentValue = evaluateNodeAt(node[1], target, variable);
  if (!isZeroish(argumentValue)) {
    return undefined;
  }

  const steps = [1e-2, 1e-3, 1e-4];
  const argumentSamples = steps.map((step) =>
    evaluateNodeAt(node[1], direction === 'left' ? target - step : target + step, variable));
  if (argumentSamples.some((value) => value === undefined || value <= 0)) {
    return undefined;
  }

  const magnitudes = (argumentSamples as number[]).map((value) => Math.abs(value));
  if (!(magnitudes[2] < magnitudes[1] && magnitudes[1] < magnitudes[0])) {
    return undefined;
  }

  return success('negInfinity', 'rule-based-symbolic', [
    'Recognized a one-sided logarithm boundary with the argument approaching 0 through positive real values.',
    'The real logarithm tends to negative infinity on that side.',
  ]);
}

export function attemptLHospital(node: unknown, target: number, variable = 'x', remaining = 3): number | undefined {
  if (remaining <= 0 || !isNodeArray(node) || node[0] !== 'Divide' || node.length !== 3) {
    return undefined;
  }

  const numerator = node[1];
  const denominator = node[2];
  const numeratorValue = evaluateNodeAt(numerator, target, variable);
  const denominatorValue = evaluateNodeAt(denominator, target, variable);

  const zeroOverZero = isZeroish(numeratorValue) && isZeroish(denominatorValue);
  const infinityOverInfinity = isHuge(numeratorValue) && isHuge(denominatorValue);
  if (!zeroOverZero && !infinityOverInfinity) {
    return undefined;
  }

  const nextNode = ['Divide', differentiateAst(numerator, variable), differentiateAst(denominator, variable)];
  const evaluated = evaluateNodeAt(nextNode, target, variable);
  if (evaluated !== undefined) {
    return evaluated;
  }

  return attemptLHospital(nextNode, target, variable, remaining - 1);
}

export function resolveFiniteLimitRule(
  node: unknown,
  target: number,
  variable = 'x',
  direction: LimitDirection = 'two-sided',
) {
  try {
    const evaluated = box(node).subs({ [variable]: target }).evaluate();
    if (!evaluated.latex.includes('Undefined') && !evaluated.latex.includes('\\infty')) {
      const numeric = typeof evaluated.json === 'number' ? evaluated.json : latexToNumber((evaluated.N?.() ?? evaluated).latex);
      if (numeric !== undefined) {
        return success(numeric, 'symbolic', [
          'Direct substitution evaluated to a finite value.',
        ]);
      }
    }
  } catch {
    // ignore direct substitution failures
  }

  const knownRule = resolveKnownFiniteLimitRule(node, target, variable);
  if (knownRule) {
    return knownRule;
  }

  const rationalLocal = resolveRationalLocalLimit(node, target, variable, direction);
  if (rationalLocal) {
    return rationalLocal;
  }

  const localEquivalentLimit = resolveLocalEquivalentLimit(
    node,
    target,
    variable,
    direction,
    'Combined bounded local equivalents at the finite target.',
  );
  if (localEquivalentLimit) {
    return localEquivalentLimit;
  }

  const signedPole = resolveSignedPoleLimit(node, target, variable, direction);
  if (signedPole) {
    return signedPole;
  }

  const logBoundary = resolveLogBoundaryLimit(node, target, variable, direction);
  if (logBoundary) {
    return logBoundary;
  }

  const byLHospital = attemptLHospital(node, target, variable);
  if (byLHospital !== undefined) {
    return success(byLHospital, 'heuristic-symbolic', [
      'Used capped LHopital fallback after direct bounded rules did not resolve the form.',
    ]);
  }

  return { kind: 'unhandled' as const };
}
