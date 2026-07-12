# MATHJSON-COVERAGE-REGISTRY1 Gate

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

## Gate

- kind: backend anti-regression registry and CI/tooling integration
- result: pass
- runtime behavior changed: no
- intentional mathematical or visible output change: no
- push: not authorized

## Contract Evidence

- Exact route parity: 51 operation families across all nine workspaces.
- Native executable probes: all 100 versioned History replay fixtures.
- Canonical leaf vocabulary: 27 stable path patterns covering every V1 math slot.
- Initial native report: 262 leaves, 26 proven MathJSON, 236 missing proof, zero exemptions, 51,813 serialized bytes, and 2,753-byte maximum document.
- Ratchet rejects route drift, fixture drift, canonical-leaf disappearance, proven-coverage loss, missing-debt growth, exemption changes, and maximum-payload growth without accepted baseline renewal.
- Stable human and JSON reports plus `--accept --reason` baseline updates are available through package scripts.

## Verification

- MathJSON registry: 4 tests and the live 100-fixture baseline pass.
- Result contract and History replay pass across all 43 golden and 100 replay executions.
- Workspace runtime contracts: 12 files and 76 tests pass.
- CI alignment: 16 static gates plus workspace canaries; seam selector: 14 tests; compartment boundary: 36 tests.
- TypeScript, global lint, file-size, memory-protocol, and diff-hygiene gates pass.
- Production build passes with 2,965 modules after keeping audit-only coverage imports out of the public result-contract barrel.

## Repaired Pre-Commit Finding

- The first draft exported coverage tooling from `src/lib/result-contract/index.ts`, pulling replay fixtures and native engines into the production graph and exhausting the default Vite heap.
- The audit modules now remain direct tool/test imports only. A clean default production build passes without raising the heap limit.

## Exclusions

- Concurrent Notebook source/styles/tests and untracked `test-results/` remain unstaged and untouched.
