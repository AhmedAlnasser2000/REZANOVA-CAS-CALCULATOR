import { ComputeEngine } from '@cortex-js/compute-engine';
import type { AngleUnit, DisplayDetailSection } from '../../types/calculator';
import { analyzeVariablesFromLatex } from '../algebra/variable-core';
import { solveParameterizedCarrierEquation } from './equation-parameterized-carrier';
import { solveParameterizedExpLogEquation } from './equation-parameterized-exp-log';
import { solveParameterizedFactorablePolynomialEquation } from './equation-parameterized-factorable-polynomial';
import { solveParameterizedLinearEquation } from './equation-parameterized-linear';
import { solveParameterizedPolynomialEquation } from './equation-parameterized-polynomial';
import { solveParameterizedRationalEquation } from './equation-parameterized-rational';
import { solveParameterizedTrigEquation } from './equation-parameterized-trig';
import {
  buildParameterizedDetailSections,
  normalizeParameterizedSupplementLatex,
} from './equation-parameterized-readback';

const ce = new ComputeEngine();

type MathJson = string | number | boolean | null | MathJson[] | { [key: string]: MathJson | undefined };

export type ParameterizedCompositionStopReason =
  | 'parse-error'
  | 'non-equation'
  | 'target-not-found'
  | 'ambiguous-adjacent-product'
  | 'no-composition'
  | 'mixed-carriers'
  | 'nested-composition'
  | 'target-outside-carrier'
  | 'unsupported-carrier'
  | 'unsupported-branch'
  | 'domain-empty';

export type ParameterizedCompositionSolveSuccess = {
  kind: 'success';
  target: string;
  parameterNames: string[];
  exactLatex: string;
  exactSupplementLatex?: string[];
  detailSections: DisplayDetailSection[];
  generatedEquationLatex: string[];
};

export type ParameterizedCompositionSolveStop = {
  kind: 'unsupported';
  reason: ParameterizedCompositionStopReason;
  message: string;
  target: string;
  parameterNames: string[];
};

export type ParameterizedCompositionSolveResult =
  | ParameterizedCompositionSolveSuccess
  | ParameterizedCompositionSolveStop;

type CompositionCarrierKind =
  | 'absolute-value'
  | 'square-root'
  | 'square-power'
  | 'exponential'
  | 'logarithm'
  | 'sin'
  | 'cos'
  | 'tan';

type CompositionCarrier = {
  kind: CompositionCarrierKind;
  node: MathJson;
  inner: MathJson;
  labelLatex: string;
  base?: MathJson;
};

type CarrierMatch =
  | { kind: 'matched'; carrier: CompositionCarrier }
  | { kind: 'blocked'; reason: ParameterizedCompositionStopReason; message: string }
  | { kind: 'none' };

type GeneratedBranches =
  | { kind: 'ok'; equations: string[]; facts: string[] }
  | { kind: 'unsupported'; reason: ParameterizedCompositionStopReason; message: string };

type BranchSolveResult =
  | { kind: 'success'; exactLatex: string; exactSupplementLatex?: string[] }
  | { kind: 'unsupported'; message: string };

const EPSILON = 1e-12;

function isArrayNode(node: unknown): node is unknown[] {
  return Array.isArray(node);
}

function hasTarget(node: unknown, target: string): boolean {
  if (typeof node === 'string') {
    return node === target;
  }
  if (isArrayNode(node)) {
    return node.some((entry) => hasTarget(entry, target));
  }
  if (node && typeof node === 'object') {
    return Object.values(node).some((entry) => hasTarget(entry, target));
  }
  return false;
}

function simplifyNode(node: MathJson): MathJson {
  try {
    return ce.box(node as Parameters<typeof ce.box>[0]).simplify().json as MathJson;
  } catch {
    return node;
  }
}

function latexForNode(node: MathJson) {
  return ce.box(simplifyNode(node) as Parameters<typeof ce.box>[0]).latex;
}

function numericFromNode(node: unknown): number | null {
  if (typeof node === 'number') {
    return node;
  }
  if (
    isArrayNode(node)
    && node[0] === 'Rational'
    && typeof node[1] === 'number'
    && typeof node[2] === 'number'
    && node[2] !== 0
  ) {
    return node[1] / node[2];
  }
  return null;
}

function numericValueOfNode(node: MathJson): number | null {
  return numericFromNode(simplifyNode(node));
}

function nodeHasSymbol(node: MathJson) {
  return analyzeVariablesFromLatex(latexForNode(node), {
    allowSymbolicParameters: true,
  }).symbols.length > 0;
}

function positiveFactForNode(node: MathJson): string | null {
  return nodeHasSymbol(node) ? `${latexForNode(node)}>0` : null;
}

function nonnegativeFactForNode(node: MathJson): string | null {
  return nodeHasSymbol(node) ? `${latexForNode(node)}\\ge0` : null;
}

function notOneFactForNode(node: MathJson): string | null {
  return nodeHasSymbol(node) ? `${latexForNode(node)}\\ne1` : null;
}

function isValidNumericBase(value: number) {
  return Number.isFinite(value) && value > 0 && Math.abs(value - 1) > EPSILON;
}

function isSymbolicBase(node: MathJson) {
  return numericValueOfNode(node) === null && node !== 'ExponentialE';
}

function baseFacts(base: MathJson | undefined) {
  if (!base || !isSymbolicBase(base)) {
    return [];
  }
  return [
    positiveFactForNode(base),
    notOneFactForNode(base),
  ].filter((entry): entry is string => Boolean(entry));
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
      && symbol.name !== 'n'
      && symbol.identifierKind === 'single-symbol-variable'
      && /^[A-Za-z]$/.test(symbol.name))
    .map((symbol) => symbol.name);
}

function containsNestedCompositionCarrier(node: unknown, target: string): boolean {
  if (!isArrayNode(node)) {
    return false;
  }

  const [operator, ...operands] = node;
  if (
    (operator === 'Abs' || operator === 'Sqrt' || operator === 'Ln' || operator === 'Sin' || operator === 'Cos' || operator === 'Tan')
    && operands.some((operand) => hasTarget(operand, target))
  ) {
    return true;
  }
  if (operator === 'Log' && operands.some((operand) => hasTarget(operand, target))) {
    return true;
  }
  if (
    operator === 'Power'
    && operands.length === 2
    && hasTarget(operands[1], target)
    && !hasTarget(operands[0], target)
  ) {
    return true;
  }

  return operands.some((operand) => containsNestedCompositionCarrier(operand, target));
}

function selectedCompositionCarrierCount(node: unknown, target: string): number {
  if (!isArrayNode(node)) {
    return 0;
  }

  const [operator, ...operands] = node;
  const current = (
    (operator === 'Abs' || operator === 'Sqrt' || operator === 'Ln' || operator === 'Log' || operator === 'Sin' || operator === 'Cos' || operator === 'Tan')
    && operands.some((operand) => hasTarget(operand, target))
  ) || (
    operator === 'Power'
    && operands.length === 2
    && hasTarget(operands[1], target)
    && !hasTarget(operands[0], target)
  )
    ? 1
    : 0;
  return current + operands.reduce<number>(
    (sum, operand) => sum + selectedCompositionCarrierCount(operand, target),
    0,
  );
}

function matchCompositionCarrier(node: unknown, target: string): CarrierMatch {
  if (!isArrayNode(node)) {
    return { kind: 'none' };
  }

  const [operator, ...operands] = node;
  if ((operator === 'Abs' || operator === 'Sqrt') && operands.length === 1 && hasTarget(operands[0], target)) {
    const inner = operands[0] as MathJson;
    if (containsNestedCompositionCarrier(inner, target)) {
      return {
        kind: 'blocked',
        reason: 'nested-composition',
        message: 'PARAM11 only inverts one selected-target composition layer at a time.',
      };
    }
    return {
      kind: 'matched',
      carrier: {
        kind: operator === 'Abs' ? 'absolute-value' : 'square-root',
        node: node as MathJson,
        inner,
        labelLatex: latexForNode(node as MathJson),
      },
    };
  }

  if (operator === 'Power' && operands.length === 2) {
    const [base, exponent] = operands as MathJson[];
    if (exponent === 2 && hasTarget(base, target)) {
      if (containsNestedCompositionCarrier(base, target)) {
        return {
          kind: 'blocked',
          reason: 'nested-composition',
          message: 'PARAM11 only inverts one selected-target composition layer at a time.',
        };
      }
      return {
        kind: 'matched',
        carrier: {
          kind: 'square-power',
          node: node as MathJson,
          inner: base,
          labelLatex: latexForNode(node as MathJson),
        },
      };
    }
    if (!hasTarget(base, target) && hasTarget(exponent, target)) {
      if (containsNestedCompositionCarrier(exponent, target)) {
        return {
          kind: 'blocked',
          reason: 'nested-composition',
          message: 'PARAM11 only inverts one selected-target composition layer at a time.',
        };
      }
      const numericBase = numericValueOfNode(base);
      if (numericBase !== null && !isValidNumericBase(numericBase)) {
        return {
          kind: 'blocked',
          reason: 'unsupported-carrier',
          message: 'Exponential composition bases must be positive and not equal to 1.',
        };
      }
      return {
        kind: 'matched',
        carrier: {
          kind: 'exponential',
          node: node as MathJson,
          inner: exponent,
          base,
          labelLatex: latexForNode(node as MathJson),
        },
      };
    }
  }

  if ((operator === 'Ln' || operator === 'Log') && operands.length >= 1 && hasTarget(operands[0], target)) {
    const inner = operands[0] as MathJson;
    if (containsNestedCompositionCarrier(inner, target)) {
      return {
        kind: 'blocked',
        reason: 'nested-composition',
        message: 'PARAM11 only inverts one selected-target composition layer at a time.',
      };
    }
    const base = operator === 'Log' && operands.length === 2 ? operands[1] as MathJson : undefined;
    if (base && hasTarget(base, target)) {
      return {
        kind: 'blocked',
        reason: 'unsupported-carrier',
        message: 'PARAM11 does not invert logarithms whose base also contains the selected target.',
      };
    }
    const numericBase = base ? numericValueOfNode(base) : null;
    if (numericBase !== null && !isValidNumericBase(numericBase)) {
      return {
        kind: 'blocked',
        reason: 'unsupported-carrier',
        message: 'Logarithmic composition bases must be positive and not equal to 1.',
      };
    }
    return {
      kind: 'matched',
      carrier: {
        kind: 'logarithm',
        node: node as MathJson,
        inner,
        base,
        labelLatex: latexForNode(node as MathJson),
      },
    };
  }

  if ((operator === 'Sin' || operator === 'Cos' || operator === 'Tan') && operands.length === 1 && hasTarget(operands[0], target)) {
    const inner = operands[0] as MathJson;
    if (containsNestedCompositionCarrier(inner, target)) {
      return {
        kind: 'blocked',
        reason: 'nested-composition',
        message: 'PARAM11 only inverts one selected-target composition layer at a time.',
      };
    }
    const kind = operator === 'Sin' ? 'sin' : operator === 'Cos' ? 'cos' : 'tan';
    return {
      kind: 'matched',
      carrier: {
        kind,
        node: node as MathJson,
        inner,
        labelLatex: latexForNode(node as MathJson),
      },
    };
  }

  return { kind: 'none' };
}

function stop(
  reason: ParameterizedCompositionStopReason,
  message: string,
  target: string,
  parameterNames: string[],
): ParameterizedCompositionSolveStop {
  return {
    kind: 'unsupported',
    reason,
    message,
    target,
    parameterNames,
  };
}

function dedupe(entries: string[]) {
  return [...new Set(entries.filter(Boolean))];
}

function negateLatex(latex: string) {
  return latex.startsWith('-') ? latex.slice(1) : `-${paren(latex)}`;
}

function paren(latex: string) {
  return /^[A-Za-z0-9]+$/.test(latex) || /^\\[A-Za-z]+\(.+\)$/.test(latex)
    ? latex
    : `\\left(${latex}\\right)`;
}

function baseLatex(base: MathJson | undefined) {
  if (!base || base === 'ExponentialE') {
    return 'e';
  }
  return latexForNode(base);
}

function logarithmLatex(base: MathJson | undefined, value: MathJson) {
  const valueLatex = latexForNode(value);
  if (!base || base === 'ExponentialE') {
    return `\\ln\\left(${valueLatex}\\right)`;
  }
  const numericBase = numericValueOfNode(base);
  if (numericBase !== null && Math.abs(numericBase - 10) <= EPSILON) {
    return `\\log\\left(${valueLatex}\\right)`;
  }
  return `\\log_{${baseLatex(base)}}\\left(${valueLatex}\\right)`;
}

function powerLatex(base: MathJson | undefined, exponent: MathJson) {
  const exponentLatex = latexForNode(exponent);
  if (!base || base === 'ExponentialE') {
    return `e^{${exponentLatex}}`;
  }
  return `${baseLatex(base)}^{${exponentLatex}}`;
}

function generatedEquationsForCarrier(
  carrier: CompositionCarrier,
  value: MathJson,
  angleUnit: AngleUnit,
): GeneratedBranches {
  const innerLatex = latexForNode(carrier.inner);
  const valueLatex = latexForNode(value);

  if (carrier.kind === 'absolute-value') {
    const numericValue = numericValueOfNode(value);
    if (numericValue !== null && numericValue < 0) {
      return {
        kind: 'unsupported',
        reason: 'domain-empty',
        message: 'No real selected-target solution remains because absolute-value outputs are nonnegative.',
      };
    }
    return {
      kind: 'ok',
      equations: [
        `${innerLatex}=${valueLatex}`,
        `${innerLatex}=${negateLatex(valueLatex)}`,
      ],
      facts: [nonnegativeFactForNode(value)].filter((entry): entry is string => Boolean(entry)),
    };
  }

  if (carrier.kind === 'square-root') {
    const numericValue = numericValueOfNode(value);
    if (numericValue !== null && numericValue < 0) {
      return {
        kind: 'unsupported',
        reason: 'domain-empty',
        message: 'No real selected-target solution remains because square-root outputs are nonnegative.',
      };
    }
    return {
      kind: 'ok',
      equations: [`${innerLatex}=${latexForNode(['Power', value, 2] as MathJson)}`],
      facts: [nonnegativeFactForNode(value)].filter((entry): entry is string => Boolean(entry)),
    };
  }

  if (carrier.kind === 'square-power') {
    return {
      kind: 'ok',
      equations: [
        `${innerLatex}=\\sqrt{${valueLatex}}`,
        `${innerLatex}=-\\sqrt{${valueLatex}}`,
      ],
      facts: [nonnegativeFactForNode(value)].filter((entry): entry is string => Boolean(entry)),
    };
  }

  if (carrier.kind === 'exponential') {
    const numericValue = numericValueOfNode(value);
    if (numericValue !== null && numericValue <= 0) {
      return {
        kind: 'unsupported',
        reason: 'domain-empty',
        message: 'No real selected-target solution remains because exponential outputs must be positive.',
      };
    }
    return {
      kind: 'ok',
      equations: [`${innerLatex}=${logarithmLatex(carrier.base, value)}`],
      facts: [
        ...baseFacts(carrier.base),
        positiveFactForNode(value),
      ].filter((entry): entry is string => Boolean(entry)),
    };
  }

  if (carrier.kind === 'logarithm') {
    return {
      kind: 'ok',
      equations: [`${innerLatex}=${powerLatex(carrier.base, value)}`],
      facts: [
        ...baseFacts(carrier.base),
        positiveFactForNode(carrier.inner),
      ].filter((entry): entry is string => Boolean(entry)),
    };
  }

  return generatedTrigEquations(carrier, value, angleUnit);
}

function generatedTrigEquations(
  carrier: CompositionCarrier,
  value: MathJson,
  angleUnit: AngleUnit,
): GeneratedBranches {
  const valueLatex = latexForNode(value);
  const numericValue = numericValueOfNode(value);
  if ((carrier.kind === 'sin' || carrier.kind === 'cos') && numericValue !== null && (numericValue < -1 || numericValue > 1)) {
    return {
      kind: 'unsupported',
      reason: 'domain-empty',
      message: 'No real selected-target solution remains because the trigonometric range check fails.',
    };
  }

  const inverse = inverseTrigLatex(carrier.kind, valueLatex, angleUnit);
  const innerLatex = latexForNode(carrier.inner);
  const period = angleUnit === 'rad' ? '2\\pi n' : angleUnit === 'deg' ? '360n' : '400n';
  const tanPeriod = angleUnit === 'rad' ? '\\pi n' : angleUnit === 'deg' ? '180n' : '200n';
  const halfTurn = angleUnit === 'rad' ? '\\pi' : angleUnit === 'deg' ? '180' : '200';
  const branchValues = carrier.kind === 'tan'
    ? [`${inverse}+${tanPeriod}`]
    : carrier.kind === 'sin'
      ? [`${inverse}+${period}`, `${halfTurn}-${inverse}+${period}`]
      : [`${inverse}+${period}`, `-${inverse}+${period}`];

  return {
    kind: 'ok',
    equations: branchValues.map((branch) => `${innerLatex}=${branch}`),
    facts: [
      carrier.kind === 'tan' ? null : (nodeHasSymbol(value) ? `-1\\le ${valueLatex}\\le1` : null),
      'n\\in\\mathbb{Z}',
    ].filter((entry): entry is string => Boolean(entry)),
  };
}

function inverseTrigLatex(kind: CompositionCarrierKind, valueLatex: string, angleUnit: AngleUnit) {
  const inverse = kind === 'sin'
    ? `\\arcsin(${valueLatex})`
    : kind === 'cos'
      ? `\\arccos(${valueLatex})`
      : `\\arctan(${valueLatex})`;
  if (angleUnit === 'rad') {
    return inverse;
  }
  const numerator = angleUnit === 'deg' ? '180' : '200';
  return `\\frac{${numerator}}{\\pi}${inverse}`;
}

function solveBranchEquation(equationLatex: string, target: string, angleUnit: AngleUnit): BranchSolveResult {
  const options = { allowGeneratedImplicitProducts: true };
  const linear = solveParameterizedLinearEquation(equationLatex, target, options);
  if (linear.kind === 'success') {
    return linear;
  }

  const polynomial = solveParameterizedPolynomialEquation(equationLatex, target, options);
  if (polynomial.kind === 'success') {
    return polynomial;
  }

  const rational = solveParameterizedRationalEquation(equationLatex, target, options);
  if (rational.kind === 'success') {
    return rational;
  }

  const factorable = solveParameterizedFactorablePolynomialEquation(equationLatex, target);
  if (factorable.kind === 'success') {
    return factorable;
  }

  const carrier = solveParameterizedCarrierEquation(equationLatex, target);
  if (carrier.kind === 'success') {
    return carrier;
  }

  const expLog = solveParameterizedExpLogEquation(equationLatex, target);
  if (expLog.kind === 'success') {
    return expLog;
  }

  const trig = solveParameterizedTrigEquation(equationLatex, target, angleUnit);
  if (trig.kind === 'success') {
    return trig;
  }

  return {
    kind: 'unsupported',
    message: rational.reason !== 'not-rational'
      ? rational.message
      : trig.reason !== 'no-trig'
        ? trig.message
        : expLog.reason !== 'no-exp-log'
          ? expLog.message
          : carrier.reason !== 'no-carrier'
            ? carrier.message
            : factorable.reason !== 'not-factorable'
              ? factorable.message
              : polynomial.message,
  };
}

function solutionExpressionsFromExactLatex(exactLatex: string, target: string) {
  const equalityPrefix = `${target}=`;
  if (exactLatex.startsWith(equalityPrefix)) {
    return [exactLatex.slice(equalityPrefix.length)];
  }

  const setPrefix = `${target}\\in\\left\\{`;
  if (exactLatex.startsWith(setPrefix) && exactLatex.endsWith('\\right\\}')) {
    return exactLatex
      .slice(setPrefix.length, -'\\right\\}'.length)
      .split(/,\\\s*/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [exactLatex];
}

function exactLatexForSolutions(target: string, solutionExpressions: string[]) {
  const unique = dedupe(solutionExpressions);
  if (unique.length === 1) {
    return `${target}=${unique[0]}`;
  }
  return `${target}\\in\\left\\{${unique.join(',\\ ')}\\right\\}`;
}

export function solveParameterizedCompositionEquation(
  equationLatex: string,
  target: string,
  angleUnit: AngleUnit,
): ParameterizedCompositionSolveResult {
  const parameterNames = parameterNamesFromLatex(equationLatex, target);

  if (hasAmbiguousAdjacentProduct(equationLatex)) {
    return stop(
      'ambiguous-adjacent-product',
      'Adjacent letters must use explicit multiplication before parameterized composition solving.',
      target,
      parameterNames,
    );
  }

  let parsed: ReturnType<typeof ce.parse>;
  try {
    parsed = ce.parse(equationLatex);
  } catch {
    return stop('parse-error', 'The equation could not be parsed for parameterized composition solving.', target, parameterNames);
  }

  const json = parsed.json;
  if (!isArrayNode(json) || json[0] !== 'Equal' || json.length !== 3) {
    return stop('non-equation', 'Enter an = equation before parameterized composition solving.', target, parameterNames);
  }

  if (!hasTarget(json, target)) {
    return stop('target-not-found', `Selected target ${target} was not found in this equation.`, target, parameterNames);
  }

  const [left, right] = [json[1] as MathJson, json[2] as MathJson];
  const candidates = [
    { carrierSide: left, valueSide: right },
    { carrierSide: right, valueSide: left },
  ];
  const carrierCounts = selectedCompositionCarrierCount(json, target);
  if (carrierCounts > 1) {
    return stop(
      'mixed-carriers',
      'PARAM11 supports one outer selected-target carrier only; mixed or nested carriers are reserved for PARAM12.',
      target,
      parameterNames,
    );
  }

  for (const candidate of candidates) {
    const match = matchCompositionCarrier(candidate.carrierSide, target);
    if (match.kind === 'blocked') {
      return stop(match.reason, match.message, target, parameterNames);
    }
    if (match.kind === 'none') {
      continue;
    }
    if (hasTarget(candidate.valueSide, target)) {
      return stop(
        'target-outside-carrier',
        'PARAM11 requires the selected target to appear only inside the one outer composition carrier.',
        target,
        parameterNames,
      );
    }

    const generated = generatedEquationsForCarrier(match.carrier, candidate.valueSide, angleUnit);
    if (generated.kind === 'unsupported') {
      return stop(generated.reason, generated.message, target, parameterNames);
    }

    const solvedBranches = generated.equations.map((branchLatex) =>
      solveBranchEquation(branchLatex, target, angleUnit));
    const failedBranch = solvedBranches.find((entry) => entry.kind === 'unsupported');
    if (failedBranch?.kind === 'unsupported') {
      return stop(
        'unsupported-branch',
        `A generated composition branch is outside current selected-target parameter solvers. ${failedBranch.message}`,
        target,
        parameterNames,
      );
    }

    const successfulBranches = solvedBranches.filter(
      (entry): entry is Extract<BranchSolveResult, { kind: 'success' }> => entry.kind === 'success',
    );
    const solutionExpressions = successfulBranches.flatMap((branch) =>
      solutionExpressionsFromExactLatex(branch.exactLatex, target));
    const exactSupplementLatex = normalizeParameterizedSupplementLatex(dedupe([
      ...generated.facts,
      ...successfulBranches.flatMap((branch) => branch.exactSupplementLatex ?? []),
    ]));
    const detailSections: DisplayDetailSection[] = buildParameterizedDetailSections({
      target,
      parameterNames,
      familyTitle: 'Parameterized Composition Handoff',
      familyLines: [
        `Inverted one outer composition layer ${match.carrier.labelLatex} around the selected target.`,
        `Generated ${generated.equations.length} branch equation${generated.equations.length === 1 ? '' : 's'} and delegated them to existing selected-target solvers.`,
      ],
      extraSections: [{
        title: 'Composition Branches',
        lines: generated.equations,
      }],
    });

    return {
      kind: 'success',
      target,
      parameterNames,
      exactLatex: exactLatexForSolutions(target, solutionExpressions),
      exactSupplementLatex,
      detailSections,
      generatedEquationLatex: generated.equations,
    };
  }

  return stop(
    carrierCounts > 0 ? 'target-outside-carrier' : 'no-composition',
    'No supported one-layer selected-target composition handoff was found for PARAM11.',
    target,
    parameterNames,
  );
}
