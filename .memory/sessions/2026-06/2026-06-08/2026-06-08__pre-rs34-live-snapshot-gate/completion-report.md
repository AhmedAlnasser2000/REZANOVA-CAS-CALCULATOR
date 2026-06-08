# PRE-RS34 Live Snapshot Gate Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

Milestone: `PRE-RS34-LIVE-SNAPSHOT-GATE`

Agent: codex

Model: gpt-5.5

Date: 2026-06-08

## Completed

- Fixed stale Equation launch snapshots by reading the active MathLive value at OOE-covered launch time.
- Recomputed `equationInputLatex` from the same live `equationLatex` snapshot used to build the runtime request.
- Threaded the live snapshot through Equation symbolic solve, numeric Equation solve, and Equation algebra transform launch paths.
- Made Equation active-revision resolution use the same live request source as the launched job.
- Canonicalized Equation OOE route snapshots so route snapshot and input-revision hashing use the same shape.
- Applied the same live/canonical snapshot discipline to Statistics runtime launch and active revision checks.
- Preserved OOE stale gates, worker behavior, launch tickets, cancellation, History replay, and solver math.

## Root Cause

The visible MathLive editor could already contain the user's new LaTeX, while React state or runtime refs still held the previous value during same-tick Solve/Enter. Once worker shells and launch tickets widened, that stale handoff could launch an empty/old request or make OOE classify a fresh result as stale.

The solver was not the blocker. The bug lived at the UI-to-OOE launch boundary.

## Future Rule

Any OOE/ticketed MathLive workspace must derive these from one live/canonical source:

- runtime request
- pending History ticket preview
- active input revision
- route snapshot

Do not weaken stale gates to fix this class of bug.
