import { ComputeEngine } from '@cortex-js/compute-engine';
import type {
  ComplexExactForm,
  DisplayBranchReadback,
  DisplayDetailLinePart,
  DisplayDetailSection,
} from '../../../types/calculator';
import {
  addExactScalars,
  divideExactScalars,
  exactScalarIsZero,
  multiplyExactScalars,
  normalizeExactScalar,
  readExactScalarNode,
  subtractExactScalars,
  type ExactScalar,
} from '../../algebra/polynomial-core';
import { simplifyMathJsonNodeOrOriginal } from '../../symbolic-engine/primitives/simplification/simplification';
import { createArithmeticHelpers, hasTarget, isArrayNode, isOneNode, type MathJson } from './math-json';
import {
  collectDirectNDegreeSymbolicTargetPolynomial,
  nDegreeSymbolicPolynomialDegree,
  subtractNDegreeSymbolicPolynomials,
} from './n-degree-symbolic-polynomial';
import { hasAmbiguousAdjacentProduct, parameterNamesFromLatex } from './target-context';
import {
  buildParameterizedDetailSections,
  normalizeParameterizedSupplementLatex,
} from './readback';
import {
  shouldUseGenericFormulaTemplate,
} from './formula-coefficient-readback';
import {
  addFormulaLatexTerms,
  fractionFormulaLatex,
  isZeroLatex,
  knownNonzeroCoefficientRatioLatex,
  multiplyFormulaLatexFactors,
  negateFormulaLatex,
  polishFormulaDetailSections,
  polishFormulaReadbackLatex,
  powerFormulaLatex,
} from './formula-readback-polish';
import {
  realCardanoSubstitutedRows,
  substitutedComplexCardanoDefinitionLines,
} from './cubic-cardano-readback';
import {
  createExactFiniteRoot,
  createRootSet,
  rootSetToBranchReadback,
  rootSetToExactLatex,
} from '../roots/representation';
import {
  cubicCardanoBranchNodes,
  cubicCardanoOmegaDefinitionLatex,
  cubicCardanoUDefinitionLatex,
  latexForCubicCardanoNode,
} from '../roots/cubic-cardano-roots';

const ce = new ComputeEngine();
const SOURCE = 'equation-cubic-cardano';
const MAX_CARDANO_EXACT_LATEX_LENGTH = 4200;
const MAX_CARDANO_BRANCH_LATEX_LENGTH = 1600;

const {
  addNodes,
  divideNodes: rawDivideNodes,
  multiplyNodes,
  negateNode: rawNegateNode,
  subtractNodes,
} = createArithmeticHelpers(simplifyCardanoNode);

function simplifyCardanoNode(node: MathJson): MathJson {
  const simplified = simplifyMathJsonNodeOrOriginal(node) as MathJson;
  return typeof simplified === 'number' && Object.is(simplified, -0) ? 0 : simplified;
}

export type ParameterizedCubicCardanoStopReason =
  | 'parse-error'
  | 'non-equation'
  | 'target-not-found'
  | 'ambiguous-adjacent-product'
  | 'target-in-denominator'
  | 'degree-limit'
  | 'target-in-unsupported-operation'
  | 'target-in-unsupported-power'
  | 'target-in-unsupported-family'
  | 'not-cubic'
  | 'ferrari-deferred'
  | 'formula-size-limit'
  | 'branch-singularity';

export type ParameterizedCubicCardanoSuccess = {
  kind: 'success';
  target: string;
  parameterNames: string[];
  exactLatex: string;
  branchReadback?: DisplayBranchReadback;
  exactSupplementLatex?: string[];
  detailSections: DisplayDetailSection[];
};

export type ParameterizedCubicCardanoStop = {
  kind: 'unsupported';
  reason: ParameterizedCubicCardanoStopReason;
  message: string;
  target: string;
  parameterNames: string[];
};

export type ParameterizedCubicCardanoResult =
  | ParameterizedCubicCardanoSuccess
  | ParameterizedCubicCardanoStop;

export type ParameterizedCubicCardanoOptions = {
  allowGeneratedImplicitProducts?: boolean;
  complexExactForm?: ComplexExactForm;
};

const CARDANO_COLLECT_MESSAGES = {
  targetInDenominator: {
    reason: 'target-in-denominator',
    message: 'Cubic Cardano solving does not consume selected-target denominators.',
  },
  degreeLimit: {
    reason: 'degree-limit',
    message: 'Cubic Cardano solving is capped at direct cubic polynomials; quartics remain Ferrari-deferred.',
  },
  targetInUnsupportedExpression: {
    reason: 'target-in-unsupported-operation',
    message: 'The selected target appears in an unsupported expression shape.',
  },
  targetInUnsupportedPower: {
    reason: 'target-in-unsupported-power',
    message: 'Cubic Cardano solving only supports direct selected-target powers.',
  },
  targetInUnsupportedFamily: {
    reason: 'target-in-unsupported-family',
    message: 'This selected-target family is outside the direct cubic Cardano route.',
  },
} as const;

function stop(
  reason: ParameterizedCubicCardanoStopReason,
  message: string,
  target: string,
  parameterNames: string[],
): ParameterizedCubicCardanoStop {
  return {
    kind: 'unsupported',
    reason,
    message,
    target,
    parameterNames,
  };
}

type CollectedCubicCardanoPolynomial = {
  kind: 'success';
  target: string;
  parameterNames: string[];
  coefficients: {
    a: MathJson;
    b: MathJson;
    c: MathJson;
    d: MathJson;
  };
};

function collectCubicCardanoPolynomial(
  equationLatex: string,
  target: string,
  options: ParameterizedCubicCardanoOptions,
): CollectedCubicCardanoPolynomial | ParameterizedCubicCardanoStop {
  const parameterNames = parameterNamesFromLatex(equationLatex, target);

  if (!options.allowGeneratedImplicitProducts && hasAmbiguousAdjacentProduct(equationLatex)) {
    return stop(
      'ambiguous-adjacent-product',
      'Adjacent letters must use explicit multiplication before cubic Cardano solving.',
      target,
      parameterNames,
    );
  }

  let parsed: ReturnType<typeof ce.parse>;
  try {
    parsed = ce.parse(equationLatex);
  } catch {
    return stop('parse-error', 'The equation could not be parsed for cubic Cardano solving.', target, parameterNames);
  }

  const json = parsed.json;
  if (!isArrayNode(json) || json[0] !== 'Equal' || json.length !== 3) {
    return stop('non-equation', 'Enter an = equation before cubic Cardano solving.', target, parameterNames);
  }

  if (!hasTarget(json, target)) {
    return stop('target-not-found', `Selected target ${target} was not found in this equation.`, target, parameterNames);
  }

  const left = collectDirectNDegreeSymbolicTargetPolynomial(
    json[1],
    target,
    4,
    CARDANO_COLLECT_MESSAGES,
  );
  if (left.kind === 'unsupported') {
    return stop(left.reason, left.message, target, parameterNames);
  }

  const right = collectDirectNDegreeSymbolicTargetPolynomial(
    json[2],
    target,
    4,
    CARDANO_COLLECT_MESSAGES,
  );
  if (right.kind === 'unsupported') {
    return stop(right.reason, right.message, target, parameterNames);
  }

  const polynomial = subtractNDegreeSymbolicPolynomials(left.polynomial, right.polynomial);
  const degree = nDegreeSymbolicPolynomialDegree(polynomial);
  if (degree === 4) {
    return stop(
      'ferrari-deferred',
      'Quartic formula output remains blocked until the Ferrari route is implemented.',
      target,
      parameterNames,
    );
  }
  if (degree !== 3) {
    return stop(
      'not-cubic',
      'Cubic Cardano solving only applies to direct degree-3 selected-target polynomials.',
      target,
      parameterNames,
    );
  }

  const [d = 0, c = 0, b = 0, a = 0] = polynomial.terms as MathJson[];
  return {
    kind: 'success',
    target,
    parameterNames,
    coefficients: { a, b, c, d },
  };
}

function isCardanoZeroNode(node: unknown) {
  return typeof node === 'number' && node === 0;
}

function negateNode(node: MathJson): MathJson {
  const simplified = simplifyCardanoNode(node);
  if (isCardanoZeroNode(simplified)) {
    return 0;
  }
  return simplifyCardanoNode(rawNegateNode(simplified));
}

function divideNodes(numerator: MathJson, denominator: MathJson): MathJson {
  const simplifiedNumerator = simplifyCardanoNode(numerator);
  const simplifiedDenominator = simplifyCardanoNode(denominator);
  if (isCardanoZeroNode(simplifiedNumerator)) {
    return 0;
  }
  if (isOneNode(simplifiedDenominator)) {
    return simplifiedNumerator;
  }
  return simplifyCardanoNode(rawDivideNodes(simplifiedNumerator, simplifiedDenominator));
}

function powerNode(node: MathJson, degree: number): MathJson {
  const simplified = simplifyCardanoNode(node);
  if (degree === 0) {
    return 1;
  }
  if (degree === 1) {
    return simplified;
  }
  if (isCardanoZeroNode(simplified)) {
    return 0;
  }
  if (isOneNode(simplified)) {
    return 1;
  }
  return simplifyCardanoNode(['Power', simplified, degree] as MathJson);
}

function squareCardanoNode(node: MathJson): MathJson {
  return powerNode(node, 2);
}

function sqrtNode(node: MathJson): MathJson {
  return simplifyCardanoNode(['Sqrt', node] as MathJson);
}

function nodeHasSymbol(node: MathJson): boolean {
  if (typeof node === 'string') {
    return true;
  }
  if (Array.isArray(node)) {
    return node.slice(1).some((entry) => nodeHasSymbol(entry as MathJson));
  }
  if (node && typeof node === 'object') {
    return Object.values(node).some((entry) => entry !== undefined && nodeHasSymbol(entry));
  }
  return false;
}

function nonzeroFact(node: MathJson, latex?: string): string | null {
  return nodeHasSymbol(node) ? `${latex ?? latexForCubicCardanoNode(node)}\\ne0` : null;
}

function formulaTooLarge(exactLatex: string, branchReadback?: DisplayBranchReadback) {
  return exactLatex.length > MAX_CARDANO_EXACT_LATEX_LENGTH
    || (branchReadback?.branchesLatex.some((branch) => branch.length > MAX_CARDANO_BRANCH_LATEX_LENGTH) ?? false);
}

function fractionLatex(numerator: string, denominator: string) {
  return fractionFormulaLatex(numerator, denominator);
}

function negateLatex(latex: string) {
  return negateFormulaLatex(latex);
}

function addLatexTerms(terms: string[]) {
  return addFormulaLatexTerms(terms);
}

function multiplyLatexFactors(factors: string[]) {
  return multiplyFormulaLatexFactors(factors);
}

function powerLatex(base: string, degree: number) {
  return powerFormulaLatex(base, degree);
}

function ratioLatex(numerator: MathJson, denominatorLatex: string) {
  const simplifiedNumerator = simplifyCardanoNode(numerator);
  if (isCardanoZeroNode(simplifiedNumerator)) {
    return '0';
  }
  const numeratorLatex = latexForCubicCardanoNode(simplifiedNumerator);
  return knownNonzeroCoefficientRatioLatex(numeratorLatex, denominatorLatex)
    ?? fractionLatex(numeratorLatex, denominatorLatex);
}

function cubicCardanoLatexParts(options: {
  a: MathJson;
  b: MathJson;
  c: MathJson;
  d: MathJson;
  noDenominator: boolean;
}) {
  const aLatex = latexForCubicCardanoNode(options.a);
  const A = ratioLatex(options.b, aLatex);
  const B = ratioLatex(options.c, aLatex);
  const C = ratioLatex(options.d, aLatex);

  const shift = isZeroLatex(A) ? '0' : negateLatex(fractionLatex(A, '3'));
  const p = isZeroLatex(A)
    ? B
    : addLatexTerms([
      B,
      negateLatex(fractionLatex(powerLatex(A, 2), '3')),
    ]);
  const q = isZeroLatex(A)
    ? C
    : addLatexTerms([
      fractionLatex(multiplyLatexFactors(['2', powerLatex(A, 3)]), '27'),
      negateLatex(fractionLatex(multiplyLatexFactors([A, B]), '3')),
      C,
    ]);
  const delta = addLatexTerms([
    powerLatex(fractionLatex(q, '2'), 2),
    powerLatex(fractionLatex(p, '3'), 3),
  ]);
  const negatedQ = negateLatex(q);
  const primaryRadicand = options.noDenominator
    ? negatedQ
    : addLatexTerms([
      negateLatex(fractionLatex(q, '2')),
      `\\sqrt{${delta}}`,
    ]);

  return {
    a: aLatex,
    A,
    B,
    C,
    shift,
    p,
    q,
    delta,
    primaryRadicand,
    negatedQ,
  };
}

function compactCardanoDefinitionLines(options: {
  latexParts: ReturnType<typeof cubicCardanoLatexParts>;
  noDenominator: boolean;
  complexExactForm: ComplexExactForm;
}) {
  const branchIndexes = [0, 1, 2] as const;
  return [
    `A=${options.latexParts.A}`,
    `B=${options.latexParts.B}`,
    `C=${options.latexParts.C}`,
    options.noDenominator ? 'p=0' : 'p=B-\\frac{A^2}{3}',
    'q=\\frac{2A^3}{27}-\\frac{A B}{3}+C',
    '\\Delta=\\left(\\frac{q}{2}\\right)^2+\\left(\\frac{p}{3}\\right)^3',
    ...(!options.noDenominator ? ['R=-\\frac{q}{2}+\\sqrt{\\Delta}'] : []),
    ...branchIndexes.map((branchIndex) =>
      cubicCardanoOmegaDefinitionLatex(branchIndex, options.complexExactForm)),
    ...(!options.noDenominator
      ? branchIndexes.map(cubicCardanoUDefinitionLatex)
      : []),
    options.noDenominator
      ? 'x_{k}=-\\frac{A}{3}+\\operatorname{PrincipalRoot}_{3}\\left(-q\\right)\\omega_{k},\\quad k=0,1,2'
      : 'x_{k}=-\\frac{A}{3}+U_{k}-\\frac{p}{3U_{k}},\\quad k=0,1,2',
  ];
}

function realCardanoDefinitionLines(
  target: string,
  latexParts: ReturnType<typeof cubicCardanoLatexParts>,
  useGenericTemplate: boolean,
) {
  if (!useGenericTemplate) {
    return [
      `p=${latexParts.p}`,
      `q=${latexParts.q}`,
      `\\Delta=${latexParts.delta}`,
      `${target}=${addLatexTerms(['y', latexParts.shift])}`,
    ];
  }

  return [
    `A=${latexParts.A}`,
    `B=${latexParts.B}`,
    `C=${latexParts.C}`,
    'p=B-\\frac{A^2}{3}',
    'q=\\frac{2A^3}{27}-\\frac{A B}{3}+C',
    '\\Delta=\\left(\\frac{q}{2}\\right)^2+\\left(\\frac{p}{3}\\right)^3',
    `${target}=y-\\frac{A}{3}`,
  ];
}

const REAL_DELTA_POSITIVE_ROOT =
  '-\\frac{A}{3}+\\sqrt[3]{-\\frac{q}{2}+\\sqrt{\\Delta}}+\\sqrt[3]{-\\frac{q}{2}-\\sqrt{\\Delta}}';
const REAL_TRIPLE_ROOT = '-\\frac{A}{3}';
const REAL_REPEATED_SIMPLE_ROOT = '-\\frac{A}{3}+\\frac{3q}{p}';
const REAL_REPEATED_DOUBLE_ROOT = '-\\frac{A}{3}-\\frac{3q}{2p}';
const REAL_CASUS_ROOT =
  '-\\frac{A}{3}+2\\sqrt{-\\frac{p}{3}}\\cos\\left(\\frac{1}{3}\\arccos\\left(\\frac{3q}{2p}\\sqrt{-\\frac{3}{p}}\\right)-\\frac{2\\pi k}{3}\\right)';

type RealCardanoCase =
  | 'delta-positive'
  | 'delta-zero-triple'
  | 'delta-zero-repeated'
  | 'delta-negative';

function rootSetLatex(entries: string[]) {
  return `\\left\\{${entries.join(',\\ ')}\\right\\}`;
}

function realCardanoCaseRows(
  caseFilter?: RealCardanoCase,
  latexParts?: ReturnType<typeof cubicCardanoLatexParts>,
) {
  const rows: { valueLatex: string; conditionLatex: string }[] = [
    {
      valueLatex: rootSetLatex([REAL_DELTA_POSITIVE_ROOT]),
      conditionLatex: '\\Delta>0',
    },
    {
      valueLatex: rootSetLatex([REAL_TRIPLE_ROOT]),
      conditionLatex: '\\Delta=0,\\ p=0,\\ q=0',
    },
    {
      valueLatex: rootSetLatex([REAL_REPEATED_SIMPLE_ROOT, REAL_REPEATED_DOUBLE_ROOT]),
      conditionLatex: '\\Delta=0,\\ p\\ne0',
    },
    {
      valueLatex: `\\left\\{${REAL_CASUS_ROOT}\\mid k=0,1,2\\right\\}`,
      conditionLatex: '\\Delta<0,\\ p<0',
    },
  ];

  const effectiveRows = latexParts ? realCardanoSubstitutedRows(latexParts) : rows;

  if (!caseFilter) {
    return effectiveRows;
  }

  const indexByCase: Record<RealCardanoCase, number> = {
    'delta-positive': 0,
    'delta-zero-triple': 1,
    'delta-zero-repeated': 2,
    'delta-negative': 3,
  };
  return [effectiveRows[indexByCase[caseFilter]]];
}

function realCardanoCaseNote(row: ReturnType<typeof realCardanoCaseRows>[number]) {
  if (row.conditionLatex === '\\Delta=0,\\ p=0,\\ q=0') {
    return ' has multiplicity 3';
  }
  if (row.conditionLatex === '\\Delta=0,\\ p\\ne0') {
    return ' first root is simple and second root is double';
  }
  return '';
}

function realCardanoCaseDetailSection(
  caseFilter?: RealCardanoCase,
  latexParts?: ReturnType<typeof cubicCardanoLatexParts>,
): DisplayDetailSection {
  const rows = realCardanoCaseRows(caseFilter, latexParts).map((row): {
    line: string;
    parts: DisplayDetailLinePart[];
  } => {
    const note = realCardanoCaseNote(row);
    return {
      line: `${row.valueLatex}, ${row.conditionLatex}${note}`,
      parts: [
        { kind: 'math', latex: row.valueLatex },
        { kind: 'text', text: ', ' },
        { kind: 'math', latex: row.conditionLatex },
        ...(note ? [{ kind: 'text' as const, text: note }] : []),
      ],
    };
  });

  return {
    title: 'Real Cardano Cases',
    lines: rows.map((row) => row.line),
    lineParts: rows.map((row) => row.parts),
  };
}

function realCardanoCaseExpressionLatex(
  target: string,
  caseFilter?: RealCardanoCase,
  latexParts?: ReturnType<typeof cubicCardanoLatexParts>,
) {
  const rows = realCardanoCaseRows(caseFilter, latexParts)
    .map((row) => `${row.valueLatex},&${row.conditionLatex}`)
    .join('\\\\');
  return `${target}\\in\\begin{cases}${rows}\\end{cases}`;
}

function exactScalarPower(value: ExactScalar, exponent: number): ExactScalar {
  let result: ExactScalar = { numerator: 1, denominator: 1 };
  for (let index = 0; index < exponent; index += 1) {
    result = multiplyExactScalars(result, value);
  }
  return result;
}

function divideExactOrNull(left: ExactScalar, right: ExactScalar | number) {
  const denominator = typeof right === 'number'
    ? { numerator: right, denominator: 1 }
    : right;
  return divideExactScalars(left, denominator);
}

function exactScalarSign(value: ExactScalar) {
  const normalized = normalizeExactScalar(value);
  return normalized.numerator === 0 ? 0 : normalized.numerator > 0 ? 1 : -1;
}

function exactRealCardanoScalars(coefficients: CollectedCubicCardanoPolynomial['coefficients']) {
  const a = readExactScalarNode(coefficients.a);
  const b = readExactScalarNode(coefficients.b);
  const c = readExactScalarNode(coefficients.c);
  const d = readExactScalarNode(coefficients.d);
  if (!a || !b || !c || !d || exactScalarIsZero(a)) {
    return null;
  }

  const A = divideExactScalars(b, a);
  const B = divideExactScalars(c, a);
  const C = divideExactScalars(d, a);
  if (!A || !B || !C) {
    return null;
  }

  const A2Over3 = divideExactOrNull(exactScalarPower(A, 2), 3);
  const twoA3Over27 = divideExactOrNull(multiplyExactScalars({ numerator: 2, denominator: 1 }, exactScalarPower(A, 3)), 27);
  const ABOver3 = divideExactOrNull(multiplyExactScalars(A, B), 3);
  if (!A2Over3 || !twoA3Over27 || !ABOver3) {
    return null;
  }

  const p = subtractExactScalars(B, A2Over3);
  const q = addExactScalars(subtractExactScalars(twoA3Over27, ABOver3), C);
  const qHalf = divideExactOrNull(q, 2);
  const pThird = divideExactOrNull(p, 3);
  if (!qHalf || !pThird) {
    return null;
  }

  const delta = addExactScalars(exactScalarPower(qHalf, 2), exactScalarPower(pThird, 3));
  return { p, q, delta };
}

function specializeRealCardanoCase(coefficients: CollectedCubicCardanoPolynomial['coefficients']): RealCardanoCase | undefined {
  const exact = exactRealCardanoScalars(coefficients);
  if (!exact) {
    return undefined;
  }

  const deltaSign = exactScalarSign(exact.delta);
  if (deltaSign > 0) {
    return 'delta-positive';
  }
  if (deltaSign < 0) {
    return exactScalarSign(exact.p) < 0 ? 'delta-negative' : undefined;
  }
  if (exactScalarIsZero(exact.p) && exactScalarIsZero(exact.q)) {
    return 'delta-zero-triple';
  }
  return exactScalarIsZero(exact.p) ? undefined : 'delta-zero-repeated';
}

export function solveParameterizedCubicCardanoEquation(
  equationLatex: string,
  target: string,
  options: ParameterizedCubicCardanoOptions = {},
): ParameterizedCubicCardanoResult {
  const collected = collectCubicCardanoPolynomial(equationLatex, target, options);
  if (collected.kind === 'unsupported') {
    return collected;
  }

  const { a, b, c, d } = collected.coefficients;
  const parameterNames = collected.parameterNames;
  const useGenericTemplate = shouldUseGenericFormulaTemplate([a, b, c, d]);
  const A = divideNodes(b, a);
  const B = divideNodes(c, a);
  const C = divideNodes(d, a);
  const p = subtractNodes(B, divideNodes(squareCardanoNode(A), 3));
  const q = addNodes(
    divideNodes(multiplyNodes(2, powerNode(A, 3)), 27),
    negateNode(divideNodes(multiplyNodes(A, B), 3)),
    C,
  );
  const delta = addNodes(
    squareCardanoNode(divideNodes(q, 2)),
    powerNode(divideNodes(p, 3), 3),
  );
  const shift = negateNode(divideNodes(A, 3));
  const noDenominator = isCardanoZeroNode(simplifyCardanoNode(p));
  const primaryRadicand = noDenominator
    ? negateNode(q)
    : addNodes(negateNode(divideNodes(q, 2)), sqrtNode(delta));

  if (!noDenominator && isCardanoZeroNode(simplifyCardanoNode(primaryRadicand))) {
    return stop(
      'branch-singularity',
      'The direct Cardano branch formula would divide by a zero principal cube-root branch.',
      target,
      parameterNames,
    );
  }

  const latexParts = cubicCardanoLatexParts({ a, b, c, d, noDenominator });
  const branchNodes = cubicCardanoBranchNodes({
    shift,
    p,
    q,
    delta,
    primaryRadicand,
    noDenominator,
    latex: {
      shift: latexParts.shift,
      p: latexParts.p,
      q: latexParts.q,
      delta: latexParts.delta,
      primaryRadicand: latexParts.primaryRadicand,
      negatedQ: latexParts.negatedQ,
      ...(useGenericTemplate ? { compact: true } : {}),
    },
  });
  const rootSet = createRootSet({
    target,
    source: SOURCE,
    entries: branchNodes.map((node) =>
      createExactFiniteRoot('cardano-branch', { source: SOURCE, node })),
  });
  const presentationContext = {
    context: { domainIntent: 'complex' as const },
    presentationContext: { complexExactForm: options.complexExactForm ?? 'rectangular' },
  };
  const renderedExactLatex = rootSetToExactLatex(rootSet, presentationContext);
  if (!renderedExactLatex) {
    return stop(
      'formula-size-limit',
      'The cubic Cardano branches could not be rendered as visible finite roots.',
      target,
      parameterNames,
    );
  }
  const exactLatex = polishFormulaReadbackLatex(renderedExactLatex);
  const branchReadback = rootSetToBranchReadback(rootSet, {
    source: SOURCE,
    relationLatex: '\\in',
    ...presentationContext,
  });
  if (formulaTooLarge(exactLatex, branchReadback)) {
    return stop(
      'formula-size-limit',
      'The cubic Cardano formula exceeded the symbolic readback cap.',
      target,
      parameterNames,
    );
  }

  const exactSupplementLatex = normalizeParameterizedSupplementLatex([
    nonzeroFact(a, latexParts.a),
    ...(!noDenominator ? ['R\\ne0'] : []),
  ].filter((entry): entry is string => Boolean(entry)));
  const complexExactForm = options.complexExactForm ?? 'rectangular';
  const detailSections = polishFormulaDetailSections(buildParameterizedDetailSections({
    target,
    parameterNames,
    familyTitle: 'Cubic Cardano Route',
    familyLines: [
      'Domain intent: Complex.',
      'Collected a direct degree-3 selected-target polynomial and normalized it to a monic cubic.',
      useGenericTemplate
        ? 'Applied Cardano branches using Calcwiz PrincipalRoot_3 notation and compact auxiliary definitions.'
        : 'Substituted the collected coefficients before rendering the visible Cardano branches.',
      noDenominator
        ? 'Used the p=0 branch form to avoid introducing a Cardano denominator.'
        : 'Displayed the compact R nonzero condition required by this Cardano branch form.',
    ],
    extraSections: [{
      title: useGenericTemplate ? 'Cardano Definitions' : 'Substituted Cardano Values',
      lines: useGenericTemplate
        ? compactCardanoDefinitionLines({
          latexParts,
          noDenominator,
          complexExactForm,
        })
        : substitutedComplexCardanoDefinitionLines({
          latexParts,
          noDenominator,
          complexExactForm,
        }),
      lineKind: 'math',
    }],
  }));

  return {
    kind: 'success',
    target,
    parameterNames,
    exactLatex,
    branchReadback,
    exactSupplementLatex,
    detailSections,
  };
}

export function solveParameterizedRealCubicCardanoEquation(
  equationLatex: string,
  target: string,
  options: ParameterizedCubicCardanoOptions = {},
): ParameterizedCubicCardanoResult {
  const collected = collectCubicCardanoPolynomial(equationLatex, target, options);
  if (collected.kind === 'unsupported') {
    return collected;
  }

  const { a, b, c, d } = collected.coefficients;
  const useGenericTemplate = shouldUseGenericFormulaTemplate([a, b, c, d]);
  const latexParts = cubicCardanoLatexParts({
    a,
    b,
    c,
    d,
    noDenominator: false,
  });
  const caseFilter = specializeRealCardanoCase(collected.coefficients);
  const exactLatex = polishFormulaReadbackLatex(realCardanoCaseExpressionLatex(
    target,
    caseFilter,
    useGenericTemplate ? undefined : latexParts,
  ));
  if (formulaTooLarge(exactLatex)) {
    return stop(
      'formula-size-limit',
      'The real cubic Cardano case formula exceeded the symbolic readback cap.',
      target,
      collected.parameterNames,
    );
  }

  const exactSupplementLatex = normalizeParameterizedSupplementLatex([
    nonzeroFact(a, latexParts.a),
  ].filter((entry): entry is string => Boolean(entry)));
  const detailSections = polishFormulaDetailSections(buildParameterizedDetailSections({
    target,
    parameterNames: collected.parameterNames,
    familyTitle: 'Cubic Cardano Route',
    familyLines: [
      'Domain intent: Real.',
      'Collected a direct degree-3 selected-target polynomial and normalized it to a monic cubic.',
      caseFilter
        ? 'Selected the applicable Real Cardano discriminant case from exact scalar coefficient signs.'
        : 'Displayed all Real Cardano discriminant cases because the symbolic signs are not known.',
      useGenericTemplate
        ? 'Kept discriminant and multiplicity conditions case-local instead of global Valid When facts.'
        : 'Substituted the collected coefficients before rendering the visible Real Cardano case rows.',
    ],
    extraSections: [
      {
        title: useGenericTemplate ? 'Real Cardano Definitions' : 'Substituted Real Cardano Values',
        lines: realCardanoDefinitionLines(target, latexParts, useGenericTemplate),
        lineKind: 'math',
      },
      {
        ...realCardanoCaseDetailSection(caseFilter, useGenericTemplate ? undefined : latexParts),
      },
    ],
  }));

  return {
    kind: 'success',
    target,
    parameterNames: collected.parameterNames,
    exactLatex,
    exactSupplementLatex,
    detailSections,
  };
}
