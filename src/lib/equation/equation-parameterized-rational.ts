import { ComputeEngine } from '@cortex-js/compute-engine';
import type { DisplayDetailSection } from '../../types/calculator';
import { analyzeVariablesFromLatex } from '../algebra/variable-core';
import { solveParameterizedLinearEquation } from './equation-parameterized-linear';
import { solveParameterizedPolynomialEquation } from './equation-parameterized-polynomial';

const ce = new ComputeEngine();

type MathJson = string | number | boolean | null | MathJson[] | { [key: string]: MathJson | undefined };

export type ParameterizedRationalStopReason =
  | 'parse-error'
  | 'non-equation'
  | 'target-not-found'
  | 'ambiguous-adjacent-product'
  | 'target-in-unsupported-operation'
  | 'target-power'
  | 'cleared-degree-limit'
  | 'nested-denominator'
  | 'not-rational'
  | 'cleared-equation-unsupported';

export type ParameterizedRationalSolveSuccess = {
  kind: 'success';
  target: string;
  parameterNames: string[];
  exactLatex: string;
  exactSupplementLatex?: string[];
  detailSections: DisplayDetailSection[];
  clearedEquationLatex: string;
};

export type ParameterizedRationalSolveStop = {
  kind: 'unsupported';
  reason: ParameterizedRationalStopReason;
  message: string;
  target: string;
  parameterNames: string[];
};

export type ParameterizedRationalSolveResult =
  | ParameterizedRationalSolveSuccess
  | ParameterizedRationalSolveStop;

type TargetPolynomial = {
  terms: [MathJson, MathJson, MathJson];
};

type RationalExpression = {
  numerator: TargetPolynomial;
  denominator: TargetPolynomial;
  denominatorFacts: string[];
  sawDivision: boolean;
};

type CollectResult<T> =
  | { kind: 'ok'; value: T }
  | { kind: 'unsupported'; reason: ParameterizedRationalStopReason; message: string };

const ZERO: MathJson = 0;
const ONE: MathJson = 1;
const ZERO_POLYNOMIAL: TargetPolynomial = { terms: [ZERO, ZERO, ZERO] };
const ONE_POLYNOMIAL: TargetPolynomial = { terms: [ONE, ZERO, ZERO] };

function unsupported<T>(
  reason: ParameterizedRationalStopReason,
  message: string,
): CollectResult<T> {
  return { kind: 'unsupported', reason, message };
}

function isArrayNode(node: unknown): node is unknown[] {
  return Array.isArray(node);
}

function isZeroNode(node: unknown) {
  return typeof node === 'number' && node === 0;
}

function isOneNode(node: unknown) {
  return typeof node === 'number' && Object.is(node, 1);
}

function isNegativeOneNode(node: unknown) {
  return typeof node === 'number' && Object.is(node, -1);
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
  const factors = flattenOperator('Multiply', nodes).filter((node) => !isOneNode(node));
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
    return -node as MathJson;
  }
  if (isArrayNode(node) && node[0] === 'Negate') {
    return node[1] as MathJson;
  }
  if (isArrayNode(node) && node[0] === 'Add') {
    return addNodes(...node.slice(1).map((term) => negateNode(term as MathJson)));
  }
  return simplifyNode(['Negate', node] as MathJson);
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

function polynomialFromDegree(degree: number, coefficient: MathJson): TargetPolynomial {
  const terms: [MathJson, MathJson, MathJson] = [ZERO, ZERO, ZERO];
  terms[degree] = coefficient;
  return { terms };
}

function addPolynomials(left: TargetPolynomial, right: TargetPolynomial): TargetPolynomial {
  return {
    terms: [
      addNodes(left.terms[0], right.terms[0]),
      addNodes(left.terms[1], right.terms[1]),
      addNodes(left.terms[2], right.terms[2]),
    ],
  };
}

function negatePolynomial(polynomial: TargetPolynomial): TargetPolynomial {
  return {
    terms: [
      negateNode(polynomial.terms[0]),
      negateNode(polynomial.terms[1]),
      negateNode(polynomial.terms[2]),
    ],
  };
}

function subtractPolynomials(left: TargetPolynomial, right: TargetPolynomial): TargetPolynomial {
  return addPolynomials(left, negatePolynomial(right));
}

function multiplyPolynomials(
  left: TargetPolynomial,
  right: TargetPolynomial,
): CollectResult<TargetPolynomial> {
  const terms: [MathJson, MathJson, MathJson] = [ZERO, ZERO, ZERO];
  for (let leftDegree = 0; leftDegree <= 2; leftDegree += 1) {
    for (let rightDegree = 0; rightDegree <= 2; rightDegree += 1) {
      const coefficient = multiplyNodes(left.terms[leftDegree], right.terms[rightDegree]);
      if (isZeroNode(coefficient)) {
        continue;
      }
      const degree = leftDegree + rightDegree;
      if (degree > 2) {
        return unsupported(
          'cleared-degree-limit',
          'Clearing this rational equation would exceed the EQUATION-PARAM3 degree-2 cap.',
        );
      }
      terms[degree] = addNodes(terms[degree], coefficient);
    }
  }
  return { kind: 'ok', value: { terms } };
}

function polynomialPower(
  polynomial: TargetPolynomial,
  exponent: number,
): CollectResult<TargetPolynomial> {
  let current = ONE_POLYNOMIAL;
  for (let index = 0; index < exponent; index += 1) {
    const next = multiplyPolynomials(current, polynomial);
    if (next.kind === 'unsupported') {
      return next;
    }
    current = next.value;
  }
  return { kind: 'ok', value: current };
}

function scalePolynomial(polynomial: TargetPolynomial, denominator: MathJson): TargetPolynomial {
  return {
    terms: [
      divideNodes(polynomial.terms[0], denominator),
      divideNodes(polynomial.terms[1], denominator),
      divideNodes(polynomial.terms[2], denominator),
    ],
  };
}

function polynomialDegree(polynomial: TargetPolynomial) {
  for (let degree = 2; degree >= 0; degree -= 1) {
    if (!isZeroNode(polynomial.terms[degree])) {
      return degree;
    }
  }
  return -1;
}

function polynomialToNode(polynomial: TargetPolynomial, target: string): MathJson {
  const terms: MathJson[] = [];
  for (let degree = 2; degree >= 0; degree -= 1) {
    const coefficient = polynomial.terms[degree];
    if (isZeroNode(coefficient)) {
      continue;
    }
    if (degree === 0) {
      terms.push(coefficient);
      continue;
    }
    const targetNode: MathJson = degree === 1
      ? target
      : ['Power', target, degree];
    terms.push(isOneNode(coefficient) ? targetNode : multiplyNodes(coefficient, targetNode));
  }
  return terms.length === 0 ? ZERO : addNodes(...terms);
}

function collectPolynomial(node: unknown, target: string): CollectResult<TargetPolynomial> {
  if (typeof node === 'string') {
    return {
      kind: 'ok',
      value: node === target
        ? polynomialFromDegree(1, ONE)
        : polynomialFromDegree(0, node as MathJson),
    };
  }

  if (typeof node === 'number') {
    return { kind: 'ok', value: polynomialFromDegree(0, node as MathJson) };
  }

  if (!isArrayNode(node)) {
    if (hasTarget(node, target)) {
      return unsupported(
        'target-in-unsupported-operation',
        'The selected target appears in an unsupported expression shape.',
      );
    }
    return { kind: 'ok', value: polynomialFromDegree(0, node as MathJson) };
  }

  const [operator, ...operands] = node;

  if (operator === 'Add') {
    let current = ZERO_POLYNOMIAL;
    for (const operand of operands) {
      const collected = collectPolynomial(operand, target);
      if (collected.kind === 'unsupported') {
        return collected;
      }
      current = addPolynomials(current, collected.value);
    }
    return { kind: 'ok', value: current };
  }

  if (operator === 'Subtract') {
    const [left, right] = operands;
    const leftCollected = collectPolynomial(left, target);
    if (leftCollected.kind === 'unsupported') {
      return leftCollected;
    }
    const rightCollected = collectPolynomial(right, target);
    if (rightCollected.kind === 'unsupported') {
      return rightCollected;
    }
    return { kind: 'ok', value: subtractPolynomials(leftCollected.value, rightCollected.value) };
  }

  if (operator === 'Negate') {
    const collected = collectPolynomial(operands[0], target);
    if (collected.kind === 'unsupported') {
      return collected;
    }
    return { kind: 'ok', value: negatePolynomial(collected.value) };
  }

  if (operator === 'Multiply') {
    let current = ONE_POLYNOMIAL;
    for (const operand of operands) {
      const collected = collectPolynomial(operand, target);
      if (collected.kind === 'unsupported') {
        return collected;
      }
      const multiplied = multiplyPolynomials(current, collected.value);
      if (multiplied.kind === 'unsupported') {
        return multiplied;
      }
      current = multiplied.value;
    }
    return { kind: 'ok', value: current };
  }

  if (operator === 'Divide') {
    const [numerator, denominator] = operands;
    if (hasTarget(denominator, target)) {
      return unsupported(
        'nested-denominator',
        'Nested target denominators are outside EQUATION-PARAM3 rational clearing.',
      );
    }
    const collected = collectPolynomial(numerator, target);
    if (collected.kind === 'unsupported') {
      return collected;
    }
    return { kind: 'ok', value: scalePolynomial(collected.value, denominator as MathJson) };
  }

  if (operator === 'Power') {
    const [base, exponent] = operands;
    if (typeof exponent === 'number' && Number.isInteger(exponent)) {
      if (exponent < 0) {
        return unsupported(
          'nested-denominator',
          'Negative target powers are outside EQUATION-PARAM3 rational clearing.',
        );
      }
      const basePolynomial = collectPolynomial(base, target);
      if (basePolynomial.kind === 'unsupported') {
        return basePolynomial;
      }
      if (exponent > 2 && hasTarget(base, target)) {
        return unsupported(
          'target-power',
          'Parameterized rational clearing above degree 2 is planned for a later Equation milestone.',
        );
      }
      return polynomialPower(basePolynomial.value, exponent);
    }

    if (hasTarget(node, target)) {
      return unsupported(
        'target-in-unsupported-operation',
        'This rational parameterized slice does not support the selected target in arbitrary powers.',
      );
    }
  }

  if (hasTarget(node, target)) {
    return unsupported(
      'target-in-unsupported-operation',
      'This parameterized family is outside EQUATION-PARAM3 rational target solving.',
    );
  }

  return { kind: 'ok', value: polynomialFromDegree(0, node as MathJson) };
}

function latexForNode(node: MathJson) {
  return ce.box(simplifyNode(node) as Parameters<typeof ce.box>[0]).latex;
}

function collectRational(node: unknown, target: string): CollectResult<RationalExpression> {
  if (isArrayNode(node)) {
    const [operator, ...operands] = node;
    if (operator === 'Add') {
      let current: RationalExpression = {
        numerator: ZERO_POLYNOMIAL,
        denominator: ONE_POLYNOMIAL,
        denominatorFacts: [],
        sawDivision: false,
      };
      for (const operand of operands) {
        const collected = collectRational(operand, target);
        if (collected.kind === 'unsupported') {
          return collected;
        }
        const numeratorLeft = multiplyPolynomials(current.numerator, collected.value.denominator);
        if (numeratorLeft.kind === 'unsupported') {
          return numeratorLeft;
        }
        const numeratorRight = multiplyPolynomials(collected.value.numerator, current.denominator);
        if (numeratorRight.kind === 'unsupported') {
          return numeratorRight;
        }
        const denominator = multiplyPolynomials(current.denominator, collected.value.denominator);
        if (denominator.kind === 'unsupported') {
          return denominator;
        }
        current = {
          numerator: addPolynomials(numeratorLeft.value, numeratorRight.value),
          denominator: denominator.value,
          denominatorFacts: [...current.denominatorFacts, ...collected.value.denominatorFacts],
          sawDivision: current.sawDivision || collected.value.sawDivision,
        };
      }
      return { kind: 'ok', value: current };
    }

    if (operator === 'Subtract') {
      const [left, right] = operands;
      return collectRational(['Add', left, ['Negate', right]], target);
    }

    if (operator === 'Negate') {
      const collected = collectRational(operands[0], target);
      if (collected.kind === 'unsupported') {
        return collected;
      }
      return {
        kind: 'ok',
        value: {
          ...collected.value,
          numerator: negatePolynomial(collected.value.numerator),
        },
      };
    }

    if (operator === 'Multiply') {
      let current: RationalExpression = {
        numerator: ONE_POLYNOMIAL,
        denominator: ONE_POLYNOMIAL,
        denominatorFacts: [],
        sawDivision: false,
      };
      for (const operand of operands) {
        const collected = collectRational(operand, target);
        if (collected.kind === 'unsupported') {
          return collected;
        }
        const numerator = multiplyPolynomials(current.numerator, collected.value.numerator);
        if (numerator.kind === 'unsupported') {
          return numerator;
        }
        const denominator = multiplyPolynomials(current.denominator, collected.value.denominator);
        if (denominator.kind === 'unsupported') {
          return denominator;
        }
        current = {
          numerator: numerator.value,
          denominator: denominator.value,
          denominatorFacts: [...current.denominatorFacts, ...collected.value.denominatorFacts],
          sawDivision: current.sawDivision || collected.value.sawDivision,
        };
      }
      return { kind: 'ok', value: current };
    }

    if (operator === 'Divide') {
      const [numerator, denominator] = operands;
      const numeratorRational = collectRational(numerator, target);
      if (numeratorRational.kind === 'unsupported') {
        return numeratorRational;
      }
      const denominatorPolynomial = collectPolynomial(denominator, target);
      if (denominatorPolynomial.kind === 'unsupported') {
        return denominatorPolynomial;
      }
      const combinedDenominator = multiplyPolynomials(
        numeratorRational.value.denominator,
        denominatorPolynomial.value,
      );
      if (combinedDenominator.kind === 'unsupported') {
        return combinedDenominator;
      }
      return {
        kind: 'ok',
        value: {
          numerator: numeratorRational.value.numerator,
          denominator: combinedDenominator.value,
          denominatorFacts: [
            ...numeratorRational.value.denominatorFacts,
            latexForNode(polynomialToNode(denominatorPolynomial.value, target)),
          ],
          sawDivision: true,
        },
      };
    }
  }

  const polynomial = collectPolynomial(node, target);
  if (polynomial.kind === 'unsupported') {
    return polynomial;
  }

  return {
    kind: 'ok',
    value: {
      numerator: polynomial.value,
      denominator: ONE_POLYNOMIAL,
      denominatorFacts: [],
      sawDivision: false,
    },
  };
}

function hasAmbiguousAdjacentProduct(latex: string) {
  const analysis = analyzeVariablesFromLatex(latex, { allowSymbolicParameters: true });
  return analysis.implicitCharacterProducts.some((product) => new Set(product.characters).size > 1);
}

function parameterNamesFromLatex(latex: string, target: string) {
  const analysis = analyzeVariablesFromLatex(latex, { allowSymbolicParameters: true });
  return analysis.symbols
    .filter((symbol) =>
      symbol.name !== target
      && symbol.identifierKind === 'single-symbol-variable'
      && /^[A-Za-z]$/.test(symbol.name))
    .map((symbol) => symbol.name);
}

function stop(
  reason: ParameterizedRationalStopReason,
  message: string,
  target: string,
  parameterNames: string[],
): ParameterizedRationalSolveStop {
  return {
    kind: 'unsupported',
    reason,
    message,
    target,
    parameterNames,
  };
}

function dedupeLatex(entries: string[]) {
  return [...new Set(entries.filter(Boolean))];
}

function exclusionLatexFromFacts(entries: string[]) {
  return dedupeLatex(entries).map((entry) => `${entry}\\ne0`);
}

export function solveParameterizedRationalEquation(
  equationLatex: string,
  target: string,
): ParameterizedRationalSolveResult {
  const parameterNames = parameterNamesFromLatex(equationLatex, target);

  if (hasAmbiguousAdjacentProduct(equationLatex)) {
    return stop(
      'ambiguous-adjacent-product',
      'Adjacent letters must use explicit multiplication before parameterized rational solving.',
      target,
      parameterNames,
    );
  }

  let parsed: ReturnType<typeof ce.parse>;
  try {
    parsed = ce.parse(equationLatex);
  } catch {
    return stop('parse-error', 'The equation could not be parsed for parameterized rational solving.', target, parameterNames);
  }

  const json = parsed.json;
  if (!isArrayNode(json) || json[0] !== 'Equal' || json.length !== 3) {
    return stop('non-equation', 'Enter an = equation before parameterized rational solving.', target, parameterNames);
  }

  if (!hasTarget(json, target)) {
    return stop('target-not-found', `Selected target ${target} was not found in this equation.`, target, parameterNames);
  }

  const left = collectRational(json[1], target);
  if (left.kind === 'unsupported') {
    return stop(left.reason, left.message, target, parameterNames);
  }

  const right = collectRational(json[2], target);
  if (right.kind === 'unsupported') {
    return stop(right.reason, right.message, target, parameterNames);
  }

  if (!left.value.sawDivision && !right.value.sawDivision) {
    return stop(
      'not-rational',
      'No rational denominator clearing was needed for this selected-target equation.',
      target,
      parameterNames,
    );
  }

  const leftCleared = multiplyPolynomials(left.value.numerator, right.value.denominator);
  if (leftCleared.kind === 'unsupported') {
    return stop(leftCleared.reason, leftCleared.message, target, parameterNames);
  }
  const rightCleared = multiplyPolynomials(right.value.numerator, left.value.denominator);
  if (rightCleared.kind === 'unsupported') {
    return stop(rightCleared.reason, rightCleared.message, target, parameterNames);
  }

  const cleared = subtractPolynomials(leftCleared.value, rightCleared.value);
  if (polynomialDegree(cleared) > 2) {
    return stop(
      'cleared-degree-limit',
      'Clearing this rational equation would exceed the EQUATION-PARAM3 degree-2 cap.',
      target,
      parameterNames,
    );
  }

  const clearedEquationLatex = `${latexForNode(polynomialToNode(cleared, target))}=0`;
  const delegateOptions = { allowGeneratedImplicitProducts: true };
  const linear = solveParameterizedLinearEquation(clearedEquationLatex, target, delegateOptions);
  const solved = linear.kind === 'success'
    ? linear
    : solveParameterizedPolynomialEquation(clearedEquationLatex, target, delegateOptions);

  if (solved.kind !== 'success') {
    return stop(
      'cleared-equation-unsupported',
      solved.message,
      target,
      parameterNames,
    );
  }

  const originalExclusions = exclusionLatexFromFacts([
    ...left.value.denominatorFacts,
    ...right.value.denominatorFacts,
  ]);
  const exactSupplementLatex = dedupeLatex([
    ...originalExclusions,
    ...(solved.exactSupplementLatex ?? []),
  ]);
  const detailSections: DisplayDetailSection[] = [
    ...solved.detailSections,
    {
      title: 'Parameterized Rational Solve',
      lines: [
        `Cleared denominator factors into ${clearedEquationLatex}.`,
        'Original denominator exclusions were preserved before solving the cleared equation.',
      ],
    },
  ];

  return {
    kind: 'success',
    target,
    parameterNames,
    exactLatex: solved.exactLatex,
    exactSupplementLatex: exactSupplementLatex.length > 0 ? exactSupplementLatex : undefined,
    detailSections,
    clearedEquationLatex,
  };
}
