# COMPLEX-EXACT-STABILITY1 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5
- attribution_basis: live

## Task Goal

Add focused stability coverage for the existing Complex On + Exact surface after the Complex district split.

## Recovery Note

This memory dossier was added after the implementation commit because the normal memory closeout step was missed when `c672758` was created. The recovery was recorded by amending the metadata-only memory commit, not by rewriting the original implementation commit.

## What Changed

- Added `src/lib/modes/equation-complex-stability.test.ts`.
- Added `src/AppMain.complex.ui.test.tsx`.
- Strengthened `src/app/logic/runtimeControllers.test.ts`.
- Strengthened `src/lib/equation/equation-direct-symbolic-worker.test.ts`.
- Covered direct `runEquationMode` vs OOE pilot parity, rectangular/polar/cis form propagation, ordinary `j`/`k` selected-target behavior, Complex Off guidance, replay/history restoration, and direct-symbolic worker parity.

## Boundaries

- No new Complex solver families.
- No Approximate or Isolate complex solving.
- No `i` override syntax.
- No OOE, runtime-host, replay schema, worker-host, or display-policy changes beyond defects exposed by the focused stability coverage.
- Complex product surface remains Complex On + Exact only.

## Verification

- `npx tsc -b --pretty false` passed.
- Focused Complex stability tests passed.
- `npm run test:unit -- src/lib/equation/equation-complex.test.ts src/lib/modes/equation.test.ts src/app/logic/runtimeControllers.test.ts` passed.
- `npm run test:ui -- src/AppMain.ui.test.tsx` passed.
- `npm run lint` passed.
- `npm run build` passed.
- `npm run test:file-sizes` passed.
- `npm run test:memory-protocol` passed.
- `git diff --check` passed.

## Commits

- `c672758` COMPLEX-EXACT-STABILITY1.

## Follow-Ups

- Treat broader Complex families as future milestones, not follow-ons hidden inside stability work.
