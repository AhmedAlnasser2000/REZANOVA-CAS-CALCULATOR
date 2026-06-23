import { ComputeEngine } from '@cortex-js/compute-engine';
import type { DisplayBranchReadback, DisplayDetailSection } from '../../../types/calculator';
import {
  addExactScalars,
  buildExactScalarNode,
  divideExactScalars,
  exactPolynomialDegree,
  exactScalarIsZero,
  getExactPolynomialCoefficient,
  multiplyExactScalars,
  negateExactScalar,
  parseExactPolynomial,
  readExactScalarNode,
  type ExactPolynomial,
  type ExactScalar,
} from '../../algebra/polynomial-core';
import { quadraticRootNodes } from '../../algebra/polynomial-factor/quadratic';
import { analyzeVariablesFromLatex } from '../../algebra/variable-core';
import { mathDetailSection } from '../../display/result-detail-lines';
import { substituteCarrierPowerBasis } from '../../symbolic-engine/primitives/substitution/substitution';
import type { EquationSelectedTargetSearchTraceRecorder } from '../equation-target-shape';
import { solveEquationAlgebraicIsolation } from '../equation-algebraic-isolation';
import { finiteBranchReadbackForNormalizedBranches } from '../readback/finite-branches';
import {
  type GeneratedBranchHandoffAttempt,
  type GeneratedBranchHandoffFamily,
  solveGeneratedBranchEquations,
} from './generated-branch-handoff';
import { exactLatexForSolutions } from './generated-handoff';
import { solveParameterizedCarrierEquation } from './carrier';
import { solveParameterizedFactorablePolynomialEquation } from './factorable-polynomial';
import { solveParameterizedLinearEquation } from './linear';
import {
  hasTarget,
  isArrayNode,
  latexForNode,
  simplifyNode,
  type MathJson,
} from './math-json';
import { solveParameterizedPolynomialEquation } from './polynomial';
import { solveParameterizedRationalEquation } from './rational';
import {
  buildParameterizedDetailSections,
  normalizeParameterizedSupplementLatex,
} from './readback';

const ce = new ComputeEngine();
const SOURCE = 'equation-carrier-elimination';
const MAX_CARRIER_ELIMINATION_TARGET_DEGREE = 12;
const EXACT_ZERO = { numerator: 0, denominator: 1 };
const EXACT_ONE = { numerator: 1, denominator: 1 };
const BRANCH_HANDOFF_OPTIONS = { allowGeneratedImplicitProducts: true };

export type ParameterizedCarrierEliminationStopReason =
  | 'parse-error'
  | 'non-equation'
  | 'target-not-found'
  | 'ambiguous-adjacent-product'
  | 'no-carrier-elimination'
  | 'symbolic-coefficients'
  | 'degree-limit'
  | 'unsupported-carrier'
  | 'no-real-carrier-roots'
  | 'branch-unsupported';

export type ParameterizedCarrierEliminationSuccess = {
  kind: 'success';
  target: string;
  parameterNames: string[];
  exactLatex: string;
  branchReadback?: DisplayBranchReadback;
  exactSupplementLatex?: string[];
  detailSections: DisplayDetailSection[];
  branchEquations: string[];
};

export type ParameterizedCarrierEliminationStop = {
  kind: 'unsupported';
  reason: ParameterizedCarrierEliminationStopReason;
  message: string;
  target: string;
  parameterNames: string[];
};

export type ParameterizedCarrierEliminationResult =
  | ParameterizedCarrierEliminationSuccess
  | ParameterizedCarrierEliminationStop;

export type ParameterizedCarrierEliminationOptions = {
  allowGeneratedImplicitProducts?: boolean;
  searchTrace?: EquationSelectedTargetSearchTraceRecorder;
};

type CarrierDescriptor = {
  node: MathJson;
  latex: string;
  key: string;
  targetDegree: number;
};

type CarrierTerm =
  | { kind: 'term'; coefficient: ExactScalar; degree: number; carrier: CarrierDescriptor | null }
  | { kind: 'unsupported'; reason: ParameterizedCarrierEliminationStopReason; message: string };

type CarrierQuadratic =
  | {
      kind: 'ok';
      carrier: CarrierDescriptor;
      totalTargetDegree: number;
      polynomial: ExactPolynomial;
    }
  | { kind: 'unsupported'; reason: ParameterizedCarrierEliminationStopReason; message: string }
  | { kind: 'no-carrier-elimination' };

function stop(
  reason: ParameterizedCarrierEliminationStopReason,
  message: string,
  target: string,
  parameterNames: string[],
): ParameterizedCarrierEliminationStop {
  return { kind: 'unsupported', reason, message, target, parameterNames };
}

function hasAmbiguousAdjacentProduct(latex: string) {
  const analysis = analyzeVariablesFromLatex(latex, { allowSymbolicParameters: true });
  return analysis.implicitCharacterProducts.some((product) => new Set(product.characters).size > 1);
}

function parameterNamesFromLatex(latex: string, target: string) {
  const analysis = analyzeVariablesFromLatex(latex, { allowSymbolicParameters: true });
  return analysis.symbols
    .filter((symbol) =>
      symbol.name !== target
      && (
        symbol.identifierKind === 'named-variable'
        || (symbol.identifierKind === 'single-symbol-variable' && /^[A-Za-z]$/.test(symbol.name))
      ))
    .map((symbol) => symbol.name);
}

function zeroFormNode(json: unknown): MathJson | null {
  if (!isArrayNode(json) || json[0] !== 'Equal' || json.length !== 3) {
    return null;
  }
  return simplifyNode(['Subtract', json[1], json[2]] as MathJson);
}

function splitAdditiveTerms(node: MathJson): MathJson[] {
  if (isArrayNode(node) && node[0] === 'Add') {
    return node.slice(1) as MathJson[];
  }
  if (isArrayNode(node) && node[0] === 'Subtract' && node.length === 3) {
    return [node[1] as MathJson, ['Negate', node[2]] as MathJson];
  }
  const simplified = simplifyNode(node);
  return isArrayNode(simplified) && simplified[0] === 'Add'
    ? simplified.slice(1) as MathJson[]
    : [simplified];
}

function carrierKey(node: MathJson) {
  return JSON.stringify(simplifyNode(node));
}

function exactScalarNode(value: ExactScalar): MathJson {
  return buildExactScalarNode(value) as MathJson;
}

function addCoefficient(coefficients: Map<number, ExactScalar>, degree: number, coefficient: ExactScalar) {
  const previous = coefficients.get(degree) ?? EXACT_ZERO;
  coefficients.set(degree, addExactScalars(previous, coefficient));
}

function multiplyExactCoefficient(left: ExactScalar, right: ExactScalar) {
  return multiplyExactScalars(left, right);
}

function negateCoefficient(value: ExactScalar) {
  return negateExactScalar(value);
}

function disallowedCarrierOperator(operator: string) {
  return new Set([
    'Sin',
    'Cos',
    'Tan',
    'Cot',
    'Sec',
    'Csc',
    'Ln',
    'Log',
    'Exp',
    'Exponential',
  ]).has(operator);
}

function algebraicCarrierDegree(node: MathJson, target: string): number | null {
  if (typeof node === 'string') {
    return node === target ? 1 : 0;
  }
  if (typeof node === 'number' || typeof node === 'boolean' || node === null) {
    return 0;
  }
  if (!isArrayNode(node)) {
    return hasTarget(node, target) ? null : 0;
  }

  const [operator, ...operands] = node;
  if (typeof operator !== 'string') {
    return null;
  }
  if (disallowedCarrierOperator(operator)) {
    return null;
  }
  if (operator === 'Power') {
    const base = operands[0] as MathJson;
    const exponent = operands[1];
    if (typeof exponent !== 'number' || !Number.isInteger(exponent) || exponent <= 0) {
      return null;
    }
    const baseDegree = algebraicCarrierDegree(base, target);
    return baseDegree === null ? null : baseDegree * exponent;
  }
  if (operator === 'Sqrt' || operator === 'Abs') {
    const innerDegree = algebraicCarrierDegree(operands[0] as MathJson, target);
    return innerDegree === null ? null : Math.max(1, innerDegree);
  }
  if (operator === 'Add' || operator === 'Subtract') {
    let degree = 0;
    for (const operand of operands) {
      const next = algebraicCarrierDegree(operand as MathJson, target);
      if (next === null) {
        return null;
      }
      degree = Math.max(degree, next);
    }
    return degree;
  }
  if (operator === 'Negate') {
    return algebraicCarrierDegree(operands[0] as MathJson, target);
  }
  if (operator === 'Multiply' || operator === 'Divide') {
    let degree = 0;
    for (const operand of operands) {
      const next = algebraicCarrierDegree(operand as MathJson, target);
      if (next === null) {
        return null;
      }
      degree += next;
    }
    return degree;
  }

  return hasTarget(node, target) ? null : 0;
}

function readCarrierDescriptor(node: MathJson, target: string): CarrierDescriptor | null {
  if (!hasTarget(node, target)) {
    return null;
  }
  const simplified = simplifyNode(node);
  const targetDegree = algebraicCarrierDegree(simplified, target);
  if (targetDegree === null || targetDegree <= 0) {
    return null;
  }
  return {
    node: simplified,
    latex: latexForNode(simplified),
    key: carrierKey(simplified),
    targetDegree,
  };
}

function parseCarrierPowerFactor(node: MathJson, target: string): { carrier: CarrierDescriptor; degree: number } | null {
  const simplified = simplifyNode(node);
  if (
    isArrayNode(simplified)
    && simplified[0] === 'Power'
    && typeof simplified[2] === 'number'
    && Number.isInteger(simplified[2])
    && simplified[2] > 0
    && hasTarget(simplified[1], target)
  ) {
    const carrier = readCarrierDescriptor(simplified[1] as MathJson, target);
    return carrier ? { carrier, degree: simplified[2] } : null;
  }

  const carrier = readCarrierDescriptor(simplified, target);
  return carrier ? { carrier, degree: 1 } : null;
}

function readCarrierTerm(term: MathJson, target: string): CarrierTerm {
  const simplified = simplifyNode(term);
  if (isArrayNode(simplified) && simplified[0] === 'Negate') {
    const child = readCarrierTerm(simplified[1] as MathJson, target);
    return child.kind === 'term'
      ? { ...child, coefficient: negateCoefficient(child.coefficient) }
      : child;
  }

  const exactTerm = readExactScalarNode(simplified);
  if (exactTerm) {
    return { kind: 'term', coefficient: exactTerm, degree: 0, carrier: null };
  }

  const factors = isArrayNode(simplified) && simplified[0] === 'Multiply'
    ? simplified.slice(1) as MathJson[]
    : [simplified];
  let coefficient = EXACT_ONE;
  let carrier: CarrierDescriptor | null = null;
  let carrierDegree = 0;
  let sawTargetFreeSymbolic = false;

  for (const factor of factors) {
    const exact = readExactScalarNode(factor);
    if (exact) {
      coefficient = multiplyExactCoefficient(coefficient, exact);
      continue;
    }
    if (!hasTarget(factor, target)) {
      sawTargetFreeSymbolic = true;
      continue;
    }
    const parsed = parseCarrierPowerFactor(factor, target);
    if (!parsed) {
      return {
        kind: 'unsupported',
        reason: 'unsupported-carrier',
        message: 'Carrier elimination supports repeated algebraic selected-target carriers only.',
      };
    }
    if (carrier && parsed.carrier.key !== carrier.key) {
      return {
        kind: 'unsupported',
        reason: 'unsupported-carrier',
        message: 'Carrier elimination supports one explicit algebraic carrier at a time.',
      };
    }
    carrier = parsed.carrier;
    carrierDegree += parsed.degree;
  }

  if (sawTargetFreeSymbolic) {
    return {
      kind: 'unsupported',
      reason: 'symbolic-coefficients',
      message: 'Carrier elimination currently requires exact-rational reduced carrier coefficients.',
    };
  }
  if (!carrier) {
    return {
      kind: 'unsupported',
      reason: 'symbolic-coefficients',
      message: 'Carrier elimination currently requires exact-rational reduced carrier coefficients.',
    };
  }

  return { kind: 'term', coefficient, degree: carrierDegree, carrier };
}

function collectCarrierQuadratic(
  zeroForm: MathJson,
  target: string,
): CarrierQuadratic {
  const coefficients = new Map<number, ExactScalar>();
  let carrier: CarrierDescriptor | null = null;

  for (const term of splitAdditiveTerms(zeroForm)) {
    const parsed = readCarrierTerm(term, target);
    if (parsed.kind === 'unsupported') {
      if (parsed.reason === 'symbolic-coefficients') {
        return parsed;
      }
      return parsed;
    }
    if (parsed.carrier) {
      if (carrier && parsed.carrier.key !== carrier.key) {
        return {
          kind: 'unsupported',
          reason: 'unsupported-carrier',
          message: 'Carrier elimination supports one explicit algebraic carrier at a time.',
        };
      }
      carrier = parsed.carrier;
    }
    addCoefficient(coefficients, parsed.degree, parsed.coefficient);
  }

  if (!carrier) {
    return { kind: 'no-carrier-elimination' };
  }
  const positiveDegrees = [...coefficients.entries()]
    .filter(([degree, coefficient]) => degree > 0 && !exactScalarIsZero(coefficient))
    .map(([degree]) => degree)
    .sort((left, right) => left - right);
  const carrierPower = commonPositiveDivisor(positiveDegrees);
  if (!carrierPower) {
    return { kind: 'no-carrier-elimination' };
  }
  const normalizedCarrier = normalizeCarrierPower(carrier, carrierPower);
  for (const degree of positiveDegrees) {
    if (!Number.isInteger(degree / carrierPower)) {
      return { kind: 'no-carrier-elimination' };
    }
  }

  const reduced = substituteCarrierPowerBasis(zeroForm, {
    carrierNode: carrier.node,
    carrierSymbol: 'u',
    powerStep: carrierPower,
  });
  if (reduced.kind === 'unsupported') {
    return reduced.reason === 'power-step-mismatch'
      ? { kind: 'no-carrier-elimination' }
      : {
          kind: 'unsupported',
          reason: 'unsupported-carrier',
          message: reduced.message,
        };
  }

  const polynomial = parseExactPolynomial(reduced.node, 'u', 2);
  if (!polynomial) {
    return {
      kind: 'unsupported',
      reason: 'symbolic-coefficients',
      message: 'Carrier elimination currently requires exact-rational reduced carrier coefficients.',
    };
  }

  const leading = getExactPolynomialCoefficient(polynomial, 2);
  const linear = getExactPolynomialCoefficient(polynomial, 1);
  if (exactScalarIsZero(leading) && exactScalarIsZero(linear)) {
    return { kind: 'no-carrier-elimination' };
  }

  const reducedDegree = exactScalarIsZero(leading) ? 1 : 2;
  const totalTargetDegree = reducedDegree * normalizedCarrier.targetDegree;
  if (totalTargetDegree > MAX_CARRIER_ELIMINATION_TARGET_DEGREE) {
    return {
      kind: 'unsupported',
      reason: 'degree-limit',
      message: `Carrier elimination is capped at total selected-target degree ${MAX_CARRIER_ELIMINATION_TARGET_DEGREE}.`,
    };
  }

  return {
    kind: 'ok',
    carrier: normalizedCarrier,
    totalTargetDegree,
    polynomial,
  };
}

function gcd(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) {
    const next = a % b;
    a = b;
    b = next;
  }
  return a;
}

function commonPositiveDivisor(degrees: number[]) {
  if (degrees.length === 0) {
    return null;
  }
  const divisor = degrees.reduce((current, degree) => gcd(current, degree));
  const maxReducedDegree = Math.max(...degrees.map((degree) => degree / divisor));
  return maxReducedDegree <= 2 ? divisor : null;
}

function normalizeCarrierPower(carrier: CarrierDescriptor, power: number): CarrierDescriptor {
  if (power === 1) {
    return carrier;
  }
  const node = simplifyNode(['Power', carrier.node, power] as MathJson);
  return {
    node,
    latex: latexForNode(node),
    key: carrierKey(node),
    targetDegree: carrier.targetDegree * power,
  };
}

function carrierRoots(polynomial: ExactPolynomial): MathJson[] | 'complex' | 'unsupported' {
  const degree = exactPolynomialDegree(polynomial);
  if (degree === 1) {
    const a = getExactPolynomialCoefficient(polynomial, 1);
    const b = getExactPolynomialCoefficient(polynomial, 0);
    const root = divideExactScalars(negateExactScalar(b), a);
    return root ? [exactScalarNode(root)] : 'unsupported';
  }
  if (degree !== 2) {
    return 'unsupported';
  }

  const roots = quadraticRootNodes(polynomial);
  return roots.kind === 'real'
    ? roots.roots.map((root) => root.node as MathJson)
    : 'complex';
}

function carrierBranchFailureMessage(
  attempts: GeneratedBranchHandoffAttempt[],
) {
  const byFamily = (family: GeneratedBranchHandoffAttempt['family']) =>
    attempts.find((attempt) => attempt.family === family)?.result;
  const rational = byFamily('rational');
  const algebraic = byFamily('algebraic-isolation');
  const carrier = byFamily('carrier');
  const factorable = byFamily('factorable-polynomial');
  const polynomial = byFamily('polynomial');
  const linear = byFamily('linear');

  if (rational && rational.reason !== 'not-rational') {
    return rational.message;
  }
  if (carrier && carrier.reason !== 'no-carrier') {
    return carrier.message;
  }
  if (algebraic && algebraic.reason !== 'no-algebraic-isolation') {
    return algebraic.message;
  }
  if (factorable && factorable.reason !== 'not-factorable') {
    return factorable.message;
  }

  return linear?.message
    ?? polynomial?.message
    ?? rational?.message
    ?? algebraic?.message
    ?? carrier?.message
    ?? factorable?.message
    ?? 'A generated carrier-elimination branch is outside current selected-target solvers.';
}

function dedupe(entries: string[]) {
  return [...new Set(entries.filter(Boolean))];
}

export function solveParameterizedCarrierEliminationEquation(
  equationLatex: string,
  target: string,
  options: ParameterizedCarrierEliminationOptions = {},
): ParameterizedCarrierEliminationResult {
  const parameterNames = parameterNamesFromLatex(equationLatex, target);

  if (!options.allowGeneratedImplicitProducts && hasAmbiguousAdjacentProduct(equationLatex)) {
    return stop(
      'ambiguous-adjacent-product',
      'Adjacent letters must use explicit multiplication before carrier-elimination solving.',
      target,
      parameterNames,
    );
  }

  let parsed: ReturnType<typeof ce.parse>;
  try {
    parsed = ce.parse(equationLatex);
  } catch {
    return stop('parse-error', 'The equation could not be parsed for carrier-elimination solving.', target, parameterNames);
  }

  const json = parsed.json;
  if (!isArrayNode(json) || json[0] !== 'Equal' || json.length !== 3) {
    return stop('non-equation', 'Enter an = equation before carrier-elimination solving.', target, parameterNames);
  }
  if (!hasTarget(json, target)) {
    return stop('target-not-found', `Selected target ${target} was not found in this equation.`, target, parameterNames);
  }

  const zeroForm = zeroFormNode(json);
  if (!zeroForm) {
    return stop('no-carrier-elimination', 'No bounded algebraic carrier-elimination structure was detected.', target, parameterNames);
  }

  const collected = collectCarrierQuadratic(zeroForm, target);
  if (collected.kind === 'no-carrier-elimination') {
    return stop('no-carrier-elimination', 'No bounded algebraic carrier-elimination structure was detected.', target, parameterNames);
  }
  if (collected.kind === 'unsupported') {
    return stop(collected.reason, collected.message, target, parameterNames);
  }

  const roots = carrierRoots(collected.polynomial);
  if (roots === 'unsupported') {
    return stop('no-carrier-elimination', 'No bounded linear or quadratic carrier equation was detected.', target, parameterNames);
  }
  if (roots === 'complex') {
    return stop('no-real-carrier-roots', 'The reduced carrier equation has no real carrier roots.', target, parameterNames);
  }

  const branchEquations = dedupe(roots.map((root) => `${collected.carrier.latex}=${latexForNode(root)}`));
  const branchFamilies: GeneratedBranchHandoffFamily[] = [
    {
      family: 'linear',
      solve: (branchLatex) => solveParameterizedLinearEquation(branchLatex, target, BRANCH_HANDOFF_OPTIONS),
    },
    {
      family: 'polynomial',
      solve: (branchLatex) => solveParameterizedPolynomialEquation(branchLatex, target, BRANCH_HANDOFF_OPTIONS),
    },
    {
      family: 'rational',
      solve: (branchLatex) => solveParameterizedRationalEquation(branchLatex, target, BRANCH_HANDOFF_OPTIONS),
    },
    {
      family: 'factorable-polynomial',
      solve: (branchLatex) => solveParameterizedFactorablePolynomialEquation(branchLatex, target, BRANCH_HANDOFF_OPTIONS),
    },
    {
      family: 'algebraic-isolation',
      solve: (branchLatex) => solveEquationAlgebraicIsolation(branchLatex, target, BRANCH_HANDOFF_OPTIONS),
    },
    {
      family: 'carrier',
      solve: (branchLatex) => solveParameterizedCarrierEquation(branchLatex, target, {
        ...BRANCH_HANDOFF_OPTIONS,
        searchTrace: options.searchTrace,
      }),
    },
  ];
  const solvedBranches = solveGeneratedBranchEquations({
    branchEquations,
    target,
    families: branchFamilies,
    searchTrace: options.searchTrace,
    failureMessage: ({ attempts }) => carrierBranchFailureMessage(attempts),
  });
  if (solvedBranches.kind === 'unsupported') {
    return stop(
      'branch-unsupported',
      `A generated carrier-elimination branch is outside current selected-target solvers. ${solvedBranches.message}`,
      target,
      parameterNames,
    );
  }

  const solutionExpressions = dedupe(solvedBranches.solutionExpressions);
  const exactLatex = exactLatexForSolutions(target, solutionExpressions);
  const detailSections = buildParameterizedDetailSections({
    target,
    parameterNames,
    familyTitle: 'Carrier Elimination Solve',
    familyLines: [
      `Introduced the explicit algebraic carrier u=${collected.carrier.latex}.`,
      'Solved the reduced carrier equation, then back-substituted each carrier root through existing selected-target solvers.',
      `Total selected-target degree: ${collected.totalTargetDegree}.`,
    ],
    extraSections: [mathDetailSection('Carrier Branches', branchEquations)],
  });

  return {
    kind: 'success',
    target,
    parameterNames,
    exactLatex,
    branchReadback: solutionExpressions.length > 1
      ? finiteBranchReadbackForNormalizedBranches({
        targetLatex: target,
        branchesLatex: solutionExpressions,
        preserveOrder: true,
        source: SOURCE,
      })
      : undefined,
    exactSupplementLatex: normalizeParameterizedSupplementLatex(solvedBranches.exactSupplementLatex),
    detailSections,
    branchEquations,
  };
}
