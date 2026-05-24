# TRACK-EQUATION-PARAM11 Manual Verification Checklist

## Metadata

- milestone: `EQUATION-PARAM11`
- title: Bounded One-Layer Composition Handoff And Power Readback Fix
- date: 2026-05-24
- primary_agent: codex
- primary_agent_model: gpt-5.5
- scope: implementation

## What Is Achieved Now

- Selected-target Equation solving supports one-layer composition handoff for nonperiodic, exp/log, and direct trig outer carriers.
- Generated branch equations delegate to existing selected-target helper files instead of reopening the older x-centric composition lane.
- Branch/domain facts, trig range facts, integer-family facts, and delegated nonzero/denominator facts are preserved.
- The PARAM10 `a^z=b^z` solve-for-`a` readback no longer renders exponent lists such as `[z,1/z]`.

## Manual App Steps

- Launch the app.
- Open Equation mode, Symbolic screen.
- Enter `sqrt(z^2+a)=b`, select `z`, and run Solve.
- Confirm the result is a `z` solution set with facts including `b\ge0`.
- Enter `sin(z^2+a)=b`, select `z`, use RAD mode, and run Solve.
- Confirm the result is a periodic `z` solution set with `n\in\mathbb{Z}` and `-1\le b\le1`.
- Enter `a^z=b^z`, select `a`, and run Solve.
- Confirm the result reads as a parenthesized/root-style power expression, not as `[z,1/z]`.
- Enter `sqrt(|z-a|)=b`, select `z`, and run Solve.
- Confirm the app stops because nested/two-layer composition is deferred.

## Boundaries To Preserve

- No nested/two-layer composition.
- No mixed-carrier equations.
- No broad/deep `COMP` reopening.
- No variable memory.
- No named string variables.
- No `POLY-ELIM2`.
- No graphing, source-mirror execution, Labs runner work, result-origin changes, badge changes, or history schema changes.

## Verification Commands

```bash
npm run test:unit -- src/lib/equation/equation-parameterized-composition.test.ts src/lib/equation/equation-parameterized-exp-log.test.ts src/lib/equation/equation-parameterized-trig.test.ts src/lib/equation/equation-parameterized-carrier.test.ts src/lib/equation/equation-parameterized-polynomial.test.ts src/lib/equation/equation-parameterized-factorable-polynomial.test.ts src/lib/equation/equation-target.test.ts src/lib/modes/equation.test.ts src/lib/engine/math-analysis.test.ts src/lib/algebra/variable-core.test.ts
npm run test:ui -- src/AppMain.ui.test.tsx
npm run test:golden
npm run test:memory-protocol
npm run lint
npm run build
```
