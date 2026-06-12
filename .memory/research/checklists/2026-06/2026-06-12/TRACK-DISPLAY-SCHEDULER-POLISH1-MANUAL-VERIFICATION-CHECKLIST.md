# TRACK-DISPLAY-SCHEDULER-POLISH1 Manual Verification Checklist

Milestone: `DISPLAY-SCHEDULER-POLISH1`
Date: 2026-06-12
Agent: codex
Model: gpt-5.5

## Scope

- [x] Keep scheduler behavior display-only.
- [x] Reveal answer/error first.
- [x] Reveal `Valid when` before later approx/warning/periodic/detail blocks.
- [x] Mount queued blocks over separate display turns instead of all at once.
- [x] Lazy-mount collapsed math-heavy bodies until opened.
- [x] Keep `Rendering result` status while display blocks remain queued.

## Verification

- [x] Scheduler unit tests cover priority order, delay, and lazy-mount policy.
- [x] AppMain UI tests passed after updating expectations for progressively revealed cards.
- [x] MathStatic UI tests passed.
- [x] Lint passed.
- [x] Build passed.

## Boundaries

- [x] No OOE launch/cancel/stale/commit behavior changed.
- [x] No solver output changed.
- [x] No history/replay/copy semantics changed.
- [x] No result-schema migration added.
