# TRACK-EQUATION-CUBIC-CARDANO-REAL-ROUTE1 Manual Verification Checklist

Date: 2026-06-24
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

- Real Exact direct symbolic cubics solve through a live Cardano route.
- The route supports selected targets other than `x`.
- Real output uses compact case-style readback with `A/B/C/p/q/Delta` definitions.
- Case facts stay local to `Delta>0`, `Delta=0`, and `Delta<0` rows.
- Complex Cardano still uses compact `U_k` branch rows and PrincipalRoot definitions.
- Quartics, generated-handoff Cardano, symbolic carrier quadratics, and `RootOf` remain blocked/deferred.

## Manual App Steps

1. Set Equation to Symbolic, Exact, Complex Off. Enter `a*x^3+b*x^2+c*x+d=0`, target `x`, and solve.
2. Repeat with `a*z^3+b*z^2+c*z+d=0`, target `z`.
3. Set Complex On and solve `a*x^3+b*x^2+c*x+d=0`.
4. Set Complex Off and solve `u^3=a`.
5. Set Complex Off and solve `x^3+x+1=0`.
6. Set Complex Off and solve `x^3-3*x+1=0`.
7. Set Complex Off and solve `a*x^4+b*x^3+c*x^2+d*x+f=0`.

## Expected Results

- Step 1 succeeds with a Real answer card using a case expression and a `Real Cardano Definitions` detail card.
- Step 2 succeeds and the answer/details use `z`, not `x`, as the selected target.
- Step 3 still succeeds through Complex Cardano with compact `U_0`, `U_1`, `U_2` branch rows and PrincipalRoot definitions in details.
- Step 4 remains the existing real radical output such as `u=\sqrt[3]{a}`.
- Step 5 specializes to the `\Delta>0` real cube-root case.
- Step 6 specializes to the `\Delta<0` trig/arccos case with `k=0,1,2`.
- Step 7 remains a Ferrari/quartic boundary and does not show `RootOf`.

## Follow-Up Watch

- Large Real Cardano case expressions may need a later Display layout/sizing milestone if the answer card feels cramped in the app. This checklist treats that as a UI follow-up, not a solver-blocking issue for this backend gate.
