# HISTORY-DISPLAY-CONTRACT-ROADMAP0 Completion Report

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

## Goal

Ground and record the accepted structured-History and Display-contract-inversion program before changing persistence or runtime behavior.

## Completed

- Confirmed `main` and `origin/main` at `bb6fc4ba`, with only unrelated untracked `test-results/`.
- Recorded the browser and Rust History field-loss baseline and corrected the earlier same-session replay evidence boundary.
- Locked one bounded canonical result document shared by History and live Display, with exact Table-row preservation and no legacy LaTeX reparsing.
- Locked current-preference rendering, original-card restoration, success-only History, no persisted actions, and session retention plus warning on save failure.
- Recorded the Equation internal-result prerequisite and the risk-sliced producer and consumer migrations.
- Recorded the protected Notebook lane and deferred durable Notebook persistence until History parity commits.
- Recorded standing approval for named milestones only; inserted prerequisites require fresh approval and no push is authorized.

## Runtime Changes

- None.

## Durable Memory Updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/approvals.md`
- `.memory/journal/2026-07/2026-07-11.md`
- `.memory/research/INDEX.md`
- `.memory/research/roadmaps/history-display-contract-roadmap.md`
- `.memory/research/checklists/2026-07/2026-07-11/TRACK-PRINTER-DETAIL-CLIPBOARD-CLOSEOUT-MANUAL-VERIFICATION-CHECKLIST.md`
- `.memory/sessions/2026-07/2026-07-11/2026-07-11__history-display-contract-program/`

## Next Step

Commit this roadmap checkpoint, then implement `HISTORY-PERSISTENCE-PARITY-CLOSURE1` without touching Notebook files.

## HISTORY-PERSISTENCE-PARITY-CLOSURE1

### Completed

- Added exact schema coverage for all 35 current `HistoryEntry` fields, including `systemReadback`, `equationScreen`, and `equationSeed`, with a compile-time/runtime key-parity ratchet.
- Preserved original validated browser History objects and Calculator Memory History arrays so unknown versioned extensions survive reload.
- Replaced the obsolete typed Rust History projection with a minimally validated raw JSON envelope, an 80-row retention policy, and a 2,000,000-byte new-append limit.
- Added explicit append results and a session-only durability warning while retaining failed-save rows in memory.
- Added extension-rich browser reload, Calculator Memory, Rust file restart, deletion, malformed/oversized, retention, and real Chromium failure-path coverage.
- Launched the real Tauri desktop twice against isolated app data and confirmed native load plus frontend autosave preserved structured fields and unknown extensions.
- Kept Notebook, mathematical output, OOE authority, Surface Protocol DTOs, and capability topology unchanged.

### Durable Memory Updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-07/2026-07-11.md`
- `.memory/research/roadmaps/history-display-contract-roadmap.md`
- `.memory/sessions/2026-07/2026-07-11/2026-07-11__history-display-contract-program/`

### Next Step

Commit `HISTORY-PERSISTENCE-PARITY-CLOSURE1`, then implement `CANONICAL-RESULT-DOCUMENT1`. Durable Notebook persistence is no longer blocked by this prerequisite after the parity commit lands, but Notebook files remain outside this program's lane.

### Concurrent Work Boundary

- During final staging, the Notebook agent added unstaged TipTap dependencies in `package.json` and `package-lock.json`.
- Those files do not overlap app-state, History, Display, `AppMain`, or Tauri persistence; they were inspected, left unstaged, and excluded from this milestone.
