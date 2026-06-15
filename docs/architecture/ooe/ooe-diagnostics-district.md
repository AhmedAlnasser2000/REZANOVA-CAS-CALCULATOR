# OOE Diagnostics District

Status: final split record

Purpose: group OOE diagnostics records, output summaries, inspector row assembly, event timeline view models, evidence lines, and panel-facing serialization outside the OOE root while preserving diagnostics behavior.

## District Shape

- `src/lib/ooe/diagnostics/diagnostics-buffer.ts` owns diagnostics record lifecycle, retention, cloning, output summaries, provenance shape, and clear/list/latest helpers.
- `src/lib/ooe/diagnostics/diagnostics-inspector.ts` owns diagnostics/active/recent row merge, status/query filtering, newest-first ordering, compact event timeline rows, evidence line assembly, duration labels, and raw serialization.

## Preserved Contracts

- Terminal status strings, output summary fields, provenance fields, unsafe marker detection, and diagnostics ids remain unchanged.
- Runtime shell evidence lines, cancellation/helper-host/final-trace/error lines, duration labels, and raw JSON serialization remain unchanged.
- Diagnostics records continue to be cloned before returning to callers.
- Retention defaults and clear-limit override behavior remain unchanged.
- Event timeline rows are developer-only compact lifecycle facts from `events/event-outbox.ts`; they are not normal-user UI and do not replace diagnostics records.
- Panel Clear clears diagnostics, recent jobs, and event outbox events while preserving active jobs.

## Consumers

Runtime control records diagnostics, pilots summarize Display outcomes, worker runtime tests assert failure diagnostics, and `OoeDiagnosticsPanel` consumes the panel-facing seam rather than reading every diagnostics store directly.

`APP-RUNTIME-OOE-SUMMARY-SEAM1` keeps output summary behavior owned by this district while moving app-runtime access through the OOE pilot/provenance summary seam. App runtime no longer imports diagnostics-buffer directly; OOE pilots and diagnostics internals may still use the diagnostics summarizer.

## Panel Surface Record

`OOE-DIAGNOSTICS-PANEL-SEAM1` adds `src/lib/ooe/diagnostics/panel-surface.ts` as the single developer-panel seam for OOE diagnostics reads and actions. The seam builds the panel-facing Records, Events, Jobs, and Compartments snapshot from diagnostics records, active/recent jobs, OOE events, and UI-boundary records. It also owns selected diagnostics/job serialization, compartment filter options, and Clear behavior.

The seam preserves the existing panel behavior: Clear still removes diagnostics records, recent jobs, OOE events, and UI-boundary records while preserving active jobs. Event rows remain compact lifecycle facts, and raw copy behavior remains limited to selected diagnostics/job rows.

## Event Timeline Record

`OOE-DIAGNOSTICS-EVENTS1` extended the inspector snapshot with recent OOE event rows and event counts. `OoeDiagnosticsPanel` now shows a compact developer-only event timeline beside the existing diagnostics/job records. Event rows are not the selected raw-record copy target; copy behavior remains on selected diagnostics/job records.

## Stop Rules

- Do not add root compatibility stubs for moved OOE internals.
- Do not change filtering behavior, retention policy, diagnostics wording, runtime-control behavior, duplicate-launch policy, schemas, Rust/Tauri OOE, or Display readback behavior in this district.
