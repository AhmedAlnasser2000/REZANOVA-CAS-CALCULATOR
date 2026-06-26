import { ComputeEngine } from '@cortex-js/compute-engine';
import { resolveAntiderivativeRule } from '../../calculus/engine/antiderivative-rules';
import { divideByNumericCoefficient, parseAffine, wrapGroupedLatex } from '../patterns';
import {
  classifyIntegrandForm,
  INTEGRATION_ROUTE_PRECEDENCE,
  type IntegrationRouteFamily,
} from './classifier';
import { tryExpandedDirectRule } from './expanded-direct';
import { tryExpandedPartsRule } from './expanded-parts';
import { symbolicSuccess, unsupportedCandidateMetadata } from './metadata';
import { tryRationalPartialFractionRule } from './rational';
import {
  derivativeRatioIntegral,
  inverseTrigIntegral,
  normalizeIntegralLatexInput,
  tryPartsRule,
  trySubstitutionRule,
} from './rules';
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
    const derivativeRatio = derivativeRatioIntegral(node, variable);
    return derivativeRatio
      ? symbolicSuccess(node, variable, derivativeRatio, 'derivative-ratio')
      : undefined;
  }

  if (route === 'partial-fractions') {
    const partialFractions = tryRationalPartialFractionRule(node, variable);
    return partialFractions
      ? symbolicSuccess(node, variable, partialFractions, 'partial-fractions')
      : undefined;
  }

  if (route === 'u-substitution') {
    const substitution = trySubstitutionRule(node, variable);
    return substitution
      ? symbolicSuccess(node, variable, substitution, 'u-substitution')
      : undefined;
  }

  if (route === 'direct-rule') {
    const basic = resolveAntiderivativeRule(node, variable);
    if (basic) {
      return symbolicSuccess(node, variable, basic, 'direct-rule');
    }

    const expanded = tryExpandedDirectRule(node, variable);
    return expanded
      ? symbolicSuccess(node, variable, expanded, 'direct-rule')
      : undefined;
  }

  if (route === 'integration-by-parts') {
    const byParts = tryPartsRule(node, variable);
    if (byParts) {
      return symbolicSuccess(node, variable, byParts, 'integration-by-parts');
    }

    const expandedByParts = tryExpandedPartsRule(node, variable);
    return expandedByParts
      ? symbolicSuccess(node, variable, expandedByParts, 'integration-by-parts')
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
