# GRAPHING-SAMPLE-OOE1 verification summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: sol
- attribution_basis: live
- gate_type: backend
- date: 2026-07-19

## Focused evidence

- `npm run test:graph-ooe` passed 27 focused Vitest cases, 51 Graph/OOE/compartment boundary tests, and all three live validators. A final single-worker delta run passed the added worker/request identity rejection, bringing the focused host file to 7/7 and its combined scene/request/host set to 20/20. Coverage includes worker reuse, worker/fallback semantic hash parity, structured cloning, request/revision matching, tab cancellation/hard stop, latest-only stale/closed drop, transferred-buffer detachment, per-item budget attribution, Graph diagnostics/compartment facts, runtime probe evidence, and absence of a History launch ticket.
- `npm run test:graph-contracts`, `npm run test:graph-sampling`, and `npm run test:graph-scene` passed 13, 15, and 9 focused tests respectively plus their Graph boundary scans. Scene runtime hashing matches deterministic headless hashes while streaming typed-array tokens without materializing JSON numeric arrays.
- `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check` and `cargo test --manifest-path src-tauri/Cargo.toml ooe:: --lib -- --nocapture` passed all 43 focused Rust OOE tests, including exact host/capability registries and plan validation.
- `npm run test:seam-impact-selector` passed 21/21 and proves Graph OOE paths add the dedicated `test:graph-ooe` command plus OOE/compartment/file-size evidence. The Graph workspace runtime passed 56 focused unit/UI tests, bridge schema passed 8/8, and CI alignment passed 9/9 plus live validation.
- Incremental TypeScript, Graph-scoped ESLint, the production build, memory protocol 21/21, file-size validation 10/10 across 2,078 files, Rust formatting, OOE/compartment/Graph boundaries, and diff hygiene pass. The production build emitted a separate `graph-sampling.worker` asset; the post-build per-item stop-attribution correction was rechecked with the affected single-worker Vitest set and TypeScript instead of repeating the build.
- A disposable maximum-scene spot check over 160,000 vertices measured runtime/headless-equivalent hashing at about 35ms unthrottled after replacing JSON coordinate formatting; the initial form measured about 168ms and was rejected before commit. Hash verification runs in the isolated worker, while the main thread performs structural transfer validation. This is local design evidence, not the Move 13 performance checkpoint or a throttled acceptance claim.
- Playwright is not required because Move 7 keeps `New Graph` hidden and has no app-visible page, plot, label, or output. Tab cancellation is proven through the real workspace-job cancellation seam in focused runtime tests; visible rapid viewport/close acceptance begins with Move 8.

## Scope integrity

- Graph sampling reads only validated `GraphRelationIR` and parameter values. MathLive/LaTeX remains source/provenance and is never parsed or treated as mathematical authority in the sampler or worker.
- No React/UI, History ticket, OOE diagnostics UI, analysis/export implementation, private solver import, renderer, Surface Protocol, Notebook, calculator Variables, or Three.js dependency/import was added.
