# TRACK-EQUATION-QUARTIC-FERRARI-ROUTE1 Manual Verification Checklist

Date: 2026-06-25
Repo: `/home/ahmed/Downloads/Calculator`
Gate: backend

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

- Direct degree-4 selected-target quartics solve through live Ferrari in Complex Exact and Real Exact.
- The route supports selected targets other than `x`.
- Complex output uses compact Ferrari branch rows plus a `Ferrari Definitions` card.
- Real output uses case-style `caseMath` rows plus `Real Ferrari Definitions` and `Real Ferrari Cases`.
- Biquadratic quartics such as `x^4+p*x^2+r=0` use the simpler `s_+`/`s_-` special form.
- Rational-cleared quartics and generated/wrapper quartics remain deferred.

## Manual App Steps

1. Set Equation to Symbolic, Exact, Complex On. Enter `a*x^4+b*x^3+c*x^2+d*x+f=0`, target `x`, and solve.
2. Set Complex Off and solve `a*x^4+b*x^3+c*x^2+d*x+f=0`.
3. Repeat Step 2 with `a*z^4+b*z^3+c*z^2+d*z+f=0`, target `z`.
4. Set Complex On and solve `x^4+p*x^2+r=0`.
5. Set Complex Off and solve `x^4+p*x^2+r=0`.
6. Solve exact-rational factorable `x^4-5*x^2+4=0`.
7. Solve rational-cleared quartic `\frac{a*x^4+b*x^3+c*x^2+d*x+f}{x-m}=0`.
8. Try wrapper quartics such as `\sqrt{x^4+x+1}=b`, `\ln(x^4+x+1)=b`, and `\sin(x^4+x+1)=b`.

## Expected Results

- Step 1 succeeds with four Complex Ferrari branches containing `PrincipalRoot_2` and `PrincipalRoot_3`, plus compact `Ferrari Definitions`; no `RootOf`.
- Step 2 succeeds with a Real case-style answer and `Real Ferrari Definitions`; no Complex `PrincipalRoot` in the Real answer.
- Step 3 succeeds and the answer/details use `z`, not `x`, as the selected target.
- Steps 4 and 5 use `s_+`/`s_-` biquadratic readback and avoid `U`/`S` denominator facts.
- Step 6 still routes through the older factorable path before Ferrari.
- Step 7 stops honestly as rational-cleared quartic Ferrari deferred.
- Step 8 remains unsupported/deferred under generated wrapper handoff and does not attempt Ferrari.

## Follow-Up Watch

- Large Real Ferrari case output should be reviewed in the live app at common desktop sizes. `DISPLAY-CASE-MATH-LAYOUT1` already made case answers dynamic, but four-root quartic rows may still motivate a later layout polish.
