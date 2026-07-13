# CANONICAL-MATHJSON-LEGACY-ROADMAP0

Date: 2026-07-12
Last updated: 2026-07-13
Status: active; Moves 0-2 verified; no push is authorized

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

Complete bounded producer-proven MathJSON coverage for every representable canonical math leaf, replace the duplicate live result envelope with `CanonicalRuntimeOutcome`, and physically remove deferred Display and History compatibility scaffolding without changing mathematics, wording, formatting, worker topology, OOE authority, capability identity, or Surface DTOs.

This is an expandable sequence of named gates. A discovered prerequisite must be evidenced, added here, and explicitly approved before implementation. Ordinary solver capability work may continue behind frozen result boundaries, but no other lane may change result contracts, Display, History, Clipboard, producer adapters, or worker result envelopes until closeout.

## Starting Point

- Git baseline: `0a173b61` on `main`, one commit ahead of `origin/main`.
- Protected concurrent work: Notebook page, Notebook districts, Notebook styles/tests, and untracked `test-results/`. They are excluded from staging and commits.
- Accepted inversion baseline: 619 producer boundaries, 594 consumer reads, one legacy-History compatibility projection, 29 owner assemblies, 411 legacy reads, 154 native-document paths, and zero computational producer compatibility debt.
- Accepted printer baseline: 537 result paths, 279 migrated producers, 244 forwarders, and zero compatibility fallbacks.
- Executable evidence baseline: 43 golden executions, 100 deterministic History replay fixtures, and 19 Chromium workspace canaries.
- The 43 golden documents currently contain 196 `CanonicalMathValueV1` leaves and only 9 proven MathJSON leaves, all in Calculate.
- Golden canonical documents total 36,275 serialized UTF-8 bytes. Per-workspace maximums are Calculate 1,724, Equation 1,596, Calculus 1,667, Trigonometry 1,291, Geometry 490, Statistics 651, Matrix 2,189, Vector 1,389, and Table 830 bytes.
- Warm structured-clone P95 is below 0.016 ms in every sampled workspace on the baseline host. These timings are machine-local comparison evidence, not portable performance claims.

## Locked Contracts

- Keep `CanonicalResultDocumentV1` and standard Compute Engine MathJSON. Do not add custom Calcwiz MathJSON heads and do not create a universal solver AST.
- Every representable canonical math leaf must carry producer-proven MathJSON. Nested rows, branches, systems, conditions, details, substitutions, supplements, and Table cells are in scope.
- A LaTeX-only exemption is legal only for standard-MathJSON unrepresentability or committed bounds. It requires an exact owner, route, executable fixture, rationale, and non-growing ratchet.
- Proof requires answer ownership, clone safety, existing bounds, standard Compute Engine boxing, semantic equivalence, and canonical-printer parity. Normalized input and reparsed formatted output are prohibited substitutes.
- Domain solvers retain native IRs. Workspace-owned final adapters alone convert proven answer values into standard MathJSON.
- Final result traffic uses `CanonicalRuntimeOutcome`: success/error carries one validated canonical document plus optional canonical actions and runtime advisories; prompts remain separate control outcomes with `carryLatex`.
- History normally persists all proven trees. A row over the History storage budget retries with the same canonical structure and canonical LaTeX after removing optional MathJSON, recording `canonical-only-fallback`.
- Invalid or structurally oversized live canonical truth fails closed and never degrades to a string snapshot.
- Old rows without structured results and malformed V1 rows are removed with a non-blocking count notice.
- Future-version rows are hidden and preserved verbatim. V1 display and 80-row retention apply only to V1-owned visible rows; browser and Tauri rewrites retain opaque future rows.

## Sequence

1. `CANONICAL-MATHJSON-LEGACY-ROADMAP0`.
2. `MATHJSON-COVERAGE-REGISTRY1`.
3. `PROVEN-ANSWER-MATHJSON-CONTRACT1`.
4. `CANONICAL-PRODUCER-MATH-VALUE1`.
5. `MATHJSON-COVERAGE-CALCULATE-EQUATION1`.
6. `MATHJSON-COVERAGE-SYMBOLIC-CALCULUS1`.
7. `MATHJSON-COVERAGE-GUIDED-DOMAINS1`.
8. `MATHJSON-COVERAGE-LINEAR-ALGEBRA1`.
9. `MATHJSON-COVERAGE-CLOSEOUT1`.
10. `EQUATION-STAGE-CARRIER-GUARDED1`.
11. `EQUATION-STAGE-CARRIER-CLOSEOUT1`.
12. `CANONICAL-RUNTIME-OUTCOME1`.
13. `CANONICAL-OUTCOME-CALCULATE-EQUATION1`.
14. `CANONICAL-OUTCOME-SYMBOLIC-CALCULUS1`.
15. `CANONICAL-OUTCOME-GUIDED-DOMAINS1`.
16. `CANONICAL-OUTCOME-LINEAR-ALGEBRA-TABLE1`.
17. `CANONICAL-CONSUMER-DIRECT1`.
18. `HISTORY-CANONICAL-ONLY1`.
19. `DISPLAY-DETAIL-LEGACY-CLOSEOUT1`.
20. `RESULT-COMPATIBILITY-REMOVAL1`.
21. `CANONICAL-MATHJSON-LEGACY-CLOSEOUT0`.

## Payload Ratchet

- Retain 2,000 nodes, depth 64, and 320,000 bytes per MathJSON; 10,000 nodes, depth 64, and 640,000 bytes per canonical document; and 2,000,000 bytes per History append.
- Hard-ratchet serialized bytes per workspace and route family. Baseline changes require `--accept` and a durable reason.
- Measure five cold and fifty warm structured-clone runs. Block when two of three reruns exceed accepted median or P95 by both 20 percent and 0.5 ms.

## Physical Removal Target

- Delete `DisplayOutcome`, `DisplayMathPayloadV1`, duplicate top-level result fields, legacy readback/detail carriers, summary strings, detail inference, compatibility projections/resolvers, `legacyHistoryOutcome`, legacy History result fields, whole-document omission fallback, and all legacy-read allowances.
- Retain canonical LaTeX, input LaTeX, replay seeds, domain-native IRs, printer profiles, derived `DisplayBlock` presentation models, `HistoryReplaySnapshotV1`, prompts, OOE authority, and independent workspace workers.

## Verification

- Every gate runs focused tests, TypeScript, build, lint, file-size, memory, boundary, seam, worker/fallback, and diff-hygiene checks.
- MathJSON coverage uses an exhaustive route registry plus native executable probes, not only the golden and replay corpora.
- Every app-visible slice receives real Playwright inspection across affected cards, details, controlled errors, Formula Viewer, Clipboard, History, and overflow.
- History closeout covers browser reload, Calculator Memory, valid V1, old/malformed cleanup, opaque future preservation, fallback stripping, visible-row retention, atomic browser/Tauri rewrite, persistence failure, and real Tauri restart.
- Final closeout runs full unit/UI/E2E, 19 canaries, 100 replay fixtures, runtime probes/contracts, printer/detail/clipboard gates, TypeScript, build, lint, file-size, memory, boundaries, `cargo check`, native tests, and `git diff --check`.

## Governance

- Standing commit approval covers all 19 numbered program moves, including paired named subgates inside the producer-lane moves. No push is authorized.
- An inserted prerequisite, combined milestone, intentional output change, or scope change requires fresh approval.
- Statistics guided controls, capability expansion, Surface hosting, and universal solver/interchange AST work remain out of scope.
- Durable records use `codex`, `gpt-5.6`, family `sol`.

## Progress

- Roadmap contract accepted by the user on 2026-07-12.
- `CANONICAL-MATHJSON-LEGACY-ROADMAP0`: verified. Memory protocol, Display inversion, result contract, printer migration, file-size, and diff-hygiene gates pass; standing commit approval is recorded.
- `MATHJSON-COVERAGE-REGISTRY1`: verified. The registry covers 51 operation families, 27 canonical math path patterns, and all 100 native replay probes. Its accepted baseline is 262 leaves, 26 proven, 236 missing, and zero exemptions. CI, release, and seam selection run the additive gate.
- `PROVEN-ANSWER-MATHJSON-CONTRACT1`: verified. Producer ownership and answer identity are compile-time branded and runtime checked; accepted trees pass existing bounds, structured-clone safety, standard Compute Engine boxing, semantic equivalence, and compatibility-printer parity. Canonical-LaTeX parsing is validation evidence only, and the proof returns the original producer tree rather than manufacturing an answer tree from formatted output.
