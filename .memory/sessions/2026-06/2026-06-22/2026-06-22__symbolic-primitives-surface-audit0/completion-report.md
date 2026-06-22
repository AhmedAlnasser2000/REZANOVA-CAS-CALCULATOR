# SYMBOLIC-PRIMITIVES-SURFACE-AUDIT0 Completion Report

Date: 2026-06-22

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live repo inspection

## Summary

Completed a docs/memory-only audit of reusable symbolic primitive pressure across Calcwiz.

The audit names the five reusable algebraic building blocks as Symbolic Primitives:

- expansion
- substitution
- factorization
- simplification
- elimination

Recommended future implementation home:

```text
src/lib/symbolic-engine/primitives/
  expansion/
  substitution/
  factorization/
  simplification/
  elimination/
```

## Findings

- Calcwiz already has useful primitive seeds in `src/lib/symbolic-engine/` and `src/lib/algebra/`.
- Recent Equation frontier files expose repeated primitive pressure, especially `symbolic-factor-patterns.ts`, `special-form-roots.ts`, `carrier-elimination.ts`, `symbolic-polynomial.ts`, and `product-decomposition.ts`.
- The right path is promotion of proven seams, not a rewrite into a broad CAS engine.
- Future solver work should consume primitives when available or document why route-local logic remains semantic and owned.

## Recommended Next Milestone

`SYMBOLIC-PRIMITIVES-COMPARTMENT-ROADMAP0`

Purpose: lock manifest posture, folders, public/private seams, adoption rules, and first implementation order before moving code.

Expected first implementation after that: `SYMBOLIC-EXPANSION-PRIMITIVE1`.

## Durable Memory Updated

- `.memory/research/audits/symbolic-primitives-surface-audit0-2026-06-22.md`
- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-06/2026-06-22.md`
- `.memory/sessions/2026-06/2026-06-22/2026-06-22__symbolic-primitives-surface-audit0/`

## Behavior Impact

None. This milestone does not touch `src/`, runtime behavior, solver behavior, schemas, OOE, Display, History, app-state, Tauri, or UI.
