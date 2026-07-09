# Structured Equation Constraints 3 Manual Checklist

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

- Loose Equation supplement strings can be parsed into internal structured constraints.
- Parameterized routes keep their existing raw `exactSupplementLatex` output while gaining a typed normalization path.
- Grouped supplement rendering can emit the existing `\text{Exclusions: }` and `\text{Conditions: }` lines from typed entries.

## Manual App Steps

1. Open Equation -> Symbolic.
2. Solve `\frac{x^2-1}{x-1}=0`.
3. Solve `\sqrt{x+5}=3`.
4. Solve `x^2-5x+6=0`.

## Expected Results

- Rational examples still show denominator exclusions.
- Radical examples still solve without losing domain/readability details.
- Answer and supplement cards remain readable and do not show `undefined`.
