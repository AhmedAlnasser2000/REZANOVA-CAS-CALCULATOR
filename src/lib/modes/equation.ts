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
import {
  analyzeVariablesFromLatex,
  expandImplicitCharacterProductsInLatex,
} from '../algebra/variable-core';
import { hasUnsafeSymbolicOutput } from '../display/symbolic-output-hygiene';
import { runExpressionAction } from '../engine/math-engine';
import { analyzeLatex, isRelationalOperator } from '../engine/math-analysis';
import {
  runSharedEquationSolve,
  runSharedEquationSolveWithTraceAsync,
  type SharedSolveRequest,
} from '../equation/shared-solve';
import { runGuardedDirectSymbolicFallback } from '../equation/guarded-solve';
import {
  buildEquationOoePilotMetadata,
  buildEquationProvenance,
  buildEquationSolveControlFromOoe,
  equationPilotDefinition,
  prepareEquationOoePilot,
  type EquationOoePilotMetadata,
  type EquationRuntimeHostExecution,
} from '../ooe/equation-pilot';
import {
  type OoeRuntimeEnvelope,
} from '../ooe/runtime-envelope';
import { runOoeRuntimeJob } from '../ooe/runtime-coordinator';
import {
  buildOoeInputRevisionId,
  type OoeJobContextOptions,
} from '../ooe/job-contract';
import { solveParameterizedLinearEquation } from '../equation/equation-parameterized-linear';
import { solveParameterizedPolynomialEquation } from '../equation/equation-parameterized-polynomial';
import { solveParameterizedRationalEquation } from '../equation/equation-parameterized-rational';
import { solveParameterizedFactorablePolynomialEquation } from '../equation/equation-parameterized-factorable-polynomial';
import { solveParameterizedCarrierEquation } from '../equation/equation-parameterized-carrier';
import { solveParameterizedCompositionEquation } from '../equation/equation-parameterized-composition';
import { solveParameterizedExpLogEquation } from '../equation/equation-parameterized-exp-log';
import { solveParameterizedMixedAlgebraicEquation } from '../equation/equation-parameterized-mixed-algebraic';
import { solveParameterizedTrigEquation } from '../equation/equation-parameterized-trig';
import { buildParameterizedBoundaryReadback } from '../equation/equation-parameterized-readback';
import { solveEquationAlgebraicIsolation } from '../equation/equation-algebraic-isolation';
import { solveBoundedComplexEquation } from '../equation/equation-complex';
import {
  isTopLevelInequalityLatex,
  solveBoundedLinearInequality,
} from '../equation/equation-inequality';
import {
  isolateSelectedTargetEquation,
  solveSelectedTargetIsolationEquation,
} from '../equation/equation-selected-target-isolation';
import { solvePolynomialSystem2x2 } from '../equation/equation-polynomial-system';
import {
  applyStoredVariableSubstitutions,
  ignoredStoredValuePolicyLines,
  resolveStoredValueModePolicy,
  storedValueReadbackSections,
  type StoredVariableSubstitutionResult,
} from '../algebra/variable-memory';
import { normalizeExplicitNamedVariablesInLatex } from '../algebra/named-variable';
import {
  canonicalizeMathInput,
  normalizeRelationOperatorLatex,
} from '../input/input-canonicalization';
import {
  formatNamedEquationOutcomeTarget,
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
import {
  buildPolynomialEquationLatex,
  normalizedPolynomialCoefficients,
  POLYNOMIAL_VIEW_META,
} from './equation-ui-model';
import type {
  AngleUnit,
  ComplexExactForm,
  DisplayOutcome,
  EquationAnswerMode,
  EquationDomainIntent,
  EquationScreen,
  NumericSolveInterval,
  OutputStyle,
  PlannerBadge,
  PolynomialEquationView,
  SolveDomainConstraint,
  StoredVariableValue,
  VariableSubstitutionSnapshot,
} from '../../types/calculator';

const ce = new ComputeEngine();
export {
  buildPolynomialEquationLatex,
  DEFAULT_POLYNOMIAL_COEFFICIENTS,
  equationInputLatexForScreen,
  POLYNOMIAL_VIEW_META,
} from './equation-ui-model';

type SharedEquationSolveRunner = (request: SharedSolveRequest) => DisplayOutcome;
type AsyncSharedEquationSolveRunner = (request: SharedSolveRequest) => Promise<DisplayOutcome>;

class AsyncSharedSolveCapture extends Error {
  request: SharedSolveRequest;

  constructor(request: SharedSolveRequest) {
    super('Async shared Equation solve requested.');
    this.request = request;
  }
}

export type RunEquationModeRequest = {
  equationScreen: EquationScreen;
  equationLatex: string;
  equationSolveTarget?: string | null;
  equationAnswerMode?: EquationAnswerMode;
  equationDomainIntent?: EquationDomainIntent;
  complexExactForm?: ComplexExactForm;
  quadraticCoefficients: number[];
  cubicCoefficients: number[];
  quarticCoefficients: number[];
  polynomialSystem2Latex: readonly [string, string];
  system2: number[][];
  system3: number[][];
  angleUnit: AngleUnit;
  outputStyle: OutputStyle;
  ansLatex: string;
  numericInterval?: NumericSolveInterval;
  storedVariables?: readonly StoredVariableValue[];
  variableSubstitutionSnapshot?: readonly VariableSubstitutionSnapshot[];
  sharedSolveRunner?: SharedEquationSolveRunner;
};

export function buildEquationOoeSnapshot(request: RunEquationModeRequest) {
  return {
    route: request.numericInterval ? 'numeric-interval' : 'symbolic',
    request,
  };
}

function canonicalizeEquationLatexForOoeRevision(latex: string) {
  const canonicalized = canonicalizeMathInput(latex, { mode: 'equation' });
  return (canonicalized.ok ? canonicalized.canonicalLatex : latex)
    .replace(/\\left\s*/gu, '')
    .replace(/\\right\s*/gu, '');
}

function buildEquationOoeRevisionSnapshot(request: RunEquationModeRequest) {
  return {
    route: request.numericInterval ? 'numeric-interval' : 'symbolic',
    request: {
      ...request,
      equationLatex: canonicalizeEquationLatexForOoeRevision(request.equationLatex),
    },
  };
}

export function buildEquationOoeInputRevisionId(
  request: RunEquationModeRequest,
): string {
  return buildOoeInputRevisionId(
    'equation.solve',
    buildEquationOoeRevisionSnapshot(request),
  );
}

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

function withStoredValueDetails(
  outcome: DisplayOutcome,
  input: {
    substitution: StoredVariableSubstitutionResult;
    target?: string;
    interval?: NumericSolveInterval;
    originalLatex: string;
    replayedSnapshot: boolean;
    ignoredLines?: readonly string[];
  },
): DisplayOutcome {
  const storedValueDetails = storedValueReadbackSections({
    substitutions: input.substitution.substitutions,
    protectedSubstitutions: input.substitution.protectedSubstitutions,
    protectedNameDescriptions: input.target ? { [input.target]: 'the solve target' } : {},
    originalLatex: input.originalLatex,
    effectiveLatex: input.substitution.latex,
    effectiveLabel: input.target ? `Effective equation for ${input.target}` : 'Effective equation',
    replayedSnapshot: input.replayedSnapshot,
    ignoredLines: input.ignoredLines,
  });

  if (storedValueDetails.length === 0 || outcome.kind === 'prompt') {
    return outcome;
  }

  const intervalText = input.interval ? `[${input.interval.start}, ${input.interval.end}]` : 'the chosen interval';
  const scopedNoRootError =
    outcome.kind === 'error'
    && input.target
    && input.interval
    && input.substitution.substitutions.length > 0
    && /No bracketed or near-zero real roots were found on the chosen interval\./u.test(outcome.error ?? '')
      ? `No real root for ${input.target} was found inside ${intervalText} for the substituted equation ${input.substitution.latex}. Try widening the interval, shifting the interval center, or increasing subdivisions.`
      : undefined;

  const nextOutcome = {
    ...outcome,
    ...(scopedNoRootError ? { error: scopedNoRootError } : {}),
    detailSections: [
      ...storedValueDetails,
      ...(outcome.detailSections ?? []),
    ],
  };

  return nextOutcome.kind === 'success' && input.substitution.substitutions.length > 0
    ? { ...nextOutcome, variableSubstitutions: [...input.substitution.substitutions] }
    : nextOutcome;
}

function unsafeSymbolicReadbackOutcome(target?: string): DisplayOutcome {
  return {
    kind: 'error',
    title: 'Solve',
    error: 'The exact symbolic readback became unsafe to display.',
    warnings: [],
    detailSections: [
      {
        title: 'Why It Stopped',
        lines: [
          target
            ? `The symbolic solver produced an internal fragment while formatting the exact result for ${target}.`
            : 'The symbolic solver produced an internal fragment while formatting the exact result.',
        ],
      },
      {
        title: 'What To Try',
        lines: [
          'Re-run after rewriting ambiguous products with explicit multiplication, choose a simpler target, or use numeric interval solve for a local answer.',
        ],
      },
    ],
  };
}

function ensureSafeEquationSuccessOutcome(outcome: DisplayOutcome, target?: string): DisplayOutcome {
  return outcome.kind === 'success' && hasUnsafeSymbolicOutput(outcome)
    ? unsafeSymbolicReadbackOutcome(target)
    : outcome;
}

function withEquationAnswerMode(outcome: DisplayOutcome, answerMode: EquationAnswerMode): DisplayOutcome {
  return outcome.kind === 'prompt' ? outcome : { ...outcome, answerMode };
}

function finalizeSelectedTargetSymbolicOutcome(outcome: DisplayOutcome, target: string): DisplayOutcome {
  return ensureSafeEquationSuccessOutcome(formatNamedEquationOutcomeTarget(outcome, target), target);
}

function approximateModeNeedsIntervalOutcome(): DisplayOutcome {
  return {
    kind: 'error',
    title: 'Solve',
    error: 'Approximate answer mode needs a numeric interval before it can search for real roots.',
    warnings: [],
    detailSections: [
      {
        title: 'Answer Mode',
        lines: ['Answer mode: Approximate.'],
      },
      {
        title: 'What To Try',
        lines: [
          'Open Numeric Interval Solve, choose a valid start and end, then run again.',
          'Use Exact or Isolate when you want symbolic rearrangement instead.',
        ],
      },
    ],
    answerMode: 'approximate',
  };
}

function approximateModeNeedsNumericParametersOutcome(parameters: string[]): DisplayOutcome {
  const parameterText = parameters.join(', ');
  return {
    kind: 'error',
    title: 'Solve',
    error: `Approximate answer mode needs numeric values for every non-target parameter before it can search for real roots. Remaining symbolic parameters: ${parameterText}.`,
    warnings: [],
    detailSections: [
      {
        title: 'Answer Mode',
        lines: ['Answer mode: Approximate.'],
      },
      {
        title: 'Why It Stopped',
        lines: [
          'Numeric interval solve needs a one-variable real-valued equation after stored-value substitution.',
        ],
      },
      {
        title: 'What To Try',
        lines: [
          `Store numeric values for ${parameterText}, then run Approximate again.`,
          'Use Exact or Isolate when you want symbolic parameters preserved.',
        ],
      },
    ],
    answerMode: 'approximate',
  };
}

function exactModeNeedsExactOutcome(target?: string): DisplayOutcome {
  return {
    kind: 'error',
    title: 'Solve',
    error: 'Exact answer mode could not produce a trustworthy exact closed form.',
    warnings: [],
    detailSections: [
      {
        title: 'Answer Mode',
        lines: ['Answer mode: Exact.'],
      },
      {
        title: 'Why It Stopped',
        lines: [
          'The available solver path produced only a numeric or approximate result, which belongs in Approximate mode.',
        ],
      },
      {
        title: 'What To Try',
        lines: [
          'Use Approximate with a numeric interval for numeric roots.',
          target
            ? `Use Isolate when you want a rearranged formula for ${target}.`
            : 'Use Isolate when you want symbolic rearrangement.',
        ],
      },
    ],
    answerMode: 'exact',
  };
}

function containsExplicitImaginaryUnit(latex: string) {
  return /\\imaginaryI(?![A-Za-z])|(^|[^\\A-Za-z])i(?=$|[^A-Za-z])/u.test(latex);
}

function containsTargetNode(node: unknown, target: string): boolean {
  if (node === target) {
    return true;
  }
  if (Array.isArray(node)) {
    return node.some((part) => containsTargetNode(part, target));
  }
  if (node && typeof node === 'object') {
    return Object.values(node).some((part) => containsTargetNode(part, target));
  }
  return false;
}

function containsTargetedAbsNode(node: unknown, target: string): boolean {
  if (!Array.isArray(node)) {
    return false;
  }
  if (node[0] === 'Abs' && containsTargetNode(node, target)) {
    return true;
  }
  return node.some((part) => containsTargetedAbsNode(part, target));
}

function containsTargetedAbsLatex(latex: string, target: string) {
  try {
    return containsTargetedAbsNode(ce.parse(latex).json, target);
  } catch {
    return false;
  }
}

function complexIntentRequiredOutcome(): DisplayOutcome {
  return {
    kind: 'error',
    title: 'Solve',
    error: 'This Equation input uses the imaginary unit. Enable Complex before asking for a complex-domain exact answer.',
    warnings: [],
    detailSections: [
      {
        title: 'Complex Input',
        lines: [
          'The symbol i is reserved as the imaginary unit in Equation input.',
          'Complex Off keeps Equation solving real-first.',
        ],
      },
      {
        title: 'What To Try',
        lines: [
          'Turn Complex On for bounded exact complex Equation answers.',
          'Use a different symbol if you intended i to be a real variable.',
        ],
      },
    ],
    answerMode: 'exact',
  };
}

function unsupportedComplexPreimageOutcome(): DisplayOutcome {
  return {
    kind: 'error',
    title: 'Solve',
    error: 'This complex equation is outside the supported guarded complex preimage families.',
    warnings: [],
    detailSections: [
      {
        title: 'Complex Preimage Route',
        lines: [
          'Complex Exact currently supports bounded algebraic, rational, log/exp, and two-trig-layer preimages.',
          'Absolute-value complex equations are deferred because they usually describe loci or condition sets rather than finite branches.',
        ],
      },
      {
        title: 'What To Try',
        lines: [
          'Use Complex On with one selected target and exact numeric constants.',
          'Use a real-domain equation or turn Complex Off when you want the older real absolute-value route.',
        ],
      },
    ],
    answerMode: 'exact',
  };
}

function exactModeShouldRejectNumericOnlyOutcome(outcome: DisplayOutcome) {
  return outcome.kind === 'success'
    && (
      outcome.resultOrigin === 'numeric-fallback'
      || (Boolean(outcome.approxText) && !outcome.exactLatex)
    );
}

function finalizeSharedSymbolicOutcome(input: {
  sharedOutcome: DisplayOutcome;
  solveTarget: string;
  answerMode: EquationAnswerMode;
  equationLatex: string;
  sharedResolvedLatex: string;
  plannerBadges?: PlannerBadge[];
}): DisplayOutcome {
  const outcome = ensureSafeEquationSuccessOutcome(rewriteEquationOutcomeTarget(
    input.sharedOutcome,
    input.solveTarget,
  ), input.solveTarget);
  const finalOutcome = input.answerMode === 'exact' && exactModeShouldRejectNumericOnlyOutcome(outcome)
    ? exactModeNeedsExactOutcome(input.solveTarget)
    : outcome;

  return attachEquationRuntimeEnvelope(
    finalOutcome,
    input.equationLatex,
    input.sharedResolvedLatex,
    input.plannerBadges,
    classifyEquationRuntimeAdvisories({ outcome: finalOutcome }),
  );
}

function remainingApproximateModeParameters(latex: string, target?: string) {
  const analysis = analyzeVariablesFromLatex(latex, { allowSymbolicParameters: true });
  return analysis.symbols
    .filter((symbol) => symbol.name !== target)
    .filter((symbol) =>
      symbol.identifierKind === 'single-symbol-variable'
      || symbol.identifierKind === 'named-variable'
      || symbol.identifierKind === 'indexed-symbol-variable')
    .map((symbol) => symbol.name);
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

function containsNonEqualityRelation(latex: string) {
  const normalizedLatex = normalizeRelationOperatorLatex(latex);
  return /\\(?:le|ge|ne)(?![A-Za-z])|[<>]/.test(normalizedLatex);
}

function solvePolynomial(
  screen: PolynomialEquationView,
  coefficients: number[],
  angleUnit: AngleUnit,
  outputStyle: OutputStyle,
  ansLatex: string,
  equationDomainIntent: EquationDomainIntent = 'real',
): DisplayOutcome {
  const meta = POLYNOMIAL_VIEW_META[screen];
  const normalized = normalizedPolynomialCoefficients(coefficients, meta.degree + 1);

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

  const hasComplexRoots = numericRoots.roots.some((root) => Math.abs(root.im) > 1e-10);
  return {
    kind: 'success',
    title: meta.title,
    exactLatex: complexSolutionsToLatex('x', numericRoots.roots),
    approxText: complexSolutionsToApproxText('x', numericRoots.roots),
    warnings: ['Symbolic solve unavailable; showing numeric roots.'],
    resultOrigin: 'numeric-fallback',
    ...(equationDomainIntent === 'complex' && hasComplexRoots ? { answerDomain: 'complex' as const } : {}),
  };
}

function solveSymbolicEquation(
  equationLatex: string,
  angleUnit: AngleUnit,
  outputStyle: OutputStyle,
  ansLatex: string,
  equationSolveTarget?: string | null,
  numericInterval?: NumericSolveInterval,
  answerMode: EquationAnswerMode = 'exact',
  equationDomainIntent: EquationDomainIntent = 'real',
  complexExactForm: ComplexExactForm = 'rectangular',
  sharedSolveRunner: SharedEquationSolveRunner = runSharedEquationSolve,
): DisplayOutcome {
  if (isTopLevelInequalityLatex(equationLatex)) {
    const inequalityOutcome = solveBoundedLinearInequality({
      equationLatex,
      target: equationSolveTarget,
      answerMode,
      equationDomainIntent,
      angleUnit,
      outputStyle,
    });
    return attachEquationRuntimeEnvelope(
      inequalityOutcome,
      equationLatex,
      equationLatex,
      undefined,
      classifyEquationRuntimeAdvisories({
        outcome: inequalityOutcome,
        invalidRequest: inequalityOutcome.kind !== 'success',
      }),
    );
  }

  if (containsNonEqualityRelation(equationLatex)) {
    return attachEquationRuntimeEnvelope(
      {
        kind: 'error',
        title: 'Solve',
        error: 'Equation mode currently solves only = equations. Inequalities and ≠ relations are planned for a later update.',
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
        error: 'Equation mode currently solves only = equations. Inequalities and ≠ relations are planned for a later update.',
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

  if (
    answerMode === 'exact'
    && equationDomainIntent !== 'complex'
    && containsExplicitImaginaryUnit(equationLatex)
  ) {
    const outcome = complexIntentRequiredOutcome();
    return attachEquationRuntimeEnvelope(
      outcome,
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
    const hasAmbiguousAdjacentProduct = targetResolution.analysis.implicitCharacterProducts.some((product) =>
      new Set(product.characters).size > 1);
    if (targetResolution.status === 'unsupported' && hasAmbiguousAdjacentProduct) {
      const detectedVariables = targetResolution.candidates.map((candidate) => candidate.name);
      const readback = buildParameterizedBoundaryReadback({
        reason: 'ambiguous-adjacent-product',
        message: targetResolution.message ?? '',
        target: equationSolveTarget ?? targetResolution.selectedTarget ?? detectedVariables[0] ?? 'selected target',
        detectedVariables,
        equationLatex,
      });

      return attachEquationRuntimeEnvelope(
        {
          kind: 'error',
          title: 'Solve',
          error: readback.error,
          warnings: [],
          detailSections: readback.detailSections,
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

  if (answerMode === 'isolate' && targetResolution.selectedTarget) {
    const parameterizedOptions = {
      allowGeneratedImplicitProducts: targetResolution.analysis.implicitCharacterProducts.some((product) =>
        new Set(product.characters).size > 1),
    };
    const parameterizedSourceLatex = normalizeExplicitNamedVariablesInLatex(equationLatex).latex;
    const parameterizedEquationLatex = parameterizedOptions.allowGeneratedImplicitProducts
      ? expandImplicitCharacterProductsInLatex(parameterizedSourceLatex)
      : parameterizedSourceLatex;
    const isolated = isolateSelectedTargetEquation(
      parameterizedEquationLatex,
      targetResolution.selectedTarget,
      angleUnit,
      parameterizedOptions,
    );

    if (isolated.kind === 'success') {
      const outcome: DisplayOutcome = {
        kind: 'success',
        title: 'Solve',
        exactLatex: isolated.exactLatex,
        exactSupplementLatex: isolated.exactSupplementLatex,
        detailSections: isolated.detailSections,
        warnings: [],
        resultOrigin: 'symbolic',
      };

      const finalOutcome = finalizeSelectedTargetSymbolicOutcome(outcome, targetResolution.selectedTarget);

      return attachEquationRuntimeEnvelope(
        finalOutcome,
        equationLatex,
        planner.resolvedLatex,
        planner.badges,
        classifyEquationRuntimeAdvisories({ outcome: finalOutcome }),
      );
    }

    const detectedVariables = targetResolution.candidates.map((candidate) => candidate.name);
    const readback = buildParameterizedBoundaryReadback({
      reason: isolated.reason,
      message: isolated.message,
      target: targetResolution.selectedTarget,
      detectedVariables,
      equationLatex: parameterizedEquationLatex,
    });

    return attachEquationRuntimeEnvelope(
      {
        kind: 'error',
        title: 'Solve',
        error: readback.error,
        warnings: [],
        detailSections: [
          {
            title: 'Answer Mode',
            lines: ['Answer mode: Isolate.'],
          },
          ...readback.detailSections,
        ],
      },
      equationLatex,
      planner.resolvedLatex,
      planner.badges,
      classifyEquationRuntimeAdvisories({ invalidRequest: true }),
    );
  }

  if (targetResolution.status === 'parameterized-unsupported') {
    if (targetResolution.selectedTarget) {
      const parameterizedOptions = {
        allowGeneratedImplicitProducts: targetResolution.analysis.implicitCharacterProducts.some((product) =>
          new Set(product.characters).size > 1),
      };
      const parameterizedSourceLatex = normalizeExplicitNamedVariablesInLatex(equationLatex).latex;
      const parameterizedEquationLatex = parameterizedOptions.allowGeneratedImplicitProducts
        ? expandImplicitCharacterProductsInLatex(parameterizedSourceLatex)
        : parameterizedSourceLatex;

      if (answerMode === 'exact' && equationDomainIntent === 'complex' && !numericInterval) {
        const boundedComplex = solveBoundedComplexEquation(
          parameterizedEquationLatex,
          targetResolution.selectedTarget,
          {
            ...parameterizedOptions,
            outputStyle,
            complexExactForm,
            angleUnit,
          },
        );

        if (boundedComplex) {
          const outcome: DisplayOutcome = {
            kind: 'success',
            title: 'Solve',
            exactLatex: boundedComplex.exactLatex,
            branchReadback: boundedComplex.branchReadback,
            approxText: boundedComplex.approxText,
            exactSupplementLatex: boundedComplex.exactSupplementLatex,
            detailSections: boundedComplex.detailSections,
            warnings: [],
            resultOrigin: 'symbolic',
            answerDomain: 'complex',
          };

          const finalOutcome = finalizeSelectedTargetSymbolicOutcome(outcome, targetResolution.selectedTarget);

          return attachEquationRuntimeEnvelope(
            finalOutcome,
            equationLatex,
            planner.resolvedLatex,
            planner.badges,
            classifyEquationRuntimeAdvisories({ outcome: finalOutcome }),
          );
        }

        if (
          containsExplicitImaginaryUnit(parameterizedEquationLatex)
          || containsTargetedAbsLatex(parameterizedEquationLatex, targetResolution.selectedTarget)
        ) {
          const boundaryOutcome = unsupportedComplexPreimageOutcome();
          return attachEquationRuntimeEnvelope(
            boundaryOutcome,
            equationLatex,
            planner.resolvedLatex,
            planner.badges,
            classifyEquationRuntimeAdvisories({ invalidRequest: true }),
          );
        }
      }

      const parameterizedLinear = solveParameterizedLinearEquation(
        parameterizedEquationLatex,
        targetResolution.selectedTarget,
        parameterizedOptions,
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

        const finalOutcome = finalizeSelectedTargetSymbolicOutcome(outcome, targetResolution.selectedTarget);

        return attachEquationRuntimeEnvelope(
          finalOutcome,
          equationLatex,
          planner.resolvedLatex,
          planner.badges,
          classifyEquationRuntimeAdvisories({ outcome: finalOutcome }),
        );
      }

      const parameterizedPolynomial = solveParameterizedPolynomialEquation(
        parameterizedEquationLatex,
        targetResolution.selectedTarget,
        parameterizedOptions,
      );

      if (parameterizedPolynomial.kind === 'success') {
        const outcome: DisplayOutcome = {
          kind: 'success',
          title: 'Solve',
          exactLatex: parameterizedPolynomial.exactLatex,
          branchReadback: parameterizedPolynomial.branchReadback,
          exactSupplementLatex: parameterizedPolynomial.exactSupplementLatex,
          detailSections: parameterizedPolynomial.detailSections,
          warnings: [],
          resultOrigin: 'symbolic',
        };

        const finalOutcome = finalizeSelectedTargetSymbolicOutcome(outcome, targetResolution.selectedTarget);

        return attachEquationRuntimeEnvelope(
          finalOutcome,
          equationLatex,
          planner.resolvedLatex,
          planner.badges,
          classifyEquationRuntimeAdvisories({ outcome: finalOutcome }),
        );
      }

      const parameterizedRational = solveParameterizedRationalEquation(
        parameterizedEquationLatex,
        targetResolution.selectedTarget,
        parameterizedOptions,
      );

      if (parameterizedRational.kind === 'success') {
        const outcome: DisplayOutcome = {
          kind: 'success',
          title: 'Solve',
          exactLatex: parameterizedRational.exactLatex,
          branchReadback: parameterizedRational.branchReadback,
          exactSupplementLatex: parameterizedRational.exactSupplementLatex,
          detailSections: parameterizedRational.detailSections,
          warnings: [],
          resultOrigin: 'symbolic',
        };

        const finalOutcome = finalizeSelectedTargetSymbolicOutcome(outcome, targetResolution.selectedTarget);

        return attachEquationRuntimeEnvelope(
          finalOutcome,
          equationLatex,
          planner.resolvedLatex,
          planner.badges,
          classifyEquationRuntimeAdvisories({ outcome: finalOutcome }),
        );
      }

      const parameterizedFactorablePolynomial = solveParameterizedFactorablePolynomialEquation(
        parameterizedEquationLatex,
        targetResolution.selectedTarget,
        parameterizedOptions,
      );

      if (parameterizedFactorablePolynomial.kind === 'success') {
        const outcome: DisplayOutcome = {
          kind: 'success',
          title: 'Solve',
          exactLatex: parameterizedFactorablePolynomial.exactLatex,
          branchReadback: parameterizedFactorablePolynomial.branchReadback,
          exactSupplementLatex: parameterizedFactorablePolynomial.exactSupplementLatex,
          detailSections: parameterizedFactorablePolynomial.detailSections,
          warnings: [],
          resultOrigin: 'symbolic',
        };

        const finalOutcome = finalizeSelectedTargetSymbolicOutcome(outcome, targetResolution.selectedTarget);

        return attachEquationRuntimeEnvelope(
          finalOutcome,
          equationLatex,
          planner.resolvedLatex,
          planner.badges,
          classifyEquationRuntimeAdvisories({ outcome: finalOutcome }),
        );
      }

      const parameterizedCarrier = solveParameterizedCarrierEquation(
        parameterizedEquationLatex,
        targetResolution.selectedTarget,
        parameterizedOptions,
      );

      if (parameterizedCarrier.kind === 'success') {
        const outcome: DisplayOutcome = {
          kind: 'success',
          title: 'Solve',
          exactLatex: parameterizedCarrier.exactLatex,
          branchReadback: parameterizedCarrier.branchReadback,
          exactSupplementLatex: parameterizedCarrier.exactSupplementLatex,
          detailSections: parameterizedCarrier.detailSections,
          warnings: [],
          resultOrigin: 'symbolic',
        };

        const finalOutcome = finalizeSelectedTargetSymbolicOutcome(outcome, targetResolution.selectedTarget);

        return attachEquationRuntimeEnvelope(
          finalOutcome,
          equationLatex,
          planner.resolvedLatex,
          planner.badges,
          classifyEquationRuntimeAdvisories({ outcome: finalOutcome }),
        );
      }

      const parameterizedAlgebraicIsolation = solveEquationAlgebraicIsolation(
        parameterizedEquationLatex,
        targetResolution.selectedTarget,
        parameterizedOptions,
      );

      if (parameterizedAlgebraicIsolation.kind === 'success') {
        const outcome: DisplayOutcome = {
          kind: 'success',
          title: 'Solve',
          exactLatex: parameterizedAlgebraicIsolation.exactLatex,
          branchReadback: parameterizedAlgebraicIsolation.branchReadback,
          exactSupplementLatex: parameterizedAlgebraicIsolation.exactSupplementLatex,
          detailSections: parameterizedAlgebraicIsolation.detailSections,
          warnings: [],
          resultOrigin: 'symbolic',
          ...(parameterizedAlgebraicIsolation.answerDomain
            ? { answerDomain: parameterizedAlgebraicIsolation.answerDomain }
            : {}),
        };

        const finalOutcome = finalizeSelectedTargetSymbolicOutcome(outcome, targetResolution.selectedTarget);

        return attachEquationRuntimeEnvelope(
          finalOutcome,
          equationLatex,
          planner.resolvedLatex,
          planner.badges,
          classifyEquationRuntimeAdvisories({ outcome: finalOutcome }),
        );
      }

      const parameterizedExpLog = solveParameterizedExpLogEquation(
        parameterizedEquationLatex,
        targetResolution.selectedTarget,
        parameterizedOptions,
      );

      if (parameterizedExpLog.kind === 'success') {
        const outcome: DisplayOutcome = {
          kind: 'success',
          title: 'Solve',
          exactLatex: parameterizedExpLog.exactLatex,
          branchReadback: parameterizedExpLog.branchReadback,
          exactSupplementLatex: parameterizedExpLog.exactSupplementLatex,
          detailSections: parameterizedExpLog.detailSections,
          warnings: [],
          resultOrigin: 'symbolic',
        };

        const finalOutcome = finalizeSelectedTargetSymbolicOutcome(outcome, targetResolution.selectedTarget);

        return attachEquationRuntimeEnvelope(
          finalOutcome,
          equationLatex,
          planner.resolvedLatex,
          planner.badges,
          classifyEquationRuntimeAdvisories({ outcome: finalOutcome }),
        );
      }

      const parameterizedTrig = solveParameterizedTrigEquation(
        parameterizedEquationLatex,
        targetResolution.selectedTarget,
        angleUnit,
        parameterizedOptions,
      );

      if (parameterizedTrig.kind === 'success') {
        const outcome: DisplayOutcome = {
          kind: 'success',
          title: 'Solve',
          exactLatex: parameterizedTrig.exactLatex,
          exactSupplementLatex: parameterizedTrig.exactSupplementLatex,
          detailSections: parameterizedTrig.detailSections,
          warnings: [],
          resultOrigin: 'symbolic',
        };

        const finalOutcome = finalizeSelectedTargetSymbolicOutcome(outcome, targetResolution.selectedTarget);

        return attachEquationRuntimeEnvelope(
          finalOutcome,
          equationLatex,
          planner.resolvedLatex,
          planner.badges,
          classifyEquationRuntimeAdvisories({ outcome: finalOutcome }),
        );
      }

      const parameterizedComposition = solveParameterizedCompositionEquation(
        parameterizedEquationLatex,
        targetResolution.selectedTarget,
        angleUnit,
        parameterizedOptions,
      );

      if (parameterizedComposition.kind === 'success') {
        const outcome: DisplayOutcome = {
          kind: 'success',
          title: 'Solve',
          exactLatex: parameterizedComposition.exactLatex,
          branchReadback: parameterizedComposition.branchReadback,
          exactSupplementLatex: parameterizedComposition.exactSupplementLatex,
          detailSections: parameterizedComposition.detailSections,
          warnings: [],
          resultOrigin: 'symbolic',
        };

        const finalOutcome = finalizeSelectedTargetSymbolicOutcome(outcome, targetResolution.selectedTarget);

        return attachEquationRuntimeEnvelope(
          finalOutcome,
          equationLatex,
          planner.resolvedLatex,
          planner.badges,
          classifyEquationRuntimeAdvisories({ outcome: finalOutcome }),
        );
      }

      const parameterizedMixedAlgebraic = solveParameterizedMixedAlgebraicEquation(
        parameterizedEquationLatex,
        targetResolution.selectedTarget,
        parameterizedOptions,
      );

      if (parameterizedMixedAlgebraic.kind === 'success') {
        const outcome: DisplayOutcome = {
          kind: 'success',
          title: 'Solve',
          exactLatex: parameterizedMixedAlgebraic.exactLatex,
          branchReadback: parameterizedMixedAlgebraic.branchReadback,
          exactSupplementLatex: parameterizedMixedAlgebraic.exactSupplementLatex,
          detailSections: parameterizedMixedAlgebraic.detailSections,
          warnings: [],
          resultOrigin: 'symbolic',
        };

        const finalOutcome = finalizeSelectedTargetSymbolicOutcome(outcome, targetResolution.selectedTarget);

        return attachEquationRuntimeEnvelope(
          finalOutcome,
          equationLatex,
          planner.resolvedLatex,
          planner.badges,
          classifyEquationRuntimeAdvisories({ outcome: finalOutcome }),
        );
      }

      const selectedTargetIsolation = solveSelectedTargetIsolationEquation(
        parameterizedEquationLatex,
        targetResolution.selectedTarget,
        angleUnit,
        parameterizedOptions,
      );

      if (selectedTargetIsolation.kind === 'success') {
        const outcome: DisplayOutcome = {
          kind: 'success',
          title: 'Solve',
          exactLatex: selectedTargetIsolation.exactLatex,
          exactSupplementLatex: selectedTargetIsolation.exactSupplementLatex,
          detailSections: selectedTargetIsolation.detailSections,
          warnings: [],
          resultOrigin: 'symbolic',
        };

        const finalOutcome = finalizeSelectedTargetSymbolicOutcome(outcome, targetResolution.selectedTarget);

        return attachEquationRuntimeEnvelope(
          finalOutcome,
          equationLatex,
          planner.resolvedLatex,
          planner.badges,
          classifyEquationRuntimeAdvisories({ outcome: finalOutcome }),
        );
      }

      let boundaryStop: { reason: string; message: string } = {
        reason: parameterizedPolynomial.reason,
        message: parameterizedPolynomial.message,
      };
      if (parameterizedComposition.reason !== 'no-composition') {
        boundaryStop = {
          reason: parameterizedComposition.reason,
          message: parameterizedComposition.message,
        };
      } else if (parameterizedMixedAlgebraic.reason !== 'no-mixed-algebraic') {
        boundaryStop = {
          reason: parameterizedMixedAlgebraic.reason,
          message: parameterizedMixedAlgebraic.message,
        };
      } else if (parameterizedTrig.reason !== 'no-trig') {
        boundaryStop = {
          reason: parameterizedTrig.reason,
          message: parameterizedTrig.message,
        };
      } else if (parameterizedExpLog.reason !== 'no-exp-log') {
        boundaryStop = {
          reason: parameterizedExpLog.reason,
          message: parameterizedExpLog.message,
        };
      } else if (parameterizedCarrier.reason !== 'no-carrier') {
        boundaryStop = {
          reason: parameterizedCarrier.reason,
          message: parameterizedCarrier.message,
        };
      } else if (parameterizedRational.reason !== 'not-rational') {
        boundaryStop = {
          reason: parameterizedRational.reason,
          message: parameterizedRational.message,
        };
      } else if (parameterizedFactorablePolynomial.reason !== 'not-factorable') {
        boundaryStop = {
          reason: parameterizedFactorablePolynomial.reason,
          message: parameterizedFactorablePolynomial.message,
        };
      }
      if (
        selectedTargetIsolation.reason !== 'no-isolation'
        && !(
          selectedTargetIsolation.reason === 'multiple-target-islands'
          && boundaryStop.reason === 'mixed-carriers'
        )
      ) {
        boundaryStop = {
          reason: selectedTargetIsolation.reason,
          message: selectedTargetIsolation.message,
        };
      }
      const detectedVariables = targetResolution.candidates.map((candidate) => candidate.name);
      const readback = buildParameterizedBoundaryReadback({
        ...boundaryStop,
        target: targetResolution.selectedTarget,
        detectedVariables,
        equationLatex,
      });

      return attachEquationRuntimeEnvelope(
        {
          kind: 'error',
          title: 'Solve',
          error: readback.error,
          warnings: [],
          detailSections: readback.detailSections,
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
        error: targetResolution.message ?? 'Choose a solve target before solving this multi-symbol equation.',
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

  if (answerMode === 'exact' && equationDomainIntent === 'complex' && !numericInterval) {
    const parameterizedOptions = {
      allowGeneratedImplicitProducts: targetResolution.analysis.implicitCharacterProducts.some((product) =>
        new Set(product.characters).size > 1),
    };
    const parameterizedSourceLatex = normalizeExplicitNamedVariablesInLatex(equationLatex).latex;
    const parameterizedEquationLatex = parameterizedOptions.allowGeneratedImplicitProducts
      ? expandImplicitCharacterProductsInLatex(parameterizedSourceLatex)
      : parameterizedSourceLatex;
    const boundedComplex = solveBoundedComplexEquation(
      parameterizedEquationLatex,
      solveTarget,
      {
        ...parameterizedOptions,
        outputStyle,
        complexExactForm,
        angleUnit,
      },
    );

    if (boundedComplex) {
      const outcome: DisplayOutcome = {
        kind: 'success',
        title: 'Solve',
        exactLatex: boundedComplex.exactLatex,
        branchReadback: boundedComplex.branchReadback,
        approxText: boundedComplex.approxText,
        exactSupplementLatex: boundedComplex.exactSupplementLatex,
        detailSections: boundedComplex.detailSections,
        warnings: [],
        resultOrigin: 'symbolic',
        answerDomain: 'complex',
      };

      const finalOutcome = finalizeSelectedTargetSymbolicOutcome(outcome, solveTarget);

      return attachEquationRuntimeEnvelope(
        finalOutcome,
        equationLatex,
        planner.resolvedLatex,
        planner.badges,
        classifyEquationRuntimeAdvisories({ outcome: finalOutcome }),
      );
    }

    if (
      containsExplicitImaginaryUnit(parameterizedEquationLatex)
      || containsTargetedAbsLatex(parameterizedEquationLatex, solveTarget)
    ) {
      const boundaryOutcome = unsupportedComplexPreimageOutcome();
      return attachEquationRuntimeEnvelope(
        boundaryOutcome,
        equationLatex,
        planner.resolvedLatex,
        planner.badges,
        classifyEquationRuntimeAdvisories({ invalidRequest: true }),
      );
    }
  }

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

  return finalizeSharedSymbolicOutcome({
    sharedOutcome: sharedSolveRunner({
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
    answerMode,
    equationLatex,
    sharedResolvedLatex,
    plannerBadges: planner.badges,
  });
}

async function solveSymbolicEquationAsync(
  equationLatex: string,
  angleUnit: AngleUnit,
  outputStyle: OutputStyle,
  ansLatex: string,
  equationSolveTarget: string | null | undefined,
  numericInterval: NumericSolveInterval | undefined,
  answerMode: EquationAnswerMode,
  equationDomainIntent: EquationDomainIntent,
  complexExactForm: ComplexExactForm,
  sharedSolveRunner: AsyncSharedEquationSolveRunner,
): Promise<DisplayOutcome> {
  try {
    return solveSymbolicEquation(
      equationLatex,
      angleUnit,
      outputStyle,
      ansLatex,
      equationSolveTarget,
      numericInterval,
      answerMode,
      equationDomainIntent,
      complexExactForm,
      (request) => {
        throw new AsyncSharedSolveCapture(request);
      },
    );
  } catch (error) {
    if (!(error instanceof AsyncSharedSolveCapture)) {
      throw error;
    }

    const planner = planMathExecution(equationLatex, {
      mode: 'equation',
      intent: 'equation-solve',
      angleUnit,
      screenHint: 'symbolic',
    });
    const targetResolution = resolveEquationSolveTarget(equationLatex, equationSolveTarget);
    const solveTarget = targetResolution.selectedTarget ?? equationSolveTarget ?? 'x';
    const sharedOutcome = await sharedSolveRunner(error.request);

    return finalizeSharedSymbolicOutcome({
      sharedOutcome,
      solveTarget,
      answerMode,
      equationLatex,
      sharedResolvedLatex: error.request.resolvedLatex,
      plannerBadges: planner.kind === 'blocked' ? undefined : planner.badges,
    });
  }
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

  const outcome = ensureSafeEquationSuccessOutcome({
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
  });

  return attachEquationRuntimeEnvelope(
    outcome,
    equationLatex,
    planner.resolvedLatex,
    planner.badges,
    classifyEquationRuntimeAdvisories({ outcome }),
  );
}

export function runEquationMode({
  equationScreen,
  equationLatex,
  equationSolveTarget,
  equationAnswerMode = 'exact',
  equationDomainIntent = 'real',
  complexExactForm = 'rectangular',
  quadraticCoefficients,
  cubicCoefficients,
  quarticCoefficients,
  polynomialSystem2Latex,
  system2,
  system3,
  angleUnit,
  outputStyle,
  ansLatex,
  numericInterval,
  storedVariables,
  variableSubstitutionSnapshot,
  sharedSolveRunner,
}: RunEquationModeRequest): DisplayOutcome {
  if (equationScreen === 'linear2') {
    return solveSystem(system2, 2);
  }

  if (equationScreen === 'linear3') {
    return solveSystem(system3, 3);
  }

  if (equationScreen === 'polynomialSystem2') {
    return solvePolynomialSystem2x2(polynomialSystem2Latex, {
      storedVariables,
    });
  }

  if (equationScreen === 'quadratic') {
    return solvePolynomial('quadratic', quadraticCoefficients, angleUnit, outputStyle, ansLatex, equationDomainIntent);
  }

  if (equationScreen === 'cubic') {
    return solvePolynomial('cubic', cubicCoefficients, angleUnit, outputStyle, ansLatex, equationDomainIntent);
  }

  if (equationScreen === 'quartic') {
    return solvePolynomial('quartic', quarticCoefficients, angleUnit, outputStyle, ansLatex, equationDomainIntent);
  }

  if (equationScreen === 'symbolic') {
    const hasTopLevelInequality = isTopLevelInequalityLatex(equationLatex);
    if (equationAnswerMode === 'approximate' && !numericInterval && !hasTopLevelInequality) {
      return approximateModeNeedsIntervalOutcome();
    }

    const namedNormalizedEquationLatex = normalizeExplicitNamedVariablesInLatex(equationLatex).latex;
    const substitutionSource = variableSubstitutionSnapshot ?? storedVariables;
    const targetResolution = numericInterval
      ? resolveEquationSolveTarget(equationLatex, equationSolveTarget)
      : null;
    const protectedTarget = targetResolution?.selectedTarget ?? equationSolveTarget ?? undefined;
    const storedValuePolicy =
      numericInterval && protectedTarget
        ? resolveStoredValueModePolicy({
            mode: 'equation',
            action: 'equation-numeric-solve',
            protectedNames: [protectedTarget],
            protectedNameDescriptions: { [protectedTarget]: 'the solve target' },
          })
        : resolveStoredValueModePolicy({
            mode: 'equation',
            action: 'equation-symbolic-solve',
          });
    const substitution =
      storedValuePolicy.kind === 'apply'
        ? applyStoredVariableSubstitutions(equationLatex, substitutionSource, {
            protectedNames: storedValuePolicy.protectedNames,
          })
        : { latex: namedNormalizedEquationLatex, substitutions: [], protectedSubstitutions: [] };
    if (equationAnswerMode === 'approximate' && numericInterval && !hasTopLevelInequality) {
      const remainingParameters = remainingApproximateModeParameters(substitution.latex, protectedTarget);
      if (remainingParameters.length > 0) {
        return withStoredValueDetails(approximateModeNeedsNumericParametersOutcome(remainingParameters), {
          substitution,
          target: protectedTarget,
          interval: numericInterval,
          originalLatex: equationLatex,
          replayedSnapshot: Boolean(variableSubstitutionSnapshot),
          ignoredLines: ignoredStoredValuePolicyLines({
            latex: equationLatex,
            entries: substitutionSource,
            policy: storedValuePolicy,
          }),
        });
      }
    }
    const outcome = solveSymbolicEquation(
      substitution.latex,
      angleUnit,
      outputStyle,
      ansLatex,
      equationSolveTarget,
      numericInterval,
      equationAnswerMode,
      equationDomainIntent,
      complexExactForm,
      sharedSolveRunner,
    );

    return withEquationAnswerMode(withStoredValueDetails(outcome, {
      substitution,
      target: protectedTarget,
      interval: numericInterval,
      originalLatex: equationLatex,
      replayedSnapshot: Boolean(variableSubstitutionSnapshot),
      ignoredLines: ignoredStoredValuePolicyLines({
        latex: equationLatex,
        entries: substitutionSource,
        policy: storedValuePolicy,
      }),
    }), equationAnswerMode);
  }

  return {
    kind: 'error',
    title: 'Equation',
    error: 'Choose an equation tool before solving.',
    warnings: [],
  };
}

async function runEquationModeWithAsyncSharedSolve(
  request: RunEquationModeRequest,
  asyncSharedSolveRunner: AsyncSharedEquationSolveRunner,
): Promise<DisplayOutcome> {
  if (request.equationScreen !== 'symbolic') {
    return runEquationMode(request);
  }

  const {
    equationLatex,
    equationSolveTarget,
    equationAnswerMode = 'exact',
    equationDomainIntent = 'real',
    complexExactForm = 'rectangular',
    angleUnit,
    outputStyle,
    ansLatex,
    numericInterval,
    storedVariables,
    variableSubstitutionSnapshot,
  } = request;

  const hasTopLevelInequality = isTopLevelInequalityLatex(equationLatex);
  if (equationAnswerMode === 'approximate' && !numericInterval && !hasTopLevelInequality) {
    return approximateModeNeedsIntervalOutcome();
  }

  const namedNormalizedEquationLatex = normalizeExplicitNamedVariablesInLatex(equationLatex).latex;
  const substitutionSource = variableSubstitutionSnapshot ?? storedVariables;
  const targetResolution = numericInterval
    ? resolveEquationSolveTarget(equationLatex, equationSolveTarget)
    : null;
  const protectedTarget = targetResolution?.selectedTarget ?? equationSolveTarget ?? undefined;
  const storedValuePolicy =
    numericInterval && protectedTarget
      ? resolveStoredValueModePolicy({
          mode: 'equation',
          action: 'equation-numeric-solve',
          protectedNames: [protectedTarget],
          protectedNameDescriptions: { [protectedTarget]: 'the solve target' },
        })
      : resolveStoredValueModePolicy({
          mode: 'equation',
          action: 'equation-symbolic-solve',
        });
  const substitution =
    storedValuePolicy.kind === 'apply'
      ? applyStoredVariableSubstitutions(equationLatex, substitutionSource, {
          protectedNames: storedValuePolicy.protectedNames,
        })
      : { latex: namedNormalizedEquationLatex, substitutions: [], protectedSubstitutions: [] };
  if (equationAnswerMode === 'approximate' && numericInterval && !hasTopLevelInequality) {
    const remainingParameters = remainingApproximateModeParameters(substitution.latex, protectedTarget);
    if (remainingParameters.length > 0) {
      return withStoredValueDetails(approximateModeNeedsNumericParametersOutcome(remainingParameters), {
        substitution,
        target: protectedTarget,
        interval: numericInterval,
        originalLatex: equationLatex,
        replayedSnapshot: Boolean(variableSubstitutionSnapshot),
        ignoredLines: ignoredStoredValuePolicyLines({
          latex: equationLatex,
          entries: substitutionSource,
          policy: storedValuePolicy,
        }),
      });
    }
  }

  const outcome = await solveSymbolicEquationAsync(
    substitution.latex,
    angleUnit,
    outputStyle,
    ansLatex,
    equationSolveTarget,
    numericInterval,
    equationAnswerMode,
    equationDomainIntent,
    complexExactForm,
    asyncSharedSolveRunner,
  );

  return withEquationAnswerMode(withStoredValueDetails(outcome, {
    substitution,
    target: protectedTarget,
    interval: numericInterval,
    originalLatex: equationLatex,
    replayedSnapshot: Boolean(variableSubstitutionSnapshot),
    ignoredLines: ignoredStoredValuePolicyLines({
      latex: equationLatex,
      entries: substitutionSource,
      policy: storedValuePolicy,
    }),
  }), equationAnswerMode);
}

export type EquationModeOoePilotRunResult = {
  payload: DisplayOutcome;
  ooe: EquationOoePilotMetadata;
};

export type EquationModeIsolatedWorkerRunResult = {
  payload: DisplayOutcome;
  guardedTrace?: EquationOoePilotMetadata['guardedTrace'];
};

export async function runEquationModeForIsolatedWorker(
  request: RunEquationModeRequest,
): Promise<EquationModeIsolatedWorkerRunResult> {
  let guardedTrace: EquationOoePilotMetadata['guardedTrace'];
  const payload = await runEquationModeWithAsyncSharedSolve(
    request,
    async (sharedRequest) => {
      const traced = await runSharedEquationSolveWithTraceAsync(sharedRequest);
      guardedTrace = traced.trace;
      return traced.outcome;
    },
  );

  return {
    payload,
    guardedTrace,
  };
}

export async function runEquationModeWithOoePilot(
  request: RunEquationModeRequest,
  options?: OoeJobContextOptions,
): Promise<OoeRuntimeEnvelope<DisplayOutcome, EquationOoePilotMetadata>> {
  let guardedTrace: EquationOoePilotMetadata['guardedTrace'];
  let runtimeHostExecution: EquationRuntimeHostExecution | undefined;
  const routeSnapshot = buildEquationOoeRevisionSnapshot(request);

  return runOoeRuntimeJob({
    definition: equationPilotDefinition(),
    routeLabel: 'equation.solve',
    routeSnapshot,
    options,
    prepareStatus: prepareEquationOoePilot,
    run: async (controlContext) => {
      const { runEquationModeViaIsolatedWorker } = await import('./equation-worker-client');
      const result = await runEquationModeViaIsolatedWorker(
        request,
        controlContext,
        {
          fallback: async () => {
            const payload = await runEquationModeWithAsyncSharedSolve(
              request,
              async (sharedRequest) => {
                const control = buildEquationSolveControlFromOoe(controlContext);
                const traced = await runSharedEquationSolveWithTraceAsync(sharedRequest, {
                  control,
                  directSymbolicRunner: async (input) => {
                    const { runEquationDirectSymbolicViaIsolatedWorker } = await import(
                      '../equation/equation-direct-symbolic-worker-client'
                    );
                    return runEquationDirectSymbolicViaIsolatedWorker(
                      {
                        request: input.request,
                        depth: input.depth,
                      },
                      controlContext,
                      {
                        fallback: () => runGuardedDirectSymbolicFallback(input.request),
                      },
                    );
                  },
                });
                guardedTrace = traced.trace;
                return traced.outcome;
              },
            );
            return {
              payload,
              guardedTrace,
            };
          },
        },
      );
      guardedTrace = result.guardedTrace;
      runtimeHostExecution = result.hostExecution;
      return result.payload;
    },
    buildMetadata: ({ status, jobContext, controlTraceEvents }) => buildEquationOoePilotMetadata(
      status,
      guardedTrace,
      routeSnapshot,
      options,
      jobContext,
      controlTraceEvents,
      runtimeHostExecution,
    ),
    buildProvenance: ({ payload, metadata, routeSnapshot }) => buildEquationProvenance({
      payload,
      metadata,
      routeSnapshot,
    }),
  });
}
