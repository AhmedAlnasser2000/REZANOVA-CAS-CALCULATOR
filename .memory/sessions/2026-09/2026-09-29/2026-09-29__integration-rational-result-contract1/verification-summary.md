# INTEGRATION-RATIONAL-RESULT-CONTRACT1 verification

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

## Evidence

Verified 2026-09-29, root-only. Implementation is available for local use; final milestone signoff remains blocked by the unrelated Calculate enforcement failures below. No staging, commit, push, dependencies or delegated work.

- Focused core/adoption/navigation tests: 21 files, 198 passed, including all 138 existing private-core tests (`final-tests.log`). The final structural V5 projection delta passed 36 tests (`projection-delta.log`).
- Result-contract suite: 19 files, 146 passed with two workers (`contracts-final.log`); V1–V4 compatibility remains covered.
- Focused React UI tests: 4 files, 19 passed with two workers (`ui-final-corrected.log`). The launcher expectation explicitly preserves host categories while accepting the new client-owned entry.
- Rust OOE tests: 43 passed (`rust.log`). Compartment and OOE boundary validators passed (`boundaries-final.log`).
- Incremental TypeScript and production build passed: `npm run build`, Vite 40.95 s (`build-final.log`). Scoped lint passed (`scoped-lint-final.log`, `ratchet-lint.log`). Earlier repository lint had zero errors and two existing Graphing cleanup-ref warnings (`repo-lint.log`); a subsequent commit must refresh its commit gates.
- Placeholder policy: 4 validator tests and source validation passed (`mathfield-placeholders-final.log`). File-size gate: 10 tests and 2,289 sources passed. Memory gate: 23 tests and validation passed. Diff hygiene passed.
- Canonical authority enforcement: 7 validator tests passed, then repository validation failed on the existing Calculate files. Display inversion: 23/24 tests passed; its pinned producer/native counts and direct inventory validation also expose those Calculate changes. New Integration adds exactly four canonical reads, no legacy reads or compatibility projections. Only those owned reads and its page classification are added to the baseline; unrelated Calculate inventory was deliberately left unaccepted.
- Logs and screenshots are retained under ignored `.task_tmp/new-integration/`; this durable summary records their actual outcomes.

The backend prerequisite does not itself claim visual acceptance. See the adoption dossier for the separate real-app checks.

## Known repository blocker

`node tools/canonical-result-v2-enforcement.mjs` reports a frozen V1 mismatch in `src/lib/modes/calculate/standard.ts` and an unfrozen V1 builder in `src/lib/modes/calculate/inline-linear-algebra.ts`. Neither file is changed in this lane. `standard.ts` worktree and HEAD both hash to `0741ec4c10c38b49c84fda50827249114ccc0235ce1a953895860f862c7dc0b2`; the frozen baseline expects `959e401511c5963831892b5d96988992e8b5d575ff3f20c17b3da089b4542921`. No digest rewrite, exemption or hidden bypass is allowed. The display-inversion inventory likewise reports three native documents in `inline-linear-algebra.ts` and one forwarder in `standard.ts` outside its accepted baseline. Both files match HEAD and were not edited in this lane. This needs a separately scoped Calculate migration and corresponding authority/inventory updates; the integration baseline must not absorb it.

## 2026-09-29 closeout continuation after Claude handoff

User reported Claude finished; inspected commit `f1abd519` (Claude / claude-sonnet-5-5). Canonical enforcement now passes (7 tooling tests, 12 contract tests, 20 frozen files), and display inversion passes (24 tests and repository inventory). Prior blocker details above are historical observations of the earlier HEAD.

Added the missing New Integration worker-required runtime probe, keeping it separate from fallback/History-based probes. The launcher coverage floor is now 10. The probe executes the real OOE shell with an unavailable worker, checks controlled error and job/commit evidence, and checks stale-drop behavior; no production fallback is introduced. Focused runtime tests: 16 passed (12 registry plus 4 New Integration worker tests). Scoped lint, compartment/OOE validators, file-size validation and diff hygiene pass. Earlier application and core evidence remains applicable; this continuation changes only probe coverage. Logs: `.task_tmp/new-integration/closeout-{authority,runtime,typescript,display}.log`.

Final signoff remains blocked by a new compile error in Claude's commit: `src/lib/modes/calculate/inline-linear-algebra.ts:49` returns `ResultProducerDraftV2` while its signature declares V1 `ResultProducerDraft | null`. A read-only/temporary type propagation check exposed affected `calculate/mode.ts`, `calculate/runtime.ts`, existing Calculus derivative consumers and Calculate tests. All exploratory Calculate edits were reverted exactly; no frozen source or Calculate runtime behavior was changed. Resolving this requires an explicit bounded scope extension beyond New Integration, without unsafe casts or V1 fallback. No staging, commit or push.

## 2026-09-29 final closeout

User authorized finishing and committing the gate after confirming the Calculate mismatch does not affect reconstruction mathematics. The bounded compatibility repair propagates versioned Calculate drafts through the nonfrozen wrapper/runtime, narrows unowned errors explicitly, and exposes the existing scalar producer for scalar Calculus derivative consumers. No unsafe cast, frozen-producer edit or rational-kernel change. Calculate standard tests target the frozen producer; inline Matrix/Vector tests require V2.

The display inventory now recognizes the existing `VersionedResultProducerDraft` union, with a focused regression test. This retains all 165 native documents and also observes existing Statistics/Trigonometry forwarders; no source in those workspaces was changed. Inventory: 445 producer boundaries, 62 canonical consumer reads, 94 producer-draft reads, zero compatibility projections and zero legacy reads.

Final evidence: incremental TypeScript passed; 74 affected Calculate/Calculus/runtime tests passed, with a further 7-test inline V2 assertion delta. All earlier 138 core, 198 focused adoption, 146 contract and 19 UI evidence remains applicable. Repository lint: zero errors, two pre-existing Graphing cleanup-ref warnings. Production build passed in 39.69 s. Five Chromium scenarios passed in 41.1 s against `npm run dev -- --host 127.0.0.1 --port 1421`, covering New Integration plus existing scalar derivatives, derivative at a point, copy and History replay. Reviewed derivative and formal integration screenshots in `.task_tmp/new-integration/playwright-commit/`; prior narrow-screen/error/condition review is retained.

Both original authority blockers and the compile blocker are resolved. Final authority/display, memory, size, boundary and diff gates are recorded in the commit logs. This closes the backend V5 prerequisite and the first user-facing rational adoption milestone. Resource exhaustion remains an honest supported stop, not a claim of unlimited practical capacity. Old Calculus retirement, real-valued branch conversion, symbolic parameters, wider differential fields and parallel computation remain separate work. One cohesive user-authorized integration adoption commit; no push. Concurrent Graphing and Agent Attention changes are excluded.

Final ratchet readback: `commit-display-final.log` reports all 25 tests and repository inventory passing. Final memory, file-size, compartment/OOE and diff validators passed after the concurrent Graphing commit. Concurrent Graphing source changes did not invalidate the integration or scalar-consumer evidence and were not modified by this lane.
