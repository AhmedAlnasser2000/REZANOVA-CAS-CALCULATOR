## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: user
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## What Is Achieved Now

- Symbolic infinity limits branch through symbolic leading coefficients.
- If higher symbolic coefficients vanish, Limits now continues to the next lower term instead of stopping at `0`.
- Target-free constants can appear as the final guarded case.

## Manual App Steps

- Open `Calculus > Limits > Limit`.
- Enter `lim x -> infinity (b*x^2+a*x+c)`.
- Press `Evaluate`.
- Open `Limit Case Proof`.

## Expected Results

- The Answer card shows a compact guarded-case result with five guarded rows.
- The Formula Viewer button is available for the full case formula.
- The proof card includes branches controlled by `b*x^2`, then `a*x`, then the constant `c`.
