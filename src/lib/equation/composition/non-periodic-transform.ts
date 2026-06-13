import { ComputeEngine } from '@cortex-js/compute-engine';
import { formatRangeInterval, proveRealRange } from '../range-impossibility';
import { matchAbsoluteValueTarget as matchSharedAbsoluteValueTarget } from '../../algebra/abs-core';
import { buildSharedCompositionBranchSet } from './core';
import { createPeriodicFamily } from './periodic-family';
import { buildTrigPeriodicTemplate } from '../../trigonometry/equations';
import { dependsOnVariable, isNodeArray } from '../../symbolic-engine/patterns';
import { normalizeAst } from '../../symbolic-engine/normalize';
import { matchAffineVariableArgument } from '../../trigonometry/normalize';
import { matchSupportedRadical, matchSupportedRationalPower } from '../../algebra/radical-core';
import { parseExactPolynomial } from '../../algebra/polynomial-core';
import type {
  AngleUnit,
  DisplayDetailSection,
  PeriodicFamilyInfo,
  PeriodicPiecewiseBranch,
  SolveBadge,
  SolveDomainConstraint,
} from '../../../types/calculator';
import {
  branchDependsOnParameter,
  buildEquationLatex,
  buildInverseTrigValueTarget,
  buildScalarNode,
  evaluateFamilyBranchAt,
  parseNumericTarget,
  readExactScalar,
  type NumericTarget,
} from './targets';
import {
  buildInverseTrigPrincipalRangeLatex,
  buildInverseTrigPrincipalRangeMessage,
  intervalWithinPrincipalRange,
  inverseTrigPrincipalRange,
  isWithinPrincipalRange,
  type PeriodicFamilySolveResult,
} from './periodic-family';
import {
  numericAffineCarrier,
  type SymbolicFamilyBranch,
} from './carriers';

const ce = new ComputeEngine();
const EPSILON = 1e-9;

type ReducedSingleFamilyCarrierKind =
  | 'absolute-value'
  | 'radical'
  | 'rational-power'
  | 'logarithmic'
  | 'exponential';

type NonPeriodicTransform = {
  equations: string[];
  domainConstraints?: SolveDomainConstraint[];
  solveBadges: SolveBadge[];
  solveSummaryText: string;
  unresolvedError: string;
  exactSupplementLatex?: string[];
  detailSections?: DisplayDetailSection[];
  periodicFamilyExtras?: Partial<PeriodicFamilyInfo>;
};

function boxLatex(node: unknown) {
  return ce.box(node as Parameters<typeof ce.box>[0]).latex;
}

function buildCompositionBranchSet(
  equations: string[],
  constraints?: SolveDomainConstraint[],
) {
  return buildSharedCompositionBranchSet(equations, constraints);
}

function exactPolynomialDegree(polynomial: ReturnType<typeof parseExactPolynomial>) {
  if (!polynomial || polynomial.terms.size === 0) {
    return 0;
  }

  return Math.max(...polynomial.terms.keys());
}

function matchReducedPolynomialPeriodicCarrier(node: unknown) {
  const polynomial = parseExactPolynomial(normalizeAst(node), 'x', 4);
  if (!polynomial) {
    return null;
  }

  const degree = exactPolynomialDegree(polynomial);
  if (degree <= 2 || degree > 4) {
    return null;
  }

  return {
    degree,
    polynomial,
  };
}

function isVariableFreeCarrierNode(node: unknown) {
  return !dependsOnVariable(normalizeAst(node), 'x');
}

function matchDirectLogarithmicReducedCarrier(node: unknown) {
  const normalized = normalizeAst(node);
  if (isNodeArray(normalized) && normalized[0] === 'Ln' && normalized.length === 2) {
    return dependsOnVariable(normalized[1], 'x') && isDirectAffineInner(normalized[1]);
  }

  if (isNodeArray(normalized) && normalized[0] === 'Log' && normalized.length === 3) {
    const base = parseNumericTarget(normalized[2]);
    return Boolean(
      base
      && base.value > 0
      && Math.abs(base.value - 1) > EPSILON
      && dependsOnVariable(normalized[1], 'x')
      && isDirectAffineInner(normalized[1]),
    );
  }

  return false;
}

function matchDirectExponentialReducedCarrier(node: unknown) {
  const normalized = normalizeAst(node);
  if (isNodeArray(normalized) && normalized[0] === 'Exp' && normalized.length === 2) {
    return dependsOnVariable(normalized[1], 'x') && isDirectAffineInner(normalized[1]);
  }

  if (isNodeArray(normalized) && normalized[0] === 'Power' && normalized.length === 3) {
    const base = parseNumericTarget(normalized[1]);
    return Boolean(
      base
      && base.value > 0
      && Math.abs(base.value - 1) > EPSILON
      && dependsOnVariable(normalized[2], 'x')
      && isDirectAffineInner(normalized[2]),
    );
  }

  return false;
}

function matchDirectReducedSingleFamilyCarrier(node: unknown): ReducedSingleFamilyCarrierKind | null {
  const normalized = normalizeAst(node);
  if (matchSharedAbsoluteValueTarget(normalized, 'x')) {
    return 'absolute-value';
  }

  if (matchSupportedRadical(normalized, 'x')) {
    return 'radical';
  }

  if (matchSupportedRationalPower(normalized, 'x')) {
    return 'rational-power';
  }

  if (matchDirectLogarithmicReducedCarrier(normalized)) {
    return 'logarithmic';
  }

  if (matchDirectExponentialReducedCarrier(normalized)) {
    return 'exponential';
  }

  return null;
}

function matchReducedSingleFamilyPeriodicCarrier(node: unknown): ReducedSingleFamilyCarrierKind | null {
  const normalized = normalizeAst(node);
  if (!dependsOnVariable(normalized, 'x')) {
    return null;
  }

  const direct = matchDirectReducedSingleFamilyCarrier(normalized);
  if (direct) {
    return direct;
  }

  if (!isNodeArray(normalized) || normalized.length === 0) {
    return null;
  }

  if (normalized[0] === 'Negate' && normalized.length === 2) {
    return matchReducedSingleFamilyPeriodicCarrier(normalized[1]);
  }

  if ((normalized[0] === 'Add' || normalized[0] === 'Subtract') && normalized.length === 3) {
    if (isVariableFreeCarrierNode(normalized[1])) {
      return matchReducedSingleFamilyPeriodicCarrier(normalized[2]);
    }

    if (isVariableFreeCarrierNode(normalized[2])) {
      return matchReducedSingleFamilyPeriodicCarrier(normalized[1]);
    }

    return null;
  }

  if (normalized[0] === 'Multiply' && normalized.length >= 3) {
    let matchedCarrier: ReducedSingleFamilyCarrierKind | null = null;
    for (const child of normalized.slice(1)) {
      const childCarrier = matchReducedSingleFamilyPeriodicCarrier(child);
      if (childCarrier) {
        if (matchedCarrier) {
          return null;
        }
        matchedCarrier = childCarrier;
        continue;
      }

      if (!isVariableFreeCarrierNode(child)) {
        return null;
      }
    }

    return matchedCarrier;
  }

  if (normalized[0] === 'Divide' && normalized.length === 3) {
    if (!isVariableFreeCarrierNode(normalized[2])) {
      return null;
    }

    return matchReducedSingleFamilyPeriodicCarrier(normalized[1]);
  }

  return null;
}

function isMixedReducedCarrier(node: unknown) {
  const normalized = normalizeAst(node);
  if (!isNodeArray(normalized) || normalized.length < 3 || typeof normalized[0] !== 'string') {
    return false;
  }

  if (!['Add', 'Subtract', 'Multiply', 'Divide'].includes(normalized[0])) {
    return false;
  }

  const variableDependentOperands = normalized
    .slice(1)
    .filter((operand) => dependsOnVariable(normalizeAst(operand), 'x'));
  return variableDependentOperands.length > 1;
}

function classifyReducedCarrierGuidance(node: unknown) {
  const normalized = normalizeAst(node);
  const carrierLatex = boxLatex(normalized);
  const higherDegreePolynomial = parseExactPolynomial(normalized, 'x', 8);
  if (higherDegreePolynomial) {
    const degree = exactPolynomialDegree(higherDegreePolynomial);
    if (degree > 4) {
      return {
        error: `This recognized periodic family reduces to the polynomial carrier ${carrierLatex}, but the current exact reduced-carrier surface only closes bounded polynomial carriers through degree 4. Use Numeric Solve with one of the suggested intervals.`,
        summaryText: `Reduced-carrier boundary: ${carrierLatex} exceeds the current bounded reduced-polynomial degree-4 surface.`,
      };
    }
  }

  if (isMixedReducedCarrier(normalized)) {
    return {
      error: `This recognized periodic family reduces to the mixed carrier ${carrierLatex}, but exact reduced-carrier closure currently supports one admitted carrier family at a time. Use Numeric Solve with one of the suggested intervals.`,
      summaryText: `Reduced-carrier boundary: ${carrierLatex} mixes multiple variable-dependent carrier families, so this milestone stops before mixed reduced-carrier closure.`,
    };
  }

  return {
    error: `This recognized periodic family reduces to ${carrierLatex}, but the remaining continuation leaves the current bounded exact sink set. Use Numeric Solve with one of the suggested intervals.`,
    summaryText: `Continuation boundary: continuing from ${carrierLatex} would leave the current bounded exact sink set.`,
  };
}

function refineSingleFamilyContinuationGuidance(
  result: PeriodicFamilySolveResult,
  outerCarrierNode: unknown,
  familyLabel: string,
): PeriodicFamilySolveResult {
  if (result.kind !== 'guided' || result.family.structuredStopReason) {
    return result;
  }

  const outerLatex = boxLatex(normalizeAst(outerCarrierNode));
  const summaryPrefix = `Continuation boundary: ${outerLatex} is a recognized ${familyLabel} carrier, but finishing its downstream continuation would leave the current bounded exact sink set.`;
  return {
    ...result,
    error: `This recognized ${familyLabel} periodic family reduces through ${outerLatex}, but the remaining continuation leaves the current bounded exact sink set. Use Numeric Solve with one of the suggested intervals.`,
    summaryText: result.summaryText
      ? `${summaryPrefix} ${result.summaryText}`
      : summaryPrefix,
  };
}

function buildReducedCarrierExactFamily(
  carrierNode: unknown,
  branches: SymbolicFamilyBranch[],
) {
  const reducedCarrierLatex = boxLatex(normalizeAst(carrierNode));
  return createPeriodicFamily({
    carrierLatex: reducedCarrierLatex,
    branchesLatex: branches.map((branch) => branch.latex),
    reducedCarrierLatex,
  });
}

function buildTrigPeriodNode(kind: 'sin' | 'cos' | 'tan', angleUnit: AngleUnit): unknown {
  if (angleUnit === 'rad') {
    return kind === 'tan' ? 'Pi' : normalizeAst(['Multiply', 2, 'Pi']);
  }

  if (angleUnit === 'grad') {
    return kind === 'tan' ? 200 : 400;
  }

  return kind === 'tan' ? 180 : 360;
}

function rewriteInverseTrigResultForAngleUnit(node: unknown, angleUnit: AngleUnit) {
  if (angleUnit === 'deg') {
    return ['Divide', ['Multiply', node, 180], 'Pi'];
  }

  if (angleUnit === 'grad') {
    return ['Divide', ['Multiply', node, 200], 'Pi'];
  }

  return node;
}

function supportsSelectedTwoParameterTanClosure(
  branches: SymbolicFamilyBranch[],
  angleUnit: AngleUnit,
) {
  return branches.length > 0 && branches.every((branch) => {
    if (!branchDependsOnParameter(branch)) {
      return false;
    }

    if (/\\arc(?:sin|cos|tan)/.test(branch.latex)) {
      return true;
    }

    if (angleUnit === 'rad') {
      return /\\pi/.test(branch.latex);
    }

    return !/\d\.\d|\\,/.test(branch.latex);
  });
}

function buildAffineSolvedNode(
  affine: NonNullable<ReturnType<typeof numericAffineCarrier>>,
  targetNode: unknown,
) {
  const numerator = normalizeAst(['Subtract', targetNode, affine.offsetNode]);
  if (affine.coefficient === 1) {
    return numerator;
  }

  return normalizeAst(['Divide', numerator, affine.coefficient]);
}

function buildTwoParameterTanFamily(
  affine: NonNullable<ReturnType<typeof numericAffineCarrier>>,
  branches: SymbolicFamilyBranch[],
  angleUnit: AngleUnit,
) {
  const periodNode = buildTrigPeriodNode('tan', angleUnit);
  const solvedBranches = branches.flatMap((branch) => {
    const baseNode = rewriteInverseTrigResultForAngleUnit(['Arctan', branch.node], angleUnit);
    const periodicNode = normalizeAst(['Add', baseNode, ['Multiply', periodNode, 'm']]);
    return [boxLatex(buildAffineSolvedNode(affine, periodicNode))];
  });

  return createPeriodicFamily({
    carrierLatex: 'x',
    parameterLatex: 'k,m\\in\\mathbb{Z}',
    branchesLatex: solvedBranches,
  });
}

function transformExponentialFamilyBranches(
  branches: SymbolicFamilyBranch[],
  baseNode: unknown,
) {
  return branches.map((branch) => {
    const node = baseNode === 'ExponentialE'
      ? normalizeAst(['Ln', branch.node])
      : normalizeAst(['Log', branch.node, baseNode]);
    const symbolicBranch = {
      node,
      latex: boxLatex(node),
      representativeValue: Number.NaN,
    };
    return {
      ...symbolicBranch,
      representativeValue: evaluateFamilyBranchAt(symbolicBranch, 0) ?? Number.NaN,
    };
  });
}

function buildPoweredTarget(target: NumericTarget, numerator: number, denominator: number) {
  return ['Power', target.node, buildScalarNode(numerator, denominator)] as const;
}

function isBareVariable(node: unknown) {
  return normalizeAst(node) === 'x';
}

function isDirectAffineInner(node: unknown) {
  return isBareVariable(node) || Boolean(matchAffineVariableArgument(node));
}

function transformBlocked(error: string): NonPeriodicTransform {
  return {
    equations: buildCompositionBranchSet([]).equations,
    solveBadges: ['Outer Inversion'],
    solveSummaryText: '',
    unresolvedError: error,
  };
}

function matchNonPeriodicTransform(
  node: unknown,
  target: NumericTarget,
  angleUnit: AngleUnit,
): NonPeriodicTransform | null {
  const normalized = normalizeAst(node);
  if (!dependsOnVariable(normalized, 'x')) {
    return null;
  }

  const inverseTrigKind =
    isNodeArray(normalized) && normalized.length === 2 && typeof normalized[0] === 'string'
      ? normalized[0] === 'Arcsin'
        ? 'asin'
        : normalized[0] === 'Arccos'
          ? 'acos'
          : normalized[0] === 'Arctan'
            ? 'atan'
            : null
      : null;

  if (inverseTrigKind && isNodeArray(normalized)) {
    const directInner =
      isNodeArray(normalized[1])
      && normalized[1].length === 2
      && typeof normalized[1][0] === 'string'
      && (
        (inverseTrigKind === 'asin' && normalized[1][0] === 'Sin')
        || (inverseTrigKind === 'acos' && normalized[1][0] === 'Cos')
        || (inverseTrigKind === 'atan' && normalized[1][0] === 'Tan')
      )
        ? normalized[1]
        : null;
    const principalRange = inverseTrigPrincipalRange(inverseTrigKind, angleUnit);
    const principalRangeLatex = buildInverseTrigPrincipalRangeLatex(inverseTrigKind, angleUnit);
    const outerLatex = boxLatex(normalized);
    if (directInner) {
      const reducedCarrierLatex = boxLatex(directInner[1]);
      const directInnerRange = proveRealRange(directInner[1]);
      if (
        directInnerRange.kind === 'exact'
        && intervalWithinPrincipalRange(directInnerRange.interval, principalRange)
      ) {
        return {
          equations: buildCompositionBranchSet([buildEquationLatex(directInner[1], target.node)]).equations,
          solveBadges: ['Principal Range'],
          solveSummaryText: `Principal range: ${reducedCarrierLatex} stays in ${formatRangeInterval(directInnerRange.interval)}, so ${outerLatex} reduces to ${reducedCarrierLatex}=${target.latex}.`,
          unresolvedError: 'This recognized inverse/direct trig identity is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.',
          exactSupplementLatex: [
            `\\text{Principal range: } ${principalRangeLatex}`,
            `\\text{Canonical reduction: } ${outerLatex}=${reducedCarrierLatex}`,
          ],
          detailSections: [
            {
              title: 'Piecewise Exact',
              lines: [
                `${outerLatex} = ${reducedCarrierLatex} when ${reducedCarrierLatex} stays in ${buildInverseTrigPrincipalRangeMessage(inverseTrigKind, angleUnit)}.`,
              ],
            },
          ],
          periodicFamilyExtras: {
            principalRangeLatex,
            reducedCarrierLatex,
            piecewiseBranches: [
              {
                conditionLatex: `${reducedCarrierLatex}\\in${principalRangeLatex}`,
                resultLatex: `${outerLatex}=${reducedCarrierLatex}`,
              },
            ] as PeriodicPiecewiseBranch[],
          },
        };
      }

      if (!isWithinPrincipalRange(target.value, principalRange)) {
        const label =
          inverseTrigKind === 'asin'
            ? 'arcsin'
            : inverseTrigKind === 'acos'
              ? 'arccos'
              : 'arctan';
        return {
          equations: buildCompositionBranchSet([]).equations,
          solveBadges: ['Principal Range'],
          solveSummaryText: `Principal range: ${outerLatex} cannot equal ${target.latex} because ${label} only returns values on ${buildInverseTrigPrincipalRangeMessage(inverseTrigKind, angleUnit)}.`,
          unresolvedError: `No real solutions because ${label} returns principal values only on ${buildInverseTrigPrincipalRangeMessage(inverseTrigKind, angleUnit)}.`,
          exactSupplementLatex: [`\\text{Principal range: } ${principalRangeLatex}`],
          periodicFamilyExtras: {
            carrierLatex: reducedCarrierLatex,
            parameterLatex: 'k\\in\\mathbb{Z}',
            branchesLatex: [],
            principalRangeLatex,
            reducedCarrierLatex,
            structuredStopReason: 'outside-principal-range',
          },
        };
      }

      const mappedKind =
        inverseTrigKind === 'asin'
          ? 'sin'
          : inverseTrigKind === 'acos'
            ? 'cos'
            : 'tan';
      const invertedTarget = buildInverseTrigValueTarget(mappedKind, target, angleUnit);
      if (!invertedTarget) {
        return null;
      }
      const template = buildTrigPeriodicTemplate(mappedKind, invertedTarget.value, invertedTarget.latex, angleUnit);
      const piecewiseBranches = template
        ? template.branches.map((branch) => ({
            conditionLatex: `${reducedCarrierLatex}=${branch.latex}`,
            resultLatex: `${outerLatex}=${target.latex}`,
          }))
        : [];

      return {
        equations: buildCompositionBranchSet([buildEquationLatex(directInner, invertedTarget.node)]).equations,
        solveBadges: ['Outer Inversion', 'Principal Range'],
        solveSummaryText: `Sawtooth closure: ${outerLatex}=${target.latex} reduces to ${boxLatex(directInner)}=${invertedTarget.latex} on bounded principal-range branches.`,
        unresolvedError: 'This recognized inverse/direct trig identity is outside the current exact bounded sawtooth-closure set. Use Numeric Solve with a chosen interval in Equation mode.',
        exactSupplementLatex: [`\\text{Principal range: } ${principalRangeLatex}`],
        detailSections: [
          {
            title: 'Piecewise Exact',
            lines: [
              `${outerLatex} matches ${target.latex} on the bounded sawtooth branches of ${reducedCarrierLatex}.`,
            ],
          },
        ],
        periodicFamilyExtras: {
          carrierLatex: reducedCarrierLatex,
          parameterLatex: 'k\\in\\mathbb{Z}',
          branchesLatex: [],
          principalRangeLatex,
          reducedCarrierLatex,
          piecewiseBranches,
        },
      };
    }

    if (!isWithinPrincipalRange(target.value, principalRange)) {
      const label =
        inverseTrigKind === 'asin'
          ? 'arcsin'
          : inverseTrigKind === 'acos'
            ? 'arccos'
            : 'arctan';
      return transformBlocked(
        `No real solutions because ${label} returns principal values only on ${buildInverseTrigPrincipalRangeMessage(inverseTrigKind, angleUnit)}.`,
      );
    }

    const invertedTarget = buildInverseTrigValueTarget(
      inverseTrigKind === 'asin'
        ? 'sin'
        : inverseTrigKind === 'acos'
          ? 'cos'
          : 'tan',
      target,
      angleUnit,
    );
    if (!invertedTarget) {
      return null;
    }

    return {
      equations: buildCompositionBranchSet([buildEquationLatex(normalized[1], invertedTarget.node)]).equations,
      solveBadges: ['Outer Inversion'],
      solveSummaryText: `Inverted ${boxLatex(normalized)} into ${boxLatex(normalized[1])}=${invertedTarget.latex}`,
      unresolvedError: 'This recognized inverse-trig composition family is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.',
    };
  }

  if (isNodeArray(normalized) && normalized[0] === 'Ln' && normalized.length === 2) {
    if (isDirectAffineInner(normalized[1])) {
      return null;
    }
    const branchSet = buildCompositionBranchSet(
      [buildEquationLatex(normalized[1], ['Power', 'ExponentialE', target.node])],
      [{ kind: 'positive', expressionLatex: boxLatex(normalized[1]) }],
    );
    return {
      equations: branchSet.equations,
      domainConstraints: branchSet.constraints,
      solveBadges: ['Outer Inversion'],
      solveSummaryText: `Inverted ${boxLatex(normalized)} into ${boxLatex(normalized[1])}=e^{${target.latex}}`,
      unresolvedError: 'This recognized composition family is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.',
    };
  }

  if (isNodeArray(normalized) && normalized[0] === 'Log' && normalized.length === 2) {
    if (isDirectAffineInner(normalized[1])) {
      return null;
    }
    const branchSet = buildCompositionBranchSet(
      [buildEquationLatex(normalized[1], ['Power', 10, target.node])],
      [{ kind: 'positive', expressionLatex: boxLatex(normalized[1]) }],
    );
    return {
      equations: branchSet.equations,
      domainConstraints: branchSet.constraints,
      solveBadges: ['Outer Inversion'],
      solveSummaryText: `Inverted ${boxLatex(normalized)} into ${boxLatex(normalized[1])}=10^{${target.latex}}`,
      unresolvedError: 'This recognized composition family is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.',
    };
  }

  if (isNodeArray(normalized) && normalized[0] === 'Log' && normalized.length === 3) {
    if (isDirectAffineInner(normalized[1])) {
      return null;
    }
    const base = parseNumericTarget(normalized[2]);
    if (!base || base.value <= 0 || Math.abs(base.value - 1) < EPSILON) {
      return null;
    }

    const branchSet = buildCompositionBranchSet(
      [buildEquationLatex(normalized[1], ['Power', normalized[2], target.node])],
      [{ kind: 'positive', expressionLatex: boxLatex(normalized[1]) }],
    );
    return {
      equations: branchSet.equations,
      domainConstraints: branchSet.constraints,
      solveBadges: ['Outer Inversion'],
      solveSummaryText: `Inverted ${boxLatex(normalized)} into ${boxLatex(normalized[1])}=${boxLatex(normalized[2])}^{${target.latex}}`,
      unresolvedError: 'This recognized composition family is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.',
    };
  }

  if (isNodeArray(normalized) && normalized[0] === 'Exp' && normalized.length === 2) {
    if (isDirectAffineInner(normalized[1])) {
      return null;
    }
    if (target.value <= 0) {
      return transformBlocked('No real solutions because exponential expressions are always positive.');
    }

    return {
      equations: buildCompositionBranchSet([buildEquationLatex(normalized[1], ['Ln', target.node])]).equations,
      solveBadges: ['Outer Inversion'],
      solveSummaryText: `Inverted ${boxLatex(normalized)} into ${boxLatex(normalized[1])}=\\ln\\left(${target.latex}\\right)`,
      unresolvedError: 'This recognized composition family is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.',
    };
  }

  if (isNodeArray(normalized) && normalized[0] === 'Power' && normalized.length === 3) {
    const base = normalized[1];
    const exponent = normalized[2];
    const numericBase = parseNumericTarget(base);

    if (base === 'ExponentialE' && dependsOnVariable(exponent, 'x') && !isBareVariable(exponent)) {
      if (isDirectAffineInner(exponent)) {
        return null;
      }
      if (target.value <= 0) {
        return transformBlocked('No real solutions because exponential expressions are always positive.');
      }

      return {
        equations: buildCompositionBranchSet([buildEquationLatex(exponent, ['Ln', target.node])]).equations,
        solveBadges: ['Outer Inversion'],
        solveSummaryText: `Inverted ${boxLatex(normalized)} into ${boxLatex(exponent)}=\\ln\\left(${target.latex}\\right)`,
        unresolvedError: 'This recognized composition family is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.',
      };
    }

    if (numericBase && numericBase.value > 0 && Math.abs(numericBase.value - 1) > EPSILON && dependsOnVariable(exponent, 'x') && !isBareVariable(exponent)) {
      if (isDirectAffineInner(exponent)) {
        return null;
      }
      if (target.value <= 0) {
        return transformBlocked('No real solutions because exponential expressions are always positive.');
      }

      return {
        equations: buildCompositionBranchSet([buildEquationLatex(exponent, ['Divide', ['Ln', target.node], ['Ln', base]])]).equations,
        solveBadges: ['Outer Inversion'],
        solveSummaryText: `Inverted ${boxLatex(normalized)} into ${boxLatex(exponent)}=\\frac{\\ln\\left(${target.latex}\\right)}{\\ln\\left(${boxLatex(base)}\\right)}`,
        unresolvedError: 'This recognized composition family is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.',
      };
    }

    const exponentScalar = readExactScalar(exponent);
    if (dependsOnVariable(base, 'x') && !isDirectAffineInner(base) && exponentScalar && exponentScalar.numerator > 0 && exponentScalar.denominator > 1) {
      const numerator = exponentScalar.numerator;
      const denominator = exponentScalar.denominator;
      const inversePower = buildPoweredTarget(target, denominator, numerator);

      if (denominator % 2 === 0 && target.value < 0) {
        return transformBlocked('No real solutions because an even-root composition cannot equal a negative target in the real domain.');
      }

      if (numerator % 2 === 0 && target.value < 0) {
        return transformBlocked('No real solutions because this rational-power composition is non-negative over the real domain.');
      }

      const equations = [buildEquationLatex(base, inversePower)];
      if (denominator % 2 !== 0 && numerator % 2 === 0) {
        equations.push(buildEquationLatex(base, ['Negate', inversePower]));
      }
      const branchSet = buildCompositionBranchSet(
        equations,
        denominator % 2 === 0
          ? [{ kind: 'nonnegative', expressionLatex: boxLatex(base) }]
          : undefined,
      );

      return {
        equations: branchSet.equations,
        domainConstraints: branchSet.constraints,
        solveBadges: ['Outer Inversion'],
        solveSummaryText: `Lifted ${boxLatex(normalized)} into ${branchSet.equations.join(',\\;')}`,
        unresolvedError: 'This recognized composition family is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.',
      };
    }
  }

  if (isNodeArray(normalized) && normalized[0] === 'Sqrt' && normalized.length === 2 && dependsOnVariable(normalized[1], 'x')) {
    if (isDirectAffineInner(normalized[1])) {
      return null;
    }
    if (target.value < 0) {
      return transformBlocked('No real solutions because an even root cannot equal a negative target in the real domain.');
    }

    const branchSet = buildCompositionBranchSet(
      [buildEquationLatex(normalized[1], ['Power', target.node, 2])],
      [{ kind: 'nonnegative', expressionLatex: boxLatex(normalized[1]) }],
    );
    return {
      equations: branchSet.equations,
      domainConstraints: branchSet.constraints,
      solveBadges: ['Outer Inversion'],
      solveSummaryText: `Inverted ${boxLatex(normalized)} into ${boxLatex(normalized[1])}=${boxLatex(['Power', target.node, 2])}`,
      unresolvedError: 'This recognized composition family is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.',
    };
  }

  if (isNodeArray(normalized) && normalized[0] === 'Root' && normalized.length === 3 && dependsOnVariable(normalized[1], 'x')) {
    if (isDirectAffineInner(normalized[1])) {
      return null;
    }
    const index = parseNumericTarget(normalized[2]);
    if (!index || !Number.isInteger(index.value) || index.value < 2) {
      return null;
    }

    if (index.value % 2 === 0 && target.value < 0) {
      return transformBlocked('No real solutions because an even root cannot equal a negative target in the real domain.');
    }

    const branchSet = buildCompositionBranchSet(
      [buildEquationLatex(normalized[1], ['Power', target.node, index.value])],
      index.value % 2 === 0
        ? [{ kind: 'nonnegative', expressionLatex: boxLatex(normalized[1]) }]
        : undefined,
    );
    return {
      equations: branchSet.equations,
      domainConstraints: branchSet.constraints,
      solveBadges: ['Outer Inversion'],
      solveSummaryText: `Inverted ${boxLatex(normalized)} into ${boxLatex(normalized[1])}=${boxLatex(['Power', target.node, index.value])}`,
      unresolvedError: 'This recognized composition family is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.',
    };
  }

  return null;
}


export {
  buildReducedCarrierExactFamily,
  buildTwoParameterTanFamily,
  classifyReducedCarrierGuidance,
  matchNonPeriodicTransform,
  matchReducedPolynomialPeriodicCarrier,
  matchReducedSingleFamilyPeriodicCarrier,
  refineSingleFamilyContinuationGuidance,
  supportsSelectedTwoParameterTanClosure,
  transformExponentialFamilyBranches,
};
export type { NonPeriodicTransform, ReducedSingleFamilyCarrierKind };
