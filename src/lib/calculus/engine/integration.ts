import { formatApproxNumber, latexToApproxText, numberToLatex } from '../../display/format';
import { getResultGuardError } from '../../engine/result-guard';
import { checkRealIntervalSafety, type IntervalDomainCheck } from '../../algebra/domain-range-core';
import { assumptionFactsFromDomainCheck } from '../../algebra/assumption-adapters';
import {
  buildComputeEngineIntegrationCandidate,
  collectIntegrationDomainHazards,
  INTEGRATION_RELATION_INTEGRAND_ERROR,
  resolveSymbolicIntegralFromAst,
  type IntegrationCandidateMetadata,
} from '../../symbolic-engine/integration';
import { parseAffine } from '../../symbolic-engine/patterns';
import type { DisplayDetailSection, ResultOrigin } from '../../../types/calculator';
import { integrateAdaptiveSimpson } from './adaptive-simpson';
import { backcheckAntiderivative } from './verification';
import {
  orchestrateTranscendentalCertificateCandidate,
} from '../../symbolic-engine/integration/transcendental-certificate/orchestrator';
import { transcendentalCertificateToCalculusEvaluation } from './transcendental-certificate';
import {
  antiderivativeTrustFacts,
  boxNode,
  ce,
  domainCheckDetails,
  evaluateBodyAt,
  integralMethodDetail,
  integralSafetyDetail,
  mergeCalculusAssumptionDetails,
  type BoxedLike,
  type CalculusCoreEvaluation,
} from './shared';
import {
  calculusDetailSection,
  calculusTextRows,
} from '../detail-readback';
import { profileCalculusResult } from '../../display/printer';

function partialFractionReadbackDetail(
  candidate: IntegrationCandidateMetadata | undefined,
): DisplayDetailSection | undefined {
  if (candidate?.method !== 'partial-fractions') {
    return undefined;
  }

  return calculusDetailSection(
    'Partial Fractions',
    calculusTextRows([
      'The shared polynomial/rational core decomposed this rational expression before integration.',
      'Bounded support covers distinct or repeated rational linear factors and irreducible quadratic factors.',
      'The resulting antiderivative still had to pass the derivative backcheck.',
    ]),
  );
}

function trustedAntiderivative(backcheck: CalculusCoreEvaluation['antiderivativeBackcheck']) {
  return backcheck?.status === 'verified-exact'
    || backcheck?.status === 'verified-numeric-confidence';
}

function computeEngineIndefiniteIntegral(body: unknown, variable: string) {
  try {
    const bodyLatex = boxNode(body).latex;
    const parsed = ce.parse(`\\int ${bodyLatex}\\,d${variable}`) as BoxedLike;
    const computed = parsed.evaluate();
    const unresolved =
      computed.latex === parsed.latex
      || computed.latex.includes('\\int');
    return { computed, unresolved };
  } catch {
    return { computed: undefined, unresolved: true };
  }
}

function astNodeCount(node: unknown): number {
  if (!Array.isArray(node)) {
    return 1;
  }
  return 1 + node.slice(1).reduce((total, child) => total + astNodeCount(child), 0);
}

const COMPUTE_ENGINE_CONSTANT_SYMBOLS = new Set([
  'ExponentialE',
  'ImaginaryUnit',
  'Infinity',
  'NaN',
  'Pi',
]);

function collectAstSymbols(node: unknown, symbols = new Set<string>()) {
  if (typeof node === 'string') {
    if (!COMPUTE_ENGINE_CONSTANT_SYMBOLS.has(node)) {
      symbols.add(node);
    }
    return symbols;
  }

  if (Array.isArray(node)) {
    for (const child of node.slice(1)) {
      collectAstSymbols(child, symbols);
    }
  }

  return symbols;
}

function shouldAttemptComputeEngineIndefiniteFallback(body: unknown, variable: string) {
  if (astNodeCount(body) > 80) {
    return false;
  }

  const symbols = collectAstSymbols(body);
  return [...symbols].every((symbol) => symbol === variable);
}

function evaluateAntiderivativeAtBounds(input: {
  antiderivativeLatex: string;
  variable: string;
  lower: number;
  upper: number;
}): Pick<CalculusCoreEvaluation, 'exactLatex' | 'approxText' | 'error'> {
  try {
    const antiderivative = ce.parse(input.antiderivativeLatex) as BoxedLike;
    const upper = antiderivative.subs({ [input.variable]: input.upper });
    const lower = antiderivative.subs({ [input.variable]: input.lower });
    const difference = ce.box(
      ['Subtract', upper.json, lower.json] as Parameters<typeof ce.box>[0],
    ) as BoxedLike;
    const exact = difference.simplify?.() ?? difference.evaluate();
    const numeric = exact.N?.() ?? exact.evaluate();
    const approxText = latexToApproxText(numeric.latex);
    const guardError = getResultGuardError(exact.latex, approxText);
    if (guardError) {
      return { error: guardError };
    }

    return profileCalculusResult({
      exactLatex: exact.latex,
      approxText,
    });
  } catch {
    return {
      error: 'This definite integral could not be evaluated reliably in this milestone.',
    };
  }
}

function normalizeExactLatex(latex: string) {
  return (ce.parse(latex) as BoxedLike).latex;
}

function resolvedComputeEngineIntegral(
  computed: BoxedLike | undefined,
  unresolvedComputeEngine: boolean,
  origin: ResultOrigin,
  body: unknown,
  variable: string,
): CalculusCoreEvaluation | undefined {
  if (!computed || unresolvedComputeEngine) {
    return undefined;
  }

  const backcheck = backcheckAntiderivative({
    antiderivativeLatex: computed.latex,
    integrand: body,
    variable,
  });

  return profileCalculusResult({
    exactLatex: computed.latex,
    approxText: latexToApproxText((computed.N?.() ?? computed).latex),
    warnings: [],
    resultOrigin: origin,
    integrationStrategy: 'compute-engine',
    integrationCandidate: buildComputeEngineIntegrationCandidate(body, backcheck),
    antiderivativeBackcheck: backcheck,
  });
}

function resolvedTranscendentalCertificate(
  body: unknown,
  variable: string,
): CalculusCoreEvaluation | undefined {
  const orchestrated = orchestrateTranscendentalCertificateCandidate(body, variable);
  return orchestrated.kind === 'success'
    ? transcendentalCertificateToCalculusEvaluation(orchestrated.certificate)
    : undefined;
}

export function resolveIndefiniteIntegralFromAst(input: {
  body: unknown;
  variable: string;
  computed?: BoxedLike;
  unresolvedComputeEngine?: boolean;
  computeEngineFallback?: () => { computed?: BoxedLike; unresolved: boolean };
  computeEngineOrigin: ResultOrigin;
  unsupportedError: string;
  normalizeRuleLatex?: boolean;
  recognitionGates?: boolean;
  performanceBudgetMs?: number;
}): CalculusCoreEvaluation {
  const startedAt = Date.now();
  const symbolicEngine = resolveSymbolicIntegralFromAst(input.body, input.variable, {
    recognitionGates: input.recognitionGates,
  });
  if (symbolicEngine.kind === 'success') {
    const partialFractionDetail = partialFractionReadbackDetail(symbolicEngine.candidate);
    const integrationDetails = [
      ...(symbolicEngine.detailSections ?? []),
      ...(partialFractionDetail ? [partialFractionDetail] : []),
    ];
    const shouldNormalizeRuleLatex =
      input.normalizeRuleLatex && symbolicEngine.candidate?.method !== 'partial-fractions';
    return profileCalculusResult({
      exactLatex: shouldNormalizeRuleLatex
        ? normalizeExactLatex(symbolicEngine.exactLatex)
        : symbolicEngine.exactLatex,
      exactSupplementLatex: symbolicEngine.exactSupplementLatex,
      warnings: [],
      resultOrigin: symbolicEngine.origin,
      integrationStrategy: symbolicEngine.strategy,
      integrationCandidate: symbolicEngine.candidate,
      antiderivativeBackcheck: symbolicEngine.verification,
      detailSections: mergeCalculusAssumptionDetails(
        integrationDetails.length > 0 ? integrationDetails : undefined,
        antiderivativeTrustFacts(symbolicEngine.verification),
      ),
    });
  }

  const certificate = resolvedTranscendentalCertificate(input.body, input.variable);
  if (certificate) {
    return certificate;
  }

  const computed = resolvedComputeEngineIntegral(
    input.computed,
    input.unresolvedComputeEngine ?? true,
    input.computeEngineOrigin,
    input.body,
    input.variable,
  );
  if (computed) {
    return computed;
  }

  const performanceBoundary = integrationPerformanceBoundary(input.body, input.variable, {
    elapsedMs: Date.now() - startedAt,
    budgetMs: input.performanceBudgetMs,
  });
  if (performanceBoundary) {
    return performanceBoundary;
  }

  if (
    input.computeEngineFallback
    && shouldAttemptComputeEngineIndefiniteFallback(input.body, input.variable)
  ) {
    const fallback = input.computeEngineFallback();
    const fallbackComputed = resolvedComputeEngineIntegral(
      fallback.computed,
      fallback.unresolved,
      input.computeEngineOrigin,
      input.body,
      input.variable,
    );
    if (fallbackComputed) {
      return fallbackComputed;
    }
  }

  return {
    warnings: [],
    error: symbolicEngine.error === INTEGRATION_RELATION_INTEGRAND_ERROR
      ? symbolicEngine.error
      : input.unsupportedError,
    integrationCandidate: symbolicEngine.candidate,
    detailSections: symbolicEngine.detailSections,
  };
}

function scalarNumber(node: unknown): number | undefined {
  if (typeof node === 'number' && Number.isFinite(node)) {
    return node;
  }
  return undefined;
}

function isSquareOfAffine(node: unknown, variable: string) {
  return Array.isArray(node)
    && node[0] === 'Power'
    && scalarNumber(node[2]) === 2
    && parseAffine(node[1], variable);
}

function signedRadicandTerms(node: unknown, sign: 1 | -1 = 1): Array<{ node: unknown; sign: 1 | -1 }> {
  if (Array.isArray(node) && node[0] === 'Add') {
    return node.slice(1).flatMap((term) => signedRadicandTerms(term, sign));
  }

  if (Array.isArray(node) && node[0] === 'Subtract') {
    const [first, ...rest] = node.slice(1);
    return [
      ...(first === undefined ? [] : signedRadicandTerms(first, sign)),
      ...rest.flatMap((term) => signedRadicandTerms(term, sign === 1 ? -1 : 1)),
    ];
  }

  if (Array.isArray(node) && node[0] === 'Negate' && node.length === 2) {
    return signedRadicandTerms(node[1], sign === 1 ? -1 : 1);
  }

  return [{ node, sign }];
}

function isAffineTrigSubstitutionRadicand(node: unknown, variable: string) {
  let constantCount = 0;
  let squareCount = 0;

  for (const term of signedRadicandTerms(node)) {
    if (scalarNumber(term.node) !== undefined) {
      constantCount += 1;
      continue;
    }
    if (isSquareOfAffine(term.node, variable)) {
      squareCount += 1;
      continue;
    }
    return false;
  }

  return constantCount === 1 && squareCount === 1;
}

function containsAffineTrigSubstitutionRadical(node: unknown, variable: string): boolean {
  if (!Array.isArray(node) || node.length === 0) {
    return false;
  }

  if (node[0] === 'Sqrt' && node.length === 2 && isAffineTrigSubstitutionRadicand(node[1], variable)) {
    return true;
  }

  return node.slice(1).some((child) => containsAffineTrigSubstitutionRadical(child, variable));
}

function performanceBoundaryCandidate(body: unknown): IntegrationCandidateMetadata {
  return {
    method: 'unsupported',
    requiredPrerequisites: ['compute-engine'],
    blockedPrerequisites: ['compute-engine'],
    verificationStatus: 'not-attempted',
    controlledFailureClass: 'performance-boundary',
    readinessNotes: [
      'Calculus stopped before invoking a heavy symbolic fallback for this indefinite integral.',
      'A future local exact route may replace this performance boundary after derivative backcheck.',
    ],
    domainHazards: collectIntegrationDomainHazards(body),
  };
}

function integrationPerformanceBoundary(
  body: unknown,
  variable: string,
  timing: { elapsedMs: number; budgetMs?: number },
): CalculusCoreEvaluation | undefined {
  const exhaustedBudget = timing.budgetMs !== undefined && timing.elapsedMs >= timing.budgetMs;
  const knownHeavyFamily = containsAffineTrigSubstitutionRadical(body, variable);
  if (!exhaustedBudget && !knownHeavyFamily) {
    return undefined;
  }

  return {
    warnings: [],
    error: 'This antiderivative was stopped before a heavy symbolic fallback in Calculus.',
    integrationCandidate: performanceBoundaryCandidate(body),
    detailSections: [calculusDetailSection(
      'Integration Performance Boundary',
      calculusTextRows([
        exhaustedBudget
          ? `Stopped before Compute Engine fallback after using the ${timing.budgetMs} ms integration budget.`
          : 'Stopped before Compute Engine fallback because this affine trig-substitution radical family is known to be slow without a local route.',
        'No partial antiderivative was adopted.',
        'The case remains eligible for a future bounded exact route with derivative backcheck.',
      ]),
    )],
  };
}

export function evaluateDefiniteIntegralFromAst(input: {
  body: unknown;
  variable: string;
  lower: number;
  upper: number;
  unsupportedExactWarning?: string;
  unreliableError: string;
}): CalculusCoreEvaluation {
  const safetyCheck = checkRealIntervalSafety({
    node: input.body,
    variable: input.variable,
    lower: input.lower,
    upper: input.upper,
  });

  if (safetyCheck.kind === 'unsafe') {
    return {
      warnings: [],
      error: 'This definite integral crosses or touches a point outside the real domain on the requested interval.',
      detailSections: domainCheckDetails(
        [integralSafetyDetail(safetyCheck, input.lower, input.upper)],
        safetyCheck,
      ),
    };
  }

  const antiderivative = resolveIndefiniteIntegralFromAst({
    body: input.body,
    variable: input.variable,
    computeEngineFallback: () => computeEngineIndefiniteIntegral(input.body, input.variable),
    computeEngineOrigin: 'symbolic',
    unsupportedError: 'A verified antiderivative was not available for exact definite integration.',
    recognitionGates: false,
  });

  if (
    antiderivative.exactLatex
    && antiderivative.resultOrigin
    && trustedAntiderivative(antiderivative.antiderivativeBackcheck)
  ) {
    const evaluated = evaluateAntiderivativeAtBounds({
      antiderivativeLatex: antiderivative.exactLatex,
      variable: input.variable,
      lower: input.lower,
      upper: input.upper,
    });

    if (!evaluated.error) {
      const partialFractionDetail = partialFractionReadbackDetail(antiderivative.integrationCandidate);
      return {
        exactLatex: evaluated.exactLatex,
        approxText: evaluated.approxText,
        warnings: [],
        resultOrigin: antiderivative.resultOrigin,
        integrationStrategy: antiderivative.integrationStrategy,
        integrationCandidate: antiderivative.integrationCandidate,
        detailSections: mergeCalculusAssumptionDetails(
          [
            integralMethodDetail(
              'A verified antiderivative was evaluated at the finite bounds.',
              `Backcheck status: ${antiderivative.antiderivativeBackcheck?.status ?? 'not-checkable'}.`,
            ),
            ...(partialFractionDetail ? [partialFractionDetail] : []),
            integralSafetyDetail(safetyCheck, input.lower, input.upper),
          ],
          assumptionFactsFromDomainCheck(safetyCheck),
          antiderivativeTrustFacts(antiderivative.antiderivativeBackcheck),
        ),
      };
    }
  }

  const numeric = evaluateNumericDefiniteIntegralFromAst({
    body: input.body,
    variable: input.variable,
    lower: input.lower,
    upper: input.upper,
    unreliableError: input.unreliableError,
    safetyCheck,
  });

  if (
    numeric.resultOrigin === 'numeric-fallback'
    && input.unsupportedExactWarning
  ) {
    return {
      ...numeric,
      integrationCandidate: antiderivative.integrationCandidate,
      warnings: [input.unsupportedExactWarning, ...numeric.warnings],
    };
  }

  return {
    ...numeric,
    integrationCandidate: antiderivative.integrationCandidate,
  };
}

export function evaluateNumericDefiniteIntegralFromAst(input: {
  body: unknown;
  variable: string;
  lower: number;
  upper: number;
  unreliableError: string;
  safetyCheck?: IntervalDomainCheck;
}): CalculusCoreEvaluation {
  const safetyCheck = input.safetyCheck ?? checkRealIntervalSafety({
    node: input.body,
    variable: input.variable,
    lower: input.lower,
    upper: input.upper,
  });

  if (safetyCheck.kind === 'unsafe') {
    return {
      warnings: [],
      error: 'This definite integral crosses or touches a point outside the real domain on the requested interval.',
      detailSections: domainCheckDetails(
        [integralSafetyDetail(safetyCheck, input.lower, input.upper)],
        safetyCheck,
      ),
    };
  }

  const result = integrateAdaptiveSimpson(
    (value) => evaluateBodyAt(input.body, input.variable, value),
    input.lower,
    input.upper,
  );
  if (result.kind === 'unsafe') {
    return {
      warnings: [],
      error: 'The numeric integral became too large or too small to display safely.',
    };
  }

  if (result.kind !== 'success') {
    return {
      warnings: [],
      error: input.unreliableError,
    };
  }

  const exactLatex = numberToLatex(result.value);
  const approxText = formatApproxNumber(result.value);
  const guardError = getResultGuardError(exactLatex, approxText);
  if (guardError) {
    return { warnings: [], error: guardError };
  }

  return {
    exactLatex,
    approxText,
    warnings: ['Symbolic integral unavailable; showing a numeric definite integral.'],
    resultOrigin: 'numeric-fallback',
    mathJsonLeaves: [
      {
        canonicalLatex: exactLatex,
        mathJson: Number.parseFloat(result.value.toFixed(6)),
        source: 'calculus.definite-integral:native-numeric-result',
      },
      {
        canonicalLatex: `[${numberToLatex(Math.min(input.lower, input.upper))}, ${numberToLatex(Math.max(input.lower, input.upper))}]`,
        mathJson: ['List', Math.min(input.lower, input.upper), Math.max(input.lower, input.upper)],
        source: 'calculus.definite-integral:native-interval',
      },
    ],
    detailSections: domainCheckDetails(
      [
        integralMethodDetail(
          'No trusted symbolic antiderivative was available, so adaptive Simpson integration was used.',
          'The result remains labeled as numeric fallback.',
        ),
        integralSafetyDetail(safetyCheck, input.lower, input.upper),
      ],
      safetyCheck,
    ),
  };
}
