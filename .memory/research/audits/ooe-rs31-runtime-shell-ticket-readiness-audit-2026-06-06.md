# OOE-RS31 Runtime Shell And Launch-Ticket Readiness Audit

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- attribution_basis: live

## Summary

`OOE-RS31` adopts one central runtime-shell evidence contract and multiple per-workspace shells. Runtime shells describe execution lifecycle, host choice, fallback, cancellation, failure, stale handling, and diagnostics evidence. Launch tickets remain a separate History-ordering mechanism: they reserve visible pending rows, preserve launch order, and finalize or discard without persisting fake records.

The safe implementation lanes for RS31 are Equation and Table:

- Equation already has the RS30 full worker runtime shell and launch-ticket behavior.
- Table already has the RS25 isolated worker runtime, RS24/RS25 cancellation semantics, and visible Table results.

All other workspaces are classified for later adoption rather than migrated blindly.

## Implement Now

### Equation

Readiness: ready and already adopted through RS30.

RS31 action:

- keep existing Equation worker-shell behavior stable;
- move local ticket helpers into the shared launch-ticket manager;
- expose normalized runtime-shell and launch-ticket evidence in OOE diagnostics/provenance;
- keep cancellation, background completion, stale-drop, and no-commit cancelled-envelope behavior unchanged.

### Table

Readiness: ready for ticket adoption only.

RS31 action:

- keep the existing `table-worker-runtime` host and Table OOE wrapper;
- reserve a pending History ticket when an active Table build launches;
- finalize the ticket into completed History on successful commit;
- discard the ticket on stale or cancelled Table builds;
- show transient stopped status on cancellation without appending a fake cancellation History record;
- expose normalized runtime-shell and launch-ticket evidence in diagnostics/provenance.

## Defer

### Calculate Standard

Current state:

- standard expression actions are OOE-covered and have active main-thread jobs/stale gates.

Deferral reason:

- expression actions are usually short, can flicker if every click reserves a pending ticket, and need a worker-safety/flicker policy before ticket adoption.

Recommended later work:

- audit expression worker serialization and define a threshold/policy for when Calculate jobs become ticket-visible.

### Calculate Workbench / Algebra Transform

Current state:

- coarse provenance exists, but these are not yet full runtime-shell lanes.

Deferral reason:

- transform work should not inherit Equation/Table ticket behavior until transform ownership and replay semantics are clearer.

### Editor Analysis

Current state:

- OOE budget lanes exist for hints, target discovery, transform eligibility, and preview handoff.

Decision:

- explicitly no History tickets. Editor analysis is background analysis, not user-launched result work.

### Advanced Calc

Current state:

- user-visible and likely ticket-eligible later.

Deferral reason:

- needs serialization and cancellation audit before a worker shell. Several helpers may share calculus/algebra state and should not be migrated casually.

### Trigonometry

Current state:

- user-visible and potentially ticket-eligible.

Deferral reason:

- it can delegate into shared Equation solving, so shell ownership must avoid double tickets or duplicate OOE evidence.

### Statistics

Current state:

- likely worker-safe and ticket-eligible later because many workflows are pure data/math transforms.

Deferral reason:

- adopt only after Equation/Table prove the shared contract under two different workspaces.

### Geometry

Current state:

- user-visible but may depend on Compute Engine/module state and geometry-specific rendering assumptions.

Deferral reason:

- needs worker-safety and serialization audit before a runtime shell.

### Matrix And Vector

Current state:

- likely pure and comparatively easy later.

Deferral reason:

- defer to avoid RS31 scope creep and keep this milestone focused on contract extraction plus Table adoption.

## Contract Boundary

Runtime shell contract:

- lifecycle and host evidence;
- selected host, fallback host, cancellation/termination evidence;
- normalized diagnostics/provenance lines;
- capability-aware shell id.

Launch-ticket manager:

- pending ticket construction;
- launch-order sorting;
- running/stopping state;
- ticket finalization and discard;
- no persisted fake pending rows.

These two concepts are related but not interchangeable.

## Follow-Up

Likely next OOE work after RS31:

- inspect whether Calculate standard deserves ticket visibility or should remain fast-path active-job-only;
- consider one carefully bounded third workspace for runtime-shell adoption after Table;
- avoid local MCP/debug endpoint work until the in-app RS29 inspector and normalized shell/ticket evidence have enough use.
