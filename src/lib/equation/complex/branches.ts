import type { ComplexExactForm, OutputStyle } from '../../../types/calculator';
import { exactScalarToNumber, normalizeExactScalar, type ExactScalar } from '../../algebra/polynomial-core';
import { complex, complexToApproxText, complexToLatex, type ComplexValue } from '../../numeric/complex';
import {
  type EquationFiniteBranchExpression,
} from '../presentation/finite-roots';
import {
  createFiniteRootSet,
  renderFiniteRootSet,
} from '../solution/finite-root-set';
import { sortEquationBranchLatex } from '../equation-branch-readback';
import {
  exactComplexApproxValue,
  exactComplexToFormLatex,
  exactComplexToLatex,
  exactScalarIsZero,
  exactScalarToLatex,
  imaginaryTermLatex,
  normalizeExactComplexScalar,
  parseExactComplexConstantNode,
} from './exact';
import { latexForNode } from './math-json';
import { ZERO_SCALAR, type ComplexEquationBranch, type ComplexPreimageBranch, type ExactComplexScalar } from './types';
import { profileEquationResult } from '../../display/printer';

export function complexBranchLatex(real: ExactScalar, imaginaryMagnitudeLatex: string, sign: 1 | -1) {
  const realLatex = exactScalarToLatex(real);
  const imaginary = imaginaryTermLatex(imaginaryMagnitudeLatex);
  if (exactScalarIsZero(real)) {
    return sign === 1 ? imaginary : `-${imaginary}`;
  }

  return `${realLatex}${sign === 1 ? '+' : '-'}${imaginary}`;
}

export function normalizedBranchAngle(value: ComplexValue) {
  return Math.atan2(value.im, value.re);
}

export function orderComplexBranches(branches: ComplexEquationBranch[]) {
  if (!branches.every((branch) => branch.approxValue)) {
    const unique = sortEquationBranchLatex([...new Set(branches.map((branch) => branch.exactLatex))]);
    return unique
      .map((exactLatex) => branches.find((branch) => branch.exactLatex === exactLatex))
      .filter((branch): branch is ComplexEquationBranch => Boolean(branch));
  }

  return [...branches].sort((left, right) => {
    const leftApprox = left.approxValue as ComplexValue;
    const rightApprox = right.approxValue as ComplexValue;
    const leftReal = Math.abs(leftApprox.im) < 1e-10;
    const rightReal = Math.abs(rightApprox.im) < 1e-10;
    if (leftReal !== rightReal) {
      return leftReal ? -1 : 1;
    }
    if (leftReal && rightReal) {
      return leftApprox.re - rightApprox.re;
    }
    const angleDifference = normalizedBranchAngle(leftApprox) - normalizedBranchAngle(rightApprox);
    return Math.abs(angleDifference) > 1e-12
      ? angleDifference
      : left.exactLatex.localeCompare(right.exactLatex);
  });
}

export function exactLatexForBranches(target: string, branches: string[], options: { preserveOrder?: boolean } = {}) {
  const unique = options.preserveOrder ? [...new Set(branches)] : sortEquationBranchLatex([...new Set(branches)]);
  return `${target}\\in\\left\\{${unique.join(',\\ ')}\\right\\}`;
}

export function branchFromRealScalar(value: ExactScalar): ComplexEquationBranch {
  const normalized = normalizeExactScalar(value);
  return profileEquationResult({
    exactLatex: exactScalarToLatex(normalized),
    approxValue: complex(exactScalarToNumber(normalized), 0),
    exactComplex: { re: normalized, im: ZERO_SCALAR },
  });
}

export function branchFromExactComplex(value: ExactComplexScalar): ComplexEquationBranch {
  const normalized = normalizeExactComplexScalar(value);
  return profileEquationResult({
    exactLatex: exactComplexToLatex(normalized),
    approxValue: complex(exactScalarToNumber(normalized.re), exactScalarToNumber(normalized.im)),
    exactComplex: normalized,
  });
}

export function buildBranchReadback(
  target: string,
  branches: ComplexEquationBranch[],
  outputStyle: OutputStyle = 'exact',
  complexExactForm: ComplexExactForm = 'rectangular',
  options: { preserveOrder?: boolean } = {},
) {
  const uniqueBranches = [...new Map(
    branches.map((branch) => [branch.exactLatex, branch] as const),
  ).values()];
  const unique = options.preserveOrder ? uniqueBranches : orderComplexBranches(uniqueBranches);
  const canApproximate = unique.every((branch) => branch.approxValue);
  const approximateBranches = canApproximate
    ? unique.map((branch) => complexToLatex(branch.approxValue as ComplexValue))
    : [];
  const approximateText = canApproximate
    ? `${target} ~= ${unique.map((branch) => complexToApproxText(branch.approxValue as ComplexValue)).join(', ')}`
    : undefined;

  if (outputStyle === 'decimal' && canApproximate) {
    const decimalRendered = renderFiniteRootSet(
      createFiniteRootSet({
        targetLatex: target,
        branches: approximateBranches,
        source: 'equation-complex-decimal',
      }),
      { preserveOrder: true, relationLatex: '\\in' },
    );
    return profileEquationResult({
      exactLatex: decimalRendered.exactLatex ?? `${target}\\in\\left\\{${approximateBranches.join(',\\ ')}\\right\\}`,
      branchReadback: decimalRendered.branchReadback,
      approxText: undefined,
    });
  }

  const exactBranchExpressions: EquationFiniteBranchExpression[] = unique.map((branch) => {
    if (!branch.exactComplex) {
      return {
        latex: branch.exactLatex,
        ...(branch.node === undefined ? {} : { node: branch.node }),
      };
    }

    return {
      latex: exactComplexToFormLatex(branch.exactComplex, complexExactForm) ?? branch.exactLatex,
    };
  });
  const renderedRoots = renderFiniteRootSet(
    createFiniteRootSet({
      targetLatex: target,
      branches: exactBranchExpressions,
      source: 'equation-complex',
    }),
    {
      preserveOrder: true,
      relationLatex: '\\in',
      context: { domainIntent: 'complex' },
      presentationContext: { complexExactForm },
    },
  );
  return profileEquationResult({
    exactLatex: renderedRoots.exactLatex ?? `${target}\\in\\left\\{${renderedRoots.branchesLatex.join(',\\ ')}\\right\\}`,
    branchReadback: renderedRoots.branchReadback,
    approxText: outputStyle === 'both' ? approximateText : undefined,
  });
}

export function branchFromLatex(
  latex: string,
  options: Partial<Pick<ComplexPreimageBranch, 'approxValue' | 'exactComplex' | 'parameterLatex' | 'periodicFamily'>> = {},
): ComplexPreimageBranch {
  return { latex, ...options };
}

export function branchFromComplexConstant(
  value: ExactComplexScalar,
  complexExactForm: ComplexExactForm = 'rectangular',
): ComplexPreimageBranch {
  const normalized = normalizeExactComplexScalar(value);
  return {
    latex: exactComplexToFormLatex(normalized, complexExactForm) ?? exactComplexToLatex(normalized),
    approxValue: exactComplexApproxValue(normalized),
    exactComplex: normalized,
  };
}

export function branchLatexForNode(
  node: unknown,
  complexExactForm: ComplexExactForm = 'rectangular',
): ComplexPreimageBranch | null {
  const exactComplexValue = parseExactComplexConstantNode(node);
  if (exactComplexValue) {
    return branchFromComplexConstant(exactComplexValue, complexExactForm);
  }
  return branchFromLatex(latexForNode(node));
}
