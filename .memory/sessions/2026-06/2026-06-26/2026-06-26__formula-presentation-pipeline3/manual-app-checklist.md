# FORMULA-PRESENTATION-PIPELINE3 Manual App Checklist

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

- Heavy formula-case compact summaries are metadata-only and do not show raw LaTeX snippets.
- Full formula rows still appear only after `Show full formula cases`.
- Copy Result remains canonical and unchanged.

## Manual App Steps

- In Real Exact Equation mode, enter `sin((z^3+z+1)/(z-m))=b`.
- Confirm the answer initially shows the compact formula-case summary.
- Confirm the summary shows row/group/character counts and no raw formula snippet.
- Click `Copy Result` before expansion.
- Click `Show full formula cases` and confirm formula rows appear.
- Check a small direct case such as `x^3+p*x+2=0` still renders normally without the compact summary.

## Expected Results

- No formula-row math or raw preview snippet is mounted before expansion.
- Copy Result works before and after expansion.
- Small formula cases remain directly visible.

