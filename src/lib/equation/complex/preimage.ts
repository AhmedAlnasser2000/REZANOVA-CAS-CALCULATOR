import type { AngleUnit, ComplexExactForm, DisplayDetailSection, OutputStyle } from '../../../types/calculator';
import {
  exactScalarToNumber,
  normalizeExactScalar,
  readExactScalarNode,
} from '../../algebra/polynomial-core';
import { mathDetailSection } from '../../display/result-detail-lines';
import type { EquationAlgebraicIsolationSuccess } from '../equation-algebraic-isolation';
import { branchFromComplexConstant, branchFromLatex, branchLatexForNode } from './branches';
import {
  exactComplexToFormLatex,
  exactComplexToLatex,
  exactScalarToLatex,
  exactScalarIsNegativeOne,
  exactScalarIsOne,
  exactScalarIsZero,
  expOfExactComplex,
  isExactComplexZero,
  normalizeExactComplexScalar,
  parseExactComplexConstantNode,
} from './exact';
import {
  solveAffineInnerAgainstBranch,
  solveQuadraticOverLinearAgainstBranchLatex,
  solveQuadraticOverLinearAgainstExactBranch,
  solveRationalClearedInnerAgainstBranch,
  solveRationalLinearInnerAgainstBranch,
} from './linear-rational';
import { addLatex, groupedLatex, negateLatex, subtractLatex } from './latex';
import { containsTarget, isArrayNode, latexForNode, parseTopLevelEquationSides } from './math-json';
import { parameterNamesFromLatex } from './polynomial';
import { type ComplexEquationOptions, type ComplexPreimageBranch, type ComplexPreimageSolveResult } from './types';
import {
  createPeriodicFamily,
  piRationalFromDegrees,
  renderPeriodicFamilyExpression,
} from '../solution/periodic-family';

type ComplexPreimageRuntimeOptions = Required<Pick<ComplexEquationOptions, 'outputStyle' | 'complexExactForm' | 'angleUnit'>>
  & Pick<ComplexEquationOptions, 'maxPowerDegree'>;

export function exponentialBranchForLog(
  rhs: unknown,
  base: unknown | undefined,
  complexExactForm: ComplexExactForm,
) {
  const rhsLatex = branchLatexForNode(rhs, complexExactForm);
  if (!rhsLatex) {
    return null;
  }
  if (base !== undefined) {
    const baseLatex = latexForNode(base);
    return branchFromLatex(`${groupedLatex(baseLatex)}^{${rhsLatex.latex}}`);
  }

  if (rhsLatex.exactComplex && isExactComplexZero(rhsLatex.exactComplex)) {
    return branchFromComplexConstant({ re: { numerator: 1, denominator: 1 }, im: { numerator: 0, denominator: 1 } }, complexExactForm);
  }

  return branchFromLatex(`e^{${rhsLatex.latex}}`, {
    approxValue: rhsLatex.exactComplex ? expOfExactComplex(rhsLatex.exactComplex) : undefined,
  });
}

export function exponentialBranchFromBranch(branch: ComplexPreimageBranch, base: unknown | undefined) {
  if (base !== undefined) {
    return branchFromLatex(`${groupedLatex(latexForNode(base))}^{${branch.latex}}`);
  }
  return branchFromLatex(`e^{${branch.latex}}`);
}

export function expEquationBranch(rhs: unknown, complexExactForm: ComplexExactForm): ComplexPreimageBranch | null {
  const exactComplexValue = parseExactComplexConstantNode(rhs);
  if (exactComplexValue) {
    const normalized = normalizeExactComplexScalar(exactComplexValue);
    if (isExactComplexZero(normalized)) {
      return null;
    }
    if (exactScalarIsOne(normalized.re) && exactScalarIsZero(normalized.im)) {
      return branchFromLatex('2\\pi i k', { parameterLatex: 'k\\in\\mathbb{Z}' });
    }
    if (exactScalarIsNegativeOne(normalized.re) && exactScalarIsZero(normalized.im)) {
      return branchFromLatex('i\\left(\\pi+2\\pi k\\right)', { parameterLatex: 'k\\in\\mathbb{Z}' });
    }
    if (exactScalarIsZero(normalized.re) && exactScalarIsOne(normalized.im)) {
      return branchFromLatex('i\\left(\\frac{\\pi}{2}+2\\pi k\\right)', { parameterLatex: 'k\\in\\mathbb{Z}' });
    }
    if (exactScalarIsZero(normalized.re) && exactScalarIsNegativeOne(normalized.im)) {
      return branchFromLatex('i\\left(-\\frac{\\pi}{2}+2\\pi k\\right)', { parameterLatex: 'k\\in\\mathbb{Z}' });
    }
    return branchFromLatex(
      `\\operatorname{Log}\\left(${exactComplexToFormLatex(normalized, complexExactForm) ?? exactComplexToLatex(normalized)}\\right)+2\\pi i k`,
      { parameterLatex: 'k\\in\\mathbb{Z}' },
    );
  }

  const rhsLatex = latexForNode(rhs);
  return branchFromLatex(`\\operatorname{Log}\\left(${rhsLatex}\\right)+2\\pi i k`, {
    parameterLatex: 'k\\in\\mathbb{Z}',
  });
}

function positiveNumericBaseProfile(node: unknown) {
  const scalar = readExactScalarNode(node);
  if (!scalar) {
    return null;
  }
  const normalized = normalizeExactScalar(scalar);
  const value = exactScalarToNumber(normalized);
  return Number.isFinite(value) && value > 0 && Math.abs(value - 1) > 1e-12
    ? {
      value,
      latex: exactScalarToLatex(normalized),
    }
    : null;
}

function rationalLogLatexForNumericBase(baseValue: number, rhsValue: number) {
  if (!Number.isFinite(baseValue) || !Number.isFinite(rhsValue) || rhsValue <= 0) {
    return null;
  }

  for (let denominator = 1; denominator <= 12; denominator += 1) {
    for (let numerator = -48; numerator <= 48; numerator += 1) {
      const candidate = Math.pow(baseValue, numerator / denominator);
      const tolerance = 1e-10 * Math.max(1, Math.abs(rhsValue));
      if (Math.abs(candidate - rhsValue) <= tolerance) {
        return exactScalarToLatex(normalizeExactScalar({ numerator, denominator }));
      }
    }
  }

  return null;
}

function numericBaseExpEquationBranch(
  baseNode: unknown,
  rhs: unknown,
  complexExactForm: ComplexExactForm,
): ComplexPreimageBranch | null {
  const base = positiveNumericBaseProfile(baseNode);
  if (!base) {
    return null;
  }

  const rhsExact = parseExactComplexConstantNode(rhs);
  const baseLogLatex = `\\ln(${base.latex})`;
  const parameterLatex = integerParameterLatex('k');
  if (rhsExact) {
    const normalized = normalizeExactComplexScalar(rhsExact);
    if (isExactComplexZero(normalized)) {
      return null;
    }

    if (exactScalarIsZero(normalized.im)) {
      const rhsValue = exactScalarToNumber(normalized.re);
      if (rhsValue > 0) {
        const rational = rationalLogLatexForNumericBase(base.value, rhsValue);
        const periodLatex = `\\frac{2\\pi i k}{${baseLogLatex}}`;
        if (rational) {
          return branchFromLatex(rational === '0' ? periodLatex : addLatex(rational, periodLatex), {
            parameterLatex,
          });
        }
        return branchFromLatex(
          `\\frac{\\ln(${exactScalarToLatex(normalized.re)})+2\\pi i k}{${baseLogLatex}}`,
          { parameterLatex },
        );
      }
    }

    const rhsLatex = exactComplexToFormLatex(normalized, complexExactForm) ?? exactComplexToLatex(normalized);
    return branchFromLatex(
      `\\frac{\\operatorname{Log}\\left(${rhsLatex}\\right)+2\\pi i k}{${baseLogLatex}}`,
      { parameterLatex },
    );
  }

  return branchFromLatex(
    `\\frac{\\operatorname{Log}\\left(${latexForNode(rhs)}\\right)+2\\pi i k}{${baseLogLatex}}`,
    { parameterLatex },
  );
}

export function rootFamilyLatex(target: string, degree: number, branch: ComplexPreimageBranch) {
  if (degree === 2) {
    return expandedRootFamilyLatex(target, degree, branch)
      ?? `${target}\\in\\sqrt{${branch.latex}}${branch.parameterLatex ? `,\\ ${branch.parameterLatex}` : ''}`;
  }
  return `${target}\\in\\sqrt[${degree}]{${branch.latex}}${branch.parameterLatex ? `,\\ ${branch.parameterLatex}` : ''}`;
}

export function expandedRootFamilyLatex(target: string, degree: number, branch: ComplexPreimageBranch) {
  const root = degree === 2 ? `\\sqrt{${branch.latex}}` : `\\sqrt[${degree}]{${branch.latex}}`;
  if (degree === 2) {
    return `${target}\\in\\left\\{-${root},\\ ${root}\\right\\}${branch.parameterLatex ? `,\\ ${branch.parameterLatex}` : ''}`;
  }
  if (degree === 3) {
    return `${target}\\in\\left\\{${root},\\ \\omega ${root},\\ \\omega^2 ${root}\\right\\}${branch.parameterLatex ? `,\\ ${branch.parameterLatex}` : ''}`;
  }
  if (degree === 4) {
    return `${target}\\in\\left\\{${root},\\ i${root},\\ -${root},\\ -i${root}\\right\\}${branch.parameterLatex ? `,\\ ${branch.parameterLatex}` : ''}`;
  }
  return undefined;
}

export function solvePowerInnerAgainstBranch(
  node: unknown,
  target: string,
  branch: ComplexPreimageBranch,
  maxPowerDegree?: number,
): ComplexPreimageSolveResult | null {
  if (
    !isArrayNode(node)
    || node[0] !== 'Power'
    || node.length !== 3
    || node[1] !== target
    || typeof node[2] !== 'number'
    || !Number.isInteger(node[2])
    || node[2] < 2
    || node[2] > 4
  ) {
    return null;
  }
  const degree = node[2];
  if (maxPowerDegree !== undefined && degree > maxPowerDegree) {
    return null;
  }
  const expanded = degree === 2 ? undefined : expandedRootFamilyLatex(target, degree, branch);
  return {
    answerLatex: rootFamilyLatex(target, degree, branch),
    exactSupplementLatex: [],
    proofLines: [`Returned a parameterized root family for ${target}^${degree}.`],
    expandedBranchLatex: expanded ? [expanded] : undefined,
  };
}

export function anglePeriodLatex(functionName: 'Sin' | 'Cos' | 'Tan', angleUnit: AngleUnit = 'rad') {
  if (angleUnit === 'deg') {
    return functionName === 'Tan' ? '180' : '360';
  }
  if (angleUnit === 'grad') {
    return functionName === 'Tan' ? '200' : '400';
  }
  return functionName === 'Tan' ? '\\pi' : '2\\pi';
}

export function angleHalfTurnLatex(angleUnit: AngleUnit = 'rad') {
  if (angleUnit === 'deg') {
    return '180';
  }
  if (angleUnit === 'grad') {
    return '200';
  }
  return '\\pi';
}

export function integerPeriodTerm(period: string, parameterName = 'k') {
  return period.includes('\\pi') ? `${period} ${parameterName}` : `${period}${parameterName}`;
}

export function integerParameterLatex(parameterName = 'k') {
  return `${parameterName}\\in\\mathbb{Z}`;
}

export function integerParameterNames(parameterLatex?: string) {
  if (!parameterLatex) {
    return [] as string[];
  }
  const match = parameterLatex.match(/^([a-z](?:,[a-z])*)\\in\\mathbb\{Z\}$/u);
  return match ? match[1].split(',') : [];
}

export function mergeIntegerParameterLatex(...parameterLatex: Array<string | undefined>) {
  const names = parameterLatex.flatMap(integerParameterNames);
  const unique = [...new Set(names)];
  return unique.length > 0 ? `${unique.join(',')}\\in\\mathbb{Z}` : undefined;
}

export function scaleKnownRadAngleLatex(radLatex: string, angleUnit: AngleUnit) {
  if (angleUnit === 'rad') {
    return radLatex;
  }
  const mapped: Record<string, { deg: string; grad: string }> = {
    '0': { deg: '0', grad: '0' },
    '\\pi': { deg: '180', grad: '200' },
    '-\\pi': { deg: '-180', grad: '-200' },
    '\\frac{\\pi}{2}': { deg: '90', grad: '100' },
    '-\\frac{\\pi}{2}': { deg: '-90', grad: '-100' },
    '\\frac{\\pi}{4}': { deg: '45', grad: '50' },
    '-\\frac{\\pi}{4}': { deg: '-45', grad: '-50' },
  };
  return angleUnit === 'deg'
    ? mapped[radLatex]?.deg
    : mapped[radLatex]?.grad;
}

export function exactInverseTrigConstantLatex(
  functionName: 'Sin' | 'Cos' | 'Tan',
  rhsLatex: string,
  angleUnit: AngleUnit,
) {
  const radLatex = (() => {
    if (functionName === 'Cos') {
      if (rhsLatex === '1') return '0';
      if (rhsLatex === '0') return '\\frac{\\pi}{2}';
      if (rhsLatex === '-1') return '\\pi';
    }
    if (functionName === 'Sin') {
      if (rhsLatex === '1') return '\\frac{\\pi}{2}';
      if (rhsLatex === '0') return '0';
      if (rhsLatex === '-1') return '-\\frac{\\pi}{2}';
    }
    if (functionName === 'Tan') {
      if (rhsLatex === '1') return '\\frac{\\pi}{4}';
      if (rhsLatex === '0') return '0';
      if (rhsLatex === '-1') return '-\\frac{\\pi}{4}';
    }
    return null;
  })();

  return radLatex ? scaleKnownRadAngleLatex(radLatex, angleUnit) : undefined;
}

export function scaledInverseTrigLatex(
  functionName: 'Sin' | 'Cos' | 'Tan',
  rhsLatex: string,
  angleUnit: AngleUnit = 'rad',
) {
  const exactConstant = exactInverseTrigConstantLatex(functionName, rhsLatex, angleUnit);
  if (exactConstant) {
    return exactConstant;
  }
  const inverse = `\\arc${functionName.toLowerCase()}\\left(${rhsLatex}\\right)`;
  if (angleUnit === 'deg') {
    return `\\frac{180}{\\pi}${inverse}`;
  }
  if (angleUnit === 'grad') {
    return `\\frac{200}{\\pi}${inverse}`;
  }
  return inverse;
}

export function trigPreimageBranches(
  functionName: 'Sin' | 'Cos' | 'Tan',
  rhs: unknown,
  angleUnit: AngleUnit,
  complexExactForm: ComplexExactForm,
  parameterName = 'k',
  carriedParameterLatex?: string,
): ComplexPreimageBranch[] | null {
  const rhsBranch = branchLatexForNode(rhs, complexExactForm);
  if (!rhsBranch) {
    return null;
  }

  const rhsLatex = rhsBranch.exactComplex
    ? exactComplexToFormLatex(rhsBranch.exactComplex, complexExactForm) ?? exactComplexToLatex(rhsBranch.exactComplex)
    : rhsBranch.latex;
  return trigPreimageBranchesFromLatex(functionName, rhsLatex, angleUnit, parameterName, carriedParameterLatex);
}

export function trigPreimageBranchesFromLatex(
  functionName: 'Sin' | 'Cos' | 'Tan',
  rhsLatex: string,
  angleUnit: AngleUnit,
  parameterName = 'k',
  carriedParameterLatex?: string,
): ComplexPreimageBranch[] {
  const periodicBranches = exactPeriodicTrigPreimageBranches(
    functionName,
    rhsLatex,
    angleUnit,
    parameterName,
    carriedParameterLatex,
  );
  if (periodicBranches) {
    return periodicBranches;
  }

  const inverse = scaledInverseTrigLatex(functionName, rhsLatex, angleUnit);
  const period = anglePeriodLatex(functionName, angleUnit);
  const parameterLatex = mergeIntegerParameterLatex(carriedParameterLatex, integerParameterLatex(parameterName));

  if (functionName === 'Tan') {
    return [branchFromLatex(addLatex(inverse, integerPeriodTerm(period, parameterName)), { parameterLatex })];
  }

  if (functionName === 'Cos') {
    return [
      branchFromLatex(addLatex(inverse, integerPeriodTerm(period, parameterName)), { parameterLatex }),
      branchFromLatex(addLatex(negateLatex(inverse), integerPeriodTerm(period, parameterName)), { parameterLatex }),
    ];
  }

  const halfTurn = angleHalfTurnLatex(angleUnit);
  return [
    branchFromLatex(addLatex(inverse, integerPeriodTerm(period, parameterName)), { parameterLatex }),
    branchFromLatex(addLatex(subtractLatex(halfTurn, inverse), integerPeriodTerm(period, parameterName)), { parameterLatex }),
  ];
}

function exactPeriodicTrigPreimageBranches(
  functionName: 'Sin' | 'Cos' | 'Tan',
  rhsLatex: string,
  angleUnit: AngleUnit,
  parameterName: string,
  carriedParameterLatex?: string,
) {
  if (angleUnit !== 'rad' || carriedParameterLatex) {
    return null;
  }

  const branches = exactPeriodicDegrees(functionName, rhsLatex);
  if (!branches) {
    return null;
  }

  return branches.map(({ offsetDegrees, periodDegrees }) => {
    const family = createPeriodicFamily({
      targetLatex: '',
      offset: piRationalFromDegrees(offsetDegrees),
      period: piRationalFromDegrees(periodDegrees),
      parameter: parameterName,
      domain: 'complex',
    });
    return branchFromLatex(renderPeriodicFamilyExpression(family), {
      parameterLatex: integerParameterLatex(parameterName),
      periodicFamily: family,
    });
  });
}

function exactPeriodicDegrees(functionName: 'Sin' | 'Cos' | 'Tan', rhsLatex: string) {
  if (functionName === 'Sin') {
    if (rhsLatex === '0') return [{ offsetDegrees: 0, periodDegrees: 180 }];
    if (rhsLatex === '1') return [{ offsetDegrees: 90, periodDegrees: 360 }];
    if (rhsLatex === '-1') return [{ offsetDegrees: -90, periodDegrees: 360 }];
    return null;
  }

  if (functionName === 'Cos') {
    if (rhsLatex === '0') return [{ offsetDegrees: 90, periodDegrees: 180 }];
    if (rhsLatex === '1') return [{ offsetDegrees: 0, periodDegrees: 360 }];
    if (rhsLatex === '-1') return [{ offsetDegrees: 180, periodDegrees: 360 }];
    return null;
  }

  if (rhsLatex === '0') return [{ offsetDegrees: 0, periodDegrees: 180 }];
  if (rhsLatex === '1') return [{ offsetDegrees: 45, periodDegrees: 180 }];
  if (rhsLatex === '-1') return [{ offsetDegrees: -45, periodDegrees: 180 }];
  return null;
}

export function splitParameterSuffix(answerLatex: string) {
  const match = answerLatex.match(/^(.*),\\ ([a-z](?:,[a-z])*\\in\\mathbb\{Z\})$/u);
  return match ? { base: match[1], parameterLatex: match[2] } : { base: answerLatex, parameterLatex: undefined };
}

export function extractAnswerFamily(target: string, answerLatex: string) {
  const { base, parameterLatex } = splitParameterSuffix(answerLatex);
  if (base.startsWith(`${target}=`)) {
    return { familyLatex: base.slice(`${target}=`.length), parameterLatex };
  }
  const setPrefix = `${target}\\in\\left\\{`;
  if (base.startsWith(setPrefix) && base.endsWith('\\right\\}')) {
    return {
      familyLatex: base.slice(setPrefix.length, -'\\right\\}'.length),
      parameterLatex,
    };
  }
  const rootsPrefix = `${target}\\in`;
  if (base.startsWith(rootsPrefix)) {
    return {
      familyLatex: base.slice(rootsPrefix.length),
      parameterLatex,
    };
  }
  return { familyLatex: base, parameterLatex };
}

export function mergePreimageResults(target: string, results: ComplexPreimageSolveResult[]): ComplexPreimageSolveResult | null {
  if (results.length === 0) {
    return null;
  }
  if (results.length === 1) {
    return results[0];
  }

  const extracted = results.map((result) => extractAnswerFamily(target, result.answerLatex));
  const families = extracted.map((result) => result.familyLatex);
  const parameterLatex = mergeIntegerParameterLatex(...extracted.map((result) => result.parameterLatex));
  return {
    answerLatex: `${target}\\in\\left\\{${families.join(',\\ ')}\\right\\}${parameterLatex ? `,\\ ${parameterLatex}` : ''}`,
    exactSupplementLatex: [...new Set(results.flatMap((result) => result.exactSupplementLatex))],
    proofLines: results.flatMap((result) => result.proofLines),
    expandedBranchLatex: results.flatMap((result) => result.expandedBranchLatex ?? []),
  };
}

export function solveTrigArgumentAgainstBranch(
  node: unknown,
  target: string,
  branch: ComplexPreimageBranch,
  options: ComplexPreimageRuntimeOptions,
) {
  const affine = solveAffineInnerAgainstBranch(node, target, branch, options.complexExactForm);
  if (affine) {
    return affine;
  }
  return solvePowerInnerAgainstBranch(node, target, branch, options.maxPowerDegree);
}

export function solveNestedTrigInnerAgainstBranch(
  functionName: 'Sin' | 'Cos' | 'Tan',
  inner: unknown,
  target: string,
  branch: ComplexPreimageBranch,
  options: ComplexPreimageRuntimeOptions,
): ComplexPreimageSolveResult | null {
  const branches = trigPreimageBranchesFromLatex(
    functionName,
    branch.latex,
    options.angleUnit,
    'n',
    branch.parameterLatex,
  );
  const solvedBranches = branches
    .map((innerBranch) => solveTrigArgumentAgainstBranch(inner, target, innerBranch, options))
    .filter((result): result is ComplexPreimageSolveResult => Boolean(result));
  if (solvedBranches.length !== branches.length) {
    return null;
  }
  const merged = mergePreimageResults(target, solvedBranches);
  return merged
    ? {
      ...merged,
      proofLines: [
        `Solved a second ${functionName.toLowerCase()} preimage layer with independent integer branch families.`,
        ...merged.proofLines,
      ],
    }
    : null;
}

export function solveInnerAgainstBranch(
  node: unknown,
  target: string,
  branch: ComplexPreimageBranch,
  options: ComplexPreimageRuntimeOptions,
  depth: number,
  trigDepth = 0,
): ComplexPreimageSolveResult | null {
  if (depth > 4) {
    return null;
  }
  if (node === target) {
    return {
      answerLatex: branch.parameterLatex
        ? `${target}=${branch.latex},\\ ${branch.parameterLatex}`
        : `${target}\\in\\left\\{${branch.latex}\\right\\}`,
      exactSupplementLatex: [],
      proofLines: ['Reduced the preimage to the selected target.'],
    };
  }

  const affine = solveAffineInnerAgainstBranch(node, target, branch, options.complexExactForm);
  if (affine) {
    return affine;
  }

  const rationalLinear = solveRationalLinearInnerAgainstBranch(node, target, branch);
  if (rationalLinear) {
    return rationalLinear;
  }

  const rationalCleared = solveRationalClearedInnerAgainstBranch(
    node,
    target,
    branch,
    options.outputStyle,
    options.complexExactForm,
  );
  if (rationalCleared) {
    return rationalCleared;
  }

  const rationalQuadraticLatex = solveQuadraticOverLinearAgainstBranchLatex(node, target, branch);
  if (rationalQuadraticLatex) {
    return rationalQuadraticLatex;
  }

  const rationalQuadratic = solveQuadraticOverLinearAgainstExactBranch(node, target, branch);
  if (rationalQuadratic) {
    return rationalQuadratic;
  }

  const power = solvePowerInnerAgainstBranch(node, target, branch, options.maxPowerDegree);
  if (power) {
    return power;
  }

  if (!isArrayNode(node) || node.length === 0) {
    return null;
  }

  if ((node[0] === 'Sin' || node[0] === 'Cos' || node[0] === 'Tan') && node.length === 2) {
    return trigDepth < 2
      ? solveNestedTrigInnerAgainstBranch(node[0], node[1], target, branch, options)
      : null;
  }

  if (node[0] === 'Ln' && node.length === 2) {
    const nextBranch = exponentialBranchFromBranch(branch, undefined);
    const solved = solveInnerAgainstBranch(node[1], target, nextBranch, options, depth + 1, trigDepth);
    return solved
      ? {
        ...solved,
        exactSupplementLatex: [...solved.exactSupplementLatex, `${latexForNode(node[1])}\\ne0`],
        proofLines: ['Inverted a principal complex logarithm preimage.', ...solved.proofLines],
      }
      : null;
  }

  if (node[0] === 'Log' && node.length >= 2) {
    const base = node.length >= 3 ? node[2] : undefined;
    const nextBranch = exponentialBranchFromBranch(branch, base);
    const solved = solveInnerAgainstBranch(node[1], target, nextBranch, options, depth + 1, trigDepth);
    return solved
      ? {
        ...solved,
        exactSupplementLatex: [...solved.exactSupplementLatex, `${latexForNode(node[1])}\\ne0`],
        proofLines: ['Inverted a principal complex logarithm preimage.', ...solved.proofLines],
      }
      : null;
  }

  if (node[0] === 'Power' && node.length === 3 && node[1] === 'ExponentialE') {
    const nextBranch = expEquationBranch(branch.latex, options.complexExactForm);
    if (!nextBranch) {
      return null;
    }
    const solved = solveInnerAgainstBranch(node[2], target, nextBranch, options, depth + 1, trigDepth);
    return solved
      ? {
        ...solved,
        proofLines: ['Inverted a complex exponential preimage and preserved its integer branch family.', ...solved.proofLines],
      }
      : null;
  }

  return null;
}

export function solveComplexTrigPreimage(
  functionName: 'Sin' | 'Cos' | 'Tan',
  inner: unknown,
  rhs: unknown,
  target: string,
  options: ComplexPreimageRuntimeOptions,
): ComplexPreimageSolveResult | null {
  const branches = trigPreimageBranches(functionName, rhs, options.angleUnit, options.complexExactForm);
  if (!branches) {
    return null;
  }
  const solvedBranches = branches
    .map((branch) => solveInnerAgainstBranch(inner, target, branch, options, 1, 1))
    .filter((result): result is ComplexPreimageSolveResult => Boolean(result));
  if (solvedBranches.length !== branches.length) {
    return null;
  }
  const merged = mergePreimageResults(target, solvedBranches);
  return merged
    ? {
      ...merged,
      proofLines: [
        `Reduced a complex ${functionName.toLowerCase()} preimage to inverse-trig branch families in ${options.angleUnit.toUpperCase()} mode.`,
        ...merged.proofLines,
      ],
    }
    : null;
}

export function solveComplexPreimageEquation(
  equationLatex: string,
  target: string,
  outputStyle: OutputStyle = 'exact',
  complexExactForm: ComplexExactForm = 'rectangular',
  angleUnit: AngleUnit = 'rad',
  maxPowerDegree?: number,
): EquationAlgebraicIsolationSuccess | null {
  const parameterNames = parameterNamesFromLatex(equationLatex, target);
  if (parameterNames.length > 0) {
    return null;
  }

  const sides = parseTopLevelEquationSides(equationLatex, target);
  if (!sides || !isArrayNode(sides.expression) || sides.expression.length === 0) {
    return null;
  }

  const options = { outputStyle, complexExactForm, angleUnit, maxPowerDegree };
  let solved: ComplexPreimageSolveResult | null = null;
  const head = sides.expression[0];
  if (head === 'Abs' && containsTarget(sides.expression, target)) {
    return null;
  }
  if (head === 'Ln' && sides.expression.length === 2) {
    const branch = exponentialBranchForLog(sides.otherSide, undefined, complexExactForm);
    solved = branch ? solveInnerAgainstBranch(sides.expression[1], target, branch, options, 1) : null;
    if (solved) {
      solved = {
        ...solved,
        exactSupplementLatex: [...solved.exactSupplementLatex, `${latexForNode(sides.expression[1])}\\ne0`],
        proofLines: ['Inverted a principal complex logarithm equation.', ...solved.proofLines],
      };
    }
  } else if (head === 'Log' && sides.expression.length >= 2) {
    const branch = exponentialBranchForLog(sides.otherSide, sides.expression.length >= 3 ? sides.expression[2] : undefined, complexExactForm);
    solved = branch ? solveInnerAgainstBranch(sides.expression[1], target, branch, options, 1) : null;
    if (solved) {
      solved = {
        ...solved,
        exactSupplementLatex: [...solved.exactSupplementLatex, `${latexForNode(sides.expression[1])}\\ne0`],
        proofLines: ['Inverted a principal complex logarithm equation.', ...solved.proofLines],
      };
    }
  } else if (head === 'Power' && sides.expression.length === 3 && sides.expression[1] === 'ExponentialE') {
    const branch = expEquationBranch(sides.otherSide, complexExactForm);
    solved = branch ? solveInnerAgainstBranch(sides.expression[2], target, branch, options, 1) : null;
    if (solved) {
      solved = {
        ...solved,
        proofLines: ['Inverted a complex exponential equation and kept the integer branch family explicit.', ...solved.proofLines],
      };
    }
  } else if (head === 'Power' && sides.expression.length === 3) {
    const branch = numericBaseExpEquationBranch(sides.expression[1], sides.otherSide, complexExactForm);
    solved = branch ? solveInnerAgainstBranch(sides.expression[2], target, branch, options, 1) : null;
    if (solved) {
      solved = {
        ...solved,
        proofLines: ['Inverted a positive numeric-base complex exponential equation and kept the integer branch family explicit.', ...solved.proofLines],
      };
    }
  } else if ((head === 'Sin' || head === 'Cos' || head === 'Tan') && sides.expression.length === 2) {
    solved = solveComplexTrigPreimage(head, sides.expression[1], sides.otherSide, target, options);
  } else if (head === 'Divide') {
    const branch = branchLatexForNode(sides.otherSide, complexExactForm);
    solved = branch && !(branch.exactComplex && isExactComplexZero(branch.exactComplex))
      ? solveRationalClearedInnerAgainstBranch(
        sides.expression,
        target,
        branch,
        outputStyle,
        complexExactForm,
      )
        ?? solveQuadraticOverLinearAgainstBranchLatex(sides.expression, target, branch)
        ?? (branch.exactComplex && !isExactComplexZero(branch.exactComplex)
          ? solveQuadraticOverLinearAgainstExactBranch(sides.expression, target, branch)
          : null)
      : null;
  }

  if (!solved) {
    return null;
  }

  const detailSections: DisplayDetailSection[] = [
    {
      title: 'Complex Preimage Route',
      lines: [
        'Domain intent: Complex.',
        'Reduced supported outer complex functions to exact inner equations before algebraic solving.',
        ...solved.proofLines,
      ],
    },
    ...(solved.expandedBranchLatex && solved.expandedBranchLatex.length > 0
      ? [mathDetailSection('Expanded Branches', solved.expandedBranchLatex)]
      : []),
    {
      title: 'Solve Target',
      lines: [
        `Selected target: ${target}`,
        'No symbolic parameters were preserved.',
      ],
    },
  ];

  return {
    kind: 'success',
    target,
    parameterNames,
    generatedEquationLatex: equationLatex,
    exactLatex: solved.answerLatex,
    branchReadback: solved.branchReadback,
    approxText: solved.approxText,
    exactSupplementLatex: [...new Set(solved.exactSupplementLatex)],
    detailSections,
    answerDomain: 'complex',
  };
}
