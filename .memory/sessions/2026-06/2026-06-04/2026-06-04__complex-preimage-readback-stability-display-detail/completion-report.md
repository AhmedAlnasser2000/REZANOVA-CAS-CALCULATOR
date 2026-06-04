# COMPLEX-PREIMAGE-READBACK1 + COMPLEX-PREIMAGE-STABILITY1 + DISPLAY-DETAIL-MATH-RENDER1 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Summary

Implemented the paired complex preimage readback/stability pass together with the app-wide result-detail math rendering foundation.

The key display fix is that result detail cards now have a backward-compatible render contract: legacy `lines: string[]` remains intact, while detail producers may mark whole lines as math or provide mixed prose/math line parts. The display layer also performs conservative mixed-line inference for known Equation route prose so cards like `Solve Note` can honor math notation without forcing entire sentences through the math renderer.

## Completed

- Added typed result-detail line metadata for whole-line math and mixed text/math fragments.
- Added shared detail-line helpers for math sections, mixed sections, cloning, metadata lookup, and conservative route-prose fragment inference.
- Updated `MathStatic` so inline math fragments can render as spans while preserving rendered/plain-text/LaTeX notation modes.
- Updated the result display panel so marked math lines render through `MathStatic`, mixed fragments render inline, and ordinary prose stays through `NotationText`.
- Marked math-heavy result detail sections such as `Expanded Branches`, `Generated Branches`, `Composition Branches`, `Carrier Branches`, and `Factorization`.
- Preserved assumption/detail filtering metadata so concise/detailed facts do not erase render intent.
- Added regression coverage for math-rendered details and mixed Equation route prose parsing.

## Boundaries Preserved

- No new complex solver family.
- No complex `Approximate` search.
- No complex `Isolate` solving.
- No absolute-value complex locus solving.
- No stored complex values.
- No non-Equation complex adoption.
- No OOE runtime behavior change.
- No Rust solver execution.

## Notes

This milestone intentionally avoids broad heuristic math parsing for arbitrary prose. It honors math notation by using explicit route metadata first and conservative known-route splitting second, so display cards improve without making normal explanatory sentences brittle.
