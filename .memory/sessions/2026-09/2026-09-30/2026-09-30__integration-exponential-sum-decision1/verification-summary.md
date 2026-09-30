# INTEGRATION-EXPONENTIAL-SUM-DECISION1 verification

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

## Backend acceptance

- Approved CRITICAL, root-only backend milestone. No subagents, dependencies, app/result changes or push. User subsequently authorized the completed milestone commit.
- Retained core run: 25 files, 384 tests pass (323 retained + 61 new), two workers, 12.04 s. Includes kernel isolation, all existing arithmetic/RDE/rational/differential/hyperexponential tests and historical artifact fixtures.
- Final affected delta: 63 tests pass, two workers, 5.76 s. Adds negative-prefix/unsolved-suffix replay and zero/fractional-power/large-coefficient artifact cases, plus explicit rational residue-variable validation and charged exponent negation. Total coverage: 323 retained + 63 new = 386 tests.
- Positive, negative and pure rational artifacts replay with sum/grouping/admission/derivative/RDE/root-search/bound/matrix/linear/Hermite/LRT producers disabled. Exact encode-decode-encode structure is unchanged; extensions rebuild freshly against the expected base owner.
- Cancellation, grouping coverage, unsupported surviving families, retained canceled denominators, mixed signs, shifted arguments, root-log rational parts, deterministic early negative stops, seeded rational primitives, ownership, tampering and stage-specific exhaustion are covered.
- Incremental TypeScript and scoped ESLint pass. Repository lint passes with zero errors and one existing Graphing ref-cleanup warning in useGraphWorkspaceController.ts.
- OOE and compartment boundary validators pass; isolation passed in the retained core run.
- Repository TypeScript/Vite build passes (Vite 37.05 s); existing mixed static/dynamic Graphing import notice remains. Memory protocol passes (24 validator tests); file-size gate passes (10 tests, 2,364 scanned files). Working diff hygiene passes. Final staged audit passes: 21 milestone-owned files, required durable memory included, no Graphing/Agent Attention/probe paths; staged diff hygiene passes.
- No Playwright: this gate adds private backend modules and does not change application behavior. All prior public interfaces and codecs remain unchanged.

## Proof and resource evidence

The specification documents both positive/negative Laurent coefficient extraction, the admission obstruction over C(x), rational matrix descent, original-term coverage and the explicit native-rational bridge. The verifier reconstructs identities and replays stored certificates without regenerating producing searches. Negative authority requires a complete admitted family and complete RDE obstruction, not a partial primitive or exhausted computation.

Eight cases / five operations were measured serially with one warm-up and three measured runs, fresh contexts each time. No other heavy job was running during these measurements. See performance-results.md and measurements.json. Counts are cumulative accounting units, not RAM; RSS/heap are separate process observations. No timing acceptance target.

## Ownership boundary

Only new private core modules/tests/harness, the new calculus specification/roadmap and this milestone's durable-memory records belong to this gate. Preserve concurrent Graphing source/tests/probes and the September 28 Agent Attention journal/dossier edits. No test-results cleanup or unrelated source changes.
