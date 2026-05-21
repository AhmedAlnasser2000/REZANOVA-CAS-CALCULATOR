# POLY-RAD2 Verification Summary

## Attribution
- primary_agent: codex
- primary_agent_model: gpt-5.4
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.4
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.4
- attribution_basis: historical-user-confirmed

- Date: `2026-04-09`
- Milestone: `POLY-RAD2 — Bounded Polynomial-in-Carrier Radical Follow-On for Equation`
- Result: pass

## Focused Checks
- `npm run lint -- src/lib/equation/polynomial-carrier-follow-on.ts src/lib/equation/polynomial-carrier-follow-on.test.ts src/lib/equation/guarded/run.ts src/lib/equation/guarded/algebra-stage.ts src/lib/equation/composition-stage.ts src/lib/equation/shared-solve.test.ts src/lib/equation/guarded-solve.test.ts src/lib/modes/equation.test.ts src/AppMain.ui.test.tsx`
- `npm run test:unit -- src/lib/modes/equation.test.ts src/lib/equation/guarded-solve.test.ts src/lib/equation/shared-solve.test.ts src/lib/equation/polynomial-carrier-follow-on.test.ts`
- `npm run build`
- `npx playwright test e2e/qa1-smoke.spec.ts -g "RAD2 smoke solves bounded sequential radical families"`

## Full Gate
- `npm run test:gate`

## Notes
- One regression surfaced during implementation: the new carrier bridge was initially being attempted for unrelated transformed symbolic cases, which caused a timeout on a decimal-only same-base log equality test.
- The fix was to keep carrier follow-on entry bounded to actual radical/composition contexts in `src/lib/equation/guarded/run.ts`.
- A few unit/UI/E2E assertions were updated to accept algebraically equivalent exact formatting instead of pinning one canonical latex shape where visible behavior did not actually regress.
