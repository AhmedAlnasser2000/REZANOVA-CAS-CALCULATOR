# CANONICAL-MATHJSON-LEGACY-ROADMAP0

Date: 2026-07-12
Last updated: 2026-07-13
Status: active; verified through `MATHJSON-COVERAGE-CLOSEOUT1`; no push is authorized

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
- `CANONICAL-PRODUCER-MATH-VALUE1`: verified. Calculate, Equation, Calculus, Trigonometry, Geometry, Statistics, Table, Matrix, and Vector owner adapters accept direct canonical math structures whose optional trees require the proven-answer brand. Direct values may add MathJSON only when their complete non-MathJSON structure matches the existing compatibility projection. The inversion inventory also classifies the coverage reporter's previously omitted control read, bringing the audit-only consumer count from 594 to 595 without runtime authority growth.
- `MATHJSON-COVERAGE-CALCULATE-EQUATION1`: verified. All 20 Calculate fixtures and every representable canonical leaf in the 25 Equation fixtures now carry producer-proven standard MathJSON. Coverage advances from 26 to 89 proven leaves, leaving 169 missing across later workspaces. Four exact fixture-scoped Equation supplements remain exempt because each compatibility string mixes a prose label with math; no displayed LaTeX was reparsed to invent a tree. Optional producer trees that fail semantic proof are omitted transactionally while canonical LaTeX remains authoritative. Broad verification passes 180 Equation/algebra/engine files and 1,506 tests, and isolated Chromium inspection confirms stable complex `i` notation, periodic-family rendering, radical range-guard evidence, and no overflow.
- `MATHJSON-COVERAGE-SYMBOLIC-CALCULUS1`: verified. Calculus retains producer-owned differentiated trees, integral and limit route evidence, series coefficients, Laplace table matches, ODE/IVP structures, implicit-derivative carrier evidence, and stored-value snapshots through its final workspace adapter. Of 80 Calculus replay leaves, 64 now carry proven standard MathJSON and 16 remain exact route-and-fixture exemptions for mixed operator/applied labels or the established malformed derivative-at-point compatibility surface. The global baseline is 262 leaves: 149 proven, 20 exempt, and 93 missing in later workspaces. Replay and print-hygiene baseline refreshes record MathJSON proof presence only; identity, cardinality, canonical LaTeX, visible formatting, and mathematics do not change. The structured-clone benchmark covers 25 Calculus documents and 19,673 serialized bytes with warm P95 of 0.175-0.181 ms per 25-document pass. Broad verification passes 156 Calculus/Symbolic files and 1,022 tests, all contract and replay gates, build/lint/static boundaries, and seven isolated Chromium cards without overflow.
- `MATHJSON-COVERAGE-GUIDED-DOMAINS1`: verified. Trigonometry retains native exact angles, function values, triangle summaries, and shared Equation branch trees; Geometry retains native scalar/point/shape evidence; Statistics retains native descriptive, frequency, inference, probability, regression, and diagnostic values; Table retains native function trees and rounded cell values through its owner adapter. Coverage advances to 212 proven leaves, 24 bounded exemptions, and 26 missing Matrix/Vector leaves. Four new exemptions classify two undefined Table cells as absent values and two guided request strings as control syntax. The 20-document guided payload grows from 8,237 to 11,592 bytes, with no blocked metric across three five-cold/fifty-warm clone reruns. All 100 probes, 43 golden cases, 100 replay fixtures, 485 UI tests, 19 Chromium canaries, runtime/worker contracts, presentation/clipboard/static boundaries, TypeScript, build, lint, file-size, and eight focused Chromium surfaces pass without output drift or overflow. `MATHJSON-COVERAGE-LINEAR-ALGEBRA1` is next.
- `MATHJSON-COVERAGE-LINEAR-ALGEBRA1`: verified. Matrix and Vector now convert their native exact scalar, vector, matrix, rational, set, equation, and representable angle evidence only in their independent final adapters. DEG and RAD angle values are proven; GRAD remains canonical-only because treating its visible `g` marker as an exponent would be false structure. The accepted 262-leaf baseline reaches 231 proven, 31 bounded exemptions, and zero missing proof. Seven new Matrix linear-system exemptions cover parser-invalid augmented-rank, augmented-RREF, and row-operation narration whose solution, rank, and count values are separately proven. Ten replay documents grow from 3,843 compatibility bytes to 5,116 current bytes; three five-cold/fifty-warm clone reruns report warm P95 of 0.040-0.042 ms with no blocked metric. Full unit and UI suites, all 100 probes, 43 golden cases, 100 replay fixtures, 19 Chromium canaries, nine History journeys, Linear Algebra trust flows, runtime/presentation/static boundaries, TypeScript, build, lint, Rust, and file-size gates pass. Ten focused Chromium routes preserve established output, detail counts, and overflow behavior. `MATHJSON-COVERAGE-CLOSEOUT1` is next.
- `RESOURCE-SAFE-VERIFICATION-POLICY1`: inserted and user-approved governance gate. Routine edits now use impact-selected tests; milestone commits use focused and cheap static gates; full unit/UI/canary or aggregate runs are reserved for closeout, release, or genuine cross-cutting invalidation. Vitest is capped at four workers in both configs and full-suite scripts. Bounded post-full-run corrections retain prior broad evidence plus targeted delta verification instead of restarting the suite automatically. Move 9 proceeds under this policy.
- `MATHJSON-COVERAGE-CLOSEOUT1`: verified. One exact registry now joins all 100 replay fixtures and all 43 golden executions across 57 operation families. The aggregate 458 canonical leaves contain 394 producer-proven standard MathJSON trees, 64 exact non-growing exemptions, and zero missing classifications. The golden layer contributes 163 proven and 33 exempt leaves without changing any displayed string, mathematical result, branch, action, warning, detail, or Table row. The accepted aggregate payload is 107,318 bytes with a 2,753-byte maximum document; 43-document structured-clone warm P95 is 0.377-0.381 ms and no regression metric blocks. Resource-safe verification uses the focused coverage ratchet, producer contracts, affected workspace tests, all 43 golden expectations, incremental static gates, and retained visual evidence from the preceding workspace slices. `EQUATION-STAGE-CARRIER-GUARDED1` is next.
- `EQUATION-STAGE-CARRIER-GUARDED1`: verified. The existing `EquationSolveResultContractV1` now serves as the guarded stage carrier. Shared merge, synchronous/asynchronous substitution, composition, algebra, mixed-polynomial, and trig-rewrite branch collections convert recursive results immediately and carry validated canonical documents plus Equation evidence instead of `DisplayOutcome[]`. Prompts fail closed. The AST inventory explicitly counts canonical carrier producers, raising Equation native coverage from 134 to 141 while retaining zero live compatibility producers; repository consumer observations fall from 613 to 603 as intermediate Display transport disappears. Focused Equation tests pass 192 cases and the 22-test AST ratchet passes, the production build passes, and five Chromium Equation flows preserve answers, domain facts, periodic structure, candidate evidence, collapsed summaries, and overflow. `EQUATION-STAGE-CARRIER-CLOSEOUT1` is next.
- `EQUATION-STAGE-CARRIER-CLOSEOUT1`: verified. Guarded runners, synchronous/asynchronous recursion, stage descriptors, cooperative cancellation, and orchestration now use `EquationSolveResultContractV1` carriers. Stage-owned compatibility builders convert at their local boundary and the public guarded-solve APIs derive Display only at `guarded/run.ts`; the isolated direct-symbolic worker payload remains the explicit `CANONICAL-RUNTIME-OUTCOME1` boundary and converts immediately on stage entry. The accepted AST inventory has 648 producer observations, 603 consumer observations, 171 native paths, 47 owner assemblies, one legacy-History compatibility projection, 411 legacy reads, and no violations. Focused Equation tests pass 192 cases, the 22-test ratchet passes, TypeScript, lint, file-size, production artifact, and five Chromium flows preserve output and overflow. `CANONICAL-RUNTIME-OUTCOME1` is next.
- `CANONICAL-RUNTIME-OUTCOME1`: verified. The neutral contract district defines `CanonicalRuntimeOutcome`, `CanonicalRuntimeActionV1`, and strict worker-boundary validation. Result outcomes carry only canonical document truth plus optional math-valued actions and advisories; prompts retain their existing control fields. The validator enforces document-kind parity, standard canonical math, clone-safe plain data, declared keys, 64 actions, 11,024 nodes, depth 65, and 704,000 bytes. All 70 result-contract tests, 22 inversion tests, TypeScript, lint, build, and file-size pass. No worker uses the contract yet; `CANONICAL-OUTCOME-CALCULATE-EQUATION1` is next.
