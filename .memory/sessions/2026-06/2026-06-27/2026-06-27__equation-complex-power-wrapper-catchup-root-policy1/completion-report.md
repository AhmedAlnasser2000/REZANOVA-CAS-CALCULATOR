# Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

Status: implementation complete locally; verification passed; commit pending explicit approval.

Scope:

- Added `EQUATION-COMPLEX-POWER-WRAPPER-CATCHUP1` as a Complex Exact backend route before generic composition/preimage fallback.
- Supported one selected-target power carrier with optional symbolic affine shell: `F^n=R` and `A*F^n+C=R`, `n=2..12`.
- Generated compact all-branch carrier definitions using `PrincipalRoot_n(...)\omega_k` and honored `complexExactForm`.
- Delegated final carrier branch equations only to compact Complex-capable linear, rational, factorable-polynomial, and algebraic-isolation routes.
- Preserved symbolic coefficient nonzero facts, denominator exclusions, `answerDomain: complex`, and existing Complex special-form branch caps.
- Locked `EQUATION-COMPLEX-ROOT-WRAPPER-POLICY1`: Complex square-root and nth-root wrappers are principal functions, not all-root relations, and now stop instead of leaking Real-style inversion.
- Clarified root-wrapper stop wording so the visible error names missing principal-image validation and the details state that Complex On solves over the complex domain, including real roots.

Files updated:

- `src/lib/modes/equation/complex-power-wrapper-route.ts`
- `src/lib/modes/equation/complex-wrapper-routes.ts`
- `src/lib/modes/equation/parameterized.ts`
- `src/lib/modes/equation/symbolic.ts`
- `src/lib/modes/equation/complex-power-wrapper-catchup.test.ts`
- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-06/2026-06-27.md`
- `.memory/research/roadmaps/equation-complex-wrapper-catchup-roadmap.md`
- `.memory/sessions/2026-06/2026-06-27/2026-06-27__equation-complex-power-wrapper-catchup-root-policy1/`

Out of scope:

- Generated Complex Cardano/Ferrari wrapper formula payloads.
- Complex root-wrapper principal-image validation.
- Complex absolute-value, mixed-radical, nested, same-argument mixed sine/cosine, trig product, mismatched trig, and target-in-base wrappers.
- Display, Formula Viewer, Copy Result, History, OOE, app-state, Tauri, persisted schema, or public runtime contract changes.
