import type { AngleUnit, DisplayDetailSection } from '../../../types/calculator';
import { finiteBranchReadbackMetadata } from '../../display/branch-readback';
import { dedupe, nonzeroFactForNode as sharedNonzeroFactForNode } from './facts';
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
import type { MathJson } from './math-json';
import type {
  ParameterizedTrigSolveResult,
  ParameterizedTrigSolveStop,
  ParameterizedTrigStopReason,
  TargetAffine,
  TrigCarrierKind,
} from './trig-types';

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

function periodicBranchValues(kind: TrigCarrierKind, valueLatex: string, angleUnit: AngleUnit) {
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

export function exactLatexForSolutions(target: string, solutionExpressions: string[]) {
  const unique = dedupe(solutionExpressions);
  if (unique.length === 1) {
    return `${target}=${unique[0]}`;
  }
  return `${target}\\in\\left\\{${unique.join(',\\ ')}\\right\\}`;
}

export function branchReadbackForSolutions(target: string, solutionExpressions: string[]) {
  return finiteBranchReadbackMetadata({
    targetLatex: target,
    branchesLatex: dedupe(solutionExpressions),
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

  const argument = collectTargetAffine(carrier.argument, target);
  if (argument.kind === 'unsupported') {
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

  const carrierValue = divideNodes(negateNode(normalized.affine.constant), normalized.affine.coefficient);
  const carrierValueLatex = latexForNode(carrierValue);
  const rangeFact = rangeFactForCarrierValue(carrier.kind, carrierValue, carrierValueLatex);
  if (rangeFact?.kind === 'impossible') {
    return stop(
      'no-real-solution',
      'No real selected-target solution remains because the trigonometric range check fails.',
      target,
      parameterNames,
    );
  }

  const branchValues = periodicBranchValues(carrier.kind, carrierValueLatex, angleUnit);
  const solutionExpressions = branchValues.map((branchValue) =>
    solveArgumentForTarget(argument.affine, branchValue),
  );
  const exactSupplementLatex = normalizeParameterizedSupplementLatex(dedupe([
    nonzeroFactForNode(normalized.affine.coefficient),
    nonzeroFactForNode(argument.affine.coefficient),
    rangeFact?.kind === 'fact' ? rangeFact.latex : null,
    'n\\in\\mathbb{Z}',
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
    exactLatex: exactLatexForSolutions(target, solutionExpressions),
    branchReadback: branchReadbackForSolutions(target, solutionExpressions),
    exactSupplementLatex,
    detailSections,
    carrierValueLatex,
  };
}
