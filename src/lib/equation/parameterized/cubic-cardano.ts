import { ComputeEngine } from '@cortex-js/compute-engine';
import type { ComplexExactForm, DisplayBranchReadback, DisplayDetailSection } from '../../../types/calculator';
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
  createExactFiniteRoot,
  createRootSet,
  rootSetToBranchReadback,
  rootSetToExactLatex,
} from '../roots/representation';
import {
  cubicCardanoBranchNodes,
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

function isZeroLatex(latex: string) {
  return latex === '0';
}

function isOneLatex(latex: string) {
  return latex === '1';
}

function isSimpleLatex(latex: string) {
  return /^-?[A-Za-z0-9]+$/u.test(latex);
}

function groupLatex(latex: string) {
  return isSimpleLatex(latex) ? latex : `\\left(${latex}\\right)`;
}

function fractionLatex(numerator: string, denominator: string) {
  if (isZeroLatex(numerator)) {
    return '0';
  }
  if (isOneLatex(denominator)) {
    return numerator;
  }
  return `\\frac{${numerator}}{${denominator}}`;
}

function negateLatex(latex: string) {
  if (isZeroLatex(latex)) {
    return '0';
  }
  if (latex.startsWith('-') && !latex.startsWith('-\\frac')) {
    return latex.slice(1);
  }
  if (latex.startsWith('\\frac') || isSimpleLatex(latex)) {
    return `-${latex}`;
  }
  return `-\\left(${latex}\\right)`;
}

function addLatexTerms(terms: string[]) {
  const filtered = terms.filter((term) => term.length > 0 && !isZeroLatex(term));
  if (filtered.length === 0) {
    return '0';
  }
  return filtered.reduce((current, term, index) => {
    if (index === 0) {
      return term;
    }
    return term.startsWith('-')
      ? `${current}-${term.slice(1)}`
      : `${current}+${term}`;
  }, '');
}

function multiplyLatexFactors(factors: string[]) {
  if (factors.some(isZeroLatex)) {
    return '0';
  }
  const filtered = factors.filter((factor) => !isOneLatex(factor));
  if (filtered.length === 0) {
    return '1';
  }
  return filtered.map(groupLatex).join('');
}

function powerLatex(base: string, degree: number) {
  if (degree === 0) {
    return '1';
  }
  if (degree === 1 || isZeroLatex(base) || isOneLatex(base)) {
    return base;
  }
  return `${groupLatex(base)}^${degree}`;
}

function ratioLatex(numerator: MathJson, denominatorLatex: string) {
  const simplifiedNumerator = simplifyCardanoNode(numerator);
  if (isCardanoZeroNode(simplifiedNumerator)) {
    return '0';
  }
  return fractionLatex(latexForCubicCardanoNode(simplifiedNumerator), denominatorLatex);
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
    shift,
    p,
    q,
    delta,
    primaryRadicand,
    negatedQ,
  };
}

export function solveParameterizedCubicCardanoEquation(
  equationLatex: string,
  target: string,
  options: ParameterizedCubicCardanoOptions = {},
): ParameterizedCubicCardanoResult {
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
  const exactLatex = rootSetToExactLatex(rootSet, presentationContext);
  if (!exactLatex) {
    return stop(
      'formula-size-limit',
      'The cubic Cardano branches could not be rendered as visible finite roots.',
      target,
      parameterNames,
    );
  }
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
    ...(!noDenominator ? [nonzeroFact(primaryRadicand, latexParts.primaryRadicand)] : []),
  ].filter((entry): entry is string => Boolean(entry)));
  const detailSections = buildParameterizedDetailSections({
    target,
    parameterNames,
    familyTitle: 'Cubic Cardano Route',
    familyLines: [
      'Domain intent: Complex.',
      'Collected a direct degree-3 selected-target polynomial and normalized it to a monic cubic.',
      'Applied Cardano branches using Calcwiz PrincipalRoot_3 notation and internal principal-branch facts.',
      noDenominator
        ? 'Used the p=0 branch form to avoid introducing a Cardano denominator.'
        : 'Displayed the nonzero principal-root denominator condition required by this Cardano branch form.',
      `Depressed cubic parameters: p=${latexParts.p}, q=${latexParts.q}.`,
      `Cardano discriminant: ${latexParts.delta}.`,
    ],
  });

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
