import { ComputeEngine } from '@cortex-js/compute-engine';
import {
  complexSolutionsToApproxText,
  complexSolutionsToLatex,
  formatApproxNumber,
  formatNumber,
} from '../display/format';
import {
  applyEquationTransform,
  getAlgebraTransformLabel,
  type AlgebraTransformAction,
} from '../algebra/algebra-transform';
import {
  classifyEquationRuntimeAdvisories,
  classifyPlannerBlockedRuntimeAdvisories,
} from '../kernel/runtime-policy';
import { runExpressionAction } from '../engine/math-engine';
import { analyzeLatex, isRelationalOperator } from '../engine/math-analysis';
import { runSharedEquationSolve } from '../equation/shared-solve';
import { solveParameterizedLinearEquation } from '../equation/equation-parameterized-linear';
import {
  resolveEquationSolveTarget,
  retargetDomainConstraintsToX,
  retargetEquationLatexToX,
  rewriteEquationOutcomeTarget,
} from '../equation/equation-target';
import { attachRuntimeEnvelope, buildRuntimeOutcome } from '../kernel/runtime-envelope';
import { planMathExecution } from '../engine/semantic-planner';
import { normalizeExactPowerLogNode } from '../symbolic-engine/power-log';
import { solveLinearSystem } from '../linear-algebra/matrix';
import { solveBoundedPolynomialEquationAst } from '../algebra/polynomial-factor-solve';
import { solvePolynomialRoots } from '../algebra/polynomial-roots';
import type {
  AngleUnit,
  DisplayOutcome,
  EquationScreen,
  NumericSolveInterval,
  OutputStyle,
  PlannerBadge,
  PolynomialEquationView,
  SolveDomainConstraint,
} from '../../types/calculator';

type PolynomialDegree = 2 | 3 | 4;

type PolynomialMeta = {
  degree: PolynomialDegree;
  title: string;
  coefficientLabels: string[];
};

const ce = new ComputeEngine();

export const POLYNOMIAL_VIEW_META: Record<PolynomialEquationView, PolynomialMeta> = {
  quadratic: {
    degree: 2,
    title: 'Quadratic',
    coefficientLabels: ['a', 'b', 'c'],
  },
  cubic: {
    degree: 3,
    title: 'Cubic',
    coefficientLabels: ['a', 'b', 'c', 'd'],
  },
  quartic: {
    degree: 4,
    title: 'Quartic',
    coefficientLabels: ['a', 'b', 'c', 'd', 'e'],
  },
};

export const DEFAULT_POLYNOMIAL_COEFFICIENTS: Record<PolynomialEquationView, number[]> = {
  quadratic: [1, -5, 6],
  cubic: [1, -6, 11, -6],
  quartic: [1, 0, -5, 0, 4],
};

type RunEquationModeRequest = {
  equationScreen: EquationScreen;
  equationLatex: string;
  equationSolveTarget?: string | null;
  quadraticCoefficients: number[];
  cubicCoefficients: number[];
  quarticCoefficients: number[];
  system2: number[][];
  system3: number[][];
  angleUnit: AngleUnit;
  outputStyle: OutputStyle;
  ansLatex: string;
  numericInterval?: NumericSolveInterval;
};

function attachEquationRuntimeEnvelope(
  outcome: DisplayOutcome,
  originalLatex: string,
  resolvedLatex: string,
  plannerBadges: PlannerBadge[] | undefined,
  runtimeAdvisories?: DisplayOutcome['runtimeAdvisories'],
) {
  return attachRuntimeEnvelope(outcome, {
    originalLatex,
    resolvedLatex,
    plannerBadges,
    plannerBadgeMode: 'merge',
    runtimeAdvisories,
  });
}

function solveSystem(source: number[][], size: 2 | 3): DisplayOutcome {
  const coefficients = source.map((row) => row.slice(0, size));
  const constants = source.map((row) => row[size]);
  const solution = solveLinearSystem(coefficients, constants);

  if (!solution) {
    return {
      kind: 'error',
      title: `${size}x${size}`,
      error: 'The linear system does not have a unique solution.',
      warnings: [],
    };
  }

  const exactLatex = solution
    .map((value, index) => `${['x', 'y', 'z'][index]}=${formatNumber(value, 4)}`)
    .join(',\\;');
  const approxText = solution
    .map((value, index) => `${['x', 'y', 'z'][index]} ~= ${formatApproxNumber(value)}`)
    .join(', ');

  return {
    kind: 'success',
    title: `${size}x${size}`,
    exactLatex,
    approxText,
    warnings: [],
  };
}

function normalizedCoefficients(coefficients: number[], expectedLength: number) {
  return Array.from({ length: expectedLength }, (_, index) => {
    const value = coefficients[index];
    return Number.isFinite(value) ? value : 0;
  });
}

function containsNonEqualityRelation(latex: string) {
  return /\\(?:le|leq|ge|geq|ne|neq)(?![A-Za-z])|[<>]|[≤≥≠]/.test(latex);
}

function termLatex(coefficient: number, power: number) {
  const absoluteValue = Math.abs(coefficient);
  const coefficientText = formatNumber(absoluteValue, 6);

  if (power === 0) {
    return coefficientText;
  }

  if (absoluteValue === 1) {
    return power === 1 ? 'x' : `x^{${power}}`;
  }

  return power === 1 ? `${coefficientText}x` : `${coefficientText}x^{${power}}`;
}

export function buildPolynomialEquationLatex(
  view: PolynomialEquationView,
  coefficients: number[],
) {
  const { degree } = POLYNOMIAL_VIEW_META[view];
  const normalized = normalizedCoefficients(coefficients, degree + 1);
  const terms = normalized.reduce<string[]>((currentTerms, coefficient, index) => {
    if (Math.abs(coefficient) < 1e-10) {
      return currentTerms;
    }

    const sign = coefficient < 0 ? '-' : '+';
    const power = degree - index;
    const body = termLatex(coefficient, power);

    if (currentTerms.length === 0) {
      return [`${sign === '-' ? '-' : ''}${body}`];
    }

    return [...currentTerms, `${sign}${body}`];
  }, []);

  const leftSide = terms.length > 0 ? terms.join('') : '0';
  return `${leftSide}=0`;
}

export function equationInputLatexForScreen(
  equationScreen: EquationScreen,
  equationLatex: string,
  quadraticCoefficients: number[],
  cubicCoefficients: number[],
  quarticCoefficients: number[],
) {
  if (equationScreen === 'symbolic') {
    return equationLatex;
  }

  if (equationScreen === 'quadratic') {
    return buildPolynomialEquationLatex('quadratic', quadraticCoefficients);
  }

  if (equationScreen === 'cubic') {
    return buildPolynomialEquationLatex('cubic', cubicCoefficients);
  }

  if (equationScreen === 'quartic') {
    return buildPolynomialEquationLatex('quartic', quarticCoefficients);
  }

  return '';
}

function solvePolynomial(
  screen: PolynomialEquationView,
  coefficients: number[],
  angleUnit: AngleUnit,
  outputStyle: OutputStyle,
  ansLatex: string,
): DisplayOutcome {
  const meta = POLYNOMIAL_VIEW_META[screen];
  const normalized = normalizedCoefficients(coefficients, meta.degree + 1);

  if (Math.abs(normalized[0]) < 1e-10) {
    return {
      kind: 'error',
      title: meta.title,
      error: `Set ${meta.coefficientLabels[0]} to a non-zero value for the ${meta.title.toLowerCase()} equation.`,
      warnings: [],
    };
  }

  const polynomialLatex = buildPolynomialEquationLatex(screen, normalized);
  if (screen === 'cubic' || screen === 'quartic') {
    const bounded = solveBoundedPolynomialEquationAst(ce.parse(polynomialLatex).json, 'x');
    if (bounded) {
      return buildRuntimeOutcome({
        title: meta.title,
        exactLatex: bounded.exactLatex,
        approxText: bounded.approxText,
        warnings: [],
        resultOrigin: 'symbolic',
      });
    }
  }

  const response = screen === 'quadratic'
    ? runExpressionAction(
      {
        mode: 'equation',
        document: { latex: polynomialLatex },
        angleUnit,
        outputStyle,
        variables: { Ans: ansLatex },
      },
      'solve',
    )
    : {
      exactLatex: undefined,
      exactSupplementLatex: undefined,
      approxText: undefined,
      warnings: [] as string[],
      error: 'No bounded exact symbolic solution was found.',
    };

  if (screen === 'quadratic' && !response.error && response.exactLatex) {
    return buildRuntimeOutcome({
      title: meta.title,
      exactLatex: response.exactLatex,
      exactSupplementLatex: response.exactSupplementLatex,
      approxText: response.approxText,
      warnings: response.warnings,
      resultOrigin: 'symbolic',
    });
  }

  const numericRoots = solvePolynomialRoots({ coefficients: normalized });
  if (numericRoots.kind === 'error') {
    return {
      kind: 'error',
      title: meta.title,
      error: response.error ?? numericRoots.error,
      warnings: response.warnings,
    };
  }

  return {
    kind: 'success',
    title: meta.title,
    exactLatex: complexSolutionsToLatex('x', numericRoots.roots),
    approxText: complexSolutionsToApproxText('x', numericRoots.roots),
    warnings: ['Symbolic solve unavailable; showing numeric roots.'],
    resultOrigin: 'numeric-fallback',
  };
}

function solveSymbolicEquation(
  equationLatex: string,
  angleUnit: AngleUnit,
  outputStyle: OutputStyle,
  ansLatex: string,
  equationSolveTarget?: string | null,
  numericInterval?: NumericSolveInterval,
): DisplayOutcome {
  if (containsNonEqualityRelation(equationLatex)) {
    return attachEquationRuntimeEnvelope(
      {
        kind: 'error',
        title: 'Solve',
        error: 'Equation mode currently solves only = equations. Inequalities and ≠ relations are planned for a later milestone.',
        warnings: [],
      },
      equationLatex,
      equationLatex,
      undefined,
      classifyEquationRuntimeAdvisories({ invalidRequest: true }),
    );
  }

  const planner = planMathExecution(equationLatex, {
    mode: 'equation',
    intent: 'equation-solve',
    angleUnit,
    screenHint: 'symbolic',
  });

  if (planner.kind === 'blocked') {
    return attachEquationRuntimeEnvelope(
      {
        kind: 'error',
        title: 'Solve',
        error: planner.error,
        warnings: [],
      },
      equationLatex,
      planner.canonicalLatex,
      planner.badges,
      classifyPlannerBlockedRuntimeAdvisories(planner, 'equation'),
    );
  }

  const analysis = analyzeLatex(planner.resolvedLatex);

  if (
    isRelationalOperator(analysis.topLevelOperator)
    || containsNonEqualityRelation(equationLatex)
    || containsNonEqualityRelation(planner.resolvedLatex)
  ) {
    return attachEquationRuntimeEnvelope(
      {
        kind: 'error',
        title: 'Solve',
        error: 'Equation mode currently solves only = equations. Inequalities and ≠ relations are planned for a later milestone.',
        warnings: [],
      },
      equationLatex,
      planner.resolvedLatex,
      planner.badges,
      classifyEquationRuntimeAdvisories({ invalidRequest: true }),
    );
  }

  if (analysis.kind !== 'equation') {
    return attachEquationRuntimeEnvelope(
      {
        kind: 'error',
        title: 'Solve',
        error: 'Enter an equation containing a supported solve target.',
        warnings: [],
      },
      equationLatex,
      planner.resolvedLatex,
      planner.badges,
      classifyEquationRuntimeAdvisories({ invalidRequest: true }),
    );
  }

  let targetResolution = resolveEquationSolveTarget(equationLatex, equationSolveTarget);
  if (
    (targetResolution.status === 'no-target' || targetResolution.status === 'unsupported')
    && equationLatex.replace(/\s+/g, '') !== planner.resolvedLatex.replace(/\s+/g, '')
  ) {
    const resolvedTarget = resolveEquationSolveTarget(planner.resolvedLatex, equationSolveTarget);
    if (resolvedTarget.status !== 'no-target' && resolvedTarget.status !== 'unsupported') {
      targetResolution = resolvedTarget;
    }
  }
  if (targetResolution.status === 'no-target' || targetResolution.status === 'unsupported') {
    return attachEquationRuntimeEnvelope(
      {
        kind: 'error',
        title: 'Solve',
        error: targetResolution.message ?? 'Enter an equation containing a supported solve target.',
        warnings: [],
        detailSections:
          targetResolution.analysis.reservedIdentifiers.length > 0
            ? [{
                title: 'Variable Check',
                lines: [
                  `Reserved identifiers: ${targetResolution.analysis.reservedIdentifiers.map((entry) => entry.name).join(', ')}`,
                ],
              }]
            : undefined,
      },
      equationLatex,
      planner.resolvedLatex,
      planner.badges,
      classifyEquationRuntimeAdvisories({ invalidRequest: true }),
    );
  }

  if (targetResolution.status === 'parameterized-unsupported') {
    if (targetResolution.selectedTarget) {
      const parameterizedLinear = solveParameterizedLinearEquation(
        equationLatex,
        targetResolution.selectedTarget,
      );

      if (parameterizedLinear.kind === 'success') {
        const outcome: DisplayOutcome = {
          kind: 'success',
          title: 'Solve',
          exactLatex: parameterizedLinear.exactLatex,
          exactSupplementLatex: parameterizedLinear.exactSupplementLatex,
          detailSections: parameterizedLinear.detailSections,
          warnings: [],
          resultOrigin: 'symbolic',
        };

        return attachEquationRuntimeEnvelope(
          outcome,
          equationLatex,
          planner.resolvedLatex,
          planner.badges,
          classifyEquationRuntimeAdvisories({ outcome }),
        );
      }

      return attachEquationRuntimeEnvelope(
        {
          kind: 'error',
          title: 'Solve',
          error: 'This parameterized equation is outside EQUATION-PARAM1 affine/linear target solving.',
          warnings: [],
          detailSections: [{
            title: 'Solve Target',
            lines: [
              `Detected variables: ${targetResolution.candidates.map((candidate) => candidate.name).join(', ')}`,
              `Selected target: ${targetResolution.selectedTarget}`,
            ],
          }, {
            title: 'Parameterized Boundary',
            lines: [parameterizedLinear.message],
          }],
        },
        equationLatex,
        planner.resolvedLatex,
        planner.badges,
        classifyEquationRuntimeAdvisories({ invalidRequest: true }),
      );
    }

    return attachEquationRuntimeEnvelope(
      {
        kind: 'error',
        title: 'Solve',
        error: targetResolution.message ?? 'Parameterized target solving is planned for a later milestone.',
        warnings: [],
        detailSections: [{
          title: 'Solve Target',
          lines: [
            `Detected variables: ${targetResolution.candidates.map((candidate) => candidate.name).join(', ')}`,
            targetResolution.selectedTarget
              ? `Selected target: ${targetResolution.selectedTarget}`
              : 'No solve target is selected.',
          ],
        }],
      },
      equationLatex,
      planner.resolvedLatex,
      planner.badges,
      classifyEquationRuntimeAdvisories({ invalidRequest: true }),
    );
  }

  const solveTarget = targetResolution.selectedTarget ?? 'x';
  let sharedResolvedLatex = planner.resolvedLatex;
  let preprocessSupplementLatex: string[] | undefined;
  let preprocessDomainConstraints: SolveDomainConstraint[] | undefined;

  try {
    const preprocess = normalizeExactPowerLogNode(
      ce.parse(planner.resolvedLatex).json,
      'equation-preprocess',
    );
    if (
      preprocess
      && (
        preprocess.normalizedLatex.replace(/\s+/g, '') !== planner.resolvedLatex.replace(/\s+/g, '')
        || preprocess.exactSupplementLatex.length > 0
      )
    ) {
      sharedResolvedLatex = preprocess.normalizedLatex;
      preprocessSupplementLatex =
        preprocess.exactSupplementLatex.length > 0 ? preprocess.exactSupplementLatex : undefined;
      preprocessDomainConstraints =
        preprocess.conditionConstraints.length > 0 ? preprocess.conditionConstraints : undefined;
    }
  } catch {
    // Keep the original resolved equation when bounded preprocessing cannot parse cleanly.
  }

  const solverOriginalLatex = retargetEquationLatexToX(equationLatex, solveTarget);
  const solverResolvedLatex = retargetEquationLatexToX(sharedResolvedLatex, solveTarget);
  const solverSupplementLatex = solveTarget === 'x'
    ? preprocessSupplementLatex
    : preprocessSupplementLatex?.map((entry) => entry.replace(/\b[a-zA-Z]\b/g, (match) =>
      match === solveTarget ? 'x' : match));
  const solverDomainConstraints = retargetDomainConstraintsToX(
    preprocessDomainConstraints,
    solveTarget,
  );

  const outcome = rewriteEquationOutcomeTarget(
    runSharedEquationSolve({
      originalLatex: solverOriginalLatex,
      resolvedLatex: solverResolvedLatex,
      angleUnit,
      outputStyle,
      ansLatex,
      numericInterval,
      domainConstraints: solverDomainConstraints,
      exactSupplementLatex: solverSupplementLatex,
    }),
    solveTarget,
  );

  return attachEquationRuntimeEnvelope(
    outcome,
    equationLatex,
    sharedResolvedLatex,
    planner.badges,
    classifyEquationRuntimeAdvisories({ outcome }),
  );
}

type RunEquationAlgebraTransformRequest = {
  action: AlgebraTransformAction;
  equationLatex: string;
  angleUnit: AngleUnit;
};

export function runEquationAlgebraTransform({
  action,
  equationLatex,
  angleUnit,
}: RunEquationAlgebraTransformRequest): DisplayOutcome {
  const title = getAlgebraTransformLabel(action);

  if (containsNonEqualityRelation(equationLatex)) {
    return attachEquationRuntimeEnvelope(
      {
        kind: 'error',
        title,
        error: 'Equation algebra transforms currently work only on = equations.',
        warnings: [],
      },
      equationLatex,
      equationLatex,
      undefined,
      classifyEquationRuntimeAdvisories({ invalidRequest: true }),
    );
  }

  const planner = planMathExecution(equationLatex, {
    mode: 'equation',
    intent: 'equation-solve',
    angleUnit,
    screenHint: 'symbolic',
  });

  if (planner.kind === 'blocked') {
    return attachEquationRuntimeEnvelope(
      {
        kind: 'error',
        title,
        error: planner.error,
        warnings: [],
      },
      equationLatex,
      planner.canonicalLatex,
      planner.badges,
      classifyPlannerBlockedRuntimeAdvisories(planner, 'equation'),
    );
  }

  const analysis = analyzeLatex(planner.resolvedLatex);
  if (analysis.kind !== 'equation' || isRelationalOperator(analysis.topLevelOperator)) {
    return attachEquationRuntimeEnvelope(
      {
        kind: 'error',
        title,
        error: 'Enter a symbolic = equation before using an explicit algebra transform.',
        warnings: [],
      },
      equationLatex,
      planner.resolvedLatex,
      planner.badges,
      classifyEquationRuntimeAdvisories({ invalidRequest: true }),
    );
  }

  const result = applyEquationTransform(planner.resolvedLatex, action);
  if (!result) {
    return attachEquationRuntimeEnvelope(
      {
        kind: 'error',
        title,
        error: 'No explicit algebra transform is available for this equation yet.',
        warnings: [],
      },
      equationLatex,
      planner.resolvedLatex,
      planner.badges,
      classifyEquationRuntimeAdvisories({
        outcome: {
          kind: 'error',
          title,
          error: 'No explicit algebra transform is available for this equation yet.',
          warnings: [],
        },
      }),
    );
  }

  return attachEquationRuntimeEnvelope(
    {
      kind: 'success',
      title,
      exactLatex: result.exactLatex,
      exactSupplementLatex:
        result.exactSupplementLatex && result.exactSupplementLatex.length > 0
          ? result.exactSupplementLatex
          : undefined,
      warnings: [],
      resultOrigin: 'symbolic-engine',
      transformBadges: result.transformBadges,
      transformSummaryText: result.transformSummaryText,
      transformSummaryLatex: result.transformSummaryLatex,
    },
    equationLatex,
    planner.resolvedLatex,
    planner.badges,
    classifyEquationRuntimeAdvisories({
      outcome: {
        kind: 'success',
        title,
        exactLatex: result.exactLatex,
        exactSupplementLatex:
          result.exactSupplementLatex && result.exactSupplementLatex.length > 0
            ? result.exactSupplementLatex
            : undefined,
        warnings: [],
        resultOrigin: 'symbolic-engine',
        transformBadges: result.transformBadges,
        transformSummaryText: result.transformSummaryText,
        transformSummaryLatex: result.transformSummaryLatex,
      },
    }),
  );
}

export function runEquationMode({
  equationScreen,
  equationLatex,
  equationSolveTarget,
  quadraticCoefficients,
  cubicCoefficients,
  quarticCoefficients,
  system2,
  system3,
  angleUnit,
  outputStyle,
  ansLatex,
  numericInterval,
}: RunEquationModeRequest): DisplayOutcome {
  if (equationScreen === 'linear2') {
    return solveSystem(system2, 2);
  }

  if (equationScreen === 'linear3') {
    return solveSystem(system3, 3);
  }

  if (equationScreen === 'quadratic') {
    return solvePolynomial('quadratic', quadraticCoefficients, angleUnit, outputStyle, ansLatex);
  }

  if (equationScreen === 'cubic') {
    return solvePolynomial('cubic', cubicCoefficients, angleUnit, outputStyle, ansLatex);
  }

  if (equationScreen === 'quartic') {
    return solvePolynomial('quartic', quarticCoefficients, angleUnit, outputStyle, ansLatex);
  }

  if (equationScreen === 'symbolic') {
    return solveSymbolicEquation(
      equationLatex,
      angleUnit,
      outputStyle,
      ansLatex,
      equationSolveTarget,
      numericInterval,
    );
  }

  return {
    kind: 'error',
    title: 'Equation',
    error: 'Choose an equation tool before solving.',
    warnings: [],
  };
}
