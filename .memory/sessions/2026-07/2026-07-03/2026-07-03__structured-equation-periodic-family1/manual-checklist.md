# STRUCTURED-EQUATION-PERIODIC-FAMILY1 Manual Checklist

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

- Equation has an internal structured periodic-family representation for exact radian trig families.
- The visible trig readback no longer depends on route-local string simplification for the Frontier 1 families.
- Public display fields remain unchanged.

## Manual App Steps

1. Open Equation -> Symbolic.
2. Set angle unit to RAD.
3. With Complex Off, run:
   - `cos(2x)=0`
   - `sin(2x)=0`
   - `tan(2x)=1`
   - `cos(x/2)=0`
   - `sin(x)=cos(x)`
   - `2sin(x)cos(x)=1`
4. Turn Complex On and run:
   - `cos(2x)=0`
   - `sin(2x)=0`
   - `tan(2x)=1`
   - `cos(x/2)=0`

## Expected Results

- Real answers show rational-pi families with a separate `Valid when` card for `n in Z`.
- Complex direct answers show rational-pi families with inline `k in Z`.
- The answer card should not show nested fractions, stale previous expressions, or overflow across card boundaries.
