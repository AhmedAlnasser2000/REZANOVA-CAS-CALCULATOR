# TRACK-EQUATION-PARAM12 Manual Verification Checklist

milestone: `EQUATION-PARAM12`
date: 2026-05-24
primary_agent: codex
primary_agent_model: gpt-5.5

## Scope

- Add bounded two-layer nested selected-target composition over the shared `composition-core`.
- Preserve PARAM11 one-layer behavior and old guarded COMP behavior.
- Allow capped two-periodic selected-target chains with distinct integer-family parameters.
- Keep additive mixed-carrier equations deferred.

## Manual Checks

- Enter `sqrt(|z-a|)=b`, choose `z`, and confirm a two-branch result with `b>=0` facts.
- Enter `ln(|z-a|)=b`, choose `z`, and confirm exponential branch readback.
- Enter `sin(sqrt(z+a))=b`, choose `z`, and confirm periodic plus radical facts.
- Enter `sqrt(sin(z+a))=b`, choose `z`, and confirm square-root and trig range facts.
- Enter `sin(tan(z))=a`, choose `z`, and confirm distinct `n,m in Z` facts.
- Enter `sin(sqrt(|z-a|))=b`, choose `z`, and confirm it stops as over-depth composition.
- Enter `sin(z)+sqrt(z)=a`, choose `z`, and confirm additive mixed-carrier solving remains deferred.

## Verification

- [x] `npm run test:unit -- src/lib/equation/composition-core.test.ts src/lib/equation/equation-parameterized-composition.test.ts src/lib/equation/equation-parameterized-exp-log.test.ts src/lib/equation/equation-parameterized-trig.test.ts src/lib/equation/equation-parameterized-carrier.test.ts src/lib/equation/equation-parameterized-rational.test.ts src/lib/equation/equation-target.test.ts src/lib/modes/equation.test.ts src/lib/equation/guarded-solve.test.ts`
- [x] `npm run test:ui -- src/AppMain.ui.test.tsx`
- [x] `npm run test:golden`
- [x] `npm run test:memory-protocol`
- [x] `npm run lint`
- [x] `npm run build`

## Boundaries

- No depth-three composition chains.
- No additive mixed-carrier solving.
- No variable memory, named string variables, graphing, `POLY-ELIM2`, source-mirror execution, Labs runner work, result-origin changes, badge changes, or history schema changes.
