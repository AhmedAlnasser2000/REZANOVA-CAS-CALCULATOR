import { ComputeEngine } from '@cortex-js/compute-engine';
import type {
  DisplayBranchReadback,
  DisplayDetailLinePart,
  DisplayDetailSection,
} from '../../../types/calculator';
import { simplifyMathJsonNodeOrOriginal } from '../../symbolic-engine/primitives/simplification/simplification';
import {
  createArithmeticHelpers,
  hasTarget,
  isArrayNode,
  isOneNode,
  type MathJson,
} from './math-json';
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
  groupFormulaLatex,
  knownNonzeroCoefficientRatioLatex,
  multiplyFormulaLatexFactors,
  negateFormulaLatex,
  polishFormulaDetailSections,
  polishFormulaReadbackLatex,
  powerFormulaLatex,
} from './formula-readback-polish';
import {
  createExactFiniteRoot,
  createRootSet,
  rootSetToBranchReadback,
  rootSetToExactLatex,
} from '../roots/representation';
import {
  realFerrariCaseRows,
  type QuarticFerrariLatexParts,
} from './quartic-ferrari-real-readback';
import {
  quarticFerrariBiquadraticBranchNodes,
  quarticFerrariFDefinitionLatex,
  quarticFerrariGeneralBranchNodes,
} from '../roots/quartic-ferrari-roots';

const ce = new ComputeEngine();
const SOURCE = 'equation-quartic-ferrari';
const MAX_FERRARI_EXACT_LATEX_LENGTH = 5200;
const MAX_FERRARI_BRANCH_LATEX_LENGTH = 1400;

function simplifyFerrariNode(node: MathJson): MathJson {
  const simplified = simplifyMathJsonNodeOrOriginal(node) as MathJson;
  return typeof simplified === 'number' && Object.is(simplified, -0) ? 0 : simplified;
}

const {
  addNodes,
  divideNodes: rawDivideNodes,
  multiplyNodes,
  negateNode: rawNegateNode,
  subtractNodes,
} = createArithmeticHelpers(simplifyFerrariNode);

export type ParameterizedQuarticFerrariStopReason =
  | 'parse-error'
  | 'non-equation'
  | 'target-not-found'
  | 'ambiguous-adjacent-product'
  | 'target-in-denominator'
  | 'degree-limit'
  | 'target-in-unsupported-operation'
  | 'target-in-unsupported-power'
  | 'target-in-unsupported-family'
  | 'not-quartic'
  | 'branch-singularity'
  | 'formula-size-limit';

export type ParameterizedQuarticFerrariSuccess = {
  kind: 'success';
  target: string;
  parameterNames: string[];
  exactLatex: string;
  branchReadback?: DisplayBranchReadback;
  exactSupplementLatex?: string[];
  detailSections: DisplayDetailSection[];
};

export type ParameterizedQuarticFerrariStop = {
  kind: 'unsupported';
  reason: ParameterizedQuarticFerrariStopReason;
  message: string;
  target: string;
  parameterNames: string[];
};

export type ParameterizedQuarticFerrariResult =
  | ParameterizedQuarticFerrariSuccess
  | ParameterizedQuarticFerrariStop;

export type ParameterizedQuarticFerrariOptions = {
  allowGeneratedImplicitProducts?: boolean;
};

type CollectedQuarticFerrariPolynomial = {
  kind: 'success';
  target: string;
  parameterNames: string[];
  coefficients: {
    a: MathJson;
    b: MathJson;
    c: MathJson;
    d: MathJson;
    e: MathJson;
  };
};

const FERRARI_COLLECT_MESSAGES = {
  targetInDenominator: {
    reason: 'target-in-denominator',
    message: 'Quartic Ferrari solving does not consume selected-target denominators.',
  },
  degreeLimit: {
    reason: 'degree-limit',
    message: 'Quartic Ferrari solving is capped at direct degree-4 selected-target polynomials.',
  },
  targetInUnsupportedExpression: {
    reason: 'target-in-unsupported-operation',
    message: 'The selected target appears in an unsupported expression shape.',
  },
  targetInUnsupportedPower: {
    reason: 'target-in-unsupported-power',
    message: 'Quartic Ferrari solving only supports direct selected-target powers.',
  },
  targetInUnsupportedFamily: {
    reason: 'target-in-unsupported-family',
    message: 'This selected-target family is outside the direct quartic Ferrari route.',
  },
} as const;

function stop(
  reason: ParameterizedQuarticFerrariStopReason,
  message: string,
  target: string,
  parameterNames: string[],
): ParameterizedQuarticFerrariStop {
  return {
    kind: 'unsupported',
    reason,
    message,
    target,
    parameterNames,
  };
}

function collectQuarticFerrariPolynomial(
  equationLatex: string,
  target: string,
  options: ParameterizedQuarticFerrariOptions,
): CollectedQuarticFerrariPolynomial | ParameterizedQuarticFerrariStop {
  const parameterNames = parameterNamesFromLatex(equationLatex, target);

  if (!options.allowGeneratedImplicitProducts && hasAmbiguousAdjacentProduct(equationLatex)) {
    return stop(
      'ambiguous-adjacent-product',
      'Adjacent letters must use explicit multiplication before quartic Ferrari solving.',
      target,
      parameterNames,
    );
  }

  let parsed: ReturnType<typeof ce.parse>;
  try {
    parsed = ce.parse(equationLatex);
  } catch {
    return stop('parse-error', 'The equation could not be parsed for quartic Ferrari solving.', target, parameterNames);
  }

  const json = parsed.json;
  if (!isArrayNode(json) || json[0] !== 'Equal' || json.length !== 3) {
    return stop('non-equation', 'Enter an = equation before quartic Ferrari solving.', target, parameterNames);
  }

  if (!hasTarget(json, target)) {
    return stop('target-not-found', `Selected target ${target} was not found in this equation.`, target, parameterNames);
  }

  const left = collectDirectNDegreeSymbolicTargetPolynomial(
    json[1],
    target,
    4,
    FERRARI_COLLECT_MESSAGES,
  );
  if (left.kind === 'unsupported') {
    return stop(left.reason, left.message, target, parameterNames);
  }

  const right = collectDirectNDegreeSymbolicTargetPolynomial(
    json[2],
    target,
    4,
    FERRARI_COLLECT_MESSAGES,
  );
  if (right.kind === 'unsupported') {
    return stop(right.reason, right.message, target, parameterNames);
  }

  const polynomial = subtractNDegreeSymbolicPolynomials(left.polynomial, right.polynomial);
  const degree = nDegreeSymbolicPolynomialDegree(polynomial);
  if (degree !== 4) {
    return stop(
      'not-quartic',
      'Quartic Ferrari solving only applies to direct degree-4 selected-target polynomials.',
      target,
      parameterNames,
    );
  }

  const [e = 0, d = 0, c = 0, b = 0, a = 0] = polynomial.terms as MathJson[];
  return {
    kind: 'success',
    target,
    parameterNames,
    coefficients: { a, b, c, d, e },
  };
}

function isFerrariZeroNode(node: unknown) {
  return typeof node === 'number' && node === 0;
}

function negateNode(node: MathJson): MathJson {
  const simplified = simplifyFerrariNode(node);
  if (isFerrariZeroNode(simplified)) {
    return 0;
  }
  return simplifyFerrariNode(rawNegateNode(simplified));
}

function divideNodes(numerator: MathJson, denominator: MathJson): MathJson {
  const simplifiedNumerator = simplifyFerrariNode(numerator);
  const simplifiedDenominator = simplifyFerrariNode(denominator);
  if (isFerrariZeroNode(simplifiedNumerator)) {
    return 0;
  }
  if (isOneNode(simplifiedDenominator)) {
    return simplifiedNumerator;
  }
  return simplifyFerrariNode(rawDivideNodes(simplifiedNumerator, simplifiedDenominator));
}

function powerNode(node: MathJson, degree: number): MathJson {
  const simplified = simplifyFerrariNode(node);
  if (degree === 0) {
    return 1;
  }
  if (degree === 1) {
    return simplified;
  }
  if (isFerrariZeroNode(simplified)) {
    return 0;
  }
  if (isOneNode(simplified)) {
    return 1;
  }
  return simplifyFerrariNode(['Power', simplified, degree] as MathJson);
}

function squareNode(node: MathJson): MathJson {
  return powerNode(node, 2);
}

function sqrtNode(node: MathJson): MathJson {
  return simplifyFerrariNode(['Sqrt', node] as MathJson);
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

function latexForFerrariNode(node: MathJson) {
  try {
    return ce.box(simplifyFerrariNode(node) as Parameters<typeof ce.box>[0]).latex;
  } catch {
    return 'unsupported-ferrari-node';
  }
}

function nonzeroFact(node: MathJson, latex?: string): string | null {
  return nodeHasSymbol(node) ? `${latex ?? latexForFerrariNode(node)}\\ne0` : null;
}

function formulaTooLarge(exactLatex: string, branchReadback?: DisplayBranchReadback) {
  return exactLatex.length > MAX_FERRARI_EXACT_LATEX_LENGTH
    || (branchReadback?.branchesLatex.some((branch) => branch.length > MAX_FERRARI_BRANCH_LATEX_LENGTH) ?? false);
}

function isSimpleLatex(latex: string) {
  return /^-?[A-Za-z0-9]+$/u.test(latex);
}

function groupLatex(latex: string) {
  return isSimpleLatex(latex) ? latex : groupFormulaLatex(latex);
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
  const simplifiedNumerator = simplifyFerrariNode(numerator);
  if (isFerrariZeroNode(simplifiedNumerator)) {
    return '0';
  }
  const numeratorLatex = latexForFerrariNode(simplifiedNumerator);
  return knownNonzeroCoefficientRatioLatex(numeratorLatex, denominatorLatex)
    ?? fractionLatex(numeratorLatex, denominatorLatex);
}

function ferrariLatexParts(options: {
  a: MathJson;
  b: MathJson;
  c: MathJson;
  d: MathJson;
  e: MathJson;
}): QuarticFerrariLatexParts {
  const aLatex = latexForFerrariNode(options.a);
  const A = ratioLatex(options.b, aLatex);
  const B = ratioLatex(options.c, aLatex);
  const C = ratioLatex(options.d, aLatex);
  const D = ratioLatex(options.e, aLatex);

  const p = addLatexTerms([
    B,
    negateLatex(fractionLatex(multiplyLatexFactors(['3', powerLatex(A, 2)]), '8')),
  ]);
  const q = addLatexTerms([
    fractionLatex(powerLatex(A, 3), '8'),
    negateLatex(fractionLatex(multiplyLatexFactors([A, B]), '2')),
    C,
  ]);
  const r = addLatexTerms([
    D,
    negateLatex(fractionLatex(multiplyLatexFactors([A, C]), '4')),
    fractionLatex(multiplyLatexFactors([powerLatex(A, 2), B]), '16'),
    negateLatex(fractionLatex(multiplyLatexFactors(['3', powerLatex(A, 4)]), '256')),
  ]);

  return {
    a: aLatex,
    A,
    B,
    C,
    D,
    p,
    q,
    r,
  };
}

function ferrariShiftLatex(lines: ReturnType<typeof ferrariLatexParts>) {
  return negateLatex(fractionLatex(lines.A, '4'));
}

function ferrariBiquadraticSubstitution(lines: ReturnType<typeof ferrariLatexParts>) {
  const discriminant = addLatexTerms([
    powerLatex(lines.p, 2),
    negateLatex(multiplyLatexFactors(['4', lines.r])),
  ]);
  return {
    sPlus: fractionLatex(addLatexTerms([negateLatex(lines.p), `\\sqrt{${discriminant}}`]), '2'),
    sMinus: fractionLatex(addLatexTerms([negateLatex(lines.p), negateLatex(`\\sqrt{${discriminant}}`)]), '2'),
  };
}

function ferrariAuxiliarySubstitution(lines: ReturnType<typeof ferrariLatexParts>) {
  const P = addLatexTerms([
    negateLatex(fractionLatex(powerLatex(lines.p, 2), '12')),
    negateLatex(lines.r),
  ]);
  const Q = addLatexTerms([
    negateLatex(fractionLatex(powerLatex(lines.p, 3), '108')),
    fractionLatex(multiplyLatexFactors([lines.p, lines.r]), '3'),
    negateLatex(fractionLatex(powerLatex(lines.q, 2), '8')),
  ]);
  const delta = addLatexTerms([
    powerLatex(fractionLatex(Q, '2'), 2),
    powerLatex(fractionLatex(P, '3'), 3),
  ]);
  const R = addLatexTerms([
    negateLatex(fractionLatex(Q, '2')),
    `\\sqrt{${delta}}`,
  ]);
  const U = `\\operatorname{PrincipalRoot}_{3}\\left(${R}\\right)`;
  const Y = addLatexTerms([
    negateLatex(fractionLatex(multiplyLatexFactors(['5', lines.p]), '6')),
    U,
    `-\\frac{${P}}{3${groupLatex(U)}}`,
  ]);
  const S = `\\operatorname{PrincipalRoot}_{2}\\left(${addLatexTerms([
    lines.p,
    `2\\left(${Y}\\right)`,
  ])}\\right)`;
  return { P, Q, delta, R, U, Y, S };
}

function ferrariDefinitionShared(lines: ReturnType<typeof ferrariLatexParts>, useGenericTemplate: boolean) {
  if (!useGenericTemplate) {
    return [
      `p=${lines.p}`,
      `q=${lines.q}`,
      `r=${lines.r}`,
    ];
  }

  return [
    `A=${lines.A}`,
    `B=${lines.B}`,
    `C=${lines.C}`,
    `D=${lines.D}`,
    'p=B-\\frac{3A^2}{8}',
    'q=\\frac{A^3}{8}-\\frac{A B}{2}+C',
    'r=D-\\frac{A C}{4}+\\frac{A^2 B}{16}-\\frac{3A^4}{256}',
  ];
}

function ferrariDefinitions(
  lines: ReturnType<typeof ferrariLatexParts>,
  mode: 'general' | 'biquadratic',
  useGenericTemplate = true,
) {
  const shared = ferrariDefinitionShared(lines, useGenericTemplate);

  if (mode === 'biquadratic') {
    const substituted = ferrariBiquadraticSubstitution(lines);
    return [
      ...shared,
      'q=0',
      useGenericTemplate
        ? 's_{+}=\\frac{-p+\\sqrt{p^2-4r}}{2}'
        : `s_{+}=${substituted.sPlus}`,
      useGenericTemplate
        ? 's_{-}=\\frac{-p-\\sqrt{p^2-4r}}{2}'
        : `s_{-}=${substituted.sMinus}`,
      useGenericTemplate
        ? 'x=-\\frac{A}{4}\\pm\\operatorname{PrincipalRoot}_{2}\\left(s_{\\pm}\\right)'
        : `x=${addLatexTerms([ferrariShiftLatex(lines), '\\pm\\operatorname{PrincipalRoot}_{2}\\left(s_{\\pm}\\right)'])}`,
    ];
  }

  if (!useGenericTemplate) {
    const auxiliary = ferrariAuxiliarySubstitution(lines);
    const fPlusTerms = addLatexTerms([
      multiplyLatexFactors(['3', lines.p]),
      '2Y',
      fractionLatex(multiplyLatexFactors(['2', lines.q]), 'S'),
    ]);
    const fMinusTerms = addLatexTerms([
      multiplyLatexFactors(['3', lines.p]),
      '2Y',
      negateLatex(fractionLatex(multiplyLatexFactors(['2', lines.q]), 'S')),
    ]);
    return [
      ...shared,
      `P=${auxiliary.P}`,
      `Q=${auxiliary.Q}`,
      `\\Delta=${auxiliary.delta}`,
      `R=${auxiliary.R}`,
      `U=${auxiliary.U}`,
      `Y=${auxiliary.Y}`,
      `S=${auxiliary.S}`,
      `F_{+}=-\\left(${fPlusTerms}\\right)`,
      `F_{-}=-\\left(${fMinusTerms}\\right)`,
      `x_{\\sigma,\\tau}=${addLatexTerms([
        ferrariShiftLatex(lines),
        '\\frac{\\sigma S+\\tau\\operatorname{PrincipalRoot}_{2}\\left(F_{\\sigma}\\right)}{2}',
      ])},\\quad \\sigma,\\tau\\in\\{-1,1\\}`,
    ];
  }

  return [
    ...shared,
    'P=-\\frac{p^2}{12}-r',
    'Q=-\\frac{p^3}{108}+\\frac{pr}{3}-\\frac{q^2}{8}',
    '\\Delta=\\left(\\frac{Q}{2}\\right)^2+\\left(\\frac{P}{3}\\right)^3',
    'R=-\\frac{Q}{2}+\\sqrt{\\Delta}',
    'U=\\operatorname{PrincipalRoot}_{3}\\left(R\\right)',
    'Y=-\\frac{5p}{6}+U-\\frac{P}{3U}',
    'S=\\operatorname{PrincipalRoot}_{2}\\left(p+2Y\\right)',
    quarticFerrariFDefinitionLatex(1),
    quarticFerrariFDefinitionLatex(-1),
    'x_{\\sigma,\\tau}=-\\frac{A}{4}+\\frac{\\sigma S+\\tau\\operatorname{PrincipalRoot}_{2}\\left(F_{\\sigma}\\right)}{2},\\quad \\sigma,\\tau\\in\\{-1,1\\}',
  ];
}

function realFerrariDefinitions(
  lines: ReturnType<typeof ferrariLatexParts>,
  mode: 'general' | 'biquadratic',
  useGenericTemplate = true,
) {
  if (mode === 'biquadratic') {
    return ferrariDefinitions(lines, mode, useGenericTemplate).map((line) =>
      line.replaceAll(
        '\\operatorname{PrincipalRoot}_{2}\\left(s_{\\pm}\\right)',
        '\\sqrt{s_{\\pm}}',
      ));
  }

  if (!useGenericTemplate) {
    const auxiliary = ferrariAuxiliarySubstitution(lines);
    const yDefinition = addLatexTerms([
      negateLatex(fractionLatex(multiplyLatexFactors(['5', lines.p]), '6')),
      't',
    ]);
    const sDenominator = `\\sqrt{${addLatexTerms([lines.p, '2Y'])}}`;
    const fPlusTerms = addLatexTerms([
      multiplyLatexFactors(['3', lines.p]),
      '2Y',
      fractionLatex(multiplyLatexFactors(['2', lines.q]), sDenominator),
    ]);
    const fMinusTerms = addLatexTerms([
      multiplyLatexFactors(['3', lines.p]),
      '2Y',
      negateLatex(fractionLatex(multiplyLatexFactors(['2', lines.q]), sDenominator)),
    ]);
    return [
      ...ferrariDefinitionShared(lines, false),
      `P=${auxiliary.P}`,
      `Q=${auxiliary.Q}`,
      `\\Delta=${auxiliary.delta}`,
      `Y=${yDefinition}`,
      `F_{+}=-\\left(${fPlusTerms}\\right)`,
      `F_{-}=-\\left(${fMinusTerms}\\right)`,
    ];
  }

  return [
    `A=${lines.A}`,
    `B=${lines.B}`,
    `C=${lines.C}`,
    `D=${lines.D}`,
    'p=B-\\frac{3A^2}{8}',
    'q=\\frac{A^3}{8}-\\frac{A B}{2}+C',
    'r=D-\\frac{A C}{4}+\\frac{A^2 B}{16}-\\frac{3A^4}{256}',
    'P=-\\frac{p^2}{12}-r',
    'Q=-\\frac{p^3}{108}+\\frac{pr}{3}-\\frac{q^2}{8}',
    '\\Delta=\\left(\\frac{Q}{2}\\right)^2+\\left(\\frac{P}{3}\\right)^3',
    'Y=-\\frac{5p}{6}+t',
    'F_{+}=-\\left(3p+2Y+\\frac{2q}{\\sqrt{p+2Y}}\\right)',
    'F_{-}=-\\left(3p+2Y-\\frac{2q}{\\sqrt{p+2Y}}\\right)',
  ];
}

function computeFerrariNodes(coefficients: CollectedQuarticFerrariPolynomial['coefficients']) {
  const { a, b, c, d, e } = coefficients;
  const A = divideNodes(b, a);
  const B = divideNodes(c, a);
  const C = divideNodes(d, a);
  const D = divideNodes(e, a);
  const p = subtractNodes(B, divideNodes(multiplyNodes(3, squareNode(A)), 8));
  const q = addNodes(
    divideNodes(powerNode(A, 3), 8),
    negateNode(divideNodes(multiplyNodes(A, B), 2)),
    C,
  );
  const r = addNodes(
    D,
    negateNode(divideNodes(multiplyNodes(A, C), 4)),
    divideNodes(multiplyNodes(squareNode(A), B), 16),
    negateNode(divideNodes(multiplyNodes(3, powerNode(A, 4)), 256)),
  );
  const P = addNodes(
    negateNode(divideNodes(squareNode(p), 12)),
    negateNode(r),
  );
  const Q = addNodes(
    negateNode(divideNodes(powerNode(p, 3), 108)),
    divideNodes(multiplyNodes(p, r), 3),
    negateNode(divideNodes(squareNode(q), 8)),
  );
  const delta = addNodes(
    squareNode(divideNodes(Q, 2)),
    powerNode(divideNodes(P, 3), 3),
  );
  const R = addNodes(negateNode(divideNodes(Q, 2)), sqrtNode(delta));
  return { A, B, C, D, p, q, r, P, Q, delta, R };
}

function exactLatexForRealCaseRows(target: string, rows: ReturnType<typeof realFerrariCaseRows>) {
  const cases = rows.map((row) => `${row.valueLatex},&${row.conditionLatex}`).join('\\\\');
  return polishFormulaReadbackLatex(`${target}\\in\\begin{cases}${cases}\\end{cases}`);
}

function realFerrariCaseDetailSection(
  mode: 'general' | 'biquadratic',
  lines?: ReturnType<typeof ferrariLatexParts>,
): DisplayDetailSection {
  const rows = realFerrariCaseRows(mode, lines).map((row): {
    line: string;
    parts: DisplayDetailLinePart[];
  } => ({
    line: `${row.valueLatex}, ${row.conditionLatex}`,
    parts: [
      { kind: 'math', latex: row.valueLatex },
      { kind: 'text', text: ', ' },
      { kind: 'math', latex: row.conditionLatex },
    ],
  }));

  return {
    title: 'Real Ferrari Cases',
    lines: rows.map((row) => row.line),
    lineParts: rows.map((row) => row.parts),
  };
}

function buildDetailSections(options: {
  target: string;
  parameterNames: string[];
  domain: 'complex' | 'real';
  mode: 'general' | 'biquadratic';
  latexParts: ReturnType<typeof ferrariLatexParts>;
  useGenericTemplate: boolean;
}) {
  const complex = options.domain === 'complex';
  return polishFormulaDetailSections(buildParameterizedDetailSections({
    target: options.target,
    parameterNames: options.parameterNames,
    familyTitle: 'Quartic Ferrari Route',
    familyLines: [
      `Domain intent: ${complex ? 'Complex' : 'Real'}.`,
      'Collected a direct degree-4 selected-target polynomial and normalized it to a monic quartic.',
      options.mode === 'biquadratic'
        ? 'Used the q=0 biquadratic Ferrari special form to avoid U and S denominator facts.'
        : options.useGenericTemplate
          ? 'Applied compact Ferrari definitions and kept branch/radicand conditions explicit.'
          : 'Substituted the collected coefficients before rendering the visible Ferrari rows.',
      complex
        ? 'Displayed four Complex Exact branches through PrincipalRoot notation.'
        : 'Displayed Real Exact roots as case-local rows instead of global discriminant facts.',
    ],
    extraSections: [
      {
        title: options.useGenericTemplate
          ? complex ? 'Ferrari Definitions' : 'Real Ferrari Definitions'
          : complex ? 'Substituted Ferrari Values' : 'Substituted Real Ferrari Values',
        lines: complex
          ? ferrariDefinitions(options.latexParts, options.mode, options.useGenericTemplate)
          : realFerrariDefinitions(options.latexParts, options.mode, options.useGenericTemplate),
        lineKind: 'math',
      },
      ...(!complex ? [realFerrariCaseDetailSection(
        options.mode,
        options.useGenericTemplate ? undefined : options.latexParts,
      )] : []),
    ],
  }));
}

export function solveParameterizedQuarticFerrariEquation(
  equationLatex: string,
  target: string,
  options: ParameterizedQuarticFerrariOptions = {},
): ParameterizedQuarticFerrariResult {
  const collected = collectQuarticFerrariPolynomial(equationLatex, target, options);
  if (collected.kind === 'unsupported') {
    return collected;
  }

  const nodes = computeFerrariNodes(collected.coefficients);
  const mode = isFerrariZeroNode(simplifyFerrariNode(nodes.q)) ? 'biquadratic' : 'general';
  const { a, b, c, d, e } = collected.coefficients;
  const useGenericTemplate = shouldUseGenericFormulaTemplate([a, b, c, d, e]);
  if (mode === 'general' && isFerrariZeroNode(simplifyFerrariNode(nodes.R))) {
    return stop(
      'branch-singularity',
      'The direct Ferrari branch formula would divide by a zero principal resolvent root.',
      target,
      collected.parameterNames,
    );
  }

  const latexParts = ferrariLatexParts(collected.coefficients);
  const biquadraticLatex = ferrariBiquadraticSubstitution(latexParts);
  const branchLatex = useGenericTemplate
    ? { compact: true }
    : mode === 'biquadratic'
      ? {
        shift: ferrariShiftLatex(latexParts),
        sPlus: biquadraticLatex.sPlus,
        sMinus: biquadraticLatex.sMinus,
      }
      : {
        shift: ferrariShiftLatex(latexParts),
        p: latexParts.p,
        q: latexParts.q,
        y: 'Y',
      };
  const branchNodes = mode === 'biquadratic'
    ? quarticFerrariBiquadraticBranchNodes({ metadata: nodes, latex: branchLatex })
    : quarticFerrariGeneralBranchNodes({ metadata: nodes, latex: branchLatex });
  const rootSet = createRootSet({
    target,
    source: SOURCE,
    entries: branchNodes.map((node) =>
      createExactFiniteRoot('ferrari-branch', { source: SOURCE, node })),
  });
  const exactLatex = rootSetToExactLatex(rootSet, {
    context: { domainIntent: 'complex' },
    presentationContext: {},
  });
  if (!exactLatex) {
    return stop(
      'formula-size-limit',
      'The quartic Ferrari branches could not be rendered as visible finite roots.',
      target,
      collected.parameterNames,
    );
  }
  const branchReadback = rootSetToBranchReadback(rootSet, {
    source: SOURCE,
    relationLatex: '\\in',
    context: { domainIntent: 'complex' },
    presentationContext: {},
  });
  if (formulaTooLarge(exactLatex, branchReadback)) {
    return stop(
      'formula-size-limit',
      'The quartic Ferrari formula exceeded the symbolic readback cap.',
      target,
      collected.parameterNames,
    );
  }

  const exactSupplementLatex = normalizeParameterizedSupplementLatex([
    nonzeroFact(collected.coefficients.a, latexParts.a),
    ...(mode === 'general' ? ['U\\ne0', 'S\\ne0'] : []),
  ].filter((entry): entry is string => Boolean(entry)));

  return {
    kind: 'success',
    target,
    parameterNames: collected.parameterNames,
    exactLatex,
    branchReadback,
    exactSupplementLatex,
    detailSections: buildDetailSections({
      target,
      parameterNames: collected.parameterNames,
      domain: 'complex',
      mode,
      latexParts,
      useGenericTemplate,
    }),
  };
}

export function solveParameterizedRealQuarticFerrariEquation(
  equationLatex: string,
  target: string,
  options: ParameterizedQuarticFerrariOptions = {},
): ParameterizedQuarticFerrariResult {
  const collected = collectQuarticFerrariPolynomial(equationLatex, target, options);
  if (collected.kind === 'unsupported') {
    return collected;
  }

  const nodes = computeFerrariNodes(collected.coefficients);
  const mode = isFerrariZeroNode(simplifyFerrariNode(nodes.q)) ? 'biquadratic' : 'general';
  const { a, b, c, d, e } = collected.coefficients;
  const useGenericTemplate = shouldUseGenericFormulaTemplate([a, b, c, d, e]);
  const latexParts = ferrariLatexParts(collected.coefficients);
  const caseRows = realFerrariCaseRows(mode, useGenericTemplate ? undefined : latexParts);
  const exactLatex = exactLatexForRealCaseRows(target, caseRows);
  if (useGenericTemplate && formulaTooLarge(exactLatex)) {
    return stop(
      'formula-size-limit',
      'The real quartic Ferrari case formula exceeded the symbolic readback cap.',
      target,
      collected.parameterNames,
    );
  }

  const exactSupplementLatex = normalizeParameterizedSupplementLatex([
    nonzeroFact(collected.coefficients.a, latexParts.a),
  ].filter((entry): entry is string => Boolean(entry)));

  return {
    kind: 'success',
    target,
    parameterNames: collected.parameterNames,
    exactLatex,
    exactSupplementLatex,
    detailSections: buildDetailSections({
      target,
      parameterNames: collected.parameterNames,
      domain: 'real',
      mode,
      latexParts,
      useGenericTemplate,
    }),
  };
}
