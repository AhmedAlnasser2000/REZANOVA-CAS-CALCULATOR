import { ComputeEngine } from '@cortex-js/compute-engine';
import {
  resolveAntiderivativeRule,
  resolveAntiderivativeRuleExpression,
} from '../../calculus/engine/antiderivative-rules';
import { standardAntiderivativeExpression } from '../../calculus/engine/antiderivative-expression';
import {
  divideByNumericCoefficient,
  isNodeArray,
  parseAffine,
  wrapGroupedLatex,
} from '../patterns';
import { tryAffinePowerRule } from './affine-power';
import { tryAlgebraicFunctionFieldOrchestrator } from './algebraic-function-field-orchestrator';
import { tryAlgebraicGenus1DegenerationFallbackRule } from './algebraic-genus1/degeneration-fallback-live';
import { tryAlgebraicGenus0RationalInRadicalRule } from './algebraic-genus0/rational-in-radical';
import { tryAlgebraicGenus0StandardRadicalRule } from './algebraic-genus0/standard-radicals';
import { tryAlgebraicGenus0SymbolicStandardRadicalRule } from './algebraic-genus0/symbolic-standard-radicals';
import {
  tryBinomialDerivativeSubstitutionRule,
  tryReciprocalBinomialDerivativeSubstitutionRule,
} from './binomial-substitution';
import { tryBoundedCarrierSubstitutionRule } from './bounded-carrier-substitution';
import {
  classifyIntegrandForm,
  INTEGRATION_ROUTE_PRECEDENCE,
  type IntegrationRouteFamily,
} from './classifier';
import { tryExpandedDirectRule } from './expanded-direct';
import { tryIntegrationByPartsRoute } from './dispatch-by-parts';
import { tryLinearCombinationFallback } from './linear-combination';
import { tryHyperbolicSquareTableRule } from './hyperbolic-table';
import { inverseTrigIntegral } from './inverse-trig';
import { tryLogPowerSubstitutionRule } from './log-power-substitution';
import { symbolicSuccess, unsupportedCandidateMetadata } from './metadata';
import { normalizeIntegrationNormalForm } from './normal-form';
import {
  isPureQuadraticDerivativeOverlap,
  tryRationalPartialFractionRule,
} from './rational';
import { tryRischNormanOrchestrator } from './risch-norman/orchestrator';
import { tryRischNormanDepth2DerivativeSubstitutionRule } from './risch-norman/depth2-substitution';
import { tryRischNormanSymbolicTrigProductToSumRule } from './risch-norman/symbolic-trig-products';
import { normalFormDetail, trigRewriteDetail } from './retry-details';
import {
  derivativeRatioIntegral,
  normalizeIntegralLatexInput,
  trySubstitutionRule,
} from './rules';
import {
  trySymbolicBinomialSubstitutionRule,
  trySymbolicDirectRule,
  trySymbolicTrigPowerDirectRule,
} from './symbolic-coefficients';
import {
  trySymbolicQuadraticLinearNumeratorRule,
  trySymbolicQuadraticReciprocalRule,
  trySymbolicQuadraticRepeatedPowerRule,
  trySymbolicTwoLinearPartialFractionRule,
} from './symbolic-rational';
import { tryScalarMultipleRetry } from './scalar-multiple-retry';
import { tryTargetFreePolynomialDirectRule } from './target-free-polynomial-direct';
import { tryTrigDerivativeProductRule } from './trig-derivative-products';
import { unsupportedTrigPowerBoundary } from './trig-power-boundary';
import { normalizeIntegrationTrigRewrite } from './trig-rewrite';
import { tryTrigSubstitutionRadicalRule } from './trig-substitution-radicals';
import type { IntegralResolution } from './types';

const ce = new ComputeEngine();
const RELATION_HEADS = new Set(['Equal', 'NotEqual', 'Less', 'LessEqual', 'Greater', 'GreaterEqual']);

export const INTEGRATION_RELATION_INTEGRAND_ERROR =
  'Calculus integrals expect an expression f(x), not an equation or relation.';

function isRelationRoot(node: unknown) {
  return isNodeArray(node) && typeof node[0] === 'string' && RELATION_HEADS.has(node[0]);
}

function containsSqrtNode(node: unknown): boolean {
  return isNodeArray(node)
    && (node[0] === 'Sqrt' || node.slice(1).some((child) => containsSqrtNode(child)));
}

function nativeStandardAntiderivative(mathJson: unknown, source: string) {
  return standardAntiderivativeExpression({ mathJson, source });
}

function tryBoundedCarrierSubstitutionRoute(node: unknown, variable: string) {
  const boundedCarrierSubstitution = tryBoundedCarrierSubstitutionRule(node, variable);
  return boundedCarrierSubstitution
    ? symbolicSuccess(node, variable, boundedCarrierSubstitution.exactLatex, 'u-substitution',
      boundedCarrierSubstitution.verification, boundedCarrierSubstitution.exactSupplementLatex,
      boundedCarrierSubstitution.detailSections,
      nativeStandardAntiderivative(
        boundedCarrierSubstitution.antiderivativeNode,
        'calculus.integration:bounded-carrier-substitution',
      ),
      undefined,
      undefined,
      boundedCarrierSubstitution.trustMode ?? 'backcheck')
    : undefined;
}

function tryRoute(
  node: unknown,
  variable: string,
  route: IntegrationRouteFamily,
  recognitionGates: boolean,
): IntegralResolution | undefined {
  if (route === 'inverse-trig') {
    const inverseTrig = inverseTrigIntegral(node, variable);
    return inverseTrig
      ? symbolicSuccess(
        node,
        variable,
        inverseTrig.exactLatex,
        'inverse-trig',
        inverseTrig.verification,
        undefined,
        undefined,
        nativeStandardAntiderivative(
          inverseTrig.antiderivativeNode,
          'calculus.integration:inverse-trig',
        ),
        undefined,
        undefined,
        'precomputed-exact',
      )
      : undefined;
  }

  if (route === 'derivative-ratio') {
    const reciprocalBinomial = tryReciprocalBinomialDerivativeSubstitutionRule(node, variable);
    if (reciprocalBinomial) {
      return symbolicSuccess(
        node,
        variable,
        reciprocalBinomial.exactLatex,
        'u-substitution',
        undefined,
        undefined,
        undefined,
        nativeStandardAntiderivative(
          reciprocalBinomial.antiderivativeNode,
          'calculus.integration:reciprocal-binomial-substitution',
        ),
      );
    }

    if (containsSqrtNode(node)) {
      const boundedCarrierSubstitution = tryBoundedCarrierSubstitutionRoute(node, variable);
      if (boundedCarrierSubstitution) {
        return boundedCarrierSubstitution;
      }
    }

    const algebraicGenus0RationalInRadical = tryAlgebraicGenus0RationalInRadicalRule(node, variable);
    if (algebraicGenus0RationalInRadical) {
      return symbolicSuccess(
        node,
        variable,
        algebraicGenus0RationalInRadical.exactLatex,
        'u-substitution',
        algebraicGenus0RationalInRadical.verification,
        algebraicGenus0RationalInRadical.exactSupplementLatex,
        undefined,
        nativeStandardAntiderivative(
          algebraicGenus0RationalInRadical.antiderivativeNode,
          'calculus.integration:algebraic-genus0-rational-radical',
        ),
        undefined,
        undefined,
        'precomputed-exact',
      );
    }

    const symbolicAlgebraicGenus0Standard = tryAlgebraicGenus0SymbolicStandardRadicalRule(node, variable);
    if (symbolicAlgebraicGenus0Standard) {
      return symbolicSuccess(
        node,
        variable,
        symbolicAlgebraicGenus0Standard.exactLatex,
        'u-substitution',
        symbolicAlgebraicGenus0Standard.verification,
        symbolicAlgebraicGenus0Standard.exactSupplementLatex,
        undefined,
        nativeStandardAntiderivative(
          symbolicAlgebraicGenus0Standard.antiderivativeNode,
          'calculus.integration:algebraic-genus0-symbolic-radical',
        ),
        undefined,
        undefined,
        'precomputed-exact',
      );
    }

    const symbolicLogDerivative = tryRischNormanOrchestrator(node, variable, {
      publicStrategies: ['partial-fractions'],
    });
    if (
      symbolicLogDerivative?.family === 'symbolic-log-derivative'
      && symbolicLogDerivative.exactSupplementLatex
      && symbolicLogDerivative.exactSupplementLatex.length > 0
    ) {
      return symbolicSuccess(
        node,
        variable,
        symbolicLogDerivative.exactLatex,
        symbolicLogDerivative.publicStrategy,
        symbolicLogDerivative.verification,
        symbolicLogDerivative.exactSupplementLatex,
        undefined,
        nativeStandardAntiderivative(
          symbolicLogDerivative.antiderivativeNode,
          'calculus.integration:risch-norman-log-derivative',
        ),
        undefined, undefined, 'precomputed-trusted',
      );
    }

    const derivativeRatio = derivativeRatioIntegral(node, variable);
    return derivativeRatio
      ? symbolicSuccess(
        node,
        variable,
        derivativeRatio.exactLatex,
        'derivative-ratio',
        undefined,
        undefined,
        undefined,
        nativeStandardAntiderivative(
          derivativeRatio.antiderivativeNode,
          'calculus.integration:derivative-ratio',
        ),
      )
      : undefined;
  }

  if (route === 'partial-fractions') {
    const reciprocalBinomial = tryReciprocalBinomialDerivativeSubstitutionRule(node, variable);
    if (reciprocalBinomial) {
      return symbolicSuccess(
        node,
        variable,
        reciprocalBinomial.exactLatex,
        'u-substitution',
        undefined,
        undefined,
        undefined,
        nativeStandardAntiderivative(
          reciprocalBinomial.antiderivativeNode,
          'calculus.integration:reciprocal-binomial-substitution',
        ),
      );
    }

    if (isPureQuadraticDerivativeOverlap(node, variable)) {
      return undefined;
    }

    const partialFractions = tryRationalPartialFractionRule(node, variable);
    if (partialFractions) {
      return symbolicSuccess(
        node,
        variable,
        partialFractions.exactLatex,
        'partial-fractions',
        partialFractions.verification,
        partialFractions.exactSupplementLatex,
        partialFractions.detailSections,
        partialFractions.antiderivativeNode === undefined
          ? undefined
          : nativeStandardAntiderivative(
              partialFractions.antiderivativeNode,
              'calculus.integration:rational-partial-fractions',
            ),
        undefined,
        undefined,
        partialFractions.antiderivativeNode === undefined
          ? 'backcheck'
          : 'precomputed-trusted',
      );
    }

    const symbolicRepeatedLinear = trySymbolicTwoLinearPartialFractionRule(node, variable);
    if (symbolicRepeatedLinear) {
      return symbolicSuccess(
        node,
        variable,
        symbolicRepeatedLinear.exactLatex,
        'partial-fractions',
        symbolicRepeatedLinear.verification,
        symbolicRepeatedLinear.exactSupplementLatex,
      );
    }

    const symbolicQuadratic = trySymbolicQuadraticReciprocalRule(node, variable);
    if (symbolicQuadratic) {
      return symbolicSuccess(
        node,
        variable,
        symbolicQuadratic.exactLatex,
        'partial-fractions',
        symbolicQuadratic.verification,
        symbolicQuadratic.exactSupplementLatex,
      );
    }

    const partialFractionsRn = tryRischNormanOrchestrator(node, variable, {
      publicStrategies: ['partial-fractions'],
    });
    if (partialFractionsRn) {
      return symbolicSuccess(
        node,
        variable,
        partialFractionsRn.exactLatex,
        partialFractionsRn.publicStrategy,
        partialFractionsRn.verification,
        partialFractionsRn.exactSupplementLatex,
        undefined,
        nativeStandardAntiderivative(
          partialFractionsRn.antiderivativeNode,
          'calculus.integration:risch-norman-partial-fractions',
        ),
        undefined, undefined, 'precomputed-trusted',
      );
    }

    const symbolicQuadraticLinearNumerator = trySymbolicQuadraticLinearNumeratorRule(node, variable);
    if (symbolicQuadraticLinearNumerator) {
      return symbolicSuccess(
        node,
        variable,
        symbolicQuadraticLinearNumerator.exactLatex,
        'partial-fractions',
        symbolicQuadraticLinearNumerator.verification,
        symbolicQuadraticLinearNumerator.exactSupplementLatex,
      );
    }

    const symbolicQuadraticRepeatedPower = trySymbolicQuadraticRepeatedPowerRule(node, variable);
    if (symbolicQuadraticRepeatedPower) {
      return symbolicSuccess(node, variable, symbolicQuadraticRepeatedPower.exactLatex,
        'partial-fractions', symbolicQuadraticRepeatedPower.verification,
        symbolicQuadraticRepeatedPower.exactSupplementLatex);
    }

    return undefined;
  }

  if (route === 'u-substitution') {
    const boundedCarrierSubstitution = tryBoundedCarrierSubstitutionRoute(node, variable);
    if (boundedCarrierSubstitution) {
      return boundedCarrierSubstitution;
    }

    const trigSubstitutionRadical = tryTrigSubstitutionRadicalRule(node, variable);
    if (trigSubstitutionRadical) {
      return symbolicSuccess(
        node,
        variable,
        trigSubstitutionRadical.exactLatex,
        'u-substitution',
        trigSubstitutionRadical.verification,
        trigSubstitutionRadical.exactSupplementLatex,
        trigSubstitutionRadical.detailSections,
        trigSubstitutionRadical.antiderivativeNode === undefined
          ? undefined
          : nativeStandardAntiderivative(
              trigSubstitutionRadical.antiderivativeNode,
              'calculus.integration:trig-substitution-radical',
            ),
        trigSubstitutionRadical.factNodes,
        undefined,
        trigSubstitutionRadical.antiderivativeNode === undefined
          ? 'backcheck'
          : 'precomputed-exact',
      );
    }

    const trigDerivativeProduct = tryTrigDerivativeProductRule(node, variable, {
      symbolicAffine: recognitionGates,
    });
    if (trigDerivativeProduct) {
      return symbolicSuccess(
        node,
        variable,
        trigDerivativeProduct.exactLatex,
        'u-substitution',
        trigDerivativeProduct.verification,
        trigDerivativeProduct.exactSupplementLatex,
        undefined,
        trigDerivativeProduct.antiderivativeNode === undefined
          ? undefined
          : nativeStandardAntiderivative(
              trigDerivativeProduct.antiderivativeNode,
              'calculus.integration:trig-derivative-product',
            ),
      );
    }

    const depth2Substitution = tryRischNormanDepth2DerivativeSubstitutionRule(node, variable);
    if (depth2Substitution) {
      return symbolicSuccess(
        node,
        variable,
        depth2Substitution.exactLatex,
        'u-substitution',
        depth2Substitution.verification,
        depth2Substitution.exactSupplementLatex,
        undefined,
        nativeStandardAntiderivative(
          depth2Substitution.antiderivativeNode,
          'calculus.integration:risch-norman-depth2-substitution',
        ),
      );
    }

    const logPowerSubstitution = tryLogPowerSubstitutionRule(node, variable);
    if (logPowerSubstitution) {
      return symbolicSuccess(node, variable, logPowerSubstitution.exactLatex, 'u-substitution',
        logPowerSubstitution.verification, logPowerSubstitution.exactSupplementLatex,
        logPowerSubstitution.detailSections,
        nativeStandardAntiderivative(
          logPowerSubstitution.antiderivativeNode,
          'calculus.integration:log-power-substitution',
        ));
    }

    const substitution = trySubstitutionRule(node, variable);
    if (substitution) {
      return symbolicSuccess(
        node,
        variable,
        substitution.exactLatex,
        'u-substitution',
        undefined,
        undefined,
        undefined,
        nativeStandardAntiderivative(
          substitution.antiderivativeNode,
          'calculus.integration:substitution',
        ),
      );
    }

    const binomialSubstitution = tryBinomialDerivativeSubstitutionRule(node, variable);
    if (binomialSubstitution) {
      return symbolicSuccess(
        node,
        variable,
        binomialSubstitution.exactLatex,
        'u-substitution',
        undefined,
        undefined,
        undefined,
        nativeStandardAntiderivative(
          binomialSubstitution.antiderivativeNode,
          'calculus.integration:binomial-substitution',
        ),
      );
    }

    const symbolicBinomial = trySymbolicBinomialSubstitutionRule(node, variable);
    if (symbolicBinomial) {
      return symbolicSuccess(
        node,
        variable,
        symbolicBinomial.exactLatex,
        'u-substitution',
        symbolicBinomial.verification,
        symbolicBinomial.exactSupplementLatex,
      );
    }

    const algebraicGenus0StandardRadical = tryAlgebraicGenus0StandardRadicalRule(node, variable);
    if (algebraicGenus0StandardRadical) {
      return symbolicSuccess(
        node,
        variable,
        algebraicGenus0StandardRadical.exactLatex,
        'u-substitution',
        algebraicGenus0StandardRadical.verification,
        algebraicGenus0StandardRadical.exactSupplementLatex,
        undefined,
        nativeStandardAntiderivative(
          algebraicGenus0StandardRadical.antiderivativeNode,
          'calculus.integration:algebraic-genus0-standard-radical',
        ),
        undefined,
        undefined,
        'precomputed-exact',
      );
    }

    const algebraicGenus0RationalInRadical = tryAlgebraicGenus0RationalInRadicalRule(node, variable);
    if (algebraicGenus0RationalInRadical) {
      return symbolicSuccess(
        node,
        variable,
        algebraicGenus0RationalInRadical.exactLatex,
        'u-substitution',
        algebraicGenus0RationalInRadical.verification,
        algebraicGenus0RationalInRadical.exactSupplementLatex,
        undefined,
        nativeStandardAntiderivative(
          algebraicGenus0RationalInRadical.antiderivativeNode,
          'calculus.integration:algebraic-genus0-rational-radical',
        ),
        undefined,
        undefined,
        'precomputed-exact',
      );
    }

    const symbolicAlgebraicGenus0Standard = tryAlgebraicGenus0SymbolicStandardRadicalRule(node, variable);
    if (symbolicAlgebraicGenus0Standard) {
      return symbolicSuccess(
        node,
        variable,
        symbolicAlgebraicGenus0Standard.exactLatex,
        'u-substitution',
        symbolicAlgebraicGenus0Standard.verification,
        symbolicAlgebraicGenus0Standard.exactSupplementLatex,
        undefined,
        nativeStandardAntiderivative(
          symbolicAlgebraicGenus0Standard.antiderivativeNode,
          'calculus.integration:algebraic-genus0-symbolic-radical',
        ),
        undefined,
        undefined,
        'precomputed-exact',
      );
    }

    return undefined;
  }

  if (route === 'direct-rule') {
    const hyperbolicSquare = tryHyperbolicSquareTableRule(node, variable);
    if (hyperbolicSquare) {
      return symbolicSuccess(
        node,
        variable,
        hyperbolicSquare.exactLatex,
        'direct-rule',
        hyperbolicSquare.verification,
        hyperbolicSquare.exactSupplementLatex,
        hyperbolicSquare.detailSections,
        nativeStandardAntiderivative(
          hyperbolicSquare.antiderivativeNode,
          'calculus.integration:hyperbolic-square-table',
        ),
        undefined,
        undefined,
        'precomputed-exact',
      );
    }

    const basic = resolveAntiderivativeRule(node, variable);
    if (basic) {
      return symbolicSuccess(
        node,
        variable,
        basic,
        'direct-rule',
        undefined,
        undefined,
        undefined,
        resolveAntiderivativeRuleExpression(node, variable),
      );
    }

    const symbolicTrigProduct = tryRischNormanSymbolicTrigProductToSumRule(node, variable);
    if (symbolicTrigProduct?.kind === 'success') {
      return symbolicSuccess(
        node,
        variable,
        symbolicTrigProduct.exactLatex,
        'direct-rule',
        symbolicTrigProduct.verification,
        symbolicTrigProduct.exactSupplementLatex,
      );
    }

    const symbolicTrigPower = trySymbolicTrigPowerDirectRule(node, variable);
    if (symbolicTrigPower) {
      return symbolicSuccess(
        node,
        variable,
        symbolicTrigPower.exactLatex,
        'direct-rule',
        symbolicTrigPower.verification,
        symbolicTrigPower.exactSupplementLatex,
        undefined,
        symbolicTrigPower.antiderivativeNode === undefined
          ? undefined
          : nativeStandardAntiderivative(
            symbolicTrigPower.antiderivativeNode,
            'calculus.integration:symbolic-trig-power',
          ),
      );
    }

    const symbolicDirect = trySymbolicDirectRule(node, variable);
    if (symbolicDirect) {
      return symbolicSuccess(
        node,
        variable,
        symbolicDirect.exactLatex,
        'direct-rule',
        symbolicDirect.verification,
        symbolicDirect.exactSupplementLatex,
        undefined,
        symbolicDirect.antiderivativeNode === undefined
          ? undefined
          : nativeStandardAntiderivative(
            symbolicDirect.antiderivativeNode,
            'calculus.integration:symbolic-direct-rule',
          ),
        undefined,
        undefined,
        'precomputed-exact',
      );
    }

    const targetFreePolynomial = tryTargetFreePolynomialDirectRule(node, variable);
    if (targetFreePolynomial) {
      return symbolicSuccess(
        node,
        variable,
        targetFreePolynomial.exactLatex,
        'direct-rule',
        targetFreePolynomial.verification,
        targetFreePolynomial.exactSupplementLatex,
        undefined,
        nativeStandardAntiderivative(
          targetFreePolynomial.antiderivativeNode,
          'calculus.integration:target-free-polynomial',
        ),
        undefined,
        undefined,
        'precomputed-exact',
      );
    }

    const expanded = tryExpandedDirectRule(node, variable);
    if (expanded) {
      return symbolicSuccess(
        node,
        variable,
        expanded.exactLatex,
        'direct-rule',
        expanded.verification,
        undefined,
        undefined,
        expanded.antiderivativeExpression,
      );
    }

    const affinePower = tryAffinePowerRule(node, variable);
    return affinePower
      ? symbolicSuccess(
        node,
        variable,
        affinePower.exactLatex,
        'direct-rule',
        undefined,
        undefined,
        undefined,
        nativeStandardAntiderivative(
          affinePower.antiderivativeNode,
          'calculus.integration:affine-power',
        ),
      )
      : undefined;
  }

  if (route === 'integration-by-parts') {
    return tryIntegrationByPartsRoute(node, variable);
  }

  const affine = parseAffine(node, variable);
  if (affine && affine.a !== 0) {
    const antiderivativeNode = [
      'Divide',
      ['Power', structuredClone(node), 2],
      2 * affine.a,
    ];
    return symbolicSuccess(
      node,
      variable,
      divideByNumericCoefficient(
        `${wrapGroupedLatex(affine.latex)}^{2}`,
        2 * affine.a,
      ),
      'affine-linear',
      undefined,
      undefined,
      undefined,
      nativeStandardAntiderivative(
        antiderivativeNode,
        'calculus.integration:affine-linear',
      ),
    );
  }

  return undefined;
}

function tryRoutes(
  node: unknown,
  variable: string,
  routes: IntegrationRouteFamily[],
  recognitionGates: boolean,
): IntegralResolution | undefined {
  for (const route of routes) {
    const result = tryRoute(node, variable, route, recognitionGates);
    if (result) {
      return result;
    }
  }

  return undefined;
}

function tryNormalFormRetry(
  node: unknown,
  variable: string,
  recognitionGates: boolean,
  allowTrigRewrite: boolean,
): IntegralResolution | undefined {
  const normalized = normalizeIntegrationNormalForm(node);
  if (!normalized.changed) {
    return undefined;
  }

  const retried = resolveSymbolicIntegralFromAstInternal(
    normalized.node,
    variable,
    recognitionGates,
    false,
    allowTrigRewrite,
  );
  if (retried.kind !== 'success') {
    return undefined;
  }

  return symbolicSuccess(
    node,
    variable,
    retried.exactLatex,
    retried.strategy,
    retried.verification,
    retried.exactSupplementLatex,
    [
      normalFormDetail(normalized.detailRows),
      ...(retried.detailSections ?? []),
    ],
    retried.antiderivativeExpression,
    retried.factNodes,
    retried.detailNodes,
    'precomputed-trusted',
  );
}

function tryTrigRewriteRetry(
  node: unknown,
  variable: string,
  recognitionGates: boolean,
): IntegralResolution | undefined {
  const rewritten = normalizeIntegrationTrigRewrite(node, variable);
  if (!rewritten.changed) {
    return undefined;
  }

  const retried = resolveSymbolicIntegralFromAstInternal(
    rewritten.node,
    variable,
    recognitionGates,
    false,
    false,
  );
  if (retried.kind !== 'success') {
    return undefined;
  }

  const detailSections = [
    trigRewriteDetail(rewritten.detailRows),
    ...(retried.detailSections ?? []),
  ];
  const checked = symbolicSuccess(
    node,
    variable,
    retried.exactLatex,
    retried.strategy,
    undefined,
    retried.exactSupplementLatex,
    detailSections,
    retried.antiderivativeExpression,
    retried.factNodes,
    retried.detailNodes,
  );
  if (checked.kind !== 'success' || checked.verification.status === 'not-verified') {
    return undefined;
  }

  return symbolicSuccess(
    node,
    variable,
    retried.exactLatex,
    retried.strategy,
    {
      status: 'verified-exact',
      reason: 'verified by bounded textbook trig identity rewrite plus derivative backcheck against the original integrand',
    },
    retried.exactSupplementLatex,
    detailSections,
    retried.antiderivativeExpression,
    retried.factNodes,
    retried.detailNodes,
    'precomputed-exact',
  );
}

function routeTermWithoutLinearCombination(
  node: unknown,
  variable: string,
  recognitionGates: boolean,
  allowNormalForm = true,
  allowTrigRewrite = true,
): IntegralResolution | undefined {
  const classification = classifyIntegrandForm(node, variable);
  const planned = tryRoutes(node, variable, classification.routes, recognitionGates);
  if (planned) {
    return planned;
  }

  const fallback = classification.allowCompatibilityFallback
    ? tryRoutes(node, variable, INTEGRATION_ROUTE_PRECEDENCE, recognitionGates)
    : undefined;
  if (fallback) {
    return fallback;
  }

  if (allowNormalForm) {
    const normalForm = tryNormalFormRetry(node, variable, recognitionGates, allowTrigRewrite);
    if (normalForm) {
      return normalForm;
    }
  }

  return allowTrigRewrite ? tryTrigRewriteRetry(node, variable, recognitionGates) : undefined;
}

function resolveSymbolicIntegralFromAstInternal(
  node: unknown,
  variable: string,
  recognitionGates: boolean,
  allowNormalForm: boolean,
  allowTrigRewrite: boolean,
  allowScalarMultiple = true,
): IntegralResolution {
  if (isRelationRoot(node)) {
    return {
      kind: 'error',
      error: INTEGRATION_RELATION_INTEGRAND_ERROR,
      candidate: unsupportedCandidateMetadata(node, variable),
    };
  }

  const additiveTrigRewriteCandidate = allowTrigRewrite
    && isNodeArray(node)
    && (node[0] === 'Add' || node[0] === 'Subtract')
    && normalizeIntegrationTrigRewrite(node, variable).changed;
  if (additiveTrigRewriteCandidate) {
    const linearCombination = tryLinearCombinationFallback(
      node,
      variable,
      recognitionGates,
      routeTermWithoutLinearCombination,
    );
    if (linearCombination) {
      return linearCombination;
    }
  }

  const classification = classifyIntegrandForm(node, variable);
  const planned = tryRoutes(node, variable, classification.routes, recognitionGates);
  if (planned) {
    return planned;
  }

  if (classification.allowCompatibilityFallback) {
    const fallback = tryRoutes(node, variable, INTEGRATION_ROUTE_PRECEDENCE, recognitionGates);
    if (fallback) {
      return fallback;
    }
  }

  if (allowNormalForm) {
    const normalForm = tryNormalFormRetry(node, variable, recognitionGates, allowTrigRewrite);
    if (normalForm) {
      return normalForm;
    }
  }

  if (allowTrigRewrite) {
    const trigRewrite = tryTrigRewriteRetry(node, variable, recognitionGates);
    if (trigRewrite) {
      return trigRewrite;
    }
  }

  if (allowScalarMultiple) {
    const scalarMultiple = tryScalarMultipleRetry(
      node,
      variable,
      recognitionGates,
      allowNormalForm,
      allowTrigRewrite,
      resolveSymbolicIntegralFromAstInternal,
    );
    if (scalarMultiple) {
      return scalarMultiple;
    }
  }

  const linearCombination = tryLinearCombinationFallback(
    node,
    variable,
    recognitionGates,
    routeTermWithoutLinearCombination,
  );
  if (linearCombination) {
    return linearCombination;
  }

  const algebraicFunctionField = tryAlgebraicFunctionFieldOrchestrator(node, variable);
  if (algebraicFunctionField) {
    return algebraicFunctionField.resolution;
  }

  const degenerationFallback = tryAlgebraicGenus1DegenerationFallbackRule(node, variable);
  if (degenerationFallback) {
    return symbolicSuccess(
      node,
      variable,
      degenerationFallback.exactLatex,
      degenerationFallback.strategy,
      degenerationFallback.verification,
      degenerationFallback.exactSupplementLatex,
      degenerationFallback.detailSections,
    );
  }

  return unsupportedTrigPowerBoundary(node, variable)
    ?? { kind: 'error', error: 'This antiderivative could not be determined symbolically in this milestone.', candidate: unsupportedCandidateMetadata(node, variable) };
}

export function resolveSymbolicIntegralFromAst(
  node: unknown,
  variable = 'x',
  options: { recognitionGates?: boolean } = {},
): IntegralResolution {
  const recognitionGates = options.recognitionGates !== false;
  return resolveSymbolicIntegralFromAstInternal(
    node,
    variable,
    recognitionGates,
    recognitionGates,
    recognitionGates,
  );
}

export function resolveDirectRuleIntegralFromAst(
  node: unknown,
  variable = 'x',
): IntegralResolution | undefined {
  return tryRoute(node, variable, 'direct-rule', true);
}

export function resolveSymbolicIntegralFromLatex(latex: string, variable = 'x'): IntegralResolution {
  const parsed = ce.parse(normalizeIntegralLatexInput(latex));
  return resolveSymbolicIntegralFromAst(parsed.json, variable);
}
