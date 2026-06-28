import { ComputeEngine } from '@cortex-js/compute-engine';
import { resolveAntiderivativeRule } from '../../calculus/engine/antiderivative-rules';
import {
  divideByNumericCoefficient,
  flattenAdd,
  isNodeArray,
  parseAffine,
  wrapGroupedLatex,
} from '../patterns';
import { tryAffinePowerRule } from './affine-power';
import {
  tryBinomialDerivativeSubstitutionRule,
  tryReciprocalBinomialDerivativeSubstitutionRule,
} from './binomial-substitution';
import {
  classifyIntegrandForm,
  INTEGRATION_ROUTE_PRECEDENCE,
  type IntegrationRouteFamily,
} from './classifier';
import { tryExpandedDirectRule } from './expanded-direct';
import { tryExpandedPartsRule } from './expanded-parts';
import { inverseTrigIntegral } from './inverse-trig';
import { symbolicSuccess, unsupportedCandidateMetadata } from './metadata';
import { tryRationalPartialFractionRule } from './rational';
import { tryRischNormanAffineRationalCorrectionRule } from './risch-norman/affine-rational-correction';
import { tryRischNormanDispatchProbe } from './risch-norman/dispatch-probe';
import { tryRischNormanSymbolicTrigProductToSumRule } from './risch-norman/symbolic-trig-products';
import {
  derivativeRatioIntegral,
  normalizeIntegralLatexInput,
  tryPartsRule,
  trySubstitutionRule,
  tryTrigDerivativeProductRule,
} from './rules';
import {
  trySymbolicBinomialSubstitutionRule,
  trySymbolicDirectRule,
  trySymbolicPartsRule,
  trySymbolicTrigPowerDirectRule,
} from './symbolic-coefficients';
import {
  trySymbolicQuadraticReciprocalRule,
  trySymbolicTwoLinearPartialFractionRule,
} from './symbolic-rational';
import { tryTargetFreePolynomialDirectRule } from './target-free-polynomial-direct';
import { tryTrigSubstitutionRadicalRule } from './trig-substitution-radicals';
import type { IntegralResolution, IntegralStrategy } from './types';

const ce = new ComputeEngine();
const RELATION_HEADS = new Set(['Equal', 'NotEqual', 'Less', 'LessEqual', 'Greater', 'GreaterEqual']);
const LINEAR_COMBINATION_TERM_CAP = 6;

export const INTEGRATION_RELATION_INTEGRAND_ERROR =
  'Calculus integrals expect an expression f(x), not an equation or relation.';

function isRelationRoot(node: unknown) {
  return isNodeArray(node) && typeof node[0] === 'string' && RELATION_HEADS.has(node[0]);
}

function tryRoute(
  node: unknown,
  variable: string,
  route: IntegrationRouteFamily,
): IntegralResolution | undefined {
  if (route === 'inverse-trig') {
    const inverseTrig = inverseTrigIntegral(node, variable);
    return inverseTrig
      ? symbolicSuccess(node, variable, inverseTrig, 'inverse-trig')
      : undefined;
  }

  if (route === 'derivative-ratio') {
    const reciprocalBinomial = tryReciprocalBinomialDerivativeSubstitutionRule(node, variable);
    if (reciprocalBinomial) {
      return symbolicSuccess(node, variable, reciprocalBinomial, 'u-substitution');
    }

    const derivativeRatio = derivativeRatioIntegral(node, variable);
    return derivativeRatio
      ? symbolicSuccess(node, variable, derivativeRatio, 'derivative-ratio')
      : undefined;
  }

  if (route === 'partial-fractions') {
    const reciprocalBinomial = tryReciprocalBinomialDerivativeSubstitutionRule(node, variable);
    if (reciprocalBinomial) {
      return symbolicSuccess(node, variable, reciprocalBinomial, 'u-substitution');
    }

    const partialFractions = tryRationalPartialFractionRule(node, variable);
    if (partialFractions) {
      return symbolicSuccess(
        node,
        variable,
        partialFractions.exactLatex,
        'partial-fractions',
        partialFractions.verification,
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

    const affineCorrection = tryRischNormanAffineRationalCorrectionRule(node, variable);
    return affineCorrection?.kind === 'success'
      ? symbolicSuccess(
        node,
        variable,
        affineCorrection.exactLatex,
        'partial-fractions',
        affineCorrection.verification,
        affineCorrection.exactSupplementLatex,
      )
      : undefined;
  }

  if (route === 'u-substitution') {
    const trigDerivativeProduct = tryTrigDerivativeProductRule(node, variable);
    if (trigDerivativeProduct) {
      return symbolicSuccess(node, variable, trigDerivativeProduct, 'u-substitution');
    }

    const substitution = trySubstitutionRule(node, variable);
    if (substitution) {
      return symbolicSuccess(node, variable, substitution, 'u-substitution');
    }

    const binomialSubstitution = tryBinomialDerivativeSubstitutionRule(node, variable);
    if (binomialSubstitution) {
      return symbolicSuccess(node, variable, binomialSubstitution, 'u-substitution');
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

    const trigSubstitutionRadical = tryTrigSubstitutionRadicalRule(node, variable);
    return trigSubstitutionRadical
      ? symbolicSuccess(
        node,
        variable,
        trigSubstitutionRadical.exactLatex,
        'u-substitution',
        trigSubstitutionRadical.verification,
        trigSubstitutionRadical.exactSupplementLatex,
      )
      : undefined;
  }

  if (route === 'direct-rule') {
    const basic = resolveAntiderivativeRule(node, variable);
    if (basic) {
      return symbolicSuccess(node, variable, basic, 'direct-rule');
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
      );
    }

    const expanded = tryExpandedDirectRule(node, variable);
    if (expanded) {
      return symbolicSuccess(node, variable, expanded, 'direct-rule');
    }

    const affinePower = tryAffinePowerRule(node, variable);
    return affinePower
      ? symbolicSuccess(node, variable, affinePower, 'direct-rule')
      : undefined;
  }

  if (route === 'integration-by-parts') {
    const byParts = tryPartsRule(node, variable);
    if (byParts) {
      return symbolicSuccess(node, variable, byParts, 'integration-by-parts');
    }

    const symbolicParts = trySymbolicPartsRule(node, variable);
    if (symbolicParts) {
      return symbolicSuccess(
        node,
        variable,
        symbolicParts.exactLatex,
        'integration-by-parts',
        symbolicParts.verification,
        symbolicParts.exactSupplementLatex,
      );
    }

    const expandedByParts = tryExpandedPartsRule(node, variable);
    if (expandedByParts) {
      return symbolicSuccess(
        node,
        variable,
        expandedByParts.exactLatex,
        'integration-by-parts',
        expandedByParts.verification,
      );
    }

    const rischNorman = tryRischNormanDispatchProbe(node, variable);
    return rischNorman
      ? symbolicSuccess(
        node,
        variable,
        rischNorman.exactLatex,
        'integration-by-parts',
        rischNorman.verification,
        rischNorman.exactSupplementLatex,
      )
      : undefined;
  }

  const affine = parseAffine(node, variable);
  if (affine && affine.a !== 0) {
    return symbolicSuccess(
      node,
      variable,
      divideByNumericCoefficient(
        `${wrapGroupedLatex(affine.latex)}^{2}`,
        2 * affine.a,
      ),
      'affine-linear',
    );
  }

  return undefined;
}

function tryRoutes(
  node: unknown,
  variable: string,
  routes: IntegrationRouteFamily[],
): IntegralResolution | undefined {
  for (const route of routes) {
    const result = tryRoute(node, variable, route);
    if (result) {
      return result;
    }
  }

  return undefined;
}

type SignedTerm = {
  node: unknown;
  sign: 1 | -1;
};

function signedAddTerms(node: unknown, sign: 1 | -1 = 1): SignedTerm[] {
  if (isNodeArray(node) && node[0] === 'Add') {
    return flattenAdd(node).flatMap((term) => signedAddTerms(term, sign));
  }

  if (isNodeArray(node) && node[0] === 'Subtract') {
    const [first, ...rest] = node.slice(1);
    return [
      ...(first === undefined ? [] : signedAddTerms(first, sign)),
      ...rest.flatMap((term) => signedAddTerms(term, sign === 1 ? -1 : 1)),
    ];
  }

  if (isNodeArray(node) && node[0] === 'Negate' && node.length === 2) {
    return signedAddTerms(node[1], sign === 1 ? -1 : 1);
  }

  return [{ node, sign }];
}

function routeTermWithoutLinearCombination(
  node: unknown,
  variable: string,
): IntegralResolution | undefined {
  const classification = classifyIntegrandForm(node, variable);
  const planned = tryRoutes(node, variable, classification.routes);
  if (planned) {
    return planned;
  }

  return classification.allowCompatibilityFallback
    ? tryRoutes(node, variable, INTEGRATION_ROUTE_PRECEDENCE)
    : undefined;
}

function combineSignedLatex(parts: Array<{ latex: string; sign: 1 | -1 }>) {
  return parts.map((part, index) => {
    const latex = part.sign === 1 ? part.latex : `-${wrapGroupedLatex(part.latex)}`;
    return index === 0 || latex.startsWith('-') ? latex : `+${latex}`;
  }).join('');
}

function dominantStrategy(strategies: IntegralStrategy[]): IntegralStrategy {
  const [first] = strategies;
  return strategies.every((strategy) => strategy === first)
    ? first
    : 'integration-by-parts';
}

function mergeSupplementLatex(results: IntegralResolution[]) {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const result of results) {
    if (result.kind !== 'success') {
      continue;
    }
    for (const line of result.exactSupplementLatex ?? []) {
      if (seen.has(line)) {
        continue;
      }
      seen.add(line);
      merged.push(line);
    }
  }
  return merged.length > 0 ? merged : undefined;
}

function tryLinearCombinationFallback(node: unknown, variable: string): IntegralResolution | undefined {
  if (!isNodeArray(node) || (node[0] !== 'Add' && node[0] !== 'Subtract')) {
    return undefined;
  }

  const terms = signedAddTerms(node);
  if (terms.length < 2 || terms.length > LINEAR_COMBINATION_TERM_CAP) {
    return undefined;
  }

  const results: Array<Extract<IntegralResolution, { kind: 'success' }>> = [];
  for (const term of terms) {
    const result = routeTermWithoutLinearCombination(term.node, variable);
    if (!result || result.kind !== 'success') {
      return undefined;
    }
    results.push(result);
  }

  const exactLatex = combineSignedLatex(
    results.map((result, index) => ({
      latex: result.exactLatex,
      sign: terms[index].sign,
    })),
  );
  return symbolicSuccess(
    node,
    variable,
    exactLatex,
    dominantStrategy(results.map((result) => result.strategy)),
    {
      status: 'verified-exact',
      reason: 'verified by internal Risch-Norman linear-combination rule proof',
    },
    mergeSupplementLatex(results),
  );
}

export function resolveSymbolicIntegralFromAst(node: unknown, variable = 'x'): IntegralResolution {
  if (isRelationRoot(node)) {
    return {
      kind: 'error',
      error: INTEGRATION_RELATION_INTEGRAND_ERROR,
      candidate: unsupportedCandidateMetadata(node, variable),
    };
  }

  const classification = classifyIntegrandForm(node, variable);
  const planned = tryRoutes(node, variable, classification.routes);
  if (planned) {
    return planned;
  }

  if (classification.allowCompatibilityFallback) {
    const fallback = tryRoutes(node, variable, INTEGRATION_ROUTE_PRECEDENCE);
    if (fallback) {
      return fallback;
    }
  }

  const linearCombination = tryLinearCombinationFallback(node, variable);
  if (linearCombination) {
    return linearCombination;
  }

  return {
    kind: 'error',
    error: 'This antiderivative could not be determined symbolically in this milestone.',
    candidate: unsupportedCandidateMetadata(node, variable),
  };
}

export function resolveSymbolicIntegralFromLatex(latex: string, variable = 'x'): IntegralResolution {
  const parsed = ce.parse(normalizeIntegralLatexInput(latex));
  return resolveSymbolicIntegralFromAst(parsed.json, variable);
}
