import type { LimitDirection } from '../../../types/calculator';
import { box, latexToNumber, success } from './evaluation';
import { resolveKnownFiniteLimitRule } from './known-rules';
import { resolveExactLocalAlgebraLimit } from './exact-local-algebra';
import { resolveFiniteIndeterminateTransformLimit } from './indeterminate-transforms';
import { attemptLHospital } from './lhospital';
import { resolveLocalEquivalentLimit } from './local-equivalents';
import { resolveLogBoundaryLimit, resolveSignedPoleLimit } from './poles';
import { resolveRationalLocalLimit } from './rational-local';

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
          'Direct substitution evaluated to a finite value.',
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

  const exactLocalAlgebra = resolveExactLocalAlgebraLimit(node, target, variable, direction);
  if (exactLocalAlgebra) {
    return exactLocalAlgebra;
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

  const indeterminateTransform = resolveFiniteIndeterminateTransformLimit(node, target, variable, direction);
  if (indeterminateTransform) {
    return indeterminateTransform;
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
