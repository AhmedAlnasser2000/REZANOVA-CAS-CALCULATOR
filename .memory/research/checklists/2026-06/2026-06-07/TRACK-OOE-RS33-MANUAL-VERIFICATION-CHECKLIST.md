# TRACK-OOE-RS33 Manual Verification Checklist

Milestone: `OOE-RS33: Statistics Runtime Shell And Launch Tickets`

Date: 2026-06-07

Agent: codex

Model: gpt-5.5

## Scope

- Move Statistics onto the shared OOE runtime-shell and launch-ticket model.
- Add `statistics.evaluate`, `statistics-worker-runtime`, and `statistics-runtime`.
- Add typed `statisticsSeed` replay data for new completed Statistics history entries.
- Preserve legacy `statisticsScreen` replay.
- Do not widen Calculate, Trigonometry, Matrix/Vector, Geometry, or taxonomy cleanup.

## Manual Checks

- [ ] Statistics run shows `Computing` while active.
- [ ] Statistics pending History row appears immediately with Running/Stopping and Stop.
- [ ] Statistics Stop removes the pending row and does not persist a fake completed record.
- [ ] Statistics completion finalizes the pending row in launch-order position.
- [ ] Background Statistics completion does not yank the user back to Statistics.
- [ ] New Statistics replay uses `statisticsSeed`.
- [ ] Legacy Statistics replay with only `statisticsScreen` still works.
- [ ] OOE diagnostics show Statistics runtime-shell host, fallback/cancel/failure, and launch-ticket evidence.

## Automated Verification Notes

- `cargo check --manifest-path src-tauri/Cargo.toml`: passed during RS33 work.
- Focused Equation PRL4 core route: passed during RS33 work.
- Focused AppMain PRL4 UI regression remains open and is postponed to `OOE-RS34`:
  - failing UI case: `\ln\left(x+1\right)=\ln\left(2x-3\right)`
  - symptom: expected visible `display-outcome-success` card does not appear
  - sibling preserved-domain UI case passes
  - core Equation test passes

## RS34 Handoff

Do not treat the PRL4 UI failure as an RS33 Statistics blocker. It is a cross-runtime AppMain/Equation UI commit-path regression and should be fixed with `OOE-RS34`.
