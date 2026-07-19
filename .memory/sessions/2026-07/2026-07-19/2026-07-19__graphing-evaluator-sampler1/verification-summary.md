# GRAPHING-EVALUATOR-SAMPLER1 verification summary

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

- `npm run test:graph-sampling` passed 12 evaluator/sampler tests, 7 boundary-ratchet tests, and the live 23-file Graph boundary scan. Coverage includes compiled-plan reuse, standard constants/operators, missing/domain/division/overflow stops, smooth `sin(x)`, split `1/x`, real-domain `sqrt(x)`, viewport re-entry, steep and oscillatory functions, explicit-x coordinate routing, cooperative cancellation, and time/sample/vertex budgets. The boundary ratchet also rejects authored-source or Compute Engine reparsing below `GraphRelationIR`.
- `npm run test:graph-contracts` passed 13/13 plus the boundary ratchet; `npm run test:seam-impact-selector` passed 19/19 and proves evaluator/sampling paths select the Graph contract and sampling commands plus compartment/file-size evidence.
- Incremental TypeScript and focused ESLint passed for Graph evaluator/sampling source. The production build passed; the largest app chunk is 3,330.04 kB raw / 852.22 kB gzip, while the evaluator/sampler remains outside the hidden runtime chunk until its governed Move 7 host consumes it.
- `npm run test:compartments-boundaries` passed 36/36 plus live validation; `npm run test:ci-gate-alignment` passed 9/9 plus live alignment.
- `npm run test:memory-protocol` passed 21/21 plus live validation; `npm run test:file-sizes` passed 10/10 across 2,060 files; `git diff --check` passed.
- A dependency/import scan confirms `three` remains absent from package manifests and production imports.
- Playwright is not required because this backend gate has no public launcher, editor, page, scene adapter, renderer, or app-visible mathematical output.

## Scope integrity

- No React/UI, worker/OOE capability, implicit-region algorithm, scene adapter, renderer, private solver import, History/Notebook/Surface Protocol change, result contract, or Three.js dependency/import was added.
- Authored LaTeX is neither read nor reparsed by evaluation or sampling; validated `GraphRelationIR` remains the sole mathematical input.
