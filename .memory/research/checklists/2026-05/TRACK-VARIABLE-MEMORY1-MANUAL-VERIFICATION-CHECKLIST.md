# TRACK-VARIABLE-MEMORY1 Manual Verification Checklist

status: ready for manual verification
date: 2026-05-24
agent: codex
model: gpt-5.5

## Scope

- `VARIABLE-MEMORY1` adds explicit stored numeric variables and visible standard-Calculate substitution.
- The milestone is product-facing but narrow: Equation symbolic solve, Table, Calculus, named-string variables, and graphing are not adopted.

## Manual Checks

- Open the Variables side panel from the top strip `Vars` control.
- Store `a = 4`, then run Calculate standard `a+1`; confirm the result is `5` and details include `Stored Values`.
- Store `K = 3` and `k = 5`; confirm both are listed separately.
- Try invalid names: `Ans`, `sin`, `pi`, and `hello`; confirm concise validation messages appear.
- Try invalid values: `pi`, `e`, `sqrt(2)`, `1/0`, `NaN`, and a symbolic value such as `a+1`; confirm they are rejected.
- Run Calculate `simplify(a+1)` through the Simplify action and confirm stored `a` is not substituted.
- Open Equation symbolic with stored `x = 2`, solve `x+z=5` for `z`, and confirm the result remains `z=5-x`.
- Run Calculate `a+1` with `a=4`, change `a` to `9`, replay the history entry, and confirm replay still uses `a=4`.

## Verification Commands

- `npm run test:unit -- src/lib/algebra/variable-memory.test.ts src/lib/algebra/variable-core.test.ts src/lib/modes/calculate.test.ts src/lib/modes/equation.test.ts src/lib/app-state/history-schema.test.ts src/lib/app-state/settings.test.ts src/app/logic/runtimeControllers.test.ts`
- `npm run test:ui -- src/AppMain.ui.test.tsx src/components/VariablesPanel.ui.test.tsx src/AppMain.status.ui.test.tsx`
- `npm run test:golden`
- `npm run test:memory-protocol`
- `npm run lint`
- `npm run build`
- `cargo check --manifest-path src-tauri/Cargo.toml`

## Boundaries To Recheck

- No stored-value substitution in Equation symbolic solve.
- No stored-value substitution in guided Calculus, Table, or Calculate algebra transforms.
- No named-string variable support.
- No `PARAM16`, graphing, `POLY-ELIM2`, source-mirror execution, or Labs runner work.
