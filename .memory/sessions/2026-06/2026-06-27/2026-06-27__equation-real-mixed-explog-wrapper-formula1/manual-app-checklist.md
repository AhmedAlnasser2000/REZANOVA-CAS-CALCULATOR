# Manual App Checklist

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

What is achieved now:
- Real Exact affine mixed exp/log wrappers can show formula output when exactly one selected-target exp/log carrier generates a cubic or quartic branch.
- Existing exp/log readback remains `Parameterized Exp/Log Solve` plus Real Cardano/Ferrari detail sections.
- Symbolic coefficient and target-free exp/log companion facts are visible as global `Valid When` facts.

Manual app steps:
- In Equation, Real Exact, target `z`, solve `2\ln(z^3+z+1)+c=b`.
- Solve `a\ln(z^3+z+1)+c=d`.
- Solve `a e^{z^4+z+1}+c=d`.
- Solve `\ln((z^4+z+1)/(z-m))+c=b`.
- Solve `\ln(z^3+z+1)+\ln(a)=b`.
- Try boundary cases `\ln(z^3+z+1)+z=b`, `e^{z^3+z+1}+z=b`, `\ln(z^3+z+1)+\ln(z+1)=b`, and Complex Exact `2\ln(z^3+z+1)+c=b`.

Expected results:
- Enabled Real cases render `caseMath` answers with `Real Cardano Cases` or `Real Ferrari Cases`.
- `a\ne0`, output positivity, log argument positivity, symbolic base facts, and denominator exclusions appear when applicable.
- There is no `Mixed Exp/Log Formula Cases` grouped section.
- Boundary cases remain unsupported and show no Real Cardano/Ferrari formula sections.
