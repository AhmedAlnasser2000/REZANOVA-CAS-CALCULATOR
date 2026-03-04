import { ComputeEngine } from '@cortex-js/compute-engine';
import type {
  AngleUnit,
  SolveDomainConstraint,
  SolveBadge,
} from '../../types/calculator';
import {
  boxLatex,
  flattenAdd,
  flattenMultiply,
  isFiniteNumber,
  isNodeArray,
  termKey,
} from '../symbolic-engine/patterns';
import { normalizeAst } from '../symbolic-engine/normalize';
import { matchScaledVariableArgument, matchTrigCall } from '../trigonometry/normalize';
import {
  exponentialDomainError,
  trigCarrierDomainError,
} from './domain-guards';

const ce = new ComputeEngine();
const EPSILON = 1e-9;

export type SubstitutionSolveResult =
  | { kind: 'none' }
  | { kind: 'blocked'; error: string }
  | {
      kind: 'branches';
      equations: string[];
      solveBadges: SolveBadge[];
      solveSummaryText: string;
      domainConstraints?: SolveDomainConstraint[];
    };

type TrigCarrier = {
  kind: 'sin' | 'cos' | 'tan';
  argument: unknown;
  argumentLatex: string;
};

type ExpCarrier = {
  kind: 'exp' | 'power';
  baseNode: unknown;
  baseLatex: string;
};

function sameNode(left: unknown, right: unknown) {
  return termKey(normalizeAst(left)) === termKey(normalizeAst(right));
}

function unwrapNegate(node: unknown): { sign: number; value: unknown } {
  if (isNodeArray(node) && node[0] === 'Negate' && node.length === 2) {
    return { sign: -1, value: node[1] };
  }
  return { sign: 1, value: node };
}

function numericFromNode(node: unknown): number | undefined {
  if (typeof node === 'number' && Number.isFinite(node)) {
    return node;
  }

  try {
    const numeric = ce.box(node as Parameters<typeof ce.box>[0]).N?.();
    const json = numeric?.json;
    if (typeof json === 'number' && Number.isFinite(json)) {
      return json;
    }
    if (json && typeof json === 'object' && 'num' in json) {
      const value = Number((json as { num: string }).num);
      return Number.isFinite(value) ? value : undefined;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function formatBranchValue(value: number) {
  const rounded = Math.round(value);
  if (Math.abs(value - rounded) < EPSILON) {
    return `${rounded}`;
  }

  const denominatorMax = 64;
  for (let denominator = 1; denominator <= denominatorMax; denominator += 1) {
    const numerator = Math.round(value * denominator);
    if (Math.abs(value - numerator / denominator) < EPSILON) {
      if (denominator === 1) {
        return `${numerator}`;
      }
      return `\\frac{${numerator}}{${denominator}}`;
    }
  }

  return `${value}`;
}

function solveLinearOrQuadratic(coefficients: number[]) {
  const [quadratic = 0, linear = 0, constant = 0] = coefficients;
  if (Math.abs(quadratic) < EPSILON) {
    if (Math.abs(linear) < EPSILON) {
      return [];
    }
    return [-constant / linear];
  }

  const discriminant = linear ** 2 - 4 * quadratic * constant;
  if (discriminant < -EPSILON) {
    return [];
  }

  if (Math.abs(discriminant) < EPSILON) {
    return [-linear / (2 * quadratic)];
  }

  const root = Math.sqrt(Math.max(discriminant, 0));
  return [
    (-linear + root) / (2 * quadratic),
    (-linear - root) / (2 * quadratic),
  ];
}

function extractTermCore(node: unknown) {
  const normalized = normalizeAst(node);
  const { sign, value } = unwrapNegate(normalized);
  const factors = flattenMultiply(value);
  let coefficient = sign;
  const symbolic: unknown[] = [];

  for (const factor of factors) {
    const numeric = numericFromNode(factor);
    if (numeric !== undefined) {
      coefficient *= numeric;
    } else {
      symbolic.push(factor);
    }
  }

  if (symbolic.length === 0) {
    return { coefficient, symbolic: null as unknown | null };
  }

  if (symbolic.length !== 1) {
    return null;
  }

  return { coefficient, symbolic: symbolic[0] };
}

function matchSupportedTrigCarrier(node: unknown): TrigCarrier | null {
  const trig = matchTrigCall(normalizeAst(node));
  if (!trig || !matchScaledVariableArgument(trig.argument)) {
    return null;
  }

  return {
    kind: trig.kind,
    argument: trig.argument,
    argumentLatex: trig.argumentLatex,
  };
}

function trigCarrierEquation(kind: 'sin' | 'cos' | 'tan', argumentLatex: string, value: number) {
  const fn = kind === 'sin' ? '\\sin' : kind === 'cos' ? '\\cos' : '\\tan';
  return `${fn}\\left(${argumentLatex}\\right)=${formatBranchValue(value)}`;
}

function parseTrigPolynomialTerm(node: unknown) {
  const core = extractTermCore(node);
  if (!core) {
    return null;
  }

  if (!core.symbolic) {
    return {
      coefficient: core.coefficient,
      degree: 0 as const,
      carrier: null as TrigCarrier | null,
    };
  }

  const directCarrier = matchSupportedTrigCarrier(core.symbolic);
  if (directCarrier) {
    return {
      coefficient: core.coefficient,
      degree: 1 as const,
      carrier: directCarrier,
    };
  }

  const normalized = normalizeAst(core.symbolic);
  if (
    isNodeArray(normalized)
    && normalized[0] === 'Power'
    && normalized.length === 3
    && isFiniteNumber(normalized[2])
    && normalized[2] === 2
  ) {
    const squaredCarrier = matchSupportedTrigCarrier(normalized[1]);
    if (squaredCarrier) {
      return {
        coefficient: core.coefficient,
        degree: 2 as const,
        carrier: squaredCarrier,
      };
    }
  }

  return null;
}

function matchTrigPolynomialSubstitution(nonZeroSide: unknown): SubstitutionSolveResult {
  const terms = flattenAdd(normalizeAst(nonZeroSide));
  const coefficients = new Map<number, number>();
  let carrier: TrigCarrier | null = null;

  for (const term of terms) {
    const parsed = parseTrigPolynomialTerm(term);
    if (!parsed) {
      return { kind: 'none' };
    }

    if (parsed.degree > 0) {
      if (!carrier) {
        carrier = parsed.carrier;
      } else if (!parsed.carrier || carrier.kind !== parsed.carrier.kind || !sameNode(carrier.argument, parsed.carrier.argument)) {
        return { kind: 'none' };
      }
    }

    coefficients.set(parsed.degree, (coefficients.get(parsed.degree) ?? 0) + parsed.coefficient);
  }

  if (!carrier || (coefficients.get(2) ?? 0) === 0 && (coefficients.get(1) ?? 0) === 0) {
    return { kind: 'none' };
  }

  const degree = Math.abs(coefficients.get(2) ?? 0) > EPSILON ? 2 : 1;
  const roots = solveLinearOrQuadratic([
    coefficients.get(2) ?? 0,
    coefficients.get(1) ?? 0,
    coefficients.get(0) ?? 0,
  ]);

  if (roots.length === 0) {
    if ((carrier.kind === 'sin' || carrier.kind === 'cos') && degree === 2) {
      return {
        kind: 'blocked',
        error: 'No real solutions were found for the substituted trig carrier.',
      };
    }

    return { kind: 'none' };
  }

  const validRoots = roots.filter((root, index, list) =>
    list.findIndex((candidate) => Math.abs(candidate - root) < EPSILON) === index);

  const equations: string[] = [];
  for (const root of validRoots) {
    if (carrier.kind === 'sin' || carrier.kind === 'cos') {
      const error = trigCarrierDomainError(carrier.kind, formatBranchValue(root));
      if (error) {
        continue;
      }
    }
    equations.push(trigCarrierEquation(carrier.kind, carrier.argumentLatex, root));
  }

  if (equations.length === 0) {
    return {
      kind: 'blocked',
      error: carrier.kind === 'sin' || carrier.kind === 'cos'
        ? 'No real solutions because sin(x) and cos(x) only take values between -1 and 1.'
        : 'No real solutions were found for the substituted trig carrier.',
    };
  }

  const carrierLabel = carrier.kind === 'sin'
    ? `\\sin\\left(${carrier.argumentLatex}\\right)`
    : carrier.kind === 'cos'
      ? `\\cos\\left(${carrier.argumentLatex}\\right)`
      : `\\tan\\left(${carrier.argumentLatex}\\right)`;

  const summaryPolynomial = degree === 2
    ? `${formatBranchValue(coefficients.get(2) ?? 0)}t^2${coefficients.get(1) ? `${(coefficients.get(1) ?? 0) >= 0 ? '+' : ''}${formatBranchValue(coefficients.get(1) ?? 0)}t` : ''}${coefficients.get(0) ? `${(coefficients.get(0) ?? 0) >= 0 ? '+' : ''}${formatBranchValue(coefficients.get(0) ?? 0)}` : ''}=0`
    : `${formatBranchValue(coefficients.get(1) ?? 0)}t${coefficients.get(0) ? `${(coefficients.get(0) ?? 0) >= 0 ? '+' : ''}${formatBranchValue(coefficients.get(0) ?? 0)}` : ''}=0`;

  return {
    kind: 'branches',
    equations,
    solveBadges: ['Symbolic Substitution', 'Candidate Checked'],
    solveSummaryText: `Substituted t = ${carrierLabel}, solved ${summaryPolynomial}`,
  };
}

function matchSupportedExponentialCarrier(node: unknown): ExpCarrier | null {
  const normalized = normalizeAst(node);
  if (!isNodeArray(normalized) || normalized[0] !== 'Power' || normalized.length !== 3) {
    return null;
  }

  const [, base, exponent] = normalized;
  if (!sameNode(exponent, 'x')) {
    return null;
  }

  if (base === 'ExponentialE') {
    return { kind: 'exp', baseNode: base, baseLatex: 'e' };
  }

  const numericBase = numericFromNode(base);
  if (numericBase !== undefined && numericBase > 0 && Math.abs(numericBase - 1) > EPSILON) {
    return { kind: 'power', baseNode: base, baseLatex: boxLatex(base) };
  }

  return null;
}

function expTermDegree(symbolic: unknown, carrier: ExpCarrier): number | null {
  const normalized = normalizeAst(symbolic);

  if (isNodeArray(normalized) && normalized[0] === 'Power' && normalized.length === 3) {
    const [, base, exponent] = normalized;
    if (sameNode(base, carrier.baseNode)) {
      if (sameNode(exponent, 'x')) {
        return 1;
      }

      const scaled = matchScaledVariableArgument(exponent);
      if (scaled) {
        return scaled.coefficient <= 2 ? scaled.coefficient : null;
      }
    }

    if (sameNode(base, ['Power', carrier.baseNode, 'x']) && isFiniteNumber(exponent) && Number.isInteger(exponent) && exponent > 0 && exponent <= 2) {
      return exponent;
    }

    if (
      isNodeArray(base)
      && base[0] === 'Power'
      && base.length === 3
      && sameNode(base[1], carrier.baseNode)
      && sameNode(base[2], 'x')
      && isFiniteNumber(exponent)
      && Number.isInteger(exponent)
      && exponent > 0
      && exponent <= 2
    ) {
      return exponent;
    }
  }

  return null;
}

function parseExpPolynomialTerm(node: unknown, carrier: ExpCarrier | null) {
  const core = extractTermCore(node);
  if (!core) {
    return null;
  }

  if (!core.symbolic) {
    return {
      coefficient: core.coefficient,
      degree: 0 as const,
      carrier,
    };
  }

  if (!carrier) {
    const directCarrier = matchSupportedExponentialCarrier(core.symbolic);
    if (directCarrier) {
      return {
        coefficient: core.coefficient,
        degree: 1 as const,
        carrier: directCarrier,
      };
    }
  }

  if (carrier) {
    const degree = expTermDegree(core.symbolic, carrier);
    if (degree && degree <= 2) {
      return {
        coefficient: core.coefficient,
        degree: degree as 1 | 2,
        carrier,
      };
    }
  }

  return null;
}

function exponentBranchEquation(carrier: ExpCarrier, root: number) {
  const rootLatex = formatBranchValue(root);
  if (carrier.kind === 'exp') {
    return `e^x=${rootLatex}`;
  }

  return `${carrier.baseLatex}^x=${rootLatex}`;
}

function matchExponentialPolynomialSubstitution(nonZeroSide: unknown): SubstitutionSolveResult {
  const terms = flattenAdd(normalizeAst(nonZeroSide));
  let carrier: ExpCarrier | null = null;
  const coefficients = new Map<number, number>();

  for (const term of terms) {
    const parsed = parseExpPolynomialTerm(term, carrier);
    if (!parsed) {
      return { kind: 'none' };
    }

    if (parsed.degree > 0 && parsed.carrier) {
      carrier = parsed.carrier;
    }

    coefficients.set(parsed.degree, (coefficients.get(parsed.degree) ?? 0) + parsed.coefficient);
  }

  if (!carrier || (coefficients.get(2) ?? 0) === 0 && (coefficients.get(1) ?? 0) === 0) {
    return { kind: 'none' };
  }

  const roots = solveLinearOrQuadratic([
    coefficients.get(2) ?? 0,
    coefficients.get(1) ?? 0,
    coefficients.get(0) ?? 0,
  ]);
  if (roots.length === 0) {
    return { kind: 'none' };
  }

  const equations = roots
    .filter((root, index, list) => list.findIndex((candidate) => Math.abs(candidate - root) < EPSILON) === index)
    .filter((root) => !exponentialDomainError(formatBranchValue(root)))
    .map((root) => exponentBranchEquation(carrier!, root));

  if (equations.length === 0) {
    return {
      kind: 'blocked',
      error: 'No real solutions because exponential expressions are always positive.',
    };
  }

  const carrierLabel = carrier.kind === 'exp' ? 'e^x' : `${carrier.baseLatex}^x`;
  const degree = Math.abs(coefficients.get(2) ?? 0) > EPSILON ? 2 : 1;
  const summaryPolynomial = degree === 2
    ? `${formatBranchValue(coefficients.get(2) ?? 0)}t^2${coefficients.get(1) ? `${(coefficients.get(1) ?? 0) >= 0 ? '+' : ''}${formatBranchValue(coefficients.get(1) ?? 0)}t` : ''}${coefficients.get(0) ? `${(coefficients.get(0) ?? 0) >= 0 ? '+' : ''}${formatBranchValue(coefficients.get(0) ?? 0)}` : ''}=0`
    : `${formatBranchValue(coefficients.get(1) ?? 0)}t${coefficients.get(0) ? `${(coefficients.get(0) ?? 0) >= 0 ? '+' : ''}${formatBranchValue(coefficients.get(0) ?? 0)}` : ''}=0`;

  return {
    kind: 'branches',
    equations,
    solveBadges: ['Symbolic Substitution', 'Candidate Checked'],
    solveSummaryText: `Substituted t = ${carrierLabel}, solved ${summaryPolynomial}`,
  };
}

type InverseCarrier =
  | { kind: 'ln'; inner: unknown; innerLatex: string; carrierLatex: string }
  | { kind: 'log'; inner: unknown; innerLatex: string; carrierLatex: string }
  | { kind: 'exp'; inner: unknown; innerLatex: string; carrierLatex: string }
  | { kind: 'power'; inner: unknown; innerLatex: string; carrierLatex: string; baseLatex: string };

function matchInverseCarrier(node: unknown): InverseCarrier | null {
  const normalized = normalizeAst(node);
  if (isNodeArray(normalized) && normalized.length === 2 && normalized[0] === 'Ln') {
    return {
      kind: 'ln',
      inner: normalized[1],
      innerLatex: boxLatex(normalized[1]),
      carrierLatex: boxLatex(normalized),
    };
  }

  if (isNodeArray(normalized) && normalized.length === 2 && normalized[0] === 'Log') {
    return {
      kind: 'log',
      inner: normalized[1],
      innerLatex: boxLatex(normalized[1]),
      carrierLatex: boxLatex(normalized),
    };
  }

  if (isNodeArray(normalized) && normalized.length === 3 && normalized[0] === 'Power') {
    const [, base, exponent] = normalized;
    if (base === 'ExponentialE') {
      return {
        kind: 'exp',
        inner: exponent,
        innerLatex: boxLatex(exponent),
        carrierLatex: boxLatex(normalized),
      };
    }

    const numericBase = numericFromNode(base);
    if (numericBase !== undefined && numericBase > 0 && Math.abs(numericBase - 1) > EPSILON) {
      return {
        kind: 'power',
        inner: exponent,
        innerLatex: boxLatex(exponent),
        carrierLatex: boxLatex(normalized),
        baseLatex: boxLatex(base),
      };
    }
  }

  return null;
}

function parseLinearCarrier(node: unknown): { carrier: InverseCarrier; coefficient: number; constant: number } | null {
  const normalized = normalizeAst(node);
  const directCarrier = matchInverseCarrier(normalized);
  if (directCarrier) {
    return { carrier: directCarrier, coefficient: 1, constant: 0 };
  }

  const { sign, value } = unwrapNegate(normalized);
  const directNegatedCarrier = matchInverseCarrier(value);
  if (sign === -1 && directNegatedCarrier) {
    return { carrier: directNegatedCarrier, coefficient: -1, constant: 0 };
  }

  if (isNodeArray(value) && value[0] === 'Multiply') {
    const factors = flattenMultiply(value);
    const numericFactors: number[] = [];
    let carrier: InverseCarrier | null = null;
    for (const factor of factors) {
      const numeric = numericFromNode(factor);
      if (numeric !== undefined) {
        numericFactors.push(numeric);
        continue;
      }
      const candidate = matchInverseCarrier(factor);
      if (!candidate || carrier) {
        return null;
      }
      carrier = candidate;
    }
    if (carrier && numericFactors.length > 0) {
      return {
        carrier,
        coefficient: sign * numericFactors.reduce((product, numeric) => product * numeric, 1),
        constant: 0,
      };
    }
  }

  if (isNodeArray(normalized) && normalized[0] === 'Add') {
    const terms = flattenAdd(normalized);
    if (terms.length !== 2) {
      return null;
    }

    const first = parseLinearCarrier(terms[0]);
    const second = parseLinearCarrier(terms[1]);
    const firstNumeric = numericFromNode(terms[0]);
    const secondNumeric = numericFromNode(terms[1]);

    if (first && secondNumeric !== undefined) {
      return { ...first, constant: secondNumeric };
    }

    if (second && firstNumeric !== undefined) {
      return { ...second, constant: firstNumeric };
    }
  }

  return null;
}

function inverseEquation(carrier: InverseCarrier, isolatedValueLatex: string): { nextEquationLatex: string; error?: string } {
  if (carrier.kind === 'ln') {
    return {
      nextEquationLatex: `${carrier.innerLatex}=e^{${isolatedValueLatex}}`,
    };
  }

  if (carrier.kind === 'log') {
    return {
      nextEquationLatex: `${carrier.innerLatex}=10^{${isolatedValueLatex}}`,
    };
  }

  const positivityError = exponentialDomainError(isolatedValueLatex);
  if (positivityError) {
    return { nextEquationLatex: '', error: positivityError };
  }

  if (carrier.kind === 'exp') {
    return {
      nextEquationLatex: `${carrier.innerLatex}=\\ln\\left(${isolatedValueLatex}\\right)`,
    };
  }

  return {
    nextEquationLatex: `${carrier.innerLatex}=\\frac{\\ln\\left(${isolatedValueLatex}\\right)}{\\ln\\left(${carrier.baseLatex}\\right)}`,
  };
}

function matchInverseIsolation(equationAst: unknown): SubstitutionSolveResult {
  if (!isNodeArray(equationAst) || equationAst[0] !== 'Equal' || equationAst.length !== 3) {
    return { kind: 'none' };
  }

  const [, left, right] = equationAst;
  const leftLinear = parseLinearCarrier(left);
  const rightLinear = parseLinearCarrier(right);
  const leftConstant = numericFromNode(right);
  const rightConstant = numericFromNode(left);

  let linearCarrier = leftLinear;
  let constant = leftConstant;
  if (!linearCarrier || constant === undefined) {
    linearCarrier = rightLinear;
    constant = rightConstant;
  }

  if (!linearCarrier || constant === undefined || Math.abs(linearCarrier.coefficient) < EPSILON) {
    return { kind: 'none' };
  }

  const isolatedValue = (constant - linearCarrier.constant) / linearCarrier.coefficient;
  const isolatedValueLatex = formatBranchValue(isolatedValue);
  const next = inverseEquation(linearCarrier.carrier, isolatedValueLatex);
  if (next.error) {
    return { kind: 'blocked', error: next.error };
  }

  return {
    kind: 'branches',
    equations: [next.nextEquationLatex],
    solveBadges: ['Inverse Isolation', 'Candidate Checked'],
    solveSummaryText: `Inverted ${linearCarrier.carrier.carrierLatex} into ${next.nextEquationLatex}`,
    domainConstraints: linearCarrier.carrier.kind === 'ln' || linearCarrier.carrier.kind === 'log'
      ? [{ kind: 'positive', expressionLatex: linearCarrier.carrier.innerLatex }]
      : undefined,
  };
}

function nonZeroSideFromEquation(equationLatex: string) {
  const parsed = ce.parse(equationLatex);
  const json = normalizeAst(parsed.json);
  if (!isNodeArray(json) || json[0] !== 'Equal' || json.length !== 3) {
    return null;
  }

  return ['Add', json[1], ['Negate', json[2]]] as unknown;
}

export function matchSubstitutionSolve(
  equationLatex: string,
  angleUnit: AngleUnit,
): SubstitutionSolveResult {
  void angleUnit;
  const zeroForm = nonZeroSideFromEquation(equationLatex);
  if (!zeroForm) {
    return { kind: 'none' };
  }

  const trig = matchTrigPolynomialSubstitution(zeroForm);
  if (trig.kind !== 'none') {
    return trig;
  }

  const exponential = matchExponentialPolynomialSubstitution(zeroForm);
  if (exponential.kind !== 'none') {
    return exponential;
  }

  return matchInverseIsolation(normalizeAst(ce.parse(equationLatex).json));
}
