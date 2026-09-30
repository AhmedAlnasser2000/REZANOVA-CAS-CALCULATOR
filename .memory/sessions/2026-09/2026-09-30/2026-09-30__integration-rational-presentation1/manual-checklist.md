# Manual verification

## What is achieved now

Readable exact rational answers with compact/full views and unchanged mathematical capabilities.

## Manual app steps

- Run `npm run dev`, open MENU → Calculus → New Integration and integrate `1/(x^2+1)` with an explicit differential.
- Toggle full/compact; copy from each view; inspect Conditions and Original condition entries.
- Integrate `1/(x^5-x-1)`, inspect wide formulas and resize to a narrow window.
- Switch tabs, reload, reopen New Integration and run the restored draft.
- Start another job while a prior result is visible and toggle the view; then test Stop.

## Expected results

- Full view has no L/q/G abbreviations; copied answers agree and include restrictions.
- Compact is default; each tab retains its choice after reload, without restoring a result.
- Original conditions and exact derivations remain available. Formatting never changes proof status or execution limits.
