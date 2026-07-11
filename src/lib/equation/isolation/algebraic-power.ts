import type {
  AnswerDomain,
  ComplexExactForm,
  DisplayBranchReadback,
  OutputStyle,
} from '../../../types/calculator';
import { equationLabelLineParts } from '../../display/result-detail-lines';
import {
  buildParameterizedDetailSections,
  normalizeParameterizedSupplementLatex,
} from '../parameterized/readback';
import {
  addNodes,
  divideNodes,
  equationLatex,
  factNonzero,
  flattenMultiply,
  hasTarget,
  isArrayNode,
  isOneNode,
  isZeroNode,
  latexForNode,
  multiplyNodes,
  negateNode,
  ONE,
  simplifyNode,
  subtractNodes,
  ZERO,
  type MathJson,
} from './math-json';
import type { PeelStep } from './peeling';
import type {
  EquationAlgebraicIsolationStop,
  EquationAlgebraicIsolationStopReason,
  EquationAlgebraicIsolationSuccess,
} from './algebraic';
import { profileEquationResult } from '../../display/printer';

export const MAX_COMPLEX_ALGEBRAIC_POWER = 4;
export const MAX_REAL_AFFINE_ALGEBRAIC_POWER = 12;
export const MAX_ALGEBRAIC_POWER = MAX_COMPLEX_ALGEBRAIC_POWER;

type AffineTarget = {
  coefficient: MathJson;
  constant: MathJson;
};

type DegreeResult = { kind: 'ok'; degree: number } | { kind: 'unsupported' };

export type ComplexPowerBranchReadback = {
  exactLatex: string[];
  approxLatex?: string[];
  approxText?: string[];
  preserveOrder?: boolean;
};

type SolvePowerCallbacks = {
  exactLatexForSolutions: (target: string, roots: string[], options?: { preserveOrder?: boolean }) => string;
  branchReadbackForSolutions: (
    target: string,
    roots: string[],
    options?: { preserveOrder?: boolean; source?: string },
  ) => DisplayBranchReadback | undefined;
  complexPowerBranchReadback: (
    rootLatex: string,
    degree: number,
    otherSide: MathJson,
    complexExactForm: ComplexExactForm,
  ) => ComplexPowerBranchReadback | null;
};

function stop(
  reason: EquationAlgebraicIsolationStopReason,
  message: string,
  target: string,
  parameterNames: string[],
): EquationAlgebraicIsolationStop {
  return {
    kind: 'unsupported',
    reason,
    message,
    target,
    parameterNames,
  };
}

function rootNode(value: MathJson, degree: number): MathJson {
  return simplifyNode(['Power', value, ['Rational', 1, degree]] as MathJson);
}

function collectAffineTarget(node: MathJson, target: string): AffineTarget | null {
  if (typeof node === 'string') {
    return node === target
      ? { coefficient: ONE, constant: ZERO }
      : { coefficient: ZERO, constant: node };
  }

  if (typeof node === 'number' || typeof node === 'boolean' || node === null || !isArrayNode(node)) {
    return hasTarget(node, target)
      ? null
      : { coefficient: ZERO, constant: node };
  }

  const [operator, ...operands] = node;

  if (operator === 'Add') {
    let coefficient: MathJson = ZERO;
    let constant: MathJson = ZERO;
    for (const operand of operands) {
      const collected = collectAffineTarget(operand as MathJson, target);
      if (!collected) {
        return null;
      }
      coefficient = addNodes(coefficient, collected.coefficient);
      constant = addNodes(constant, collected.constant);
    }
    return { coefficient, constant };
  }

  if (operator === 'Subtract') {
    const left = collectAffineTarget(operands[0] as MathJson, target);
    const right = collectAffineTarget(operands[1] as MathJson, target);
    if (!left || !right) {
      return null;
    }
    return {
      coefficient: subtractNodes(left.coefficient, right.coefficient),
      constant: subtractNodes(left.constant, right.constant),
    };
  }

  if (operator === 'Negate') {
    const collected = collectAffineTarget(operands[0] as MathJson, target);
    return collected
      ? {
        coefficient: negateNode(collected.coefficient),
        constant: negateNode(collected.constant),
      }
      : null;
  }

  if (operator === 'Multiply' || operator === 'InvisibleOperator') {
    const factors = flattenMultiply(operands as MathJson[]);
    const targetFactors = factors.filter((factor) => hasTarget(factor, target));
    if (targetFactors.length > 1) {
      return null;
    }
    if (targetFactors.length === 0) {
      return { coefficient: ZERO, constant: multiplyNodes(...factors) };
    }
    const affine = collectAffineTarget(targetFactors[0], target);
    if (!affine) {
      return null;
    }
    const scale = multiplyNodes(...factors.filter((factor) => !hasTarget(factor, target)));
    return {
      coefficient: multiplyNodes(scale, affine.coefficient),
      constant: multiplyNodes(scale, affine.constant),
    };
  }

  if (operator === 'Divide') {
    const [numerator, denominator] = operands as MathJson[];
    if (hasTarget(denominator, target)) {
      return null;
    }
    const collected = collectAffineTarget(numerator, target);
    return collected
      ? {
        coefficient: divideNodes(collected.coefficient, denominator),
        constant: divideNodes(collected.constant, denominator),
      }
      : null;
  }

  if (hasTarget(node, target)) {
    return null;
  }

  return { coefficient: ZERO, constant: node };
}

function targetDegree(node: MathJson, target: string): DegreeResult {
  if (typeof node === 'string') {
    return { kind: 'ok', degree: node === target ? 1 : 0 };
  }

  if (typeof node === 'number' || typeof node === 'boolean' || node === null || !isArrayNode(node)) {
    return hasTarget(node, target) ? { kind: 'unsupported' } : { kind: 'ok', degree: 0 };
  }

  const [operator, ...operands] = node;

  if (operator === 'Add' || operator === 'Subtract') {
    let degree = 0;
    for (const operand of operands) {
      const child = targetDegree(operand as MathJson, target);
      if (child.kind === 'unsupported') {
        return child;
      }
      degree = Math.max(degree, child.degree);
    }
    return { kind: 'ok', degree };
  }

  if (operator === 'Negate') {
    return targetDegree(operands[0] as MathJson, target);
  }

  if (operator === 'Multiply' || operator === 'InvisibleOperator') {
    let degree = 0;
    for (const operand of flattenMultiply(operands as MathJson[])) {
      const child = targetDegree(operand, target);
      if (child.kind === 'unsupported') {
        return child;
      }
      degree += child.degree;
      if (degree > MAX_REAL_AFFINE_ALGEBRAIC_POWER) {
        return { kind: 'ok', degree };
      }
    }
    return { kind: 'ok', degree };
  }

  if (operator === 'Divide') {
    const [numerator, denominator] = operands as MathJson[];
    if (hasTarget(denominator, target)) {
      return { kind: 'unsupported' };
    }
    return targetDegree(numerator, target);
  }

  if (operator === 'Power') {
    const [base, exponent] = operands as MathJson[];
    if (typeof exponent !== 'number' || !Number.isInteger(exponent) || exponent < 0) {
      return hasTarget(node, target) ? { kind: 'unsupported' } : { kind: 'ok', degree: 0 };
    }
    const baseDegree = targetDegree(base, target);
    return baseDegree.kind === 'unsupported'
      ? baseDegree
      : { kind: 'ok', degree: baseDegree.degree * exponent };
  }

  return hasTarget(node, target) ? { kind: 'unsupported' } : { kind: 'ok', degree: 0 };
}

export function polynomialDegreeInEquation(json: MathJson, target: string) {
  if (!isArrayNode(json) || json[0] !== 'Equal' || json.length !== 3) {
    return null;
  }
  const zeroForm = subtractNodes(json[1] as MathJson, json[2] as MathJson);
  const degree = targetDegree(zeroForm, target);
  return degree.kind === 'ok' ? degree.degree : null;
}

export function solvePowerExpression({
  expression,
  otherSide,
  target,
  parameterNames,
  steps,
  facts,
  answerDomain,
  outputStyle = 'exact',
  complexExactForm = 'rectangular',
  callbacks,
}: {
  expression: MathJson;
  otherSide: MathJson;
  target: string;
  parameterNames: string[];
  steps: PeelStep[];
  facts: string[];
  answerDomain?: AnswerDomain;
  outputStyle?: OutputStyle;
  complexExactForm?: ComplexExactForm;
  callbacks: SolvePowerCallbacks;
}): EquationAlgebraicIsolationSuccess | EquationAlgebraicIsolationStop | null {
  if (!isArrayNode(expression) || expression[0] !== 'Power' || expression.length !== 3) {
    return null;
  }

  const degree = expression[2];
  if (typeof degree !== 'number' || !Number.isInteger(degree)) {
    return stop(
      'unsupported-power-degree',
      'Algebraic isolation only handles integer selected-target powers.',
      target,
      parameterNames,
    );
  }

  if (answerDomain === 'complex') {
    if (degree < 2 || degree > MAX_COMPLEX_ALGEBRAIC_POWER) {
      return stop(
        'unsupported-power-degree',
        `Complex algebraic isolation is capped at selected-target powers 2 through ${MAX_COMPLEX_ALGEBRAIC_POWER}.`,
        target,
        parameterNames,
      );
    }
  } else if (degree < 3 || degree > MAX_REAL_AFFINE_ALGEBRAIC_POWER) {
    return stop(
      'unsupported-power-degree',
      `Algebraic isolation is capped at selected-target powers 3 through ${MAX_REAL_AFFINE_ALGEBRAIC_POWER}.`,
      target,
      parameterNames,
    );
  }

  const affine = collectAffineTarget(expression[1] as MathJson, target);
  if (!affine || isZeroNode(simplifyNode(affine.coefficient))) {
    return stop(
      'unsupported-power-base',
      'The selected-target power base is not affine in the selected target.',
      target,
      parameterNames,
    );
  }

  const root = rootNode(otherSide, degree);
  if (answerDomain === 'complex') {
    if (!isOneNode(simplifyNode(affine.coefficient)) || !isZeroNode(simplifyNode(affine.constant))) {
      return stop(
        'unsupported-power-base',
        'Complex selected-target power isolation only handles direct selected-target bases in this bounded pass.',
        target,
        parameterNames,
      );
    }

    const generatedEquationLatex = equationLatex(expression, otherSide);
    const readback = callbacks.complexPowerBranchReadback(latexForNode(root), degree, otherSide, complexExactForm);
    if (!readback) {
      return stop(
        'formula-size-limit',
        'The selected complex exact form could not be rendered safely for this bounded power.',
        target,
        parameterNames,
      );
    }

    const roots = outputStyle === 'decimal' && readback.approxLatex
      ? readback.approxLatex
      : readback.exactLatex;
    const approxText = outputStyle === 'both' && readback.approxText
      ? `${target} ~= ${readback.approxText.join(', ')}`
      : undefined;
    const detailSections = buildParameterizedDetailSections({
      target,
      parameterNames,
      familyTitle: 'Complex Algebraic Isolation',
      familyLines: [
        `Isolated a selected-target power of degree ${degree} over the complex domain.`,
        `Generated equation: ${generatedEquationLatex}`,
        ...steps.map((step) => step.line),
        'Returned bounded complex formula branches because Complex intent is enabled.',
      ],
      familyLineParts: [
        [],
        equationLabelLineParts('Generated equation', generatedEquationLatex),
        ...steps.map(() => []),
        [],
      ],
    });

    return profileEquationResult({
      kind: 'success',
      target,
      parameterNames,
      generatedEquationLatex,
      exactLatex: callbacks.exactLatexForSolutions(target, roots, {
        preserveOrder: readback.preserveOrder,
      }),
      branchReadback: callbacks.branchReadbackForSolutions(target, roots, {
        preserveOrder: readback.preserveOrder,
        source: 'equation-algebraic-isolation-complex',
      }),
      approxText,
      exactSupplementLatex: normalizeParameterizedSupplementLatex(facts),
      detailSections,
      answerDomain: 'complex',
    });
  }

  const baseBranches = degree % 2 === 0 ? [negateNode(root), root] : [root];
  const coefficientFact = factNonzero(affine.coefficient);
  const allFacts = [
    ...facts,
    ...(coefficientFact ? [coefficientFact] : []),
    ...(degree % 2 === 0 ? [`${latexForNode(otherSide)}\\ge0`] : []),
  ];
  const roots = baseBranches.map((branch) =>
    latexForNode(divideNodes(subtractNodes(branch, affine.constant), affine.coefficient)));
  const generatedEquationLatex = equationLatex(expression, otherSide);
  const detailSections = buildParameterizedDetailSections({
    target,
    parameterNames,
    familyTitle: 'Algebraic Isolation',
    familyLines: [
      `Isolated a selected-target power of degree ${degree}.`,
      `Generated equation: ${generatedEquationLatex}`,
      ...steps.map((step) => step.line),
      degree % 2 === 0
        ? 'Returned both real even-root branches under the displayed validity condition.'
        : 'Returned the real odd-root branch.',
    ],
    familyLineParts: [
      [],
      equationLabelLineParts('Generated equation', generatedEquationLatex),
      ...steps.map(() => []),
      [],
    ],
  });

  return profileEquationResult({
    kind: 'success',
    target,
    parameterNames,
    generatedEquationLatex,
    exactLatex: callbacks.exactLatexForSolutions(target, roots),
    branchReadback: callbacks.branchReadbackForSolutions(target, roots),
    exactSupplementLatex: normalizeParameterizedSupplementLatex(allFacts),
    detailSections,
  });
}
