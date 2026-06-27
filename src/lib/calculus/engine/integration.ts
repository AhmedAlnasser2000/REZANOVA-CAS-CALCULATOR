import { formatApproxNumber, latexToApproxText, numberToLatex } from '../../display/format';
import { getResultGuardError } from '../../engine/result-guard';
import { checkRealIntervalSafety, type IntervalDomainCheck } from '../../algebra/domain-range-core';
import { assumptionFactsFromDomainCheck } from '../../algebra/assumption-adapters';
import {
  buildComputeEngineIntegrationCandidate,
  resolveSymbolicIntegralFromAst,
  type IntegrationCandidateMetadata,
} from '../../symbolic-engine/integration';
import type { DisplayDetailSection, ResultOrigin } from '../../../types/calculator';
import { integrateAdaptiveSimpson } from './adaptive-simpson';
import { backcheckAntiderivative } from './verification';
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

function partialFractionReadbackDetail(
  candidate: IntegrationCandidateMetadata | undefined,
): DisplayDetailSection | undefined {
  if (candidate?.method !== 'partial-fractions') {
    return undefined;
  }

  return {
    title: 'Partial Fractions',
    lines: [
      'The shared polynomial/rational core decomposed this rational expression before integration.',
      'Bounded support covers distinct or repeated rational linear factors and irreducible quadratic factors.',
      'The resulting antiderivative still had to pass the derivative backcheck.',
    ],
  };
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

function evaluateAntiderivativeAtBounds(input: {
  antiderivativeLatex: string;
  variable: string;
  lower: number;
  upper: number;
}) {
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

    return {
      exactLatex: exact.latex,
      approxText,
    };
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

  return {
    exactLatex: computed.latex,
    approxText: latexToApproxText((computed.N?.() ?? computed).latex),
    warnings: [],
    resultOrigin: origin,
    integrationStrategy: 'compute-engine',
    integrationCandidate: buildComputeEngineIntegrationCandidate(body, backcheck),
    antiderivativeBackcheck: backcheck,
  };
}

export function resolveIndefiniteIntegralFromAst(input: {
  body: unknown;
  variable: string;
  computed?: BoxedLike;
  unresolvedComputeEngine: boolean;
  computeEngineOrigin: ResultOrigin;
  unsupportedError: string;
  normalizeRuleLatex?: boolean;
}): CalculusCoreEvaluation {
  const symbolicEngine = resolveSymbolicIntegralFromAst(input.body, input.variable);
  if (symbolicEngine.kind === 'success') {
    const partialFractionDetail = partialFractionReadbackDetail(symbolicEngine.candidate);
    const shouldNormalizeRuleLatex =
      input.normalizeRuleLatex && symbolicEngine.candidate?.method !== 'partial-fractions';
    return {
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
        partialFractionDetail ? [partialFractionDetail] : undefined,
        antiderivativeTrustFacts(symbolicEngine.verification),
      ),
    };
  }

  const computed = resolvedComputeEngineIntegral(
    input.computed,
    input.unresolvedComputeEngine,
    input.computeEngineOrigin,
    input.body,
    input.variable,
  );
  if (computed) {
    return computed;
  }

  return {
    warnings: [],
    error: input.unsupportedError,
    integrationCandidate: symbolicEngine.candidate,
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

  const computed = computeEngineIndefiniteIntegral(input.body, input.variable);
  const antiderivative = resolveIndefiniteIntegralFromAst({
    body: input.body,
    variable: input.variable,
    computed: computed.computed,
    unresolvedComputeEngine: computed.unresolved,
    computeEngineOrigin: 'symbolic',
    unsupportedError: 'A verified antiderivative was not available for exact definite integration.',
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
