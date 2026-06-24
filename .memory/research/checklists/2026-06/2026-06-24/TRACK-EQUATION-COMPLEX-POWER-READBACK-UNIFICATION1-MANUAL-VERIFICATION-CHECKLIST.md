# TRACK-EQUATION-COMPLEX-POWER-READBACK-UNIFICATION1 Manual Verification Checklist

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

- Symbolic Complex direct powers use compact `PrincipalRoot_n(r)\omega_k` answer rows from degree 2 through 12.
- The `Complex Power Definitions` card explains the radicand and branch multipliers.
- `cis` mode changes the definition card to `\operatorname{cis}` while rectangular/polar-compatible modes show exact `\cos+i\sin` multipliers.
- Exact-rational and explicit-imaginary low-degree Complex powers still use concrete exact branch output.
- Real Exact odd powers still use real radical notation.

## Manual App Steps

1. Open Equation, Symbolic Solve.
2. Enable `Complex On` and `EXACT`.
3. Enter `x^3+q=0` with target `x`.
4. Run the solve and expand `Complex Power Definitions`.
5. Repeat with `x^2=a`, `x^4=a`, `(x+c)^3=a`, and `(2*x-1)^4=a`.
6. Switch the Complex exact form between `cis` and rectangular/trig notation if exposed in Settings.
7. Enter `x^3+8=0`, `x^4+1=0`, and `x^4+i=0`.
8. Turn Complex off and run `u^3=a`.
9. Run `a*x^3+b*x^2+c*x+d=0` with Complex on to confirm Cardano remains compact.

## Expected Results

- Symbolic Complex power answers show rows such as `x=\operatorname{PrincipalRoot}_{3}(-q)\omega_k`.
- The definitions card shows `r`, each `\omega_k`, and `u_k=\operatorname{PrincipalRoot}_{n}(r)\omega_k`.
- `cis` mode appears in the definitions card only; answer rows remain compact omega rows.
- Concrete low-degree Complex cases still show concrete roots, not `PrincipalRoot`.
- Real Exact `u^3=a` shows `u=\sqrt[3]{a}` and does not show `PrincipalRoot`.
- General Complex Cardano still shows compact `-A/3+U_k-p/(3U_k)` rows and its Cardano definitions.
