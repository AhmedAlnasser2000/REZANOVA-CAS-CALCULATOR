import {
  buildExactScalarNode,
  divideExactScalars,
  multiplyExactScalars,
  normalizeExactScalar,
  readExactScalarNode,
  type ExactScalar,
} from '../../../algebra/polynomial-core';
import type { ExactSupplementEntry } from '../../../../types/calculator/exact-supplement-types';
import { mergeExactSupplementLatex } from '../../../algebra/exact-supplements';
import {
  boxLatex,
  dependsOnVariable,
  flattenMultiply,
  isNodeArray,
  wrapGroupedLatex,
} from '../../patterns';
import { normalizeAst } from '../../normalize';
import { parseSymbolicAffine } from '../symbolic-coefficients';
import { sameNode } from '../node-helpers';
import { normalizeGeneratedIntegrationLatex } from '../readback-hygiene';
import { normalizeCertificateProofNode } from './proof-diff';
import { certificateUxDetailSections } from './certificate-ux';
import type { TranscendentalNonElementaryCertificate } from './result-shape';
import { profileSymbolicIntegrationResult } from '../../../display/printer';
import {
  namedSpecialFunctionCallExpression,
  specialFunctionAntiderivativeExpression,
  standardSpecialFunctionExpressionFromMathJson,
} from '../../../calculus/engine/antiderivative-expression';
import type { CanonicalSpecialFunctionExpressionV4 } from '../../../../types/calculator';

const MAX_QUOTIENT_POWER = 6;
const ONE: ExactScalar = { numerator: 1, denominator: 1 };
const MINUS_ONE: ExactScalar = { numerator: -1, denominator: 1 };

type QuotientPowerKind = 'sin' | 'cos' | 'exp';

type ParsedQuotientPower = {
  kind: QuotientPowerKind;
  variable: string;
  argumentNode: unknown;
  argumentLatex: string;
  slopeNode: unknown;
  slopeLatex: string;
  coefficientNode?: unknown;
  denominatorPower: number;
  inputFacts: CertificateFact[];
  branchFacts: CertificateFact[];
};

type CertificateFact = {
  expressionLatex: string;
  relation: '\\ne0' | '>0' | '<0';
};

type SpecialTerm = {
  kind: 'special';
  name: 'Si' | 'Ci' | 'Ei';
  coefficient: ExactScalar;
};

type CarrierTerm = {
  kind: 'carrier';
  carrier: QuotientPowerKind;
  coefficient: ExactScalar;
  denominatorPower: number;
};

type RecurrenceTerm = SpecialTerm | CarrierTerm;

const BRANCH_SENSITIVE_HEADS = new Set(['Abs', 'AbsoluteValue']);
const UNSUPPORTED_COEFFICIENT_HEADS = new Set([
  'Sin',
  'Cos',
  'Tan',
  'Cot',
  'Sec',
  'Csc',
  'Ln',
  'Log',
  'Sqrt',
]);

function exactInteger(node: unknown) {
  const scalar = readExactScalarNode(node);
  if (!scalar || scalar.denominator !== 1) {
    return undefined;
  }
  return scalar.numerator;
}

function containsInexactNumber(node: unknown): boolean {
  if (typeof node === 'number') {
    return Number.isFinite(node) && !Number.isInteger(node);
  }

  return isNodeArray(node) && node.slice(1).some(containsInexactNumber);
}

function findHead(node: unknown, heads: Set<string>): string | undefined {
  if (!isNodeArray(node) || typeof node[0] !== 'string') {
    return undefined;
  }
  if (heads.has(node[0])) {
    return node[0];
  }

  for (const child of node.slice(1)) {
    const found = findHead(child, heads);
    if (found) {
      return found;
    }
  }
  return undefined;
}

function isExp(node: unknown): node is ['Power', unknown, unknown] {
  return isNodeArray(node)
    && node[0] === 'Power'
    && node.length === 3
    && node[1] === 'ExponentialE';
}

function carrierArgument(node: unknown, kind: QuotientPowerKind) {
  if (kind === 'exp') {
    return isExp(node) ? node[2] : undefined;
  }

  const head = kind === 'sin' ? 'Sin' : 'Cos';
  return isNodeArray(node) && node[0] === head && node.length === 2
    ? node[1]
    : undefined;
}

function isCarrier(node: unknown, kind: QuotientPowerKind) {
  return carrierArgument(node, kind) !== undefined;
}

function denominatorPower(denominator: unknown) {
  if (
    isNodeArray(denominator)
    && denominator[0] === 'Power'
    && denominator.length === 3
  ) {
    const power = exactInteger(denominator[2]);
    return power && power > 0
      ? { base: denominator[1], power }
      : undefined;
  }

  return { base: denominator, power: 1 };
}

function normalizeQuotientShape(node: unknown) {
  if (isNodeArray(node) && node[0] === 'Divide' && node.length === 3) {
    return {
      numerator: node[1],
      denominator: node[2],
    };
  }

  if (!isNodeArray(node) || node[0] !== 'Multiply') {
    return undefined;
  }

  const factors = flattenMultiply(node);
  const negativePowerFactors = factors.filter((factor) =>
    isNodeArray(factor)
    && factor[0] === 'Power'
    && factor.length === 3
    && (exactInteger(factor[2]) ?? 0) < 0);
  if (negativePowerFactors.length !== 1) {
    return undefined;
  }

  const denominatorFactor = negativePowerFactors[0];
  if (!isNodeArray(denominatorFactor)) {
    return undefined;
  }
  const power = exactInteger(denominatorFactor[2]);
  if (!power || power >= 0) {
    return undefined;
  }

  const numeratorFactors = factors.filter((factor) => factor !== denominatorFactor);
  return {
    numerator: numeratorFactors.length === 0
      ? 1
      : numeratorFactors.length === 1
        ? numeratorFactors[0]
        : ['Multiply', ...numeratorFactors],
    denominator: ['Power', denominatorFactor[1], -power],
  };
}

function splitCoefficientCarrier(
  numerator: unknown,
  kind: QuotientPowerKind,
  variable: string,
) {
  const factors = isNodeArray(numerator) && numerator[0] === 'Multiply'
    ? flattenMultiply(numerator)
    : [numerator];
  const carriers: unknown[] = [];
  const coefficientFactors: unknown[] = [];

  for (const factor of factors) {
    if (isCarrier(factor, kind)) {
      carriers.push(factor);
      continue;
    }

    const isOtherCarrier = isCarrier(factor, 'sin')
      || isCarrier(factor, 'cos')
      || isCarrier(factor, 'exp');
    if (isOtherCarrier || dependsOnVariable(factor, variable)) {
      return undefined;
    }
    if (findHead(factor, UNSUPPORTED_COEFFICIENT_HEADS)) {
      return undefined;
    }
    coefficientFactors.push(factor);
  }

  if (carriers.length !== 1) {
    return undefined;
  }

  return {
    carrier: carriers[0],
    coefficientNode: coefficientFactors.length === 0
      ? undefined
      : coefficientFactors.length === 1
        ? coefficientFactors[0]
        : ['Multiply', ...coefficientFactors],
  };
}

function slopeFacts(slopeNode: unknown, slopeLatex: string): CertificateFact[] {
  const scalar = readExactScalarNode(slopeNode);
  return scalar && scalar.numerator !== 0
    ? []
    : [{ expressionLatex: slopeLatex, relation: '\\ne0' }];
}

function parseQuotientPower(
  node: unknown,
  variable: string,
): ParsedQuotientPower | undefined {
  const normalized = normalizeAst(normalizeCertificateProofNode(node));
  if (containsInexactNumber(normalized) || findHead(normalized, BRANCH_SENSITIVE_HEADS)) {
    return undefined;
  }

  const quotient = normalizeQuotientShape(normalized);
  if (!quotient) {
    return undefined;
  }

  const denominator = denominatorPower(quotient.denominator);
  if (
    !denominator
    || denominator.power < 2
    || denominator.power > MAX_QUOTIENT_POWER
  ) {
    return undefined;
  }

  for (const kind of ['sin', 'cos', 'exp'] as const) {
    const split = splitCoefficientCarrier(quotient.numerator, kind, variable);
    if (!split) {
      continue;
    }

    const argument = carrierArgument(split.carrier, kind);
    if (argument === undefined || !sameNode(argument, denominator.base)) {
      continue;
    }

    const affine = parseSymbolicAffine(argument, variable);
    if (!affine) {
      return undefined;
    }

    return {
      kind,
      variable,
      argumentNode: argument,
      argumentLatex: affine.latex,
      slopeNode: affine.slope,
      slopeLatex: affine.slopeLatex,
      coefficientNode: split.coefficientNode,
      denominatorPower: denominator.power,
      inputFacts: slopeFacts(affine.slope, affine.slopeLatex),
      branchFacts: [{
        expressionLatex: affine.latex,
        relation: '\\ne0',
      }],
    };
  }

  return undefined;
}

function reciprocal(value: number): ExactScalar {
  return { numerator: 1, denominator: value };
}

function scaleTerms(terms: RecurrenceTerm[], scalar: ExactScalar): RecurrenceTerm[] {
  return terms.map((term) => ({
    ...term,
    coefficient: normalizeExactScalar(multiplyExactScalars(term.coefficient, scalar)),
  }));
}

function recurrenceTerms(kind: QuotientPowerKind, power: number): RecurrenceTerm[] {
  if (power === 1) {
    return [{
      kind: 'special',
      name: kind === 'sin' ? 'Si' : kind === 'cos' ? 'Ci' : 'Ei',
      coefficient: ONE,
    }];
  }

  const factor = reciprocal(power - 1);
  if (kind === 'sin') {
    return [
      ...scaleTerms(recurrenceTerms('cos', power - 1), factor),
      {
        kind: 'carrier',
        carrier: 'sin',
        coefficient: normalizeExactScalar(multiplyExactScalars(MINUS_ONE, factor)),
        denominatorPower: power - 1,
      },
    ];
  }
  if (kind === 'cos') {
    return [
      {
        kind: 'carrier',
        carrier: 'cos',
        coefficient: normalizeExactScalar(multiplyExactScalars(MINUS_ONE, factor)),
        denominatorPower: power - 1,
      },
      ...scaleTerms(recurrenceTerms('sin', power - 1), multiplyExactScalars(MINUS_ONE, factor)),
    ];
  }

  return [
    ...scaleTerms(recurrenceTerms('exp', power - 1), factor),
    {
      kind: 'carrier',
      carrier: 'exp',
      coefficient: normalizeExactScalar(multiplyExactScalars(MINUS_ONE, factor)),
      denominatorPower: power - 1,
    },
  ];
}

function externalPrefactor(input: ParsedQuotientPower) {
  const coefficientNode = input.coefficientNode ?? 1;
  const coefficientScalar = readExactScalarNode(coefficientNode);
  const slopeScalar = readExactScalarNode(input.slopeNode);
  if (coefficientScalar && slopeScalar) {
    const ratio = divideExactScalars(coefficientScalar, slopeScalar);
    return ratio ? { kind: 'exact' as const, value: normalizeExactScalar(ratio) } : undefined;
  }

  const coefficientLatex = input.coefficientNode === undefined
    ? '1'
    : boxLatex(input.coefficientNode);
  if (input.slopeLatex === '1') {
    return coefficientLatex === '1'
      ? { kind: 'exact' as const, value: ONE }
      : { kind: 'latex' as const, latex: coefficientLatex };
  }
  if (coefficientLatex === input.slopeLatex) {
    return { kind: 'exact' as const, value: ONE };
  }

  return {
    kind: 'latex' as const,
    latex: String.raw`\frac{${coefficientLatex}}{${input.slopeLatex}}`,
  };
}

function externalPrefactorNode(input: ParsedQuotientPower): unknown | undefined {
  const coefficientNode = input.coefficientNode ?? 1;
  const coefficientScalar = readExactScalarNode(coefficientNode);
  const slopeScalar = readExactScalarNode(input.slopeNode);
  if (coefficientScalar && slopeScalar) {
    const ratio = divideExactScalars(coefficientScalar, slopeScalar);
    return ratio ? buildExactScalarNode(normalizeExactScalar(ratio)) : undefined;
  }
  if (sameNode(coefficientNode, input.slopeNode)) {
    return 1;
  }
  if (sameNode(input.slopeNode, 1)) {
    return coefficientNode;
  }
  return ['Divide', coefficientNode, input.slopeNode];
}

function applyExactPrefactor(
  terms: RecurrenceTerm[],
  prefactor: ExactScalar,
): RecurrenceTerm[] {
  return terms.map((term) => ({
    ...term,
    coefficient: normalizeExactScalar(multiplyExactScalars(term.coefficient, prefactor)),
  }));
}

function termArgumentPowerLatex(argumentLatex: string, power: number) {
  const grouped = wrapGroupedLatex(argumentLatex);
  return power === 1 ? grouped : `${grouped}^{${power}}`;
}

function carrierLatex(carrier: QuotientPowerKind, argumentLatex: string) {
  if (carrier === 'exp') {
    return `e^{${argumentLatex}}`;
  }
  const head = carrier === 'sin' ? String.raw`\sin` : String.raw`\cos`;
  return String.raw`${head}\left(${argumentLatex}\right)`;
}

function unsignedCarrierTermLatex(term: CarrierTerm, argumentLatex: string) {
  const coefficient = normalizeExactScalar(term.coefficient);
  const numeratorMagnitude = Math.abs(coefficient.numerator);
  const functionLatex = carrierLatex(term.carrier, argumentLatex);
  const numerator = numeratorMagnitude === 1
    ? functionLatex
    : `${numeratorMagnitude}${functionLatex}`;
  const denominatorPower = termArgumentPowerLatex(argumentLatex, term.denominatorPower);
  const denominator = coefficient.denominator === 1
    ? denominatorPower
    : `${coefficient.denominator}${denominatorPower}`;
  return String.raw`\frac{${numerator}}{${denominator}}`;
}

function specialLatex(
  name: 'Si' | 'Ci' | 'Ei',
  argumentLatex: string,
  ciArgumentOverride?: string,
) {
  const argument = name === 'Ci' && ciArgumentOverride
    ? ciArgumentOverride
    : argumentLatex;
  return String.raw`\operatorname{${name}}\left(${argument}\right)`;
}

function unsignedSpecialTermLatex(
  term: SpecialTerm,
  argumentLatex: string,
  ciArgumentOverride?: string,
) {
  const coefficient = normalizeExactScalar(term.coefficient);
  const base = specialLatex(term.name, argumentLatex, ciArgumentOverride);
  const numeratorMagnitude = Math.abs(coefficient.numerator);
  if (numeratorMagnitude === 1 && coefficient.denominator === 1) {
    return base;
  }

  const coefficientLatex = coefficient.denominator === 1
    ? String(numeratorMagnitude)
    : String.raw`\frac{${numeratorMagnitude}}{${coefficient.denominator}}`;
  return String.raw`${coefficientLatex}\cdot ${base}`;
}

function renderedTermLatex(
  term: RecurrenceTerm,
  argumentLatex: string,
  ciArgumentOverride?: string,
) {
  const coefficient = normalizeExactScalar(term.coefficient);
  const unsigned = term.kind === 'special'
    ? unsignedSpecialTermLatex(term, argumentLatex, ciArgumentOverride)
    : unsignedCarrierTermLatex(term, argumentLatex);
  return coefficient.numerator < 0 ? `-${unsigned}` : unsigned;
}

function joinTerms(terms: RecurrenceTerm[], argumentLatex: string, ciArgumentOverride?: string) {
  return terms
    .map((term) => renderedTermLatex(term, argumentLatex, ciArgumentOverride))
    .reduce((joined, term, index) => {
      if (index === 0) {
        return term;
      }
      return term.startsWith('-')
        ? `${joined}-${term.slice(1)}`
        : `${joined}+${term}`;
    }, '');
}

function hasSpecial(terms: RecurrenceTerm[], name: 'Ci' | 'Ei') {
  return terms.some((term) => term.kind === 'special' && term.name === name);
}

function multiplyLatexPrefactor(prefactorLatex: string | undefined, valueLatex: string) {
  if (!prefactorLatex || prefactorLatex === '1') {
    return valueLatex;
  }
  if (prefactorLatex === '-1') {
    return `-${wrapGroupedLatex(valueLatex)}`;
  }

  return String.raw`${prefactorLatex}\cdot ${wrapGroupedLatex(valueLatex)}`;
}

function casewiseLatex(rows: Array<{ valueLatex: string; conditionLatex: string }>) {
  return `\\begin{cases}${rows
    .map((row) => `${row.valueLatex},&${row.conditionLatex}`)
    .join('\\\\')}\\end{cases}`;
}

function quotientPowerLatex(input: ParsedQuotientPower) {
  const prefactor = externalPrefactor(input);
  if (!prefactor) {
    return undefined;
  }

  const baseTerms = recurrenceTerms(input.kind, input.denominatorPower);
  const terms = prefactor.kind === 'exact'
    ? applyExactPrefactor(baseTerms, prefactor.value)
    : baseTerms;
  const outerPrefactor = prefactor.kind === 'latex' ? prefactor.latex : undefined;
  const main = joinTerms(terms, input.argumentLatex);

  if (hasSpecial(terms, 'Ci')) {
    const positive = multiplyLatexPrefactor(outerPrefactor, main);
    const negative = multiplyLatexPrefactor(
      outerPrefactor,
      joinTerms(terms, input.argumentLatex, boxLatex(['Negate', input.argumentNode])),
    );
    return casewiseLatex([
      { valueLatex: positive, conditionLatex: `${input.argumentLatex}>0` },
      { valueLatex: negative, conditionLatex: `${input.argumentLatex}<0` },
    ]);
  }

  if (hasSpecial(terms, 'Ei')) {
    const value = multiplyLatexPrefactor(outerPrefactor, main);
    return casewiseLatex([
      { valueLatex: value, conditionLatex: `${input.argumentLatex}>0` },
      { valueLatex: value, conditionLatex: `${input.argumentLatex}<0` },
    ]);
  }

  return multiplyLatexPrefactor(outerPrefactor, main);
}

function carrierNode(carrier: QuotientPowerKind, argumentNode: unknown) {
  if (carrier === 'exp') {
    return ['Power', 'ExponentialE', argumentNode];
  }
  return [carrier === 'sin' ? 'Sin' : 'Cos', argumentNode];
}

function coefficientExpression(
  coefficient: ExactScalar,
  expression: CanonicalSpecialFunctionExpressionV4,
): CanonicalSpecialFunctionExpressionV4 {
  const normalized = normalizeExactScalar(coefficient);
  if (normalized.numerator === normalized.denominator) {
    return expression;
  }
  return {
    kind: 'product',
    factors: [
      standardSpecialFunctionExpressionFromMathJson(buildExactScalarNode(normalized)),
      expression,
    ],
  };
}

function recurrenceTermExpression(
  term: RecurrenceTerm,
  argumentNode: unknown,
  ciArgumentOverride?: unknown,
): CanonicalSpecialFunctionExpressionV4 {
  if (term.kind === 'special') {
    return coefficientExpression(
      term.coefficient,
      namedSpecialFunctionCallExpression({
        name: term.name,
        arguments: [standardSpecialFunctionExpressionFromMathJson(
          term.name === 'Ci' && ciArgumentOverride !== undefined
            ? ciArgumentOverride
            : argumentNode,
        )],
      }),
    );
  }

  const denominator = term.denominatorPower === 1
    ? argumentNode
    : ['Power', argumentNode, term.denominatorPower];
  return coefficientExpression(
    term.coefficient,
    standardSpecialFunctionExpressionFromMathJson([
      'Divide',
      carrierNode(term.carrier, argumentNode),
      denominator,
    ]),
  );
}

function recurrenceExpression(
  terms: RecurrenceTerm[],
  argumentNode: unknown,
  ciArgumentOverride?: unknown,
): CanonicalSpecialFunctionExpressionV4 {
  const expressions = terms.map((term) =>
    recurrenceTermExpression(term, argumentNode, ciArgumentOverride));
  return expressions.length === 1
    ? expressions[0]
    : { kind: 'sum', terms: expressions };
}

function conditionValue(mathJson: unknown) {
  const expression = standardSpecialFunctionExpressionFromMathJson(mathJson);
  return expression.kind === 'standard-math' ? expression.value : undefined;
}

function quotientPowerExpression(
  input: ParsedQuotientPower,
): TranscendentalNonElementaryCertificate['antiderivativeExpression'] {
  const prefactor = externalPrefactorNode(input);
  if (prefactor === undefined) return undefined;
  const baseTerms = recurrenceTerms(input.kind, input.denominatorPower);
  const main = recurrenceExpression(baseTerms, input.argumentNode);
  const positive = conditionValue(['Greater', input.argumentNode, 0]);
  const negative = conditionValue(['Less', input.argumentNode, 0]);
  let expression: CanonicalSpecialFunctionExpressionV4;
  if (hasSpecial(baseTerms, 'Ci')) {
    if (!positive || !negative) return undefined;
    expression = {
      kind: 'piecewise',
      branches: [
        { value: main, condition: positive },
        {
          value: recurrenceExpression(baseTerms, input.argumentNode, ['Negate', input.argumentNode]),
          condition: negative,
        },
      ],
    };
  } else if (hasSpecial(baseTerms, 'Ei')) {
    if (!positive || !negative) return undefined;
    expression = {
      kind: 'piecewise',
      branches: [
        { value: main, condition: positive },
        { value: main, condition: negative },
      ],
    };
  } else {
    expression = main;
  }

  if (!sameNode(prefactor, 1)) {
    expression = {
      kind: 'product',
      factors: [
        standardSpecialFunctionExpressionFromMathJson(prefactor),
        expression,
      ],
    };
  }
  return specialFunctionAntiderivativeExpression({
    expression,
    source: 'calculus.integration:quotient-power-special-function',
  });
}

function factEntry(fact: CertificateFact): ExactSupplementEntry {
  return {
    kind: fact.relation === '\\ne0' ? 'exclusion' : 'condition',
    expressionLatex: fact.expressionLatex,
    relation: fact.relation,
    source: 'candidate-validation',
  };
}

function supplementLatex(input: ParsedQuotientPower) {
  const lines = mergeExactSupplementLatex({
    entries: [...input.inputFacts, ...input.branchFacts].map(factEntry),
    source: 'candidate-validation',
  });
  return lines.length > 0 ? lines : undefined;
}

function fieldLatex(input: ParsedQuotientPower) {
  return input.kind === 'exp'
    ? String.raw`K\left(${input.variable}, e^{${input.argumentLatex}}\right)`
    : String.raw`K\left(${input.variable}, \sin\left(${input.argumentLatex}\right), \cos\left(${input.argumentLatex}\right)\right)`;
}

function familyDescription(input: ParsedQuotientPower) {
  if (input.kind === 'exp') {
    return `Family: affine exponential quotient power ${input.denominatorPower}, reduced by the Ei recurrence.`;
  }
  const name = input.kind === 'sin' ? 'sine' : 'cosine';
  const fn = input.kind === 'sin' ? 'Si/Ci' : 'Si/Ci';
  return `Family: affine ${name} quotient power ${input.denominatorPower}, reduced by the ${fn} recurrence.`;
}

function derivativeRule(input: ParsedQuotientPower) {
  if (input.kind === 'exp') {
    return String.raw`\int \frac{e^{u}}{u^n}\,du=\frac{1}{n-1}\int\frac{e^{u}}{u^{n-1}}\,du-\frac{e^{u}}{(n-1)u^{n-1}}`;
  }
  return input.kind === 'sin'
    ? String.raw`\int \frac{\sin(u)}{u^n}\,du=\frac{1}{n-1}\int\frac{\cos(u)}{u^{n-1}}\,du-\frac{\sin(u)}{(n-1)u^{n-1}}`
    : String.raw`\int \frac{\cos(u)}{u^n}\,du=-\frac{\cos(u)}{(n-1)u^{n-1}}-\frac{1}{n-1}\int\frac{\sin(u)}{u^{n-1}}\,du`;
}

function detailSections(
  input: ParsedQuotientPower,
  exactLatex: string,
): TranscendentalNonElementaryCertificate['detailSections'] {
  return [
    {
      title: 'Non-Elementary Certificate',
      lineKind: 'text',
      lines: [
        'No elementary antiderivative exists for this affine quotient-power family in the stated elementary differential field.',
        'The main answer uses a named special function and a bounded recurrence rather than reporting a heuristic failure.',
      ],
    },
    {
      title: 'Proof Scope',
      lineKinds: ['math', 'text', 'text'],
      lines: [
        fieldLatex(input),
        familyDescription(input),
        'The quotient argument is affine in the selected variable and the denominator branch excludes zero.',
      ],
    },
    ...certificateUxDetailSections({
      inputFacts: input.inputFacts,
      branchFacts: input.branchFacts,
      proofObligations: [{
        summary: 'The named special-function base case and quotient-power recurrence are the proof obligations used for readback verification.',
        latex: derivativeRule(input),
      }],
    }),
    {
      title: 'Special-Function Readback',
      lineKinds: ['math', 'math', 'text'],
      lines: [
        exactLatex,
        derivativeRule(input),
        'The recurrence reduces the quotient power to the already-supported Si/Ci/Ei base families.',
      ],
    },
  ];
}

export function buildQuotientPowerSpecialFunctionCertificate(
  node: unknown,
  variable = 'x',
): TranscendentalNonElementaryCertificate | undefined {
  const parsed = parseQuotientPower(node, variable);
  if (!parsed) {
    return undefined;
  }

  const exactLatex = quotientPowerLatex(parsed);
  if (!exactLatex) {
    return undefined;
  }

  const normalizedExactLatex = normalizeGeneratedIntegrationLatex(exactLatex, parsed.variable);
  return profileSymbolicIntegrationResult({
    kind: 'non-elementary-certificate',
    family: 'depth2-affine-quotient',
    variable: parsed.variable,
    exactLatex: normalizedExactLatex,
    antiderivativeExpression: quotientPowerExpression(parsed),
    antiderivativeKind: 'special-function',
    fieldLatex: fieldLatex(parsed),
    theorem: 'depth2-affine-quotient-transcendental-risch',
    proofSummary: `${parsed.kind} affine quotient-power recurrence certificate with named special-function readback.`,
    exactSupplementLatex: supplementLatex(parsed),
    detailSections: detailSections(parsed, normalizedExactLatex),
  });
}
