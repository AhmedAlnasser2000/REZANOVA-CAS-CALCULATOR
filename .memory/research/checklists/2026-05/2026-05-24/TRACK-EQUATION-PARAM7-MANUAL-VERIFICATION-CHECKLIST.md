# TRACK-EQUATION-PARAM7 Manual Verification Checklist

## Metadata

- milestone: `EQUATION-PARAM7`
- title: Parameterized Readback, Replay, Guide, And Roadmap Reset
- date: 2026-05-23
- primary_agent: codex
- primary_agent_model: gpt-5.5
- scope: implementation polish

## What Is Achieved Now

- Parameterized Equation detail sections share a common selected-target/symbolic-parameter wording policy.
- Existing family titles such as `Parameterized Linear Solve`, `Parameterized Rational Solve`, and `Parameterized Trig Solve` remain visible.
- Safe readback-only inverse-power restrictions are normalized toward clearer fraction notation.
- Equation history entries may store `equationSolveTarget` and replay it.
- Guide examples may launch Equation mode with the intended selected target.
- Guide now includes examples for PARAM1 through PARAM6 families.
- PARAM8 through PARAM12 are reserved for stronger rational, higher-degree polynomial, symbolic-base exp/log, one-layer composition, and mixed-carrier/composition work.

## Manual App Steps

- Launch the app.
- Open Equation mode, Symbolic screen.
- Enter `x+z=5`, select `z`, and run Solve.
- Confirm the result still reads `z=5-x` and details mention selected target `z` and symbolic parameter `x`.
- Open History and replay that entry.
- Confirm the Equation target selector restores `z` as the selected target.
- Open Guide, find Equation examples, and launch a selected-target example such as `x+z=5`.
- Confirm it opens Equation > Symbolic with `z` preselected.
- Run a rational example such as `1/(z-a)=b` and confirm restrictions remain visible without changing the primary answer.

## Boundaries To Preserve

- No new solving families.
- No solver priority changes.
- No new result origins or badges.
- No variable memory.
- No named string variables.
- No `POLY-ELIM2`.
- No graphing.
- No source-mirror execution or copied source.

## Verification Commands

```bash
npm run test:unit -- src/lib/equation/equation-parameterized-readback.test.ts src/lib/equation/equation-history.test.ts src/lib/app-state/history-schema.test.ts src/lib/guide/content.test.ts src/lib/equation/equation-parameterized-linear.test.ts src/lib/equation/equation-parameterized-polynomial.test.ts src/lib/equation/equation-parameterized-rational.test.ts src/lib/equation/equation-parameterized-carrier.test.ts src/lib/equation/equation-parameterized-exp-log.test.ts src/lib/equation/equation-parameterized-trig.test.ts src/lib/modes/equation.test.ts
npm run test:ui -- src/AppMain.ui.test.tsx
npm run test:golden
npm run test:memory-protocol
npm run lint
npm run build
```
