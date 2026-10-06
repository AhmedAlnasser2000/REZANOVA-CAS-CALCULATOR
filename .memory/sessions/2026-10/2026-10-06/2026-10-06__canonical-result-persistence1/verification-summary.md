# Focused current-result persistence

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

## Scope and outcome — 2026-10-06

- Gate kind: ui. CRITICAL root-only; focused persistence and shared consumers verified. Unfinished old-workspace migration and global retirement are explicitly user-deferred.
- Browser/native History accept valid current schema-7 results. Valid deferred-workspace records remain on their existing bounded paths; no historical converter or recomputation migration was introduced.
- Incompatible rows are removed through the existing ledger validation. Calculator Memory cleanup invalidates dependent Ans to zero and saved Display authority; settings and variable memory survive. Whole browser-state replacement is atomic; failed writes leave the original for safe retry. Native cleanup uses the existing save command.
- Notification-only receipts survive duplicate startup reads (including React StrictMode) until the active UI acknowledges them. They contain counts only, never result authority. Cleanup and notice acknowledgment are idempotent; incompatible data is not trusted during a failed persistence write.
- New Equation/New Integration persist drafts/preferences, not trusted results. Those keys remain unchanged; restoration performs no automatic computation. Graph documents and unrelated settings/documents remain untouched.
- Unit evidence: 54 shared contract/persistence tests; later 22 focused persistence/runtime/draft tests; 34 focused runtime/UI tests and 19 persistence/settings UI tests pass with two workers. Overlapping suites are not an additive total. Tests cover interrupted replacement, repeat cleanup, settings/draft preservation, invalidated Ans, current actions and unsupported reuse semantics.
- Final notification/storage/coverage delta: 20 tests passed, two workers. Unacknowledged receipts survive duplicate reads; malformed counts are ignored, unavailable notification storage retains a session notice, acknowledgment clears it and storage instances do not share counts. All 147 mathematical coverage probes remain checked.
- Real `npm run dev` / Chromium: `e2e/canonical-current-persistence.spec.ts`, 1 passed (59.9 s). Inspected the cleanup notice, restored Integration expression/full-view preference without a trusted answer, verified root-log answer/conditions after a new run, restored Equation draft and freshly solved ±sqrt(2). Reload does not repeat the acknowledged notice; unrelated document data is unchanged. Screenshots retained in this dossier.
- Native History test `current_schema_seven_history_is_supported_and_clearable`: 1 passed. Existing native storage ownership is preserved.
- Scoped lint, incremental TypeScript, authority/display checks, OOE/compartment/file-size checks and build pass. Final repository lint passes after the concurrent Graphing export correction, with one hooks warning; no staging, commit or push.
- Final durable-memory validator, 2,641-file size check (five existing caps) and diff hygiene pass. No verification process launched by this lane remains running; the pre-existing npm-dev server remains owned by the concurrent lane.

## Remaining program boundary

- All three items in the narrowed migration scope are closed: Graphing analysis, shared consumers/actions, persistence cleanup/notification. Old-contract retirement remains deferred.
- New Integration remains rational-only until the separate exponential result adapter and adoption gates pass. Current schema includes their semantic kinds, but schema validity does not establish a mathematical decision.
- Imported files are untouched; no old artifact is silently converted or recomputed.
