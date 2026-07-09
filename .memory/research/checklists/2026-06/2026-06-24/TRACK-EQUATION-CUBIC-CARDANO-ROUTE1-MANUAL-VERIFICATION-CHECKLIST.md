# TRACK-EQUATION-CUBIC-CARDANO-ROUTE1 Manual Verification Checklist

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

- Complex Exact Equation mode can solve a direct general symbolic cubic such as `a*x^3+b*x^2+c*x+d=0`.
- The result uses three structured Cardano branches with visible `\operatorname{PrincipalRoot}_{3}` notation.
- `cis` Complex exact form renders Cardano branch multipliers with `\operatorname{cis}`.
- Real Exact general symbolic cubics remain stopped unless an older cleaner route already handles the shape.
- General quartics remain blocked; Ferrari is still not implemented.
- Existing low-degree power output such as `u^3=a` remains on the compatibility readback path.

## Manual App Steps

- Open Equation.
- Set answer mode to `Exact`.
- Turn Complex on.
- Enter `a*x^3+b*x^2+c*x+d=0`.
- Select target `x` if it is not selected automatically.
- Run/Solve.
- Switch Complex exact form to `cis`, run again, and inspect the branch rows.
- Turn Complex off and run the same general symbolic cubic again.
- With Complex on, run `a*x^4+b*x^3+c*x^2+d*x+f=0`.
- Run `u^3=a` with Complex on as a compatibility spot check.

## Expected Results

- Complex Exact general cubic succeeds with three finite branch rows.
- The Complex Exact general cubic result contains `PrincipalRoot_3`, does not contain `RootOf`, and includes symbolic nonzero supplements for the leading coefficient and Cardano denominator branch when needed.
- In `cis` form, branch multipliers use `\operatorname{cis}`.
- With Complex off, the general symbolic cubic remains unsupported; it should not show `PrincipalRoot_3` or `RootOf`.
- The quartic remains blocked with a Ferrari-deferred explanation; it should not show a Ferrari formula, `RootOf`, or cubic `PrincipalRoot_3` output.
- `u^3=a` keeps its existing low-degree visible output rather than switching to the new Cardano `PrincipalRoot_3` route.
