# CANONICAL-RESULT-V2-CONTRACT1

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

- label: backend
- result: pass; standing user approval covers commit creation
- runtime/UI impact: none; current producers, consumers, History, and the live runtime alias remain V1
- protected state: concurrent Notebook changes and untracked `test-results/`

## Implemented Contract

- Added public `CanonicalResultDocumentV2`, `CanonicalResultDocument`, and required-MathJSON `CanonicalMathValueV2`.
- Added discriminated primaries, requests, supplements, Table cells, and Matrix row-operation parts with adapter-owned presentation beside semantics.
- Added strict clone-safe V2 validation, the V1/V2 active-version router, existing bounds, and rejection of missing MathJSON, custom operators, malformed structures, invalid semantic constraints, and unknown versions.
- Added producer-only standard MathJSON proof branding plus fail-closed V2 document/action builders.
- Added inactive version-paired V2 actions without widening the live V1 runtime alias.
- Added an exact 57-route frozen V1 anti-growth registry with no enabled V2 route or selector.

## Verification

- `npx vitest run src/lib/result-contract/v2-contract.test.ts`: 8 passed.
- `npx vitest run src/lib/result-contract/v2-contract.test.ts src/lib/result-contract/proven-answer-mathjson.test.ts src/lib/result-contract/runtime-outcome.test.ts`: 20 passed.
- `npm run test:result-contract`: passed across V1 and V2 contract coverage.
- `npx tsc -b --pretty false`: passed after a transient concurrent Notebook call-site edit settled; no V2 change was required.
- `npm run test:display-contract-inversion`: passed at 401 producer boundaries, 149 native documents, 57 canonical consumer reads, zero compatibility projections, and zero legacy reads.
- `npm run test:file-sizes`: passed with 1,831 files and five baseline caps.
- `git diff --check`: passed before durable-memory updates; rerun before staging.
- no Playwright required because the gate enables no production V2 route and changes no app-visible output.

## Handoff

- Commit as `CANONICAL-RESULT-V2-CONTRACT1` under standing approval.
- Next gate is `CANONICAL-RESULT-V2-CONSUMER-HISTORY1`; it owns the live normalized read authority and dual-version History/runtime integration.
- Do not enable a production V2 selector before the consumer/History gate is committed.
- Do not push.
