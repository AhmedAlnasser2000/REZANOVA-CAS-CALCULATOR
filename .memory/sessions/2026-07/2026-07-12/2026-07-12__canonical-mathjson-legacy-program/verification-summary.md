# Canonical MathJSON And Legacy Removal Verification Summary

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

## CANONICAL-MATHJSON-LEGACY-ROADMAP0

- kind: backend architecture and governance baseline
- result: pass
- runtime behavior changed: no
- intentional mathematical or visible output change: no
- push: not authorized

## Baseline Evidence

- Head: `0a173b61`; `main` is one commit ahead of `origin/main`.
- Display inversion report: accepted without source-fingerprint drift.
- Golden payload sample: 43 canonical documents, 36,275 total bytes, 196 canonical math leaves, and 9 MathJSON leaves.
- Maximum sampled document: Matrix at 2,189 bytes.
- Warm structured-clone P95: below 0.016 ms for every sampled workspace on this host.

## Commands

- `npm run test:memory-protocol`: pass, 21 tests plus live validation.
- `npm run test:display-contract-inversion`: pass, 20 tests and accepted 619/594 inventory.
- `npm run test:result-contract`: pass, 9 files and 38 tests.
- `npm run test:printer-migration`: pass, 7 tests and zero compatibility fallbacks.
- `npm run test:file-sizes`: pass, 1,761 files and 7 baseline caps.
- `git diff --check`: pass.

## Exclusions

- Notebook source, styles, and tests remain owned by the concurrent Notebook lane.
- `.task_tmp/` benchmark details and untracked `test-results/` remain ignored and excluded.

## MATHJSON-COVERAGE-REGISTRY1

- result: pass; backend-only with no runtime output change.
- `npm run test:mathjson-coverage`: 4 tests plus 100 native probes pass at 262 leaves, 26 proven, 236 missing, and zero exemptions.
- `npm run test:workspace-runtime-contracts`: 12 files and 76 tests pass.
- Result contract, History replay, CI alignment, seam selector, compartments, TypeScript, global lint, production build, file size, memory, and diff hygiene pass.
- The first production build exposed an audit-module barrel export and exhausted the default heap. Removing the export restored the normal 2,965-module build without a heap override.
