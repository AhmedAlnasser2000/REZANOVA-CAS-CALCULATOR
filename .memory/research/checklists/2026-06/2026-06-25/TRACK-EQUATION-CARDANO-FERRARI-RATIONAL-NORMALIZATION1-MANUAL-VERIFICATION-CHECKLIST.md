# EQUATION-CARDANO-FERRARI-RATIONAL-NORMALIZATION1 Manual Verification Checklist

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Manual App Checks

- Real Exact: `\frac{a*x^3+b*x^2+c*x+d}{x-m}=0` solves through Cardano case readback and shows denominator exclusion `x-m\ne0`.
- Complex Exact: `\frac{a*x^3+b*x^2+c*x+d}{x-m}=0` solves through Cardano branch-list readback and shows denominator exclusion `x-m\ne0`.
- Real Exact: `\frac{a*x^4+b*x^3+c*x^2+d*x+f}{x-m}=0` solves through Ferrari `caseMath` readback and shows denominator exclusion `x-m\ne0`.
- Complex Exact: `\frac{a*x^4+b*x^3+c*x^2+d*x+f}{x-m}=0` solves through four Ferrari branch rows and shows denominator exclusion `x-m\ne0`.
- Real Exact and Complex Exact: `\frac{x^4+x+1}{x-m}=0` succeed without falling back to generated/wrapper solving.
- Existing rational linear/quadratic examples still route before formula normalization.
- Wrapper examples such as `\sqrt{x^4+x+1}=b`, `\ln(x^4+x+1)=b`, and `\sin(x^4+x+1)=b` still do not attempt Ferrari.

## Notes

- No manual app run was performed in this Codex pass; coverage is from focused unit/mode/display regressions.
