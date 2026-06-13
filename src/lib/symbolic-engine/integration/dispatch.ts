import { ComputeEngine } from '@cortex-js/compute-engine';
import { resolveAntiderivativeRule } from '../../calculus/antiderivative-rules';
import { divideByNumericCoefficient, parseAffine, wrapGroupedLatex } from '../patterns';
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

export function resolveSymbolicIntegralFromAst(node: unknown, variable = 'x'): IntegralResolution {
  const inverseTrig = inverseTrigIntegral(node, variable);
  if (inverseTrig) {
    return symbolicSuccess(node, variable, inverseTrig, 'inverse-trig');
  }

  const derivativeRatio = derivativeRatioIntegral(node, variable);
  if (derivativeRatio) {
    return symbolicSuccess(node, variable, derivativeRatio, 'derivative-ratio');
  }

  const partialFractions = tryRationalPartialFractionRule(node, variable);
  if (partialFractions) {
    return symbolicSuccess(node, variable, partialFractions, 'partial-fractions');
  }

  const substitution = trySubstitutionRule(node, variable);
  if (substitution) {
    return symbolicSuccess(node, variable, substitution, 'u-substitution');
  }

  const basic = resolveAntiderivativeRule(node, variable);
  if (basic) {
    return symbolicSuccess(node, variable, basic, 'direct-rule');
  }

  const byParts = tryPartsRule(node, variable);
  if (byParts) {
    return symbolicSuccess(node, variable, byParts, 'integration-by-parts');
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
