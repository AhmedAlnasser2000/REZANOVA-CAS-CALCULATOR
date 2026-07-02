import { collectIntegrationDomainHazards } from '../metadata';
import type { IntegrationCandidateMetadata } from '../types';
import { profileAlgebraicGenus1CurveCandidate } from './curve-profile';

export const ALGEBRAIC_HYPERELLIPTIC_BOUNDARY_ERROR =
  'This algebraic radical integral is beyond the current genus-1 rules; squarefree degree-5-or-higher square-root curves are deferred to hyperelliptic/genus-2 analysis.';

export type AlgebraicHyperellipticBoundaryStop = {
  error: typeof ALGEBRAIC_HYPERELLIPTIC_BOUNDARY_ERROR;
  candidate: IntegrationCandidateMetadata;
};

export function algebraicHyperellipticBoundaryMetadata(
  node: unknown,
): IntegrationCandidateMetadata {
  return {
    method: 'unsupported',
    requiredPrerequisites: [
      'branch-analysis',
      'domain-safety',
      'resultants',
      'risch-liouville',
    ],
    blockedPrerequisites: ['branch-analysis', 'risch-liouville'],
    verificationStatus: 'not-attempted',
    controlledFailureClass: 'unsupported-family',
    readinessNotes: [
      'The one-radical algebraic profiler found a radicand beyond cubic/quartic genus-1 scope.',
      'These square-root curves are hyperelliptic in the generic squarefree case and need a later genus-2 layer.',
      'Genus-0 rational parametrization and genus-1 Legendre elliptic readback are not sufficient for this family.',
    ],
    domainHazards: collectIntegrationDomainHazards(node),
  };
}

export function tryAlgebraicHyperellipticBoundaryStop(
  node: unknown,
  variable = 'x',
): AlgebraicHyperellipticBoundaryStop | undefined {
  const profile = profileAlgebraicGenus1CurveCandidate(node, variable);
  if (profile.kind !== 'stop' || profile.reason !== 'over-cap-radicand-degree') {
    return undefined;
  }

  return {
    error: ALGEBRAIC_HYPERELLIPTIC_BOUNDARY_ERROR,
    candidate: algebraicHyperellipticBoundaryMetadata(node),
  };
}
