# EQUATION-CONSUMER-TRUST-READBACK1 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Summary

`EQUATION-CONSUMER-TRUST-READBACK1` makes Equation trust labels structured internal evidence and teaches Display/Formula Viewer to prefer that evidence before parsing legacy confidence prose.

## Changes

- Added internal trust evidence for exact roots, certified polynomial roots, local Numeric Interval roots, bounded-search approximate roots, and region-local Complex roots.
- Kept trust evidence symbol-backed and absent from JSON serialization.
- Added Display and Formula Viewer coverage proving trust labels come from evidence when available.
- Extracted trust evidence building into a small Equation module so `analysis-evidence.ts` stays under the file-size ratchet cap.

## Gate Labels

- backend: internal Equation evidence export and trust readback tests.
- ui: Display/Formula Viewer trust-label consumption tests.
