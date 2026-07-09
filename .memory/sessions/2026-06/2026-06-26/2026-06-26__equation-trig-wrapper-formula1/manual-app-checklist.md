# EQUATION-TRIG-WRAPPER-FORMULA1 Manual App Checklist

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

- Real Exact one-layer `sin`, `cos`, and `tan` wrappers can delegate generated cubic/quartic equations to Cardano/Ferrari formula routes.
- Rational generated trig equations can clear safe denominators and preserve denominator exclusions.
- Exact sine/cosine endpoints dedupe duplicate generated periodic branches.
- Complex trig formula wrappers remain deferred.

## Manual App Steps

- Real Exact: `sin(z^3+z+1)=b`.
- Real Exact: `cos(z^4+z+1)=b`.
- Real Exact: `tan(z^3+z+1)=b`.
- Real Exact rational case: `sin((z^3+z+1)/(z-m))=b`.
- Real Exact non-`x` target: `tan(y^4+y+1)=b`.
- Real Exact endpoint dedupe: `sin(z^3+z+1)=1`.
- Real Exact out-of-range stop: `sin(z^3+z+1)=2`.
- Complex Exact boundary: `sin(z^3+z+1)=b`.

## Expected Results

- Real sine/cosine/tangent cases show formula-backed `caseMath` answers with periodic branch provenance and integer-parameter facts.
- The rational case includes the denominator exclusion such as `z-m\ne0`.
- Endpoint cases avoid duplicate generated branches for the same periodic family.
- Out-of-range sine/cosine inputs stop as domain-empty.
- Complex trig wrappers remain unsupported and do not attempt generated Cardano/Ferrari formula families.
