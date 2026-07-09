# TRACK-EQUATION-CUBIC-CARDANO-READBACK-POLISH1 Manual Verification Checklist

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

- Complex Exact general symbolic cubics still solve through the live `cubic-cardano` route.
- The visible answer rows are compact and use declared auxiliary symbols instead of repeating the fully expanded Cardano formula.
- `PrincipalRoot_3` and branch multiplier notation are shown in the Cardano definitions detail section.
- Valid When shows compact facts instead of a giant expanded radicand condition.

## Manual App Steps

1. Open Equation, Symbolic Solve.
2. Enable `Complex On` and `EXACT`.
3. Enter `a*x^3+b*x^2+c*x+d=0` and select target `x`.
4. Run the solve.
5. Expand the Cardano detail section.
6. Repeat with `complexExactForm` set to `cis` and then rectangular/trig notation if the settings are exposed.
7. Enter `a*x^4+b*x^3+c*x^2+d*x+f=0` with `Complex On`.
8. Turn `Complex Off` or Real intent on and rerun the symbolic cubic.

## Expected Results

- The answer card shows three short branch rows like `x=-A/3+U_k-p/(3U_k)`.
- The Cardano definitions section shows `A`, `B`, `C`, `p`, `q`, `Delta`, `R`, `omega_k`, and `U_k`.
- In `cis` mode the definitions show `\operatorname{cis}`; in rectangular/trig mode they show exact `cos(...) + i sin(...)`.
- Valid When shows `a\ne0` and `R\ne0` for the general symbolic cubic.
- The quartic still stops with the Ferrari-deferred message.
- The Real-domain general symbolic cubic remains stopped and does not show `PrincipalRoot_3`.
