import type { AngleUnit, DisplayDetailSection } from '../../../types/calculator';
import {
  dedupe,
  nodeHasSymbol as sharedNodeHasSymbol,
  nonzeroFactForNode as sharedNonzeroFactForNode,
  positiveFactForNode as sharedPositiveFactForNode,
} from './facts';
import {
  addNodes,
  collectMixedTrigAffine,
  collectTargetAffine,
  divideNodes,
  isZeroNode,
  latexForNode,
  negateNode,
  numericValueOfNode,
  squareNode,
  subtractMixedTrigAffine,
} from './trig-carrier';
import { simplifyNode } from './math-json';
import { buildParameterizedDetailSections, normalizeParameterizedSupplementLatex } from './readback';
import { solveTrigFormulaBranches } from './trig-formula-handoff';
import {
  branchReadbackForSolutions,
  exactLatexForSolutions,
  scaledInverseLatex,
  solveArgumentForTarget,
  subtractLatex,
} from './trig-direct';
import type { MathJson } from './math-json';
import type {
  ParameterizedTrigSolveOptions,
  ParameterizedTrigSolveResult,
  ParameterizedTrigSolveStop,
  ParameterizedTrigStopReason,
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

function positiveFactForNode(node: MathJson): string | null {
  return sharedPositiveFactForNode(node, latexForNode);
}

function nonzeroFactForNode(node: MathJson): string | null {
  return sharedNonzeroFactForNode(node, latexForNode);
}

function nodeHasSymbol(node: MathJson) {
  return sharedNodeHasSymbol(node, latexForNode);
}

function phaseLatexForMixedCoefficients(
  sinCoefficient: MathJson,
  cosCoefficient: MathJson,
  angleUnit: AngleUnit,
) {
  const sinLatex = latexForNode(sinCoefficient);
  const cosLatex = latexForNode(cosCoefficient);
  const phase = `\\operatorname{atan2}\\left(${cosLatex},${sinLatex}\\right)`;
  if (angleUnit === 'rad') {
    return phase;
  }
  const numerator = angleUnit === 'deg' ? '180' : '200';
  return `\\frac{${numerator}}{\\pi}${phase}`;
}

function mixedPeriodLatex(angleUnit: AngleUnit) {
  if (angleUnit === 'rad') {
    return '2\\pi n';
  }
  return angleUnit === 'deg' ? '360n' : '400n';
}

function mixedHalfTurnLatex(angleUnit: AngleUnit) {
  if (angleUnit === 'rad') {
    return '\\pi';
  }
  return angleUnit === 'deg' ? '180' : '200';
}

function mixedRangeFact(
  rhs: MathJson,
  amplitude: MathJson,
  amplitudeSquare: MathJson,
  sinCoefficient: MathJson,
  cosCoefficient: MathJson,
) {
  const sinNumeric = numericValueOfNode(sinCoefficient);
  const cosNumeric = numericValueOfNode(cosCoefficient);
  const rhsNumeric = numericValueOfNode(rhs);
  if (sinNumeric !== null && cosNumeric !== null && rhsNumeric !== null) {
    const amplitudeNumeric = Math.hypot(sinNumeric, cosNumeric);
    return Math.abs(rhsNumeric) > amplitudeNumeric
      ? { kind: 'impossible' as const }
      : null;
  }

  if (!nodeHasSymbol(rhs) && !nodeHasSymbol(amplitudeSquare)) {
    return null;
  }

  const rhsLatex = latexForNode(rhs);
  const amplitudeLatex = latexForNode(amplitude);
  return { kind: 'fact' as const, latex: `-${amplitudeLatex}\\le ${rhsLatex}\\le ${amplitudeLatex}` };
}

export function solveMixedParameterizedTrigFromJson(
  json: MathJson[],
  target: string,
  angleUnit: AngleUnit,
  parameterNames: string[],
  options: ParameterizedTrigSolveOptions = {},
): ParameterizedTrigSolveResult {
  const left = collectMixedTrigAffine(json[1], target);
  if (left.kind === 'unsupported') {
    return stop(left.reason, left.message, target, parameterNames);
  }

  const right = collectMixedTrigAffine(json[2], target);
  if (right.kind === 'unsupported') {
    return stop(right.reason, right.message, target, parameterNames);
  }

  const normalized = subtractMixedTrigAffine(left.affine, right.affine);
  if (normalized.kind === 'unsupported') {
    return stop(normalized.reason, normalized.message, target, parameterNames);
  }

  if (
    !normalized.affine.argument
    || isZeroNode(normalized.affine.sinCoefficient)
    || isZeroNode(normalized.affine.cosCoefficient)
  ) {
    return stop(
      'no-trig',
      'No supported same-argument sine/cosine mixed carrier was found.',
      target,
      parameterNames,
    );
  }

  const rhs = negateNode(normalized.affine.constant);
  const amplitudeSquare = addNodes(
    squareNode(normalized.affine.sinCoefficient),
    squareNode(normalized.affine.cosCoefficient),
  );
  if (isZeroNode(amplitudeSquare)) {
    return stop(
      'unsupported-shell',
      'The mixed sine/cosine coefficients collapse before isolation.',
      target,
      parameterNames,
    );
  }
  const amplitude = simplifyNode(['Sqrt', amplitudeSquare] as MathJson);
  const normalizedValue = divideNodes(rhs, amplitude);
  const normalizedValueLatex = latexForNode(normalizedValue);
  const phaseLatex = phaseLatexForMixedCoefficients(
    normalized.affine.sinCoefficient,
    normalized.affine.cosCoefficient,
    angleUnit,
  );
  const rangeFact = mixedRangeFact(
    rhs,
    amplitude,
    amplitudeSquare,
    normalized.affine.sinCoefficient,
    normalized.affine.cosCoefficient,
  );
  if (rangeFact?.kind === 'impossible') {
    return stop(
      'no-real-solution',
      'No real selected-target solution remains because the mixed sine/cosine range check fails.',
      target,
      parameterNames,
    );
  }

  const inverse = scaledInverseLatex('sin', normalizedValueLatex, angleUnit);
  const period = mixedPeriodLatex(angleUnit);
  const halfTurn = mixedHalfTurnLatex(angleUnit);
  const branchValues = [
    `${subtractLatex(inverse, phaseLatex)}+${period}`,
    `${subtractLatex(subtractLatex(halfTurn, inverse), phaseLatex)}+${period}`,
  ];
  const rhsLatex = latexForNode(rhs);
  const argumentLatex = latexForNode(normalized.affine.argument);
  const formulaFacts = normalizeParameterizedSupplementLatex(dedupe([
    positiveFactForNode(amplitudeSquare),
    rangeFact?.kind === 'fact' ? rangeFact.latex : null,
    'n\\in\\mathbb{Z}',
  ].filter((entry): entry is string => Boolean(entry)))) ?? [];
  const argument = collectTargetAffine(normalized.affine.argument, target);
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
        carrierValueLatex: normalizedValueLatex,
        familyTitle: 'Parameterized Mixed Trig Solve',
        familyLines: [
          `Reduced same-argument sine/cosine terms to Rsin(u+phi)=${rhsLatex} with u=${argumentLatex}.`,
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
      'The selected-target mixed trigonometric argument does not contain a nonzero target coefficient.',
      target,
      parameterNames,
    );
  }

  const solutionExpressions = branchValues.map((branchValue) =>
    solveArgumentForTarget(argument.affine, branchValue),
  );
  const exactSupplementLatex = normalizeParameterizedSupplementLatex(dedupe([
    positiveFactForNode(amplitudeSquare),
    nonzeroFactForNode(argument.affine.coefficient),
    rangeFact?.kind === 'fact' ? rangeFact.latex : null,
    'n\\in\\mathbb{Z}',
  ].filter((entry): entry is string => Boolean(entry))));

  const detailSections: DisplayDetailSection[] = buildParameterizedDetailSections({
    target,
    parameterNames,
    familyTitle: 'Parameterized Mixed Trig Solve',
    familyLines: [
      `Reduced same-argument sine/cosine terms to Rsin(u+phi)=${rhsLatex} with u=${argumentLatex}.`,
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
    carrierValueLatex: normalizedValueLatex,
  };
}
