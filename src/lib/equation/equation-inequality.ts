import {
  allRealInequalitySet,
  emptyInequalitySet,
  inequalitySetToLatex,
  inequalitySetToText,
  normalizeInequalitySet,
  valueDomainMetadataFromInequalitySet,
  type InequalityInterval,
} from '../algebra/inequality-core';
import { assumptionFactsToDetailSections } from '../algebra/assumption-readback';
import { factorBoundedPolynomialAst } from '../algebra/polynomial-factor-solve';
import {
  addExactScalars,
  divideExactScalars,
  exactPolynomialDegree,
  exactScalarIsZero,
  exactScalarToNumber,
  getExactPolynomialCoefficient,
  negateExactScalar,
  normalizeExactScalar,
  parseExactPolynomial,
  quadraticDiscriminant,
  type ExactPolynomial,
  type ExactScalar,
} from '../algebra/polynomial-core';
import type { DisplayOutcome, EquationAnswerMode, EquationDomainIntent } from '../../types/calculator';
import {
  extractEquationPolynomialDomain,
  isEquationPolynomialRelation,
  type EquationPolynomialRelation,
} from './equation-polynomial-domain';

type InequalityRelation = Exclude<EquationPolynomialRelation, 'Equal'>;

type RealRoot = {
  numeric: number;
  latex: string;
};

const ROOT_EPSILON = 1e-9;

function relationFromLatexFallback(latex: string) {
  return /\\(?:le|leq|ge|geq)(?![A-Za-z])|[<>≤≥]/u.test(latex);
}

export function isTopLevelInequalityLatex(latex: string) {
  const extracted = extractEquationPolynomialDomain({
    equationLatex: latex,
    allowedRelations: ['Less', 'LessEqual', 'Greater', 'GreaterEqual'],
  });
  return extracted.kind === 'success'
    || (extracted.kind === 'stop' && extracted.reason !== 'unsupported-relation')
    || relationFromLatexFallback(latex);
}

function exactScalarToLatex(value: ExactScalar) {
  const normalized = normalizeExactScalar(value);
  return normalized.denominator === 1
    ? `${normalized.numerator}`
    : `\\frac{${normalized.numerator}}{${normalized.denominator}}`;
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

function testRelation(value: number, relation: InequalityRelation) {
  switch (relation) {
    case 'Less':
      return value < -ROOT_EPSILON;
    case 'LessEqual':
      return value <= ROOT_EPSILON;
    case 'Greater':
      return value > ROOT_EPSILON;
    case 'GreaterEqual':
      return value >= -ROOT_EPSILON;
  }
}

function equalityAllowed(relation: InequalityRelation) {
  return relation === 'LessEqual' || relation === 'GreaterEqual';
}

function perfectSquare(value: number) {
  if (value < 0 || !Number.isInteger(value)) {
    return null;
  }
  const root = Math.sqrt(value);
  return Number.isInteger(root) ? root : null;
}

function largestSquareFactor(value: number) {
  const absolute = Math.abs(value);
  let factor = 1;
  let remaining = absolute;
  for (let candidate = 2; candidate * candidate <= remaining; candidate += 1) {
    while (remaining % (candidate * candidate) === 0) {
      factor *= candidate;
      remaining /= candidate * candidate;
    }
  }
  return factor;
}

function sqrtExactScalar(value: ExactScalar): ExactScalar | null {
  const normalized = normalizeExactScalar(value);
  const numeratorRoot = perfectSquare(normalized.numerator);
  const denominatorRoot = perfectSquare(normalized.denominator);
  return numeratorRoot !== null && denominatorRoot !== null
    ? normalizeExactScalar({ numerator: numeratorRoot, denominator: denominatorRoot })
    : null;
}

function sqrtScaledLatex(value: ExactScalar, coefficient: ExactScalar) {
  const exactRoot = sqrtExactScalar(value);
  if (exactRoot) {
    const product = normalizeExactScalar({
      numerator: exactRoot.numerator * coefficient.numerator,
      denominator: exactRoot.denominator * coefficient.denominator,
    });
    return exactScalarToLatex(product);
  }

  const normalizedValue = normalizeExactScalar(value);
  const numeratorOutside = largestSquareFactor(normalizedValue.numerator);
  const denominatorOutside = largestSquareFactor(normalizedValue.denominator);
  const outside = normalizeExactScalar({
    numerator: coefficient.numerator * numeratorOutside,
    denominator: coefficient.denominator * denominatorOutside,
  });
  const inside = normalizeExactScalar({
    numerator: normalizedValue.numerator / (numeratorOutside * numeratorOutside),
    denominator: normalizedValue.denominator / (denominatorOutside * denominatorOutside),
  });

  const sqrtLatex = inside.denominator === 1
    ? `\\sqrt{${inside.numerator}}`
    : `\\sqrt{${exactScalarToLatex(inside)}}`;

  if (outside.numerator === 1 && outside.denominator === 1) {
    return sqrtLatex;
  }
  if (outside.numerator === -1 && outside.denominator === 1) {
    return `-${sqrtLatex}`;
  }
  return `${exactScalarToLatex(outside)}${sqrtLatex}`;
}

function linearRoot(polynomial: ExactPolynomial): RealRoot | null {
  const root = divideExactScalars(
    negateExactScalar(getExactPolynomialCoefficient(polynomial, 0)),
    getExactPolynomialCoefficient(polynomial, 1),
  );
  if (!root) {
    return null;
  }
  return {
    numeric: exactScalarToNumber(root),
    latex: exactScalarToLatex(root),
  };
}

function quadraticRoots(polynomial: ExactPolynomial): RealRoot[] | null {
  const discriminant = quadraticDiscriminant(polynomial);
  if (!discriminant) {
    return null;
  }
  const discriminantNumber = exactScalarToNumber(discriminant);
  if (discriminantNumber < -ROOT_EPSILON) {
    return [];
  }

  const a = getExactPolynomialCoefficient(polynomial, 2);
  const b = getExactPolynomialCoefficient(polynomial, 1);
  const denominator = normalizeExactScalar({
    numerator: 2 * a.numerator,
    denominator: a.denominator,
  });
  const negativeB = negateExactScalar(b);

  if (Math.abs(discriminantNumber) <= ROOT_EPSILON) {
    const root = divideExactScalars(negativeB, denominator);
    return root
      ? [{ numeric: exactScalarToNumber(root), latex: exactScalarToLatex(root) }]
      : null;
  }

  const exactRoot = sqrtExactScalar(discriminant);
  const rootFromSign = (sign: 1 | -1): RealRoot | null => {
    if (exactRoot) {
      const signedRoot = sign === 1 ? exactRoot : negateExactScalar(exactRoot);
      const numerator = addExactScalars(negativeB, signedRoot);
      const root = divideExactScalars(numerator, denominator);
      return root
        ? { numeric: exactScalarToNumber(root), latex: exactScalarToLatex(root) }
        : null;
    }

    if (exactScalarIsZero(negativeB)) {
      const coefficient = divideExactScalars(
        { numerator: sign, denominator: 1 },
        denominator,
      );
      return coefficient
        ? {
            numeric: (sign * Math.sqrt(discriminantNumber)) / exactScalarToNumber(denominator),
            latex: sqrtScaledLatex(discriminant, coefficient),
          }
        : null;
    }

    const sqrtLatex = `\\sqrt{${exactScalarToLatex(discriminant)}}`;
    const denominatorLatex = exactScalarToLatex(denominator);
    const numeratorLatex = `${exactScalarToLatex(negativeB)}${sign === 1 ? '+' : '-'}${sqrtLatex}`;
    return {
      numeric: (exactScalarToNumber(negativeB) + sign * Math.sqrt(discriminantNumber))
        / exactScalarToNumber(denominator),
      latex: `\\frac{${numeratorLatex}}{${denominatorLatex}}`,
    };
  };

  const roots = [rootFromSign(-1), rootFromSign(1)];
  return roots.every((root): root is RealRoot => root !== null)
    ? roots
    : null;
}

function sortAndDedupeRoots(roots: RealRoot[]) {
  return roots
    .slice()
    .sort((left, right) => left.numeric - right.numeric)
    .filter((root, index, list) =>
      index === 0 || Math.abs(root.numeric - list[index - 1].numeric) > ROOT_EPSILON);
}

function realRootsForPolynomial(polynomial: ExactPolynomial, zeroForm: unknown): RealRoot[] | null {
  const degree = exactPolynomialDegree(polynomial);
  if (degree <= 0) {
    return [];
  }
  if (degree === 1) {
    const root = linearRoot(polynomial);
    return root ? [root] : null;
  }
  if (degree === 2) {
    const roots = quadraticRoots(polynomial);
    return roots ? sortAndDedupeRoots(roots) : null;
  }

  const factorization = factorBoundedPolynomialAst(zeroForm, polynomial.variable);
  if (!factorization) {
    return null;
  }

  const roots: RealRoot[] = [];
  for (const factor of factorization.factors) {
    const factorPolynomial = parseExactPolynomial(factor.node, polynomial.variable, 2);
    if (!factorPolynomial) {
      return null;
    }
    if (factor.degree === 1) {
      const root = linearRoot(factorPolynomial);
      if (!root) {
        return null;
      }
      roots.push(root);
      continue;
    }
    if (factor.degree === 2) {
      const quadratic = quadraticRoots(factorPolynomial);
      if (!quadratic) {
        return null;
      }
      roots.push(...quadratic);
      continue;
    }
    return null;
  }

  return sortAndDedupeRoots(roots);
}

function evaluatePolynomial(polynomial: ExactPolynomial, value: number) {
  let result = 0;
  const degree = exactPolynomialDegree(polynomial);
  for (let index = degree; index >= 0; index -= 1) {
    result = result * value + exactScalarToNumber(getExactPolynomialCoefficient(polynomial, index));
  }
  return result;
}

function signChartSet(variable: string, polynomial: ExactPolynomial, relation: InequalityRelation, roots: RealRoot[]) {
  if (roots.length === 0) {
    return testRelation(evaluatePolynomial(polynomial, 0), relation)
      ? allRealInequalitySet(variable)
      : emptyInequalitySet(variable);
  }

  const intervals: InequalityInterval[] = [];
  const sorted = sortAndDedupeRoots(roots);
  const sampleSegments = [
    { lower: undefined, upper: sorted[0] },
    ...sorted.slice(0, -1).map((root, index) => ({ lower: root, upper: sorted[index + 1] })),
    { lower: sorted.at(-1), upper: undefined },
  ];

  for (const segment of sampleSegments) {
    let sample: number;
    if (segment.lower === undefined) {
      sample = (segment.upper?.numeric ?? 0) - 1;
    } else if (segment.upper === undefined) {
      sample = segment.lower.numeric + 1;
    } else {
      sample = (segment.lower.numeric + segment.upper.numeric) / 2;
    }
    if (!testRelation(evaluatePolynomial(polynomial, sample), relation)) {
      continue;
    }
    intervals.push({
      lower: segment.lower?.numeric,
      lowerLatex: segment.lower?.latex,
      lowerInclusive: false,
      upper: segment.upper?.numeric,
      upperLatex: segment.upper?.latex,
      upperInclusive: false,
    });
  }

  if (equalityAllowed(relation)) {
    intervals.push(...sorted.map((root) => ({
      lower: root.numeric,
      lowerLatex: root.latex,
      lowerInclusive: true,
      upper: root.numeric,
      upperLatex: root.latex,
      upperInclusive: true,
    })));
  }

  return normalizeInequalitySet(variable, intervals);
}

function unsupportedInequalityOutcome(input: {
  answerMode: EquationAnswerMode;
  equationDomainIntent: EquationDomainIntent;
  reason?: string;
}): DisplayOutcome {
  const lines = [
    'INEQUALITY-EQUATION2 solves one-variable numeric-coefficient polynomial inequalities up to degree 4 when exact real roots are available.',
    input.reason ?? 'This inequality is outside the bounded polynomial family.',
  ];
  if (input.equationDomainIntent === 'complex') {
    lines.push('Complex intent is enabled, but ordered inequalities are solved over the real line.');
  }

  return {
    kind: 'error',
    title: 'Inequality',
    error: 'This inequality is outside the bounded Equation polynomial inequality family.',
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
          'Use Exact mode with a one-variable linear, quadratic, or factorable polynomial inequality.',
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

function stopReasonText(reason: string) {
  switch (reason) {
    case 'chained-relation':
      return 'Chained inequalities are deferred.';
    case 'multivariable':
      return 'The bounded polynomial inequality route requires exactly one solve target and no symbolic parameters.';
    case 'degree-limit':
      return 'Only polynomial inequalities through degree 4 are included.';
    case 'non-polynomial':
      return 'Rational sign charts, roots, absolute values, trig, log, and exp inequalities are deferred.';
    case 'unsupported-coefficient':
      return 'Only exact numeric coefficients are included.';
    default:
      return 'The inequality could not be reduced to a supported polynomial relation.';
  }
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

  const extracted = extractEquationPolynomialDomain({
    equationLatex: input.equationLatex,
    target: input.target,
    allowedRelations: ['Less', 'LessEqual', 'Greater', 'GreaterEqual'],
    maxDegree: 4,
  });

  if (extracted.kind === 'stop' || !isEquationPolynomialRelation(extracted.relation) || extracted.relation === 'Equal') {
    return unsupportedInequalityOutcome({
      ...input,
      reason: extracted.kind === 'stop' ? stopReasonText(extracted.reason) : undefined,
    });
  }

  const polynomial = extracted.metadata.polynomial;
  const roots = realRootsForPolynomial(polynomial, extracted.zeroForm);
  if (!roots) {
    return unsupportedInequalityOutcome({
      ...input,
      reason: 'The polynomial roots are not exact enough for this bounded inequality pass.',
    });
  }

  const inequalitySet = signChartSet(extracted.target, polynomial, extracted.relation, roots);
  const exactLatex = inequalitySetToLatex(inequalitySet);
  const metadata = valueDomainMetadataFromInequalitySet(inequalitySet, {
    expressionLatex: exactLatex,
    details: [
      `Solved polynomial inequality: ${inequalitySetToText(inequalitySet)}.`,
      `Polynomial degree: ${exactPolynomialDegree(polynomial)}.`,
    ],
  });
  const detailSections = [
    {
      title: 'Inequality Route',
      lines: [
        'Answer mode: Exact.',
        `Solved a bounded one-variable polynomial inequality through degree ${exactPolynomialDegree(polynomial)}.`,
        `Relation tested: p(x) ${relationText(extracted.relation)} 0.`,
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
