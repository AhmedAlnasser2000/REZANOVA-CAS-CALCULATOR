# INT-CANDIDATE2 Integration Candidate Metadata

milestone: `INT-CANDIDATE2`  
status: complete  
date: 2026-05-20  
primary_agent: codex  
primary_agent_model: gpt-5.5

## Summary

`INT-CANDIDATE2` strengthens integration internals without adding new antiderivative families or changing visible result behavior.

Existing symbolic integration attempts now carry structured candidate metadata:

- candidate method
- required prerequisites
- blocked prerequisites
- verification status
- controlled failure class
- readiness notes
- domain hazard hints

The metadata is internal. It does not add result origins, visible badges, strategy labels, UI panels, or new solver behavior.

## Metadata Fields

| Field | Purpose |
| --- | --- |
| `method` | Records the accepted strategy such as `direct-rule`, `u-substitution`, `integration-by-parts`, `compute-engine`, or `unsupported`. |
| `requiredPrerequisites` | Names substrates the candidate depends on, such as derivative backcheck, polynomial core, domain safety, or Compute Engine fallback. |
| `blockedPrerequisites` | Names missing substrates that must not be hidden inside calculus, such as polynomial gcd/division or partial fractions. |
| `verificationStatus` | Mirrors the antiderivative backcheck status for accepted candidates, or records `not-attempted` for unsupported candidates. |
| `controlledFailureClass` | Classifies internal stops such as `missing-derivative-factor`, `blocked-polynomial-prerequisite`, `unsupported-family`, or `not-verified`. |
| `readinessNotes` | Human-readable internal notes explaining why the candidate is accepted or stopped. |
| `domainHazards` | Records simple hazards such as denominator nonzero, log-positive, root-nonnegative, negative-power base, and fractional-power branch concerns. |

## Current Classifications

| Case Family | Metadata Result |
| --- | --- |
| Existing app-owned direct/inverse-trig/derivative-ratio/u-substitution/by-parts/affine wins | Accepted with existing strategy, derivative-backcheck prerequisite, and verification status. |
| Compute Engine fallback wins | Accepted as `compute-engine`, separate from app-owned symbolic rules. |
| Composition-like forms missing the derivative factor | Unsupported with `missing-derivative-factor`. |
| Polynomial rational gaps needing partial fractions | Unsupported with `blocked-polynomial-prerequisite` and blocked `polynomial-gcd`, `polynomial-division`, and `partial-fractions`. |
| Absolute-value or branch-heavy substitution attempts | Unsupported with branch-analysis blocked. |
| Broad unrecognized families | Unsupported with broad Risch/Liouville-style work deferred. |

## Boundaries Preserved

- No new indefinite integration family.
- No rational integration.
- No partial fractions.
- No polynomial gcd or division substrate.
- No Risch/Liouville engine.
- No branch-heavy piecewise integration.
- No visible UI or result-surface change.
- No new `ResultOrigin` value.

## Next Decision

The metadata now makes the next integration move easier to choose:

- If the goal is rational integration, first plan a polynomial/rational prerequisite milestone for gcd, division, and partial fractions.
- If the goal is user trust/readability, plan an integration stop/detail polish milestone that can surface selected existing metadata without changing behavior.
- If the goal is new stable integration capability, keep it bounded and require candidate metadata to say which prerequisites are ready.
