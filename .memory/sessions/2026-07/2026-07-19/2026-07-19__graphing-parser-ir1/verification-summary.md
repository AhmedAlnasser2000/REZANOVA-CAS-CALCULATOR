# GRAPHING-PARSER-IR1 verification summary

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

- `npm run test:graph-parser` passed 25 parser/adapter tests plus 6 Node boundary-ratchet tests and the live 14-file Graph scan. Coverage includes bare `x`, `sin(x)`, constants and unresolved scalars; explicit/implicit relations; strict/inclusive chains; piecewise/otherwise; points; polar and parametric syntax; source immutability; workload-source alignment; and unsafe/unknown/malformed/cyclic/non-finite/over-budget failures.
- `npm run test:graph-contracts` passed 13/13 plus the Graph boundary ratchet, proving parser output remains valid against the committed relation/condition/piecewise contracts.
- `npm run test:seam-impact-selector` passed 18/18 and proves parser changes select both Graph contract and parser commands plus compartment/file-size evidence.
- `npm run test:compartments-boundaries` passed 36/36 plus live validation; `npm run test:ci-gate-alignment` passed 9/9 plus live alignment.
- `npx tsc -b --pretty false` and focused ESLint passed. `npm run build` passed; the hidden Graph runtime remains a separate 9.55 kB chunk and the reported main index remains 3,409.96 kB.
- `npm run test:memory-protocol` passed 21/21 plus live validation; `npm run test:file-sizes` passed 10/10 across 2,049 files; `git diff --check` passed.
- A focused dependency/import scan confirms `three` remains absent from package manifests and Graph production imports.
- Playwright is not required because this backend gate has no public launcher, editor, page, renderer, or app-visible mathematical output.

## Scope integrity

- No React/UI, sampler, worker/OOE capability, renderer, solver-private import, History/Notebook/Surface Protocol change, calculator Variables access, result contract, or Three.js dependency/import was added.
- Authored LaTeX is used only at the source-to-structural-MathJSON ingress and cannot drive relation classification.
