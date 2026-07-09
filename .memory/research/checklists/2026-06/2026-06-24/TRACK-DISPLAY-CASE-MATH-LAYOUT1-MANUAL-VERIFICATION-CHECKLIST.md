# DISPLAY-CASE-MATH-LAYOUT1 Manual Verification Checklist

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## What Is Achieved Now

- Real Exact general Cardano case answers render as structured case rows instead of one cramped case expression.
- The answer card grows taller for case math while keeping horizontal overflow inside the case layout.
- Copy Result, To Editor, History, replay, and stored output keep using the canonical `exactLatex`.
- Complex Exact Cardano remains a compact branch list.

## Manual App Steps

- Run Real Exact, Complex Off: `a*x^3+b*x^2+c*x+d=0`.
- Run Real Exact, Complex Off: `x^3+x+1=0`.
- Run Real Exact, Complex Off: `x^3-3*x+1=0`.
- Run Real Exact, Complex Off with selected target `z`: `a*z^3+b*z^2+c*z+d=0`.
- Run Complex Exact, Complex On: `a*x^3+b*x^2+c*x+d=0`.
- Use `Copy Result` on a Real Cardano answer.

## Expected Results

- Real symbolic Cardano shows readable case rows with conditions on the right.
- Specialized numeric Real cubics show only the applicable discriminant case.
- Non-`x` targets keep the selected target in the answer prefix.
- Complex Cardano still shows three compact branch rows with `U_0`, `U_1`, and `U_2`.
- Copy Result for Real Cardano copies the canonical case expression, not the promoted display rows.
