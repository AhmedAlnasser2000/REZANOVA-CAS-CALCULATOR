# GRAPHING-CONTRACT-PERFORMANCE-FOUNDATION1 verification summary

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

- `npm run test:graph-contracts` passed 13 Vitest contract/performance/scene tests plus 5 Node boundary-ratchet tests and the live seven-file import scan. Coverage includes round trips, malformed/cyclic/non-finite/oversized rejection, condition bounds, clone-safe sampling envelopes, typed-array scene ownership, strict renderer-state rejection, canonical-key snapshot hash golden, and performance budget evaluation.
- `npm run test:seam-impact-selector` passed 16/16 and proves Graph-owned source selects the dedicated Graph ratchet and compartment/file-size baseline evidence.
- `npm run test:ci-gate-alignment` passed 9/9 plus live alignment and proves the existing executable seam runner keeps the new Graph command represented without weakening static CI gates.
- `npm run test:compartments-boundaries` passed 36/36 plus live validation across 1,358 source files and proves the future-state Graphing compartment and public/private seams align with repository ownership policy.
- `npx tsc -b --pretty false` and focused ESLint passed for all new Graph source and touched ratchet/manifest files.
- `npm run test:memory-protocol` passed 21/21 plus live validation; `npm run test:file-sizes` passed 10/10 and all 2,035 files; `git diff --check` passed.
- Playwright is not required because this backend gate exposes no page, controls, or app-visible output.

## Scope integrity

- No React page, workspace identity, New Graph entry, worker, OOE capability, History/Notebook/Surface Protocol change, analysis/export implementation, renderer, package dependency, or Three.js import was added.
- `GraphRelationIR`, not LaTeX, is the downstream math authority.
