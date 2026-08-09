import type { ResultProducerDraft } from '../../types/calculator';

type CandidateValidatedReadbackOwner = 'same-base-log-equality';

const permissions = new WeakMap<object, CandidateValidatedReadbackOwner>();

export function grantCandidateValidatedReadbackPermission<T extends ResultProducerDraft>(
  outcome: T,
  owner: CandidateValidatedReadbackOwner,
): T {
  permissions.set(outcome, owner);
  return outcome;
}

export function consumeCandidateValidatedReadbackPermission(
  outcome: ResultProducerDraft,
  owner: CandidateValidatedReadbackOwner,
) {
  if (permissions.get(outcome) !== owner) return false;
  permissions.delete(outcome);
  return true;
}

export function transferCandidateValidatedReadbackPermission<T extends object>(
  source: object,
  target: T,
): T {
  const owner = permissions.get(source);
  if (!owner) return target;
  permissions.delete(source);
  permissions.set(target, owner);
  return target;
}
