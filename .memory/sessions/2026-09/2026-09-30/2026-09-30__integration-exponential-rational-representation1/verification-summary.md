# INTEGRATION-EXPONENTIAL-RATIONAL-REPRESENTATION1

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

## Backend checkpoint — continued 2026-10-01

- User approved CRITICAL, root-only implementation of two ordered milestones, then authorized commits after completion. No push; unrelated Graphing and Agent Attention changes remain outside this lane.
- Started 2026-09-30; resumed 2026-10-01. Preserve the original start date.
- Representation checkpoint: 386 retained + 24 new core tests pass, 26 files, two workers, 17.91 s. Incremental TypeScript, scoped lint, isolation, OOE and compartment checks pass at this checkpoint.
- No Playwright: private backend only; application behavior and public result contracts are unchanged.
- Resource observations and final affected checks are recorded below; source commit gates are being finalized.

## Final backend evidence — 2026-10-01

- Retained core run: all 469 mathematical tests passed; the sole isolation failure identified the new fixture helper outside `__tests__`. Moving that helper into `__tests__` fixed isolation without widening its allowlist. The focused isolation rerun passed.
- Final affected run after operation-scope/accounting tightening and the fixture move: 6 files, 85 tests pass, two workers, 43.24 s. Total retained coverage: 386 old + 24 representation + 60 decision = 470 tests.
- Positive, both negative, rational-only, rebased-generator, quadratic-residue and repeated-pole artifacts replay with admission, differentiation, resultant, trace, Hermite, residue-selection, rational integration, RDE and finite-sum producers disabled. Encode/decode/encode identity passes.
- Tampering covers normalization, Hermite identities, PRS/index/scalar evidence, coefficient derivatives, partitions, root weights, trace columns, target/construction binding, conditions and incomplete nested evidence. Sticky exhaustion produces no mathematical decision.
- Incremental TypeScript, scoped lint, isolation, OOE/compartment, memory protocol, file-size and diff hygiene checks pass. Repository source-commit lint/build results are recorded below when finalized.
- Representative construction, standalone verification, encoding and decoding were measured serially with fresh contexts, one warm-up and three measured runs. See performance-results.md and measurements.json; accounting units are distinguished from process memory.
- No Playwright: no app-visible behavior, public result format, parser, worker or UI adoption changes.

## Limitations and ownership

The unchanged profile can exhaust on intermediate coefficient growth; no completeness claim bypasses these safeguards. See the decision performance dossier for the exploratory repeated-(t+x)-pole cases. Primitive semantics remain local complex, with no chosen roots/principal logs/real forms. Only private core modules and gate documentation/memory belong to these commits. Graphing and September 28 Agent Attention edits remain unstaged.

## Source commit gates — 2026-10-01

- Repository lint passes: zero errors, one existing Graphing ref-cleanup warning. The first attempt raced removal of another agent's `ptx/zz-probe.test.ts`; the retry passes.
- Repository TypeScript/Vite build passes, Vite 36.81 s. The existing Graphing mixed static/dynamic import notice remains.
- Integration-owned diff hygiene passes. A concurrent Graphing `sampling.test.ts` EOF blank-line warning is outside this gate and is not staged or edited.
- Memory protocol and file-size validators pass; final staged audit must contain only the milestone-owned files and its required durable evidence.
