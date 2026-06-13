import { ComputeEngine } from '@cortex-js/compute-engine';
import type { SolveDomainConstraint } from '../../../types/calculator';
import { normalizeAst } from '../../symbolic-engine/normalize';
import { boxLatex, isNodeArray } from '../../symbolic-engine/patterns';
import { DOMAIN_SAMPLE_STEPS, EPSILON } from './constants';
import type {
  DomainConstraintViolation,
  IntervalDomainCheck,
  LatexEvaluator,
  OneSidedDomainCheck,
} from './types';

const ce = new ComputeEngine();

function isNegativeNumericExponent(node: unknown) {
  return typeof node === 'number' && Number.isFinite(node) && node < 0;
}

function dedupeConstraints(constraints: SolveDomainConstraint[]) {
  const keyed = new Map<string, SolveDomainConstraint>();
  for (const constraint of constraints) {
    keyed.set(JSON.stringify(constraint), constraint);
  }
  return [...keyed.values()];
}

export function collectRealDomainConstraints(node: unknown): SolveDomainConstraint[] {
  const normalized = normalizeAst(node);
  const constraints: SolveDomainConstraint[] = [];

  const visit = (entry: unknown) => {
    if (!isNodeArray(entry) || entry.length === 0 || typeof entry[0] !== 'string') {
      return;
    }

    const [head, ...children] = entry;
    if (head === 'Divide' && children.length === 2) {
      constraints.push({ kind: 'nonzero', expressionLatex: boxLatex(children[1]) });
    }

    if ((head === 'Ln' || head === 'Log') && children.length >= 1) {
      constraints.push({ kind: 'positive', expressionLatex: boxLatex(children[0]) });
    }

    if (head === 'Sqrt' && children.length === 1) {
      constraints.push({ kind: 'nonnegative', expressionLatex: boxLatex(children[0]) });
    }

    if (head === 'Power' && children.length === 2 && isNegativeNumericExponent(children[1])) {
      constraints.push({ kind: 'nonzero', expressionLatex: boxLatex(children[0]) });
    }

    if ((head === 'Arcsin' || head === 'Arccos') && children.length === 1) {
      constraints.push({
        kind: 'expression-interval',
        expressionLatex: boxLatex(children[0]),
        min: -1,
        minInclusive: true,
        max: 1,
        maxInclusive: true,
      });
    }

    for (const child of children) {
      visit(child);
    }
  };

  visit(normalized);
  return dedupeConstraints(constraints);
}

function defaultEvaluateLatexAt(expressionLatex: string, variable: string, value: number) {
  try {
    const parsed = ce.parse(expressionLatex);
    const substituted = parsed.subs({ [variable]: value });
    const evaluated = substituted.evaluate();
    const numeric = evaluated.N?.() ?? evaluated;
    if (typeof numeric.json === 'number' && Number.isFinite(numeric.json)) {
      return numeric.json;
    }
    if (numeric.json && typeof numeric.json === 'object' && 'num' in numeric.json) {
      const parsedNumber = Number((numeric.json as { num: string }).num);
      return Number.isFinite(parsedNumber) ? parsedNumber : null;
    }
  } catch {
    return null;
  }

  return null;
}

export function checkDomainConstraintAtValue(
  constraint: SolveDomainConstraint,
  value: number,
  options: {
    variable?: string;
    evaluateLatex?: LatexEvaluator;
  } = {},
): DomainConstraintViolation | null {
  const variable = options.variable ?? 'x';
  const evaluate = options.evaluateLatex ?? ((expressionLatex, point) => defaultEvaluateLatexAt(expressionLatex, variable, point));

  switch (constraint.kind) {
    case 'interval':
      if (constraint.min !== undefined) {
        if (constraint.minInclusive ? value < constraint.min : value <= constraint.min) {
          return { constraint, message: 'outside the permitted interval' };
        }
      }
      if (constraint.max !== undefined) {
        if (constraint.maxInclusive ? value > constraint.max : value >= constraint.max) {
          return { constraint, message: 'outside the permitted interval' };
        }
      }
      return null;
    case 'nonzero': {
      const numeric = evaluate(constraint.expressionLatex, value);
      return numeric === null || Math.abs(numeric) < EPSILON
        ? { constraint, message: 'would make a denominator zero' }
        : null;
    }
    case 'positive': {
      const numeric = evaluate(constraint.expressionLatex, value);
      return numeric === null || numeric <= 0
        ? { constraint, message: 'would make a logarithm or constrained expression non-positive' }
        : null;
    }
    case 'nonnegative': {
      const numeric = evaluate(constraint.expressionLatex, value);
      return numeric === null || numeric < 0
        ? { constraint, message: 'would make an even root negative' }
        : null;
    }
    case 'expression-interval': {
      const numeric = evaluate(constraint.expressionLatex, value);
      if (numeric === null) {
        return { constraint, message: 'would make a constrained expression non-real' };
      }
      if (constraint.min !== undefined && (constraint.minInclusive ? numeric < constraint.min : numeric <= constraint.min)) {
        return { constraint, message: 'lies outside the permitted expression range' };
      }
      if (constraint.max !== undefined && (constraint.maxInclusive ? numeric > constraint.max : numeric >= constraint.max)) {
        return { constraint, message: 'lies outside the permitted expression range' };
      }
      return null;
    }
    case 'carrier-range':
      return value < constraint.min - EPSILON || value > constraint.max + EPSILON
        ? { constraint, message: 'lies outside the real range of the trig carrier' }
        : null;
    case 'carrier-square-range':
      return value < constraint.min - EPSILON || value > constraint.max + EPSILON
        ? { constraint, message: 'lies outside the real range of the trig square carrier' }
        : null;
    case 'exp-positive':
      return value <= 0
        ? { constraint, message: 'must stay positive for an exponential carrier' }
        : null;
  }
}

export function checkDomainConstraintsAtValue(
  constraints: SolveDomainConstraint[],
  value: number,
  options: {
    variable?: string;
    evaluateLatex?: LatexEvaluator;
  } = {},
) {
  for (const constraint of constraints) {
    const violation = checkDomainConstraintAtValue(constraint, value, options);
    if (violation) {
      return violation;
    }
  }

  return null;
}

export function checkPointRealDomain(input: {
  node: unknown;
  variable?: string;
  value: number;
}): DomainConstraintViolation | null {
  const variable = input.variable ?? 'x';
  return checkDomainConstraintsAtValue(
    collectRealDomainConstraints(input.node),
    input.value,
    { variable },
  );
}

export function checkOneSidedRealDomain(input: {
  node: unknown;
  variable?: string;
  target: number;
  direction: 'left' | 'right';
}): OneSidedDomainCheck {
  const variable = input.variable ?? 'x';
  const constraints = collectRealDomainConstraints(input.node);
  if (constraints.length === 0) {
    return { kind: 'safe', constraints };
  }

  let firstViolation: DomainConstraintViolation | null = null;
  let safeSamples = 0;
  let violatedSamples = 0;

  for (const step of DOMAIN_SAMPLE_STEPS) {
    const samplePoint = input.direction === 'left' ? input.target - step : input.target + step;
    const violation = checkDomainConstraintsAtValue(constraints, samplePoint, { variable });
    if (violation) {
      firstViolation ??= violation;
      violatedSamples += 1;
    } else {
      safeSamples += 1;
    }
  }

  if (safeSamples > 0) {
    return { kind: 'safe', constraints };
  }

  return firstViolation && violatedSamples > 0
    ? { kind: 'outside-domain', constraints, violation: firstViolation }
    : { kind: 'unknown', constraints };
}

export function checkRealIntervalSafety(input: {
  node: unknown;
  variable?: string;
  lower: number;
  upper: number;
}): IntervalDomainCheck {
  const variable = input.variable ?? 'x';
  const constraints = collectRealDomainConstraints(input.node);
  if (constraints.length === 0) {
    return { kind: 'safe', constraints };
  }

  const lower = Math.min(input.lower, input.upper);
  const upper = Math.max(input.lower, input.upper);
  const candidates = new Set<number>([
    lower,
    upper,
    (lower + upper) / 2,
  ]);

  if (lower < 0 && upper > 0) {
    candidates.add(0);
  }
  if (lower <= 1 && upper >= 1) {
    candidates.add(1);
  }
  if (lower <= -1 && upper >= -1) {
    candidates.add(-1);
  }

  for (const value of candidates) {
    const violation = checkDomainConstraintsAtValue(constraints, value, { variable });
    if (violation) {
      return { kind: 'unsafe', constraints, value, violation };
    }
  }

  return { kind: 'safe', constraints };
}
