# TRACK-EQUATION-PARAM14 Manual Verification Checklist

milestone: `EQUATION-PARAM14`
date: 2026-05-24
primary_agent: codex
primary_agent_model: gpt-5.5

## Scope

- Add bounded algebraic additive mixed-carrier selected-target solving.
- Support up to two independent abs/sqrt/square-power carriers under strict branch caps.
- Preserve conditional branch/domain facts, including target-containing facts when they are the honest bounded condition.

## Manual Checks

- Enter `sqrt(z+a)+z=b`, choose `z`, and confirm a symbolic result with `b-z>=0` style branch conditions.
- Enter `|z-a|+z=b`, choose `z`, and confirm it solves through absolute-value branches.
- Enter `sqrt(z+a)+sqrt(z+b)=c`, choose `z`, and confirm it solves with mixed algebraic detail sections.
- Enter `|z-a|+sqrt(z+b)=c`, choose `z`, and confirm branch conditions are visible.
- Enter `|z-a|+|z-b|=c`, choose `z`, and confirm branch generation stays bounded.
- Enter `sin(z)+sqrt(z)=a`, choose `z`, and confirm it remains a controlled mixed-carrier boundary.

## Verification

- [x] `npm run test:unit -- src/lib/equation/equation-parameterized-mixed-algebraic.test.ts src/lib/equation/composition-core.test.ts src/lib/equation/equation-parameterized-composition.test.ts src/lib/equation/equation-parameterized-readback.test.ts src/lib/equation/equation-target.test.ts src/lib/modes/equation.test.ts`
- [x] `npm run test:ui -- src/AppMain.ui.test.tsx`
- [x] `npm run test:golden`
- [x] `npm run test:memory-protocol`
- [x] `npm run lint`
- [x] `npm run build`

## Boundaries

- No direct trig mixed identities; future `EQUATION-PARAM15` owns that slice.
- No additive exp/log, Lambert W-style, or broad transcendental algebra.
- No variable memory, named string variables, graphing, `POLY-ELIM2`, source-mirror execution, Labs runner work, result-origin changes, badge changes, or history schema changes.
