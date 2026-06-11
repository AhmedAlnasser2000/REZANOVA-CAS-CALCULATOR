# CALCULUS-CANONICAL-ID1 Verification Summary

## Summary

`CALCULUS-CANONICAL-ID1` closes remaining live identity drift after the unified Calculus workspace and `OOE-RS32`. New Calculus actions now use canonical `calculus` / `calculus.evaluate` identity while preserving `advancedCalculus` as legacy read/replay compatibility and internal implementation vocabulary.

## Changes Recorded

- Live Calculus evaluation uses `capabilityId: calculus.evaluate`.
- Live Calculus OOE route labels use `calculus.<screen>`.
- New Calculus result commits use `mode: calculus`.
- Guide examples and active mode references target `calculus` where safe.
- Workspace-pilot current capability metadata no longer includes `advancedCalculus.evaluate`.
- Legacy `advancedCalculus` schema/history compatibility remains tested and accepted.

## Verification

- Focused test commands should cover history schema, workspace-pilot metadata, OOE bridge metadata, advanced-calculus behavior, AppMain UI, lint, and build.
- Manual checks should confirm OOE diagnostics and History no longer emit new `advancedCalculus` records for live Calculus runs.

## Boundaries

- No engine folder rename.
- No stale-code deletion.
- No compatibility retirement.
- No solver capability changes.
