# Printer Output Change Ledger

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: sol
- attribution_basis: live

## Accepted Changes

None through `PRINT-PROFILE-EQUATION-ADVANCED1`.

## Rejected Candidates

| Milestone | Fixture | Existing | Candidate | Decision |
| --- | --- | --- | --- | --- |
| `PRINT-PROFILE-CALCULATE-EQUATION1` | `calculate-factor-perfect-square` | `(x+1)(x+1)` | `(1+x)(1+x)` | Rejected: puts constants before the variable and is less readable. |
| `PRINT-PROFILE-CALCULATE-EQUATION1` | `calculus-derivative-general-power` | `2\ln(\cos(x))\cos(x)^{2x}-\frac{1}{\cos(x)}(2x\sin(x)\cos(x)^{2x})` | `\frac{-2x\sin(x)\cos(x)^{2x}}{\cos(x)}+2\ln(\cos(x))\cos(x)^{2x}` | Rejected: reorders the producer presentation and leads with a negative quotient. |
| `PRINT-PROFILE-CALCULATE-EQUATION1` | `calculus-derivative-known-inverse-trig` | `\sqrt{\frac{1}{1-x^2}}` | `\sqrt{\frac{1}{-x^2+1}}` | Rejected: weakens the standard domain-readable denominator form. |

All three candidates are mathematically equivalent by shared answer-node identity, but equivalence alone is not sufficient for pedagogical acceptance. The producer-owned domain adapters retain the existing canonical strings.
