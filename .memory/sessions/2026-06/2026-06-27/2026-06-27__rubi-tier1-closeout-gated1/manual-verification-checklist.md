# RUBI-TIER1-CLOSEOUT-GATED1 Manual Checklist

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

- Tier I is closed for the agreed exact-rational plus target-free symbolic integration surface.
- Calculus avoids eager Compute Engine indefinite integration for parameter-heavy selected-variable cases.
- Copy Result returns MathLive-safe LaTeX in rendered/LaTeX notation modes.
- Combined `Valid When` facts are displayed as separate vertical math lines.

## Manual App Steps

- In Calculus > Integrals > Indefinite, set the variable to `A` and evaluate `(A*x+B)/((a*x+b)^2*(c*x+d))`.
- Evaluate `sqrt(4-x^2)`, `sqrt(4+x^2)`, and `sqrt((2x+1)^2-9)` in the indefinite integral screen.
- In rendered notation mode, evaluate `sec(2x+3)^2`, use Copy Result, paste back into the editor, and confirm the expression is LaTeX/MathLive-safe rather than plain ASCII.
- Evaluate a symbolic substitution case such as `a*x^(n-1)*(b+c*x^n)^p` and inspect `Valid When`.
- Toggle plain-text notation and confirm Copy Result intentionally copies plain text only in that mode.

## Expected Results

- Parameter-heavy selected-variable examples return quickly through Calcwiz rules or controlled unsupported output.
- Radical trig-substitution examples render exact symbolic antiderivatives with `verified-exact` trust where supported.
- Copy Result in rendered/LaTeX mode preserves grouped powers, reciprocal trig names, exponentials, and fractions as reusable LaTeX.
- `Valid When` conditions such as `cn\ne0, p+1\ne0` appear as separate stacked facts.
