# DISPLAY-CASE-ROW-BUDGETS1 Manual App Checklist

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

- Heavy formula-case summaries stay metadata-only before expansion.
- `Show full formula cases` reveals rows progressively.
- Giant rows render as lightweight per-row placeholders instead of mounting all formula and condition math.
- A single `Show formula row` action renders only the chosen over-budget row.
- Global `Valid When` facts remain visible and row-local guards stay row-local.

## Manual App Steps

- In Real Exact Equation mode, enter `sin((z^3+z+1)/(z-m))=b`.
- Confirm the answer initially shows the compact formula-case summary with row/group/character counts and no raw formula snippet.
- Click `Show full formula cases`.
- Confirm rows reveal progressively and giant rows appear as placeholders with `Show formula row`.
- Confirm the app remains responsive while placeholders are visible.
- Click one `Show formula row` button and confirm only that row renders its formula/condition math.
- Edit or re-solve while rows/placeholders are present and confirm stale rows disappear with the new result.
- Open the collapsed `Trig Formula Cases` detail card for the same result and confirm it also starts compact/budgeted rather than rendering all formula rows immediately.
- Revisit the same result from History and confirm raw `\substack` text does not appear; the replayed answer remains a structured compact or budgeted case display.
- Check `x^3+p*x+2=0` and `x^4+p*x^2+r=0` still render small direct formula cases normally.

## Expected Results

- No giant formula-row MathStatic, condition MathStatic, group-label math, or raw LaTeX preview mounts before the row is explicitly shown.
- Formula-case detail cards follow the same rule as the answer card.
- History/replay does not expose raw `\substack` for generated formula case rows.
- Copy Result remains available and unchanged before expansion, after expansion, and after a single-row reveal.
- Valid When facts such as denominator exclusions and wrapper/trig/log facts still render separately.
