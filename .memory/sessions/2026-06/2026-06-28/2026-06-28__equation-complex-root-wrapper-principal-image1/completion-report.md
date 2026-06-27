# EQUATION-COMPLEX-ROOT-WRAPPER-PRINCIPAL-IMAGE1 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Status

Implemented and verified locally as a backend Equation wrapper milestone. Commit follows the user-approved commit-after-each-verified-milestone cadence.

## Summary

- Added a Complex root-wrapper route before the existing Complex power/preimage wrapper routes.
- Enabled `sqrt(F)=R`, `root(F,n)=R`, and affine shells `A*root(F,n)+C=R` for `n=2..12` when the target appears only inside `F`.
- Isolated the root value, emitted symbolic coefficient facts such as `A\ne0`, guarded unknown values with principal-image facts, and rejected exact outside-image values with a controlled error.
- Delegated the powered carrier equation `F=V^n` only to compact Complex-capable linear, rational, factorable-polynomial, and algebraic-isolation routes.
- Preserved denominator exclusions, `answerDomain: complex`, and the no generated Complex Cardano/Ferrari/RootOf policy.

## Boundaries

- No Display, Formula Viewer, Copy Result, History, OOE, app-state, Tauri, persisted schema, or public runtime contract changes.
- Generated cubic/quartic root-wrapper carriers remain blocked unless a later compact non-Cardano/Ferrari route/readback can handle them.
- Complex abs, nested, mixed algebraic, two-root-carrier, and over-cap wrappers remain deferred.

## Files Updated

- `src/lib/modes/equation/complex-root-wrapper-route.ts`
- `src/lib/modes/equation/complex-wrapper-routes.ts`
- `src/lib/modes/equation/complex-root-wrapper-principal-image.test.ts`
- `src/lib/modes/equation/complex-power-wrapper-catchup.test.ts`
- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-06/2026-06-28.md`
- `.memory/research/roadmaps/equation-complex-wrapper-catchup-roadmap.md`
- `.memory/sessions/2026-06/2026-06-28/2026-06-28__equation-complex-root-wrapper-principal-image1/`
