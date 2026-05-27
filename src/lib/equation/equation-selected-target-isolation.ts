import { ComputeEngine } from '@cortex-js/compute-engine';
import type { DisplayDetailSection } from '../../types/calculator';
import type { AngleUnit } from '../../types/calculator/mode-types';
import { analyzeVariablesFromLatex } from '../algebra/variable-core';
import { normalizeExplicitNamedVariablesInLatex } from '../algebra/named-variable';
import { solveEquationAlgebraicIsolation } from './equation-algebraic-isolation';
import { solveParameterizedCarrierEquation } from './equation-parameterized-carrier';
import { solveParameterizedCompositionEquation } from './equation-parameterized-composition';
import { solveParameterizedExpLogEquation } from './equation-parameterized-exp-log';
import { solveParameterizedFactorablePolynomialEquation } from './equation-parameterized-factorable-polynomial';
import { solveParameterizedLinearEquation } from './equation-parameterized-linear';
import { solveParameterizedMixedAlgebraicEquation } from './equation-parameterized-mixed-algebraic';
import { solveParameterizedPolynomialEquation } from './equation-parameterized-polynomial';
import { solveParameterizedRationalEquation } from './equation-parameterized-rational';
import {
  buildParameterizedSolveTargetSection,
  normalizeParameterizedDetailSections,
  normalizeParameterizedSupplementLatex,
} from './equation-parameterized-readback';
import { solveParameterizedTrigEquation } from './equation-parameterized-trig';

const ce = new ComputeEngine();

type MathJson = string | number | boolean | null | MathJson[] | { [key: string]: MathJson | undefined };

export type SelectedTargetIsolationStopReason =
  | 'parse-error'
  | 'non-equation'
  | 'target-not-found'
  | 'ambiguous-adjacent-product'
  | 'target-on-both-sides'
  | 'multiple-target-islands'
  | 'target-in-shell-factor'
  | 'target-in-denominator'
  | 'target-in-unsupported-operation'
  | 'unsupported-shell'
  | 'generated-equation-unsupported'
  | 'isolation-depth-limit'
  | 'no-isolation';

export type SelectedTargetIsolationSuccess = {
  kind: 'success';
  target: string;
  parameterNames: string[];
  generatedEquationLatex: string;
  exactLatex: string;
  exactSupplementLatex?: string[];
  detailSections: DisplayDetailSection[];
};

export type SelectedTargetIsolationStop = {
  kind: 'unsupported';
  reason: SelectedTargetIsolationStopReason;
  message: string;
  target: string;
  parameterNames: string[];
};

export type SelectedTargetIsolationResult =
  | SelectedTargetIsolationSuccess
  | SelectedTargetIsolationStop;

export type SelectedTargetIsolationOptions = {
  allowGeneratedImplicitProducts?: boolean;
  maxPeels?: number;
};

type HandoffSolveSuccess = {
  kind: 'success';
  exactLatex: string;
  exactSupplementLatex?: string[];
  detailSections: DisplayDetailSection[];
};

type PeelStep = {
  expression: MathJson;
  otherSide: MathJson;
  facts: string[];
  line: string;
};

type PeelResult =
  | { kind: 'ok'; step: PeelStep }
  | { kind: 'unsupported'; reason: SelectedTargetIsolationStopReason; message: string };

const ZERO: MathJson = 0;
const ONE: MathJson = 1;
const DEFAULT_MAX_PEELS = 6;

function isArrayNode(node: unknown): node is unknown[] {
  return Array.isArray(node);
}

function isZeroNode(node: unknown) {
  return typeof node === 'number' && Object.is(node, 0);
}

function isOneNode(node: unknown) {
  return typeof node === 'number' && Object.is(node, 1);
}

function isNegativeOneNode(node: unknown) {
  return typeof node === 'number' && Object.is(node, -1);
}

function isNumericNonzeroNode(node: unknown) {
  return typeof node === 'number' && !Object.is(node, 0);
}

function hasTarget(node: unknown, target: string): boolean {
  if (typeof node === 'string') {
    return node === target;
  }

  if (isArrayNode(node)) {
    return node.some((entry) => hasTarget(entry, target));
  }

  if (node && typeof node === 'object') {
    return Object.values(node).some((entry) => hasTarget(entry, target));
  }

  return false;
}

function flattenOperator(operator: string, nodes: MathJson[]) {
  return nodes.flatMap((node) =>
    isArrayNode(node) && node[0] === operator
      ? node.slice(1) as MathJson[]
      : [node],
  );
}

function flattenMultiply(nodes: MathJson[]) {
  return nodes.flatMap((node) =>
    isArrayNode(node) && (node[0] === 'Multiply' || node[0] === 'InvisibleOperator')
      ? node.slice(1) as MathJson[]
      : [node],
  );
}

function simplifyNode(node: MathJson): MathJson {
  try {
    return ce.box(node as Parameters<typeof ce.box>[0]).simplify().json as MathJson;
  } catch {
    return node;
  }
}

function addNodes(...nodes: MathJson[]): MathJson {
  const terms = flattenOperator('Add', nodes).filter((node) => !isZeroNode(node));
  if (terms.length === 0) {
    return ZERO;
  }
  if (terms.length === 1) {
    return terms[0];
  }
  return simplifyNode(['Add', ...terms] as MathJson);
}

function multiplyNodes(...nodes: MathJson[]): MathJson {
  const factors = flattenMultiply(nodes).filter((node) => !isOneNode(node));
  if (factors.some((node) => isZeroNode(node))) {
    return ZERO;
  }
  if (factors.length === 0) {
    return ONE;
  }
  if (factors.length === 1) {
    return factors[0];
  }
  return simplifyNode(['Multiply', ...factors] as MathJson);
}

function negateNode(node: MathJson): MathJson {
  if (typeof node === 'number') {
    return isZeroNode(node) ? ZERO : -node as MathJson;
  }
  if (isArrayNode(node) && node[0] === 'Negate') {
    return node[1] as MathJson;
  }
  if (isArrayNode(node) && node[0] === 'Add') {
    return addNodes(...node.slice(1).map((term) => negateNode(term as MathJson)));
  }
  return simplifyNode(['Negate', node] as MathJson);
}

function subtractNodes(left: MathJson, right: MathJson): MathJson {
  return addNodes(left, negateNode(right));
}

function divideNodes(numerator: MathJson, denominator: MathJson): MathJson {
  if (isOneNode(denominator)) {
    return numerator;
  }
  if (isNegativeOneNode(denominator)) {
    return negateNode(numerator);
  }
  return simplifyNode(['Divide', numerator, denominator] as MathJson);
}

function latexForNode(node: MathJson) {
  return ce.box(simplifyNode(node) as Parameters<typeof ce.box>[0]).latex;
}

function equationLatex(left: MathJson, right: MathJson) {
  return `${latexForNode(left)}=${latexForNode(right)}`;
}

function factNonzero(node: MathJson) {
  if (isNumericNonzeroNode(node) || isOneNode(node) || isNegativeOneNode(node)) {
    return null;
  }
  if (isArrayNode(node) && node[0] === 'Divide' && isOneNode(node[1])) {
    return factNonzero(node[2] as MathJson);
  }
  if (isArrayNode(node) && node[0] === 'Power' && node.length === 3 && isNegativeOneNode(node[2])) {
    return factNonzero(node[1] as MathJson);
  }
  return `${latexForNode(node)}\\ne0`;
}

function unique(entries: string[]) {
  return [...new Set(entries.filter((entry) => entry.trim().length > 0))];
}

function hasAmbiguousAdjacentProduct(latex: string) {
  const analysis = analyzeVariablesFromLatex(latex, { allowSymbolicParameters: true });
  return analysis.implicitCharacterProducts.some((product) => new Set(product.characters).size > 1);
}

function parameterNamesFromLatex(latex: string, target: string) {
  const analysis = analyzeVariablesFromLatex(latex, { allowSymbolicParameters: true });
  return analysis.symbols
    .filter((symbol) => symbol.name !== target)
    .filter((symbol) =>
      symbol.identifierKind === 'single-symbol-variable'
      || symbol.identifierKind === 'named-variable'
      || symbol.identifierKind === 'indexed-symbol-variable')
    .map((symbol) => symbol.name);
}

function stop(
  reason: SelectedTargetIsolationStopReason,
  message: string,
  target: string,
  parameterNames: string[],
): SelectedTargetIsolationStop {
  return {
    kind: 'unsupported',
    reason,
    message,
    target,
    parameterNames,
  };
}

function tryDelegatedSolvers(
  generatedEquationLatex: string,
  target: string,
  angleUnit: AngleUnit,
  allowGeneratedImplicitProducts: boolean,
): HandoffSolveSuccess | null {
  const options = { allowGeneratedImplicitProducts };
  const linear = solveParameterizedLinearEquation(generatedEquationLatex, target, options);
  if (linear.kind === 'success') {
    return linear;
  }

  const polynomial = solveParameterizedPolynomialEquation(generatedEquationLatex, target, options);
  if (polynomial.kind === 'success') {
    return polynomial;
  }

  const rational = solveParameterizedRationalEquation(generatedEquationLatex, target, options);
  if (rational.kind === 'success') {
    return rational;
  }

  const factorable = solveParameterizedFactorablePolynomialEquation(generatedEquationLatex, target, options);
  if (factorable.kind === 'success') {
    return factorable;
  }

  const algebraic = solveEquationAlgebraicIsolation(generatedEquationLatex, target, options);
  if (algebraic.kind === 'success') {
    return algebraic;
  }

  const carrier = solveParameterizedCarrierEquation(generatedEquationLatex, target, options);
  if (carrier.kind === 'success') {
    return carrier;
  }

  const expLog = solveParameterizedExpLogEquation(generatedEquationLatex, target, options);
  if (expLog.kind === 'success') {
    return expLog;
  }

  const trig = solveParameterizedTrigEquation(generatedEquationLatex, target, angleUnit, options);
  if (trig.kind === 'success') {
    return trig;
  }

  const composition = solveParameterizedCompositionEquation(generatedEquationLatex, target, angleUnit, options);
  if (composition.kind === 'success') {
    return composition;
  }

  const mixedAlgebraic = solveParameterizedMixedAlgebraicEquation(generatedEquationLatex, target, options);
  if (mixedAlgebraic.kind === 'success') {
    return mixedAlgebraic;
  }

  return null;
}

function peelAdd(node: MathJson[], otherSide: MathJson, target: string): PeelResult {
  const terms = node.slice(1) as MathJson[];
  const targetTerms = terms.filter((term) => hasTarget(term, target));
  if (targetTerms.length > 1) {
    return {
      kind: 'unsupported',
      reason: 'multiple-target-islands',
      message: 'The selected target appears in more than one additive island.',
    };
  }
  if (targetTerms.length === 0) {
    return {
      kind: 'unsupported',
      reason: 'unsupported-shell',
      message: 'No selected-target term was found in this additive shell.',
    };
  }

  const targetTerm = targetTerms[0];
  const targetFreeTerms = terms.filter((term) => !hasTarget(term, target));
  const targetFreeSum = addNodes(...targetFreeTerms);
  const nextOtherSide = subtractNodes(otherSide, targetFreeSum);
  return {
    kind: 'ok',
    step: {
      expression: targetTerm,
      otherSide: nextOtherSide,
      facts: [],
      line: `Moved target-free additive terms away from ${latexForNode(targetTerm)}.`,
    },
  };
}

function peelMultiply(node: MathJson[], otherSide: MathJson, target: string): PeelResult {
  const factors = flattenMultiply(node.slice(1) as MathJson[]);
  const targetFactors = factors.filter((factor) => hasTarget(factor, target));
  if (targetFactors.length > 1) {
    return {
      kind: 'unsupported',
      reason: 'target-in-shell-factor',
      message: 'The selected target appears in more than one multiplicative factor.',
    };
  }
  if (targetFactors.length === 0) {
    return {
      kind: 'unsupported',
      reason: 'unsupported-shell',
      message: 'No selected-target factor was found in this multiplicative shell.',
    };
  }

  const targetFactor = targetFactors[0];
  const targetFreeProduct = multiplyNodes(...factors.filter((factor) => !hasTarget(factor, target)));
  const nextOtherSide = divideNodes(otherSide, targetFreeProduct);
  const nonzeroFact = factNonzero(targetFreeProduct);
  return {
    kind: 'ok',
    step: {
      expression: targetFactor,
      otherSide: nextOtherSide,
      facts: nonzeroFact ? [nonzeroFact] : [],
      line: `Divided by the target-free factor ${latexForNode(targetFreeProduct)}.`,
    },
  };
}

function peelDivide(node: MathJson[], otherSide: MathJson, target: string): PeelResult {
  if (node.length !== 3) {
    return {
      kind: 'unsupported',
      reason: 'unsupported-shell',
      message: 'Only simple quotient shells are supported by this isolation pass.',
    };
  }

  const numerator = node[1] as MathJson;
  const denominator = node[2] as MathJson;
  const numeratorHasTarget = hasTarget(numerator, target);
  const denominatorHasTarget = hasTarget(denominator, target);

  if (numeratorHasTarget && denominatorHasTarget) {
    return {
      kind: 'unsupported',
      reason: 'target-in-denominator',
      message: 'The selected target appears in both parts of a quotient shell.',
    };
  }

  if (denominatorHasTarget) {
    return {
      kind: 'unsupported',
      reason: 'target-in-denominator',
      message: 'The selected target appears in a denominator shell that this isolation pass does not invert.',
    };
  }

  if (!numeratorHasTarget) {
    return {
      kind: 'unsupported',
      reason: 'unsupported-shell',
      message: 'No selected-target numerator was found in this quotient shell.',
    };
  }

  const nextOtherSide = multiplyNodes(otherSide, denominator);
  const nonzeroFact = factNonzero(denominator);
  return {
    kind: 'ok',
    step: {
      expression: numerator,
      otherSide: nextOtherSide,
      facts: nonzeroFact ? [nonzeroFact] : [],
      line: `Multiplied by the target-free denominator ${latexForNode(denominator)}.`,
    },
  };
}

function peelOnce(expression: MathJson, otherSide: MathJson, target: string): PeelResult {
  if (!isArrayNode(expression)) {
    return {
      kind: 'unsupported',
      reason: 'no-isolation',
      message: 'No target-free shell remains to isolate.',
    };
  }

  if (expression[0] === 'Add') {
    return peelAdd(expression as MathJson[], otherSide, target);
  }

  if (expression[0] === 'Multiply' || expression[0] === 'InvisibleOperator') {
    return peelMultiply(expression as MathJson[], otherSide, target);
  }

  if (expression[0] === 'Divide') {
    return peelDivide(expression as MathJson[], otherSide, target);
  }

  if (expression[0] === 'Negate' && expression.length === 2) {
    return {
      kind: 'ok',
      step: {
        expression: expression[1] as MathJson,
        otherSide: negateNode(otherSide),
        facts: [],
        line: 'Removed a leading negative sign from the selected-target expression.',
      },
    };
  }

  return {
    kind: 'unsupported',
    reason: 'no-isolation',
    message: 'No target-free shell remains to isolate.',
  };
}

function detailSectionsForSuccess(
  target: string,
  parameterNames: string[],
  steps: PeelStep[],
  generatedEquationLatex: string,
  facts: string[],
  delegatedSections: DisplayDetailSection[],
) {
  const delegatedWithoutTarget = delegatedSections.filter((section) => section.title !== 'Solve Target');
  return normalizeParameterizedDetailSections([
    buildParameterizedSolveTargetSection(target, parameterNames),
    {
      title: 'Target Isolation',
      lines: [
        `Isolated one selected-target expression through ${steps.length} target-free algebra step${steps.length === 1 ? '' : 's'}.`,
        `Generated equation: ${generatedEquationLatex}`,
        ...(
          facts.length > 0
            ? [`Isolation facts: ${unique(facts).join(', ')}`]
            : []
        ),
      ],
    },
    ...delegatedWithoutTarget,
  ]);
}

export function solveSelectedTargetIsolationEquation(
  equationLatex: string,
  target: string,
  angleUnit: AngleUnit = 'rad',
  options: SelectedTargetIsolationOptions = {},
): SelectedTargetIsolationResult {
  const normalized = normalizeExplicitNamedVariablesInLatex(equationLatex);
  const sourceLatex = normalized.latex;
  const parameterNames = parameterNamesFromLatex(sourceLatex, target);
  const allowGeneratedImplicitProducts = Boolean(options.allowGeneratedImplicitProducts);

  if (!allowGeneratedImplicitProducts && hasAmbiguousAdjacentProduct(sourceLatex)) {
    return stop(
      'ambiguous-adjacent-product',
      'Adjacent letters must use explicit multiplication before selected-target isolation.',
      target,
      parameterNames,
    );
  }

  let parsed: ReturnType<typeof ce.parse>;
  try {
    parsed = ce.parse(sourceLatex);
  } catch {
    return stop('parse-error', 'The equation could not be parsed for selected-target isolation.', target, parameterNames);
  }

  const json = parsed.json;
  if (!isArrayNode(json) || json[0] !== 'Equal' || json.length !== 3) {
    return stop('non-equation', 'Enter an = equation before selected-target isolation.', target, parameterNames);
  }

  const left = json[1] as MathJson;
  const right = json[2] as MathJson;
  const leftHasTarget = hasTarget(left, target);
  const rightHasTarget = hasTarget(right, target);

  if (!leftHasTarget && !rightHasTarget) {
    return stop('target-not-found', `Selected target ${target} was not found in this equation.`, target, parameterNames);
  }

  if (leftHasTarget && rightHasTarget) {
    return stop(
      'target-on-both-sides',
      'The selected target appears on both sides of the equation, so this one-island isolation pass cannot choose one island.',
      target,
      parameterNames,
    );
  }

  let expression = leftHasTarget ? left : right;
  let otherSide = leftHasTarget ? right : left;
  const steps: PeelStep[] = [];
  const facts: string[] = [];
  const maxPeels = options.maxPeels ?? DEFAULT_MAX_PEELS;

  for (let depth = 0; depth < maxPeels; depth += 1) {
    const peel = peelOnce(expression, otherSide, target);
    if (peel.kind === 'unsupported') {
      const generatedEquationLatex = equationLatexForAttempt(expression, otherSide);
      const delegated = tryDelegatedSolvers(
        generatedEquationLatex,
        target,
        angleUnit,
        allowGeneratedImplicitProducts,
      );

      if (delegated) {
        const exactSupplementLatex = normalizeParameterizedSupplementLatex([
          ...unique(facts),
          ...(delegated.exactSupplementLatex ?? []),
        ]);
        return {
          kind: 'success',
          target,
          parameterNames,
          generatedEquationLatex,
          exactLatex: delegated.exactLatex,
          exactSupplementLatex,
          detailSections: detailSectionsForSuccess(
            target,
            parameterNames,
            steps,
            generatedEquationLatex,
            unique(facts),
            delegated.detailSections,
          ),
        };
      }

      if (peel.reason === 'no-isolation' && steps.length > 0) {
        return stop(
          'generated-equation-unsupported',
          'The selected-target island was isolated, but the generated equation is outside the current exact solvers.',
          target,
          parameterNames,
        );
      }

      return stop(peel.reason, peel.message, target, parameterNames);
    }

    steps.push(peel.step);
    facts.push(...peel.step.facts);
    expression = peel.step.expression;
    otherSide = peel.step.otherSide;

    const generatedEquationLatex = equationLatexForAttempt(expression, otherSide);
    const delegated = tryDelegatedSolvers(
      generatedEquationLatex,
      target,
      angleUnit,
      allowGeneratedImplicitProducts,
    );

    if (delegated) {
      const exactSupplementLatex = normalizeParameterizedSupplementLatex([
        ...unique(facts),
        ...(delegated.exactSupplementLatex ?? []),
      ]);
      return {
        kind: 'success',
        target,
        parameterNames,
        generatedEquationLatex,
        exactLatex: delegated.exactLatex,
        exactSupplementLatex,
        detailSections: detailSectionsForSuccess(
          target,
          parameterNames,
          steps,
          generatedEquationLatex,
          unique(facts),
          delegated.detailSections,
        ),
      };
    }
  }

  return stop(
    'isolation-depth-limit',
    'The selected-target isolation pass reached its bounded shell depth before finding a supported generated equation.',
    target,
    parameterNames,
  );
}

function equationLatexForAttempt(expression: MathJson, otherSide: MathJson) {
  return equationLatex(expression, otherSide);
}
