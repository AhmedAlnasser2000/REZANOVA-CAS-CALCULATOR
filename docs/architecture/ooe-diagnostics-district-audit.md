# OOE Diagnostics District Audit

Status: audit

Purpose: map the OOE diagnostics surface before moving it into a district. Diagnostics owns recent runtime records, output summaries, provenance snapshots, inspector rows, evidence lines, and panel-facing serialization. It does not own runtime launch, stale gates, cancellation policy, solver output construction, Display rendering, or duplicate-launch behavior.

## Current Public Surface

- `diagnostics-buffer.ts` records terminal runtime diagnostics, clones records for safe reads, summarizes Display outcomes, trims the bounded diagnostics buffer, and exposes clear/list/latest helpers.
- `diagnostics-inspector.ts` merges diagnostics, active jobs, and recent jobs into panel rows, filters by status/query, formats duration labels, extracts evidence lines, and serializes raw records for copy/debug views.
- `OoeDiagnosticsPanel` consumes both files directly and owns the visual presentation, filter controls, clear action, and copy behavior.

## Responsibility Map

- Record lifecycle: diagnostics ids, sequence ordering, retention limit, duration calculation, terminal status, error messages, and cloned record snapshots.
- Output summary policy: compacted labels, warnings counts, exact/approx shape flags, detail-section titles, planner/solve/transform badges, and unsafe readback marker detection.
- Provenance policy: mode/route/screen/action summary, runtime host, runtime shell evidence, equation/table/editor notes, and commit decision visibility.
- Inspector policy: diagnostics/active/recent row merge, status filter, text query filter, newest-first ordering, evidence line assembly, and raw JSON serialization.

## Current Consumers

- Runtime coordinator records completed, stale-dropped, skipped, cancelled, and failed runtime jobs.
- Pilots use `summarizeDisplayOutcome` for compact diagnostics output summaries.
- Worker runtime tests assert failed diagnostics are recorded for visible host failures.
- Diagnostics panel and panel UI tests read buffer and inspector snapshots directly.

## Future Split Candidate

- `OOE-DIAGNOSTICS-DISTRICT-SPLIT1`: move diagnostics buffer, inspector, and direct tests under `src/lib/ooe/diagnostics/`; update panel, pilots, runtime-control, and worker tests to import the district directly.

## High-Risk Contracts

- Preserve diagnostics terminal status strings, evidence-line wording, output summary field names, provenance field names, raw serialization, and row ordering.
- Preserve cloning behavior so callers cannot mutate stored records.
- Preserve runtime-shell evidence line formatting and helper-host/cancellation/final-trace/error line behavior.
- Preserve diagnostics retention defaults and clear-limit override behavior.
- Preserve Display ownership of user-facing rendering and runtime-control ownership of job execution/cancellation.

## Test Gates

- `npx tsc -b --pretty false`
- `npm run test:unit -- src/lib/ooe/diagnostics/*.test.ts src/lib/ooe/runtime-control/*.test.ts src/lib/ooe/pilots/*.test.ts`
- `npm run test:ui -- src/components/OoeDiagnosticsPanel.ui.test.tsx`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

## Stop Rules

- Do not move diagnostics code or tests during this audit.
- Do not add filtering behavior, retention policy changes, diagnostics wording changes, panel UI changes, runtime-control behavior, duplicate-launch policy, schema changes, Rust/Tauri edits, or Display readback changes.
- Do not add root compatibility stubs for the later diagnostics move unless a concrete bundler or TypeScript blocker appears.
