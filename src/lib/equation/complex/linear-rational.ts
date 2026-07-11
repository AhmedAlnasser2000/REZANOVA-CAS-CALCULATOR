import type { ComplexExactForm, DisplayDetailSection, OutputStyle, SolveDomainConstraint } from '../../../types/calculator';
import {
  addExactPolynomials,
  addExactScalars,
  divideExactScalars,
  exactPolynomialDegree,
  exactPolynomialToNode,
  getExactPolynomialCoefficient,
  multiplyExactScalars,
  negateExactScalar,
  parseExactPolynomial,
  readExactScalarNode,
  scaleExactPolynomial,
  type ExactScalar,
} from '../../algebra/polynomial-core';
import { classifyRationalDomainNode } from '../../algebra/polynomial-domain-core';
import type { EquationAlgebraicIsolationSuccess } from '../equation-algebraic-isolation';
import { branchFromExactComplex, buildBranchReadback } from './branches';
import {
  addExactComplexScalars,
  divideExactComplexByScalar,
  divideExactComplexScalars,
  exactComplexToFormLatex,
  exactComplexToLatex,
  exactScalarIsZero,
  multiplyExactComplexByScalar,
  multiplyExactComplexScalars,
  negateExactComplexScalar,
  normalizeExactComplexScalar,
  parseExactComplexConstantNode,
  scalarLatex,
} from './exact';
import { addLatex, divideLatex, multiplyLatex, negateLatex, subtractLatex } from './latex';
import { containsTarget, isArrayNode, latexForNode } from './math-json';
import { parameterNamesFromLatex, parseEquationZeroForm, solvePolynomialComplexBranchesFromNode } from './polynomial';
import { ONE_SCALAR, ZERO_SCALAR, type ComplexEquationBranch, type ComplexPreimageBranch, type ComplexPreimageSolveResult, type ExactComplexScalar } from './types';
import {
  renderPeriodicFamilies,
  transformPeriodicFamilyForAffineTarget,
} from '../solution/periodic-family';
import { profileEquationResult } from '../../display/printer';

export type LinearComplexExpression = {
  coefficient: ExactScalar;
  constant: ExactComplexScalar;
};

export function addLinearComplex(
  left: LinearComplexExpression,
  right: LinearComplexExpression,
): LinearComplexExpression {
  return {
    coefficient: addExactScalars(left.coefficient, right.coefficient),
    constant: addExactComplexScalars(left.constant, right.constant),
  };
}

export function negateLinearComplex(value: LinearComplexExpression): LinearComplexExpression {
  return {
    coefficient: negateExactScalar(value.coefficient),
    constant: negateExactComplexScalar(value.constant),
  };
}

export function multiplyLinearComplexByScalar(
  value: LinearComplexExpression,
  scalar: ExactScalar,
): LinearComplexExpression {
  return {
    coefficient: multiplyExactScalars(value.coefficient, scalar),
    constant: multiplyExactComplexByScalar(value.constant, scalar),
  };
}

export function collectLinearComplex(node: unknown, target: string): LinearComplexExpression | null {
  if (node === target) {
    return {
      coefficient: ONE_SCALAR,
      constant: { re: ZERO_SCALAR, im: ZERO_SCALAR },
    };
  }

  if (!containsTarget(node, target)) {
    const constant = parseExactComplexConstantNode(node);
    return constant
      ? { coefficient: ZERO_SCALAR, constant }
      : null;
  }

  if (!isArrayNode(node) || node.length === 0) {
    return null;
  }

  if (node[0] === 'Negate' && node.length === 2) {
    const child = collectLinearComplex(node[1], target);
    return child ? negateLinearComplex(child) : null;
  }

  if (node[0] === 'Add') {
    return node.slice(1).reduce<LinearComplexExpression | null>((sum, part) => {
      if (!sum) {
        return null;
      }
      const parsed = collectLinearComplex(part, target);
      return parsed ? addLinearComplex(sum, parsed) : null;
    }, {
      coefficient: ZERO_SCALAR,
      constant: { re: ZERO_SCALAR, im: ZERO_SCALAR },
    });
  }

  if (node[0] === 'Subtract' && node.length === 3) {
    const left = collectLinearComplex(node[1], target);
    const right = collectLinearComplex(node[2], target);
    return left && right ? addLinearComplex(left, negateLinearComplex(right)) : null;
  }

  if (node[0] === 'Multiply') {
    const targetParts = node.slice(1).filter((part) => containsTarget(part, target));
    if (targetParts.length !== 1) {
      return null;
    }
    const targetPart = collectLinearComplex(targetParts[0], target);
    if (!targetPart || !exactScalarIsZero(targetPart.constant.im) || !exactScalarIsZero(targetPart.constant.re)) {
      return null;
    }
    const scalar = node.slice(1)
      .filter((part) => !containsTarget(part, target))
      .reduce<ExactScalar | null>((product, part) => {
        if (!product) {
          return null;
        }
        const parsed = readExactScalarNode(part);
        return parsed ? multiplyExactScalars(product, parsed) : null;
      }, ONE_SCALAR);
    return scalar ? multiplyLinearComplexByScalar(targetPart, scalar) : null;
  }

  if (node[0] === 'Divide' && node.length === 3) {
    if (containsTarget(node[2], target)) {
      return null;
    }
    const numerator = collectLinearComplex(node[1], target);
    const denominator = readExactScalarNode(node[2]);
    const reciprocal = denominator ? divideExactScalars(ONE_SCALAR, denominator) : null;
    return numerator && reciprocal ? multiplyLinearComplexByScalar(numerator, reciprocal) : null;
  }

  return null;
}

export function exactComplexScalarLatex(value: ExactComplexScalar) {
  return exactComplexToLatex(normalizeExactComplexScalar(value));
}

export function affineSolutionLatex(
  linear: LinearComplexExpression,
  branch: ComplexPreimageBranch,
  complexExactForm: ComplexExactForm,
) {
  const branchExact = branch.exactComplex;
  if (branchExact) {
    const numerator = addExactComplexScalars(branchExact, negateExactComplexScalar(linear.constant));
    const solved = divideExactComplexByScalar(numerator, linear.coefficient);
    return solved
      ? exactComplexToFormLatex(solved, complexExactForm) ?? exactComplexToLatex(solved)
      : null;
  }

  const constantLatex = exactComplexScalarLatex(linear.constant);
  const numeratorLatex = subtractLatex(branch.latex, constantLatex);
  return divideLatex(numeratorLatex, scalarLatex(linear.coefficient));
}

export function solveAffineInnerAgainstBranch(
  node: unknown,
  target: string,
  branch: ComplexPreimageBranch,
  complexExactForm: ComplexExactForm,
): ComplexPreimageSolveResult | null {
  const linear = collectLinearComplex(node, target);
  if (!linear || exactScalarIsZero(linear.coefficient)) {
    return null;
  }

  if (branch.periodicFamily && exactScalarIsZero(linear.constant.im)) {
    const family = transformPeriodicFamilyForAffineTarget(branch.periodicFamily, {
      targetLatex: target,
      coefficient: linear.coefficient,
      constant: linear.constant.re,
    });
    if (family) {
      const rendered = renderPeriodicFamilies([family], {
        source: 'equation-complex-preimage',
        parameterPlacement: 'inline',
      });
      return {
        answerLatex: rendered.exactLatex,
        branchReadback: rendered.branchReadback,
        exactSupplementLatex: [],
        proofLines: [`Reduced ${latexForNode(node)} to a structured periodic affine preimage.`],
      };
    }
  }

  const solutionLatex = affineSolutionLatex(linear, branch, complexExactForm);
  if (!solutionLatex) {
    return null;
  }
  const exactLatex = `${target}\\in\\left\\{${solutionLatex}\\right\\}`;
  const approxText = branch.exactComplex && !branch.parameterLatex
    ? buildBranchReadback(
      target,
      [profileEquationResult({
        exactLatex: solutionLatex,
        exactComplex: divideExactComplexByScalar(
          addExactComplexScalars(branch.exactComplex, negateExactComplexScalar(linear.constant)),
          linear.coefficient,
        ) ?? undefined,
      })],
      'both',
      complexExactForm,
    ).approxText
    : undefined;

  return profileEquationResult({
    answerLatex: branch.parameterLatex ? `${target}=${solutionLatex},\\ ${branch.parameterLatex}` : exactLatex,
    approxText,
    exactSupplementLatex: [],
    proofLines: [`Reduced ${latexForNode(node)} to a one-variable affine preimage.`],
  });
}

export function solveRationalLinearInnerAgainstBranch(
  node: unknown,
  target: string,
  branch: ComplexPreimageBranch,
): ComplexPreimageSolveResult | null {
  if (!isArrayNode(node) || node[0] !== 'Divide' || node.length !== 3) {
    return null;
  }
  const numerator = collectLinearComplex(node[1], target);
  const denominator = collectLinearComplex(node[2], target);
  if (
    !numerator
    || !denominator
    || !exactScalarIsZero(numerator.constant.im)
    || !exactScalarIsZero(denominator.constant.im)
  ) {
    return null;
  }

  const a = scalarLatex(numerator.coefficient);
  const b = scalarLatex(numerator.constant.re);
  const c = scalarLatex(denominator.coefficient);
  const d = scalarLatex(denominator.constant.re);
  const top = subtractLatex(multiplyLatex(branch.latex, d), b);
  const bottom = subtractLatex(a, multiplyLatex(branch.latex, c));
  const solutionLatex = divideLatex(top, bottom);
  return profileEquationResult({
    answerLatex: branch.parameterLatex
      ? `${target}=${solutionLatex},\\ ${branch.parameterLatex}`
      : `${target}\\in\\left\\{${solutionLatex}\\right\\}`,
    exactSupplementLatex: [`${latexForNode(node[2])}\\ne0`, `${bottom}\\ne0`],
    proofLines: ['Solved a supported rational-linear complex preimage and preserved denominator exclusions.'],
  });
}

export function exactComplexDiscriminantLatex(
  a: ExactComplexScalar,
  b: ExactComplexScalar,
  c: ExactComplexScalar,
) {
  const bSquared = multiplyExactComplexScalars(b, b);
  const fourAC = multiplyExactComplexByScalar(multiplyExactComplexScalars(a, c), {
    numerator: 4,
    denominator: 1,
  });
  return exactComplexToLatex(addExactComplexScalars(bSquared, negateExactComplexScalar(fourAC)));
}

export function solveQuadraticOverLinearAgainstExactBranch(
  node: unknown,
  target: string,
  branch: ComplexPreimageBranch,
): ComplexPreimageSolveResult | null {
  if (!branch.exactComplex || !isArrayNode(node) || node[0] !== 'Divide' || node.length !== 3) {
    return null;
  }
  const numeratorPolynomial = parseExactPolynomial(node[1], target, 2);
  const denominatorLinear = collectLinearComplex(node[2], target);
  if (
    !numeratorPolynomial
    || exactPolynomialDegree(numeratorPolynomial) !== 2
    || !denominatorLinear
    || !exactScalarIsZero(denominatorLinear.constant.im)
  ) {
    return null;
  }

  const a = { re: getExactPolynomialCoefficient(numeratorPolynomial, 2), im: ZERO_SCALAR };
  const b = addExactComplexScalars(
    { re: getExactPolynomialCoefficient(numeratorPolynomial, 1), im: ZERO_SCALAR },
    negateExactComplexScalar(multiplyExactComplexByScalar(branch.exactComplex, denominatorLinear.coefficient)),
  );
  const c = addExactComplexScalars(
    { re: getExactPolynomialCoefficient(numeratorPolynomial, 0), im: ZERO_SCALAR },
    negateExactComplexScalar(multiplyExactComplexByScalar(branch.exactComplex, denominatorLinear.constant.re)),
  );
  const negativeB = negateExactComplexScalar(b);
  const denominator = multiplyExactScalars(a.re, { numerator: 2, denominator: 1 });
  const discriminantLatex = exactComplexDiscriminantLatex(a, b, c);
  const negativeBLatex = exactComplexToLatex(negativeB);
  const denominatorLatex = scalarLatex(denominator);
  const left = `\\frac{${negativeBLatex}-\\sqrt{${discriminantLatex}}}{${denominatorLatex}}`;
  const right = `\\frac{${negativeBLatex}+\\sqrt{${discriminantLatex}}}{${denominatorLatex}}`;
  return profileEquationResult({
    answerLatex: `${target}\\in\\left\\{${left},\\ ${right}\\right\\}`,
    exactSupplementLatex: [`${latexForNode(node[2])}\\ne0`],
    proofLines: ['Solved a supported rational equation by clearing a linear denominator and applying the complex quadratic formula.'],
  });
}

export function exactComplexCoefficientIsZero(value: ExactComplexScalar) {
  const normalized = normalizeExactComplexScalar(value);
  return exactScalarIsZero(normalized.re) && exactScalarIsZero(normalized.im);
}

export function exactComplexPolynomialDegree(coefficients: ExactComplexScalar[]) {
  for (let degree = coefficients.length - 1; degree >= 0; degree -= 1) {
    if (!exactComplexCoefficientIsZero(coefficients[degree])) {
      return degree;
    }
  }
  return 0;
}

export function clearedRationalCoefficient(
  numeratorCoefficient: ExactScalar,
  denominatorCoefficient: ExactScalar,
  branch: ExactComplexScalar,
) {
  return addExactComplexScalars(
    { re: numeratorCoefficient, im: ZERO_SCALAR },
    negateExactComplexScalar(multiplyExactComplexByScalar(branch, denominatorCoefficient)),
  );
}

export function exactComplexPolynomialCoefficientsForClearedRational(
  node: unknown,
  target: string,
  branch: ExactComplexScalar,
) {
  const rational = classifyRationalDomainNode(node, { variable: target, maxDegree: 4 });
  if (rational.kind !== 'success' || !rational.metadata.denominatorLatex) {
    return null;
  }
  const numerator = rational.metadata.rational.numerator;
  const denominator = rational.metadata.rational.denominator;
  const degree = Math.max(exactPolynomialDegree(numerator), exactPolynomialDegree(denominator));
  const coefficients = Array.from({ length: degree + 1 }, (_, index) =>
    clearedRationalCoefficient(
      getExactPolynomialCoefficient(numerator, index),
      getExactPolynomialCoefficient(denominator, index),
      branch,
    ));
  return {
    rational: rational.metadata,
    coefficients,
  };
}

export function complexLinearFormulaBranches(coefficients: ExactComplexScalar[]) {
  const a = coefficients[1];
  const b = coefficients[0];
  if (exactComplexCoefficientIsZero(a)) {
    return null;
  }
  const root = divideExactComplexScalars(negateExactComplexScalar(b), a);
  return root ? [branchFromExactComplex(root)] : null;
}

export function complexQuadraticFormulaBranches(
  coefficients: ExactComplexScalar[],
  complexExactForm: ComplexExactForm,
): ComplexEquationBranch[] | null {
  const a = coefficients[2];
  const b = coefficients[1];
  const c = coefficients[0];
  if (exactComplexCoefficientIsZero(a)) {
    return null;
  }

  const negativeB = negateExactComplexScalar(b);
  const denominator = multiplyExactComplexByScalar(a, { numerator: 2, denominator: 1 });
  const discriminantLatex = exactComplexDiscriminantLatex(a, b, c);
  const negativeBLatex = exactComplexToFormLatex(negativeB, complexExactForm) ?? exactComplexToLatex(negativeB);
  const denominatorLatex = exactComplexToFormLatex(denominator, complexExactForm) ?? exactComplexToLatex(denominator);
  return [
    profileEquationResult({ exactLatex: `\\frac{${negativeBLatex}-\\sqrt{${discriminantLatex}}}{${denominatorLatex}}` }),
    profileEquationResult({ exactLatex: `\\frac{${negativeBLatex}+\\sqrt{${discriminantLatex}}}{${denominatorLatex}}` }),
  ];
}

export function solveRealClearedRationalAgainstBranch(
  node: unknown,
  target: string,
  branch: ExactComplexScalar,
) {
  if (!exactScalarIsZero(branch.im)) {
    return null;
  }
  const rational = classifyRationalDomainNode(node, { variable: target, maxDegree: 4 });
  if (rational.kind !== 'success' || !rational.metadata.denominatorLatex) {
    return null;
  }
  const clearedPolynomial = addExactPolynomials(
    rational.metadata.rational.numerator,
    scaleExactPolynomial(rational.metadata.rational.denominator, branch.re),
    -1,
  );
  const solved = solvePolynomialComplexBranchesFromNode(exactPolynomialToNode(clearedPolynomial), target);
  return solved
    ? {
      rational: rational.metadata,
      solved,
    }
    : null;
}

export function solveRationalClearedInnerAgainstBranch(
  node: unknown,
  target: string,
  branch: ComplexPreimageBranch,
  outputStyle: OutputStyle,
  complexExactForm: ComplexExactForm,
): ComplexPreimageSolveResult | null {
  if (!branch.exactComplex || branch.parameterLatex) {
    return null;
  }

  const realCleared = solveRealClearedRationalAgainstBranch(node, target, branch.exactComplex);
  if (realCleared) {
    const readback = buildBranchReadback(target, realCleared.solved.branches, outputStyle, complexExactForm);
    return {
      answerLatex: readback.exactLatex,
      branchReadback: readback.branchReadback,
      approxText: readback.approxText,
      exactSupplementLatex: realCleared.rational.domainConstraints
        .map(domainConstraintToLatex)
        .filter((line): line is string => Boolean(line)),
      proofLines: ['Cleared a supported rational complex preimage into bounded exact polynomial branches.'],
    };
  }

  const cleared = exactComplexPolynomialCoefficientsForClearedRational(node, target, branch.exactComplex);
  if (!cleared) {
    return null;
  }
  const degree = exactComplexPolynomialDegree(cleared.coefficients);
  const branches = degree === 1
    ? complexLinearFormulaBranches(cleared.coefficients)
    : degree === 2
      ? complexQuadraticFormulaBranches(cleared.coefficients, complexExactForm)
      : null;
  if (!branches || branches.length === 0) {
    return null;
  }
  const readback = buildBranchReadback(target, branches, outputStyle, complexExactForm);
  return {
    answerLatex: readback.exactLatex,
    branchReadback: readback.branchReadback,
    approxText: readback.approxText,
    exactSupplementLatex: cleared.rational.domainConstraints
      .map(domainConstraintToLatex)
      .filter((line): line is string => Boolean(line)),
    proofLines: ['Cleared a supported rational complex preimage and applied bounded exact linear/quadratic complex algebra.'],
  };
}

export function solveQuadraticOverLinearAgainstBranchLatex(
  node: unknown,
  target: string,
  branch: ComplexPreimageBranch,
): ComplexPreimageSolveResult | null {
  if (!isArrayNode(node) || node[0] !== 'Divide' || node.length !== 3) {
    return null;
  }
  const numeratorPolynomial = parseExactPolynomial(node[1], target, 2);
  const denominatorLinear = collectLinearComplex(node[2], target);
  if (
    !numeratorPolynomial
    || exactPolynomialDegree(numeratorPolynomial) !== 2
    || !denominatorLinear
    || !exactScalarIsZero(denominatorLinear.constant.im)
  ) {
    return null;
  }

  const a = scalarLatex(getExactPolynomialCoefficient(numeratorPolynomial, 2));
  const b = subtractLatex(
    scalarLatex(getExactPolynomialCoefficient(numeratorPolynomial, 1)),
    multiplyLatex(branch.latex, scalarLatex(denominatorLinear.coefficient)),
  );
  const c = subtractLatex(
    scalarLatex(getExactPolynomialCoefficient(numeratorPolynomial, 0)),
    multiplyLatex(branch.latex, scalarLatex(denominatorLinear.constant.re)),
  );
  const negativeB = negateLatex(b);
  const discriminant = subtractLatex(multiplyLatex(b, b), multiplyLatex(multiplyLatex('4', a), c));
  const denominator = multiplyLatex('2', a);
  const left = divideLatex(subtractLatex(negativeB, `\\sqrt{${discriminant}}`), denominator);
  const right = divideLatex(addLatex(negativeB, `\\sqrt{${discriminant}}`), denominator);
  return profileEquationResult({
    answerLatex: `${target}\\in\\left\\{${left},\\ ${right}\\right\\}${branch.parameterLatex ? `,\\ ${branch.parameterLatex}` : ''}`,
    exactSupplementLatex: [`${latexForNode(node[2])}\\ne0`],
    proofLines: ['Cleared a supported quadratic-over-linear complex preimage and kept its branch family symbolic.'],
  });
}

export function solveDirectComplexLinearEquation(
  equationLatex: string,
  target: string,
  outputStyle: OutputStyle = 'exact',
  complexExactForm: ComplexExactForm = 'rectangular',
): EquationAlgebraicIsolationSuccess | null {
  const zeroForm = parseEquationZeroForm(equationLatex);
  if (!zeroForm) {
    return null;
  }
  const linear = collectLinearComplex(zeroForm, target);
  if (!linear || exactScalarIsZero(linear.coefficient) || exactScalarIsZero(linear.constant.im)) {
    return null;
  }
  const negatedConstant = negateExactComplexScalar(linear.constant);
  const root = divideExactComplexByScalar(negatedConstant, linear.coefficient);
  if (!root) {
    return null;
  }

  const readback = buildBranchReadback(target, [branchFromExactComplex(root)], outputStyle, complexExactForm);
  const parameterNames = parameterNamesFromLatex(equationLatex, target);
  const detailSections: DisplayDetailSection[] = [
    {
      title: 'Complex Linear Route',
      lineKind: 'text',
      lines: [
        'Domain intent: Complex.',
        'Solved a direct one-variable linear equation with an explicit imaginary constant.',
      ],
    },
    {
      title: 'Solve Target',
      lineKind: 'text',
      lines: [
        `Selected target: ${target}`,
        parameterNames.length > 0
          ? `Symbolic parameters: ${parameterNames.join(', ')}`
          : 'No symbolic parameters were preserved.',
      ],
    },
  ];

  return {
    kind: 'success',
    target,
    parameterNames,
    generatedEquationLatex: equationLatex,
    exactLatex: readback.exactLatex,
    branchReadback: readback.branchReadback,
    approxText: readback.approxText,
    detailSections,
    answerDomain: 'complex',
  };
}

export function domainConstraintToLatex(constraint: SolveDomainConstraint) {
  if (constraint.kind === 'nonzero') {
    return `${constraint.expressionLatex}\\ne0`;
  }
  if (constraint.kind === 'positive') {
    return `${constraint.expressionLatex}>0`;
  }
  if (constraint.kind === 'nonnegative') {
    return `${constraint.expressionLatex}\\ge0`;
  }
  return undefined;
}

export function solveRationalComplexEquation(
  equationLatex: string,
  target: string,
  outputStyle: OutputStyle = 'exact',
  complexExactForm: ComplexExactForm = 'rectangular',
): EquationAlgebraicIsolationSuccess | null {
  const zeroForm = parseEquationZeroForm(equationLatex);
  if (!zeroForm) {
    return null;
  }
  const rational = classifyRationalDomainNode(zeroForm, { variable: target, maxDegree: 4 });
  if (rational.kind !== 'success' || !rational.metadata.denominatorLatex) {
    return null;
  }

  const solved = solvePolynomialComplexBranchesFromNode(rational.metadata.numerator.node, target);
  if (!solved || !solved.hasComplexBranch) {
    return null;
  }

  const readback = buildBranchReadback(target, solved.branches, outputStyle, complexExactForm);
  const exactSupplementLatex = rational.metadata.domainConstraints
    .map(domainConstraintToLatex)
    .filter((line): line is string => Boolean(line));
  const parameterNames = parameterNamesFromLatex(equationLatex, target);
  const detailSections: DisplayDetailSection[] = [
    {
      title: 'Complex Rational Route',
      lineKind: 'text',
      lines: [
        'Domain intent: Complex.',
        'Solved numerator roots for a supported rational equation over the complex domain.',
        `Numerator: ${rational.metadata.numeratorLatex}.`,
        `Denominator: ${rational.metadata.denominatorLatex}.`,
      ],
    },
    {
      title: 'Solve Target',
      lineKind: 'text',
      lines: [
        `Selected target: ${target}`,
        parameterNames.length > 0
          ? `Symbolic parameters: ${parameterNames.join(', ')}`
          : 'No symbolic parameters were preserved.',
      ],
    },
  ];

  return {
    kind: 'success',
    target,
    parameterNames,
    generatedEquationLatex: equationLatex,
    exactLatex: readback.exactLatex,
    branchReadback: readback.branchReadback,
    approxText: readback.approxText,
    exactSupplementLatex,
    detailSections,
    answerDomain: 'complex',
  };
}
