# TRACK-COMP13A Manual Verification Checklist

milestone: `COMP13A`
date: 2026-05-24
primary_agent: codex
primary_agent_model: gpt-5.5

## Scope

- Refactor the existing guarded composition engine from inside.
- Add a shared composition core seam for selected-target carrier detection, one-layer branch generation, branch-set provenance, and composition-depth policy.
- Preserve existing guarded `x` composition behavior.
- Preserve `EQUATION-PARAM11` selected-target behavior.

## Manual Checks

- Enter `ln(sqrt(x+1))=2` in Equation > Symbolic and confirm guarded composition behavior remains unchanged.
- Enter `sin(x^3+x)=1/2` in Equation > Symbolic and confirm reduced-carrier periodic behavior remains unchanged.
- Enter `sqrt(z^2+a)=b`, choose `z`, and confirm the one-layer selected-target composition result remains unchanged.
- Enter `sin(z^2+a)=b`, choose `z`, and confirm periodic facts and generated branch details remain unchanged.
- Enter `sqrt(|z-a|)=b`, choose `z`, and confirm it still stops as deferred nested/mixed composition.
- Enter `az=1`, choose `z` if offered, and confirm raw adjacent products remain unsupported.

## Verification

- [x] `npm run test:unit -- src/lib/equation/composition-core.test.ts src/lib/equation/equation-parameterized-composition.test.ts src/lib/equation/guarded-solve.test.ts`
- [x] `npm run test:unit -- src/lib/equation/guarded-solve.test.ts src/lib/equation/equation-parameterized-composition.test.ts src/lib/equation/equation-parameterized-exp-log.test.ts src/lib/equation/equation-parameterized-trig.test.ts src/lib/equation/equation-parameterized-carrier.test.ts src/lib/equation/equation-target.test.ts src/lib/modes/equation.test.ts`
- [x] `npm run test:ui -- src/AppMain.ui.test.tsx`
- [x] `npm run test:golden`
- [x] `npm run test:memory-protocol`
- [x] `npm run lint`
- [x] `npm run build`

## Boundaries

- No new solving families.
- No `EQUATION-PARAM12` two-layer or mixed-carrier wins.
- No variable memory, named string variables, graphing, `POLY-ELIM2`, source-mirror execution, Labs runner work, result-origin changes, badge changes, or history schema changes.
