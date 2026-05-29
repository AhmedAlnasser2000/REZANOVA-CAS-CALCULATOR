# TRACK-OOE-RS19 Manual Verification Checklist

status: completed
date: 2026-05-29
milestone: OOE-RS19

## Scope

- [x] Added canonical Table OOE snapshot and input-revision helpers in the Table mode layer.
- [x] Table snapshots include primary/secondary formulas, secondary enabled state, range, step, stored variables, and replay substitution snapshots.
- [x] `runTableModeWithOoePilot` accepts the existing OOE job context options for lazy active-revision checks.
- [x] Active `useTableRuntime` tracks the latest Table request through a ref-backed state.
- [x] Active Table builds silently skip stale commits when completed job revisions no longer match the latest active request.
- [x] Stale Table drops preserve the previous visible table/result and do not clear replay substitution snapshots.
- [x] Active job registry records stale-dropped Table jobs through the existing RS16 lifecycle path.
- [x] Legacy `modeActionHandlers.ts` Table path remains unchanged.
- [x] Table math, response rows, warnings, stored-value substitution, replay snapshots, history schema, result wording, and UI layout remain unchanged.
- [x] OOE roadmap was extended through `OOE-RS25`, with RS20 marked as the first central runtime coordinator milestone.
- [x] Recorded that OOE is the traffic controller and Progressive Solver is a separate future execution strategy.

## Verification

- [x] `npm run test:unit -- src/lib/modes/table.test.ts src/lib/ooe/table-pilot.test.ts src/lib/ooe/job-contract.test.ts src/lib/ooe/active-job-registry.test.ts`
- [x] `npm run test:ui -- src/app/runtime/useTableRuntime.ui.test.tsx`
- [x] `npm run test:ui -- src/AppMain.ui.test.tsx`
- [x] `npm run test:ooe-boundaries`
- [x] `npm run test:memory-protocol`
- [x] `npm run lint`
- [x] `npm run build`
- [x] `cargo test --manifest-path src-tauri/Cargo.toml ooe`
- [x] `cargo check --manifest-path src-tauri/Cargo.toml`

## Notes

- RS19 closes stale-commit parity for the existing OOE-covered runtime lanes: standard Calculate, Equation symbolic/numeric interval, and active Table.
- RS19 intentionally does not start the central coordinator, scheduler, cancellation enforcement, trace UI, MCP endpoint, worker/Rust host migration, Progressive Solver, or broad OOE routing.
