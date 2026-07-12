# HISTORY-STRUCTURED-RESULT2 Gate

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

- Kind: `backend` structured persistence and `ui` History replay/read-model gate.
- Status: verified; entering approved commit.
- Intentional output change: none.
- Push: not authorized.

## Contract

- New successful rows dual-write one bounded `CanonicalResultDocumentV1` plus legacy compatibility fields.
- Structured-first reads never parse old LaTeX. Missing, malformed, future, or error documents fall back to the original legacy row.
- Exact Table headers, rows, optional secondary cells, and warnings restore without recomputation.
- Replay snapshots remain separate launch-time settings and `Ans` evidence.
- Actions, runtime advisories, ticket ids, suppression flags, settings, record identity, and transient Table response objects are not stored in the document.
- Invalid and oversized documents retain untruncated legacy math with a durable omission reason.

## Evidence

- Focused result/app-state: 134 tests passed across result contracts and app-state contracts.
- Focused History/Table UI: 55 tests passed; full app runtime and full UI passed at 200 and 469 tests respectively.
- Browser: 9/9 structured History workspace replays, 4/4 persistence/preference/legacy cases, and 19/19 workspace canaries passed in Chromium.
- Native: 50/50 Rust tests and `cargo check` passed.
- Build, TypeScript, scoped ESLint, file size, golden, print hygiene, replay, clipboard, detail, Surface, OOE, compartments, app identity, runtime probes, and workspace runtime contracts passed.

## Shared-Tree Exclusions

- Repo-wide lint is red only on seven concurrent Notebook escape errors in `src/lib/notebook/document/templates.ts`.
- Printer inventory is red only on five concurrent Notebook-owned `resultLatex` locations.
- All Notebook paths and `test-results/` remain excluded from this milestone's staging and commit.

## Durable Memory Updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/open-questions.md`
- `.memory/journal/2026-07/2026-07-12.md`
- `.memory/research/roadmaps/history-display-contract-roadmap.md`
- This dossier's completion, verification, commit log, and gate record.
