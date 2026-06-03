import { ComputeEngine } from '@cortex-js/compute-engine';
import {
  allRealInequalitySet,
  emptyInequalitySet,
  greaterThanInequalitySet,
  greaterThanOrEqualInequalitySet,
  inequalitySetToLatex,
  inequalitySetToText,
  lessThanInequalitySet,
  lessThanOrEqualInequalitySet,
  valueDomainMetadataFromInequalitySet,
} from '../algebra/inequality-core';
import { assumptionFactsToDetailSections } from '../algebra/assumption-readback';
import { analyzeVariablesFromLatex } from '../algebra/variable-core';
import {
  divideExactScalars,
  exactPolynomialDegree,
  exactScalarIsZero,
  exactScalarToNumber,
  getExactPolynomialCoefficient,
  negateExactScalar,
  normalizeExactScalar,
  parseExactPolynomial,
  type ExactScalar,
} from '../algebra/polynomial-core';
import type { DisplayOutcome, EquationAnswerMode, EquationDomainIntent } from '../../types/calculator';

const ce = new ComputeEngine();

type InequalityRelation = 'Less' | 'LessEqual' | 'Greater' | 'GreaterEqual';
type MathJson = string | number | boolean | null | MathJson[] | { [key: string]: MathJson | undefined };

function isArrayNode(node: unknown): node is unknown[] {
  return Array.isArray(node);
}

function isInequalityRelation(operator: unknown): operator is InequalityRelation {
  return operator === 'Less'
    || operator === 'LessEqual'
    || operator === 'Greater'
    || operator === 'GreaterEqual';
}

export function isTopLevelInequalityLatex(latex: string) {
  try {
    const json = ce.parse(latex).json;
    return isArrayNode(json) && isInequalityRelation(json[0]);
  } catch {
    return /\\(?:le|leq|ge|geq)(?![A-Za-z])|[<>≤≥]/u.test(latex);
  }
}

function simplifyNode(node: MathJson): MathJson {
  try {
    return ce.box(node as Parameters<typeof ce.box>[0]).simplify().json as MathJson;
  } catch {
    return node;
  }
}

function exactScalarToLatex(value: ExactScalar) {
  const normalized = normalizeExactScalar(value);
  return normalized.denominator === 1
    ? `${normalized.numerator}`
    : `\\frac{${normalized.numerator}}{${normalized.denominator}}`;
}

function relationSymbol(relation: InequalityRelation) {
  switch (relation) {
    case 'Less':
      return '<';
    case 'LessEqual':
      return '\\le';
    case 'Greater':
      return '>';
    case 'GreaterEqual':
      return '\\ge';
  }
}

function relationText(relation: InequalityRelation) {
  switch (relation) {
    case 'Less':
      return '<';
    case 'LessEqual':
      return '<=';
    case 'Greater':
      return '>';
    case 'GreaterEqual':
      return '>=';
  }
}

function flipRelation(relation: InequalityRelation): InequalityRelation {
  switch (relation) {
    case 'Less':
      return 'Greater';
    case 'LessEqual':
      return 'GreaterEqual';
    case 'Greater':
      return 'Less';
    case 'GreaterEqual':
      return 'LessEqual';
  }
}

function testScalarRelation(value: ExactScalar, relation: InequalityRelation) {
  const numeric = exactScalarToNumber(value);
  switch (relation) {
    case 'Less':
      return numeric < 0;
    case 'LessEqual':
      return numeric <= 0;
    case 'Greater':
      return numeric > 0;
    case 'GreaterEqual':
      return numeric >= 0;
  }
}

function parseInequality(latex: string) {
  const json = ce.parse(latex).json as MathJson;
  if (!isArrayNode(json) || !isInequalityRelation(json[0])) {
    return null;
  }
  if (json.length !== 3) {
    return { kind: 'unsupported' as const, reason: 'chained-relation' as const };
  }
  return {
    kind: 'parsed' as const,
    relation: json[0],
    left: json[1] as MathJson,
    right: json[2] as MathJson,
  };
}

function relationSet(variable: string, relation: InequalityRelation, bound: number) {
  switch (relation) {
    case 'Less':
      return lessThanInequalitySet(variable, bound);
    case 'LessEqual':
      return lessThanOrEqualInequalitySet(variable, bound);
    case 'Greater':
      return greaterThanInequalitySet(variable, bound);
    case 'GreaterEqual':
      return greaterThanOrEqualInequalitySet(variable, bound);
  }
}

function relationLatex(variable: string, relation: InequalityRelation, bound: ExactScalar) {
  return `${variable}${relationSymbol(relation)}${exactScalarToLatex(bound)}`;
}

function unsupportedInequalityOutcome(input: {
  equationLatex: string;
  answerMode: EquationAnswerMode;
  equationDomainIntent: EquationDomainIntent;
  reason?: string;
}): DisplayOutcome {
  const lines = [
    'INEQUALITY-EQUATION1 only solves one-variable linear inequalities with numeric coefficients.',
    input.reason ?? 'This inequality is outside the first bounded family.',
  ];
  if (input.equationDomainIntent === 'complex') {
    lines.push('Complex intent is enabled, but ordered inequalities are solved over the real line.');
  }

  return {
    kind: 'error',
    title: 'Inequality',
    error: 'This inequality is outside the first bounded Equation inequality family.',
    warnings: [],
    answerMode: input.answerMode,
    answerDomain: 'conditional-real',
    solutionKind: 'condition-fact-only-stop',
    detailSections: [
      {
        title: 'Inequality Route',
        lines,
      },
      {
        title: 'What To Try',
        lines: [
          'Use Exact mode with a one-variable linear inequality such as 2x+3<=7.',
          'Use an = equation when you need symbolic solving, Approximate, or Isolate.',
        ],
      },
    ],
  };
}

export function inequalityAnswerModeGuidanceOutcome(input: {
  answerMode: EquationAnswerMode;
  equationDomainIntent: EquationDomainIntent;
}): DisplayOutcome {
  const modeLabel = input.answerMode === 'approximate' ? 'Approximate' : 'Isolate';
  return {
    kind: 'error',
    title: 'Inequality',
    error: `${modeLabel} answer mode does not solve inequalities.`,
    warnings: [],
    answerMode: input.answerMode,
    answerDomain: 'conditional-real',
    solutionKind: 'condition-fact-only-stop',
    detailSections: [
      {
        title: 'Answer Mode',
        lines: [
          `Answer mode: ${modeLabel}.`,
          'Use Exact mode for bounded real interval inequality sets.',
        ],
      },
      {
        title: 'Real Order',
        lines: [
          input.equationDomainIntent === 'complex'
            ? 'Complex intent is enabled, but ordered inequalities are solved over the real line.'
            : 'Ordered inequalities are solved over the real line.',
        ],
      },
    ],
  };
}

export function solveBoundedLinearInequality(input: {
  equationLatex: string;
  target?: string | null;
  answerMode: EquationAnswerMode;
  equationDomainIntent: EquationDomainIntent;
}): DisplayOutcome {
  if (input.answerMode !== 'exact') {
    return inequalityAnswerModeGuidanceOutcome({
      answerMode: input.answerMode,
      equationDomainIntent: input.equationDomainIntent,
    });
  }

  let parsed: ReturnType<typeof parseInequality>;
  try {
    parsed = parseInequality(input.equationLatex);
  } catch {
    return unsupportedInequalityOutcome({
      ...input,
      reason: 'The inequality could not be parsed as a top-level ordered relation.',
    });
  }

  if (!parsed || parsed.kind !== 'parsed') {
    return unsupportedInequalityOutcome({
      ...input,
      reason: parsed?.reason === 'chained-relation'
        ? 'Chained inequalities are deferred.'
        : 'Only <, <=, >, and >= relations are included.',
    });
  }

  const variableAnalysis = analyzeVariablesFromLatex(input.equationLatex, { allowSymbolicParameters: true });
  const variables = [...new Set(variableAnalysis.symbols
    .filter((symbol) =>
      symbol.identifierKind === 'single-symbol-variable'
      || symbol.identifierKind === 'named-variable'
      || symbol.identifierKind === 'indexed-symbol-variable')
    .map((symbol) => symbol.name))];
  const target = input.target ?? (variables.length === 1 ? variables[0] : null);
  if (!target || variables.length !== 1 || variables[0] !== target) {
    return unsupportedInequalityOutcome({
      ...input,
      reason: 'The first inequality route requires exactly one solve target and no symbolic parameters.',
    });
  }

  const zeroForm = simplifyNode(['Subtract', parsed.left, parsed.right]);
  const polynomial = parseExactPolynomial(zeroForm, target, 1);
  if (!polynomial || exactPolynomialDegree(polynomial) > 1) {
    return unsupportedInequalityOutcome({
      ...input,
      reason: 'Only linear numeric-coefficient inequalities are included.',
    });
  }

  const a = getExactPolynomialCoefficient(polynomial, 1);
  const b = getExactPolynomialCoefficient(polynomial, 0);
  const inequalitySet = exactScalarIsZero(a)
    ? (testScalarRelation(b, parsed.relation) ? allRealInequalitySet(target) : emptyInequalitySet(target))
    : (() => {
        const bound = divideExactScalars(negateExactScalar(b), a);
        if (!bound) {
          return null;
        }
        const effectiveRelation = exactScalarToNumber(a) < 0 ? flipRelation(parsed.relation) : parsed.relation;
        return relationSet(target, effectiveRelation, exactScalarToNumber(bound));
      })();

  if (!inequalitySet) {
    return unsupportedInequalityOutcome({
      ...input,
      reason: 'The inequality bound could not be constructed safely.',
    });
  }

  const bound = exactScalarIsZero(a) ? null : divideExactScalars(negateExactScalar(b), a);
  const effectiveRelation = bound && exactScalarToNumber(a) < 0 ? flipRelation(parsed.relation) : parsed.relation;
  const exactLatex = bound ? relationLatex(target, effectiveRelation, bound) : inequalitySetToLatex(inequalitySet);
  const metadata = valueDomainMetadataFromInequalitySet(inequalitySet, {
    expressionLatex: exactLatex,
    details: [
      `Solved linear inequality: ${target} ${relationText(effectiveRelation)} ${bound ? exactScalarToLatex(bound) : inequalitySetToText(inequalitySet)}.`,
    ],
  });
  const detailSections = [
    {
      title: 'Inequality Route',
      lines: [
        'Answer mode: Exact.',
        'Solved a bounded one-variable linear inequality.',
      ],
    },
    {
      title: 'Real Order',
      lines: [
        input.equationDomainIntent === 'complex'
          ? 'Complex intent is enabled, but ordered inequalities are solved over the real line.'
          : 'Ordered inequalities are solved over the real line.',
      ],
    },
    ...assumptionFactsToDetailSections(metadata.facts),
  ];

  return {
    kind: 'success',
    title: 'Inequality',
    exactLatex,
    warnings: [],
    answerMode: 'exact',
    answerDomain: metadata.answerDomain,
    solutionKind: metadata.solutionKind,
    detailSections,
  };
}
