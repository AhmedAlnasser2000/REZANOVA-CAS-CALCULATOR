import {
  addExactScalars,
  divideExactScalars,
  exactScalarIsZero,
  exactScalarToNumber,
  multiplyExactScalars,
  negateExactScalar,
  normalizeExactScalar,
  type ExactScalar,
} from '../../algebra/polynomial-core';
import { exactScalarToLatex } from '../../linear-algebra/exact-matrix-format';
import { scalar } from '../../linear-algebra/exact-matrix-core';
import { mathPart, mixedDetailSection, proseSolveSummary, textPart } from '../../display/result-detail-lines';
import { profileEquationResult } from '../../display/printer';
import { createEquationResultOutcome } from '../solve-result/producer';
import { type EquationOwnedMathJsonLeaf } from '../solve-result/owned-readback-math';
import { equationMathValuesWithOwnedReadback } from '../solve-result/owned-readback-math';
import type { ResultProducerDraft, SerializableMathJson } from '../../../types/calculator';

type Term = '' | 'x-square' | 'y-square' | 'x-reciprocal-square' | 'y-reciprocal-square';
type Form = Map<Term, ExactScalar>;
type Mode = 'square' | 'reciprocal-square';

const ZERO = scalar(0);
const ONE = scalar(1);

function isNode(node: unknown): node is unknown[] {
  return Array.isArray(node) && typeof node[0] === 'string';
}

function exactFromNode(node: unknown): ExactScalar | null {
  if (typeof node === 'number' && Number.isSafeInteger(node)) return scalar(node);
  if (!isNode(node)) return null;
  if (node[0] === 'Rational' && node.length === 3 && typeof node[1] === 'number' && typeof node[2] === 'number') {
    return Number.isSafeInteger(node[1]) && Number.isSafeInteger(node[2]) && node[2] !== 0
      ? scalar(node[1], node[2])
      : null;
  }
  if (node[0] === 'Negate' && node.length === 2) {
    const child = exactFromNode(node[1]);
    return child ? negateExactScalar(child) : null;
  }
  if (node[0] === 'Add' || node[0] === 'Subtract' || node[0] === 'Multiply') {
    const values = node.slice(1).map(exactFromNode);
    if (values.length === 0 || values.some((value) => !value)) return null;
    const exact = values as ExactScalar[];
    if (node[0] === 'Add') return exact.reduce(addExactScalars, ZERO);
    if (node[0] === 'Subtract') return exact.slice(1).reduce(
      (left, right) => addExactScalars(left, negateExactScalar(right)), exact[0]);
    return exact.reduce(multiplyExactScalars, ONE);
  }
  if (node[0] === 'Divide' && node.length === 3) {
    const numerator = exactFromNode(node[1]);
    const denominator = exactFromNode(node[2]);
    return numerator && denominator ? divideExactScalars(numerator, denominator) : null;
  }
  return null;
}

function addTerm(form: Form, term: Term, coefficient: ExactScalar) {
  if (exactScalarIsZero(coefficient)) return;
  const next = addExactScalars(form.get(term) ?? ZERO, coefficient);
  if (exactScalarIsZero(next)) form.delete(term);
  else form.set(term, normalizeExactScalar(next));
}

function addForms(left: Form, right: Form) {
  const result = new Map(left);
  for (const [term, coefficient] of right) addTerm(result, term, coefficient);
  return result;
}

function negateForm(value: Form) {
  return new Map([...value].map(([term, coefficient]) => [term, negateExactScalar(coefficient)]));
}

function scaleForm(value: Form, scale: ExactScalar) {
  return new Map([...value].map(([term, coefficient]) => [term, multiplyExactScalars(coefficient, scale)]));
}

function atomicTerm(node: unknown, mode: Mode): Term | null {
  if (!isNode(node) || node[0] !== 'Power' || node.length !== 3) return null;
  const exponent = exactFromNode(node[2]);
  if (!exponent || exponent.denominator !== 1) return null;
  const variable = node[1];
  if (variable !== 'x' && variable !== 'y') return null;
  if (mode === 'square' && exponent.numerator === 2) return variable === 'x' ? 'x-square' : 'y-square';
  if (mode === 'reciprocal-square' && exponent.numerator === -2) {
    return variable === 'x' ? 'x-reciprocal-square' : 'y-reciprocal-square';
  }
  return null;
}

function formFromNode(node: unknown, mode: Mode): Form | null {
  const exact = exactFromNode(node);
  if (exact) return new Map([['', exact]]);
  const atomic = atomicTerm(node, mode);
  if (atomic) return new Map([[atomic, ONE]]);
  if (!isNode(node)) return null;
  if (node[0] === 'Negate' && node.length === 2) {
    const child = formFromNode(node[1], mode);
    return child ? negateForm(child) : null;
  }
  if (node[0] === 'Add' || node[0] === 'Subtract') {
    const values = node.slice(1).map((child) => formFromNode(child, mode));
    if (values.length === 0 || values.some((value) => !value)) return null;
    const forms = values as Form[];
    return node[0] === 'Add'
      ? forms.reduce(addForms, new Map())
      : forms.slice(1).reduce((left, right) => addForms(left, negateForm(right)), forms[0]);
  }
  if (node[0] === 'Multiply') {
    const values = node.slice(1).map((child) => formFromNode(child, mode));
    if (values.length === 0 || values.some((value) => !value)) return null;
    const nonConstants = (values as Form[]).filter((value) => [...value.keys()].some((term) => term !== ''));
    if (nonConstants.length > 1) return null;
    const scale = (values as Form[])
      .filter((value) => ![...value.keys()].some((term) => term !== ''))
      .map((value) => value.get('') ?? ZERO)
      .reduce(multiplyExactScalars, ONE);
    return nonConstants[0] ? scaleForm(nonConstants[0], scale) : new Map([['', scale]]);
  }
  if (mode === 'reciprocal-square' && node[0] === 'Divide' && node.length === 3) {
    const numerator = exactFromNode(node[1]);
    const term = atomicTerm(node[2], 'square');
    if (numerator && term) {
      return new Map([[term === 'x-square' ? 'x-reciprocal-square' : 'y-reciprocal-square', numerator]]);
    }
  }
  if (node[0] === 'Divide' && node.length === 3) {
    const numerator = formFromNode(node[1], mode);
    const denominator = exactFromNode(node[2]);
    return numerator && denominator ? scaleForm(numerator, scalar(denominator.denominator, denominator.numerator)) : null;
  }
  return null;
}

function solveTwoByTwo(first: Form, second: Form, xTerm: Term, yTerm: Term) {
  const a = first.get(xTerm) ?? ZERO;
  const b = first.get(yTerm) ?? ZERO;
  const c = negateExactScalar(first.get('') ?? ZERO);
  const d = second.get(xTerm) ?? ZERO;
  const e = second.get(yTerm) ?? ZERO;
  const f = negateExactScalar(second.get('') ?? ZERO);
  const determinant = addExactScalars(multiplyExactScalars(a, e), negateExactScalar(multiplyExactScalars(b, d)));
  if (exactScalarIsZero(determinant)) return null;
  const x = divideExactScalars(
    addExactScalars(multiplyExactScalars(c, e), negateExactScalar(multiplyExactScalars(b, f))),
    determinant,
  );
  const y = divideExactScalars(
    addExactScalars(multiplyExactScalars(a, f), negateExactScalar(multiplyExactScalars(c, d))),
    determinant,
  );
  return x && y ? { x, y } : null;
}

function isPositive(value: ExactScalar) {
  return value.numerator > 0;
}

function rootCandidates(value: ExactScalar, reciprocal: boolean) {
  if (exactScalarIsZero(value)) {
    return reciprocal ? [] : [{ latex: '0', numeric: 0, mathJson: 0 as SerializableMathJson }];
  }
  const radicand = exactScalarToLatex(value);
  const magnitude = reciprocal ? `\\frac{1}{\\sqrt{${radicand}}}` : `\\sqrt{${radicand}}`;
  const numeric = reciprocal
    ? 1 / Math.sqrt(exactScalarToNumber(value))
    : Math.sqrt(exactScalarToNumber(value));
  const rootMathJson: SerializableMathJson = ['Sqrt', exactScalarMathJson(value)];
  const magnitudeMathJson: SerializableMathJson = reciprocal
    ? ['Divide', 1, rootMathJson]
    : rootMathJson;
  return [
    { latex: `-${magnitude}`, numeric: -numeric, mathJson: ['Negate', structuredClone(magnitudeMathJson)] },
    { latex: magnitude, numeric, mathJson: structuredClone(magnitudeMathJson) },
  ];
}

function exactScalarMathJson(value: ExactScalar): SerializableMathJson {
  const magnitude = Math.abs(value.numerator);
  const unsigned: SerializableMathJson = value.denominator === 1
    ? magnitude
    : ['Rational', magnitude, value.denominator];
  return value.numerator < 0 ? ['Negate', unsigned] : unsigned;
}

function directPolynomialOutcome(
  input: Omit<Extract<ResultProducerDraft, { kind: 'success' }>, 'canonicalResult' | 'primaryMath'>,
  primaryMathJson: SerializableMathJson,
  leaves: readonly EquationOwnedMathJsonLeaf[],
): ResultProducerDraft {
  if (!input.exactLatex) throw new Error('Direct polynomial systems require an exact primary readback.');
  const withPrimary = {
    ...input,
    primaryMath: { canonicalLatex: input.exactLatex, mathJson: primaryMathJson },
  } satisfies Omit<Extract<ResultProducerDraft, { kind: 'success' }>, 'canonicalResult'>;
  const ownedLeaves = [
    { canonicalLatex: input.exactLatex, mathJson: primaryMathJson, source: 'equation-direct-polynomial.primary' },
    ...leaves,
  ];
  return profileEquationResult(createEquationResultOutcome(withPrimary, {
    mathValues: equationMathValuesWithOwnedReadback({
      outcome: withPrimary,
      routeId: 'equation.polynomial',
      leaves: ownedLeaves,
    }),
  }));
}

function pairLatex(x: string, y: string) {
  return `\\left(${x},${y}\\right)`;
}

function outcomeForNoReal(mode: Mode, xValue: ExactScalar, yValue: ExactScalar) {
  const xLabel = mode === 'square' ? 'u=x^2' : 'u=\\frac{1}{x^2}';
  const yLabel = mode === 'square' ? 'v=y^2' : 'v=\\frac{1}{y^2}';
  const xDefinitionMathJson: SerializableMathJson = ['Equal', 'u', mode === 'square'
    ? ['Power', 'x', 2]
    : ['Divide', 1, ['Power', 'x', 2]]];
  const yDefinitionMathJson: SerializableMathJson = ['Equal', 'v', mode === 'square'
    ? ['Power', 'y', 2]
    : ['Divide', 1, ['Power', 'y', 2]]];
  const invalid = [
    !isPositive(xValue) && !exactScalarIsZero(xValue)
      ? { label: 'u', value: xValue, latex: `u=${exactScalarToLatex(xValue)}` }
      : null,
    !isPositive(yValue) && !exactScalarIsZero(yValue)
      ? { label: 'v', value: yValue, latex: `v=${exactScalarToLatex(yValue)}` }
      : null,
  ].filter((entry): entry is { label: 'u' | 'v'; value: ExactScalar; latex: string } => Boolean(entry));
  return directPolynomialOutcome({
    kind: 'success',
    title: 'Polynomial 2x2',
    exactLatex: '\\varnothing',
    answerRows: { label: 'Answer', rows: [{ latex: '\\varnothing', label: 'No real solution pairs' }] },
    ...proseSolveSummary('The direct square substitution forces a negative real square quantity.'),
    detailSections: [mixedDetailSection('Square Substitution', [
      [textPart('Set '), mathPart(xLabel), textPart(' and '), mathPart(yLabel), textPart('.')],
      ...invalid.map((entry) => [
        textPart('No real value can satisfy '), mathPart(entry.latex), textPart(' because it is negative.'),
      ]),
    ])],
    warnings: [],
    resultOrigin: 'rule-based-symbolic',
  }, 'EmptySet', [
    { canonicalLatex: '\\varnothing', mathJson: 'EmptySet', source: 'equation-direct-polynomial.empty-answer' },
    { canonicalLatex: xLabel, mathJson: xDefinitionMathJson, source: 'equation-direct-polynomial.x-definition' },
    { canonicalLatex: yLabel, mathJson: yDefinitionMathJson, source: 'equation-direct-polynomial.y-definition' },
    ...invalid.map((entry) => ({
      canonicalLatex: entry.latex,
      mathJson: ['Equal', entry.label, exactScalarMathJson(entry.value)] as SerializableMathJson,
      source: `equation-direct-polynomial.${entry.label}-negative`,
    })),
  ]);
}

export function tryDirectSquareSubstitution(input: {
  zeroNodes: readonly [unknown, unknown];
}): ResultProducerDraft | undefined {
  for (const mode of ['square', 'reciprocal-square'] as const) {
    const forms = input.zeroNodes.map((node) => formFromNode(node, mode));
    if (forms.some((form) => !form)) continue;
    const [first, second] = forms as [Form, Form];
    const xTerm = mode === 'square' ? 'x-square' : 'x-reciprocal-square';
    const yTerm = mode === 'square' ? 'y-square' : 'y-reciprocal-square';
    if (![first, second].some((form) => form.has(xTerm)) || ![first, second].some((form) => form.has(yTerm))) continue;
    const solved = solveTwoByTwo(first, second, xTerm, yTerm);
    if (!solved) continue;
    const acceptsValue = (value: ExactScalar) =>
      mode === 'square' ? value.numerator >= 0 : isPositive(value);
    if (!acceptsValue(solved.x) || !acceptsValue(solved.y)) return outcomeForNoReal(mode, solved.x, solved.y);
    const xCandidates = rootCandidates(solved.x, mode === 'reciprocal-square');
    const yCandidates = rootCandidates(solved.y, mode === 'reciprocal-square');
    if (xCandidates.length === 0 || yCandidates.length === 0) return outcomeForNoReal(mode, solved.x, solved.y);
    const pairs = xCandidates.flatMap((x) => yCandidates.map((y) => ({ x, y })));
    const valuesLatex = pairs.map((pair) => pairLatex(pair.x.latex, pair.y.latex));
    const xDefinition = mode === 'square' ? 'u=x^2' : 'u=\\frac{1}{x^2}';
    const yDefinition = mode === 'square' ? 'v=y^2' : 'v=\\frac{1}{y^2}';
    const pairNodes = pairs.map((pair) =>
      ['Tuple', structuredClone(pair.x.mathJson), structuredClone(pair.y.mathJson)] as SerializableMathJson);
    const exactLatex = `\\left(x,y\\right)\\in\\left\\{${valuesLatex.join(',\\ ')}\\right\\}`;
    const primaryMathJson: SerializableMathJson = [
      'Element',
      ['Tuple', 'x', 'y'],
      ['Set', ...pairNodes],
    ];
    const xDefinitionMathJson: SerializableMathJson = ['Equal', 'u', mode === 'square'
      ? ['Power', 'x', 2]
      : ['Divide', 1, ['Power', 'x', 2]]];
    const yDefinitionMathJson: SerializableMathJson = ['Equal', 'v', mode === 'square'
      ? ['Power', 'y', 2]
      : ['Divide', 1, ['Power', 'y', 2]]];
    const valueDefinitions = [
      { latex: `u=${exactScalarToLatex(solved.x)}`, mathJson: ['Equal', 'u', exactScalarMathJson(solved.x)] as SerializableMathJson },
      { latex: `v=${exactScalarToLatex(solved.y)}`, mathJson: ['Equal', 'v', exactScalarMathJson(solved.y)] as SerializableMathJson },
    ];
    return directPolynomialOutcome({
      kind: 'success',
      title: 'Polynomial 2x2',
      exactLatex,
      answerRows: { label: 'Solution pairs', rows: valuesLatex.map((latex) => ({ latex })) },
      systemReadback: {
        label: 'Solution pairs',
        variablesLatex: ['x', 'y'],
        rows: pairs.map((pair) => ({ valuesLatex: [pair.x.latex, pair.y.latex] })),
        source: `equation-polynomial-2x2-${mode}`,
      },
      ...(mode === 'reciprocal-square' ? { exactSupplementLatex: ['x\\ne0', 'y\\ne0'] } : {}),
      ...proseSolveSummary('Solved a direct linear substitution before resultant projection.'),
      detailSections: [mixedDetailSection('Square Substitution', [
        [textPart('Set '), mathPart(xDefinition), textPart(' and '), mathPart(yDefinition), textPart('.')],
        [mathPart(`u=${exactScalarToLatex(solved.x)}`), textPart(', '), mathPart(`v=${exactScalarToLatex(solved.y)}`), textPart('.')],
      ])],
      warnings: [],
      resultOrigin: 'rule-based-symbolic',
    }, primaryMathJson, [
      { canonicalLatex: 'x', mathJson: 'x', source: 'equation-direct-polynomial.x-variable' },
      { canonicalLatex: 'y', mathJson: 'y', source: 'equation-direct-polynomial.y-variable' },
      ...valuesLatex.map((latex, index) => ({
        canonicalLatex: latex,
        mathJson: pairNodes[index],
        source: `equation-direct-polynomial.answer-row:${index}`,
      })),
      ...pairs.flatMap((pair, index) => [
        {
          canonicalLatex: pair.x.latex,
          mathJson: pair.x.mathJson,
          source: `equation-direct-polynomial.x:${index}`,
        },
        {
          canonicalLatex: pair.y.latex,
          mathJson: pair.y.mathJson,
          source: `equation-direct-polynomial.y:${index}`,
        },
      ]),
      { canonicalLatex: xDefinition, mathJson: xDefinitionMathJson, source: 'equation-direct-polynomial.x-definition' },
      { canonicalLatex: yDefinition, mathJson: yDefinitionMathJson, source: 'equation-direct-polynomial.y-definition' },
      ...valueDefinitions.map((entry, index) => ({
        canonicalLatex: entry.latex,
        mathJson: entry.mathJson,
        source: `equation-direct-polynomial.value:${index}`,
      })),
      ...(mode === 'reciprocal-square'
        ? [
            { canonicalLatex: 'x\\ne0', mathJson: ['NotEqual', 'x', 0] as SerializableMathJson, source: 'equation-direct-polynomial.x-exclusion' },
            { canonicalLatex: 'y\\ne0', mathJson: ['NotEqual', 'y', 0] as SerializableMathJson, source: 'equation-direct-polynomial.y-exclusion' },
          ]
        : []),
    ]);
  }
  return undefined;
}
