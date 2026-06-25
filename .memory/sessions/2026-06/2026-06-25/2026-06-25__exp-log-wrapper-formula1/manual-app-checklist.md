# EXP-LOG-WRAPPER-FORMULA1 Manual App Checklist

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## What Is Achieved Now

- Real Exact one-layer exp/log wrappers over existing non-target bases may delegate generated degree-3/4 equations to Real Cardano/Ferrari formula payloads.
- Exp/log domain facts remain global Valid When facts, while Cardano/Ferrari case guards remain row-local `when` conditions from the presentation gate.
- Complex exp/log formula wrappers and target-in-base formula widening remain unsupported.

## Manual App Steps

- Real Exact: enter `\ln(z^3+z+1)=b`, solve for `z`.
- Real Exact: enter `\ln(z^4+z+1)=b`, solve for `z`.
- Real Exact: enter `e^{z^3+z+1}=b`, solve for `z`.
- Real Exact: enter `e^{z^4+z+1}=b`, solve for `z`.
- Real Exact symbolic base: enter `\log_a(z^3+z+1)=d`, solve for `z`.
- Real Exact symbolic base: enter `a^{z^4+z+1}=d`, solve for `z`.
- Real Exact rational: enter `\ln((z^3+z+1)/(z-m))=b`, solve for `z`.
- Boundary: switch to Complex Exact and try `\ln(z^3+z+1)=b`.
- Boundary: try a target-in-base shape such as `(z^3+z+1)^a=b`.
- Boundary: try a trig wrapper such as `\sin(z^4+z+1)=b`.

## Expected Results

- Cubic generated equations show Real Cardano case rows through the exp/log solve.
- Quartic generated equations show Real Ferrari case rows through the exp/log solve.
- Log and exponential outputs include appropriate global positivity/base facts such as `b>0`, `d>0`, `a>0`, and `a\ne1`.
- Rational generated equations preserve denominator exclusions such as `z-m\ne0`.
- Complex, target-in-base, and trig examples remain unsupported and do not attempt formula families.
