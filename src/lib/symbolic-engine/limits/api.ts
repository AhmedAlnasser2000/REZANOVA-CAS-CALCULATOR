import type { LimitDirection } from '../../../types/calculator';
import { limitTextRow } from './detail-readback';
import { box, latexToNumber, success } from './evaluation';
import { resolveKnownFiniteLimitRule } from './known-rules';
import { resolveFiniteRecursiveLeadingTermLimit } from './finite-leading-terms';
import { attemptLHospital } from './lhospital';
import { resolveLocalEquivalentLimit } from './local-equivalents';
import { resolveLogBoundaryLimit, resolveSignedPoleLimit } from './poles';
import { resolveRationalLocalLimit } from './rational-local';
import { resolveFiniteRewriteCancellationLimit } from './rewrite-cancellation-spine';
import { resolveFiniteSqueezeOscillationLimit } from './squeeze-oscillation';

export function resolveFiniteLimitRule(
  node: unknown,
  target: number,
  variable = 'x',
  direction: LimitDirection = 'two-sided',
) {
  try {
    const evaluated = box(node).subs({ [variable]: target }).evaluate();
    if (!evaluated.latex.includes('Undefined') && !evaluated.latex.includes('\\infty')) {
      const numeric = typeof evaluated.json === 'number' ? evaluated.json : latexToNumber((evaluated.N?.() ?? evaluated).latex);
      if (numeric !== undefined) {
        return success(numeric, 'symbolic', [
          limitTextRow('Direct substitution evaluated to a finite value.'),
        ]);
      }
    }
  } catch {
    // ignore direct substitution failures
  }

  const knownRule = resolveKnownFiniteLimitRule(node, target, variable);
  if (knownRule) {
    return knownRule;
  }

  const rationalLocal = resolveRationalLocalLimit(node, target, variable, direction);
  if (rationalLocal) {
    return rationalLocal;
  }

  const rewriteCancellation = resolveFiniteRewriteCancellationLimit(node, target, variable, direction);
  if (rewriteCancellation) {
    return rewriteCancellation;
  }

  const squeezeOscillation = resolveFiniteSqueezeOscillationLimit(node, target, variable, direction);
  if (squeezeOscillation?.kind === 'success') {
    return squeezeOscillation;
  }

  const recursiveLeadingTerm = resolveFiniteRecursiveLeadingTermLimit(node, target, variable, direction);
  if (recursiveLeadingTerm) {
    return recursiveLeadingTerm;
  }

  const localEquivalentLimit = resolveLocalEquivalentLimit(
    node,
    target,
    variable,
    direction,
    'Combined bounded local equivalents at the finite target.',
  );
  if (localEquivalentLimit) {
    return localEquivalentLimit;
  }

  const signedPole = resolveSignedPoleLimit(node, target, variable, direction);
  if (signedPole) {
    return signedPole;
  }

  const logBoundary = resolveLogBoundaryLimit(node, target, variable, direction);
  if (logBoundary) {
    return logBoundary;
  }

  const byLHospital = attemptLHospital(node, target, variable);
  if (byLHospital.kind === 'success') {
    return {
      kind: 'success' as const,
      value: byLHospital.value,
      exactLatex: byLHospital.exactLatex,
      origin: 'heuristic-symbolic' as const,
      detailSections: byLHospital.detailSections,
    };
  }

  return { kind: 'unhandled' as const };
}
