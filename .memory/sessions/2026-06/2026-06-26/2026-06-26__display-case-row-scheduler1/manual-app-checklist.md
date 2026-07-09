# DISPLAY-CASE-ROW-SCHEDULER1 Manual App Checklist

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

- Heavy formula-case answers remain compact until expanded.
- Expansion reveals rows progressively instead of mounting the full answer at once.
- Stale scheduled rows are canceled when a new result replaces the answer.
- Copy Result remains canonical and unchanged.

## Manual App Steps

- In Real Exact Equation mode, enter `sin((z^3+z+1)/(z-m))=b`.
- Confirm the answer initially shows the compact formula-case summary.
- Click `Show full formula cases`.
- Confirm the answer shows formula-case render progress before all rows appear.
- Start editing or solve another expression during expansion and confirm stale rows from the previous answer do not reappear.
- Check `x^3+p*x+2=0` still renders directly without compact mode.

## Expected Results

- Heavy expansions remain responsive enough for navigation and follow-up editing.
- Global `Valid When` facts stay visible outside row-local guards.
- Row-local guards render only with their row.
- Small formula answers remain immediate.
