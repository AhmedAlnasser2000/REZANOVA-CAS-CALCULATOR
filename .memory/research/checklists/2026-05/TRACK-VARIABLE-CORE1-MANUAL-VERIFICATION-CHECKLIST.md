# TRACK-VARIABLE-CORE1 Manual Verification Checklist

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: direct

## What Is Achieved Now

- `VARIABLE-CORE1` adds an internal symbol-discovery and variable-role core.
- The core preserves case sensitivity: `K` and `k` are distinct symbols.
- Reserved functions and constants are classified separately from variables.
- Raw adjacent letters such as `hello` are not accepted as one named string variable.
- `math-analysis` exposes richer variable metadata beside existing `containsSymbolX`.
- Existing app behavior remains unchanged.

## Manual App Steps

- Launch the app normally.
- In Calculate, evaluate a one-variable expression such as `x+1`.
- In Equation, solve an existing supported `x` equation such as `x^2-5x+6=0`.
- In Table, generate a table for a normal `x` expression such as `x^2`.
- Try existing calculus examples that use `x` as the active or bound variable.

## Expected Results

- The app behaves the same as before `VARIABLE-CORE1`.
- No solve-target chooser appears yet.
- No variable-memory substitution appears.
- No named string variable support appears.
- No semantic highlighting appears yet.
- Existing `x`-based solver, table, and calculus flows remain stable.

## Verification Commands

- `npm run test:unit -- src/lib/algebra/variable-core.test.ts src/lib/engine/math-analysis.test.ts src/lib/modes/equation.test.ts src/lib/modes/calculate.test.ts src/lib/calculus/calculus-core.test.ts src/lib/modes/table.test.ts src/lib/algebra/capability-readiness.test.ts`
- `npm run test:golden`
- `npm run test:memory-protocol`
- `npm run lint`
- `npm run build`
