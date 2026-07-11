import { ComputeEngine } from '@cortex-js/compute-engine';
import type {
  AbsoluteValueEquationFamily,
  AbsoluteValueEquationFamilyKind,
  AbsoluteValueExactScalar,
  AbsoluteValueTargetDescriptor,
  DisplayDetailLinePart,
  DisplayDetailSection,
  SolveDomainConstraint,
} from '../../../types/calculator';
import {
  detectSingleVariable,
  expressionHasVariable,
  matchSupportedRadical,
  matchSupportedRationalPower,
  recognizePerfectSquareRadicand,
} from '../radical-core';
import { createBranchSet, createTwoBranchSet } from '../branch-core';
import {
  exactPolynomialDegree,
  parseExactPolynomial,
} from '../polynomial-core';
import { normalizeAst } from '../../symbolic-engine/normalize';
import { boxLatex, isNodeArray, termKey } from '../../symbolic-engine/patterns';
import {
  mathDetailSection,
  mathPart,
  mixedDetailSection,
  textPart,
} from '../../display/result-detail-lines';
import {
  ABS_NUMERIC_EPSILON,
  ABS_OUTER_NON_PERIODIC_MAX_TRANSFORMS,
  ABS_PLACEHOLDER_SYMBOL,
  ABS_POLYNOMIAL_PLACEHOLDER_SYMBOL,
} from './constants';
import { solveAbsoluteValuePlaceholderEquation } from './placeholder';
import {
  buildDifferenceNode,
  buildQuotientNode,
  buildScalarNode,
  buildScaledNode,
  collectEquationVariables,
  containsAbsoluteValue,
  detectEquationVariable,
  divideScalar,
  isUnitScalar,
  isZeroScalar,
  multiplyScalar,
  negateNode,
  parseLinearPlaceholder,
  readExactScalar,
  replaceAllMatches,
  replaceFirstMatch,
  simplifyNode,
} from './shared';
import type {
  AbsoluteValueBoundaryReason,
  AbsoluteValueExpressionSupportKind,
  RecognizedAbsoluteValueEquationFamily,
} from './types';

const ce = new ComputeEngine();

export function buildAbsoluteValueNode(node: unknown) {
  return simplifyNode(['Abs', node]);
}

export function buildAbsoluteValueNonnegativeConstraint(expression: unknown): SolveDomainConstraint {
  return {
    kind: 'nonnegative',
    expressionLatex: boxLatex(expression),
  };
}

function classifyAbsoluteValueExpressionSupport(
  node: unknown,
  variable: string,
): AbsoluteValueExpressionSupportKind | null {
  const normalized = normalizeAst(node);

  if (containsAbsoluteValue(normalized)) {
    return null;
  }

  if (readExactScalar(normalized) || !expressionHasVariable(normalized)) {
    return 'constant';
  }

  const polynomial = parseExactPolynomial(normalized, variable, 4);
  if (polynomial) {
    return exactPolynomialDegree(polynomial) <= 1 ? 'affine' : 'polynomial';
  }

  if (matchSupportedRadical(normalized, variable)) {
    return 'radical';
  }

  if (matchSupportedRationalPower(normalized, variable)) {
    return 'rational-power';
  }

  return detectSingleVariable(normalized) === variable ? 'generic-expression' : null;
}

function isStrongerAbsoluteValueCarrierKind(kind: AbsoluteValueExpressionSupportKind | null) {
  return kind === 'polynomial' || kind === 'radical' || kind === 'rational-power';
}

function isStrongerAbsoluteValueFamily(family: AbsoluteValueEquationFamily) {
  const targetKind = classifyAbsoluteValueExpressionSupport(family.target.base, family.variable);
  const comparisonKind = classifyAbsoluteValueExpressionSupport(
    family.comparisonTarget?.base ?? family.comparisonNode,
    family.variable,
  );
  return isStrongerAbsoluteValueCarrierKind(targetKind) || isStrongerAbsoluteValueCarrierKind(comparisonKind);
}

export function buildAbsoluteValueFamilyLabel(family: AbsoluteValueEquationFamily) {
  return isStrongerAbsoluteValueFamily(family)
    ? 'stronger absolute-value carrier family'
    : 'absolute-value family';
}

function toInlineSummaryMath(latex: string) {
  const inline = latex
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1)/($2)')
    .replace(/\\left\|/g, '|')
    .replace(/\\right\|/g, '|')
    .replace(/\\vert\b/g, '|')
    .replace(/\\left/g, '')
    .replace(/\\right/g, '')
    .replace(/\\ln\b/g, 'ln')
    .replace(/\\log\b/g, 'log')
    .replace(/\\sin\b/g, 'sin')
    .replace(/\\cos\b/g, 'cos')
    .replace(/\\tan\b/g, 'tan')
    .replace(/\\pi\b/g, 'pi')
    .replace(/\\cdot/g, '*')
    .replace(/\\times/g, '*')
    .replace(/\^\{([^{}]+)\}/g, '^($1)')
    .replace(/\{([^{}]+)\}/g, '($1)')
    .replace(/\\/g, '')
    .replace(/\\,/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/\|\s+/g, '|')
    .replace(/\s+\|/g, '|')
    .replace(/\s*=\s*/g, '=')
    .trim();

  return inline.replace(/[-+]?\d[\d,]*(?:\.\d[\d,]*)?(?:e[-+]?\d+)?/gi, (token) => {
    const normalized = token.replace(/,/g, '');
    const value = Number(normalized);
    if (!Number.isFinite(value)) {
      return token;
    }

    for (let denominator = 1; denominator <= 16; denominator += 1) {
      const numerator = Math.round(value * denominator);
      if (Math.abs(value - numerator / denominator) <= 1e-12) {
        if (denominator === 1) {
          return `${numerator}`;
        }
        return `(${numerator})/(${denominator})`;
      }
    }

    return token;
  });
}

export function absoluteValuePlaceholderInline(family: RecognizedAbsoluteValueEquationFamily) {
  return `t = ${toInlineSummaryMath(boxLatex(['Abs', normalizeAst(family.target.base)]))}`;
}

function shouldIncludeGeneratedBranchSection(family: RecognizedAbsoluteValueEquationFamily) {
  if (family.normalizationKind !== 'outer-nonperiodic' || family.branchEquations.length <= 1) {
    return false;
  }

  return family.branchEquations.some((equationLatex) => !/^x\s*=/.test(toInlineSummaryMath(equationLatex)));
}

function buildAbsoluteValueBoundaryParts(
  family: RecognizedAbsoluteValueEquationFamily,
  reason: AbsoluteValueBoundaryReason,
): DisplayDetailLinePart[] {
  const placeholder = absoluteValuePlaceholderInline(family);
  switch (reason) {
    case 'outer-depth':
      return [
        mathPart(placeholder),
        textPart(' would need more than one extra bounded non-periodic outer layer before returning to exact abs branches.'),
      ];
    case 'no-roots':
      return [
        mathPart(placeholder),
        textPart(' produced no admissible real values with '),
        mathPart('t >= 0'),
        textPart(' after the outer non-periodic reduction.'),
      ];
    case 'guided-branch':
      return [
        textPart('At least one generated branch from '),
        mathPart(placeholder),
        textPart(' reaches only guided periodic/composition output, so the full abs family stays unresolved.'),
      ];
    case 'outer-sink':
    default:
      return [
        textPart('The outer non-periodic reduction over '),
        mathPart(placeholder),
        textPart(' succeeded, but at least one resulting abs branch leaves the current exact sink set.'),
      ];
  }
}

export function buildAbsoluteValueSolveSummary(family: RecognizedAbsoluteValueEquationFamily) {
  if (family.normalizationKind === 'outer-nonperiodic') {
    return 'Solved a bounded outer non-periodic absolute-value family';
  }

  if (family.normalizationKind === 'outer-polynomial') {
    return 'Solved a bounded outer-polynomial absolute-value family';
  }

  return 'Solved a bounded absolute-value family through exact branch closure';
}

export function buildAbsoluteValueDetailSections(
  family: RecognizedAbsoluteValueEquationFamily,
  options: {
    boundaryReason?: AbsoluteValueBoundaryReason;
  } = {},
): DisplayDetailSection[] {
  const sections: DisplayDetailSection[] = [];

  if (family.normalizationKind === 'outer-nonperiodic') {
    sections.push(mixedDetailSection('Absolute-Value Reduction', [[
      textPart('Reduced the equation to '),
      mathPart(absoluteValuePlaceholderInline(family)),
      textPart(' with '),
      mathPart('t >= 0'),
      textPart(' and solved the bounded outer non-periodic layer before returning to exact abs branches.'),
    ]]));

    if (shouldIncludeGeneratedBranchSection(family)) {
      sections.push(mathDetailSection('Generated Branches', family.branchEquations));
    }
  }

  if (options.boundaryReason) {
    sections.push(mixedDetailSection('Exact Closure Boundary', [
      buildAbsoluteValueBoundaryParts(family, options.boundaryReason),
    ]));
  }

  return sections;
}

export function buildAbsoluteValueUnresolvedError(family: AbsoluteValueEquationFamily) {
  if ('normalizationKind' in family && family.normalizationKind === 'outer-polynomial') {
    return buildOuterPolynomialUnresolvedError(buildAbsoluteValueFamilyLabel(family));
  }
  if ('normalizationKind' in family && family.normalizationKind === 'outer-nonperiodic') {
    return `This recognized ${buildAbsoluteValueFamilyLabel(family)} reduces through a bounded non-periodic outer layer, but at least one resulting abs branch cannot close through the current exact bounded sink set. Use Numeric Solve with an interval in Equation mode.`;
  }
  return `This recognized ${buildAbsoluteValueFamilyLabel(family)} is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.`;
}

export function isSupportedAbsoluteValueExpression(node: unknown, variable: string): boolean {
  if (classifyAbsoluteValueExpressionSupport(node, variable)) {
    return true;
  }

  return false;
}

export function matchAbsoluteValueTarget(node: unknown, variable: string): AbsoluteValueTargetDescriptor | null {
  const normalized = normalizeAst(node);
  if (isNodeArray(normalized) && normalized[0] === 'Abs' && normalized.length === 2) {
    if (!isSupportedAbsoluteValueExpression(normalized[1], variable)) {
      return null;
    }

    return {
      targetNode: normalized,
      base: normalized[1],
      coefficient: { numerator: 1, denominator: 1 },
    };
  }

  if (isNodeArray(normalized) && normalized[0] === 'Multiply' && normalized.length >= 3) {
    const absChildren = normalized.slice(1).filter((child) =>
      isNodeArray(child) && child[0] === 'Abs' && child.length === 2);
    if (absChildren.length !== 1) {
      return null;
    }

    const scalarChildren = normalized
      .slice(1)
      .filter((child) => child !== absChildren[0])
      .every((child) => Boolean(readExactScalar(child)));
    if (!scalarChildren) {
      return null;
    }

    const absBase = (absChildren[0] as unknown[])[1];
    if (!isSupportedAbsoluteValueExpression(absBase, variable)) {
      return null;
    }

    return {
      targetNode: normalized,
      base: absBase,
      coefficient: normalized
        .slice(1)
        .filter((child) => child !== absChildren[0])
        .map((child) => readExactScalar(child)!)
        .reduce<AbsoluteValueExactScalar>((accumulator, child) =>
          multiplyScalar(accumulator, child) ?? accumulator, { numerator: 1, denominator: 1 }),
    };
  }

  if (isNodeArray(normalized) && normalized[0] === 'Divide' && normalized.length === 3) {
    const numerator = normalizeAst(normalized[1]);
    const denominatorScalar = readExactScalar(normalized[2]);
    if (!denominatorScalar) {
      return null;
    }

    const numeratorTarget = matchAbsoluteValueTarget(numerator, variable);
    if (!numeratorTarget) {
      return null;
    }

    return {
      targetNode: normalized,
      base: numeratorTarget.base,
      coefficient: divideScalar(
        numeratorTarget.coefficient,
        denominatorScalar,
      ) ?? numeratorTarget.coefficient,
    };
  }

  return null;
}

export function collectAbsoluteValueTargets(
  node: unknown,
  variable: string,
  targets: AbsoluteValueTargetDescriptor[] = [],
) {
  const normalized = normalizeAst(node);
  const target = matchAbsoluteValueTarget(normalized, variable);
  if (target) {
    targets.push(target);
  }

  if (!isNodeArray(normalized) || normalized.length === 0) {
    return targets;
  }

  for (const child of normalized.slice(1)) {
    collectAbsoluteValueTargets(child, variable, targets);
  }

  return targets;
}

function collectRawAbsoluteValueTargets(
  node: unknown,
  variable: string,
  targets: AbsoluteValueTargetDescriptor[] = [],
) {
  const normalized = normalizeAst(node);
  if (isNodeArray(normalized) && normalized[0] === 'Abs' && normalized.length === 2) {
    if (isSupportedAbsoluteValueExpression(normalized[1], variable)) {
      targets.push({
        targetNode: normalized,
        base: normalized[1],
        coefficient: { numerator: 1, denominator: 1 },
      });
    }
  }

  if (!isNodeArray(normalized) || normalized.length === 0) {
    return targets;
  }

  for (const child of normalized.slice(1)) {
    collectRawAbsoluteValueTargets(child, variable, targets);
  }

  return targets;
}

function buildOuterPolynomialNoRootError(familyLabel: string) {
  return `This recognized ${familyLabel} reduces to a bounded polynomial in \\left|u\\right| with no nonnegative real roots, so it has no real solutions.`;
}

function buildOuterPolynomialUnresolvedError(familyLabel: string) {
  return `This recognized ${familyLabel} reduces to a bounded polynomial in \\left|u\\right|, but at least one resulting branch leaves the current exact bounded sink set. Use Numeric Solve with an interval in Equation mode.`;
}

function buildOuterNonPeriodicNoRootError(familyLabel: string) {
  return `This recognized ${familyLabel} reduces through a bounded non-periodic outer layer to no nonnegative real \\left|u\\right| values, so it has no real solutions.`;
}

function buildOuterNonPeriodicUnresolvedError(familyLabel: string) {
  return `This recognized ${familyLabel} reduces through a bounded non-periodic outer layer, but the resulting \\left|u\\right| equation leaves the current exact bounded sink set. Use Numeric Solve with an interval in Equation mode.`;
}

function buildOuterNonPeriodicDepthError(familyLabel: string) {
  return `This recognized ${familyLabel} would require more than one extra bounded non-periodic outer layer over \\left|u\\right|. Use Numeric Solve with an interval in Equation mode.`;
}

function buildDirectNegativeComparisonError(familyLabel: string, comparisonLatex: string) {
  return `This recognized ${familyLabel} has no real solutions because \\left|u\\right| cannot equal ${comparisonLatex}<0.`;
}

type AffineAbsoluteValueSide = {
  target: AbsoluteValueTargetDescriptor;
  offset: AbsoluteValueExactScalar;
};

function matchAffineAbsoluteValueSide(node: unknown, variable: string): AffineAbsoluteValueSide | null {
  const normalized = normalizeAst(node);
  const targets = collectAbsoluteValueTargets(normalized, variable).filter(
    (target, index, pool) => pool.findIndex((entry) => termKey(entry.targetNode) === termKey(target.targetNode)) === index,
  );

  for (const target of targets) {
    const replaced = replaceFirstMatch(normalized, termKey(target.targetNode), ABS_PLACEHOLDER_SYMBOL);
    if (!replaced.replaced) {
      continue;
    }

    const linear = parseLinearPlaceholder(replaced.node, ABS_PLACEHOLDER_SYMBOL);
    if (!linear || isZeroScalar(linear.a)) {
      continue;
    }

    const offset = readExactScalar(linear.remainder);
    if (!offset) {
      continue;
    }

    const coefficient = multiplyScalar(target.coefficient, linear.a);
    if (!coefficient || isZeroScalar(coefficient)) {
      continue;
    }

    return {
      target: {
        targetNode: buildScaledNode(buildAbsoluteValueNode(target.base), coefficient),
        base: target.base,
        coefficient,
      },
      offset,
    };
  }

  return null;
}

export function matchPerfectSquareAbsoluteValueCarrier(node: unknown, variable: string) {
  const normalized = normalizeAst(node);
  if (
    isNodeArray(normalized)
    && ((normalized[0] === 'Sqrt' && normalized.length === 2)
      || (normalized[0] === 'Root' && normalized.length === 3 && normalized[2] === 2))
  ) {
    const directBase =
      isNodeArray(normalized[1])
      && normalized[1][0] === 'Power'
      && normalized[1].length === 3
      && readExactScalar(normalized[1][2])?.numerator === 2
      && readExactScalar(normalized[1][2])?.denominator === 1
      && isSupportedAbsoluteValueExpression(normalized[1][1], variable)
        ? normalized[1][1]
        : null;
    if (directBase) {
      return {
        targetNode: normalized,
        absNode: buildAbsoluteValueNode(directBase),
      };
    }

    const profile = recognizePerfectSquareRadicand(normalized[1]);
    if (!profile || detectSingleVariable(profile.absInnerNode) !== variable) {
      return null;
    }

    return {
      targetNode: normalized,
      absNode: profile.normalizedNode,
    };
  }

  return null;
}

export function buildAbsoluteValueEquationFamily(
  target: AbsoluteValueTargetDescriptor,
  comparisonNode: unknown,
  variable: string,
): RecognizedAbsoluteValueEquationFamily {
  const normalizedBase = normalizeAst(target.base);
  const normalizedComparison = isUnitScalar(target.coefficient)
    ? normalizeAst(comparisonNode)
    : buildQuotientNode(normalizeAst(comparisonNode), buildScalarNode(target.coefficient));
  const comparisonTarget = matchAbsoluteValueTarget(normalizedComparison, variable);
  const pureComparisonAbs =
    comparisonTarget && termKey(comparisonTarget.targetNode) === termKey(normalizedComparison)
      ? comparisonTarget
      : undefined;

  const kind: AbsoluteValueEquationFamilyKind = pureComparisonAbs
    ? 'abs-equals-abs'
    : !expressionHasVariable(normalizedComparison)
      ? 'abs-equals-constant'
      : 'abs-equals-expression';

  const effectiveComparison = pureComparisonAbs
    ? buildScaledNode(pureComparisonAbs.base, pureComparisonAbs.coefficient)
    : normalizedComparison;
  const exactComparison = pureComparisonAbs ? null : readExactScalar(normalizedComparison);
  const familyLabel = isStrongerAbsoluteValueCarrierKind(classifyAbsoluteValueExpressionSupport(normalizedBase, variable))
    ? 'stronger absolute-value carrier family'
    : 'absolute-value family';
  const constraints = pureComparisonAbs || exactComparison
    ? []
    : [buildAbsoluteValueNonnegativeConstraint(normalizedComparison)];

  if (exactComparison && exactComparison.numerator < 0) {
    return {
      kind,
      variable,
      target: {
        targetNode: buildScaledNode(buildAbsoluteValueNode(normalizedBase), target.coefficient),
        base: normalizedBase,
        coefficient: target.coefficient,
      },
      comparisonNode: normalizedComparison,
      comparisonTarget: pureComparisonAbs,
      branchEquations: [],
      branchConstraints: [],
      normalizationKind: 'direct',
      emptyBranchError: buildDirectNegativeComparisonError(familyLabel, boxLatex(normalizedComparison)),
    };
  }

  const primaryBranch = `${boxLatex(normalizedBase)}=${boxLatex(effectiveComparison)}`;
  const branchSet = exactComparison && exactComparison.numerator === 0
    ? createBranchSet({
        equations: [primaryBranch],
        constraints,
        provenance: 'abs-core',
      })
    : createTwoBranchSet(
        primaryBranch,
        `${boxLatex(normalizedBase)}=${boxLatex(negateNode(effectiveComparison))}`,
        constraints,
        { provenance: 'abs-core' },
      );

  return {
    kind,
    variable,
    target: {
      targetNode: buildScaledNode(buildAbsoluteValueNode(normalizedBase), target.coefficient),
      base: normalizedBase,
      coefficient: target.coefficient,
    },
    comparisonNode: normalizedComparison,
    comparisonTarget: pureComparisonAbs,
    branchEquations: branchSet.equations,
    branchConstraints: branchSet.constraints ?? [],
    normalizationKind: 'direct',
  };
}

function matchOuterPolynomialAbsoluteValueEquationNode(node: unknown): RecognizedAbsoluteValueEquationFamily | null {
  const normalized = normalizeAst(node);
  if (!isNodeArray(normalized) || normalized[0] !== 'Equal' || normalized.length !== 3) {
    return null;
  }

  const leftNode = normalizeAst(normalized[1]);
  const rightNode = normalizeAst(normalized[2]);
  // Preserve raw |u| structure here: simplification can incorrectly rewrite
  // outer abs powers like |sin(x)|^2 into sin(|x|)^2 before placeholder reduction.
  const zeroForm = normalizeAst(['Add', leftNode, ['Negate', rightNode]]);
  const variable = detectSingleVariable(zeroForm);
  if (variable === null && expressionHasVariable(zeroForm)) {
    return null;
  }

  const effectiveVariable = variable ?? detectEquationVariable(leftNode, rightNode);
  const rawTargets = collectRawAbsoluteValueTargets(zeroForm, effectiveVariable).filter(
    (target, index, pool) => pool.findIndex((entry) => termKey(entry.targetNode) === termKey(target.targetNode)) === index,
  );
  if (rawTargets.length !== 1) {
    return null;
  }

  const target = rawTargets[0];
  const replacedLeft = replaceAllMatches(
    leftNode,
    termKey(target.targetNode),
    ABS_POLYNOMIAL_PLACEHOLDER_SYMBOL,
  );
  const replacedRight = replaceAllMatches(
    rightNode,
    termKey(target.targetNode),
    ABS_POLYNOMIAL_PLACEHOLDER_SYMBOL,
  );
  if (replacedLeft.replacementCount + replacedRight.replacementCount === 0) {
    return null;
  }

  const remainingVariables = [
    ...collectEquationVariables(replacedLeft.node),
    ...collectEquationVariables(replacedRight.node),
  ];
  if (remainingVariables.some((entry) => entry !== ABS_POLYNOMIAL_PLACEHOLDER_SYMBOL)) {
    return null;
  }

  const placeholderEquation = normalizeAst([
    'Equal',
    normalizeAst(replacedLeft.node),
    normalizeAst(replacedRight.node),
  ]);
  const placeholderSolve = solveAbsoluteValuePlaceholderEquation(
    placeholderEquation,
    ABS_POLYNOMIAL_PLACEHOLDER_SYMBOL,
    ABS_OUTER_NON_PERIODIC_MAX_TRANSFORMS,
  );
  if (placeholderSolve.kind === 'unrecognized') {
    return null;
  }
  const familyLabel = isStrongerAbsoluteValueCarrierKind(
    classifyAbsoluteValueExpressionSupport(target.base, effectiveVariable),
  )
    ? 'stronger absolute-value carrier family'
    : 'absolute-value family';

  if (placeholderSolve.kind === 'unresolved') {
    return {
      kind: 'abs-equals-constant',
      variable: effectiveVariable,
      target,
      comparisonNode: 0,
      branchEquations: [],
      branchConstraints: [],
      normalizationKind: placeholderSolve.normalizationKind,
      blockOnGuidedBranchError: true,
      emptyBranchError: placeholderSolve.reason === 'outer-depth'
        ? buildOuterNonPeriodicDepthError(familyLabel)
        : placeholderSolve.normalizationKind === 'outer-polynomial'
          ? buildOuterPolynomialUnresolvedError(familyLabel)
          : buildOuterNonPeriodicUnresolvedError(familyLabel),
    };
  }

  const acceptedRoots = placeholderSolve.kind === 'solved'
    ? placeholderSolve.roots.filter((root) => root.numeric >= -ABS_NUMERIC_EPSILON)
    : [];
  if (acceptedRoots.length === 0) {
    return {
      kind: 'abs-equals-constant',
      variable: effectiveVariable,
      target,
      comparisonNode: 0,
      branchEquations: [],
      branchConstraints: [],
      normalizationKind: placeholderSolve.normalizationKind,
      blockOnGuidedBranchError: true,
      emptyBranchError: placeholderSolve.normalizationKind === 'outer-polynomial'
        ? buildOuterPolynomialNoRootError(familyLabel)
        : buildOuterNonPeriodicNoRootError(familyLabel),
    };
  }

  const reducedFamilies = acceptedRoots.map((root) =>
    buildAbsoluteValueEquationFamily(target, root.node, effectiveVariable));
  const branchSet = createBranchSet({
    equations: reducedFamilies.flatMap((family) => family.branchEquations),
    constraints: reducedFamilies.flatMap((family) => family.branchConstraints),
    provenance: 'abs-core',
  });

  return {
    kind: 'abs-equals-constant',
    variable: effectiveVariable,
    target: {
      targetNode: buildAbsoluteValueNode(normalizeAst(target.base)),
      base: normalizeAst(target.base),
      coefficient: { numerator: 1, denominator: 1 },
    },
    comparisonNode: acceptedRoots[0].node,
    branchEquations: branchSet.equations,
    branchConstraints: branchSet.constraints ?? [],
    normalizationKind: placeholderSolve.normalizationKind,
    blockOnGuidedBranchError: true,
  };
}

export function matchDirectAbsoluteValueEquationNode(node: unknown): RecognizedAbsoluteValueEquationFamily | null {
  const normalized = normalizeAst(node);
  if (!isNodeArray(normalized) || normalized[0] !== 'Equal' || normalized.length !== 3) {
    return null;
  }

  const leftNode = normalizeAst(normalized[1]);
  const rightNode = normalizeAst(normalized[2]);
  const variable = detectEquationVariable(leftNode, rightNode);

  const attempts: Array<{ targetSide: unknown; otherSide: unknown }> = [
    { targetSide: leftNode, otherSide: rightNode },
    { targetSide: rightNode, otherSide: leftNode },
  ];

  for (const attempt of attempts) {
    const target = matchAffineAbsoluteValueSide(attempt.targetSide, variable);
    if (!target) {
      continue;
    }

    const normalizedOtherSide = normalizeAst(attempt.otherSide);
    const pureOtherTarget = matchAbsoluteValueTarget(normalizedOtherSide, variable);
    const isPureOtherTarget = pureOtherTarget && termKey(pureOtherTarget.targetNode) === termKey(normalizedOtherSide);
    if (!isSupportedAbsoluteValueExpression(normalizedOtherSide, variable) && !isPureOtherTarget) {
      continue;
    }

    const isolatedComparison = buildDifferenceNode(normalizedOtherSide, buildScalarNode(target.offset));
    return buildAbsoluteValueEquationFamily(target.target, isolatedComparison, variable);
  }

  return matchOuterPolynomialAbsoluteValueEquationNode(normalized);
}

export function matchDirectAbsoluteValueEquationLatex(latex: string) {
  const parsed = ce.parse(latex);
  return matchDirectAbsoluteValueEquationNode(parsed.json);
}
