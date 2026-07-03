import type { AngleUnit, DisplayDetailSection } from '../../../types/calculator';
import { readExactScalarNode } from '../../algebra/polynomial-core';
import {
  createPeriodicFamily,
  piRationalFromDegrees,
  renderPeriodicFamilies,
  renderPeriodicFamilyExpression,
  transformPeriodicFamilyForAffineTarget,
  type PeriodicFamily,
} from '../solution/periodic-family';
import { finiteBranchReadbackForNormalizedBranches } from '../readback/finite-branches';
import { dedupe, nonzeroFactForNode as sharedNonzeroFactForNode } from './facts';
import { formatDegreesAsUnitLatex } from '../../trigonometry/angles';
import { solveParameterizedComplexPreimageCarrierEquation } from './complex-preimage-handoff';
import {
  collectTargetAffine,
  collectTrigAffine,
  divideNodes,
  isZeroNode,
  latexForNode,
  negateNode,
  numericValueOfNode,
  subtractTrigAffine,
} from './trig-carrier';
import { buildParameterizedDetailSections, normalizeParameterizedSupplementLatex } from './readback';
import { solveTrigFormulaBranches } from './trig-formula-handoff';
import type { MathJson } from './math-json';
import type {
  ParameterizedTrigSolveOptions,
  ParameterizedTrigSolveResult,
  ParameterizedTrigSolveStop,
  ParameterizedTrigStopReason,
  TargetAffine,
  TrigCarrierKind,
} from './trig-types';
import { simplifyNode } from './math-json';

function stop(
  reason: ParameterizedTrigStopReason,
  message: string,
  target: string,
  parameterNames: string[],
): ParameterizedTrigSolveStop {
  return {
    kind: 'unsupported',
    reason,
    message,
    target,
    parameterNames,
  };
}

function nonzeroFactForNode(node: MathJson): string | null {
  return sharedNonzeroFactForNode(node, latexForNode);
}

function paren(latex: string) {
  return /^[A-Za-z0-9]+$/.test(latex) || /^\\[A-Za-z]+\(.*\)$/.test(latex)
    ? latex
    : `\\left(${latex}\\right)`;
}

export function subtractLatex(left: string, right: string) {
  if (right === '0') {
    return left;
  }
  if (left === '0') {
    return `-${paren(right)}`;
  }
  if (right.startsWith('-')) {
    return `${left}+${right.slice(1)}`;
  }
  return `${left}-${paren(right)}`;
}

function divideLatex(numerator: string, denominator: string) {
  if (denominator === '1') {
    return numerator;
  }
  if (denominator === '-1') {
    return `-${paren(numerator)}`;
  }
  return `\\frac{${numerator}}{${denominator}}`;
}

export function solveArgumentForTarget(argument: TargetAffine, argumentValueLatex: string) {
  const coefficientLatex = latexForNode(argument.coefficient);
  const constantLatex = latexForNode(argument.constant);
  return divideLatex(subtractLatex(argumentValueLatex, constantLatex), coefficientLatex);
}

function inverseLatex(kind: TrigCarrierKind, valueLatex: string) {
  if (kind === 'sin') {
    return `\\arcsin(${valueLatex})`;
  }
  if (kind === 'cos') {
    return `\\arccos(${valueLatex})`;
  }
  return `\\arctan(${valueLatex})`;
}

export function scaledInverseLatex(kind: TrigCarrierKind, valueLatex: string, angleUnit: AngleUnit) {
  const inverse = inverseLatex(kind, valueLatex);
  if (angleUnit === 'rad') {
    return inverse;
  }
  const numerator = angleUnit === 'deg' ? '180' : '200';
  return `\\frac{${numerator}}{\\pi}${inverse}`;
}

function zeroBranchValues(kind: TrigCarrierKind, angleUnit: AngleUnit) {
  if (kind === 'cos') {
    return [
      angleUnit === 'rad'
        ? '\\frac{\\pi}{2}+\\pi n'
        : angleUnit === 'deg'
          ? '90+180n'
          : '100+200n',
    ];
  }

  return [
    angleUnit === 'rad'
      ? '\\pi n'
      : angleUnit === 'deg'
        ? '180n'
        : '200n',
  ];
}

function exactScalarForNode(node: MathJson) {
  return readExactScalarNode(simplifyNode(node));
}

function periodicFamily(
  targetLatex: string,
  offsetDegrees: number,
  periodDegrees: number,
  parameter: string,
) {
  return createPeriodicFamily({
    targetLatex,
    offset: piRationalFromDegrees(offsetDegrees),
    period: piRationalFromDegrees(periodDegrees),
    parameter,
    domain: 'real',
  });
}

function zeroBranchFamilies(kind: TrigCarrierKind, targetLatex: string) {
  return [
    kind === 'cos'
      ? periodicFamily(targetLatex, 90, 180, 'n')
      : periodicFamily(targetLatex, 0, 180, 'n'),
  ];
}

function periodicBranchValues(
  kind: TrigCarrierKind,
  value: MathJson,
  valueLatex: string,
  angleUnit: AngleUnit,
) {
  if (isZeroNode(value)) {
    return zeroBranchValues(kind, angleUnit);
  }

  const specialBranches = specialAngleBranchValues(kind, value, angleUnit);
  if (specialBranches) {
    return specialBranches;
  }

  const inverse = scaledInverseLatex(kind, valueLatex, angleUnit);

  if (kind === 'tan') {
    const period = angleUnit === 'rad' ? '\\pi n' : angleUnit === 'deg' ? '180n' : '200n';
    return [`${inverse}+${period}`];
  }

  const fullPeriod = angleUnit === 'rad' ? '2\\pi n' : angleUnit === 'deg' ? '360n' : '400n';
  if (kind === 'sin') {
    const halfTurn = angleUnit === 'rad' ? '\\pi' : angleUnit === 'deg' ? '180' : '200';
    return [
      `${inverse}+${fullPeriod}`,
      `${halfTurn}-${inverse}+${fullPeriod}`,
    ];
  }

  return [
    `${inverse}+${fullPeriod}`,
    `-${inverse}+${fullPeriod}`,
  ];
}

function periodicBranchFamilies(
  kind: TrigCarrierKind,
  value: MathJson,
  angleUnit: AngleUnit,
  targetLatex: string,
): PeriodicFamily[] | null {
  if (angleUnit !== 'rad') {
    return null;
  }

  if (isZeroNode(value)) {
    return zeroBranchFamilies(kind, targetLatex);
  }

  const cycleDegrees = exactCycleDegreesForNode(kind, value);
  if (!cycleDegrees) {
    return null;
  }

  const periodDegrees = kind === 'tan' ? 180 : 360;
  return cycleDegrees.map((degrees) =>
    periodicFamily(targetLatex, degrees, periodDegrees, 'n'));
}

function closeTo(left: number, right: number) {
  return Math.abs(left - right) <= 1e-9;
}

function exactCycleDegrees(kind: TrigCarrierKind, value: number): number[] | null {
  if (kind === 'sin') {
    if (closeTo(value, 1)) return [90];
    if (closeTo(value, Math.sqrt(3) / 2)) return [60, 120];
    if (closeTo(value, Math.SQRT1_2)) return [45, 135];
    if (closeTo(value, 0.5)) return [30, 150];
    if (closeTo(value, -0.5)) return [210, 330];
    if (closeTo(value, -Math.SQRT1_2)) return [225, 315];
    if (closeTo(value, -Math.sqrt(3) / 2)) return [240, 300];
    if (closeTo(value, -1)) return [270];
    return null;
  }

  if (kind === 'cos') {
    if (closeTo(value, 1)) return [0];
    if (closeTo(value, Math.sqrt(3) / 2)) return [30, 330];
    if (closeTo(value, Math.SQRT1_2)) return [45, 315];
    if (closeTo(value, 0.5)) return [60, 300];
    if (closeTo(value, -0.5)) return [120, 240];
    if (closeTo(value, -Math.SQRT1_2)) return [135, 225];
    if (closeTo(value, -Math.sqrt(3) / 2)) return [150, 210];
    if (closeTo(value, -1)) return [180];
    return null;
  }

  if (closeTo(value, Math.sqrt(3))) return [60];
  if (closeTo(value, 1)) return [45];
  if (closeTo(value, Math.sqrt(3) / 3)) return [30];
  if (closeTo(value, -Math.sqrt(3) / 3)) return [-30];
  if (closeTo(value, -1)) return [-45];
  if (closeTo(value, -Math.sqrt(3))) return [-60];
  return null;
}

function multiplyExactScalars(
  left: { numerator: number; denominator: number },
  right: { numerator: number; denominator: number },
) {
  return {
    numerator: left.numerator * right.numerator,
    denominator: left.denominator * right.denominator,
  };
}

function divideExactScalars(
  left: { numerator: number; denominator: number },
  right: { numerator: number; denominator: number },
) {
  if (right.numerator === 0) {
    return null;
  }
  return {
    numerator: left.numerator * right.denominator,
    denominator: left.denominator * right.numerator,
  };
}

function normalizeExactScalarRatio(value: { numerator: number; denominator: number }) {
  const sign = value.numerator * value.denominator < 0 ? -1 : 1;
  let numerator = Math.abs(value.numerator);
  let denominator = Math.abs(value.denominator);
  while (denominator !== 0) {
    const next = numerator % denominator;
    numerator = denominator;
    denominator = next;
  }
  const divisor = numerator || 1;
  return {
    numerator: sign * (Math.abs(value.numerator) / divisor),
    denominator: Math.abs(value.denominator) / divisor,
  };
}

function isSqrtNode(node: MathJson, radicand: 2 | 3) {
  return Array.isArray(node)
    && node[0] === 'Sqrt'
    && node.length === 2
    && node[1] === radicand;
}

function matchSpecialRadicalValue(node: MathJson): { radicand: 2 | 3; coefficient: { numerator: number; denominator: number } } | null {
  const simplified = simplifyNode(node);
  if (Array.isArray(simplified) && (isSqrtNode(simplified, 2) || isSqrtNode(simplified, 3))) {
    const radicand = simplified[1] as 2 | 3;
    return {
      radicand,
      coefficient: { numerator: 1, denominator: 1 },
    };
  }

  if (!Array.isArray(simplified)) {
    return null;
  }

  if (simplified[0] === 'Negate' && simplified.length === 2) {
    const child = matchSpecialRadicalValue(simplified[1] as MathJson);
    return child
      ? {
        ...child,
        coefficient: {
          numerator: -child.coefficient.numerator,
          denominator: child.coefficient.denominator,
        },
      }
      : null;
  }

  if (simplified[0] === 'Divide' && simplified.length === 3) {
    const numerator = matchSpecialRadicalValue(simplified[1] as MathJson);
    const denominator = exactScalarForNode(simplified[2] as MathJson);
    const coefficient = numerator && denominator
      ? divideExactScalars(numerator.coefficient, denominator)
      : null;
    return numerator && coefficient
      ? { radicand: numerator.radicand, coefficient: normalizeExactScalarRatio(coefficient) }
      : null;
  }

  if (simplified[0] === 'Multiply' && simplified.length >= 3) {
    let coefficient = { numerator: 1, denominator: 1 };
    let radical: { radicand: 2 | 3; coefficient: { numerator: number; denominator: number } } | null = null;
    for (const factor of simplified.slice(1) as MathJson[]) {
      const scalar = exactScalarForNode(factor);
      if (scalar) {
        coefficient = multiplyExactScalars(coefficient, scalar);
        continue;
      }

      const radicalFactor = matchSpecialRadicalValue(factor);
      if (!radicalFactor || radical) {
        return null;
      }
      radical = radicalFactor;
    }
    return radical
      ? {
        radicand: radical.radicand,
        coefficient: normalizeExactScalarRatio(multiplyExactScalars(coefficient, radical.coefficient)),
      }
      : null;
  }

  return null;
}

function exactSpecialAngleNumericValue(value: MathJson) {
  const scalar = exactScalarForNode(value);
  if (scalar) {
    const normalized = normalizeExactScalarRatio(scalar);
    if (
      normalized.denominator === 1
      || (Math.abs(normalized.numerator) === 1 && normalized.denominator === 2)
    ) {
      return normalized.numerator / normalized.denominator;
    }
  }

  const radical = matchSpecialRadicalValue(value);
  if (!radical) {
    return null;
  }
  const { numerator, denominator } = normalizeExactScalarRatio(radical.coefficient);
  const absoluteNumerator = Math.abs(numerator);
  const supported =
    (radical.radicand === 2 && absoluteNumerator === 1 && denominator === 2)
    || (
      radical.radicand === 3
      && (
        (absoluteNumerator === 1 && denominator === 1)
        || (absoluteNumerator === 1 && denominator === 2)
        || (absoluteNumerator === 1 && denominator === 3)
      )
    );
  return supported
    ? (numerator / denominator) * Math.sqrt(radical.radicand)
    : null;
}

function exactCycleDegreesForNode(kind: TrigCarrierKind, value: MathJson) {
  const exactSpecial = exactSpecialAngleNumericValue(value);
  if (exactSpecial !== null) {
    return exactCycleDegrees(kind, exactSpecial);
  }

  const numericValue = numericValueOfNode(value);
  return numericValue === null ? null : exactCycleDegrees(kind, numericValue);
}

function specialAngleBranchValues(kind: TrigCarrierKind, value: MathJson, angleUnit: AngleUnit) {
  if (angleUnit !== 'rad') {
    return null;
  }

  const cycleDegrees = exactCycleDegreesForNode(kind, value);
  if (!cycleDegrees) {
    return null;
  }

  const periodLatex = kind === 'tan' ? '\\pi n' : '2\\pi n';
  return cycleDegrees.map((degrees) => `${formatDegreesAsUnitLatex(degrees, 'rad')}+${periodLatex}`);
}

export function exactLatexForSolutions(target: string, solutionExpressions: string[]) {
  const unique = dedupe(solutionExpressions);
  if (unique.length === 1) {
    const expression = unique[0];
    const bareSymbols = expression.replace(/\\[A-Za-z]+/g, '').replace(/n/g, '');
    return /n/.test(expression) && !/[A-Za-z]/.test(bareSymbols)
      ? `${target}\\in\\left\\{${expression}\\right\\}`
      : `${target}=${expression}`;
  }
  return `${target}\\in\\left\\{${unique.join(',\\ ')}\\right\\}`;
}

export function branchReadbackForSolutions(target: string, solutionExpressions: string[]) {
  return finiteBranchReadbackForNormalizedBranches({
    targetLatex: target,
    branchesLatex: dedupe(solutionExpressions),
    preserveOrder: true,
    source: 'equation-parameterized-trig',
  });
}

function rangeFactForCarrierValue(kind: TrigCarrierKind, value: MathJson, valueLatex: string) {
  if (kind === 'tan') {
    return null;
  }
  const numericValue = numericValueOfNode(value);
  if (numericValue !== null) {
    return numericValue < -1 || numericValue > 1
      ? { kind: 'impossible' as const }
      : null;
  }
  return { kind: 'fact' as const, latex: `-1\\le ${valueLatex}\\le1` };
}

export function solveDirectParameterizedTrigFromJson(
  json: MathJson[],
  target: string,
  angleUnit: AngleUnit,
  parameterNames: string[],
  options: ParameterizedTrigSolveOptions = {},
): ParameterizedTrigSolveResult {
  const left = collectTrigAffine(json[1], target);
  if (left.kind === 'unsupported') {
    return stop(left.reason, left.message, target, parameterNames);
  }

  const right = collectTrigAffine(json[2], target);
  if (right.kind === 'unsupported') {
    return stop(right.reason, right.message, target, parameterNames);
  }

  const normalized = subtractTrigAffine(left.affine, right.affine);
  if (normalized.kind === 'unsupported') {
    return stop(normalized.reason, normalized.message, target, parameterNames);
  }

  const carrier = normalized.affine.carrier;
  if (!carrier) {
    return stop(
      'no-trig',
      'No supported trigonometric selected-target carrier was found.',
      target,
      parameterNames,
    );
  }

  if (isZeroNode(normalized.affine.coefficient)) {
    return stop(
      'unsupported-shell',
      'The selected-target trigonometric carrier cancels before isolation.',
      target,
      parameterNames,
    );
  }

  const carrierValue = divideNodes(negateNode(normalized.affine.constant), normalized.affine.coefficient);
  const carrierValueLatex = latexForNode(carrierValue);
  if (options.complexPreimageHandoff?.domain === 'complex' && parameterNames.length === 0) {
    const carrierEquationLatex = `${carrier.labelLatex}=${carrierValueLatex}`;
    const solved = solveParameterizedComplexPreimageCarrierEquation(
      carrierEquationLatex,
      target,
      options.complexPreimageHandoff,
    );
    if (!solved || solved.answerDomain !== 'complex') {
      return stop(
        'unsupported-branch',
        `The isolated complex trigonometric carrier equation ${carrierEquationLatex} is outside current Complex preimage solvers.`,
        target,
        parameterNames,
      );
    }

    const exactSupplementLatex = normalizeParameterizedSupplementLatex(dedupe([
      nonzeroFactForNode(normalized.affine.coefficient),
      ...(solved.exactSupplementLatex ?? []),
    ].filter((entry): entry is string => Boolean(entry))));
    const detailSections: DisplayDetailSection[] = buildParameterizedDetailSections({
      target,
      parameterNames,
      familyTitle: 'Parameterized Trig Solve',
      familyLines: [
        `Isolated ${carrier.labelLatex}=${carrierValueLatex} with a Complex affine trig-carrier rule.`,
        `Delegated ${carrierEquationLatex} to existing Complex preimage solving.`,
        `Angle unit: ${angleUnit.toUpperCase()}.`,
      ],
      extraSections: (solved.detailSections ?? [])
        .filter((section) => section.title !== 'Solve Target'),
    });

    return {
      kind: 'success',
      target,
      parameterNames,
      exactLatex: solved.exactLatex,
      branchReadback: solved.branchReadback,
      exactSupplementLatex,
      detailSections,
      carrierValueLatex,
      answerDomain: 'complex',
    };
  }

  const rangeFact = rangeFactForCarrierValue(carrier.kind, carrierValue, carrierValueLatex);
  if (rangeFact?.kind === 'impossible') {
    return stop(
      'no-real-solution',
      'No real selected-target solution remains because the trigonometric range check fails.',
      target,
      parameterNames,
    );
  }

  const argumentLatex = latexForNode(carrier.argument);
  const branchFamilies = periodicBranchFamilies(carrier.kind, carrierValue, angleUnit, argumentLatex);
  const branchValues = branchFamilies
    ? branchFamilies.map(renderPeriodicFamilyExpression)
    : periodicBranchValues(carrier.kind, carrierValue, carrierValueLatex, angleUnit);
  const formulaFacts = normalizeParameterizedSupplementLatex(dedupe([
    nonzeroFactForNode(normalized.affine.coefficient),
    rangeFact?.kind === 'fact' ? rangeFact.latex : null,
    'n\\in\\mathbb{Z}',
  ].filter((entry): entry is string => Boolean(entry)))) ?? [];
  const argument = collectTargetAffine(carrier.argument, target);
  if (argument.kind === 'unsupported') {
    if (
      argument.reason === 'non-affine-argument'
      && options.formulaHandoff?.domain === 'real'
    ) {
      const generatedEquations = branchValues.map((branchValue) => `${argumentLatex}=${branchValue}`);
      return solveTrigFormulaBranches({
        generatedEquations,
        generatedFacts: formulaFacts,
        target,
        parameterNames,
        carrierValueLatex,
        familyTitle: 'Parameterized Trig Solve',
        familyLines: [
          `Isolated ${carrier.labelLatex}=${carrierValueLatex} with a direct affine trig-carrier rule.`,
          `Generated ${generatedEquations.length} periodic branch equation${generatedEquations.length === 1 ? '' : 's'} and delegated them to Real formula routes.`,
          `Angle unit: ${angleUnit.toUpperCase()}. The integer family parameter is n.`,
        ],
        searchTrace: options.searchTrace,
      });
    }
    return stop(argument.reason, argument.message, target, parameterNames);
  }

  if (isZeroNode(argument.affine.coefficient)) {
    return stop(
      'zero-argument-coefficient',
      'The selected-target trigonometric argument does not contain a nonzero target coefficient.',
      target,
      parameterNames,
    );
  }

  const coefficientScalar = exactScalarForNode(argument.affine.coefficient);
  const constantScalar = exactScalarForNode(argument.affine.constant);
  const solutionFamilies = coefficientScalar && constantScalar && branchFamilies
    ? branchFamilies
      .map((family) =>
        transformPeriodicFamilyForAffineTarget(family, {
          targetLatex: target,
          coefficient: coefficientScalar,
          constant: constantScalar,
        }))
      .filter((family): family is PeriodicFamily => Boolean(family))
    : null;
  const renderedFamilies = solutionFamilies && solutionFamilies.length === branchFamilies?.length
    ? renderPeriodicFamilies(solutionFamilies, {
      source: 'equation-parameterized-trig',
    })
    : null;
  const solutionExpressions = renderedFamilies
    ? renderedFamilies.branchesLatex
    : branchValues.map((branchValue) =>
      solveArgumentForTarget(argument.affine, branchValue));
  const exactSupplementLatex = normalizeParameterizedSupplementLatex(dedupe([
    nonzeroFactForNode(normalized.affine.coefficient),
    nonzeroFactForNode(argument.affine.coefficient),
    rangeFact?.kind === 'fact' ? rangeFact.latex : null,
    renderedFamilies?.parameterLatex ?? 'n\\in\\mathbb{Z}',
  ].filter((entry): entry is string => Boolean(entry))));

  const detailSections: DisplayDetailSection[] = buildParameterizedDetailSections({
    target,
    parameterNames,
    familyTitle: 'Parameterized Trig Solve',
    familyLines: [
      `Isolated ${carrier.labelLatex}=${carrierValueLatex} with a direct affine trig-carrier rule.`,
      `Angle unit: ${angleUnit.toUpperCase()}. The integer family parameter is n.`,
    ],
  });

  return {
    kind: 'success',
    target,
    parameterNames,
    exactLatex: renderedFamilies?.exactLatex ?? exactLatexForSolutions(target, solutionExpressions),
    branchReadback: renderedFamilies?.branchReadback ?? branchReadbackForSolutions(target, solutionExpressions),
    exactSupplementLatex,
    detailSections,
    carrierValueLatex,
  };
}
