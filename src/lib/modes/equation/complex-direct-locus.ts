import { ComputeEngine } from '@cortex-js/compute-engine';
import type { ExactScalar } from '../../algebra/polynomial-core';
import {
  addExactScalars,
  exactScalarIsZero,
  multiplyExactScalars,
  negateExactScalar,
} from '../../algebra/polynomial-core';
import { exactScalarToLatex } from '../../linear-algebra/exact-matrix-format';
import { scalar } from '../../linear-algebra/exact-matrix-core';
import { normalizeComplexLocusFunctionSyntax } from '../../equation/complex/locus-policy';
import { profileEquationResult } from '../../display/printer';
import { createEquationResultOutcome } from '../../equation/equation-solve-result';
import { type EquationOwnedMathJsonLeaf } from '../../equation/solve-result/owned-readback-math';
import { equationMathValuesWithOwnedReadback } from '../../equation/solve-result/owned-readback-math';
import { mathPart, mixedDetailSection, proseSolveSummary, textPart } from '../../display/result-detail-lines';
import type { ResultProducerDraft, SerializableMathJson } from '../../../types/calculator';

type MathJson = unknown;
type AffineForm = { scale: ExactScalar; offset: ExactScalar };

const ce = new ComputeEngine();
const ZERO = scalar(0);
const ONE = scalar(1);

function exactScalarMathJson(value: ExactScalar): MathJson {
  const magnitude = Math.abs(value.numerator);
  const unsigned = value.denominator === 1
    ? magnitude
    : ['Rational', magnitude, value.denominator];
  return value.numerator < 0 ? ['Negate', unsigned] : unsigned;
}

function exactScalarNode(value: ExactScalar): MathJson {
  return exactScalarMathJson(value);
}

function directLocusOutcome(
  input: Omit<Extract<ResultProducerDraft, { kind: 'success' }>, 'canonicalResult' | 'primaryMath'>,
  primaryMathJson: MathJson,
  leaves: readonly EquationOwnedMathJsonLeaf[],
): ResultProducerDraft {
  if (!input.exactLatex) throw new Error('Direct loci require a primary mathematical readback.');
  const withPrimary = {
    ...input,
    primaryMath: { canonicalLatex: input.exactLatex, mathJson: primaryMathJson as SerializableMathJson },
  } satisfies Omit<Extract<ResultProducerDraft, { kind: 'success' }>, 'canonicalResult'>;
  return profileEquationResult(createEquationResultOutcome(withPrimary, {
    mathValues: equationMathValuesWithOwnedReadback({
      outcome: withPrimary,
      routeId: 'equation.domain-boundary',
      leaves: [{
        canonicalLatex: input.exactLatex,
        mathJson: primaryMathJson as SerializableMathJson,
        source: 'equation-direct-locus.primary',
      }, ...leaves],
    }),
  }));
}

function realParameterMathJson(parameter = 't'): MathJson {
  return ['Element', parameter, 'RealNumbers'];
}

function isArrayNode(value: MathJson): value is unknown[] {
  return Array.isArray(value) && typeof value[0] === 'string';
}

function exactScalarFromNode(node: MathJson): ExactScalar | null {
  if (typeof node === 'number' && Number.isSafeInteger(node)) return scalar(node);
  if (!isArrayNode(node)) return null;
  if (node[0] === 'Rational' && node.length === 3 && typeof node[1] === 'number' && typeof node[2] === 'number') {
    return Number.isSafeInteger(node[1]) && Number.isSafeInteger(node[2]) && node[2] !== 0
      ? scalar(node[1], node[2])
      : null;
  }
  if (node[0] === 'Negate' && node.length === 2) {
    const child = exactScalarFromNode(node[1]);
    return child ? negateExactScalar(child) : null;
  }
  if (node[0] === 'Add' || node[0] === 'Subtract' || node[0] === 'Multiply') {
    const values = node.slice(1).map(exactScalarFromNode);
    if (values.length === 0 || values.some((value) => !value)) return null;
    const exact = values as ExactScalar[];
    if (node[0] === 'Add') return exact.reduce(addExactScalars, ZERO);
    if (node[0] === 'Subtract') return exact.slice(1).reduce(
      (left, right) => addExactScalars(left, negateExactScalar(right)), exact[0]);
    return exact.reduce(multiplyExactScalars, ONE);
  }
  if (node[0] === 'Divide' && node.length === 3) {
    const numerator = exactScalarFromNode(node[1]);
    const denominator = exactScalarFromNode(node[2]);
    return numerator && denominator && !exactScalarIsZero(denominator)
      ? scalar(numerator.numerator * denominator.denominator, numerator.denominator * denominator.numerator)
      : null;
  }
  return null;
}

function addAffine(left: AffineForm, right: AffineForm): AffineForm {
  return {
    scale: addExactScalars(left.scale, right.scale),
    offset: addExactScalars(left.offset, right.offset),
  };
}

function negateAffine(value: AffineForm): AffineForm {
  return { scale: negateExactScalar(value.scale), offset: negateExactScalar(value.offset) };
}

function multiplyAffineByScalar(value: AffineForm, factor: ExactScalar): AffineForm {
  return {
    scale: multiplyExactScalars(value.scale, factor),
    offset: multiplyExactScalars(value.offset, factor),
  };
}

function affineFromNode(node: MathJson, target: string): AffineForm | null {
  const constant = exactScalarFromNode(node);
  if (constant) return { scale: ZERO, offset: constant };
  if (node === target) return { scale: ONE, offset: ZERO };
  if (!isArrayNode(node)) return null;
  if (node[0] === 'Negate' && node.length === 2) {
    const value = affineFromNode(node[1], target);
    return value ? negateAffine(value) : null;
  }
  if (node[0] === 'Add' || node[0] === 'Subtract') {
    const operands = node.slice(1).map((child) => affineFromNode(child, target));
    if (operands.length === 0 || operands.some((value) => !value)) return null;
    const values = operands as AffineForm[];
    return node[0] === 'Add'
      ? values.reduce(addAffine, { scale: ZERO, offset: ZERO })
      : values.slice(1).reduce((left, right) => addAffine(left, negateAffine(right)), values[0]);
  }
  if (node[0] === 'Multiply') {
    const values = node.slice(1).map((child) => affineFromNode(child, target));
    if (values.some((value) => !value)) return null;
    const affineValues = values as AffineForm[];
    const targetFactors = affineValues.filter((value) => !exactScalarIsZero(value.scale));
    if (targetFactors.length > 1) return null;
    const constantFactor = affineValues
      .filter((value) => exactScalarIsZero(value.scale))
      .map((value) => value.offset)
      .reduce(multiplyExactScalars, ONE);
    return targetFactors[0]
      ? multiplyAffineByScalar(targetFactors[0], constantFactor)
      : { scale: ZERO, offset: constantFactor };
  }
  if (node[0] === 'Divide' && node.length === 3) {
    const numerator = affineFromNode(node[1], target);
    const denominator = exactScalarFromNode(node[2]);
    return numerator && denominator && !exactScalarIsZero(denominator)
      ? multiplyAffineByScalar(numerator, scalar(denominator.denominator, denominator.numerator))
      : null;
  }
  return null;
}

function splitEquation(node: MathJson) {
  return isArrayNode(node) && node[0] === 'Equal' && node.length === 3
    ? { left: node[1], right: node[2] }
    : null;
}

function isDirectOperator(node: MathJson, operator: string, target: string) {
  return isArrayNode(node) && node[0] === operator && node.length === 2 && node[1] === target;
}

function divideExact(left: ExactScalar, right: ExactScalar) {
  return scalar(left.numerator * right.denominator, left.denominator * right.numerator);
}

function absolute(value: ExactScalar): ExactScalar {
  return scalar(Math.abs(value.numerator), value.denominator);
}

function signedTerm(value: ExactScalar, symbol: string) {
  if (exactScalarIsZero(value)) return '';
  const sign = value.numerator < 0 ? '-' : '+';
  const magnitude = absolute(value);
  const coefficient = magnitude.numerator === magnitude.denominator ? '' : exactScalarToLatex(magnitude);
  return `${sign}${coefficient}${symbol}`;
}

function lineOutcome(target: string, constant: ExactScalar, kind: 'real' | 'imaginary'): ResultProducerDraft {
  const constantLatex = exactScalarToLatex(constant);
  const exactLatex = kind === 'real'
    ? `${target}=${constantLatex}+t\\imaginaryI`
    : `${target}=t${signedTerm(constant, '\\imaginaryI')}`;
  const right = kind === 'real'
    ? ['Add', exactScalarNode(constant), ['Multiply', 't', 'ImaginaryUnit']]
    : ['Add', 't', ['Multiply', exactScalarNode(constant), 'ImaginaryUnit']];
  const primaryMathJson: MathJson = ['Equal', target, right];
  const meaning = kind === 'real' ? 'Vertical line' : 'Horizontal line';
  return directLocusOutcome({
    kind: 'success', title: 'Solve', exactLatex,
    exactSupplementLatex: ['t\\in\\mathbb{R}'],
    answerRows: { label: 'Locus', rows: [{ latex: exactLatex, label: meaning }] },
    ...proseSolveSummary(`This is a ${meaning.toLowerCase()} in the complex plane.`),
    detailSections: [mixedDetailSection('Locus Meaning', [[
      textPart(kind === 'real'
        ? 'The real part is fixed, so this is a vertical line.'
        : 'The imaginary part is fixed, so this is a horizontal line.'),
    ]])],
    warnings: [], resultOrigin: 'rule-based-symbolic', answerDomain: 'complex',
  }, primaryMathJson, [
    { canonicalLatex: exactLatex, mathJson: primaryMathJson, source: 'equation-direct-locus.answer-row' },
    { canonicalLatex: 't\\in\\mathbb{R}', mathJson: realParameterMathJson(), source: 'equation-direct-locus.parameter' },
  ]);
}

function pointOutcome(target: string, point: ExactScalar, summary: string): ResultProducerDraft {
  const exactLatex = `${target}=${exactScalarToLatex(point)}`;
  const primaryMathJson: MathJson = ['Equal', target, exactScalarNode(point)];
  return directLocusOutcome({
    kind: 'success', title: 'Solve', exactLatex,
    answerRows: { label: 'Answer', rows: [{ latex: exactLatex }] },
    ...proseSolveSummary(summary),
    warnings: [], resultOrigin: 'rule-based-symbolic', answerDomain: 'complex',
  }, primaryMathJson, [{
    canonicalLatex: exactLatex,
    mathJson: primaryMathJson,
    source: 'equation-direct-locus.answer-row',
  }]);
}

function circleOutcome(target: string, center: ExactScalar, radius: ExactScalar): ResultProducerDraft {
  const centerTerm = exactScalarIsZero(center)
    ? target
    : center.numerator > 0
      ? `${target}-${exactScalarToLatex(center)}`
      : `${target}+${exactScalarToLatex(absolute(center))}`;
  const exactLatex = `\\left|${centerTerm}\\right|=${exactScalarToLatex(radius)}`;
  const centerNode = exactScalarIsZero(center)
    ? target
    : center.numerator > 0
      ? ['Subtract', target, exactScalarNode(center)]
      : ['Add', target, exactScalarNode(absolute(center))];
  const primaryMathJson: MathJson = ['Equal', ['Abs', centerNode], exactScalarNode(radius)];
  return directLocusOutcome({
    kind: 'success', title: 'Solve', exactLatex,
    answerRows: { label: 'Locus', rows: [{ latex: exactLatex, label: 'Circle' }] },
    ...proseSolveSummary('This equation describes a circle in the complex plane.'),
    detailSections: [mixedDetailSection('Locus Meaning', [[
      textPart('Center: '), mathPart(exactScalarToLatex(center)), textPart('. Radius: '),
      mathPart(exactScalarToLatex(radius)), textPart('.'),
    ]])],
    warnings: [], resultOrigin: 'rule-based-symbolic', answerDomain: 'complex',
  }, primaryMathJson, [
    { canonicalLatex: exactLatex, mathJson: primaryMathJson, source: 'equation-direct-locus.answer-row' },
    { canonicalLatex: exactScalarToLatex(center), mathJson: exactScalarNode(center), source: 'equation-direct-locus.center' },
    { canonicalLatex: exactScalarToLatex(radius), mathJson: exactScalarNode(radius), source: 'equation-direct-locus.radius' },
  ]);
}

function emptyLocusOutcome(): ResultProducerDraft {
  return directLocusOutcome({
    kind: 'success', title: 'Solve', exactLatex: '\\varnothing',
    answerRows: { label: 'Answer', rows: [{ latex: '\\varnothing', label: 'No solution' }] },
    ...proseSolveSummary('A complex magnitude cannot equal a negative real radius.'),
    warnings: [], resultOrigin: 'rule-based-symbolic', answerDomain: 'complex',
  }, 'EmptySet', [{
    canonicalLatex: '\\varnothing', mathJson: 'EmptySet', source: 'equation-direct-locus.empty-answer-row',
  }]);
}

function rayOutcome(target: string, label: 'Nonnegative real ray' | 'Real axis'): ResultProducerDraft {
  const exactLatex = `${target}=t`;
  const primaryMathJson: MathJson = ['Equal', target, 't'];
  return directLocusOutcome({
    kind: 'success', title: 'Solve', exactLatex,
    exactSupplementLatex: label === 'Real axis' ? ['t\\in\\mathbb{R}'] : ['t\\in\\mathbb{R}', 't\\ge0'],
    answerRows: { label: 'Locus', rows: [{ latex: exactLatex, label }] },
    ...proseSolveSummary(label === 'Real axis'
      ? 'A complex number equals its conjugate exactly on the real axis.'
      : 'The square root of a squared magnitude is nonnegative and real.'),
    warnings: [], resultOrigin: 'rule-based-symbolic', answerDomain: 'complex',
  }, primaryMathJson, [
    { canonicalLatex: exactLatex, mathJson: primaryMathJson, source: 'equation-direct-locus.answer-row' },
    { canonicalLatex: 't\\in\\mathbb{R}', mathJson: realParameterMathJson(), source: 'equation-direct-locus.parameter' },
    ...(label === 'Nonnegative real ray'
      ? [{ canonicalLatex: 't\\ge0', mathJson: ['GreaterEqual', 't', 0], source: 'equation-direct-locus.nonnegative' }]
      : []),
  ]);
}

function isMagnitudeSquareRoot(node: MathJson, target: string) {
  return isArrayNode(node)
    && node[0] === 'Sqrt'
    && node.length === 2
    && isArrayNode(node[1])
    && node[1][0] === 'Power'
    && node[1][2] === 2
    && isArrayNode(node[1][1])
    && node[1][1][0] === 'Abs'
    && node[1][1][1] === target;
}

export function tryDirectComplexLocusOutcome(input: {
  equationLatex: string;
  target: string;
}): ResultProducerDraft | undefined {
  let node: MathJson;
  try {
    node = ce.parse(normalizeComplexLocusFunctionSyntax(input.equationLatex)).json;
  } catch {
    return undefined;
  }
  const sides = splitEquation(node);
  if (!sides) return undefined;
  for (const candidate of [sides, { left: sides.right, right: sides.left }]) {
    const constant = exactScalarFromNode(candidate.right);
    if (constant && isDirectOperator(candidate.left, 'Re', input.target)) return lineOutcome(input.target, constant, 'real');
    if (constant && isDirectOperator(candidate.left, 'Im', input.target)) return lineOutcome(input.target, constant, 'imaginary');
    if (
      isArrayNode(candidate.left)
      && ['OverBar', 'Conjugate', 'Conj', 'conj', 'conjugate'].includes(String(candidate.left[0]))
      && candidate.left[1] === input.target
      && candidate.right === input.target
    ) return rayOutcome(input.target, 'Real axis');
    if (constant && isArrayNode(candidate.left) && candidate.left[0] === 'Abs' && candidate.left.length === 2) {
      const affine = affineFromNode(candidate.left[1], input.target);
      if (!affine || exactScalarIsZero(affine.scale)) continue;
      if (constant.numerator < 0) return emptyLocusOutcome();
      const center = negateExactScalar(divideExact(affine.offset, affine.scale));
      const radius = divideExact(constant, absolute(affine.scale));
      return exactScalarIsZero(radius)
        ? pointOutcome(input.target, center, 'A zero magnitude fixes one complex point.')
        : circleOutcome(input.target, center, radius);
    }
    if (isMagnitudeSquareRoot(candidate.left, input.target) && candidate.right === input.target) {
      return rayOutcome(input.target, 'Nonnegative real ray');
    }
  }
  return undefined;
}
