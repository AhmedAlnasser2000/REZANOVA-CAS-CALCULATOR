import {
  collectIntegrationDomainHazards,
} from '../metadata';
import type { IntegrationCandidateMetadata } from '../types';
import { profileAlgebraicGenus0Candidate } from './profile';

export const ALGEBRAIC_GENUS1_BOUNDARY_ERROR =
  'This algebraic radical integral is beyond the current genus-0 rules; cubic or quartic square-root curves are deferred to elliptic/genus-1 analysis.';

export type AlgebraicGenus0Genus1BoundaryStop = {
  error: typeof ALGEBRAIC_GENUS1_BOUNDARY_ERROR;
  candidate: IntegrationCandidateMetadata;
};

export function algebraicGenus0Genus1BoundaryMetadata(
  node: unknown,
): IntegrationCandidateMetadata {
  return {
    method: 'unsupported',
    requiredPrerequisites: ['branch-analysis', 'domain-safety', 'risch-liouville'],
    blockedPrerequisites: ['branch-analysis', 'risch-liouville'],
    verificationStatus: 'not-attempted',
    controlledFailureClass: 'unsupported-family',
    readinessNotes: [
      'The one-radical profiler found a cubic or quartic square-root curve.',
      'Genus-0 rational parametrization is not applicable to this radical curve.',
      'Elliptic/genus-1 certificate and readback support is deferred to a later algebraic integration layer.',
    ],
    domainHazards: collectIntegrationDomainHazards(node),
  };
}

export function tryAlgebraicGenus0Genus1BoundaryStop(
  node: unknown,
  variable = 'x',
): AlgebraicGenus0Genus1BoundaryStop | undefined {
  const profile = profileAlgebraicGenus0Candidate(node, variable);
  if (profile.kind !== 'stop' || profile.reason !== 'cubic-quartic-radicand') {
    return undefined;
  }

  return {
    error: ALGEBRAIC_GENUS1_BOUNDARY_ERROR,
    candidate: algebraicGenus0Genus1BoundaryMetadata(node),
  };
}
