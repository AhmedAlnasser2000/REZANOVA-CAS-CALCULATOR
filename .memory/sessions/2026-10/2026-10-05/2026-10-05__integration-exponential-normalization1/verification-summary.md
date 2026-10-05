# Exponential normalization verification

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-6
- primary_agent_family: sol
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-6
- verified_by_agent_family: sol
- attribution_basis: live

## Completed backend checkpoint

- 2026-10-05: implementing the user-approved three-gate sequence, CRITICAL root-only. This is the backend normalization prerequisite; result-contract and UI work have not started. No staging, commit or push.
- Sparse multivariable arithmetic, recursive content/primitive PRS GCD, independent replay, exponent-basis elimination, restriction coverage, classification and the private version-1 codec are implemented.
- Initial 32 focused tests pass; two additional normalization tests also pass in the 15-test normalization file. Producer-disabled replay covers expanded common-factor cancellation, rational cancellation and unsupported surviving families.
- Incremental TypeScript passes after correcting union narrowing. Scoped lint passes at the first implementation checkpoint. That checkpoint preceded the completed retained-core run and final checks recorded below.
- An initial Vitest command used unsupported `--minWorkers`; it exited before running tests and was corrected to supported `--maxWorkers=2`.
- A wrong-input replay assertion initially expected a later coverage error; source matching was moved before arity allocation validation, preserving early bounds checks and improving the explicit-input failure.

- Final retained-core run: 35 files, 515 tests passed, two workers, 128.25 s. All 481 prior core tests retained; 34 additions.
- Serial measurements completed after core tests stopped: four cases, construction/verification/encoding/decoding, one warm-up/three measurements, fresh contexts, unchanged limits. Raw evidence is serial-observations.json.
- Final incremental TypeScript/scoped lint, isolation, compartment/OOE, memory, file-size and diff checks pass. Result-contract/UI gates remain separate. No commit/push.

## User-directed stop and synchronization finding

- User explicitly requested finishing normalization only, then stopping to discuss catching up with Claude; result-contract and UI implementation must not start.
- Read-only local Git inspection: main is 7a1d9c5a; cached origin/main is f3a0bf15 (Equation V6, #21). Local main is ahead 1 / behind 8 relative to that cached ref. No fetch/merge/rebase/reset/staging/commit/push was performed.
- The eight remote-side commits cover Equation periodic, composition, parameters, systems, proof performance and result-contract work. Their path diff does not modify integration/core. Shared memory and future result-contract changes require reconciliation.
- No V6 implementation was created locally. The planned Integration V6 designation is withdrawn pending contract review after synchronization; do not automatically choose another version number.
- The earlier final TypeScript process handle was no longer available after interruption. A fresh incremental TypeScript check completed successfully; no full core suite was rerun.

## Authorized commit and synchronization

- 2026-10-05: user approved committing the completed normalization gate, then synchronizing cloud history. Repository lint/build are the remaining commit checks. No push and no Integration result-contract/UI work.
- Commit checks passed: repository lint (zero errors; one pre-existing Graphing effect-cleanup warning), production build (37.41 s; existing chunk warnings), memory validation and diff hygiene.
