# PRINTER-MIGRATION-RATCHET1 Gate

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

- Kind: `backend` tooling and CI contract.
- Result: pass.
- Runtime behavior changed: no. The milestone inventories result serialization and enforces migration floors without changing mathematical or visible output.

## Contract Evidence

- The TypeScript compiler API scans 1,087 production TypeScript files and inventories known result properties plus guarded Equation result builders.
- The accepted baseline contains 515 result paths: 257 owned compatibility fallbacks, 18 migrated dual writes, 237 forwarders, one nonproducer History schema slot, and two absent optional slots.
- Stable fingerprints include lane, source kind, containing function, resolved expression, and fallback registration while ignoring line-only movement.
- New, changed, stale, or unclassified result paths fail. Compatibility floors are pinned per lane and narrow registration and may not increase.
- Every fallback registration has an owner and durable rationale; broad `src/` exemptions are invalid.
- Input syntax, presentation math, prose, reference content, canonical-printer internals, and downstream presentation are counted separately from producer debt.
- Baseline updates require `--write-baseline --accept --reason` with a nonempty durable reason and zero unclassified paths.
- Local aggregate CI, Linux release CI, and shared-configuration seam plans add the ratchet without skipping or weakening existing gates.

## Verification Evidence

- `npm run test:printer-migration`: six focused tests and the live accepted baseline passed with zero violations.
- `npm run test:printer-contract`: 12 passed; `npm run test:golden`: 44 passed; `npm run test:print-hygiene`: 7 passed across 185 fragments.
- `npm run test:history-replay`: all 100 fixtures plus importer coverage passed; `npm run test:feature-probes`: 124 native and 37 UI passed.
- `npm run test:runtime-probes`: 19 passed; workspace runtime contracts: 74 passed; app runtime contracts: 52 native and 140 UI passed.
- Display contracts: 132 native and 21 UI passed; app-state contracts: 52 passed; the full UI suite passed 441 tests.
- OOE, compartment, Surface Protocol, app identity, CI alignment, seam-selector, and file-size gates passed.
- TypeScript, production build, lint, memory protocol, and `git diff --check` passed.
- `npm run test:canaries:browser`: 19 Chromium canaries passed in 1.2 minutes.

## Durable Memory Updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-07/2026-07-11.md`
- `.memory/research/roadmaps/printer-detail-clipboard-roadmap.md`
- `.memory/sessions/2026-07/2026-07-11/2026-07-11__printer-detail-clipboard-program/`
