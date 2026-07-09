# EQUATION-EXTRANEOUS-SOLUTIONS-CARD1 Manual App Checklist

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

- Rejected candidates can appear as a visible `Extraneous Solutions` detail card.
- The card uses existing result detail sections and does not change copy/history/runtime schemas.

## Manual App Steps

- Real Exact: enter `\sqrt{x+1}=x-1`, solve for `x`.
  - Expected: answer keeps `x=3`; `Extraneous Solutions` shows rejected `x=0` with the failed radical/domain reason.
- Real Exact Numeric Interval: run an interval solve for a rational/discontinuous case that rejects a denominator root.
  - Expected: numeric roots remain primary; rejected candidates appear in `Extraneous Solutions` when validation produced evidence.
- Real Exact: solve a polynomial-system or generated-wrapper case that rejects some validation candidates.
  - Expected: valid answers remain visible and rejected candidates are listed in the detail card.
- Copy Result and To Editor on the same outputs.
  - Expected: copied/editor payloads stay scoped to the answer, not the extraneous evidence card.

## Expected Results

- `Extraneous Solutions` is expanded by default.
- Rows show exact candidate math when available, approximate value when available, and a concise rejection reason.
- The card should not expose internal `Trust:` provenance text.
