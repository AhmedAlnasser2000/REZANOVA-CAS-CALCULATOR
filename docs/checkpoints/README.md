# Checkpoints

## Purpose
- Checkpoints are verified app-state summaries.
- They record what the application looked like at meaningful milestones, not raw working notes.

## When To Create Or Update One
- Major milestone completion
- Significant architecture shift
- Large UI or systems harmonization pass
- Workflow or governance overhaul

## When Not To Create One
- Tiny fixes
- Narrow one-file refactors
- Unverified intermediate work

## Files
- `../app_summary_latest.md`: current verified baseline
- `app_summary_previous.md`: previous baseline snapshot
- `history/`: archived checkpoint summaries named by date and short commit

## Naming Convention
- `app_summary_<YYYY-MM-DD>_<short-commit>.md`

## Relationship To Memory
- Checkpoints complement `.memory/`.
- `.memory/` is recall and workflow context.
- `docs/checkpoints/` is verified repo-facing app-state documentation.
