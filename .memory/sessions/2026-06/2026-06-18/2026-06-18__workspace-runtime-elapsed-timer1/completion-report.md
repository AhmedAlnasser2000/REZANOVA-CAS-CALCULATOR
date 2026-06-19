# WORKSPACE-RUNTIME-ELAPSED-TIMER1 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5
- attribution_basis: live

## Summary

- Added runtime elapsed timing for hosted runtime jobs.
- Running Display header labels show whole-second elapsed timing through `Computing` / `Stopping`.
- Finished runtime jobs show a two-decimal final `Ready` elapsed label until the same workspace starts another runtime job.
- Pending runtime tickets now carry `startedAtMs`.
- Finalized committed History entries may persist optional `runtimeElapsedMs`.
- History pending rows show live integer elapsed timing and finalized rows show compact persisted duration metadata.
- Final elapsed state is captured/restored per workspace instance and inactive-tab completions write timing to the launch/origin workspace.
- Follow-up manual QA exposed that transition-scheduled launches could leave the previous `Ready` elapsed label visible and hide live `Computing`; pending ticket publication now flushes immediately at launch so the old final timer clears and live status appears.

## Scope Notes

- Runtime jobs only.
- No solver behavior changes.
- No OOE stale-gate, cancellation, host-routing, diagnostics, or commit-authority changes.
- No default-new-tab settings, projects/files, saved documents, page tabs, Graphing, Spreadsheet, broad bus, Surface Protocol, runtime registry, or plugin layer.

## Files Updated

- Runtime timing helper and tests.
- History/runtime state, History entry schema, and launch-ticket metadata.
- Display header status composition in `AppMain`.
- HistoryPanel duration metadata UI and styles.
- Durable memory and session dossier.
