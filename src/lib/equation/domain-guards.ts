import { ComputeEngine } from '@cortex-js/compute-engine';
import type {
  AngleUnit,
  CandidateValidationResult,
  SolveDomainConstraint,
} from '../../types/calculator';
import { checkDomainConstraintAtValue } from '../algebra/domain-range-core';
import { parseSupportedRatio } from '../trigonometry/angles';
import { evaluateRealNumericExpression } from '../numeric/real-numeric-eval';

const ce = new ComputeEngine();
const RESIDUAL_TOLERANCE = 1e-8;
const DIRECT_TRIG_OPERATORS = new Set(['Sin', 'Cos', 'Tan', 'Sec', 'Csc', 'Cot']);
const INVERSE_TRIG_OPERATORS = new Set(['Arcsin', 'Arccos', 'Arctan']);

type BoxedLike = {
  latex: string;
  json: unknown;
  N?: () => BoxedLike;
  evaluate: () => BoxedLike;
  subs: (scope: Record<string, number>) => BoxedLike;
};

function isMathJsonArray(node: unknown): node is unknown[] {
  return Array.isArray(node);
}

function boxLatex(node: unknown) {
  return ce.box(node as Parameters<typeof ce.box>[0]).latex;
}

function isNumericConstantSymbol(symbol: string) {
  return symbol === 'Pi' || symbol === 'ExponentialE';
}

function isNumericOnlyNode(node: unknown): boolean {
  if (typeof node === 'number') {
    return Number.isFinite(node);
  }

  if (typeof node === 'object' && node !== null && 'num' in node) {
    const value = Number((node as { num: string }).num);
    return Number.isFinite(value);
  }

  if (typeof node === 'string') {
    return isNumericConstantSymbol(node);
  }

  if (!isMathJsonArray(node) || node.length === 0) {
    return false;
  }

  return node.slice(1).every((child) => isNumericOnlyNode(child));
}

function rewriteTrigArgumentForAngleUnit(argument: unknown, angleUnit: AngleUnit) {
  if (angleUnit === 'deg') {
    return ['Degrees', argument];
  }

  if (angleUnit === 'grad') {
    return ['Divide', ['Multiply', argument, 'Pi'], 200];
  }

  return argument;
}

function rewriteInverseTrigResultForAngleUnit(node: unknown, angleUnit: AngleUnit) {
  if (angleUnit === 'deg') {
    return ['Divide', ['Multiply', node, 180], 'Pi'];
  }

  if (angleUnit === 'grad') {
    return ['Divide', ['Multiply', node, 200], 'Pi'];
  }

  return node;
}

function rewriteDirectTrigAngles(node: unknown, angleUnit: AngleUnit): unknown {
  if (!isMathJsonArray(node) || node.length === 0) {
    return node;
  }

  const [operator, ...operands] = node;
  const rewrittenOperands = operands.map((operand) => rewriteDirectTrigAngles(operand, angleUnit));

  if (
    typeof operator === 'string'
    && DIRECT_TRIG_OPERATORS.has(operator)
    && rewrittenOperands.length >= 1
    && angleUnit !== 'rad'
    && isNumericOnlyNode(rewrittenOperands[0])
  ) {
    return [
      operator,
      rewriteTrigArgumentForAngleUnit(rewrittenOperands[0], angleUnit),
      ...rewrittenOperands.slice(1),
    ];
  }

  if (
    typeof operator === 'string'
    && INVERSE_TRIG_OPERATORS.has(operator)
    && rewrittenOperands.length >= 1
    && angleUnit !== 'rad'
    && isNumericOnlyNode(rewrittenOperands[0])
  ) {
    return rewriteInverseTrigResultForAngleUnit([operator, ...rewrittenOperands], angleUnit);
  }

  return [operator, ...rewrittenOperands];
}

export function equationToZeroFormLatex(equationLatex: string) {
  const parsed = ce.parse(equationLatex) as BoxedLike;
  const json = parsed.json;
  if (!isMathJsonArray(json) || json[0] !== 'Equal' || json.length !== 3) {
    return equationLatex;
  }

  return boxLatex(['Subtract', json[1], json[2]]);
}

export function readNumericNode(node: unknown): number | null {
  if (typeof node === 'number' && Number.isFinite(node)) {
    return node;
  }

  if (typeof node === 'object' && node !== null && 'num' in node) {
    const value = Number((node as { num: string }).num);
    return Number.isFinite(value) ? value : null;
  }

  if (typeof node === 'string') {
    if (node === 'NaN' || node === 'ComplexInfinity' || node === 'PositiveInfinity' || node === 'NegativeInfinity') {
      return null;
    }

    const value = Number(node);
    return Number.isFinite(value) ? value : null;
  }

  return null;
}

function evaluateLatexWithScope(
  latex: string,
  scope: Record<string, number>,
  angleUnit: AngleUnit = 'rad',
) {
  const expr = ce.parse(latex) as BoxedLike;
  return evaluateBoxedWithScope(expr, scope, angleUnit);
}

function evaluateBoxedWithScope(
  expr: BoxedLike,
  scope: Record<string, number>,
  angleUnit: AngleUnit = 'rad',
) {
  const substituted = expr.subs(scope);
  const rewrittenJson = rewriteDirectTrigAngles(substituted.json, angleUnit);
  const rewrittenLatex = boxLatex(rewrittenJson);
  const evaluated = ce.box(rewrittenJson as Parameters<typeof ce.box>[0]).evaluate();
  const numeric = evaluated.N?.() ?? evaluated;
  let numericValue = readNumericNode(numeric.json);
  if (numericValue === null) {
    const fallback = evaluateRealNumericExpression(rewrittenJson, rewrittenLatex);
    if (fallback.kind === 'success') {
      numericValue = fallback.value;
    }
  }
  return {
    latex: numeric.latex,
    json: numeric.json,
    value: numericValue,
  };
}

export function evaluateLatexAt(latex: string, value: number, angleUnit: AngleUnit = 'rad') {
  return evaluateLatexWithScope(latex, { x: value }, angleUnit);
}

export function evaluateLatexAtTarget(
  latex: string,
  target: string,
  value: number,
  angleUnit: AngleUnit = 'rad',
) {
  return evaluateLatexWithScope(latex, { [target]: value }, angleUnit);
}

export function createLatexTargetEvaluator(
  latex: string,
  target: string,
  angleUnit: AngleUnit = 'rad',
) {
  const expr = ce.parse(latex) as BoxedLike;
  return (value: number) => evaluateBoxedWithScope(expr, { [target]: value }, angleUnit);
}

function checkConstraint(
  constraint: SolveDomainConstraint,
  value: number,
  angleUnit: AngleUnit,
  target = 'x',
  evaluateConstraintLatex?: (expressionLatex: string, point: number) => number | null,
): string | null {
  return checkDomainConstraintAtValue(constraint, value, {
    evaluateLatex: evaluateConstraintLatex ?? ((expressionLatex, point) => target === 'x'
      ? evaluateLatexAt(expressionLatex, point, angleUnit).value
      : evaluateLatexAtTarget(expressionLatex, target, point, angleUnit).value),
  })?.message ?? null;
}

export function createPreparedConstraintCheckerAtTarget(
  target: string,
  constraints: SolveDomainConstraint[] = [],
  angleUnit: AngleUnit = 'rad',
) {
  const evaluators = new Map<string, ReturnType<typeof createLatexTargetEvaluator>>();
  for (const constraint of constraints) {
    if (!('expressionLatex' in constraint) || evaluators.has(constraint.expressionLatex)) {
      continue;
    }
    evaluators.set(
      constraint.expressionLatex,
      createLatexTargetEvaluator(constraint.expressionLatex, target, angleUnit),
    );
  }

  return (value: number): string | null => {
    for (const constraint of constraints) {
      const violation = checkConstraint(
        constraint,
        value,
        angleUnit,
        target,
        (expressionLatex, point) => evaluators.get(expressionLatex)?.(point).value ?? null,
      );
      if (violation) return violation;
    }
    return null;
  };
}

export function checkCandidateAgainstConstraints(
  value: number,
  constraints: SolveDomainConstraint[] = [],
  angleUnit: AngleUnit = 'rad',
): string | null {
  return checkCandidateAgainstConstraintsAtTarget(value, 'x', constraints, angleUnit);
}

export function checkCandidateAgainstConstraintsAtTarget(
  value: number,
  target: string,
  constraints: SolveDomainConstraint[] = [],
  angleUnit: AngleUnit = 'rad',
): string | null {
  for (const constraint of constraints) {
    const violation = checkConstraint(constraint, value, angleUnit, target);
    if (violation) {
      return violation;
    }
  }

  return null;
}

export function trigCarrierDomainError(_kind: 'sin' | 'cos', valueLatex: string) {
  const numeric = parseSupportedRatio(valueLatex);
  if (numeric === null) {
    return null;
  }

  if (numeric < -1 || numeric > 1) {
    return 'No real solutions because sin(x) and cos(x) only take values between -1 and 1.';
  }

  return null;
}

export function trigSquareDomainError(valueLatex: string) {
  const numeric = parseSupportedRatio(valueLatex);
  if (numeric === null) {
    return null;
  }

  if (numeric < 0 || numeric > 1) {
    return 'No real solutions because sin^2(theta) and cos^2(theta) stay between 0 and 1.';
  }

  return null;
}

export function exponentialDomainError(valueLatex: string) {
  const numeric = parseSupportedRatio(valueLatex);
  if (numeric === null) {
    return null;
  }

  if (numeric <= 0) {
    return 'No real solutions because exponential expressions are always positive.';
  }

  return null;
}

export function validateResidual(
  zeroFormLatex: string,
  candidate: number,
  constraints: SolveDomainConstraint[] = [],
  angleUnit: AngleUnit = 'rad',
): CandidateValidationResult {
  return validateResidualAtTarget(zeroFormLatex, 'x', candidate, constraints, angleUnit);
}

export function validateResidualAtTarget(
  zeroFormLatex: string,
  target: string,
  candidate: number,
  constraints: SolveDomainConstraint[] = [],
  angleUnit: AngleUnit = 'rad',
): CandidateValidationResult {
  return createPreparedResidualValidatorAtTarget(
    zeroFormLatex,
    target,
    constraints,
    angleUnit,
  )(candidate);
}

export function createPreparedResidualValidatorAtTarget(
  zeroFormLatex: string,
  target: string,
  constraints: SolveDomainConstraint[] = [],
  angleUnit: AngleUnit = 'rad',
) {
  const validateConstraints = createPreparedConstraintCheckerAtTarget(
    target,
    constraints,
    angleUnit,
  );
  const evaluateResidual = createLatexTargetEvaluator(zeroFormLatex, target, angleUnit);

  return (candidate: number): CandidateValidationResult => {
    const constraintViolation = validateConstraints(candidate);
    if (constraintViolation) {
      return {
        kind: 'rejected',
        value: candidate,
        reason: constraintViolation,
      };
    }

    const evaluated = evaluateResidual(candidate);
    if (evaluated.value === null) {
      return {
        kind: 'rejected',
        value: candidate,
        reason: 'produces an undefined or non-real substitution',
      };
    }

    const residual = Math.abs(evaluated.value);
    if (residual > RESIDUAL_TOLERANCE) {
      return {
        kind: 'rejected',
        value: candidate,
        reason: 'does not satisfy the original equation after substitution',
      };
    }

    return {
      kind: 'accepted',
      value: candidate,
      residual,
    };
  };
}
