# V1-TYPED-DETAIL-CLEANUP

Date: 2026-07-14
Last updated: 2026-07-14
Status: active; Move 1 verified and awaiting commit approval; no push is authorized

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: sol
- attribution_basis: live

## Purpose

Replace mathematical pseudo-label strings in existing `CanonicalResultDocumentV1` details with human prose plus producer-proven inline math. Keep the V1 schema, renderer, History, workers, OOE, consumers, mathematics, and existing persisted documents unchanged.

## Starting Point

- Git baseline requested by the user: `eceffe89`.
- Live resync: concurrent Notebook work advanced `main` to `1b96f1d1`; this program continues on that commit without rewriting it.
- Protected paths: all concurrent Notebook source, tests, styles, and untracked `test-results/`.
- Accepted MathJSON baseline: 458 leaves, 394 proven, 64 exact exemptions, and zero missing classifications.
- Target: exactly 23 exemptions: 19 pre-existing non-detail exemptions plus four honest Matrix row-operation arrows.

## Locked Boundaries

- Reuse V1 typed text/math detail parts; do not change schemas or consumer contracts.
- Attach MathJSON only from producer-owned native values that pass standard Compute Engine validity, semantic equivalence, clone safety, bounds, and printer parity.
- Do not parse rendered LaTeX, create custom MathJSON heads, or relabel mathematical values as prose to improve coverage.
- Existing History rows remain byte-for-byte unchanged; only newly computed results receive the cleaned detail structure.
- Preserve independent workers, hosts, capabilities, replay seeds, OOE authority, solver cores, and visible mathematical values.

## Sequence

1. `V1-TYPED-DETAIL-CALCULUS1`: verified; awaiting commit approval. Calculus coverage is now 460 leaves, 410 proven, 50 exempt, and zero missing. `calculus.derivatives` moved from 14 to 2 exemptions and `calculus.partials` from 2 to 0.
2. `V1-TYPED-DETAIL-TRIGONOMETRY1`: pending. Target `trigonometry.period-phase` from 8 to 1.
3. `V1-TYPED-DETAIL-MATRIX-SYSTEM1`: pending. Target `matrix.linear-system` from 7 to 4, retaining the four row-operation arrows.
4. `V1-TYPED-DETAIL-LINEAR-ALGEBRA-PROFILES1`: pending. Target `matrix.profile` from 17 to 4 and `vector.span-independence` from 6 to 2.
5. `V1-TYPED-DETAIL-CLOSEOUT0`: pending. Remove obsolete exemption rules, accept exactly 23 exemptions and zero missing classifications, and close the fixtures, print-hygiene, memory, and visual evidence.

## Move 1 Evidence

- Derivative, derivative-at-point, mixed-partial, and implicit-derivative details now use sentence-case prose around native variable, relation, substitution, derivative-step, and result math values.
- All 63 result-contract tests pass, covering all 43 golden and 100 replay executions.
- All 449 live detail producers remain explicitly declared; result-intent coverage passes.
- Focused Calculus engine, implicit-derivative, replay, coverage, and UI tests pass.
- Chromium inspection covers ordinary derivative, implicit derivative, mixed partial, expanded details, compact History, and overflow. Screenshots are retained under `.task_tmp/v1-typed-detail-cleanup/`.

## Verification Policy

- Each move runs affected domain tests, MathJSON coverage, result-contract and detail-intent ratchets, incremental TypeScript, changed-file lint, file-size, memory, and diff hygiene.
- Each visible slice receives focused Chromium inspection. Temporary test files are removed after evidence collection.
- Full unit, UI, or canary suites remain reserved for genuine broad invalidation; no broad suite is required by the current V1-compatible producer-only changes.

## Governance

- Use one explicitly approved commit per named move. No push is authorized.
- Any schema, renderer, History, worker, OOE, consumer-contract, or intentional mathematics change requires a revised roadmap and fresh approval.
- Durable records use `codex`, `gpt-5.6`, family `sol`.
