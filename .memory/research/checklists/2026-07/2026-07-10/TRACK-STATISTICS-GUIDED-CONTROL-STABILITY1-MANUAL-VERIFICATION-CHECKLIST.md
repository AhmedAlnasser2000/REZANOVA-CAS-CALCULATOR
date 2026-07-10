# TRACK-STATISTICS-GUIDED-CONTROL-STABILITY1 Manual Verification Checklist

## Attribution
- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- contributors:
  - user
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: sol
- attribution_basis: live

## What Is Achieved Now

- Dataset entry preserves commas and other in-progress separators.
- Probability, Inference, Regression, and Correlation inputs no longer jump focus to their first field after a keystroke.
- Dataset draft text survives Statistics workspace-tab capture and restore.
- No workspace consolidation or visual redesign is included in this fix gate.

## Manual App Steps

1. Open `Data > Statistics > Data Entry`, replace the dataset with `12,`, and confirm the comma remains visible.
2. Open `Probability > Binomial`, select the `p` field, type one digit, and confirm focus stays in `p`.
3. Open `Inference > Mean`, select `Two-Sided Test`, edit `mu0`, and confirm focus stays in `mu0`.
4. Open `Regression` and `Correlation`, edit a non-first x/y cell, and confirm focus stays in that cell.
5. Switch to another workspace tab and back after entering a trailing comma; confirm the raw dataset draft is restored.

## Expected Results

- Typed delimiters are preserved exactly until the user intentionally converts or replaces the dataset.
- Every edited guided input retains focus and receives subsequent keystrokes.
- Existing generated Statistics requests and evaluations remain unchanged.
- No Linear Algebra or other workspace behavior changes.
