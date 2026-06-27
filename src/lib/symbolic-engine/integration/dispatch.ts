import { ComputeEngine } from '@cortex-js/compute-engine';
import { resolveAntiderivativeRule } from '../../calculus/engine/antiderivative-rules';
import { divideByNumericCoefficient, parseAffine, wrapGroupedLatex } from '../patterns';
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
import type { IntegralResolution } from './types';

const ce = new ComputeEngine();

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
    return symbolicQuadratic
      ? symbolicSuccess(
        node,
        variable,
        symbolicQuadratic.exactLatex,
        'partial-fractions',
        symbolicQuadratic.verification,
        symbolicQuadratic.exactSupplementLatex,
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
    return symbolicBinomial
      ? symbolicSuccess(
        node,
        variable,
        symbolicBinomial.exactLatex,
        'u-substitution',
        symbolicBinomial.verification,
        symbolicBinomial.exactSupplementLatex,
      )
      : undefined;
  }

  if (route === 'direct-rule') {
    const basic = resolveAntiderivativeRule(node, variable);
    if (basic) {
      return symbolicSuccess(node, variable, basic, 'direct-rule');
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
    return expandedByParts
      ? symbolicSuccess(
        node,
        variable,
        expandedByParts.exactLatex,
        'integration-by-parts',
        expandedByParts.verification,
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

export function resolveSymbolicIntegralFromAst(node: unknown, variable = 'x'): IntegralResolution {
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
