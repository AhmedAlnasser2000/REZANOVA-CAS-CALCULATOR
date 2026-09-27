# INTEGRATION-RATIONAL-REPRESENTATION1

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-6-astra
- primary_agent_family: astra
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-6-astra
- recorded_by_agent_family: astra
- verified_by_agent: codex
- verified_by_agent_model: gpt-6-astra
- verified_by_agent_family: astra
- attribution_basis: live

## Authority and outcome

- Date: 2026-09-27. User explicitly approved implementation of the CRITICAL root-only plan and requested continuation. No delegation. The user subsequently explicitly authorized this milestone commit; no push.
- Backend outcome: **verified rational representation and candidate-derivative infrastructure**. Production changes stay in `src/lib/symbolic-engine/integration/core/`; prior shared/legacy integration, Calculus, runtime, result and Graphing/Matrix work remains outside this lane.
- Separated ExactRing, ExactIntegralDomain and ExactField; generalized polynomial coefficients to rings and added the polynomial domain adapter for direct Q[z][x]. Existing Q[x]/Q(t)[x] behavior and all 60 prior tests survive.
- Added verified pseudo-division, nested content/primitive parts, Brown subresultants/resultants with original order, actual degrees, indices, principal coefficients, defective/zero entries and explicit highest boundaries. Specialization retains source metadata and reports degree loss.
- Added square-free quotient ring arithmetic over Q and Q(x), checked inverse/nonunit witnesses, proper coprime splitting and CRT. Reducible quotients never claim field capability.
- Added exact all-distinct-roots local-complex log sums, rational-plus-log formal primitives, exact norm/denominator conditions, checked derivative traces and independent Newton-sum verification against a separately supplied integrand.
- Added a separately tagged private artifact codec that reconstructs fresh ownership and repeats canonicality/validity/condition checks. Existing Q scalar/polynomial wire format is unchanged.

## Verification and limits

- 11 files / 84 focused tests pass, including all 60 originals, independent small Sylvester-minor oracles, three known derivative fixtures, mutation checks, replay, cancellation-condition preservation and shared-budget/final-verification exhaustion.
- Incremental TypeScript, scoped ESLint and compartment/OOE boundary checks pass. Memory/file-size/diff checks also pass; full evidence is recorded in verification-summary.md.
- Test profiles are finite logical execution/allocation limits, not heap-byte measurements or application defaults. BigInt execution remains synchronous; the quintic derivative fixture takes about four seconds with repeated verification on this checkout. No interactive latency guarantee is claimed.
- No automatic integration, irreducibility algorithm, complete factorization, root isolation, branch/display choice, integration completeness claim or app caller. No Playwright/full-suite gate is applicable. The user-approved commit checkpoint includes repository lint/build; see verification-summary.md.

## Durable memory updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-09/2026-09-27.md`
- This dossier's completion-report.md, verification-summary.md and commit-log.md.
- No new unresolved choice was introduced; existing adoption/branch/contract questions in `.memory/open-questions.md` remain current. Its unrelated Graphing edit was preserved.

## Handoff

Next: plan `INTEGRATION-RATIONAL-DECISION1` for Hermite reduction, residue extraction, LRT indexed-subresultant selection/specialization rules and automatic primitive construction. Product adoption separately requires reviewed result and branch/display contracts. The roadmap remains subject to change when necessary. The user subsequently authorized this milestone commit; commit-log.md identifies the checkpoint. The earlier exact-algebra checkpoint remains `31561aab`. No push is authorized.
