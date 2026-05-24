# TRACK-EQUATION-PARAM15 Manual Verification Checklist

milestone: `EQUATION-PARAM15`
date: 2026-05-24
primary_agent: codex
primary_agent_model: gpt-5.5

## Scope

- Add direct same-argument mixed sine/cosine selected-target solving.
- Preserve active angle-unit readback, symbolic coefficient facts, range facts, and periodic-family facts.
- Fold the relation-rendering fix into the same milestone so relation commands such as `\le` and `\ge` cannot glue to following symbols.

## Manual Checks

- Enter `sin(z)+cos(z)=a`, choose `z`, and confirm a symbolic periodic family with an `atan2` phase and a real range fact.
- Enter `2sin(z+a)+3cos(z+a)=b`, choose `z`, and confirm the affine shift and coefficient phase are visible.
- Enter `A sin(k z+B)+C cos(k z+B)=D`, choose `z`, and confirm `k\ne0` plus `A^2+C^2>0` facts.
- Switch DEG/GRAD and confirm inverse-trig and `atan2` terms scale by the active angle unit.
- Enter `sin(z)+cos(2z)=a` and confirm it stops as mismatched trig arguments.
- Enter `sin(z)+sqrt(z)=a` and confirm it remains a friendly mixed-carrier boundary.
- Enter a branch condition such as `c-\sqrt{b+z}\ge0` through a supported result path and confirm it renders as `0\le c-\sqrt{b+z}`, not `0\lec...`.

## Verification

- [x] `npm run test:unit -- src/lib/equation/equation-parameterized-trig.test.ts src/lib/equation/equation-parameterized-readback.test.ts src/lib/equation/equation-target.test.ts src/lib/modes/equation.test.ts src/lib/equation/guarded-solve.test.ts src/lib/display/symbolic-display.test.ts`
- [x] `npm run test:ui -- src/AppMain.ui.test.tsx`
- [x] `npm run test:golden`
- [x] `npm run test:memory-protocol`
- [x] `npm run lint`
- [x] `npm run build`

## Boundaries

- No broad trig identity search.
- No additive exp/log or broader transcendental algebra.
- No variable memory implementation, named string variables, graphing, `POLY-ELIM2`, source-mirror execution, Labs runner work, result-origin changes, badge changes, or history schema changes.
- No `PARAM16` roadmap entry; after this slice, resume the Multivariable / Variable Policy roadmap with `VARIABLE-MEMORY1`.
